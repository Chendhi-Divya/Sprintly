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

router.post(
  "/",
  protect,
  checkProjectMember,
  createTask
);

router.get("/", protect, getTasks);

router.get("/:id", protect, getTaskById);

router.put(
  "/:id",
  protect,
  checkTaskProjectMember,
  updateTask
);

router.delete(
  "/:id",
  protect,
  checkTaskProjectMember,
  deleteTask
);

export default router;