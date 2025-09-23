import jwt from "jsonwebtoken"
import dotenv from "dotenv";
dotenv.config();

export const generateJWTToken = (payload : any) => {
    const token = jwt.sign(payload, process.env.JWT_SECRET as string, { expiresIn: "24h" });
    return token;
};
