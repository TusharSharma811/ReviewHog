import { Router } from "express";
import verifyJWT from "../middleware/verifyJWT.js";
import { getUserInsights, toggleGithubReview } from "../controllers/user.controller.js";

const router = Router();

router.get("/me/insights", verifyJWT, getUserInsights);
router.post("/github/toggleReview/:repoId", verifyJWT, toggleGithubReview);

export default router;