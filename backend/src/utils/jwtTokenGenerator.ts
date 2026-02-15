import jwt from "jsonwebtoken";

export const generateJWTToken = (payload: any) => {
  const token = jwt.sign(payload, process.env.JWT_SECRET as string, { expiresIn: "24h" });
  return token;
};
