import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  createSeparation,
  actOnSeparation,
  listSeparations,
  getSeparation,
  updateClearanceItem,
} from '../controllers/separationController.js';

const router = express.Router();

router.use(authenticate);

// List & create separations
router.get('/', listSeparations);
router.post('/', createSeparation);

// Get single separation with clearance checklist and settlement
router.get('/:id', getSeparation);

// Approve or reject separation (HR Manager)
router.post('/:id/action', actOnSeparation);

// Update / clear a clearance item
router.patch('/clearance-items/:itemId', updateClearanceItem);
router.patch('/clearance/:itemId', updateClearanceItem);

export default router;
