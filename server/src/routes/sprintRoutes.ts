import { Router } from "express";

import {
  completeSprint,
  createSprint,
  deleteSprint,
  getProjectSprints,
  setTaskSprint,
  startSprint,
  updateSprint,
} from "../controllers/sprintController.js";
import protect from "../middleware/authMiddleware.js";

const router = Router();

router.get("/projects/:projectId/sprints", protect, getProjectSprints);
router.post("/projects/:projectId/sprints", protect, createSprint);
router.patch("/projects/:projectId/sprints/:sprintId", protect, updateSprint);
router.post("/projects/:projectId/sprints/:sprintId/start", protect, startSprint);
router.post("/projects/:projectId/sprints/:sprintId/complete", protect, completeSprint);
router.delete("/projects/:projectId/sprints/:sprintId", protect, deleteSprint);
router.patch("/projects/:projectId/tasks/:taskId/sprint", protect, setTaskSprint);

export default router;
