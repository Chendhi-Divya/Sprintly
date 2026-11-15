
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

    const frontendUrl = process.env.FRONTEND_URL;

    if (!frontendUrl) {
      console.error("FRONTEND_URL is not configured.");
      return res.status(500).send("Frontend URL is not configured.");
    }

    if (!user) {
      return res.redirect(`${frontendUrl}/login?google=failed`);
    }

    const token = generateToken(user._id.toString());

    res.cookie("token", token, authCookieOptions);

    return res.redirect(
      `${frontendUrl}/login#token=${encodeURIComponent(token)}`
    );
  } catch (error) {
    console.error("Google callback error:", error);

    const frontendUrl = process.env.FRONTEND_URL;

    if (!frontendUrl) {
      return res.status(500).send("Google authentication failed.");
    }

    return res.redirect(`${frontendUrl}/login?google=failed`);
  }
};
