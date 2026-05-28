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
  getReviewSettings,
  updateReviewSettings,
} from "../controllers/user.controller.js";
import { getGitHubActivity } from "../controllers/github.controller.js";
import {
  getReviewDetail,
  getReviewHistory,
  compareReviews,
  getCustomRules,
  createCustomRule,
  updateCustomRule,
  deleteCustomRule,
  getRepoBadge,
  createGitHubIssue,
  rerunReview,
} from "../controllers/review.controller.js";

const router = Router();

// Existing routes
router.get("/me/insights", verifyJWT, getUserInsights);
router.get("/me/metrics", verifyJWT, getEnhancedMetrics);
router.get("/me/github-activity", verifyJWT, getGitHubActivity);
router.get("/me/ai-settings", verifyJWT, getAISettings);
router.put("/me/ai-settings", verifyJWT, updateAISettings);
router.get("/me/review-settings", verifyJWT, getReviewSettings);
router.put("/me/review-settings", verifyJWT, updateReviewSettings);
router.post("/repos", verifyJWT, addRepository);
router.delete("/repos/:repoId", verifyJWT, removeRepository);
router.post("/github/toggleReview/:repoId", verifyJWT, toggleGithubReview);

// New: Review detail & management
router.get("/reviews/history", verifyJWT, getReviewHistory);
router.get("/reviews/compare", verifyJWT, compareReviews);
router.get("/reviews/:reviewId", verifyJWT, getReviewDetail);
router.post("/reviews/:reviewId/rerun", verifyJWT, rerunReview);

// New: Custom rules
router.get("/me/custom-rules", verifyJWT, getCustomRules);
router.post("/me/custom-rules", verifyJWT, createCustomRule);
router.put("/me/custom-rules/:ruleId", verifyJWT, updateCustomRule);
router.delete("/me/custom-rules/:ruleId", verifyJWT, deleteCustomRule);

// New: Code quality badge (public — no auth)
router.get("/repos/:repoId/badge.svg", getRepoBadge);

// New: GitHub issue creation
router.post("/github/create-issue", verifyJWT, createGitHubIssue);

export default router;
