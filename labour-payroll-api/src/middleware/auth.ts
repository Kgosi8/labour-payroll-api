import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AppError } from "../utils/AppError";
import type { Role } from "../types/express";

export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer "))
    throw new AppError(401, "UNAUTHENTICATED", "Missing token");
  try {
    const payload = jwt.verify(
      header.slice(7),
      env.JWT_SECRET,
    ) as jwt.JwtPayload;
    req.user = { id: String(payload.sub), role: payload.role as Role };
    next();
  } catch {
    throw new AppError(401, "UNAUTHENTICATED", "Invalid or expired token");
  }
};

export const requireRole =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new AppError(
        403,
        "FORBIDDEN",
        "You do not have access to this resource",
      );
    }
    next();
  };
