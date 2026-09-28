import express, { Router } from 'express';
import * as controllers from '../controllers/dashboardController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router: Router = express.Router();

// Protected route for overview stats (requires authentication, not just admin)
router.get('/stats', authenticate, controllers.getDashboardStats);

// Public route for interactive complaint heatmap markers
router.get('/heatmap', controllers.getHeatmapData);

export default router;
