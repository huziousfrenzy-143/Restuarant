import { Router } from 'express';
import { InventoryController } from './inventory.controller';

const router = Router({ mergeParams: true });

router.get('/', InventoryController.getItems);
router.post('/', InventoryController.createItem);
router.put('/:id', InventoryController.updateItem);
router.delete('/:id', InventoryController.deleteItem);

router.get('/movements', InventoryController.getMovements);
router.post('/movement', InventoryController.addMovement);

export default router;
