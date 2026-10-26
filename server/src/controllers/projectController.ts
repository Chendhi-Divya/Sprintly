import type { Request, Response } from "express";
import Project from "../models/project.js";
import User from "../models/User.js";

export const createProject = async (req: Request, res: Response) => {
  try {
    const { name, description, organization } = req.body;

    if (!name || !organization) {
      return res.status(400).json({
        message: "Project name and organization are required",
      });
    }

    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({
        message: "User is not authenticated",
      });
    }

    const project = await Project.create({
      name,
      description,
      organization,
      owner: userId,
      members: [userId],
    });

    return res.status(201).json({
      message: "Project created successfully",
      project,
    });
  } catch (error) {
    console.error("CREATE PROJECT ERROR:", error);

    return res.status(500).json({
      message: "Failed to create project",
      error: error instanceof Error ? error.message : error,
    });
  }
};

export const getProjects = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({
        message: "User is not authenticated",
      });
    }

    const projects = await Project.find({
      members: userId,
    });

    return res.status(200).json({
      message: "Projects fetched successfully",
      projects,
    });
  } catch (error) {
    console.error("GET PROJECTS ERROR:", error);

    return res.status(500).json({
      message: "Failed to fetch projects",
      error: error instanceof Error ? error.message : error,
    });
  }
};

export const getProjectById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    return res.status(200).json({
      message: "Project fetched successfully",
      project,
    });
  } catch (error) {
    console.error("GET PROJECT ERROR:", error);

    return res.status(500).json({
      message: "Failed to fetch project",
      error: error instanceof Error ? error.message : error,
    });
  }
};

export const updateProject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    if (name !== undefined) {
      project.name = name;
    }

    if (description !== undefined) {
      project.description = description;
    }

    await project.save();

    return res.status(200).json({
      message: "Project updated successfully",
      project,
    });
  } catch (error) {
    console.error("UPDATE PROJECT ERROR:", error);

    return res.status(500).json({
      message: "Failed to update project",
      error: error instanceof Error ? error.message : error,
    });
  }
};

export const deleteProject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    await Project.findByIdAndDelete(id);

    return res.status(200).json({
      message: "Project deleted successfully",
    });
  } catch (error) {
    console.error("DELETE PROJECT ERROR:", error);

    return res.status(500).json({
      message: "Failed to delete project",
      error: error instanceof Error ? error.message : error,
    });
  }
};
export const addProjectMember = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        message: "User ID is required",
      });
    }

    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const alreadyMember = project.members.some(
      (member) => member.toString() === userId
    );

    if (alreadyMember) {
      return res.status(400).json({
        message: "User is already a project member",
      });
    }

    project.members.push(user._id);

    await project.save();

    return res.status(200).json({
      message: "Project member added successfully",
      project,
    });
  } catch (error) {
    console.log("Add project member error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

export const getProjectMembers = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = req.params;
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({
        message: "User is not authenticated",
      });
    }

    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    // Only project members can view the member list
    const isMember = project.members.some(
      (member) => member.toString() === userId
    );

    if (!isMember) {
      return res.status(403).json({
        message: "You are not a member of this project",
      });
    }

    const members = await User.find({
      _id: { $in: project.members },
    }).select("_id name email");

    return res.status(200).json({
      message: "Project members fetched successfully",
      members,
    });
  } catch (error) {
    console.error("GET PROJECT MEMBERS ERROR:", error);

    return res.status(500).json({
      message: "Failed to fetch project members",
    });
  }
};
