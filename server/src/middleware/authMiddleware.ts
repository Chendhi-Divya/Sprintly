import { type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";

const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const cookieToken = req.headers.cookie
      ?.split(";")
      .map((cookie) => cookie.trim())
      .find((cookie) => cookie.startsWith("token="))
      ?.slice("token=".length);
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length).trim()
      : undefined;
    const token = cookieToken ? decodeURIComponent(cookieToken) : bearerToken;

    if (!token) {
      return res.status(401).json({
        message: "Authorization token is required",
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as unknown as { userId?: unknown } | string;

    if (typeof decoded === "string" || typeof decoded.userId !== "string") {
      return res.status(401).json({
        message: "Invalid or expired token",
      });
    }

    (req as any).userId = decoded.userId;

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
};

export default authMiddleware;