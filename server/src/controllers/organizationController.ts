
import { type Request, type Response } from "express";
import mongoose from "mongoose";
import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";

import Organization from "../models/Organization.js";
import User from "../models/User.js";
import OrganizationInvitation from "../models/OrganizationInvitation.js";
import Project from "../models/project.js";
import TaskCounter from "../models/taskCounter.js";
import Task from "../models/task.js";

import { sendOrganizationInvitationEmail } from "../services/emailService.js";
import type { OrganizationRole } from "../models/Organization.js";

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

function routeParam(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

function getMemberRole(
  organization: any,
  userId: string
): OrganizationRole | undefined {
  if (!userId) return undefined;

  const id = userId.toString();

  if (organization.admin?.toString() === id) {
    return "Owner";
  }

  const membership = organization.memberships?.find(
    (item: any) => item.user?.toString() === id
  );

  return membership?.role;
}

function isProjectAccessRole(
  role: OrganizationRole | undefined
): boolean {
  return role === "Owner" || role === "Admin" || role === "Member";
}

// Synchronize existing organization members and membership records.
async function ensureMemberships(organization: any) {
  organization.members = organization.members ?? [];
  organization.memberships = organization.memberships ?? [];

  const adminId = organization.admin?.toString();

  if (!adminId) {
    throw new Error("Organization owner is missing");
  }

  const memberIds = new Set<string>();

  for (const member of organization.members) {
    const memberId = member?._id
      ? member._id.toString()
      : member?.toString();

    if (memberId && mongoose.isValidObjectId(memberId)) {
      memberIds.add(memberId);
    }
  }

  const membershipMap = new Map<string, any>();

  for (const membership of organization.memberships) {
    const memberId = membership.user?._id
      ? membership.user._id.toString()
      : membership.user?.toString();

    if (!memberId || !mongoose.isValidObjectId(memberId)) {
      continue;
    }

    if (!membershipMap.has(memberId)) {
      membershipMap.set(memberId, {
        user: new mongoose.Types.ObjectId(memberId),
        role: membership.role ?? "Member",
      });
    }
  }

  for (const memberId of membershipMap.keys()) {
    memberIds.add(memberId);
  }

  memberIds.add(adminId);

  for (const memberId of memberIds) {
    if (!membershipMap.has(memberId)) {
      membershipMap.set(memberId, {
        user: new mongoose.Types.ObjectId(memberId),
        role: memberId === adminId ? "Owner" : "Member",
      });
    }
  }

  const ownerMembership = membershipMap.get(adminId);

  if (ownerMembership) {
    ownerMembership.role = "Owner";
  }

  organization.members = Array.from(memberIds).map(
    (memberId) => new mongoose.Types.ObjectId(memberId)
  );

  organization.memberships = Array.from(membershipMap.values());

  organization.markModified("members");
  organization.markModified("memberships");

  await organization.save();
}

// Add or remove a user from every project according to their organization role.
async function syncUserProjectMembership(
  organizationId: string,
  userId: mongoose.Types.ObjectId | string,
  role: OrganizationRole
) {
  const userObjectId = new mongoose.Types.ObjectId(userId.toString());

  if (isProjectAccessRole(role)) {
    await Project.updateMany(
      { organization: organizationId },
      { $addToSet: { members: userObjectId } }
    );
  } else {
    await Project.updateMany(
      { organization: organizationId },
      { $pull: { members: userObjectId } }
    );
  }
}

// Add a user to one project without adding them to the organization.
async function addUserToProject(
  project: any,
  userId: mongoose.Types.ObjectId | string
) {
  const userObjectId = new mongoose.Types.ObjectId(userId.toString());

  await Project.updateOne(
    { _id: project._id },
    { $addToSet: { members: userObjectId } }
  );
}

// Shared invitation acceptance logic for ID and token acceptance.
async function acceptInvitationForUser(
  invitation: any,
  user: any
) {
  const organization = await Organization.findOne({
    org_id: invitation.organizationId,
  });

  if (!organization) {
    throw new Error("Organization not found");
  }

  await ensureMemberships(organization);

  const invitedProject = invitation.projectId
    ? await Project.findOne({
        _id: invitation.projectId,
        organization: organization.org_id,
      })
    : null;

  if (invitation.projectId && !invitedProject) {
    throw new Error("The invited project no longer exists");
  }

  const userId = user._id.toString();

  // PROJECT INVITATION:
  // Add the user only to the selected project.
  // Do not create organization membership.
  if (invitation.projectId) {
    const existingOrganizationRole = getMemberRole(
      organization,
      userId
    );

    // Organization Viewers do not receive project access.
    if (existingOrganizationRole === "Viewer") {
      throw new Error(
        "Organization Viewers cannot access projects"
      );
    }

    await addUserToProject(invitedProject, user._id);

    return {
      organization,
      invitedProject,
      invitationScope: "project",
    };
  }

  // ORGANIZATION INVITATION:
  // Add the user to the organization if they are not already a member.
  let effectiveRole = getMemberRole(organization, userId);

  if (!effectiveRole) {
    organization.members.push(user._id);

    organization.memberships.push({
      user: user._id,
      role: invitation.role,
    });

    effectiveRole = invitation.role;

    await organization.save();
  }

  // Owner, Admin and Member receive access to every project.
  // Viewer does not receive automatic project access.
  const roleToSync: OrganizationRole =
  effectiveRole ?? invitation.role;

await syncUserProjectMembership(
  organization.org_id,
  user._id,
  roleToSync
);
  return {
    organization,
    invitedProject: null,
    invitationScope: "organization",
  };
}

// --------------------------------------------------
// UPDATE ORGANIZATION SETTINGS
// --------------------------------------------------

export const updateOrganization = async (
  req: Request,
  res: Response
) => {
  try {
    const org_id = routeParam(req.params.org_id);
    const userId = (req as any).userId;

    const { org_name, description, logoUrl, slug } = req.body;

    if (!userId) {
      return res.status(401).json({
        message: "User not authenticated",
      });
    }

    const organization = await Organization.findOne({ org_id });

    if (!organization) {
      return res.status(404).json({
        message: "Organization not found",
      });
    }

    await ensureMemberships(organization);

    const role = getMemberRole(organization, userId);

    if (role !== "Owner" && role !== "Admin") {
      return res.status(403).json({
        message:
          "Only an organization Owner or Admin can change settings",
      });
    }

    if (org_name !== undefined) {
      if (typeof org_name !== "string" || !org_name.trim()) {
        return res.status(400).json({
          message: "Organization name cannot be empty",
        });
      }

      organization.org_name = org_name.trim();
    }

    if (description !== undefined) {
      if (typeof description !== "string") {
        return res.status(400).json({
          message: "Description must be a string",
        });
      }

      organization.description = description.trim();
    }

    if (logoUrl !== undefined) {
      if (typeof logoUrl !== "string") {
        return res.status(400).json({
          message: "Logo URL must be a string",
        });
      }

      organization.logoUrl = logoUrl.trim();
    }

    if (slug !== undefined) {
      if (typeof slug !== "string") {
        return res.status(400).json({
          message: "Workspace URL must be a string",
        });
      }

      const formattedSlug = slug.trim().toLowerCase();

      if (
        formattedSlug &&
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(formattedSlug)
      ) {
        return res.status(400).json({
          message:
            "Workspace URL must use lowercase letters, numbers, and hyphens",
        });
      }

      organization.set("slug", formattedSlug || undefined);
    }

    await organization.save();

    return res.status(200).json({
      message: "Organization settings saved",
      organization,
    });
  } catch (error) {
    console.error("UPDATE ORGANIZATION ERROR:", error);

    if ((error as any)?.code === 11000) {
      return res.status(409).json({
        message: "That workspace URL is already in use",
      });
    }

    return res.status(500).json({
      message: "Failed to update organization",
    });
  }
};

// --------------------------------------------------
// UPDATE ORGANIZATION MEMBER ROLE
// --------------------------------------------------

export const updateOrganizationMemberRole = async (
  req: Request,
  res: Response
) => {
  try {
    const org_id = routeParam(req.params.org_id);
    const memberId = routeParam(req.params.memberId);
    const userId = (req as any).userId;

    const nextRole = req.body.role as OrganizationRole;

    const allowedRoles: OrganizationRole[] = [
      "Owner",
      "Admin",
      "Member",
      "Viewer",
    ];

    if (!userId) {
      return res.status(401).json({
        message: "User not authenticated",
      });
    }

    if (!mongoose.isValidObjectId(memberId)) {
      return res.status(400).json({
        message: "Invalid member ID",
      });
    }

    if (!allowedRoles.includes(nextRole)) {
      return res.status(400).json({
        message: "Invalid organization role",
      });
    }

    const organization = await Organization.findOne({ org_id });

    if (!organization) {
      return res.status(404).json({
        message: "Organization not found",
      });
    }

    await ensureMemberships(organization);

    const actorRole = getMemberRole(organization, userId);

    if (actorRole !== "Owner" && actorRole !== "Admin") {
      return res.status(403).json({
        message:
          "Only an organization Owner or Admin can change roles",
      });
    }

    const membership = organization.memberships.find(
      (item: any) => item.user?.toString() === memberId
    );

    if (!membership) {
      return res.status(404).json({
        message: "Organization member not found",
      });
    }

    if (nextRole === "Owner" && actorRole !== "Owner") {
      return res.status(403).json({
        message: "Only the Owner can transfer ownership",
      });
    }

    if (nextRole === "Admin" && actorRole !== "Owner") {
      return res.status(403).json({
        message: "Only the Owner can assign the Admin role",
      });
    }

    if (membership.role === "Owner" && actorRole !== "Owner") {
      return res.status(403).json({
        message: "Only the Owner can change the Owner role",
      });
    }

    if (nextRole === "Owner") {
      const currentOwnerId = organization.admin.toString();

      const currentOwnerMembership =
        organization.memberships.find(
          (item: any) =>
            item.user?.toString() === currentOwnerId
        );

      if (currentOwnerMembership) {
        currentOwnerMembership.role = "Admin";
      }

      membership.role = "Owner";
      organization.admin = membership.user;
    } else {
      if (membership.role === "Owner") {
        return res.status(400).json({
          message:
            "Transfer ownership before changing the current Owner's role",
        });
      }

      membership.role = nextRole;
    }

    await organization.save();

    // Synchronize the changed member's project access.
    await syncUserProjectMembership(
      organization.org_id,
      memberId,
      nextRole
    );

    // If ownership was transferred, the previous Owner becomes Admin.
    // Both Owner and Admin retain access to all projects.
    if (nextRole === "Owner") {
      await syncUserProjectMembership(
        organization.org_id,
        userId,
        "Admin"
      );
    }

    return res.status(200).json({
      message: "Member role updated successfully",
      organization,
    });
  } catch (error) {
    console.error("UPDATE ORGANIZATION ROLE ERROR:", error);

    return res.status(500).json({
      message: "Failed to update member role",
    });
  }
};

// --------------------------------------------------
// REMOVE ORGANIZATION MEMBER
// --------------------------------------------------

export const removeOrganizationMember = async (
  req: Request,
  res: Response
) => {
  try {
    const org_id = routeParam(req.params.org_id);
    const memberId = routeParam(req.params.memberId);
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({
        message: "User not authenticated",
      });
    }

    if (!org_id) {
      return res.status(400).json({
        message: "Organization ID is required",
      });
    }

    if (!mongoose.isValidObjectId(memberId)) {
      return res.status(400).json({
        message: "Invalid member ID",
      });
    }

    const organization = await Organization.findOne({ org_id });

    if (!organization) {
      return res.status(404).json({
        message: "Organization not found",
      });
    }

    await ensureMemberships(organization);

    const actorRole = getMemberRole(organization, userId);
    const targetRole = getMemberRole(organization, memberId);

    if (actorRole !== "Owner" && actorRole !== "Admin") {
      return res.status(403).json({
        message:
          "Only an organization Owner or Admin can remove members",
      });
    }

    if (targetRole === "Owner") {
      return res.status(403).json({
        message: "The organization Owner cannot be removed",
      });
    }

    if (targetRole === "Admin" && actorRole !== "Owner") {
      return res.status(403).json({
        message: "Only the Owner can remove an Admin",
      });
    }

    const isMember = organization.members.some(
      (member: any) => member.toString() === memberId
    );

    if (!isMember) {
      return res.status(404).json({
        message: "Organization member not found",
      });
    }

    organization.members = organization.members.filter(
      (member: any) => member.toString() !== memberId
    );

    organization.memberships = organization.memberships.filter(
      (membership: any) =>
        membership.user?.toString() !== memberId
    );

    await organization.save();

    // Remove the user from all projects in this organization.
    await Project.updateMany(
      { organization: organization.org_id },
      {
        $pull: {
          members: new mongoose.Types.ObjectId(memberId),
        },
      }
    );

    return res.status(200).json({
      message: "Member removed successfully",
      organization,
    });
  } catch (error) {
    console.error("REMOVE ORGANIZATION MEMBER ERROR:", error);

    return res.status(500).json({
      message: "Failed to remove member",
      error:
        error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// --------------------------------------------------
// CREATE ORGANIZATION INVITATION
// --------------------------------------------------

export const createOrganizationInvitation = async (
  req: Request,
  res: Response
) => {
  try {
    const org_id = routeParam(req.params.org_id);
    const userId = (req as any).userId;

    const email =
      typeof req.body.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";

    const role: OrganizationRole = req.body.role ?? "Member";

    const projectId =
      typeof req.body.projectId === "string" && req.body.projectId
        ? req.body.projectId
        : "";

    if (!userId) {
      return res.status(401).json({
        message: "User not authenticated",
      });
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({
        message: "Enter a valid email address",
      });
    }

    if (!["Admin", "Member", "Viewer"].includes(role)) {
      return res.status(400).json({
        message: "Invalid invitation role",
      });
    }

    const organization = await Organization.findOne({ org_id });

    if (!organization) {
      return res.status(404).json({
        message: "Organization not found",
      });
    }

    await ensureMemberships(organization);

    const actorRole = getMemberRole(organization, userId);

    if (actorRole !== "Owner" && actorRole !== "Admin") {
      return res.status(403).json({
        message:
          "Only an organization Owner or Admin can invite members",
      });
    }

    if (role === "Admin" && actorRole !== "Owner") {
      return res.status(403).json({
        message: "Only the Owner can invite an Admin",
      });
    }

    const existingUser = await User.findOne({ email });

    let invitedProject: any = null;

    if (projectId) {
      if (!mongoose.isValidObjectId(projectId)) {
        return res.status(400).json({
          message: "Invalid project ID",
        });
      }

      invitedProject = await Project.findOne({
        _id: projectId,
        organization: organization.org_id,
      });

      if (!invitedProject) {
        return res.status(404).json({
          message: "Project not found in this organization",
        });
      }
    }

    if (existingUser) {
      const existingRole = getMemberRole(
        organization,
        existingUser._id.toString()
      );

      if (!invitedProject && existingRole) {
        return res.status(409).json({
          message: "This person is already an organization member",
        });
      }

      if (
        invitedProject &&
        existingRole === "Viewer"
      ) {
        return res.status(409).json({
          message:
            "Organization Viewers cannot receive project access",
        });
      }

      if (
        invitedProject &&
        invitedProject.members.some(
          (memberId: any) =>
            memberId.toString() === existingUser._id.toString()
        )
      ) {
        return res.status(409).json({
          message: "This person already has access to this project",
        });
      }
    }

    const inviteToken = randomBytes(32).toString("base64url");

    const tokenHash = createHash("sha256")
      .update(inviteToken)
      .digest("hex");

    const expiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000
    );

    // Different invitations have different scope keys.
    // Organization invitation:
    // ORG_ID:email:organization
    //
    // Project invitation:
    // ORG_ID:email:project:PROJECT_ID
    const scopeKey = invitedProject
      ? `${org_id}:${email}:project:${invitedProject._id}`
      : `${org_id}:${email}:organization`;

    const invitation = await OrganizationInvitation.findOneAndUpdate(
      { scopeKey },
      {
        $set: {
          organizationId: org_id,
          email,
          role,
          invitedBy: userId,
          scopeKey,
          tokenHash,
          expiresAt,
          ...(invitedProject
            ? { projectId: invitedProject._id }
            : {}),
        },
        ...(!invitedProject
          ? { $unset: { projectId: 1 } }
          : {}),
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    let emailSent = true;

    try {
      await sendOrganizationInvitationEmail(
        email,
        organization.org_name,
        role,
        inviteToken
      );
    } catch (emailError) {
      emailSent = false;

      console.error(
        "ORGANIZATION INVITATION EMAIL ERROR:",
        emailError
      );
    }

    return res.status(201).json({
      message: emailSent
        ? "Invitation created and email sent successfully"
        : "Invitation created, but the email could not be sent",
      invitation: {
        _id: invitation._id,
        email: invitation.email,
        role: invitation.role,
        projectId: invitation.projectId?.toString(),
        scopeKey: invitation.scopeKey,
        expiresAt: invitation.expiresAt,
      },
      emailSent,
    });
  } catch (error) {
    console.error("CREATE ORGANIZATION INVITATION ERROR:", error);

    return res.status(500).json({
      message: "Failed to create invitation",
    });
  }
};

// --------------------------------------------------
// CREATE ORGANIZATION WITH FIRST PROJECT
// --------------------------------------------------

export const createOrganizationWithFirstProject = async (
  req: Request,
  res: Response
) => {
  let createdOrganizationId:
    | mongoose.Types.ObjectId
    | undefined;

  let createdProjectId:
    | mongoose.Types.ObjectId
    | undefined;

  try {
    const {
      org_name,
      project_name,
      project_description,
      issue_key,
    } = req.body;

    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({
        message: "User not authenticated",
      });
    }

    if (typeof org_name !== "string" || !org_name.trim()) {
      return res.status(400).json({
        message: "Organization name is required",
      });
    }

    if (
      typeof project_name !== "string" ||
      !project_name.trim()
    ) {
      return res.status(400).json({
        message: "First project name is required",
      });
    }

    if (
      typeof project_description !== "string" ||
      !project_description.trim()
    ) {
      return res.status(400).json({
        message: "Project description is required",
      });
    }

    if (typeof issue_key !== "string") {
      return res.status(400).json({
        message: "Issue key is required",
      });
    }

    const projectKey = issue_key.trim().toUpperCase();

    if (!/^[A-Z][A-Z0-9]{1,9}$/.test(projectKey)) {
      return res.status(400).json({
        message:
          "Issue key must start with a letter and contain 2–10 letters or numbers",
      });
    }

    const existingProject = await Project.exists({
      key: projectKey,
    });

    if (existingProject) {
      return res.status(409).json({
        message: "This issue key is already in use",
      });
    }

    const organizationName = org_name.trim();

    const baseSlug =
      organizationName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "workspace";

    let slug = baseSlug;
    let suffix = 2;

    while (await Organization.exists({ slug })) {
      slug = `${baseSlug}-${suffix}`;
      suffix++;
    }

    const organization = await Organization.create({
      org_name: organizationName,
      slug,
      org_id: `ORG-${new mongoose.Types.ObjectId()}`,
      admin: userId,
      createdBy: userId,
      members: [userId],
      memberships: [
        {
          user: userId,
          role: "Owner",
        },
      ],
    });

    createdOrganizationId = organization._id;

    const project = await Project.create({
      name: project_name.trim(),
      description: project_description.trim(),
      key: projectKey,
      organization: organization.org_id,
      owner: userId,
      members: [userId],
    });

    createdProjectId = project._id;

    await TaskCounter.create({
      _id: project._id.toString(),
      seq: 0,
    });

    return res.status(201).json({
      message:
        "Organization and first project created successfully",
      organization,
      project,
    });
  } catch (error) {
    console.error("CREATE ORGANIZATION SETUP ERROR:", error);

    if (createdProjectId) {
      await Project.findByIdAndDelete(createdProjectId).catch(
        (cleanupError) => {
          console.error("PROJECT CLEANUP ERROR:", cleanupError);
        }
      );

      await TaskCounter.deleteOne({
        _id: createdProjectId.toString(),
      }).catch((cleanupError) => {
        console.error("TASK COUNTER CLEANUP ERROR:", cleanupError);
      });
    }

    if (createdOrganizationId) {
      await Organization.findByIdAndDelete(
        createdOrganizationId
      ).catch((cleanupError) => {
        console.error("ORGANIZATION CLEANUP ERROR:", cleanupError);
      });
    }

    if ((error as any)?.code === 11000) {
      return res.status(409).json({
        message:
          "The issue key or organization URL is already in use.",
      });
    }

    return res.status(500).json({
      message: "Failed to create organization and first project",
      error:
        error instanceof Error ? error.message : error,
    });
  }
};

// --------------------------------------------------
// GET MY ORGANIZATION INVITATIONS
// --------------------------------------------------

export const getMyOrganizationInvitations = async (
  req: Request,
  res: Response
) => {
  try {
    const user = await User.findById(
      (req as any).userId
    ).select("email");

    if (!user?.email) {
      return res.status(401).json({
        message: "User email is unavailable",
      });
    }

    const invitations = await OrganizationInvitation.find({
      email: user.email.toLowerCase(),
      expiresAt: { $gt: new Date() },
    }).lean();

    const results = await Promise.all(
      invitations.map(async (invitation) => ({
        ...invitation,
        organization: await Organization.findOne({
          org_id: invitation.organizationId,
        })
          .select("org_id org_name")
          .lean(),
      }))
    );

    return res.status(200).json({
      invitations: results,
    });
  } catch (error) {
    console.error("GET ORGANIZATION INVITATIONS ERROR:", error);

    return res.status(500).json({
      message: "Failed to fetch invitations",
    });
  }
};

// --------------------------------------------------
// GET ORGANIZATION INVITATIONS
// --------------------------------------------------

export const getOrganizationInvitations = async (
  req: Request,
  res: Response
) => {
  try {
    const org_id = routeParam(req.params.org_id);
    const userId = (req as any).userId;

    const organization = await Organization.findOne({ org_id });

    if (!organization) {
      return res.status(404).json({
        message: "Organization not found",
      });
    }

    await ensureMemberships(organization);

    const role = getMemberRole(organization, userId);

    if (role !== "Owner" && role !== "Admin") {
      return res.status(403).json({
        message:
          "Only an organization Owner or Admin can view invitations",
      });
    }

    const invitations = await OrganizationInvitation.find({
      organizationId: organization.org_id,
      expiresAt: { $gt: new Date() },
    })
      .select("-tokenHash")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      invitations,
    });
  } catch (error) {
    console.error("GET ORGANIZATION INVITATIONS ERROR:", error);

    return res.status(500).json({
      message: "Failed to fetch invitations",
    });
  }
};

// --------------------------------------------------
// REVOKE ORGANIZATION INVITATION
// --------------------------------------------------

export const revokeOrganizationInvitation = async (
  req: Request,
  res: Response
) => {
  try {
    const org_id = routeParam(req.params.org_id);
    const invitationId = routeParam(req.params.invitationId);
    const userId = (req as any).userId;

    if (!mongoose.isValidObjectId(invitationId)) {
      return res.status(400).json({
        message: "Invalid invitation ID",
      });
    }

    const organization = await Organization.findOne({ org_id });

    if (!organization) {
      return res.status(404).json({
        message: "Organization not found",
      });
    }

    await ensureMemberships(organization);

    const role = getMemberRole(organization, userId);

    if (role !== "Owner" && role !== "Admin") {
      return res.status(403).json({
        message:
          "Only an organization Owner or Admin can revoke invitations",
      });
    }

    const invitation = await OrganizationInvitation.findOneAndDelete({
      _id: invitationId,
      organizationId: organization.org_id,
    });

    if (!invitation) {
      return res.status(404).json({
        message: "Invitation not found",
      });
    }

    return res.status(200).json({
      message: "Invitation revoked successfully",
    });
  } catch (error) {
    console.error("REVOKE ORGANIZATION INVITATION ERROR:", error);

    return res.status(500).json({
      message: "Failed to revoke invitation",
    });
  }
};

// --------------------------------------------------
// ACCEPT ORGANIZATION INVITATION BY ID
// --------------------------------------------------

export const acceptOrganizationInvitation = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({
        message: "User not authenticated",
      });
    }

    const user = await User.findById(userId).select("email");

    if (!user?.email) {
      return res.status(401).json({
        message: "User email is unavailable",
      });
    }

    const invitationId = routeParam(req.params.invitationId);

    if (!mongoose.isValidObjectId(invitationId)) {
      return res.status(400).json({
        message: "Invalid invitation ID",
      });
    }

    const invitation = await OrganizationInvitation.findById(
      invitationId
    );

    if (!invitation) {
      return res.status(404).json({
        message: "Invitation not found",
      });
    }

    if (
      user.email.trim().toLowerCase() !==
      invitation.email.trim().toLowerCase()
    ) {
      return res.status(403).json({
        message:
          "This invitation belongs to another email address",
      });
    }

    if (
      !invitation.expiresAt ||
      new Date(invitation.expiresAt).getTime() <= Date.now()
    ) {
      return res.status(400).json({
        message: "This invitation has expired",
      });
    }

    const result = await acceptInvitationForUser(
      invitation,
      user
    );

    await invitation.deleteOne();

    return res.status(200).json({
      message: "Invitation accepted successfully",
      organization: result.organization,
      invitedProjectId:
        result.invitedProject?._id.toString(),
      invitationScope: result.invitationScope,
    });
  } catch (error) {
    console.error("ACCEPT ORGANIZATION INVITATION ERROR:", error);

    const message =
      error instanceof Error ? error.message : "";

    if (
      message === "Organization not found" ||
      message === "The invited project no longer exists"
    ) {
      return res.status(404).json({ message });
    }

    if (
      message === "Organization Viewers cannot access projects"
    ) {
      return res.status(403).json({ message });
    }

    return res.status(500).json({
      message: "Failed to accept invitation",
    });
  }
};

// --------------------------------------------------
// ACCEPT ORGANIZATION INVITATION BY TOKEN
// --------------------------------------------------

export const acceptOrganizationInvitationByToken = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({
        message: "User not authenticated",
      });
    }

    const user = await User.findById(userId).select("email");

    if (!user?.email) {
      return res.status(401).json({
        message: "User email is unavailable",
      });
    }

    const token =
      typeof req.body.token === "string"
        ? req.body.token
        : "";

    if (!/^[A-Za-z0-9_-]{40,50}$/.test(token)) {
      return res.status(400).json({
        message: "Invitation token is invalid or expired",
      });
    }

    const tokenHash = createHash("sha256")
      .update(token)
      .digest("hex");

    const invitation = await OrganizationInvitation.findOne({
      tokenHash,
      expiresAt: { $gt: new Date() },
    }).select("+tokenHash");

    if (!invitation) {
      return res.status(404).json({
        message:
          "Invitation link is invalid or has expired",
      });
    }

    if (
      user.email.trim().toLowerCase() !==
      invitation.email.trim().toLowerCase()
    ) {
      return res.status(403).json({
        message:
          "Please sign in using the email address that received this invitation",
      });
    }

    const result = await acceptInvitationForUser(
      invitation,
      user
    );

    await invitation.deleteOne();

    return res.status(200).json({
      message: "Invitation accepted successfully",
      organization: result.organization,
      invitedProjectId:
        result.invitedProject?._id.toString(),
      invitationScope: result.invitationScope,
    });
  } catch (error) {
    console.error(
      "ACCEPT ORGANIZATION INVITATION BY TOKEN ERROR:",
      error
    );

    const message =
      error instanceof Error ? error.message : "";

    if (
      message === "Organization not found" ||
      message === "The invited project no longer exists"
    ) {
      return res.status(404).json({ message });
    }

    if (
      message === "Organization Viewers cannot access projects"
    ) {
      return res.status(403).json({ message });
    }

    return res.status(500).json({
      message: "Failed to accept invitation",
    });
  }
};

// --------------------------------------------------
// CREATE ORGANIZATION
// --------------------------------------------------

export const createOrganization = async (
  req: Request,
  res: Response
) => {
  try {
    const { org_name } = req.body;
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({
        message: "User not authenticated",
      });
    }

    if (typeof org_name !== "string" || !org_name.trim()) {
      return res.status(400).json({
        message: "Organization name is required",
      });
    }

    const organizationName = org_name.trim();

    const baseSlug =
      organizationName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "workspace";

    let slug = baseSlug;
    let suffix = 2;

    while (await Organization.exists({ slug })) {
      slug = `${baseSlug}-${suffix}`;
      suffix++;
    }

    const organization = await Organization.create({
      org_name: organizationName,
      slug,
      org_id: `ORG-${new mongoose.Types.ObjectId()}`,
      admin: userId,
      createdBy: userId,
      members: [userId],
      memberships: [
        {
          user: userId,
          role: "Owner",
        },
      ],
    });

    return res.status(201).json({
      message: "Organization created successfully",
      organization,
    });
  } catch (error) {
    console.error("CREATE ORGANIZATION ERROR:", error);

    return res.status(500).json({
      message: "Failed to create organization",
    });
  }
};

// --------------------------------------------------
// GET MY ORGANIZATIONS
// --------------------------------------------------

export const getMyOrganizations = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({
        message: "User not authenticated",
      });
    }

    const organizations = await Organization.find({
      $or: [
        { members: userId },
        { admin: userId },
        { "memberships.user": userId },
      ],
    });

    for (const organization of organizations) {
      await ensureMemberships(organization);
    }

    return res.status(200).json({
      organizations,
    });
  } catch (error) {
    console.error("GET ORGANIZATIONS ERROR:", error);

    return res.status(500).json({
      message: "Failed to get organizations",
    });
  }
};

// --------------------------------------------------
// ADD ORGANIZATION MEMBER
// --------------------------------------------------

export const addMember = async (
  req: Request,
  res: Response
) => {
  try {
    const orgId = routeParam(req.params.org_id);
    const { userId: newMemberId } = req.body;
    const loggedInUserId = (req as any).userId;

    if (!loggedInUserId) {
      return res.status(401).json({
        message: "User not authenticated",
      });
    }

    if (!orgId) {
      return res.status(400).json({
        message: "Organization ID is required",
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

    const organization = await Organization.findOne({
      org_id: orgId,
    });

    if (!organization) {
      return res.status(404).json({
        message: "Organization not found",
      });
    }

    await ensureMemberships(organization);

    const role = getMemberRole(
      organization,
      loggedInUserId
    );

    if (role !== "Owner" && role !== "Admin") {
      return res.status(403).json({
        message:
          "Only an organization Owner or Admin can add members",
      });
    }

    const user = await User.findById(newMemberId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const alreadyMember = organization.members.some(
      (member: any) => member.toString() === newMemberId
    );

    if (alreadyMember) {
      return res.status(409).json({
        message: "User is already a member",
      });
    }

    organization.members.push(user._id);

    organization.memberships.push({
      user: user._id,
      role: "Member",
    });

    await organization.save();

    // Directly added Members receive access to every project.
    await syncUserProjectMembership(
      organization.org_id,
      user._id,
      "Member"
    );

    return res.status(200).json({
      message: "Member added successfully",
      organization,
    });
  } catch (error) {
    console.error("ADD ORGANIZATION MEMBER ERROR:", error);

    return res.status(500).json({
      message: "Failed to add member",
    });
  }
};

// --------------------------------------------------
// GET ORGANIZATION BY ID
// --------------------------------------------------

export const getOrganizationById = async (
  req: Request,
  res: Response
) => {
  try {
    const org_id = routeParam(req.params.org_id);
    const loggedInUserId = (req as any).userId;

    if (!loggedInUserId) {
      return res.status(401).json({
        message: "User not authenticated",
      });
    }

    if (!org_id) {
      return res.status(400).json({
        message: "Organization ID is required",
      });
    }

    const organization = await Organization.findOne({ org_id });

    if (!organization) {
      return res.status(404).json({
        message: "Organization not found",
      });
    }

    const userId = loggedInUserId.toString();

    const isOwner =
      organization.admin?.toString() === userId;

    const isInMembers = organization.members.some(
      (member: any) => member.toString() === userId
    );

    const isInMemberships = organization.memberships.some(
      (membership: any) =>
        membership.user?.toString() === userId
    );

    if (!isOwner && !isInMembers && !isInMemberships) {
      return res.status(403).json({
        message:
          "You are not a member of this organization",
      });
    }

    await ensureMemberships(organization);

    await organization.populate([
      {
        path: "admin",
        select: "name email",
      },
      {
        path: "createdBy",
        select: "name email",
      },
      {
        path: "members",
        select: "name email",
      },
      {
        path: "memberships.user",
        select: "name email",
      },
    ]);

    return res.status(200).json({
      organization: {
        _id: organization._id,
        org_id: organization.org_id,
        org_name: organization.org_name,
        description: organization.description,
        logoUrl: organization.logoUrl,
        slug: organization.slug,
        admin: organization.admin,
        createdBy: organization.createdBy,
        members: organization.members,
        memberships: organization.memberships,
        createdAt: organization.createdAt,
        updatedAt: organization.updatedAt,
      },
    });
  } catch (error) {
    console.error("GET ORGANIZATION ERROR:", error);

    return res.status(500).json({
      message: "Failed to get organization",
      error:
        error instanceof Error
          ? error.message
          : "Unknown error",
    });
  }
};

// --------------------------------------------------
// DELETE ORGANIZATION
// --------------------------------------------------

export const deleteOrganization = async (
  req: Request,
  res: Response
) => {
  try {
    const org_id = routeParam(req.params.org_id);
    const userId = (req as any).userId;

    const password =
      typeof req.body.password === "string"
        ? req.body.password
        : "";

    if (!userId) {
      return res.status(401).json({
        message: "User not authenticated",
      });
    }

    if (!org_id) {
      return res.status(400).json({
        message: "Organization ID is required",
      });
    }

    if (!password.trim()) {
      return res.status(400).json({
        message: "Current password is required",
      });
    }

    const organization = await Organization.findOne({ org_id });

    if (!organization) {
      return res.status(404).json({
        message: "Organization not found",
      });
    }

    if (organization.admin?.toString() !== userId.toString()) {
      return res.status(403).json({
        message:
          "Only the organization Owner can delete this organization",
      });
    }

    const user = await User.findById(userId).select("+password");

    if (!user || !user.password) {
      return res.status(404).json({
        message: "User account not found",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(
      password,
      user.password
    );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        message:
          "Incorrect password. Please try again.",
      });
    }

    const projects = await Project.find({
      organization: org_id,
    }).select("_id");

    const projectIds = projects.map(
      (project) => project._id
    );

    await Task.deleteMany({
      $or: [
        { organization: org_id },
        { project: { $in: projectIds } },
      ],
    });

    await TaskCounter.deleteMany({
      _id: {
        $in: projectIds.map((id) => id.toString()),
      },
    });

    await Project.deleteMany({
      organization: org_id,
    });

    await OrganizationInvitation.deleteMany({
      organizationId: org_id,
    });

    await organization.deleteOne();

    return res.status(200).json({
      message: "Organization deleted successfully",
      deletedOrganizationId: org_id,
    });
  } catch (error) {
    console.error("DELETE ORGANIZATION ERROR:", error);

    return res.status(500).json({
      message: "Failed to delete organization",
      error:
        error instanceof Error
          ? error.message
          : "Unknown error",
    });
  }
};
