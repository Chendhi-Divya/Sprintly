import express from "express";

import {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
} from "../controllers/taskController.js";

import protect from "../middleware/authMiddleware.js";

import {
  checkProjectMember,
  checkTaskProjectMember,
} from "../middleware/projectAuthorization.js";

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

// Get a single task by ID
router.get(
  "/:id",
  protect,
  getTaskById
);

// Update a task, including its status
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
