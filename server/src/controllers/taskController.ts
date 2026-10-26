
import type { Request, Response } from "express";
import Task from "../models/task.js";
import Project from "../models/project.js";
import TaskCounter from "../models/taskCounter.js";

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

    if (!title || !type || !project) {
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

    const existingProject = await Project.findById(project);

    if (!existingProject) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    // Check project membership.
    const isMember = existingProject.members.some(
      (memberId) => memberId.toString() === userId.toString()
    );

    if (!isMember) {
      return res.status(403).json({
        message: "You are not a member of this project",
      });
    }

    // Check assignee membership.
    if (assignee) {
      const isAssigneeMember = existingProject.members.some(
        (memberId) => memberId.toString() === assignee.toString()
      );

      if (!isAssigneeMember) {
        return res.status(403).json({
          message: "Assignee must be a member of the project",
        });
      }
    }

    // Check parent task.
    if (parentTask) {
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

    // Generate a readable task ID.
    const prefixes: Record<string, string> = {
      Epic: "EPIC",
      Story: "STORY",
      Task: "TASK",
      Bug: "BUG",
      "Sub-task": "SUB",
    };

    const prefix = prefixes[type];

    if (!prefix) {
      return res.status(400).json({
        message: "Invalid task type",
      });
    }

    const counter = await TaskCounter.findOneAndUpdate(
      { _id: prefix },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    const taskKey = `${prefix}-${String(counter.seq).padStart(3, "0")}`;

    // Save the task.
    const task = await Task.create({
      taskKey,
      title,
      description,
      type,
      priority,
      project,
      organization: existingProject.organization,
      reporter: userId,
      assignee: assignee || undefined,
      dueDate,
      parentTask: parentTask || undefined,
    });

    const populatedTask = await Task.findById(task._id)
      .populate("project", "name")
      .populate("assignee", "name email")
      .populate("reporter", "name email")
      .populate("parentTask", "title taskKey");

    return res.status(201).json({
      message: "Task created successfully",
      task: populatedTask,
    });
  } catch (error) {
    console.error("CREATE TASK ERROR:", error);

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

    // Show tasks reported by or assigned to this user.
    const filter: any = {
      $or: [{ reporter: userId }, { assignee: userId }],
    };

    if (typeof search === "string" && search.trim()) {
      filter.title = {
        $regex: search.trim(),
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
      filter.assignee = assignee;
    }

    if (typeof type === "string" && type.trim()) {
      filter.type = type;
    }

    const totalTasks = await Task.countDocuments(filter);

    const tasks = await Task.find(filter)
      .populate("project", "name")
      .populate("assignee", "name email")
      .populate("reporter", "name email")
      .populate("parentTask", "title taskKey")
      .sort({ createdAt: -1, _id: -1 })
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
    const task = await Task.findById(req.params.id)
      .populate("project", "name")
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

    if (status !== undefined && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid task status",
        allowedStatuses,
      });
    }

    if (type !== undefined && !allowedTypes.includes(type)) {
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
    if (assignee !== undefined && assignee !== null && assignee !== "") {
      const isAssigneeMember = project.members.some(
        (memberId) => memberId.toString() === assignee.toString()
      );

      if (!isAssigneeMember) {
        return res.status(403).json({
          message: "Assignee must be a member of the project",
        });
      }
    }

    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (type !== undefined) task.type = type;
    if (status !== undefined) task.status = status;
    if (priority !== undefined) task.priority = priority;

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

    const updatedTask = await Task.findById(task._id)
      .populate("project", "name")
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

    if (!userId) {
      return res.status(401).json({
        message: "User is not authenticated",
      });
    }

    const task = await Task.findById(req.params.id);

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
