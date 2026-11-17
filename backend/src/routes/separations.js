import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/permissions.js';
import {
  createSeparation,
  actOnSeparation,
  listSeparations,
  getSeparation,
  updateClearanceItem,
  getSeparationTasks,
  listSeparationTasks,
  updateSeparationTask,
} from '../controllers/separationController.js';

const router = express.Router();

router.use(authenticate);

const SEPARATION_VIEW_ROLES = [
  'HR_MANAGER',
  'HR_OFFICER',
  'GM',
  'PAYROLL_OFFICER',
  'FINANCE',
  'DEPT_MANAGER',
  'COMPANY_ADMIN',
];

// List & create separations
router.get('/', requireRole(...SEPARATION_VIEW_ROLES), listSeparations);
router.post('/', requireRole('HR_MANAGER', 'HR_OFFICER', 'COMPANY_ADMIN'), createSeparation);

// Get single separation with clearance checklist and settlement
router.get('/:id', requireRole(...SEPARATION_VIEW_ROLES), getSeparation);
router.get('/:id/tasks', requireRole(...SEPARATION_VIEW_ROLES), getSeparationTasks);

// Approve or reject separation (HR Manager or Company Admin)
router.post('/:id/action', requireRole('HR_MANAGER', 'COMPANY_ADMIN'), actOnSeparation);

// Update / clear a clearance item
router.patch(
  ['/clearance-items/:itemId', '/clearance/:itemId'],
  requireRole('DEPT_MANAGER', 'HR_OFFICER', 'FINANCE', 'HR_MANAGER', 'COMPANY_ADMIN'),
  updateClearanceItem
);

// Update cancellation task
router.patch('/tasks/:id', requireRole('HR_OFFICER', 'HR_MANAGER', 'COMPANY_ADMIN'), updateSeparationTask);

export default router;
