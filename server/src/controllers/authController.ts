
import { type Request, type Response } from "express";
import bcrypt from "bcryptjs";

import User from "../models/User.js";
import PendingUser from "../models/PendingUser.js";
import EmailChangeOTP from "../models/EmailChangeOTP.js";

import {
  registerSchema,
  verifyOTPSchema,
  loginSchema,
  resendOTPSchema,
  changeEmailSchema,
  verifyEmailChangeSchema,
} from "../schemas/authSchema.js";

import { generateOTP } from "../utils/generateOTP.js";
import { sendOTPEmail } from "../services/emailService.js";
import { generateToken } from "../utils/generateToken.js";

const authCookieSameSite: "none" | "lax" =
  process.env.NODE_ENV === "production" ? "none" : "lax";

const authCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: authCookieSameSite,
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

type AuthenticatedRequest = Request & {
  userId?: string;
};

const getPublicUser = (user: {
  _id: { toString(): string };
  name: string;
  email: string;
}) => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
});

// Register: save the user in PendingUser until OTP verification.
export const registerUser = async (req: Request, res: Response) => {
  try {
    const result = registerSchema.safeParse(req.body);

    if (!result.success) {
      const fieldErrors: Record<string, string[]> = {};

      for (const issue of result.error.issues) {
        const field = String(issue.path[0] ?? "general");
        fieldErrors[field] ??= [];
        fieldErrors[field].push(issue.message);
      }

      return res.status(400).json({
        message: "Please correct the following errors",
        fieldErrors,
      });
    }

    const { name, email, password } = result.data;

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await PendingUser.findOneAndUpdate(
      { email },
      {
        $set: {
          name,
          email,
          password: hashedPassword,
          otp,
          otpExpiresAt,
        },
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    try {
      await sendOTPEmail(email, otp);
    } catch (emailError) {
      console.error("REGISTRATION OTP EMAIL ERROR:", emailError);

      return res.status(503).json({
        message:
          "Your details were saved, but we couldn't send the verification email. Please try again shortly.",
        code: "VERIFICATION_EMAIL_FAILED",
      });
    }

    return res.status(201).json({
      message: "Registration successful. OTP sent to your email.",
    });
  } catch (error) {
    console.error("Register error:", error);

    if ((error as any)?.code === 11000) {
      return res.status(409).json({
        message:
          "An account with this email already exists. Please log in instead.",
      });
    }

    return res.status(500).json({
      message: "We couldn't complete registration right now. Please try again.",
    });
  }
};

// Verify OTP and create the permanent user.
export const verifyEmailOTP = async (req: Request, res: Response) => {
  try {
    const result = verifyOTPSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: result.error.flatten(),
      });
    }

    const { email, otp } = result.data;
    const pendingUser = await PendingUser.findOne({ email });

    if (!pendingUser) {
      return res.status(404).json({
        message: "No pending registration found for this email.",
      });
    }

    if (pendingUser.otp !== otp) {
      return res.status(400).json({
        message: "Invalid OTP.",
      });
    }

    if (pendingUser.otpExpiresAt < new Date()) {
      await PendingUser.findOneAndDelete({ email });

      return res.status(400).json({
        message: "OTP has expired. Please register again.",
      });
    }

    const newUser = await User.create({
      name: pendingUser.name,
      email: pendingUser.email,
      password: pendingUser.password,
      isVerified: true,
    });

    await PendingUser.findOneAndDelete({ email });

    const token = generateToken(newUser._id.toString());

    res.cookie("token", token, authCookieOptions);

    return res.status(200).json({
      message: "Email verified and user registered successfully.",
      token,
      user: getPublicUser(newUser),
    });
  } catch (error) {
    console.error("Verify OTP error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

// Login.
export const loginUser = async (req: Request, res: Response) => {
  try {
    const result = loginSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: result.error.flatten(),
      });
    }

    const { email, password } = result.data;
    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    }).select("+password");

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        message:
          "Email not verified. Please verify your email before logging in.",
      });
    }

    if (!user.password) {
      console.error("Password field missing for user:", user._id);

      return res.status(500).json({
        message: "Unable to verify your password.",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(
      password,
      user.password
    );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const token = generateToken(user._id.toString());

    res.cookie("token", token, authCookieOptions);

    return res.status(200).json({
      message: "Login successful",
      token,
      user: getPublicUser(user),
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

// Logout.
export const logoutUser = async (_req: Request, res: Response) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: authCookieSameSite,
      path: "/",
    });

    return res.status(200).json({
      message: "User logged out successfully.",
    });
  } catch (error) {
    console.error("Logout error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

// Get the authenticated user.
export const getCurrentUser = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const user = await User.findById(req.userId).select("name email");

    if (!user) {
      return res.status(401).json({
        message: "User not found",
      });
    }

    return res.status(200).json({
      user: getPublicUser(user),
    });
  } catch (error) {
    console.error("Current user error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

// Resend registration OTP.
export const resendOTP = async (req: Request, res: Response) => {
  try {
    const result = resendOTPSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: result.error.flatten(),
      });
    }

    const { email } = result.data;
    const pendingUser = await PendingUser.findOne({ email });

    if (!pendingUser) {
      return res.status(404).json({
        message: "No pending registration found for this email.",
      });
    }

    pendingUser.otp = generateOTP();
    pendingUser.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await pendingUser.save();
    await sendOTPEmail(email, pendingUser.otp);

    return res.status(200).json({
      message: "New OTP sent to your email.",
    });
  } catch (error) {
    console.error("Resend OTP error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

// Request a password-reset OTP.
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (typeof email !== "string" || !email.trim()) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await PendingUser.findOneAndUpdate(
      { email: normalizedEmail },
      {
        email: normalizedEmail,
        otp,
        otpExpiresAt,
      },
      {
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    await sendOTPEmail(normalizedEmail, otp);

    return res.status(200).json({
      message: "OTP sent to your email",
    });
  } catch (error) {
    console.error("Forgot password error:", error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

// Reset password using OTP.
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (
      typeof email !== "string" ||
      typeof otp !== "string" ||
      typeof newPassword !== "string" ||
      !email.trim() ||
      !otp.trim() ||
      newPassword.length < 8
    ) {
      return res.status(400).json({
        message:
          "Please provide a valid email, OTP, and password of at least 8 characters.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const pendingUser = await PendingUser.findOne({
      email: normalizedEmail,
    });

    if (!pendingUser) {
      return res.status(404).json({
        message: "No password reset request found.",
      });
    }

    if (pendingUser.otp !== otp) {
      return res.status(400).json({
        message: "Invalid OTP.",
      });
    }

    if (pendingUser.otpExpiresAt < new Date()) {
      await PendingUser.findOneAndDelete({
        email: normalizedEmail,
      });

      return res.status(400).json({
        message: "OTP has expired. Please request a new OTP.",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const updatedUser = await User.findOneAndUpdate(
      { email: normalizedEmail },
      { password: hashedPassword },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    await PendingUser.findOneAndDelete({
      email: normalizedEmail,
    });

    return res.status(200).json({
      message: "Password reset successfully.",
    });
  } catch (error) {
    console.error("Reset password error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

// Update the authenticated user's profile.
export const updateProfile = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const { name } = req.body;

    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        message: "Name is required",
      });
    }

    if (name.trim().length < 2) {
      return res.status(400).json({
        message: "Name must contain at least 2 characters",
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.userId,
      {
        name: name.trim(),
      },
      {
        new: true,
        runValidators: true,
      }
    ).select("name email");

    if (!updatedUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json({
      message: "Profile updated successfully",
      user: getPublicUser(updatedUser),
    });
  } catch (error) {
    console.error("Update profile error:", error);

    return res.status(500).json({
      message: "Could not update profile",
    });
  }
};

// Request an OTP to change the authenticated user's email.
export const requestEmailChange = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const result = changeEmailSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Invalid email address",
        errors: result.error.flatten(),
      });
    }

    const normalizedEmail = result.data.email;

    const currentUser = await User.findById(req.userId).select("email");

    if (!currentUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (currentUser.email === normalizedEmail) {
      return res.status(400).json({
        message: "This is already your current email address",
      });
    }

    const existingUser = await User.findOne({
      email: normalizedEmail,
      _id: { $ne: req.userId },
    });

    if (existingUser) {
      return res.status(409).json({
        message: "This email is already registered",
      });
    }

    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await EmailChangeOTP.findOneAndUpdate(
      { userId: req.userId },
      {
        $set: {
          userId: req.userId,
          email: normalizedEmail,
          otp,
          otpExpiresAt,
        },
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
      }
    );

    try {
      await sendOTPEmail(normalizedEmail, otp);
    } catch (emailError) {
      console.error("EMAIL CHANGE OTP EMAIL ERROR:", emailError);

      await EmailChangeOTP.deleteOne({
        userId: req.userId,
      });

      return res.status(503).json({
        message: "We couldn't send the OTP. Please try again shortly.",
      });
    }

    return res.status(200).json({
      message: "OTP sent to your new email address.",
    });
  } catch (error) {
    console.error("Request email change error:", error);

    return res.status(500).json({
      message: "Could not process your email change request",
    });
  }
};

// Verify OTP and update the authenticated user's email.
export const verifyEmailChangeOTP = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const result = verifyEmailChangeSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Invalid email or OTP",
        errors: result.error.flatten(),
      });
    }

    const { email, otp } = result.data;

    const emailChangeRequest = await EmailChangeOTP.findOne({
      userId: req.userId,
      email,
    });

    if (!emailChangeRequest) {
      return res.status(404).json({
        message:
          "No email change request found for this address. Please request a new OTP.",
      });
    }

    if (emailChangeRequest.otpExpiresAt < new Date()) {
      await EmailChangeOTP.deleteOne({
        _id: emailChangeRequest._id,
      });

      return res.status(400).json({
        message: "OTP has expired. Please request a new OTP.",
      });
    }

    if (emailChangeRequest.otp !== otp) {
      return res.status(400).json({
        message: "Invalid OTP",
      });
    }

    const existingUser = await User.findOne({
      email,
      _id: { $ne: req.userId },
    });

    if (existingUser) {
      return res.status(409).json({
        message: "This email is already registered",
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.userId,
      {
        $set: {
          email,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    ).select("name email");

    if (!updatedUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    await EmailChangeOTP.deleteOne({
      _id: emailChangeRequest._id,
    });

    return res.status(200).json({
      message: "Email address updated successfully.",
      user: getPublicUser(updatedUser),
    });
  } catch (error) {
    console.error("Verify email change OTP error:", error);

    if ((error as any)?.code === 11000) {
      return res.status(409).json({
        message: "This email is already registered",
      });
    }

    return res.status(500).json({
      message: "Could not verify OTP and update email",
    });
  }
};
