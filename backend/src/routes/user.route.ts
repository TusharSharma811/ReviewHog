import { Router } from "express";
import verifyJWT from "../middleware/verifyJWT.js";
import { getUserInsights} from "../controllers/user.controller.js";

const router = Router();

router.get('/me/insights', verifyJWT, getUserInsights);
export default router;