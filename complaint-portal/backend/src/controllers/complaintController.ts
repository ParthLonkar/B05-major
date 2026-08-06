import { Request, Response } from 'express';
import * as dataService from '../utils/database';
import { sendComplaintReceipt } from '../utils/email';

/**
 * Get all complaints
 */
export const getAllComplaints = async (req: Request, res: Response): Promise<void> => {
  try {
    const complaints = await dataService.getAllComplaints();
    res.json({
      success: true,
      data: complaints,
      total: complaints.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch complaints',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Get complaint by ID
 */
export const getComplaintById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const complaint = await dataService.getComplaintById(id);

    if (!complaint) {
      res.status(404).json({
        success: false,
        error: 'Complaint not found',
      });
      return;
    }

    res.json({
      success: true,
      data: complaint,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch complaint',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Create new complaint
 */
export const createComplaint = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fullName, mobileNumber, email, category, description, latitude, longitude, address, severity, imagePreview } = req.body;

    if (!fullName || !mobileNumber || !category || !description || latitude === undefined || longitude === undefined) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
      return;
    }

    const newComplaint = await dataService.createComplaint({
      fullName,
      mobileNumber,
      email,
      category,
      description,
      latitude,
      longitude,
      address: address || 'Unknown Location',
      severity: severity || 'Medium',
      imagePreview,
    });

    const emailSent = await sendComplaintReceipt(newComplaint);

    res.status(201).json({
      success: true,
      data: newComplaint,
      message: 'Complaint registered successfully',
      emailSent,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create complaint',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Update complaint status
 */
export const updateComplaintStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      res.status(400).json({
        success: false,
        error: 'Status is required',
      });
      return;
    }

    const validStatuses = ['Pending', 'Progressed', 'Under Construction', 'Done'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        error: 'Invalid status',
      });
      return;
    }

    const updatedComplaint = await dataService.updateComplaintStatus(id, status);

    if (!updatedComplaint) {
      res.status(404).json({
        success: false,
        error: 'Complaint not found',
      });
      return;
    }

    res.json({
      success: true,
      data: updatedComplaint,
      message: 'Complaint status updated successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update complaint',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Delete complaint
 */
export const deleteComplaint = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const deleted = await dataService.deleteComplaint(id);

    if (!deleted) {
      res.status(404).json({
        success: false,
        error: 'Complaint not found',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Complaint deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to delete complaint',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Search complaints
 */
export const searchComplaints = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Query parameter is required',
      });
      return;
    }

    const results = await dataService.searchComplaints(q);

    res.json({
      success: true,
      data: results,
      total: results.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Search failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
