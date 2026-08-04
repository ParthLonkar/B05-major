import express, { Router } from 'express';
import * as controllers from '../controllers/complaintController';

const router: Router = express.Router();

router.get('/search/query', controllers.searchComplaints);
router.get('/', controllers.getAllComplaints);
router.get('/:id', controllers.getComplaintById);
router.post('/', controllers.createComplaint);
router.put('/:id/status', controllers.updateComplaintStatus);
router.delete('/:id', controllers.deleteComplaint);

export default router;