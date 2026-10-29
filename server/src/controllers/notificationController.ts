
import type { Request, Response } from "express";
import mongoose from "mongoose";
import Notification from "../models/Notification.js";
import Organization from "../models/Organization.js";
import Project from "../models/project.js";
import Task from "../models/task.js";

async function getOrganizationTaskIds(
  organizationId: unknown,
  userId: string
): Promise<Set<string> | null> {
  if (typeof organizationId !== "string" || !organizationId.trim()) {
    return null;
  }

  const value = organizationId.trim();
  const organizationMatch = [
    { org_id: value },
    { org_name: value },
    ...(mongoose.isValidObjectId(value) ? [{ _id: value }] : []),
  ];
  const organization = await Organization.findOne({
    members: userId,
    $or: organizationMatch,
  });

  if (!organization) {
    return null;
  }

  const organizationValues = [
    organization.org_id,
    organization.org_name,
    organization._id.toString(),
  ];
  const projects = await Project.find({
    organization: { $in: organizationValues },
    members: userId,
  }).select("_id");
  const taskIds = await Task.distinct("_id", {
    project: { $in: projects.map((project) => project._id) },
  });

  return new Set(taskIds.map((id) => id.toString()));
}

// Get notifications belonging to the logged-in user
export const getNotifications = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = (req as Request & { userId?: string }).userId;

    if (!userId || !mongoose.isValidObjectId(userId)) {
      res.status(401).json({
        message: "Unauthorized",
      });
      return;
    }

    const taskIds = await getOrganizationTaskIds(
      req.query.organizationId,
      userId
    );

    if (!taskIds) {
      res.status(403).json({
        message: "A valid organization is required",
      });
      return;
    }

    const userNotifications = await Notification.find({
      recipient: userId,
    })
      .populate("task", "title")
      .sort({ createdAt: -1 });
    const notifications = userNotifications.filter((notification) => {
      const task = notification.task as unknown as
        | { _id?: { toString(): string } }
        | null
        | undefined;
      const taskId = task?._id?.toString() ?? notification.task?.toString();
      return Boolean(taskId && taskIds.has(taskId));
    });
    const unreadCount = notifications.filter(
      (notification) => !notification.isRead
    ).length;

    res.status(200).json({
      message: "Notifications fetched successfully",
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error("Get notifications error:", error);

    res.status(500).json({
      message: "Failed to fetch notifications",
    });
  }
};

// Mark one notification as read
export const markNotificationAsRead = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = (req as Request & { userId?: string }).userId;
    const { id } = req.params;

    if (!userId || !mongoose.isValidObjectId(userId)) {
      res.status(401).json({
        message: "Unauthorized",
      });
      return;
    }

    if (typeof id !== "string" || !mongoose.isValidObjectId(id)) {
      res.status(400).json({
        message: "Invalid notification ID",
      });
      return;
    }

    const taskIds = await getOrganizationTaskIds(
      req.query.organizationId,
      userId
    );

    if (!taskIds) {
      res.status(403).json({
        message: "A valid organization is required",
      });
      return;
    }

    const notification = await Notification.findById(id);

    if (
      !notification ||
      notification.recipient.toString() !== userId ||
      !notification.task ||
      !taskIds.has(notification.task.toString())
    ) {
      res.status(404).json({
        message: "Notification not found",
      });
      return;
    }

    notification.isRead = true;
    await notification.save();

    res.status(200).json({
      message: "Notification marked as read",
      notification,
    });
  } catch (error) {
    console.error("Mark notification as read error:", error);

    res.status(500).json({
      message: "Failed to update notification",
    });
  }
};

// Mark all notifications as read for the logged-in user
export const markAllNotificationsAsRead = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = (req as Request & { userId?: string }).userId;

    if (!userId || !mongoose.isValidObjectId(userId)) {
      res.status(401).json({
        message: "Unauthorized",
      });
      return;
    }

    const taskIds = await getOrganizationTaskIds(
      req.query.organizationId,
      userId
    );

    if (!taskIds) {
      res.status(403).json({
        message: "A valid organization is required",
      });
      return;
    }

    const unreadNotifications = await Notification.find({
      recipient: userId,
      isRead: false,
    });
    const scopedNotifications = unreadNotifications.filter(
      (notification) =>
        notification.task && taskIds.has(notification.task.toString())
    );

    await Promise.all(
      scopedNotifications.map(async (notification) => {
        notification.isRead = true;
        await notification.save();
      })
    );

    res.status(200).json({
      message: "All notifications marked as read",
      modifiedCount: scopedNotifications.length,
    });
  } catch (error) {
    console.error("Mark all notifications as read error:", error);

    res.status(500).json({
      message: "Failed to update notifications",
    });
  }
};
