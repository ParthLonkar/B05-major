import express, { Router } from 'express';
import * as controllers from '../controllers/authController';

const router: Router = express.Router();

router.post('/login', controllers.login);
router.post('/register', controllers.register);

export default router;
