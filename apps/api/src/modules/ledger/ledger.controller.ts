import { Response } from 'express';
import { LedgerService } from './ledger.service';
import { TenantRequest } from '../../middlewares/tenant.middleware';

export class LedgerController {
  static async getAccounts(req: TenantRequest, res: Response) {
    if (!req.tenantDb) {
      return res.status(500).json({ error: { code: 'TENANT_DB_UNAVAILABLE', message: 'Tenant database connection not initialized' } });
    }
    const data = await LedgerService.getAccounts(req.tenantDb);
    res.json({ data });
  }

  static async getEntries(req: TenantRequest, res: Response) {
    if (!req.tenantDb) {
      return res.status(500).json({ error: { code: 'TENANT_DB_UNAVAILABLE', message: 'Tenant database connection not initialized' } });
    }
    const data = await LedgerService.getEntries(req.tenantDb);
    res.json({ data });
  }

  static async createAccount(req: TenantRequest, res: Response) {
    const { name, type, balance } = req.body;
    if (!name || !type) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Account name and type required' } });
    }

    if (!req.tenantDb) {
      return res.status(500).json({ error: { code: 'TENANT_DB_UNAVAILABLE', message: 'Tenant database connection not initialized' } });
    }

    const acc = await LedgerService.createAccount(req.tenantDb, { name, type, balance: Number(balance) || 0 });
    res.status(201).json({ data: acc, message: `General ledger register '${acc.name}' created` });
  }

  static async updateAccount(req: TenantRequest, res: Response) {
    if (!req.tenantDb) {
      return res.status(500).json({ error: { code: 'TENANT_DB_UNAVAILABLE', message: 'Tenant database connection not initialized' } });
    }

    const updated = await LedgerService.updateAccount(req.tenantDb, req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ledger account not found' } });
    }
    res.json({ data: updated, message: `Ledger account '${updated.name}' updated` });
  }

  static async deleteAccount(req: TenantRequest, res: Response) {
    if (!req.tenantDb) {
      return res.status(500).json({ error: { code: 'TENANT_DB_UNAVAILABLE', message: 'Tenant database connection not initialized' } });
    }

    const success = await LedgerService.deleteAccount(req.tenantDb, req.params.id);
    if (!success) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ledger account not found' } });
    }
    res.json({ message: 'Ledger account register deleted successfully' });
  }

  static async createManualEntry(req: TenantRequest, res: Response) {
    const { debit_account_id, credit_account_id, amount, description, reference_id } = req.body;
    if (!debit_account_id || !credit_account_id || !amount) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Debit account, credit account, and amount are required' } });
    }

    if (!req.tenantDb) {
      return res.status(500).json({ error: { code: 'TENANT_DB_UNAVAILABLE', message: 'Tenant database connection not initialized' } });
    }

    try {
      const result = await LedgerService.createManualEntry(
        req.tenantDb,
        debit_account_id,
        credit_account_id,
        Number(amount),
        description || 'Manual Journal Entry',
        reference_id
      );
      res.status(201).json({ data: result, message: 'Double-entry journal entry recorded in general ledger' });
    } catch (err: any) {
      res.status(400).json({ error: { code: 'JOURNAL_ENTRY_ERROR', message: err.message } });
    }
  }
}
