import { Router } from "express";
import verifyJWT from "../middleware/verifyJWT.js";
import { getUserInsights, getUserRepositories , getUserRecentReviews} from "../controllers/user.controller.js";

const router = Router();

router.get("/insights" , verifyJWT , getUserInsights) ;
router.get("/repositories" , verifyJWT , getUserRepositories) ;
router.get("/recent-reviews" , verifyJWT , getUserRecentReviews) ;
export default router;