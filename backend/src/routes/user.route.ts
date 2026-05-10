import { Router } from "express";
import verifyJWT from "../middleware/verifyJWT.js";
import {
  getUserInsights,
  toggleGithubReview,
  addRepository,
  removeRepository,
  getEnhancedMetrics,
  getAISettings,
  updateAISettings,
} from "../controllers/user.controller.js";
import { getGitHubActivity } from "../controllers/github.controller.js";

const router = Router();

router.get("/me/insights", verifyJWT, getUserInsights);
router.get("/me/metrics", verifyJWT, getEnhancedMetrics);
router.get("/me/github-activity", verifyJWT, getGitHubActivity);
router.get("/me/ai-settings", verifyJWT, getAISettings);
router.put("/me/ai-settings", verifyJWT, updateAISettings);
router.post("/repos", verifyJWT, addRepository);
router.delete("/repos/:repoId", verifyJWT, removeRepository);
router.post("/github/toggleReview/:repoId", verifyJWT, toggleGithubReview);

export default router;
