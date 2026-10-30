
import express from "express";
import {
  createOrganization,
  createOrganizationWithFirstProject,
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
  acceptOrganizationInvitationByToken,
  revokeOrganizationInvitation,
} from "../controllers/organizationController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Create an organization without a first project (existing endpoint)
router.post("/", authMiddleware, createOrganization);

// Create an organization along with its first project
router.post("/setup", authMiddleware, createOrganizationWithFirstProject);

// Get all organizations of the logged-in user
router.get("/", authMiddleware, getMyOrganizations);

// Organization invitations
router.get("/invitations", authMiddleware, getMyOrganizationInvitations);
router.post(
  "/invitations/accept-token",
  authMiddleware,
  acceptOrganizationInvitationByToken
);
router.patch(
  "/invitations/:invitationId/accept",
  authMiddleware,
  acceptOrganizationInvitation
);

// Update organization
router.patch("/:org_id", authMiddleware, updateOrganization);

// Organization members
router.post("/:org_id/members", authMiddleware, addMember);
router.patch(
  "/:org_id/members/:memberId",
  authMiddleware,
  updateOrganizationMemberRole
);
router.delete(
  "/:org_id/members/:memberId",
  authMiddleware,
  removeOrganizationMember
);

// Organization-specific invitations
router.get("/:org_id/invitations", authMiddleware, getOrganizationInvitations);
router.post("/:org_id/invitations", authMiddleware, createOrganizationInvitation);
router.delete(
  "/:org_id/invitations/:invitationId",
  authMiddleware,
  revokeOrganizationInvitation
);

// Get organization by ID
router.get("/:org_id", authMiddleware, getOrganizationById);

export default router;
