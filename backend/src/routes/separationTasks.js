import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  listSeparationTasks,
  updateSeparationTask,
} from '../controllers/separationController.js';

const router = express.Router();

router.use(authenticate);

router.get('/', listSeparationTasks);
router.patch('/:id', updateSeparationTask);

export default router;

