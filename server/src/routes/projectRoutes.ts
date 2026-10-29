import express from "express";

import {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  addProjectMember,
  getProjectMembers,
  removeProjectMember,
} from "../controllers/projectController.js";

import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, getProjects);

router.post("/", protect, createProject);

router.get("/:id", protect, getProjectById);

router.put("/:id", protect, updateProject);

router.delete("/:id", protect, deleteProject);

router.post("/:id/members", protect, addProjectMember);

router.get("/:id/members", protect, getProjectMembers);

router.delete("/:id/members/:memberId", protect, removeProjectMember);

export default router;