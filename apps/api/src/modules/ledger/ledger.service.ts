import { LedgerRepository } from './ledger.repository';
import { TenantDbHelper } from '../../db/tenant-connection';

export class LedgerService {
  static async getAccounts(tenantDb: TenantDbHelper) {
    return await tenantDb(async (client) => LedgerRepository.findAccounts(client));
  }

  static async getEntries(tenantDb: TenantDbHelper) {
    return await tenantDb(async (client) => LedgerRepository.findEntries(client));
  }

  static async createAccount(tenantDb: TenantDbHelper, input: { name: string; type: string; balance?: number }) {
    return await tenantDb(async (client) => LedgerRepository.createAccount(client, input));
  }

  static async updateAccount(tenantDb: TenantDbHelper, id: string, input: { name?: string; type?: string }) {
    return await tenantDb(async (client) => LedgerRepository.updateAccount(client, id, input));
  }

  static async deleteAccount(tenantDb: TenantDbHelper, id: string) {
    return await tenantDb(async (client) => LedgerRepository.deleteAccount(client, id));
  }

  static async createManualEntry(
    tenantDb: TenantDbHelper,
    debitAccountId: string,
    creditAccountId: string,
    amount: number,
    description: string,
    referenceId?: string
  ) {
    return await tenantDb(async (client) =>
      LedgerRepository.createManualEntry(client, debitAccountId, creditAccountId, amount, description, referenceId)
    );
  }
}
