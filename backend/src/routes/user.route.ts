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
  getOnboardingStatus,
  completeOnboarding,
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
import {
  getRepoStandards,
  createRepoStandard,
  updateRepoStandard,
  deleteRepoStandard,
  getRepoReviewInstructions,
  updateRepoReviewInstructions,
} from "../controllers/standards.controller.js";

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

// Review detail & management
router.get("/reviews/history", verifyJWT, getReviewHistory);
router.get("/reviews/compare", verifyJWT, compareReviews);
router.get("/reviews/:reviewId", verifyJWT, getReviewDetail);
router.post("/reviews/:reviewId/rerun", verifyJWT, rerunReview);

// Custom rules
router.get("/me/custom-rules", verifyJWT, getCustomRules);
router.post("/me/custom-rules", verifyJWT, createCustomRule);
router.put("/me/custom-rules/:ruleId", verifyJWT, updateCustomRule);
router.delete("/me/custom-rules/:ruleId", verifyJWT, deleteCustomRule);

// Repository standards (V3 pipeline)
router.get("/me/repo-standards", verifyJWT, getRepoStandards);
router.post("/me/repo-standards", verifyJWT, createRepoStandard);
router.put("/me/repo-standards/:standardId", verifyJWT, updateRepoStandard);
router.delete("/me/repo-standards/:standardId", verifyJWT, deleteRepoStandard);

// Per-repo review instructions (V3 pipeline)
router.get("/repos/:repoId/review-instructions", verifyJWT, getRepoReviewInstructions);
router.put("/repos/:repoId/review-instructions", verifyJWT, updateRepoReviewInstructions);

// Code quality badge (public — no auth)
router.get("/repos/:repoId/badge.svg", getRepoBadge);

// GitHub issue creation
router.post("/github/create-issue", verifyJWT, createGitHubIssue);

// Onboarding
router.get("/me/onboarding", verifyJWT, getOnboardingStatus);
router.post("/me/onboarding", verifyJWT, completeOnboarding);

export default router;
