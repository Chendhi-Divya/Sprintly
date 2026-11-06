
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

// Generate a project key from its name.
// Example: Sprintly Demo -> SD
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
// Example: SD, SD2, SD3
async function getUniqueProjectKey(
  name: string,
  excludeProjectId?: mongoose.Types.ObjectId
): Promise<string> {
  const baseKey = makeProjectKey(name);

  let key = baseKey;
  let suffix = 2;

  while (
    await Project.exists({
      key,
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
): string {
  const membership = organization.memberships?.find(
    (item: any) => item.user?.toString() === userId
  );

  if (membership?.role) {
    return membership.role;
  }

  if (organization.admin?.toString() === userId) {
    return "Owner";
  }

  return "Member";
}

// Automatically include the project creator and organization Owner
// in the project members array.
//
// This also updates existing projects when they are accessed.
async function ensureDefaultProjectMembers(
  project: any,
  organization: any
): Promise<void> {
  const defaultMemberIds = [
    project.owner?.toString(),
    organization.admin?.toString(),
  ].filter((id): id is string => Boolean(id));

  const existingMemberIds = new Set(
    project.members.map((member: mongoose.Types.ObjectId) =>
      member.toString()
    )
  );

  let changed = false;

  for (const memberId of defaultMemberIds) {
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

// Check whether a user can manage a project.
// The project owner and organization Owner/Admin can manage it.
async function canManageProject(
  project: {
    owner: mongoose.Types.ObjectId;
    organization: string;
  },
  userId: string
): Promise<boolean> {
  if (!userId) {
    return false;
  }

  if (project.owner.toString() === userId) {
    return true;
  }

  const organization = await getProjectOrganization(project);

  if (!organization) {
    return false;
  }

  const role = getOrganizationRole(organization, userId);

  return role === "Owner" || role === "Admin";
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
  // This avoids conflicts with the unique taskKey index.
  for (const task of tasks) {
    task.taskKey = `TMP-${task._id.toString()}`;
    await task.save();
  }

  // Assign the new project key and sequence.
  for (const [index, task] of tasks.entries()) {
    task.taskKey = `${projectKey}-${String(index + 1).padStart(2, "0")}`;
    await task.save();
  }

  // Keep the counter synchronized with the number of tasks.
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
      members: userId,
      $or: organizationMatch,
    });

    if (!selectedOrganization) {
      return res.status(403).json({
        message:
          "You must belong to the selected organization to create a project",
      });
    }

    const organizationRole = getOrganizationRole(
      selectedOrganization,
      userId
    );

    if (organizationRole === "Viewer") {
      return res.status(403).json({
        message: "Viewers cannot create projects",
      });
    }

    const existingProject = await Project.exists({
      key: projectKey,
    });

    if (existingProject) {
      return res.status(409).json({
        message: `The project key "${projectKey}" is already in use. Please choose another key.`,
      });
    }

    // Automatically add:
    // 1. The project creator.
    // 2. The organization Owner.
    //
    // Set removes duplicate IDs if both users are the same.
    const defaultMembers = [
      userId.toString(),
      selectedOrganization.admin.toString(),
    ];

    const projectMembers = [
      ...new Set(defaultMembers),
    ].map((memberId) => new mongoose.Types.ObjectId(memberId));

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
      ...(mongoose.isValidObjectId(organizationId)
        ? [{ _id: organizationId }]
        : []),
    ];

    const organization = await Organization.findOne({
      members: userId,
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

    const isOrganizationAdmin =
      membershipRole === "Owner" ||
      membershipRole === "Admin";

    const projectOrganizationValues = [
      organization.org_id,
      organization._id.toString(),
      organization.org_name,
    ];

    const projectFilter = {
      organization: {
        $in: projectOrganizationValues,
      },
      ...(!isOrganizationAdmin && {
        members: userId,
      }),
    };

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
        // Add creator and organization Owner to existing projects too.
        await ensureDefaultProjectMembers(project, organization);

        if (!project.key) {
          project.key = await getUniqueProjectKey(project.name);
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

    const canManage = await canManageProject(
      project,
      userId
    );

    if (!isProjectMember && !canManage) {
      return res.status(403).json({
        message: "You do not have access to this project",
      });
    }

    const organization = await getProjectOrganization(project);

    if (organization) {
      await ensureDefaultProjectMembers(project, organization);
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
    const { id } = req.params;

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

    const canManage = await canManageProject(
      project,
      userId
    );

    if (!canManage) {
      return res.status(403).json({
        message:
          "Only the project owner or organization admin can update this project",
      });
    }

    const organization = await getProjectOrganization(project);

    if (!organization) {
      return res.status(404).json({
        message: "Project organization not found",
      });
    }

    // Ensure creator and organization Owner are project members.
    await ensureDefaultProjectMembers(project, organization);

    // UPDATE PROJECT NAME
    if (name !== undefined) {
      if (
        typeof name !== "string" ||
        !name.trim()
      ) {
        return res.status(400).json({
          message: "Project name cannot be empty",
        });
      }

      project.name = name.trim();
    }

    // UPDATE PROJECT DESCRIPTION
    if (description !== undefined) {
      if (typeof description !== "string") {
        return res.status(400).json({
          message: "Description must be a string",
        });
      }

      project.description = description.trim();
    }

    // UPDATE PROJECT ISSUE KEY
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

    // CHANGE PROJECT OWNER
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

      const isOrganizationMember = organization.members.some(
        (member) => member.toString() === ownerId
      );

      if (!isOrganizationMember) {
        return res.status(400).json({
          message:
            "The new project owner must belong to the project organization",
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

    // Update existing task keys if the project key changed.
    if (keyChanged && project.key) {
      await updateProjectTaskKeys(
        project._id,
        project.key
      );
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
        message: "That project issue key is already in use",
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

    const canManage = await canManageProject(
      project,
      userId
    );

    if (!canManage) {
      return res.status(403).json({
        message:
          "Only the project owner or organization admin can delete this project",
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

    await ensureDefaultProjectMembers(project, organization);

    const isOrganizationMember = organization.members.some(
      (member) => member.toString() === newMemberId
    );

    if (!isOrganizationMember) {
      return res.status(400).json({
        message:
          "User must belong to the project organization first",
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

    const canManage = await canManageProject(
      project,
      userId
    );

    if (!isProjectMember && !canManage) {
      return res.status(403).json({
        message:
          "You do not have access to this project's members",
      });
    }

    const organization = await getProjectOrganization(project);

    if (organization) {
      await ensureDefaultProjectMembers(project, organization);
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
    const { id, memberId } = req.params;
    const loggedInUserId = (req as any).userId;

    if (!loggedInUserId) {
      return res.status(401).json({
        message: "User is not authenticated",
      });
    }

    if (
      typeof memberId !== "string" ||
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
          "Only the project owner or organization admin can manage project members",
      });
    }

    const organization = await getProjectOrganization(project);

    if (!organization) {
      return res.status(404).json({
        message: "Project organization not found",
      });
    }

    await ensureDefaultProjectMembers(project, organization);

    // Neither the project owner nor the organization Owner
    // can be removed from the project members list.
    const isOrganizationOwner =
      organization.admin?.toString() === memberId;

    if (
      project.owner.toString() === memberId ||
      isOrganizationOwner
    ) {
      return res.status(400).json({
        message:
          "The project owner and organization Owner cannot be removed from project members",
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
    const projectIdString = Array.isArray(id) ? id[0] : id;
    const memberIdString = Array.isArray(memberId) ? memberId[0] : memberId;

    if (!projectIdString || !memberIdString) {
      return res.status(400).json({
        message: "Invalid project or member ID",
      });
    }

    const taskFilter: any = {
      project: new mongoose.Types.ObjectId(projectIdString),
      assignee: new mongoose.Types.ObjectId(memberIdString),
      status: { $ne: "Done" },
    };

    const assignedTasks = await Task.find(taskFilter)
      .select("taskKey title status");

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

    // Remove the member from the project.
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
