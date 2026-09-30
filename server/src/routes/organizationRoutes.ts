import express from "express";
import {
  createOrganization,
  getMyOrganizations,
  addMember,
getOrganizationById,
} from "../controllers/organizationController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", authMiddleware, createOrganization);


router.get("/", authMiddleware, getMyOrganizations);
router.post("/", authMiddleware, createOrganization);
router.post("/:org_id/members", authMiddleware, addMember);
router.get("/:org_id", authMiddleware, getOrganizationById);

export default router;