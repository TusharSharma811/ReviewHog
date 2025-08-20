import { Router } from 'express';
import {
  createFeedback,
  getFeedback,
  updateFeedback,
  queryFeedbacks,
  getFeedbackStats
} from '../controllers/feedback.controller.js';

const router = Router();

// Feedback routes
router.post('/', createFeedback);
router.get('/stats', getFeedbackStats);
router.get('/search', queryFeedbacks);
router.get('/:id', getFeedback);
router.put('/:id', updateFeedback);

export default router;