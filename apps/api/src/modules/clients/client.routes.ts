import { Router } from 'express';
import { ClientController } from './client.service';

const router = Router({ mergeParams: true });

router.get('/', ClientController.getClients);
router.post('/', ClientController.createClient);
router.put('/:id', ClientController.updateClient);
router.post('/:id/pay-credit', ClientController.payCredit);
router.delete('/:id', ClientController.deleteClient);

export default router;
