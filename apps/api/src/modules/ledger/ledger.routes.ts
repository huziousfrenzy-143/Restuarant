import { Router } from 'express';
import { LedgerController } from './ledger.controller';
import { requireRole } from '../../middlewares/auth.middleware';

const router = Router({ mergeParams: true });

// Financial General Ledger Access Restricted to Owner, Admin & Super Admin
router.use(requireRole('super_admin', 'owner', 'admin'));

router.get('/accounts', LedgerController.getAccounts);
router.post('/accounts', LedgerController.createAccount);
router.put('/accounts/:id', LedgerController.updateAccount);
router.delete('/accounts/:id', LedgerController.deleteAccount);

router.get('/entries', LedgerController.getEntries);
router.post('/entries', LedgerController.createManualEntry);

export default router;
