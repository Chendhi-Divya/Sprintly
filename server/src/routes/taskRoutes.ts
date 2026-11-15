
import express from "express";

import {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  bulkUpdateTasks,
  deleteTask,
  getTaskComments,
  addTaskComment,
} from "../controllers/taskController.js";

import {
  uploadTaskAttachment,
  getTaskAttachment,
  deleteTaskAttachment,
} from "../controllers/taskAttachmentController.js";

import protect from "../middleware/authMiddleware.js";

import {
  checkProjectMember,
  checkTaskProjectMember,
} from "../middleware/projectAuthorization.js";

import upload from "../middleware/taskUpload.js";

const router = express.Router();

// ==========================================
// CREATE TASK
// ==========================================

router.post(
  "/",
  protect,
  checkProjectMember,
  createTask
);

// ==========================================
// GET ALL TASKS
// ==========================================

router.get(
  "/",
  protect,
  getTasks
);

// ==========================================
// BULK UPDATE SELECTED TASKS
// Must be before /:id routes
// ==========================================

router.patch(
  "/bulk-update",
  protect,
  bulkUpdateTasks
);

// ==========================================
// TASK ATTACHMENTS
// ==========================================

router.post(
  "/:id/attachments",
  protect,
  checkTaskProjectMember,
  upload.single("attachment"),
  uploadTaskAttachment
);

router.get(
  "/:id/attachments/:fileId",
  protect,
  checkTaskProjectMember,
  getTaskAttachment
);

router.delete(
  "/:id/attachments/:fileId",
  protect,
  checkTaskProjectMember,
  deleteTaskAttachment
);

// ==========================================
// TASK COMMENTS
// ==========================================

router.get(
  "/:id/comments",
  protect,
  checkTaskProjectMember,
  getTaskComments
);

router.post(
  "/:id/comments",
  protect,
  checkTaskProjectMember,
  addTaskComment
);

// ==========================================
// GET SINGLE TASK
// ==========================================

router.get(
  "/:id",
  protect,
  checkTaskProjectMember,
  getTaskById
);

// ==========================================
// UPDATE TASK
// ==========================================

router.put(
  "/:id",
  protect,
  checkTaskProjectMember,
  updateTask
);

// ==========================================
// DELETE TASK
// ==========================================

router.delete(
  "/:id",
  protect,
  checkTaskProjectMember,
  deleteTask
);

export default router;
