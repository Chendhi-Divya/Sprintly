
import type { Request, Response } from "express";
import Task from "../models/task.js";
import Project from "../models/project.js";

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

    // Check if the logged-in user is a member of the project
    const isProjectMember = existingProject.members.some(
      (memberId) => memberId.toString() === userId
    );

    if (!isProjectMember) {
      return res.status(403).json({
        message: "You are not a member of this project",
      });
    }

    // Check if the assignee is a member of the project
    if (assignee) {
      const isAssigneeMember = existingProject.members.some(
        (memberId) => memberId.toString() === assignee
      );

      if (!isAssigneeMember) {
        return res.status(403).json({
          message: "Assignee must be a member of the project",
        });
      }
    }

    const task = await Task.create({
      title,
      description,
      type,
      priority,
      project,
      organization: existingProject.organization,
      reporter: userId,
      assignee,
      dueDate,
    });

    return res.status(201).json({
      message: "Task created successfully",
      task,
    });
  } catch (error) {
    console.error("CREATE TASK ERROR:", error);

    return res.status(500).json({
      message: "Failed to create task",
      error: error instanceof Error ? error.message : error,
    });
  }
};

// GET TASKS WITH FILTERING
export const getTasks = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({
        message: "User is not authenticated",
      });
    }

    // Read filter values from query parameters
    const { status, priority, assignee, type } = req.query;

    // Show tasks reported by or assigned to the logged-in user
    const filter: any = {
      $or: [
        { reporter: userId },
        { assignee: userId },
      ],
    };

    // Filter by status
    if (typeof status === "string" && status.trim() !== "") {
      filter.status = status;
    }

    // Filter by priority
    if (typeof priority === "string" && priority.trim() !== "") {
      filter.priority = priority;
    }

    // Filter by assignee's MongoDB ObjectId
    if (typeof assignee === "string" && assignee.trim() !== "") {
      filter.assignee = assignee;
    }

    // Filter by task type
    if (typeof type === "string" && type.trim() !== "") {
      filter.type = type;
    }

    // Fetch tasks matching all supplied filters
    const tasks = await Task.find(filter)
      .populate("project")
      .populate("assignee", "name email")
      .populate("reporter", "name email");

    return res.status(200).json({
      message: "Tasks fetched successfully",
      count: tasks.length,
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

export const getTaskById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const task = await Task.findById(id)
      .populate("project")
      .populate("assignee", "name email")
      .populate("reporter", "name email");

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

    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    // Find the project that this task belongs to
    const existingProject = await Project.findById(task.project);

    if (!existingProject) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    // Check if the new assignee is a member of the project
    if (assignee !== undefined) {
      const isAssigneeMember = existingProject.members.some(
        (memberId) => memberId.toString() === assignee
      );

      if (!isAssigneeMember) {
        return res.status(403).json({
          message: "Assignee must be a member of the project",
        });
      }
    }

    if (title !== undefined) {
      task.title = title;
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
      task.assignee = assignee;
    }

    if (dueDate !== undefined) {
      task.dueDate = dueDate;
    }

    await task.save();

    return res.status(200).json({
      message: "Task updated successfully",
      task,
    });
  } catch (error) {
    console.error("UPDATE TASK ERROR:", error);

    return res.status(500).json({
      message: "Failed to update task",
      error: error instanceof Error ? error.message : error,
    });
  }
};

export const deleteTask = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    await Task.findByIdAndDelete(id);

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
