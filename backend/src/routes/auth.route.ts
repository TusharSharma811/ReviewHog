import { Router, Request, Response } from "express";
import { githubCallback, githubLogin } from "../controllers/auth.controller.js";
import verifyJWT from "../middleware/verifyJWT.js";

type RequestWithUser = Request & { user?: { id: string; name: string; email: string } };

const router = Router();

router.get("/github", githubLogin);
router.get("/github/callback", githubCallback);

router.get("/me", verifyJWT, (req: Request, res: Response) => {
  const user = (req as RequestWithUser).user;
  res.json({ user });
});

router.post("/logout", (_req: Request, res: Response) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: (process.env.NODE_ENV === "production" ? "none" : "lax") as "none" | "lax",
  });
  res.json({ message: "Logged out successfully" });
});

export default router;
