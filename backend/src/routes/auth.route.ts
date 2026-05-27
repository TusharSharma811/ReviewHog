import { Router, Request, Response } from "express";
import { githubCallback, githubLogin } from "../controllers/auth.controller.js";
import verifyJWT from "../middleware/verifyJWT.js";
import { RequestWithUser } from "../types/auth.js";

const router = Router();

const IS_DEPLOYED =
  process.env.NODE_ENV === "production" ||
  (process.env.FRONTEND_URL?.startsWith("https://") ?? false);

router.get("/github", githubLogin);
router.get("/github/callback", githubCallback);

router.get("/me", verifyJWT, (req: Request, res: Response) => {
  const user = (req as RequestWithUser).user;
  res.json({ user });
});

router.post("/logout", (_req: Request, res: Response) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: IS_DEPLOYED,
    sameSite: (IS_DEPLOYED ? "none" : "lax") as "none" | "lax",
    path: "/",
  });
  res.json({ message: "Logged out successfully" });
});

export default router;
