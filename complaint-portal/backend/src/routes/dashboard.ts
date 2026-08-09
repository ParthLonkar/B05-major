import express, { Router } from 'express';
import * as controllers from '../controllers/dashboardController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router: Router = express.Router();

// Protected Admin-Only route for overview stats
router.get('/stats', authenticate, requireAdmin, controllers.getDashboardStats);

// Public route for interactive complaint heatmap markers
router.get('/heatmap', controllers.getHeatmapData);

export default router;
