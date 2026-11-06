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
  deleteOrganization,
} from "../controllers/organizationController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", authMiddleware, createOrganization);
router.post("/setup", authMiddleware, createOrganizationWithFirstProject);

router.get("/", authMiddleware, getMyOrganizations);

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

router.patch("/:org_id", authMiddleware, updateOrganization);

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

router.get(
  "/:org_id/invitations",
  authMiddleware,
  getOrganizationInvitations
);
router.post(
  "/:org_id/invitations",
  authMiddleware,
  createOrganizationInvitation
);
router.delete(
  "/:org_id/invitations/:invitationId",
  authMiddleware,
  revokeOrganizationInvitation
);

// Delete organization. Keep this before the GET /:org_id route.
router.delete("/:org_id", authMiddleware, deleteOrganization);

router.get("/:org_id", authMiddleware, getOrganizationById);

export default router;