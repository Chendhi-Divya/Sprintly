
import express from "express";
import {
  createOrganization,
  getMyOrganizations,
  addMember,
  getOrganizationById,
  updateOrganization,
  updateOrganizationMemberRole,
  removeOrganizationMember,
  createOrganizationInvitation,
  getMyOrganizationInvitations,
  getOrganizationInvitations,
  acceptOrganizationInvitation,
  revokeOrganizationInvitation,
} from "../controllers/organizationController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", authMiddleware, createOrganization);
router.get("/", authMiddleware, getMyOrganizations);
router.get("/invitations", authMiddleware, getMyOrganizationInvitations);
router.patch("/invitations/:invitationId/accept", authMiddleware, acceptOrganizationInvitation);
router.patch("/:org_id", authMiddleware, updateOrganization);
router.get("/:org_id/invitations", authMiddleware, getOrganizationInvitations);
router.post("/:org_id/members", authMiddleware, addMember);
router.patch("/:org_id/members/:memberId", authMiddleware, updateOrganizationMemberRole);
router.delete("/:org_id/members/:memberId", authMiddleware, removeOrganizationMember);
router.post("/:org_id/invitations", authMiddleware, createOrganizationInvitation);
router.delete("/:org_id/invitations/:invitationId", authMiddleware, revokeOrganizationInvitation);
router.get("/:org_id", authMiddleware, getOrganizationById);

export default router;
