
import { type Request, type Response } from "express";
import mongoose from "mongoose";
import Organization from "../models/Organization.js";
import User from "../models/User.js";
import OrganizationInvitation from "../models/OrganizationInvitation.js";
import Project from "../models/project.js";
import { sendOrganizationInvitationEmail } from "../services/emailService.js";
import type { OrganizationRole } from "../models/Organization.js";

// Backfill roles for existing organisations while preserving member IDs.
async function ensureMemberships(organization: any) {
  const existingMemberships = organization.memberships ?? [];

  const existingUserIds = new Set(
    existingMemberships.map((membership: any) =>
      membership.user.toString()
    )
  );

  // Ensure the legacy admin is also listed as a member.
  const adminId = organization.admin.toString();

  if (
    !organization.members.some(
      (member: mongoose.Types.ObjectId) =>
        member.toString() === adminId
    )
  ) {
    organization.members.push(organization.admin);
  }

  // Give existing members a role if they do not have one yet.
  for (const memberId of organization.members) {
    const memberIdString = memberId.toString();

    if (existingUserIds.has(memberIdString)) {
      continue;
    }

    const role: OrganizationRole =
      memberIdString === adminId ? "Owner" : "Member";

    organization.memberships.push({
      user: memberId,
      role,
    });

    existingUserIds.add(memberIdString);
  }

  // Ensure the legacy admin has the Owner role.
  const adminMembership = organization.memberships.find(
    (membership: any) =>
      membership.user.toString() === adminId
  );

  if (adminMembership && adminMembership.role !== "Owner") {
    adminMembership.role = "Owner";
  }

  organization.markModified("memberships");
  await organization.save();
}

function getMemberRole(
  organization: any,
  userId: string
): OrganizationRole | undefined {
  const membership = organization.memberships.find(
    (item: any) => item.user.toString() === userId
  );

  return membership?.role;
}

function routeParam(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

export const updateOrganization = async (
  req: Request,
  res: Response
) => {
  try {
    const org_id = routeParam(req.params.org_id);
    const userId = (req as any).userId;
    const { org_name, description, logoUrl, slug } = req.body;
    const organization = await Organization.findOne({ org_id });

    if (!organization) {
      return res.status(404).json({ message: "Organization not found" });
    }

    await ensureMemberships(organization);
    const role = getMemberRole(organization, userId);
    if (role !== "Owner" && role !== "Admin") {
      return res.status(403).json({ message: "Only an organization Owner or Admin can change settings" });
    }

    if (org_name !== undefined) {
      if (typeof org_name !== "string" || !org_name.trim()) {
        return res.status(400).json({ message: "Organization name cannot be empty" });
      }
      organization.org_name = org_name.trim();
    }
    if (description !== undefined) {
      if (typeof description !== "string") {
        return res.status(400).json({ message: "Description must be a string" });
      }
      organization.description = description.trim();
    }
    if (logoUrl !== undefined) {
      if (typeof logoUrl !== "string") {
        return res.status(400).json({ message: "Logo URL must be a string" });
      }
      organization.logoUrl = logoUrl.trim();
    }
    if (slug !== undefined) {
      if (typeof slug !== "string") {
        return res.status(400).json({ message: "Workspace URL must be a string" });
      }
      if (slug.trim() && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug.trim().toLowerCase())) {
        return res.status(400).json({ message: "Workspace URL must use lowercase letters, numbers, and hyphens" });
      }
      organization.set("slug", slug.trim() ? slug.trim().toLowerCase() : undefined);
    }

    await organization.save();
    return res.status(200).json({ message: "Organization settings saved", organization });
  } catch (error) {
    console.error("UPDATE ORGANIZATION ERROR:", error);
    if ((error as any)?.code === 11000) {
      return res.status(409).json({ message: "That workspace URL is already in use" });
    }
    return res.status(500).json({ message: "Failed to update organization" });
  }
};

export const updateOrganizationMemberRole = async (
  req: Request,
  res: Response
) => {
  try {
    const org_id = routeParam(req.params.org_id);
    const memberId = routeParam(req.params.memberId);
    const userId = (req as any).userId;
    const { role: nextRole } = req.body;
    const allowedRoles: OrganizationRole[] = ["Owner", "Admin", "Member", "Viewer"];

    if (!allowedRoles.includes(nextRole)) {
      return res.status(400).json({ message: "Invalid organization role" });
    }
    const organization = await Organization.findOne({ org_id });
    if (!organization) {
      return res.status(404).json({ message: "Organization not found" });
    }
    await ensureMemberships(organization);
    const actorRole = getMemberRole(organization, userId);
    if (actorRole !== "Owner" && actorRole !== "Admin") {
      return res.status(403).json({ message: "Only an organization Owner or Admin can change roles" });
    }
    const membership = organization.memberships.find(
      (item: any) => item.user.toString() === memberId
    );
    if (!membership) {
      return res.status(404).json({ message: "Organization member not found" });
    }
    if ((nextRole === "Owner" || membership.role === "Owner") && actorRole !== "Owner") {
      return res.status(403).json({ message: "Only the Owner can transfer or change the Owner role" });
    }
    if (membership.role === "Owner" && nextRole !== "Owner") {
      return res.status(400).json({ message: "Transfer ownership before changing the current Owner's role" });
    }
    if (nextRole === "Admin" && actorRole !== "Owner") {
      return res.status(403).json({ message: "Only the Owner can assign the Admin role" });
    }
    if (nextRole === "Owner" && membership.role !== "Owner") {
      const currentOwner = organization.memberships.find(
        (item: any) => item.user.toString() === organization.admin.toString()
      );
      if (currentOwner) currentOwner.role = "Admin";
    }
    membership.role = nextRole;
    if (nextRole === "Owner") organization.admin = membership.user;
    await organization.save();
    return res.status(200).json({ message: "Member role updated", organization });
  } catch (error) {
    console.error("UPDATE ORGANIZATION ROLE ERROR:", error);
    return res.status(500).json({ message: "Failed to update member role" });
  }
};

export const removeOrganizationMember = async (
  req: Request,
  res: Response
) => {
  try {
    const org_id = routeParam(req.params.org_id);
    const memberId = routeParam(req.params.memberId);
    const userId = (req as any).userId;
    const organization = await Organization.findOne({ org_id });
    if (!organization) {
      return res.status(404).json({ message: "Organization not found" });
    }
    await ensureMemberships(organization);
    const actorRole = getMemberRole(organization, userId);
    const targetRole = getMemberRole(organization, memberId);
    if (actorRole !== "Owner" && actorRole !== "Admin") {
      return res.status(403).json({ message: "Only an organization Owner or Admin can remove members" });
    }
    if (targetRole === "Owner" || (targetRole === "Admin" && actorRole !== "Owner")) {
      return res.status(403).json({ message: "You cannot remove this organization member" });
    }
    organization.members = organization.members.filter(
      (member) => member.toString() !== memberId
    );
    organization.memberships = organization.memberships.filter(
      (membership: any) => membership.user.toString() !== memberId
    );
    await organization.save();
    await Project.updateMany(
      { organization: { $in: [organization.org_id, organization._id.toString(), organization.org_name] } },
      { $pull: { members: memberId } }
    );
    return res.status(200).json({ message: "Member removed", organization });
  } catch (error) {
    console.error("REMOVE ORGANIZATION MEMBER ERROR:", error);
    return res.status(500).json({ message: "Failed to remove member" });
  }
};

export const createOrganizationInvitation = async (
  req: Request,
  res: Response
) => {
  try {
    const org_id = routeParam(req.params.org_id);
    const userId = (req as any).userId;
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const role: OrganizationRole = req.body.role ?? "Member";
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: "Enter a valid email address" });
    }
    if (!["Admin", "Member", "Viewer"].includes(role)) {
      return res.status(400).json({ message: "Invalid invitation role" });
    }
    const organization = await Organization.findOne({ org_id });
    if (!organization) return res.status(404).json({ message: "Organization not found" });
    await ensureMemberships(organization);
    const actorRole = getMemberRole(organization, userId);
    if (actorRole !== "Owner" && actorRole !== "Admin") {
      return res.status(403).json({ message: "Only an organization Owner or Admin can invite members" });
    }
    if (role === "Admin" && actorRole !== "Owner") {
      return res.status(403).json({ message: "Only the Owner can invite an Admin" });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser && organization.members.some((member) => member.toString() === existingUser._id.toString())) {
      return res.status(409).json({ message: "This person is already a member" });
    }
    const invitation = await OrganizationInvitation.findOneAndUpdate(
      { organizationId: org_id, email },
      { organizationId: org_id, email, role, invitedBy: userId },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );
    let emailSent = true;
    try {
      await sendOrganizationInvitationEmail(
        email,
        organization.org_name,
        role,
        invitation._id.toString()
      );
    } catch (emailError) {
      emailSent = false;
      console.error("ORGANIZATION INVITATION EMAIL ERROR:", emailError);
    }
    return res.status(201).json({ message: "Invitation created", invitation, emailSent });
  } catch (error) {
    console.error("CREATE ORGANIZATION INVITATION ERROR:", error);
    return res.status(500).json({ message: "Failed to create invitation" });
  }
};

export const getMyOrganizationInvitations = async (
  req: Request,
  res: Response
) => {
  try {
    const user = await User.findById((req as any).userId).select("email");
    if (!user?.email) return res.status(401).json({ message: "User email is unavailable" });
    const invitations = await OrganizationInvitation.find({ email: user.email.toLowerCase() }).lean();
    const results = await Promise.all(invitations.map(async (invitation) => ({
      ...invitation,
      organization: await Organization.findOne({ org_id: invitation.organizationId })
        .select("org_id org_name")
        .lean(),
    })));
    return res.status(200).json({ invitations: results });
  } catch (error) {
    console.error("GET ORGANIZATION INVITATIONS ERROR:", error);
    return res.status(500).json({ message: "Failed to fetch invitations" });
  }
};

export const getOrganizationInvitations = async (
  req: Request,
  res: Response
) => {
  try {
    const org_id = routeParam(req.params.org_id);
    const organization = await Organization.findOne({ org_id });
    if (!organization) return res.status(404).json({ message: "Organization not found" });
    await ensureMemberships(organization);
    const role = getMemberRole(organization, (req as any).userId);
    if (role !== "Owner" && role !== "Admin") {
      return res.status(403).json({ message: "Only an organization Owner or Admin can view invitations" });
    }
    const invitations = await OrganizationInvitation.find({ organizationId: organization.org_id })
      .sort({ createdAt: -1 })
      .lean();
    return res.status(200).json({ invitations });
  } catch (error) {
    console.error("GET ORGANIZATION INVITATIONS ERROR:", error);
    return res.status(500).json({ message: "Failed to fetch invitations" });
  }
};

export const acceptOrganizationInvitation = async (
  req: Request,
  res: Response
) => {
  try {
    const user = await User.findById((req as any).userId).select("email");
    const invitationId = routeParam(req.params.invitationId);
    const invitation = await OrganizationInvitation.findById(invitationId);
    if (!invitation) return res.status(404).json({ message: "Invitation not found" });
    if (!user?.email || user.email.toLowerCase() !== invitation.email) {
      return res.status(403).json({ message: "This invitation belongs to another email address" });
    }
    const organization = await Organization.findOne({ org_id: invitation.organizationId });
    if (!organization) return res.status(404).json({ message: "Organization not found" });
    await ensureMemberships(organization);
    if (!organization.members.some((member) => member.toString() === user._id.toString())) {
      organization.members.push(user._id);
      organization.memberships.push({ user: user._id, role: invitation.role });
      await organization.save();
    }
    await invitation.deleteOne();
    return res.status(200).json({ message: "Invitation accepted", organization });
  } catch (error) {
    console.error("ACCEPT ORGANIZATION INVITATION ERROR:", error);
    return res.status(500).json({ message: "Failed to accept invitation" });
  }
};

export const revokeOrganizationInvitation = async (
  req: Request,
  res: Response
) => {
  try {
    const org_id = routeParam(req.params.org_id);
    const invitationId = routeParam(req.params.invitationId);
    const invitation = await OrganizationInvitation.findOne({ _id: invitationId, organizationId: org_id });
    if (!invitation) return res.status(404).json({ message: "Invitation not found" });
    const organization = await Organization.findOne({ org_id });
    if (!organization) return res.status(404).json({ message: "Organization not found" });
    await ensureMemberships(organization);
    const role = getMemberRole(organization, (req as any).userId);
    if (role !== "Owner" && role !== "Admin") {
      return res.status(403).json({ message: "Only an organization Owner or Admin can revoke invitations" });
    }
    await invitation.deleteOne();
    return res.status(200).json({ message: "Invitation revoked" });
  } catch (error) {
    console.error("REVOKE ORGANIZATION INVITATION ERROR:", error);
    return res.status(500).json({ message: "Failed to revoke invitation" });
  }
};

export const createOrganization = async (
  req: Request,
  res: Response
) => {
  try {
    const { org_name } = req.body;

    if (
      typeof org_name !== "string" ||
      !org_name.trim()
    ) {
      return res.status(400).json({
        message: "Organization name is required",
      });
    }

    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({
        message: "User not authenticated",
      });
    }

    const baseSlug = org_name.trim().toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "workspace";
    let slug = baseSlug;
    let suffix = 2;
    while (await Organization.exists({ slug })) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    const organization = await Organization.create({
      org_name: org_name.trim(),
      slug,
      org_id: `ORG-${new mongoose.Types.ObjectId()}`,
      admin: userId,
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
      members: userId,
    });

    // Backfill roles for older organisation records.
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

export const addMember = async (
  req: Request,
  res: Response
) => {
  try {
    const orgId = req.params.org_id;
    const { userId: newMemberId } = req.body;
    const loggedInUserId = (req as any).userId;

    if (!loggedInUserId) {
      return res.status(401).json({
        message: "User not authenticated",
      });
    }

    if (typeof orgId !== "string" || !orgId.trim()) {
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
        message: "Only an organization Owner or Admin can add members",
      });
    }

    const user = await User.findById(newMemberId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const alreadyMember = organization.members.some(
      (member) => member.toString() === newMemberId
    );

    if (alreadyMember) {
      return res.status(400).json({
        message: "User is already a member",
      });
    }

    organization.members.push(user._id);

    organization.memberships.push({
      user: user._id,
      role: "Member",
    });

    await organization.save();

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

export const getOrganizationById = async (
  req: Request,
  res: Response
) => {
  try {
    const org_id = req.params.org_id;
    const loggedInUserId = (req as any).userId;

    if (!loggedInUserId) {
      return res.status(401).json({
        message: "User not authenticated",
      });
    }

    if (typeof org_id !== "string" || !org_id.trim()) {
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

    const isMember = organization.members.some(
      (member) => member.toString() === loggedInUserId
    );

    if (!isMember) {
      return res.status(403).json({
        message: "You are not a member of this organization",
      });
    }

    await ensureMemberships(organization);

    await organization.populate([
      { path: "admin", select: "name email" },
      { path: "members", select: "name email" },
      { path: "memberships.user", select: "name email" },
    ]);

    return res.status(200).json({
      organization,
    });
  } catch (error) {
    console.error("GET ORGANIZATION ERROR:", error);

    return res.status(500).json({
      message: "Failed to get organization",
    });
  }
};
