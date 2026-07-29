import { Router } from 'express';
import { SaleController } from './sale.controller';

const router = Router({ mergeParams: true });

router.get('/', SaleController.getSales);
router.post('/', SaleController.recordSale);

export default router;
