import { PoolClient } from 'pg';
import { LedgerAccount, LedgerEntry } from '@restaurant-saas/shared-schemas';

export class LedgerRepository {
  static async findAccounts(client: PoolClient): Promise<LedgerAccount[]> {
    const res = await client.query(
      `SELECT id, name, type, balance
       FROM ledger_accounts
       ORDER BY name ASC`
    );
    return res.rows;
  }

  static async findEntries(client: PoolClient): Promise<LedgerEntry[]> {
    const res = await client.query(
      `SELECT id, account_id, account_name, debit, credit, reference_type, reference_id, description, created_at
       FROM ledger_entries
       ORDER BY created_at DESC`
    );
    return res.rows;
  }

  static async createAccount(client: PoolClient, input: { name: string; type: string; balance?: number }): Promise<LedgerAccount> {
    const newId = `leg-${Date.now()}`;
    const res = await client.query(
      `INSERT INTO ledger_accounts (id, name, type, balance)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, type, balance`,
      [newId, input.name, input.type, input.balance || 0]
    );
    return res.rows[0];
  }

  static async updateAccount(client: PoolClient, id: string, input: { name?: string; type?: string }): Promise<LedgerAccount | null> {
    const res = await client.query(
      `UPDATE ledger_accounts
       SET name = COALESCE($1, name),
           type = COALESCE($2, type)
       WHERE id = $3
       RETURNING id, name, type, balance`,
      [input.name, input.type, id]
    );
    if (res.rows[0] && input.name) {
      await client.query(`UPDATE payment_methods SET linked_account_name = $1 WHERE linked_account_id = $2`, [input.name, id]);
    }
    return res.rows[0] || null;
  }

  static async deleteAccount(client: PoolClient, id: string): Promise<boolean> {
    const res = await client.query(`DELETE FROM ledger_accounts WHERE id = $1 RETURNING id`, [id]);
    return res.rowCount ? res.rowCount > 0 : false;
  }

  static async createManualEntry(
    client: PoolClient,
    debitAccountId: string,
    creditAccountId: string,
    amount: number,
    description: string,
    referenceId?: string
  ): Promise<{ debitEntry: LedgerEntry; creditEntry: LedgerEntry }> {
    // 1. Fetch Account Details
    const dRes = await client.query(`SELECT id, name FROM ledger_accounts WHERE id = $1 LIMIT 1`, [debitAccountId]);
    const cRes = await client.query(`SELECT id, name FROM ledger_accounts WHERE id = $1 LIMIT 1`, [creditAccountId]);

    const debitAcc = dRes.rows[0];
    const creditAcc = cRes.rows[0];

    if (!debitAcc || !creditAcc) {
      throw new Error('Debit or Credit ledger account not found');
    }

    const refId = referenceId || `man-${Date.now()}`;

    // 2. Update Balances
    await client.query(`UPDATE ledger_accounts SET balance = balance + $1 WHERE id = $2`, [amount, debitAccountId]);
    await client.query(`UPDATE ledger_accounts SET balance = balance - $1 WHERE id = $2`, [amount, creditAccountId]);

    // 3. Create Debit Entry
    const dEntRes = await client.query(
      `INSERT INTO ledger_entries (id, account_id, account_name, debit, credit, reference_type, reference_id, description, created_at)
       VALUES ($1, $2, $3, $4, 0, 'manual_journal', $5, $6, NOW())
       RETURNING id, account_id, account_name, debit, credit, reference_type, reference_id, description, created_at`,
      [`ent-d-${Date.now()}`, debitAcc.id, debitAcc.name, amount, refId, description]
    );

    // 4. Create Credit Entry
    const cEntRes = await client.query(
      `INSERT INTO ledger_entries (id, account_id, account_name, debit, credit, reference_type, reference_id, description, created_at)
       VALUES ($1, $2, $3, 0, $4, 'manual_journal', $5, $6, NOW())
       RETURNING id, account_id, account_name, debit, credit, reference_type, reference_id, description, created_at`,
      [`ent-c-${Date.now()}`, creditAcc.id, creditAcc.name, amount, refId, description]
    );

    return { debitEntry: dEntRes.rows[0], creditEntry: cEntRes.rows[0] };
  }
}
