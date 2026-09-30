import { type Request,type Response } from "express";
import mongoose from "mongoose";
import Organization from "../models/Organization.js";

export const createOrganization = async (
  req: Request,
  res: Response
) => {
  try {
    const { org_name } = req.body;

    if (!org_name) {
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

    const organization = await Organization.create({
      org_name,
      org_id: `ORG-${new mongoose.Types.ObjectId()}`,
      admin: userId,
      members: [userId],
    });

    return res.status(201).json({
      message: "Organization created successfully",
      organization,
    });
  } catch (error) {
    console.error(error);

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

    return res.status(200).json({
      organizations,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to get organizations",
    });
  }
};

export const addMember = async (req: Request, res: Response) => {
  try {
    const orgId = req.params.org_id;
    const { userId } = req.body;

    if (typeof orgId !== "string" || !orgId.trim()) {
      return res.status(400).json({
        message: "Organization ID is required",
      });
    }

    // Check userId
    if (!userId) {
      return res.status(400).json({
        message: "User ID is required",
      });
    }

    // Get logged-in user from JWT
    const loggedInUserId = (req as any).userId;

    if (!loggedInUserId) {
      return res.status(401).json({
        message: "User not authenticated",
      });
    }

    // Find organization
    const organization = await Organization.findOne({ org_id: orgId });

    if (!organization) {
      return res.status(404).json({
        message: "Organization not found",
      });
    }

    // Check if logged-in user is admin
    if (organization.admin.toString() !== loggedInUserId) {
      return res.status(403).json({
        message: "Only admin can add members",
      });
    }


    if (organization.members.some(
      (member) => member.toString() === userId
    )) {
      return res.status(400).json({
        message: "User is already a member",
      });
    }

    
    organization.members.push(userId);

    await organization.save();

    return res.status(200).json({
      message: "Member added successfully",
      organization,
    });
  } catch (error) {
    console.error("Add member error:", error);

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

    if (typeof org_id !== "string" || !org_id.trim()) {
      return res.status(400).json({
        message: "Organization ID is required",
      });
    }

    const organization = await Organization.findOne({ org_id })
      .populate("admin", "name email")
      .populate("members", "name email");

    if (!organization) {
      return res.status(404).json({
        message: "Organization not found",
      });
    }

    return res.status(200).json({
      organization,
    });
  } catch (error) {
    console.error("Get organization error:", error);

    return res.status(500).json({
      message: "Failed to get organization",
    });
  }
};