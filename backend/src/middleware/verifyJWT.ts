import jwt, { JwtPayload } from "jsonwebtoken";
import { Response, Request, NextFunction } from "express";

export interface AuthPayload extends JwtPayload {
  id: string;
  name: string;
  email: string;
}

export type RequestWithUser = Request & { user?: AuthPayload };

const verifyJWT = (req: RequestWithUser, res: Response, next: NextFunction) => {
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({ message: "JWT secret not configured" });
  }

  jwt.verify(token, secret, (err: jwt.VerifyErrors | null, decoded: string | JwtPayload | undefined) => {
    if (err) {
      return res.status(403).json({ message: "Forbidden" });
    }
    req.user = decoded as AuthPayload;
    next();
  });
};

export default verifyJWT;
