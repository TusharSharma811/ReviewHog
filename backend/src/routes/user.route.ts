import { Router } from "express";
import verifyJWT from "../middleware/verifyJWT.ts";
import { getUserInsights, getUserRepositories } from "../controllers/user.controller.ts";

const router = Router();

router.get("/insights" , verifyJWT , getUserInsights) ;
router.get("/repositories" , verifyJWT , getUserRepositories) ;

export default router;