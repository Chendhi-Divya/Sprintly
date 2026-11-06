
import express from "express";

import {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  getTaskComments,
  addTaskComment,
} from "../controllers/taskController.js";

import {
  uploadTaskAttachment,
  getTaskAttachment,
} from "../controllers/taskAttachmentController.js";

import protect from "../middleware/authMiddleware.js";

import {
  checkProjectMember,
  checkTaskProjectMember,
} from "../middleware/projectAuthorization.js";

import upload from "../middleware/taskUpload.js";

const router = express.Router();

// Create a new task
router.post(
  "/",
  protect,
  checkProjectMember,
  createTask
);

// Get all tasks with filtering and pagination
router.get(
  "/",
  protect,
  getTasks
);

// Upload an attachment to a task
router.post(
  "/:id/attachments",
  protect,
  checkTaskProjectMember,
  upload.single("attachment"),
  uploadTaskAttachment
);

// View or download a task attachment
router.get(
  "/:id/attachments/:fileId",
  protect,
  checkTaskProjectMember,
  getTaskAttachment
);

// Get comments for a task
router.get(
  "/:id/comments",
  protect,
  checkTaskProjectMember,
  getTaskComments
);

// Add a comment to a task
router.post(
  "/:id/comments",
  protect,
  checkTaskProjectMember,
  addTaskComment
);

// Get a single task with its details and subtasks
router.get(
  "/:id",
  protect,
  checkTaskProjectMember,
  getTaskById
);

// Update a task, including its status and description
router.put(
  "/:id",
  protect,
  checkTaskProjectMember,
  updateTask
);

// Delete a task
router.delete(
  "/:id",
  protect,
  checkTaskProjectMember,
  deleteTask
);

export default router;
