import { Router } from 'express';
import { getHistory, getCostAnalytics } from '../controllers/historyController.js';

const router = Router();

router.get('/', getHistory);
router.get('/cost-analytics', getCostAnalytics);

export default router;
