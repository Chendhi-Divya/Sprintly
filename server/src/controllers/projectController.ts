import type { Request, Response } from "express";
import mongoose from "mongoose";
import Project from "../models/project.js";
import Organization from "../models/Organization.js";
import User from "../models/User.js";
import Task from "../models/task.js";
import TaskCounter from "../models/taskCounter.js";

function makeProjectKey(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const initials = words.map((word) => word[0]).join("");
  const candidate = (words.length > 1 ? initials : words[0] ?? "PRJ")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 4);

  return candidate.length >= 2 ? candidate : "PRJ";
}

async function getUniqueProjectKey(
  name: string,
  excludeProjectId?: mongoose.Types.ObjectId
): Promise<string> {
  const baseKey = makeProjectKey(name);
  let key = baseKey;
  let suffix = 2;

  while (await Project.exists({
    key,
    ...(excludeProjectId ? { _id: { $ne: excludeProjectId } } : {}),
  })) {
    key = `${baseKey.slice(0, 6)}${suffix}`;
    suffix += 1;
  }

  return key;
}

async function updateProjectTaskKeys(
  projectId: mongoose.Types.ObjectId,
  projectKey: string
): Promise<void> {
  const tasks = await Task.find({ project: projectId }).sort({ createdAt: 1, _id: 1 });

  // Temporarily move old identifiers out of the way because taskKey is unique.
  for (const task of tasks) {
    task.taskKey = `TMP-${task._id.toString()}`;
    await task.save();
  }

  for (const [index, task] of tasks.entries()) {
    task.taskKey = `${projectKey}-${String(index + 1).padStart(2, "0")}`;
    await task.save();
  }

  await TaskCounter.updateOne(
    { _id: projectId.toString() },
    { $set: { seq: tasks.length } },
    { upsert: true }
  );
}


async function getProjectOrganization(project: {
  organization: string;
}) {
  const organizationValue = project.organization;

  const organizationMatch = [
    { org_id: organizationValue },
    { org_name: organizationValue },
    ...(mongoose.isValidObjectId(organizationValue)
      ? [{ _id: organizationValue }]
      : []),
  ];

  return Organization.findOne({
    $or: organizationMatch,
  });
}

async function canManageProject(
  project: {
    owner: mongoose.Types.ObjectId;
    organization: string;
  },
  userId: string
): Promise<boolean> {
  // The project owner can manage their project.
  if (project.owner.toString() === userId) {
    return true;
  }

  // The organisation admin can also manage its projects.
  const organization = await getProjectOrganization(project);
  if (!organization) return false;

  const membershipRole = organization.memberships?.find(
    (membership: any) => membership.user.toString() === userId
  )?.role;

  return (
    organization.admin.toString() === userId ||
    membershipRole === "Owner" ||
    membershipRole === "Admin"
  );
}

export const createProject = async (req: Request, res: Response) => {
  try {
    const { name, description, organization } = req.body;

    if (typeof name !== "string" || !name.trim() || !organization) {
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

    const organizationMatch = [
      { org_id: organization },
      ...(mongoose.isValidObjectId(organization)
        ? [{ _id: organization }]
        : []),
    ];
    const selectedOrganization = await Organization.findOne({
      members: userId,
      $or: organizationMatch,
    });

    if (!selectedOrganization) {
      return res.status(403).json({
        message: "You must belong to the selected organization to create a project",
      });
    }

    const membership = selectedOrganization.memberships.find(
      (item: any) => item.user.toString() === userId
    );
    const organizationRole = membership?.role ??
      (selectedOrganization.admin.toString() === userId ? "Owner" : "Member");
    if (organizationRole === "Viewer") {
      return res.status(403).json({
        message: "Viewers cannot create projects",
      });
    }

    const project = await Project.create({
      name: name.trim(),
      key: await getUniqueProjectKey(name),
      description,
      organization: selectedOrganization.org_id,
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
    const organizationId = req.query.organizationId;

    if (!userId) {
      return res.status(401).json({
        message: "User is not authenticated",
      });
    }

    if (typeof organizationId !== "string" || !organizationId.trim()) {
      return res.status(400).json({
        message: "Organization ID is required",
      });
    }

    const organizationMatch = [
      { org_id: organizationId },
      ...(mongoose.isValidObjectId(organizationId)
        ? [{ _id: organizationId }]
        : []),
    ];
    const organization = await Organization.findOne({
  members: userId,
  $or: organizationMatch,
}).select("org_id org_name admin");

    if (!organization) {
      return res.status(404).json({
        message: "Organization not found",
      });
    }

    const projectOrganizationValues = [
      organization.org_id,
      organization._id.toString(),
      organization.org_name,
    ];
    const membershipRole = organization.memberships?.find(
      (membership: any) => membership.user.toString() === userId
    )?.role;
    const isOrganizationAdmin =
      organization.admin.toString() === userId ||
      membershipRole === "Owner" ||
      membershipRole === "Admin";

const projectFilter = {
  organization: { $in: projectOrganizationValues },
  ...(!isOrganizationAdmin && { members: userId }),
};

  const projects = await Project.find(projectFilter).populate("owner", "name email");
    const organizationNames = new Map<string, string>();
    organizationNames.set(organization.org_id.trim().toLowerCase(), organization.org_name);
    organizationNames.set(organization._id.toString().toLowerCase(), organization.org_name);
    organizationNames.set(organization.org_name.trim().toLowerCase(), organization.org_name);

    const projectsWithOrganizationNames = await Promise.all(projects.map(async (project) => {
      if (!project.key) {
        project.key = await getUniqueProjectKey(project.name);
        await project.save();
      }

      const projectData = project.toObject();
      const organizationValue = project.organization.trim().toLowerCase();

      return {
        ...projectData,
        organizationName: organizationNames.get(organizationValue),
      };
    }));

    return res.status(200).json({
      message: "Projects fetched successfully",
      projects: projectsWithOrganizationNames,
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
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({
        message: "User is not authenticated",
      });
    }

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid project ID",
      });
    }

    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    const isProjectMember = project.members.some(
      (member) => member.toString() === userId
    );

    const canManage = await canManageProject(project, userId);

    if (!isProjectMember && !canManage) {
      return res.status(403).json({
        message: "You do not have access to this project",
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
    });
  }
};


export const updateProject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, key: requestedKey } = req.body;
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({
        message: "User is not authenticated",
      });
    }

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid project ID",
      });
    }

    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    const canManage = await canManageProject(project, userId);

    if (!canManage) {
      return res.status(403).json({
        message:
          "Only the project owner or organization admin can update this project",
      });
    }

    const previousName = project.name;
    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({
          message: "Project name cannot be empty",
        });
      }

      project.name = name.trim();
    }

    const hasNameChange = name !== undefined && name.trim() !== previousName;

    if (requestedKey !== undefined && (
      typeof requestedKey !== "string" ||
      !/^[A-Z0-9]{2,8}$/.test(requestedKey.trim().toUpperCase())
    )) {
      return res.status(400).json({
        message: "Project issue key must be 2–8 letters or numbers",
      });
    }

    const nextKey = requestedKey !== undefined
      ? requestedKey.trim().toUpperCase()
      : hasNameChange
        ? await getUniqueProjectKey(project.name, project._id)
        : project.key;

    const keyChanged = nextKey !== project.key;
    if (keyChanged) {
      project.key = nextKey;
    }

    if (description !== undefined) {
      if (typeof description !== "string") {
        return res.status(400).json({
          message: "Description must be a string",
        });
      }

      project.description = description.trim();
    }

    await project.save();

    if (keyChanged) {
      await updateProjectTaskKeys(project._id, project.key);
    }

    return res.status(200).json({
      message: "Project updated successfully",
      project,
    });
  } catch (error) {
    console.error("UPDATE PROJECT ERROR:", error);

    if ((error as any)?.code === 11000) {
      return res.status(409).json({
        message: "That project issue key is already in use",
      });
    }

    return res.status(500).json({
      message: "Failed to update project",
    });
  }
};


export const deleteProject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({
        message: "User is not authenticated",
      });
    }

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid project ID",
      });
    }

    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    const canManage = await canManageProject(project, userId);

    if (!canManage) {
      return res.status(403).json({
        message:
          "Only the project owner or organization admin can delete this project",
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
    });
  }
};


export const addProjectMember = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = req.params;
    const { userId: newMemberId } = req.body;
    const loggedInUserId = (req as any).userId;

    if (!loggedInUserId) {
      return res.status(401).json({
        message: "User is not authenticated",
      });
    }

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid project ID",
      });
    }

    if (
      typeof newMemberId !== "string" ||
      !mongoose.isValidObjectId(newMemberId)
    ) {
      return res.status(400).json({
        message: "A valid user ID is required",
      });
    }

    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    const canManage = await canManageProject(
      project,
      loggedInUserId
    );

    if (!canManage) {
      return res.status(403).json({
        message:
          "Only the project owner or organization admin can add members",
      });
    }

    const organization = await getProjectOrganization(project);

    if (!organization) {
      return res.status(404).json({
        message: "Project organization not found",
      });
    }

    const isOrganizationMember = organization.members.some(
      (member) => member.toString() === newMemberId
    );

    if (!isOrganizationMember) {
      return res.status(400).json({
        message: "User must belong to the project organization first",
      });
    }

    const user = await User.findById(newMemberId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const alreadyMember = project.members.some(
      (member) => member.toString() === newMemberId
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
    console.error("ADD PROJECT MEMBER ERROR:", error);

    return res.status(500).json({
      message: "Failed to add project member",
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

    if (typeof id !== "string" || !mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid project ID",
      });
    }

    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    const isProjectMember = project.members.some(
      (member) => member.toString() === userId
    );
    const canManage = await canManageProject(project, userId);

    if (!isProjectMember && !canManage) {
      return res.status(403).json({
        message: "You do not have access to this project's members",
      });
    }

    const populatedProject = await project.populate(
      "members",
      "name email"
    );

    return res.status(200).json({
      message: "Project members fetched successfully",
      members: populatedProject.members,
    });
  } catch (error) {
    console.error("GET PROJECT MEMBERS ERROR:", error);

    return res.status(500).json({
      message: "Failed to fetch project members",
    });
  }
};

export const removeProjectMember = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = req.params;
    const memberId = req.params.memberId;
    const loggedInUserId = (req as any).userId;

    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(memberId)) {
      return res.status(400).json({ message: "Invalid project or member ID" });
    }

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (!(await canManageProject(project, loggedInUserId))) {
      return res.status(403).json({ message: "Only the project owner or organization owner can manage project members" });
    }

    if (project.owner.toString() === memberId) {
      return res.status(400).json({ message: "The project owner cannot be removed" });
    }

    project.members = project.members.filter(
      (member) => member.toString() !== memberId
    );
    await project.save();
    return res.status(200).json({ message: "Project member removed" });
  } catch (error) {
    console.error("REMOVE PROJECT MEMBER ERROR:", error);
    return res.status(500).json({ message: "Failed to remove project member" });
  }
};

