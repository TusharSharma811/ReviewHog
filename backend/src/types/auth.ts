import { Request } from "express";
import { JwtPayload } from "jsonwebtoken";

export interface AuthPayload extends JwtPayload {
  id: string;
  name: string;
  email: string;
}

export type RequestWithUser = Request & { user?: AuthPayload };
