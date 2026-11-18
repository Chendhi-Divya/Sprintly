
import type { Request, Response } from "express";
import mongoose from "mongoose";

import Project from "../models/project.js";
import Organization from "../models/Organization.js";
import User from "../models/User.js";
import Task from "../models/task.js";
import TaskCounter from "../models/taskCounter.js";

/* --------------------------------------------------
   HELPER FUNCTIONS
-------------------------------------------------- */

// Normalize Express route parameters.
function routeParam(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

// Generate a project key from its name.
function makeProjectKey(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const initials = words.map((word) => word[0]).join("");

  const candidate = (words.length > 1 ? initials : words[0] ?? "PRJ")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 4);

  return candidate.length >= 2 ? candidate : "PRJ";
}

// Generate a unique project key.
async function getUniqueProjectKey(
  name: string,
  organization: string,
  excludeProjectId?: mongoose.Types.ObjectId
): Promise<string> {
  const baseKey = makeProjectKey(name);

  let key = baseKey;
  let suffix = 2;

  while (
    await Project.exists({
      key,
      organization,
      ...(excludeProjectId
        ? { _id: { $ne: excludeProjectId } }
        : {}),
    })
  ) {
    key = `${baseKey.slice(0, 6)}${suffix}`;
    suffix += 1;
  }

  return key;
}

// Find the organization associated with a project.
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

// Get a user's organization role.
function getOrganizationRole(
  organization: any,
  userId: string
): string | undefined {
  if (organization.admin?.toString() === userId) {
    return "Owner";
  }

  const membership = organization.memberships?.find((item: any) => {
    const membershipUserId =
      item.user?._id?.toString() ??
      item.user?.toString();

    return membershipUserId === userId;
  });

  return membership?.role;
}

// Get organization Owners, Admins, and Members.
// Viewers are excluded.
function getEligibleOrganizationMemberIds(
  organization: any
): string[] {
  const eligibleMembers: string[] = [];

  for (const membership of organization.memberships ?? []) {
    if (
      ["Owner", "Admin", "Member"].includes(membership.role)
    ) {
      const user = membership.user;

      const memberId =
        user?._id?.toString() ??
        user?.toString();

      if (memberId) {
        eligibleMembers.push(memberId);
      }
    }
  }

  if (organization.admin) {
    eligibleMembers.push(organization.admin.toString());
  }

  return Array.from(new Set(eligibleMembers));
}

// Automatically include organization Owners, Admins, and Members
// in every project. Do not automatically include Viewers.
async function ensureDefaultProjectMembers(
  project: any,
  organization: any
): Promise<void> {
  const eligibleMembers =
    getEligibleOrganizationMemberIds(organization);

  const existingMemberIds = new Set<string>(
    (project.members ?? []).map((member: any) =>
      member?._id
        ? member._id.toString()
        : member.toString()
    )
  );

  let changed = false;

  for (const memberId of eligibleMembers) {
    if (!existingMemberIds.has(memberId)) {
      project.members.push(
        new mongoose.Types.ObjectId(memberId)
      );

      existingMemberIds.add(memberId);
      changed = true;
    }
  }

  if (changed) {
    await project.save();
  }
}

// Only organization Owners and Admins can manage projects.
async function canManageProject(
  project: {
    organization: string;
  },
  userId: string
): Promise<boolean> {
  if (!userId) {
    return false;
  }

  const organization = await getProjectOrganization(project);

  if (!organization) {
    return false;
  }

  const role = getOrganizationRole(organization, userId);

  return role === "Owner" || role === "Admin";
}

// Check whether a user can access a project.
async function canAccessProject(
  project: any,
  userId: string
): Promise<boolean> {
  if (!userId) {
    return false;
  }

  const organization = await getProjectOrganization(project);

  if (!organization) {
    return false;
  }

  const role = getOrganizationRole(organization, userId);

  // Viewers cannot access projects.
  if (role === "Viewer") {
    return false;
  }

  // Organization Owners and Admins can access every project.
  if (role === "Owner" || role === "Admin") {
    return true;
  }

  // Organization Members automatically belong to every project.
  if (role === "Member") {
    await ensureDefaultProjectMembers(project, organization);
    return true;
  }

  // Project-only invitees can access only projects they belong to.
  return (project.members ?? []).some((member: any) => {
    const memberId = member?._id
      ? member._id.toString()
      : member.toString();

    return memberId === userId;
  });
}

// Change all task keys when a project's issue key changes.
async function updateProjectTaskKeys(
  projectId: mongoose.Types.ObjectId,
  projectKey: string
): Promise<void> {
  const tasks = await Task.find({
    project: projectId,
  }).sort({
    createdAt: 1,
    _id: 1,
  });

  // First assign temporary unique keys.
  for (const task of tasks) {
    task.taskKey = `TMP-${task._id.toString()}`;
    await task.save();
  }

  // Assign the new project key and sequence.
  for (const [index, task] of tasks.entries()) {
    task.taskKey = `${projectKey}-${String(index + 1).padStart(2, "0")}`;
    await task.save();
  }

  // Keep the counter synchronized.
  await TaskCounter.updateOne(
    { _id: projectId.toString() },
    {
      $set: {
        seq: tasks.length,
      },
    },
    {
      upsert: true,
    }
  );
}

/* --------------------------------------------------
   CREATE PROJECT
-------------------------------------------------- */

export const createProject = async (
  req: Request,
  res: Response
) => {
  try {
    const { name, key, description, organization } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof key !== "string" ||
      !key.trim() ||
      typeof organization !== "string" ||
      !organization.trim()
    ) {
      return res.status(400).json({
        message: "Project name, key, and organization are required",
      });
    }

    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({
        message: "User is not authenticated",
      });
    }

    const projectKey = key.trim().toUpperCase();

    if (!/^[A-Z][A-Z0-9]{1,9}$/.test(projectKey)) {
      return res.status(400).json({
        message:
          "Project key must start with a letter and contain 2–10 letters or numbers",
      });
    }

    if (
      description !== undefined &&
      typeof description !== "string"
    ) {
      return res.status(400).json({
        message: "Description must be a string",
      });
    }

    const organizationMatch = [
      { org_id: organization },
      ...(mongoose.isValidObjectId(organization)
        ? [{ _id: organization }]
        : []),
    ];

    const selectedOrganization = await Organization.findOne({
      $or: organizationMatch,
    });

    if (!selectedOrganization) {
      return res.status(404).json({
        message: "Organization not found",
      });
    }

    const organizationRole = getOrganizationRole(
      selectedOrganization,
      userId
    );

    if (
      organizationRole !== "Owner" &&
      organizationRole !== "Admin"
    ) {
      return res.status(403).json({
        message: "Only organization Owners and Admins can create projects",
      });
    }

    const existingProject = await Project.exists({
      key: projectKey,
      organization: selectedOrganization.org_id,
    });

    if (existingProject) {
      return res.status(409).json({
        message: `The project key "${projectKey}" is already in use. Please choose another key.`,
      });
    }

    const projectMembers = getEligibleOrganizationMemberIds(
      selectedOrganization
    ).map((memberId) => new mongoose.Types.ObjectId(memberId));

    const project = await Project.create({
      name: name.trim(),
      key: projectKey,
      description: description?.trim() ?? "",
      organization: selectedOrganization.org_id,
      owner: userId,
      members: projectMembers,
    });

    const populatedProject = await Project.findById(project._id)
      .populate("owner", "name email")
      .populate("members", "name email");

    return res.status(201).json({
      message: "Project created successfully",
      project: populatedProject,
    });
  } catch (error) {
    console.error("CREATE PROJECT ERROR:", error);

    if ((error as any)?.code === 11000) {
      return res.status(409).json({
        message: "A project with this issue key already exists",
      });
    }

    return res.status(500).json({
      message: "Failed to create project",
      error: error instanceof Error ? error.message : error,
    });
  }
};

/* --------------------------------------------------
   GET PROJECTS
-------------------------------------------------- */

export const getProjects = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = (req as any).userId;
    const organizationId = req.query.organizationId;

    if (!userId) {
      return res.status(401).json({
        message: "User is not authenticated",
      });
    }

    if (
      typeof organizationId !== "string" ||
      !organizationId.trim()
    ) {
      return res.status(400).json({
        message: "Organization ID is required",
      });
    }

    const organizationMatch = [
      { org_id: organizationId },
      { org_name: organizationId },
      ...(mongoose.isValidObjectId(organizationId)
        ? [{ _id: organizationId }]
        : []),
    ];

    const organization = await Organization.findOne({
      $or: organizationMatch,
    }).select("org_id org_name admin members memberships");

    if (!organization) {
      return res.status(404).json({
        message: "Organization not found",
      });
    }

    const membershipRole = getOrganizationRole(
      organization,
      userId
    );

    if (membershipRole === "Viewer") {
      return res.status(200).json({
        message: "Projects fetched successfully",
        projects: [],
      });
    }

    const isOrganizationAdmin =
      membershipRole === "Owner" ||
      membershipRole === "Admin";

    const isOrganizationMember =
      membershipRole === "Member";

    const projectOrganizationValues = [
      organization.org_id,
      organization._id.toString(),
      organization.org_name,
    ];

    const projectFilter: any = {
      organization: {
        $in: projectOrganizationValues,
      },
    };

    if (!isOrganizationAdmin && !isOrganizationMember) {
      projectFilter.members = userId;
    }

    const projects = await Project.find(projectFilter)
      .sort({ createdAt: -1 });

    const organizationNames = new Map<string, string>();

    organizationNames.set(
      organization.org_id.trim().toLowerCase(),
      organization.org_name
    );

    organizationNames.set(
      organization._id.toString().toLowerCase(),
      organization.org_name
    );

    organizationNames.set(
      organization.org_name.trim().toLowerCase(),
      organization.org_name
    );

    const projectsWithOrganizationNames = await Promise.all(
      projects.map(async (project) => {
        await ensureDefaultProjectMembers(project, organization);

        if (!project.key) {
          project.key = await getUniqueProjectKey(
            project.name,
            project.organization
          );

          await project.save();
        }

        const populatedProject = await project.populate([
          {
            path: "owner",
            select: "name email",
          },
          {
            path: "members",
            select: "name email",
          },
        ]);

        const projectData = populatedProject.toObject();

        const organizationValue = project.organization
          .trim()
          .toLowerCase();

        return {
          ...projectData,
          organizationName: organizationNames.get(
            organizationValue
          ),
        };
      })
    );

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

/* --------------------------------------------------
   GET PROJECT BY ID
-------------------------------------------------- */

export const getProjectById = async (
  req: Request,
  res: Response
) => {
  try {
    const id = routeParam(req.params.id);
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

    const hasAccess = await canAccessProject(project, userId);

    if (!hasAccess) {
      return res.status(403).json({
        message: "You do not have access to this project",
      });
    }

    const populatedProject = await project.populate([
      {
        path: "owner",
        select: "name email",
      },
      {
        path: "members",
        select: "name email",
      },
    ]);

    return res.status(200).json({
      message: "Project fetched successfully",
      project: populatedProject.toObject(),
    });
  } catch (error) {
    console.error("GET PROJECT ERROR:", error);

    return res.status(500).json({
      message: "Failed to fetch project",
      error: error instanceof Error ? error.message : error,
    });
  }
};

/* --------------------------------------------------
   UPDATE PROJECT
-------------------------------------------------- */

export const updateProject = async (
  req: Request,
  res: Response
) => {
  try {
    const id = routeParam(req.params.id);

    const {
      name,
      description,
      key: requestedKey,
      ownerId,
    } = req.body;

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
          "Only organization Owners and Admins can update this project",
      });
    }

    const organization = await getProjectOrganization(project);

    if (!organization) {
      return res.status(404).json({
        message: "Project organization not found",
      });
    }

    await ensureDefaultProjectMembers(project, organization);

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({
          message: "Project name cannot be empty",
        });
      }

      project.name = name.trim();
    }

    if (description !== undefined) {
      if (typeof description !== "string") {
        return res.status(400).json({
          message: "Description must be a string",
        });
      }

      project.description = description.trim();
    }

    let keyChanged = false;

    if (requestedKey !== undefined) {
      if (
        typeof requestedKey !== "string" ||
        !requestedKey.trim()
      ) {
        return res.status(400).json({
          message: "Project issue key cannot be empty",
        });
      }

      const projectKey = requestedKey.trim().toUpperCase();

      if (!/^[A-Z][A-Z0-9]{1,9}$/.test(projectKey)) {
        return res.status(400).json({
          message:
            "Project key must start with a letter and contain 2–10 letters or numbers",
        });
      }

      const existingProject = await Project.exists({
        key: projectKey,
        organization: project.organization,
        _id: { $ne: project._id },
      });

      if (existingProject) {
        return res.status(409).json({
          message: `The project key "${projectKey}" is already in use. Please choose another key.`,
        });
      }

      keyChanged = projectKey !== project.key;

      if (keyChanged) {
        project.key = projectKey;
      }
    }

    if (ownerId !== undefined) {
      if (
        typeof ownerId !== "string" ||
        !mongoose.isValidObjectId(ownerId)
      ) {
        return res.status(400).json({
          message: "A valid project owner ID is required",
        });
      }

      const isProjectMember = project.members.some(
        (member) => member.toString() === ownerId
      );

      if (!isProjectMember) {
        return res.status(400).json({
          message:
            "The new project owner must already be a member of this project. Add them as a project member first.",
        });
      }

      const newOwnerRole = getOrganizationRole(
        organization,
        ownerId
      );

      if (!newOwnerRole || newOwnerRole === "Viewer") {
        return res.status(400).json({
          message:
            "The new project owner must be an organization Owner, Admin, or Member",
        });
      }

      const newOwner = await User.findById(ownerId);

      if (!newOwner) {
        return res.status(404).json({
          message: "The selected project owner was not found",
        });
      }

      if (project.owner.toString() !== ownerId) {
        project.owner = newOwner._id;
      }
    }

    await project.save();

    if (keyChanged && project.key) {
      await updateProjectTaskKeys(project._id, project.key);
    }

    const updatedProject = await Project.findById(project._id)
      .populate("owner", "name email")
      .populate("members", "name email");

    return res.status(200).json({
      message: "Project updated successfully",
      project: updatedProject,
    });
  } catch (error) {
    console.error("UPDATE PROJECT ERROR:", error);

    if ((error as any)?.code === 11000) {
      return res.status(409).json({
        message: "This project key is already in use in this organization.",
      });
    }

    return res.status(500).json({
      message: "Failed to update project",
      error: error instanceof Error ? error.message : error,
    });
  }
};

/* --------------------------------------------------
   DELETE PROJECT
-------------------------------------------------- */

export const deleteProject = async (
  req: Request,
  res: Response
) => {
  try {
    const id = routeParam(req.params.id);
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
          "Only organization Owners and Admins can delete this project",
      });
    }

    await Task.deleteMany({
      project: project._id,
    });

    await TaskCounter.deleteOne({
      _id: project._id.toString(),
    });

    await Project.findByIdAndDelete(id);

    return res.status(200).json({
      message: "Project and its tasks deleted successfully",
    });
  } catch (error) {
    console.error("DELETE PROJECT ERROR:", error);

    return res.status(500).json({
      message: "Failed to delete project",
      error: error instanceof Error ? error.message : error,
    });
  }
};

/* --------------------------------------------------
   ADD PROJECT MEMBER
-------------------------------------------------- */

export const addProjectMember = async (
  req: Request,
  res: Response
) => {
  try {
    const id = routeParam(req.params.id);
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
          "Only organization Owners and Admins can add project members",
      });
    }

    const organization = await getProjectOrganization(project);

    if (!organization) {
      return res.status(404).json({
        message: "Project organization not found",
      });
    }

    await ensureDefaultProjectMembers(project, organization);

    const newMemberRole = getOrganizationRole(
      organization,
      newMemberId
    );

    if (!newMemberRole || newMemberRole === "Viewer") {
      return res.status(400).json({
        message:
          "User must be an organization Owner, Admin, or Member to be added to a project",
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

    const updatedProject = await Project.findById(project._id)
      .populate("owner", "name email")
      .populate("members", "name email");

    return res.status(200).json({
      message: "Project member added successfully",
      project: updatedProject,
    });
  } catch (error) {
    console.error("ADD PROJECT MEMBER ERROR:", error);

    return res.status(500).json({
      message: "Failed to add project member",
      error: error instanceof Error ? error.message : error,
    });
  }
};

/* --------------------------------------------------
   GET PROJECT MEMBERS
-------------------------------------------------- */

export const getProjectMembers = async (
  req: Request,
  res: Response
) => {
  try {
    const id = routeParam(req.params.id);
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

    const hasAccess = await canAccessProject(project, userId);

    if (!hasAccess) {
      return res.status(403).json({
        message:
          "You do not have access to this project's members",
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
      error: error instanceof Error ? error.message : error,
    });
  }
};

/* --------------------------------------------------
   REMOVE PROJECT MEMBER
-------------------------------------------------- */

export const removeProjectMember = async (
  req: Request,
  res: Response
) => {
  try {
    const id = routeParam(req.params.id);
    const memberId = routeParam(req.params.memberId);
    const loggedInUserId = (req as any).userId;

    if (!loggedInUserId) {
      return res.status(401).json({
        message: "User is not authenticated",
      });
    }

    if (
      !mongoose.isValidObjectId(id) ||
      !mongoose.isValidObjectId(memberId)
    ) {
      return res.status(400).json({
        message: "Invalid project or member ID",
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
          "Only organization Owners and Admins can manage project members",
      });
    }

    const organization = await getProjectOrganization(project);

    if (!organization) {
      return res.status(404).json({
        message: "Project organization not found",
      });
    }

    await ensureDefaultProjectMembers(project, organization);

    // Organization Owners, Admins, and Members are automatically
    // included in every project, so they cannot be removed here.
    const memberRole = getOrganizationRole(
      organization,
      memberId
    );

    if (
      project.owner.toString() === memberId ||
      memberRole === "Owner" ||
      memberRole === "Admin" ||
      memberRole === "Member"
    ) {
      return res.status(400).json({
        message:
          "The project owner and organization Owners, Admins, and Members cannot be removed from project members",
      });
    }

    const isMember = project.members.some(
      (member) => member.toString() === memberId
    );

    if (!isMember) {
      return res.status(404).json({
        message: "User is not a member of this project",
      });
    }

    // Check whether this member has unfinished assigned tasks.
    const assignedTasks = await Task.find({
      project: id,
      assignee: memberId,
      status: { $ne: "Done" },
    } as any).select("taskKey title status");

    if (assignedTasks.length > 0) {
      return res.status(400).json({
        message:
          "This member has unfinished assigned tasks. Reassign those tasks before removing the member.",
        assignedTasks: assignedTasks.map((task) => ({
          _id: task._id,
          taskKey: task.taskKey,
          title: task.title,
          status: task.status,
        })),
      });
    }

    // Remove the project-only member from this project.
    project.members = project.members.filter(
      (member) => member.toString() !== memberId
    );

    await project.save();

    const updatedProject = await Project.findById(project._id)
      .populate("owner", "name email")
      .populate("members", "name email");

    return res.status(200).json({
      message: "Project member removed successfully",
      project: updatedProject,
    });
  } catch (error) {
    console.error("REMOVE PROJECT MEMBER ERROR:", error);

    return res.status(500).json({
      message: "Failed to remove project member",
      error: error instanceof Error ? error.message : error,
    });
  }
};
