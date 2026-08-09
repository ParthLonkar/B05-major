import express, { Router } from 'express';
import * as controllers from '../controllers/complaintController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router: Router = express.Router();

// Public routes (Citizen reporting & status tracking)
router.get('/search/query', controllers.searchComplaints);
router.get('/:id', controllers.getComplaintById);
router.post('/', controllers.createComplaint);

// Protected Admin-Only routes
router.get('/', authenticate, requireAdmin, controllers.getAllComplaints);
router.put('/:id/status', authenticate, requireAdmin, controllers.updateComplaintStatus);
router.delete('/:id', authenticate, requireAdmin, controllers.deleteComplaint);

export default router;