import jwt, { JwtPayload } from "jsonwebtoken";
import { Response, NextFunction } from "express";
import { RequestWithUser, AuthPayload } from "../types/auth.js";
import { logger } from "../utils/logger.js";

export type { AuthPayload, RequestWithUser };

const verifyJWT = (req: RequestWithUser, res: Response, next: NextFunction) => {
  // Prefer cookie over Authorization header
  const cookieToken = req.cookies?.token;
  const headerToken = req.headers.authorization?.split(" ")[1];
  const token = cookieToken || headerToken;

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({ message: "JWT secret not configured" });
  }

  jwt.verify(
    token,
    secret,
    { issuer: "reviewhog", audience: "reviewhog-api" },
    (err: jwt.VerifyErrors | null, decoded: string | JwtPayload | undefined) => {
      if (err) {
        logger.warn("AUTH", "JWT verification failed", {
          source: cookieToken ? "cookie" : "header",
          error: err.message,
          name: err.name,
        });
        return res.status(403).json({ message: "Forbidden" });
      }
      req.user = decoded as AuthPayload;
      next();
    }
  );
};

export default verifyJWT;

