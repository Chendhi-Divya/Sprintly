
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
} from "../controllers/authController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = Router();

router.post("/register", registerUser);
router.post("/verify-email", verifyEmailOTP);
router.post("/resend-otp", resendOTP);

router.post("/login", loginUser);
router.post("/logout", logoutUser);

router.get("/me", authMiddleware, getCurrentUser);
router.put("/profile", authMiddleware, updateProfile);

router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;
