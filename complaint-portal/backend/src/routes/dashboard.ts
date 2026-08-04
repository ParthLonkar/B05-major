import express, { Router } from 'express';
import * as controllers from '../controllers/dashboardController';

const router: Router = express.Router();

// Get dashboard stats
router.get('/stats', controllers.getDashboardStats);

// Get heatmap data
router.get('/heatmap', controllers.getHeatmapData);

export default router;
