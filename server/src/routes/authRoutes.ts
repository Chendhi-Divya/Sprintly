
import { Router } from "express";
import passport from "../config/googleStrategy.js";

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
  changePassword,
  verifyChangePasswordOTP,
} from "../controllers/authController.js";

import {
  googleAuthCallback,
} from "../controllers/googleAuthController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = Router();

// Google OAuth
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL || "http://localhost:5173"}/login?google=failed`,
  }),
  googleAuthCallback
);

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

// Change password
router.post("/change-password", authMiddleware, changePassword);
router.post(
  "/verify-change-password",
  authMiddleware,
  verifyChangePasswordOTP
);

// Password reset
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;
