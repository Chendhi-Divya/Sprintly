
import type { Request, Response } from "express";
import mongoose from "mongoose";
import Notification from "../models/Notification.js";

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

    const notifications = await Notification.find({
      recipient: userId,
    })
      .populate("task", "title")
      .sort({ createdAt: -1 });

    const unreadCount = await Notification.countDocuments({
      recipient: userId,
      isRead: false,
    });

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

    const notification = await Notification.findById(id);

    if (!notification || notification.recipient.toString() !== userId) {
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

    const result = await Notification.updateMany(
      {
        recipient: userId,
        isRead: false,
      },
      {
        $set: { isRead: true },
      }
    );

    res.status(200).json({
      message: "All notifications marked as read",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Mark all notifications as read error:", error);

    res.status(500).json({
      message: "Failed to update notifications",
    });
  }
};
