import { TenantDbHelper } from '../../db/tenant-connection';
import { CreatePaymentMethodInput } from '@restaurant-saas/shared-schemas';

export class PaymentMethodService {
  static async getPaymentMethods(tenantDb: TenantDbHelper) {
    return await tenantDb(async (client) => {
      const res = await client.query(
        `SELECT id, name, code, linked_account_id, linked_account_name, is_active
         FROM payment_methods
         ORDER BY name ASC`
      );
      return res.rows;
    });
  }

  static async createPaymentMethod(tenantDb: TenantDbHelper, input: CreatePaymentMethodInput) {
    return await tenantDb(async (client) => {
      const accRes = await client.query(
        `SELECT name FROM ledger_accounts WHERE id = $1 LIMIT 1`,
        [input.linked_account_id]
      );
      const accountName = accRes.rows[0]?.name || 'Cash Register Float';
      const pmId = `pm-${Date.now()}`;
      const code = input.code.toLowerCase().replace(/\s+/g, '_');

      const res = await client.query(
        `INSERT INTO payment_methods (id, name, code, linked_account_id, linked_account_name, is_active)
         VALUES ($1, $2, $3, $4, $5, true)
         RETURNING id, name, code, linked_account_id, linked_account_name, is_active`,
        [pmId, input.name, code, input.linked_account_id, accountName]
      );
      return res.rows[0];
    });
  }

  static async updatePaymentMethod(tenantDb: TenantDbHelper, id: string, input: any) {
    return await tenantDb(async (client) => {
      let accountName = undefined;
      if (input.linked_account_id) {
        const accRes = await client.query(
          `SELECT name FROM ledger_accounts WHERE id = $1 LIMIT 1`,
          [input.linked_account_id]
        );
        accountName = accRes.rows[0]?.name;
      }

      const res = await client.query(
        `UPDATE payment_methods
         SET name = COALESCE($1, name),
             code = COALESCE($2, code),
             linked_account_id = COALESCE($3, linked_account_id),
             linked_account_name = COALESCE($4, linked_account_name),
             is_active = COALESCE($5, is_active)
         WHERE id = $6
         RETURNING id, name, code, linked_account_id, linked_account_name, is_active`,
        [input.name, input.code ? input.code.toLowerCase().replace(/\s+/g, '_') : undefined, input.linked_account_id, accountName, input.is_active, id]
      );
      return res.rows[0] || null;
    });
  }

  static async deletePaymentMethod(tenantDb: TenantDbHelper, id: string) {
    return await tenantDb(async (client) => {
      const res = await client.query(`DELETE FROM payment_methods WHERE id = $1 RETURNING id`, [id]);
      return res.rowCount ? res.rowCount > 0 : false;
    });
  }
}
