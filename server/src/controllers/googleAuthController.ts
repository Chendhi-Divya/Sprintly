
import { type Request, type Response } from "express";

import type { IUser } from "../models/User.js";
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

export const googleAuthCallback = (
  req: Request,
  res: Response
) => {
  try {
    const user = req.user as IUser | undefined;

    if (!user) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/login?google=failed`
      );
    }

    const token = generateToken(user._id.toString());

    // Set the same authentication cookie used by normal login.
    res.cookie("token", token, authCookieOptions);

    // Send the token through the URL fragment.
    // Fragments are not sent to the backend in HTTP requests.
    const frontendUrl =
      process.env.FRONTEND_URL || "http://localhost:5173";

    return res.redirect(
      `${frontendUrl}/login#token=${encodeURIComponent(token)}`
    );
  } catch (error) {
    console.error("Google callback error:", error);

    return res.redirect(
      `${process.env.FRONTEND_URL}/login?google=failed`
    );
  }
};
