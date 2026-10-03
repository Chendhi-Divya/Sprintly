import type { Request, Response, NextFunction } from "express";
import Project from "../models/project.js";
import Task from "../models/task.js";

type AuthenticatedRequest = Request & {
  user?: {
    id?: string;
  };
};

export const checkProjectMember = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const projectId = req.body.project;

    if (!projectId) {
      return res.status(400).json({
        message: "Project ID is required",
      });
    }

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    const userId = req.user?.id;

    const isMember = project.members.some(
      (member) => member.toString() === userId
    );

    if (!isMember) {
      return res.status(403).json({
        message: "You are not a member of this project",
      });
    }

    next();
  } catch (error) {
    res.status(500).json({
      message: "Authorization failed",
      error,
    });
  }
};


export const checkTaskProjectMember = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
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

    const userId = req.user?.id;

    const isMember = project.members.some(
      (member) => member.toString() === userId
    );

    if (!isMember) {
      return res.status(403).json({
        message: "You are not a member of this project",
      });
    }

    next();
  } catch (error) {
    res.status(500).json({
      message: "Authorization failed",
      error,
    });
  }
};