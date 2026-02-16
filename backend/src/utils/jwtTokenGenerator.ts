import jwt from "jsonwebtoken";

interface UserPayload {
  id: string;
  name: string;
  email: string;
}

export const generateJWTToken = (payload: UserPayload): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }
  return jwt.sign(payload, secret, { expiresIn: "7d" });
};
