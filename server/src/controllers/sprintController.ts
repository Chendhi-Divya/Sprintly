import type { Request, Response } from "express";
import mongoose from "mongoose";

import Project from "../models/project.js";
import Sprint from "../models/Sprint.js";
import Task from "../models/task.js";

function param(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

async function getAuthorizedProject(req: Request, res: Response) {
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
  return typeof task.toObject === "function" ? task.toObject() : task;
}

// GET PROJECT SPRINTS, TASKS, AND BACKLOG
export const getProjectSprints = async (req: Request, res: Response) => {
  try {
    const access = await getAuthorizedProject(req, res);
    if (!access) return;

    const [sprints, projectTasks] = await Promise.all([
      Sprint.find({ project: access.project._id })
        .sort({ createdAt: -1 })
        .lean(),

      Task.find({ project: access.project._id })
        .populate("assignee", "name email")
        .populate("reporter", "name email")
        .populate("parentTask", "title taskKey type")
        .sort({ position: 1, createdAt: 1, _id: 1 }),
    ]);

    const tasksById = new Map<string, any>(
      projectTasks.map((task) => [
        task._id.toString(),
        serializeTask(task),
      ])
    );

    const sprintTasks = sprints.map((sprint) => {
      const sprintId = sprint._id.toString();
      const taskIds = new Set<string>();

      // Include tasks referenced by the sprint's task array.
      for (const id of sprint.tasks ?? []) {
        const taskId = id.toString();
        const task = tasksById.get(taskId);

        if (!task) continue;

        const taskSprintId = task.sprint?.toString();

        if (!taskSprintId || taskSprintId === sprintId) {
          taskIds.add(taskId);
        }
      }

      // Also include tasks whose sprint field points to this sprint.
      for (const task of projectTasks) {
        if (task.sprint?.toString() === sprintId) {
          taskIds.add(task._id.toString());
        }
      }

      // Sort by the saved position, not by the Sprint.tasks array order.
      const tasks = Array.from(taskIds)
        .map((id) => tasksById.get(id))
        .filter(Boolean)
        .sort(
          (a, b) =>
            (a.position ?? 0) - (b.position ?? 0) ||
            new Date(a.createdAt ?? 0).getTime() -
              new Date(b.createdAt ?? 0).getTime() ||
            a._id.toString().localeCompare(b._id.toString())
        );

      return {
        ...sprint,
        tasks,
      };
    });

    const assignedTaskIds = new Set<string>();

    sprintTasks.forEach((sprint: any) => {
      sprint.tasks.forEach((task: any) => {
        assignedTaskIds.add(task._id.toString());
      });
    });

    const backlog = projectTasks
      .filter(
        (task) =>
          !task.sprint &&
          !assignedTaskIds.has(task._id.toString())
      )
      .map(serializeTask)
      .sort(
        (a, b) =>
          (a.position ?? 0) - (b.position ?? 0) ||
          new Date(a.createdAt ?? 0).getTime() -
            new Date(b.createdAt ?? 0).getTime() ||
          a._id.toString().localeCompare(b._id.toString())
      );

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

    const sprint = await Sprint.findOne({
      _id: sprintId,
      project: access.project._id,
    });

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

    const sprint = await Sprint.findOne({
      _id: sprintId,
      project: access.project._id,
    });

    if (!sprint) return res.status(404).json({ message: "Sprint not found" });

    if (sprint.status !== "Planning") {
      return res.status(400).json({ message: "Only planning sprints can be started" });
    }

    if (!sprint.startDate || !sprint.endDate || sprint.endDate <= sprint.startDate) {
      return res.status(400).json({
        message: "Set a valid sprint start and end date before starting",
      });
    }

    if (await Sprint.exists({ project: access.project._id, status: "Active" })) {
      return res.status(409).json({
        message: "This project already has an active sprint",
      });
    }

    sprint.status = "Active";
    sprint.startedAt = new Date();

    await sprint.save();

    return res.status(200).json({ message: "Sprint started", sprint });
  } catch (error: any) {
    if (error?.code === 11000) {
      return res.status(409).json({
        message: "This project already has an active sprint",
      });
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

    const sprint = await Sprint.findOne({
      _id: sprintId,
      project: access.project._id,
    });

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
    })
      .sort({ position: 1, createdAt: 1, _id: 1 })
      .select("_id position");

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
          return res.status(400).json({
            message: "Choose another sprint in this project",
          });
        }

        if (destinationSprint.status === "Completed") {
          return res.status(400).json({
            message: "Tasks cannot be moved to a completed sprint",
          });
        }
      }

      const taskIds = incompleteTasks.map((task) => task._id);

      const destinationTasks = await Task.find({
        project: access.project._id,
        ...(destinationSprint
          ? { sprint: destinationSprint._id }
          : { sprint: null }),
        _id: { $nin: taskIds },
      }).sort({ position: 1, createdAt: 1, _id: 1 });

      const updates: any[] = [];

      destinationTasks.forEach((task, index) => {
        updates.push({
          updateOne: {
            filter: { _id: task._id },
            update: { $set: { position: index } },
          },
        });
      });

      incompleteTasks.forEach((task, index) => {
        updates.push({
          updateOne: {
            filter: { _id: task._id },
            update: {
              $set: {
                position: destinationTasks.length + index,
                ...(destinationSprint
                  ? { sprint: destinationSprint._id }
                  : {}),
              },
              ...(!destinationSprint ? { $unset: { sprint: 1 } } : {}),
            },
          },
        });
      });

      if (updates.length) {
        await Task.bulkWrite(updates);
      }

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

    const sprint = await Sprint.findOne({
      _id: sprintId,
      project: access.project._id,
    });

    if (!sprint) return res.status(404).json({ message: "Sprint not found" });

    if (sprint.status === "Active") {
      return res.status(400).json({
        message: "Complete the active sprint before deleting it",
      });
    }

    const sprintTasks = await Task.find({
      project: access.project._id,
      $or: [
        { sprint: sprint._id },
        { _id: { $in: sprint.tasks ?? [] } },
      ],
    })
      .sort({ position: 1, createdAt: 1, _id: 1 })
      .select("_id position");

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
          return res.status(400).json({
            message: "Choose another sprint in this project",
          });
        }

        if (destinationSprint.status === "Completed") {
          return res.status(400).json({
            message: "Tasks cannot be moved to a completed sprint",
          });
        }
      }

      const taskIds = sprintTasks.map((task) => task._id);

      const destinationTasks = await Task.find({
        project: access.project._id,
        ...(destinationSprint
          ? { sprint: destinationSprint._id }
          : { sprint: null }),
        _id: { $nin: taskIds },
      }).sort({ position: 1, createdAt: 1, _id: 1 });

      const updates: any[] = [];

      destinationTasks.forEach((task, index) => {
        updates.push({
          updateOne: {
            filter: { _id: task._id },
            update: { $set: { position: index } },
          },
        });
      });

      sprintTasks.forEach((task, index) => {
        updates.push({
          updateOne: {
            filter: { _id: task._id },
            update: {
              $set: {
                position: destinationTasks.length + index,
                ...(destinationSprint
                  ? { sprint: destinationSprint._id }
                  : {}),
              },
              ...(!destinationSprint ? { $unset: { sprint: 1 } } : {}),
            },
          },
        });
      });

      if (updates.length) {
        await Task.bulkWrite(updates);
      }

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

// ASSIGN A PROJECT TASK TO A SPRINT OR BACKLOG, INCLUDING REORDERING
export const setTaskSprint = async (req: Request, res: Response) => {
  try {
    const access = await getAuthorizedProject(req, res);
    if (!access) return;

    const taskId = param(req.params.taskId);

    if (!mongoose.isValidObjectId(taskId)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }

    const task = await Task.findOne({
      _id: taskId,
      project: access.project._id,
    });

    if (!task) {
      return res.status(404).json({
        message: "Task not found in this project",
      });
    }

    const previousSprintId = task.sprint?.toString() ?? null;
    const requestedSprintId = req.body.sprintId;

    let destinationSprint: InstanceType<typeof Sprint> | null = null;
    let destinationSprintId: string | null = null;

    // Validate destination sprint.
    if (requestedSprintId !== null && requestedSprintId !== "") {
      if (
        typeof requestedSprintId !== "string" ||
        !mongoose.isValidObjectId(requestedSprintId)
      ) {
        return res.status(400).json({ message: "Invalid sprint ID" });
      }

      destinationSprint = await Sprint.findOne({
        _id: requestedSprintId,
        project: access.project._id,
      });

      if (!destinationSprint) {
        return res.status(404).json({
          message: "Sprint not found in this project",
        });
      }

      if (destinationSprint.status === "Completed") {
        return res.status(400).json({
          message: "Tasks cannot be added to a completed sprint",
        });
      }

      destinationSprintId = destinationSprint._id.toString();
    } else if (requestedSprintId !== null && requestedSprintId !== "") {
      return res.status(400).json({ message: "Invalid sprint ID" });
    }

    const targetTaskId = req.body.targetTaskId;
    const requestedPosition = req.body.position;

    if (
      targetTaskId !== undefined &&
      targetTaskId !== null &&
      targetTaskId !== "" &&
      !mongoose.isValidObjectId(targetTaskId)
    ) {
      return res.status(400).json({ message: "Invalid target task ID" });
    }

    if (
      requestedPosition !== undefined &&
      requestedPosition !== null &&
      requestedPosition !== "before" &&
      requestedPosition !== "after"
    ) {
      return res.status(400).json({
        message: "Position must be either before or after",
      });
    }

    const sameList = previousSprintId === destinationSprintId;

    const listFilter = destinationSprintId
      ? {
          project: access.project._id,
          sprint: new mongoose.Types.ObjectId(destinationSprintId),
        }
      : {
          project: access.project._id,
          sprint: null,
        };

    // Load the destination list in its current saved order.
    const destinationTasks = await Task.find({
      ...listFilter,
      _id: { $ne: task._id },
    }).sort({ position: 1, createdAt: 1, _id: 1 });

    // Work with an array that excludes the dragged task.
    const reorderedDestination = [...destinationTasks];

    let insertIndex = reorderedDestination.length;

    // If a target task is supplied, insert directly before or after it.
    if (targetTaskId && targetTaskId !== taskId) {
      const targetIndex = reorderedDestination.findIndex(
        (item) => item._id.toString() === targetTaskId
      );

      if (targetIndex === -1) {
        return res.status(400).json({
          message: "Target task does not belong to the destination list",
        });
      }

      insertIndex =
        requestedPosition === "after"
          ? targetIndex + 1
          : targetIndex;
    }

    // No target means append to the destination list.
    reorderedDestination.splice(insertIndex, 0, task);

    const bulkOperations: any[] = [];

    // If the task is moving to a different list, close the gap in its old list.
    if (!sameList) {
      const sourceFilter = previousSprintId
        ? {
            project: access.project._id,
            sprint: new mongoose.Types.ObjectId(previousSprintId),
          }
        : {
            project: access.project._id,
            sprint: null,
          };

      const sourceTasks = await Task.find({
        ...sourceFilter,
        _id: { $ne: task._id },
      }).sort({ position: 1, createdAt: 1, _id: 1 });

      sourceTasks.forEach((sourceTask, index) => {
        bulkOperations.push({
          updateOne: {
            filter: { _id: sourceTask._id },
            update: {
              $set: { position: index },
            },
          },
        });
      });
    }

    // Save the new destination order.
    reorderedDestination.forEach((destinationTask, index) => {
      const isDraggedTask =
        destinationTask._id.toString() === task._id.toString();

      const update: any = {
        $set: {
          position: index,
        },
      };

      if (isDraggedTask) {
        if (destinationSprintId) {
          update.$set.sprint = destinationSprint!._id;
        } else {
          update.$unset = { sprint: 1 };
        }
      }

      bulkOperations.push({
        updateOne: {
          filter: {
            _id: destinationTask._id,
            project: access.project._id,
          },
          update,
        },
      });
    });

    if (bulkOperations.length > 0) {
      await Task.bulkWrite(bulkOperations);
    }

    // Update Sprint.tasks references only when changing lists.
    if (!sameList) {
      if (previousSprintId) {
        await Sprint.updateOne(
          {
            _id: previousSprintId,
            project: access.project._id,
          },
          {
            $pull: { tasks: task._id },
          }
        );
      }

      if (destinationSprintId) {
        await Sprint.updateOne(
          {
            _id: destinationSprintId,
            project: access.project._id,
          },
          {
            $addToSet: { tasks: task._id },
          }
        );
      }
    }

    const updatedTask = await Task.findById(task._id)
      .populate("project", "name key")
      .populate("assignee", "name email")
      .populate("reporter", "name email")
      .populate("parentTask", "title taskKey type")
      .populate("sprint", "title status");

    return res.status(200).json({
      message: "Task order updated",
      task: updatedTask,
    });
  } catch (error) {
    console.error("SET TASK SPRINT ERROR:", error);
    return res.status(500).json({
      message: "Failed to update task order",
    });
  }
};