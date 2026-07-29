import { Router } from 'express';
import { OrderController } from './order.controller';

const router = Router({ mergeParams: true });

router.get('/', OrderController.getOrders);
router.post('/', OrderController.createOrder);
router.put('/:id/items', OrderController.updateOrderItems);
router.patch('/:id/status', OrderController.updateOrderStatus);

export default router;
