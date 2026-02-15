import { Router } from "express";
import { githubCallback, githubLogin } from "../controllers/auth.controller.js";
import verifyJWT from "../middleware/verifyJWT.js";

const router = Router();

router.get("/github", githubLogin);
router.get("/github/callback", githubCallback);

router.get("/me", verifyJWT, (req: any, res: any) => {
  res.json({ user: req.user });
});

export default router;
