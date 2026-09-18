import { Router } from "express";

import {
  registerUser,
  verifyEmailOTP,
  loginUser,
  logoutUser,
  resendOTP,
} from "../controllers/authController.js";

const router = Router();

router.post("/register", registerUser);
router.post("/verify-email", verifyEmailOTP);
router.post("/resend-otp", resendOTP);
router.post("/login", loginUser);
router.post("/logout", logoutUser);




export default router;