import type { Request, Response } from "express";
import mongoose from "mongoose";

import Project from "../models/project.js";
import Sprint from "../models/Sprint.js";
import Task from "../models/task.js";

function param(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

async function getAuthorizedProject(
  req: Request,
  res: Response
) {
  const projectId = param(req.params.projectId);

  if (!mongoose.isValidObjectId(projectId)) {
    res.status(400).json({ message: "Invalid project ID" });
    return null;
  }

  const project = await Project.findById(projectId);

  if (!project) {
    res.status(404).json({ message: "Project not found" });
    return null;
  }

  const userId = (req as Request & { userId?: string }).userId;
  const isMember = Boolean(
    userId &&
      project.members.some((member) => member.toString() === userId)
  );

  if (!isMember) {
    res.status(403).json({ message: "You are not a member of this project" });
    return null;
  }

  return { project, userId: userId! };
}

function validDate(value: unknown): Date | undefined | null {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function serializeTask(task: any) {
  const item = typeof task.toObject === "function" ? task.toObject() : task;
  return item;
}

// GET PROJECT SPRINTS, TASKS, AND BACKLOG
export const getProjectSprints = async (req: Request, res: Response) => {
  try {
    const access = await getAuthorizedProject(req, res);
    if (!access) return;

    const [sprints, projectTasks] = await Promise.all([
      Sprint.find({ project: access.project._id }).sort({ createdAt: -1 }).lean(),
      Task.find({ project: access.project._id })
        .populate("assignee", "name email")
        .populate("reporter", "name email")
        .populate("parentTask", "title taskKey type")
        .sort({ createdAt: -1, _id: -1 }),
    ]);

    const tasksById = new Map<string, any>(
      projectTasks.map((task) => [task._id.toString(), serializeTask(task)])
    );
    const assignedTaskIds = new Set<string>();

    const sprintTasks = sprints.map((sprint) => {
      const sprintId = sprint._id.toString();
      const ids = new Set<string>();

      for (const id of sprint.tasks ?? []) {
        const taskId = id.toString();
        const task = tasksById.get(taskId);
        const taskSprintId = task?.sprint?.toString();
        // Prefer the task's sprint reference when a partially completed move
        // leaves a stale ID in an older sprint array.
        if (task && (!taskSprintId || taskSprintId === sprintId)) {
          ids.add(taskId);
        }
      }

      // Include task references created before sprint task arrays were stored.
      for (const task of projectTasks) {
        if (task.sprint?.toString() === sprintId) {
          ids.add(task._id.toString());
        }
      }

      const tasks = Array.from(ids)
        .map((id) => tasksById.get(id))
        .filter((task): task is NonNullable<typeof task> => Boolean(task));
      tasks.forEach((task) => assignedTaskIds.add(task._id.toString()));
      return { ...sprint, tasks };
    });

    const backlog = projectTasks
      .filter((task) => !task.sprint && !assignedTaskIds.has(task._id.toString()))
      .map(serializeTask);

    return res.status(200).json({
      sprints: sprintTasks.map((sprint: any) => ({
        ...sprint,
        title: sprint.title ?? sprint.name ?? "Sprint",
        description: sprint.description ?? sprint.goal ?? "",
      })),
      backlog,
    });
  } catch (error) {
    console.error("GET PROJECT SPRINTS ERROR:", error);
    return res.status(500).json({ message: "Failed to load project sprints" });
  }
};

// CREATE A PLANNING SPRINT
export const createSprint = async (req: Request, res: Response) => {
  try {
    const access = await getAuthorizedProject(req, res);
    if (!access) return;

    const { title, description } = req.body;
    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ message: "Sprint title is required" });
    }
    if (description !== undefined && typeof description !== "string") {
      return res.status(400).json({ message: "Sprint description must be text" });
    }

    const startDate = validDate(req.body.startDate);
    const endDate = validDate(req.body.endDate);
    if (startDate === null || endDate === null) {
      return res.status(400).json({ message: "Sprint dates are invalid" });
    }
    if (startDate && endDate && endDate <= startDate) {
      return res.status(400).json({ message: "End date must be after start date" });
    }

    const sprint = await Sprint.create({
      title: title.trim(),
      description: typeof description === "string" ? description.trim() : "",
      project: access.project._id,
      createdBy: access.userId,
      ...(startDate ? { startDate } : {}),
      ...(endDate ? { endDate } : {}),
      status: "Planning",
    });

    return res.status(201).json({ message: "Sprint created", sprint });
  } catch (error) {
    console.error("CREATE SPRINT ERROR:", error);
    return res.status(500).json({ message: "Failed to create sprint" });
  }
};

// UPDATE A PLANNING SPRINT
export const updateSprint = async (req: Request, res: Response) => {
  try {
    const access = await getAuthorizedProject(req, res);
    if (!access) return;

    const sprintId = param(req.params.sprintId);
    if (!mongoose.isValidObjectId(sprintId)) {
      return res.status(400).json({ message: "Invalid sprint ID" });
    }

    const sprint = await Sprint.findOne({ _id: sprintId, project: access.project._id });
    if (!sprint) return res.status(404).json({ message: "Sprint not found" });
    if (sprint.status !== "Planning") {
      return res.status(400).json({ message: "Only planning sprints can be edited" });
    }

    if (req.body.title !== undefined) {
      if (typeof req.body.title !== "string" || !req.body.title.trim()) {
        return res.status(400).json({ message: "Sprint title is required" });
      }
      sprint.title = req.body.title.trim();
    }
    if (req.body.description !== undefined) {
      if (typeof req.body.description !== "string") {
        return res.status(400).json({ message: "Sprint description must be text" });
      }
      sprint.description = req.body.description.trim();
    }

    const startDate = validDate(req.body.startDate);
    const endDate = validDate(req.body.endDate);
    if (startDate === null || endDate === null) {
      return res.status(400).json({ message: "Sprint dates are invalid" });
    }
    if (req.body.startDate !== undefined) {
      if (startDate) sprint.startDate = startDate;
      else sprint.set("startDate", null);
    }
    if (req.body.endDate !== undefined) {
      if (endDate) sprint.endDate = endDate;
      else sprint.set("endDate", null);
    }

    if (sprint.startDate && sprint.endDate && sprint.endDate <= sprint.startDate) {
      return res.status(400).json({ message: "End date must be after start date" });
    }

    await sprint.save();
    return res.status(200).json({ message: "Sprint updated", sprint });
  } catch (error) {
    console.error("UPDATE SPRINT ERROR:", error);
    return res.status(500).json({ message: "Failed to update sprint" });
  }
};

// START A SPRINT
export const startSprint = async (req: Request, res: Response) => {
  try {
    const access = await getAuthorizedProject(req, res);
    if (!access) return;

    const sprintId = param(req.params.sprintId);
    if (!mongoose.isValidObjectId(sprintId)) {
      return res.status(400).json({ message: "Invalid sprint ID" });
    }
    const sprint = await Sprint.findOne({ _id: sprintId, project: access.project._id });
    if (!sprint) return res.status(404).json({ message: "Sprint not found" });
    if (sprint.status !== "Planning") {
      return res.status(400).json({ message: "Only planning sprints can be started" });
    }
    if (!sprint.startDate || !sprint.endDate || sprint.endDate <= sprint.startDate) {
      return res.status(400).json({ message: "Set a valid sprint start and end date before starting" });
    }
    if (await Sprint.exists({ project: access.project._id, status: "Active" })) {
      return res.status(409).json({ message: "This project already has an active sprint" });
    }

    sprint.status = "Active";
    sprint.startedAt = new Date();
    await sprint.save();
    return res.status(200).json({ message: "Sprint started", sprint });
  } catch (error: any) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "This project already has an active sprint" });
    }
    console.error("START SPRINT ERROR:", error);
    return res.status(500).json({ message: "Failed to start sprint" });
  }
};

// COMPLETE A SPRINT
export const completeSprint = async (req: Request, res: Response) => {
  try {
    const access = await getAuthorizedProject(req, res);
    if (!access) return;

    const sprintId = param(req.params.sprintId);
    if (!mongoose.isValidObjectId(sprintId)) {
      return res.status(400).json({ message: "Invalid sprint ID" });
    }
    const sprint = await Sprint.findOne({ _id: sprintId, project: access.project._id });
    if (!sprint) return res.status(404).json({ message: "Sprint not found" });
    if (sprint.status !== "Active") {
      return res.status(400).json({ message: "Only active sprints can be completed" });
    }

    const incompleteTasks = await Task.find({
      project: access.project._id,
      status: { $ne: "Done" },
      $or: [
        { sprint: sprint._id },
        { _id: { $in: sprint.tasks ?? [] } },
      ],
    }).select("_id");

    let destinationSprint: InstanceType<typeof Sprint> | null = null;
    if (incompleteTasks.length > 0) {
      if (!Object.prototype.hasOwnProperty.call(req.body, "moveIncompleteToSprintId")) {
        return res.status(400).json({
          message: "Choose whether unfinished tasks go to backlog or another sprint",
          incompleteTaskCount: incompleteTasks.length,
        });
      }

      const destinationId = req.body.moveIncompleteToSprintId;
      if (destinationId !== null && destinationId !== "") {
        if (typeof destinationId !== "string" || !mongoose.isValidObjectId(destinationId)) {
          return res.status(400).json({ message: "Invalid destination sprint ID" });
        }
        destinationSprint = await Sprint.findOne({
          _id: destinationId,
          project: access.project._id,
        });
        if (!destinationSprint || destinationSprint._id.equals(sprint._id)) {
          return res.status(400).json({ message: "Choose another sprint in this project" });
        }
        if (destinationSprint.status === "Completed") {
          return res.status(400).json({ message: "Tasks cannot be moved to a completed sprint" });
        }
      }

      const taskIds = incompleteTasks.map((task) => task._id);
      await Task.updateMany(
        { _id: { $in: taskIds }, project: access.project._id },
        destinationSprint
          ? { $set: { sprint: destinationSprint._id } }
          : { $unset: { sprint: 1 } }
      );
      await Sprint.updateOne(
        { _id: sprint._id, project: access.project._id },
        { $pull: { tasks: { $in: taskIds } } }
      );
      if (destinationSprint) {
        await Sprint.updateOne(
          { _id: destinationSprint._id },
          { $addToSet: { tasks: { $each: taskIds } } }
        );
      }
    }

    sprint.status = "Completed";
    sprint.completedAt = new Date();
    await sprint.save();
    return res.status(200).json({ message: "Sprint completed", sprint });
  } catch (error) {
    console.error("COMPLETE SPRINT ERROR:", error);
    return res.status(500).json({ message: "Failed to complete sprint" });
  }
};

// DELETE A NON-ACTIVE SPRINT, MOVING ITS TASKS AS REQUESTED
export const deleteSprint = async (req: Request, res: Response) => {
  try {
    const access = await getAuthorizedProject(req, res);
    if (!access) return;

    const sprintId = param(req.params.sprintId);
    if (!mongoose.isValidObjectId(sprintId)) {
      return res.status(400).json({ message: "Invalid sprint ID" });
    }
    const sprint = await Sprint.findOne({ _id: sprintId, project: access.project._id });
    if (!sprint) return res.status(404).json({ message: "Sprint not found" });
    if (sprint.status === "Active") {
      return res.status(400).json({ message: "Complete the active sprint before deleting it" });
    }
    const sprintTasks = await Task.find({
      project: access.project._id,
      $or: [
        { sprint: sprint._id },
        { _id: { $in: sprint.tasks ?? [] } },
      ],
    }).select("_id");

    let destinationSprint: InstanceType<typeof Sprint> | null = null;
    if (sprintTasks.length > 0) {
      if (!Object.prototype.hasOwnProperty.call(req.body, "moveTasksToSprintId")) {
        return res.status(400).json({
          message: "Choose whether sprint tasks go to backlog or another sprint",
          taskCount: sprintTasks.length,
        });
      }

      const destinationId = req.body.moveTasksToSprintId;
      if (destinationId !== null && destinationId !== "") {
        if (typeof destinationId !== "string" || !mongoose.isValidObjectId(destinationId)) {
          return res.status(400).json({ message: "Invalid destination sprint ID" });
        }
        destinationSprint = await Sprint.findOne({
          _id: destinationId,
          project: access.project._id,
        });
        if (!destinationSprint || destinationSprint._id.equals(sprint._id)) {
          return res.status(400).json({ message: "Choose another sprint in this project" });
        }
        if (destinationSprint.status === "Completed") {
          return res.status(400).json({ message: "Tasks cannot be moved to a completed sprint" });
        }
      }

      const taskIds = sprintTasks.map((task) => task._id);
      await Task.updateMany(
        { _id: { $in: taskIds }, project: access.project._id },
        destinationSprint
          ? { $set: { sprint: destinationSprint._id } }
          : { $unset: { sprint: 1 } }
      );
      if (destinationSprint) {
        await Sprint.updateOne(
          { _id: destinationSprint._id },
          { $addToSet: { tasks: { $each: taskIds } } }
        );
      }
    }

    await sprint.deleteOne();
    return res.status(200).json({ message: "Sprint deleted" });
  } catch (error) {
    console.error("DELETE SPRINT ERROR:", error);
    return res.status(500).json({ message: "Failed to delete sprint" });
  }
};

// ASSIGN A PROJECT TASK TO A SPRINT OR BACKLOG
export const setTaskSprint = async (req: Request, res: Response) => {
  try {
    const access = await getAuthorizedProject(req, res);
    if (!access) return;

    const taskId = param(req.params.taskId);
    if (!mongoose.isValidObjectId(taskId)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }

    const task = await Task.findOne({ _id: taskId, project: access.project._id });
    if (!task) return res.status(404).json({ message: "Task not found in this project" });

    const previousSprintId = task.sprint?.toString();
    const sprintId = req.body.sprintId;
    if (sprintId === null || sprintId === "") {
      task.set("sprint", null);
    } else {
      if (typeof sprintId !== "string" || !mongoose.isValidObjectId(sprintId)) {
        return res.status(400).json({ message: "Invalid sprint ID" });
      }
      const sprint = await Sprint.findOne({ _id: sprintId, project: access.project._id });
      if (!sprint) return res.status(404).json({ message: "Sprint not found in this project" });
      if (sprint.status === "Completed") {
        return res.status(400).json({ message: "Tasks cannot be added to a completed sprint" });
      }
      task.sprint = sprint._id;
    }

    await task.save();
    if (previousSprintId && previousSprintId !== task.sprint?.toString()) {
      await Sprint.updateOne(
        { _id: previousSprintId, project: access.project._id },
        { $pull: { tasks: task._id } }
      );
    }
    if (task.sprint) {
      await Sprint.updateOne(
        { _id: task.sprint, project: access.project._id },
        { $addToSet: { tasks: task._id } }
      );
    }
    const updatedTask = await Task.findById(task._id)
      .populate("project", "name key")
      .populate("assignee", "name email")
      .populate("reporter", "name email")
      .populate("parentTask", "title taskKey type")
      .populate("sprint", "title status");

    return res.status(200).json({ message: "Task sprint updated", task: updatedTask });
  } catch (error) {
    console.error("SET TASK SPRINT ERROR:", error);
    return res.status(500).json({ message: "Failed to update task sprint" });
  }
};
