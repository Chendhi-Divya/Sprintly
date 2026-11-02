import { Router } from "express";

import {
  registerUser,
  verifyEmailOTP,
  loginUser,
  logoutUser,
  resendOTP,
  forgotPassword,
  resetPassword,
  getCurrentUser,
  updateProfile,
  requestEmailChange,
  verifyEmailChangeOTP,
} from "../controllers/authController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = Router();

// Registration
router.post("/register", registerUser);
router.post("/verify-email", verifyEmailOTP);
router.post("/resend-otp", resendOTP);

// Login and logout
router.post("/login", loginUser);
router.post("/logout", logoutUser);

// Authenticated user
router.get("/me", authMiddleware, getCurrentUser);
router.put("/profile", authMiddleware, updateProfile);

// Email change
router.post("/change-email", authMiddleware, requestEmailChange);
router.post("/verify-email-change", authMiddleware, verifyEmailChangeOTP);

// Password reset
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;