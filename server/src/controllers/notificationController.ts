
import type { Request, Response } from "express";
import mongoose from "mongoose";
import Notification from "../models/notification.js";

// Get notifications belonging to the logged-in user
export const getNotifications = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = (req as any).userId;

    const notifications = await Notification.find({
      recipient: userId,
    })
      .populate("task", "title")
      .sort({ createdAt: -1 });

    const unreadCount = await Notification.countDocuments({
      recipient: userId,
      isRead: false,
    });

    return res.status(200).json({
      message: "Notifications fetched successfully",
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error("Get notifications error:", error);

    return res.status(500).json({
      message: "Failed to fetch notifications",
    });
  }
};

// Mark one of the user's notifications as read
export const markNotificationAsRead = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    const notification = await Notification.findOneAndUpdate(
      {
        _id: id,
        recipient: userId,
      },
      {
        $set: { isRead: true },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!notification) {
      return res.status(404).json({
        message: "Notification not found",
      });
    }

    return res.status(200).json({
      message: "Notification marked as read",
      notification,
    });
  } catch (error) {
    console.error("Mark notification as read error:", error);

    return res.status(500).json({
      message: "Failed to update notification",
    });
  }
};

// Mark all of the user's notifications as read
export const markAllNotificationsAsRead = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = (req as any).userId;

    const result = await Notification.updateMany(
      {
        recipient: userId,
        isRead: false,
      },
      {
        $set: { isRead: true },
      }
    );

    return res.status(200).json({
      message: "All notifications marked as read",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Mark all notifications as read error:", error);

    return res.status(500).json({
      message: "Failed to update notifications",
    });
  }
};
