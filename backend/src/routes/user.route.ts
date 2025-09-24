import { Router } from "express";
import verifyJWT from "../middleware/verifyJWT.js";
import { getUserInsights, getUserRepositories } from "../controllers/user.controller.js";

const router = Router();

router.get("/insights" , verifyJWT , getUserInsights) ;
router.get("/repositories" , verifyJWT , getUserRepositories) ;

export default router;