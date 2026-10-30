
import type { Request, Response } from "express";
import mongoose from "mongoose";
import Task from "../models/task.js";
import Project, { type IProject } from "../models/project.js";
import TaskCounter from "../models/taskCounter.js";
import Notification from "../models/Notification.js";
import Organization from "../models/Organization.js";

// Escape special characters before using user input in a regular expression.
const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Check whether the assignee belongs to the project's organization.
async function assigneeBelongsToProjectOrganization(
  organizationValue: string,
  assigneeId: string
): Promise<boolean> {
  const organizationMatch = [
    { org_id: organizationValue },
    { org_name: organizationValue },
    ...(mongoose.isValidObjectId(organizationValue)
      ? [{ _id: organizationValue }]
      : []),
  ];

  const organization = await Organization.findOne({
    $or: organizationMatch,
    members: assigneeId,
  });

  return Boolean(organization);
}

// Generate a fallback project key for older projects that do not have one.
async function generateFallbackProjectKey(
  project: IProject
): Promise<string> {
  const words = project.name.trim().split(/\s+/).filter(Boolean);

  const baseKey = (
    words.length > 1
      ? words.map((word) => word[0]).join("")
      : words[0] ?? "PRJ"
  )
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 4);

  const safeBaseKey = baseKey.length >= 2 ? baseKey : "PRJ";

  let key = safeBaseKey;
  let suffix = 2;

  while (
    await Project.exists({
      key,
      _id: { $ne: project._id },
    })
  ) {
    key = `${safeBaseKey.slice(0, 6)}${suffix}`;
    suffix += 1;
  }

  return key;
}

// Make sure existing tasks have project-based keys and the counter is correct.
async function ensureProjectTaskKeys(project: IProject): Promise<void> {
  // Older projects may not have a project key.
  if (!project.key) {
    project.key = await generateFallbackProjectKey(project);
    await project.save();
  }

  const projectKey = project.key;

  const projectTasks = await Task.find({
    project: project._id,
  }).sort({
    createdAt: 1,
    _id: 1,
  });

  const taskKeyPattern = new RegExp(
    `^${escapeRegex(projectKey)}-\\d+$`
  );

  // Check whether any task still has an old type-based key.
  const hasLegacyKeys = projectTasks.some(
    (task) => !task.taskKey || !taskKeyPattern.test(task.taskKey)
  );

  if (hasLegacyKeys) {
    // Temporarily change old keys to avoid conflicts with the unique index.
    for (const task of projectTasks) {
      task.taskKey = `MIG-${task._id.toString()}`;
      await task.save();
    }

    // Assign sequential project-based keys.
    for (const [index, task] of projectTasks.entries()) {
      task.taskKey = `${projectKey}-${String(index + 1).padStart(2, "0")}`;
      await task.save();
    }
  }

  // Find the highest task number currently assigned to this project.
  // This preserves gaps when a task has been deleted.
  let highestTaskNumber = 0;

  for (const task of projectTasks) {
    const match = task.taskKey?.match(taskKeyPattern);

    if (match) {
      const taskNumber = Number(match[0].split("-").pop());

      if (Number.isFinite(taskNumber)) {
        highestTaskNumber = Math.max(highestTaskNumber, taskNumber);
      }
    }
  }

  // Never decrease an existing counter.
  const existingCounter = await TaskCounter.findById(
    project._id.toString()
  );

  const currentSequence = existingCounter?.seq ?? 0;

  const nextSequence = Math.max(
    currentSequence,
    highestTaskNumber
  );

  await TaskCounter.updateOne(
    { _id: project._id.toString() },
    { $set: { seq: nextSequence } },
    { upsert: true }
  );
}

// CREATE TASK
export const createTask = async (req: Request, res: Response) => {
  try {
    const {
      title,
      description,
      type,
      priority,
      assignee,
      project,
      dueDate,
      parentTask,
    } = req.body;

    if (
      !title ||
      typeof title !== "string" ||
      !title.trim() ||
      !type ||
      !project
    ) {
      return res.status(400).json({
        message: "Title, type, and project are required",
      });
    }

    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({
        message: "User is not authenticated",
      });
    }

    if (!mongoose.isValidObjectId(project)) {
      return res.status(400).json({
        message: "Invalid project ID",
      });
    }

    const allowedTypes = [
      "Epic",
      "Story",
      "Task",
      "Bug",
      "Sub-task",
    ];

    const allowedPriorities = [
      "Low",
      "Medium",
      "High",
      "Urgent",
    ];

    if (!allowedTypes.includes(type)) {
      return res.status(400).json({
        message: "Invalid task type",
        allowedTypes,
      });
    }

    if (
      priority !== undefined &&
      priority !== null &&
      !allowedPriorities.includes(priority)
    ) {
      return res.status(400).json({
        message: "Invalid task priority",
        allowedPriorities,
      });
    }

    const existingProject = await Project.findById(project);

    if (!existingProject) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    // The creator must be a member of the project.
    const isMember = existingProject.members.some(
      (memberId) => memberId.toString() === userId.toString()
    );

    if (!isMember) {
      return res.status(403).json({
        message: "You are not a member of this project",
      });
    }

    // Validate the assignee.
    if (assignee) {
      if (!mongoose.isValidObjectId(assignee)) {
        return res.status(400).json({
          message: "Invalid assignee ID",
        });
      }

      const isAssigneeMember = existingProject.members.some(
        (memberId) => memberId.toString() === assignee.toString()
      );

      if (!isAssigneeMember) {
        return res.status(403).json({
          message: "Assignee must be a member of the project",
        });
      }

      const belongsToOrganization =
        await assigneeBelongsToProjectOrganization(
          existingProject.organization,
          assignee.toString()
        );

      if (!belongsToOrganization) {
        return res.status(403).json({
          message: "Assignee must belong to the project's organization",
        });
      }
    }

    // Validate the parent task.
    if (parentTask) {
      if (!mongoose.isValidObjectId(parentTask)) {
        return res.status(400).json({
          message: "Invalid parent task ID",
        });
      }

      const parent = await Task.findById(parentTask);

      if (!parent) {
        return res.status(404).json({
          message: "Parent task not found",
        });
      }

      if (parent.project.toString() !== project.toString()) {
        return res.status(400).json({
          message: "Parent task must belong to the same project",
        });
      }
    }

    // Synchronize existing task keys and the project counter.
    await ensureProjectTaskKeys(existingProject);

    // Increment the counter for this project only.
    const counter = await TaskCounter.findOneAndUpdate(
      { _id: existingProject._id.toString() },
      { $inc: { seq: 1 } },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    if (!counter) {
      throw new Error("Unable to generate task number");
    }

    const taskKey = `${existingProject.key}-${String(
      counter.seq
    ).padStart(2, "0")}`;

    // Create the task.
    const task = await Task.create({
      taskKey,
      title: title.trim(),
      description,
      type,
      priority,
      project: existingProject._id,
      organization: existingProject.organization,
      reporter: userId,
      assignee: assignee || undefined,
      dueDate: dueDate || undefined,
      parentTask: parentTask || undefined,
    });

    // Notify the assignee when another user creates the task.
    if (assignee && assignee.toString() !== userId.toString()) {
      try {
        await Notification.create({
          recipient: assignee,
          type: "task_assigned",
          message: `You have been assigned to task "${task.title}" (${task.taskKey}).`,
          task: task._id,
        });
      } catch (notificationError) {
        // A notification failure should not undo task creation.
        console.error(
          "CREATE TASK NOTIFICATION ERROR:",
          notificationError
        );
      }
    }

    const populatedTask = await Task.findById(task._id)
      .populate("project", "name key")
      .populate("assignee", "name email")
      .populate("reporter", "name email")
      .populate("parentTask", "title taskKey");

    return res.status(201).json({
      message: "Task created successfully",
      task: populatedTask,
    });
  } catch (error) {
    console.error("CREATE TASK ERROR:", error);

    if (
      error instanceof Error &&
      error.name === "ValidationError"
    ) {
      return res.status(400).json({
        message: "Task validation failed",
        error: error.message,
      });
    }

    return res.status(500).json({
      message: "Failed to create task",
      error: error instanceof Error ? error.message : error,
    });
  }
};

// GET TASKS WITH FILTERING AND PAGINATION
export const getTasks = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({
        message: "User is not authenticated",
      });
    }

    const { search, status, priority, assignee, type } = req.query;

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    if (
      !Number.isInteger(page) ||
      page < 1 ||
      !Number.isInteger(limit) ||
      limit < 1
    ) {
      return res.status(400).json({
        message: "Page and limit must be positive integers",
      });
    }

    const pageLimit = Math.min(limit, 100);
    const skip = (page - 1) * pageLimit;

    // Find all projects where the user is a member.
    const userProjects = await Project.find({
      members: userId,
    });

    const userProjectIds = userProjects.map(
      (project) => project._id
    );

    const filter: Record<string, any> = {
      project: { $in: userProjectIds },
    };

    if (typeof search === "string" && search.trim()) {
      filter.title = {
        $regex: escapeRegex(search.trim()),
        $options: "i",
      };
    }

    if (typeof status === "string" && status.trim()) {
      filter.status = status;
    }

    if (typeof priority === "string" && priority.trim()) {
      filter.priority = priority;
    }

    if (typeof assignee === "string" && assignee.trim()) {
      if (!mongoose.isValidObjectId(assignee)) {
        return res.status(400).json({
          message: "Invalid assignee ID",
        });
      }

      filter.assignee = assignee;
    }

    if (typeof type === "string" && type.trim()) {
      filter.type = type;
    }

    // Migrate old task keys and synchronize each project's counter.
    for (const project of userProjects) {
      await ensureProjectTaskKeys(project);
    }

    const totalTasks = await Task.countDocuments(filter);

    const tasks = await Task.find(filter)
      .populate("project", "name key")
      .populate("assignee", "name email")
      .populate("reporter", "name email")
      .populate("parentTask", "title taskKey")
      .sort({ createdAt: 1, _id: 1 })
      .skip(skip)
      .limit(pageLimit);

    const totalPages = Math.ceil(totalTasks / pageLimit);

    return res.status(200).json({
      message: "Tasks fetched successfully",
      count: tasks.length,
      pagination: {
        totalTasks,
        currentPage: page,
        limit: pageLimit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      tasks,
    });
  } catch (error) {
    console.error("GET TASKS ERROR:", error);

    return res.status(500).json({
      message: "Failed to fetch tasks",
      error: error instanceof Error ? error.message : error,
    });
  }
};

// GET ONE TASK
export const getTaskById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid task ID",
      });
    }

    const task = await Task.findById(id)
      .populate("project", "name key")
      .populate("assignee", "name email")
      .populate("reporter", "name email")
      .populate("parentTask", "title taskKey");

    if (!task) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    return res.status(200).json({
      message: "Task fetched successfully",
      task,
    });
  } catch (error) {
    console.error("GET TASK ERROR:", error);

    return res.status(500).json({
      message: "Failed to fetch task",
      error: error instanceof Error ? error.message : error,
    });
  }
};

// UPDATE TASK
export const updateTask = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const {
      title,
      description,
      type,
      status,
      priority,
      assignee,
      dueDate,
    } = req.body;

    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({
        message: "User is not authenticated",
      });
    }

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid task ID",
      });
    }

    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    const previousAssigneeId = task.assignee?.toString();

    const project = await Project.findById(task.project);

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    // Only project members can update its tasks.
    const isMember = project.members.some(
      (memberId) => memberId.toString() === userId.toString()
    );

    if (!isMember) {
      return res.status(403).json({
        message: "You are not a member of this project",
      });
    }

    const allowedStatuses = [
      "To Do",
      "In Progress",
      "In Review",
      "Done",
    ];

    const allowedTypes = [
      "Epic",
      "Story",
      "Task",
      "Bug",
      "Sub-task",
    ];

    const allowedPriorities = [
      "Low",
      "Medium",
      "High",
      "Urgent",
    ];

    if (
      status !== undefined &&
      !allowedStatuses.includes(status)
    ) {
      return res.status(400).json({
        message: "Invalid task status",
        allowedStatuses,
      });
    }

    if (
      type !== undefined &&
      !allowedTypes.includes(type)
    ) {
      return res.status(400).json({
        message: "Invalid task type",
        allowedTypes,
      });
    }

    if (
      priority !== undefined &&
      !allowedPriorities.includes(priority)
    ) {
      return res.status(400).json({
        message: "Invalid task priority",
        allowedPriorities,
      });
    }

    // Validate the new assignee.
    if (
      assignee !== undefined &&
      assignee !== null &&
      assignee !== ""
    ) {
      if (!mongoose.isValidObjectId(assignee)) {
        return res.status(400).json({
          message: "Invalid assignee ID",
        });
      }

      const isAssigneeMember = project.members.some(
        (memberId) => memberId.toString() === assignee.toString()
      );

      if (!isAssigneeMember) {
        return res.status(403).json({
          message: "Assignee must be a member of the project",
        });
      }

      const belongsToOrganization =
        await assigneeBelongsToProjectOrganization(
          project.organization,
          assignee.toString()
        );

      if (!belongsToOrganization) {
        return res.status(403).json({
          message: "Assignee must belong to the project's organization",
        });
      }
    }

    if (title !== undefined) {
      if (typeof title !== "string" || !title.trim()) {
        return res.status(400).json({
          message: "Task title cannot be empty",
        });
      }

      task.title = title.trim();
    }

    if (description !== undefined) {
      task.description = description;
    }

    if (type !== undefined) {
      task.type = type;
    }

    if (status !== undefined) {
      task.status = status;
    }

    if (priority !== undefined) {
      task.priority = priority;
    }

    if (assignee !== undefined) {
      if (assignee === null || assignee === "") {
        task.set("assignee", null);
      } else {
        task.assignee = assignee;
      }
    }

    if (dueDate !== undefined) {
      task.dueDate = dueDate || undefined;
    }

    await task.save();

    // Notify the new assignee when a task is assigned or reassigned.
    const newAssigneeId = task.assignee?.toString();

    if (
      newAssigneeId &&
      newAssigneeId !== previousAssigneeId &&
      newAssigneeId !== userId.toString()
    ) {
      try {
        await Notification.create({
          recipient: newAssigneeId,
          type: "task_assigned",
          message: `You have been assigned to task "${task.title}" (${task.taskKey}).`,
          task: task._id,
        });
      } catch (notificationError) {
        // Keep the successful task update even if notification creation fails.
        console.error(
          "UPDATE TASK NOTIFICATION ERROR:",
          notificationError
        );
      }
    }

    const updatedTask = await Task.findById(task._id)
      .populate("project", "name key")
      .populate("assignee", "name email")
      .populate("reporter", "name email")
      .populate("parentTask", "title taskKey");

    return res.status(200).json({
      message: "Task updated successfully",
      task: updatedTask,
    });
  } catch (error) {
    console.error("UPDATE TASK ERROR:", error);

    if (
      error instanceof Error &&
      error.name === "ValidationError"
    ) {
      return res.status(400).json({
        message: "Task validation failed",
        error: error.message,
      });
    }

    return res.status(500).json({
      message: "Failed to update task",
      error: error instanceof Error ? error.message : error,
    });
  }
};

// DELETE TASK
export const deleteTask = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        message: "User is not authenticated",
      });
    }

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid task ID",
      });
    }

    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    const project = await Project.findById(task.project);

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    const isMember = project.members.some(
      (memberId) => memberId.toString() === userId.toString()
    );

    if (!isMember) {
      return res.status(403).json({
        message: "You are not a member of this project",
      });
    }

    await Task.findByIdAndDelete(task._id);

    // Do not decrement the counter.
    // This prevents a deleted task's issue key from being reused.

    return res.status(200).json({
      message: "Task deleted successfully",
    });
  } catch (error) {
    console.error("DELETE TASK ERROR:", error);

    return res.status(500).json({
      message: "Failed to delete task",
      error: error instanceof Error ? error.message : error,
    });
  }
};
