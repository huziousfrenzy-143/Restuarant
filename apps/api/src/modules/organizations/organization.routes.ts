import { Router } from 'express';
import { OrganizationController } from './organization.controller';
import { authMiddleware, requireRole } from '../../middlewares/auth.middleware';

const router = Router();

// Protect all Super Admin Platform Organization routes with Super Admin role enforcement
router.use(authMiddleware, requireRole('super_admin'));

router.get('/', OrganizationController.getAll);
router.get('/:id', OrganizationController.getById);
router.post('/', OrganizationController.create);
router.put('/:id', OrganizationController.update);
router.patch('/:id/status', OrganizationController.toggleStatus);
router.post('/extend-subscription', OrganizationController.extendSubscription);

export default router;
