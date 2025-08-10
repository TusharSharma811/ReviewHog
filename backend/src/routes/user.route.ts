import { Router } from "express";
import verifyJWT from "../middleware/verifyJWT.ts";
import { getUserInsights } from "../controllers/user.controller.ts";

const router = Router();

router.get("/insights" , verifyJWT , getUserInsights) ;


export default router;