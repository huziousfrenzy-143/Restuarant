import { Router } from 'express';
import { PaymentMethodController } from './payment-method.controller';
import { requireRole } from '../../middlewares/auth.middleware';

const router = Router({ mergeParams: true });

// All authenticated staff can retrieve payment methods for POS charges
router.get('/', PaymentMethodController.getPaymentMethods);

// Adding/editing/deleting custom payment methods is restricted to Owner, Admin & Super Admin
router.post('/', requireRole('super_admin', 'owner', 'admin'), PaymentMethodController.createPaymentMethod);
router.put('/:id', requireRole('super_admin', 'owner', 'admin'), PaymentMethodController.updatePaymentMethod);
router.delete('/:id', requireRole('super_admin', 'owner', 'admin'), PaymentMethodController.deletePaymentMethod);

export default router;
