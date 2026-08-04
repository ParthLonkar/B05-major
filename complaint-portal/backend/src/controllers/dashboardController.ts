import { Request, Response } from 'express';
import * as dataService from '../utils/database';

/**
 * Get dashboard statistics
 */
export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const stats = await dataService.getDashboardStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard stats',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Get heatmap data
 */
export const getHeatmapData = async (req: Request, res: Response): Promise<void> => {
  try {
    const heatmapData = await dataService.getHeatmapData();

    res.json({
      success: true,
      data: heatmapData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch heatmap data',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
