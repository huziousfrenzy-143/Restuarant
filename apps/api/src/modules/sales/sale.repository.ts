import { PoolClient } from 'pg';
import { Sale } from '@restaurant-saas/shared-schemas';

export class SaleRepository {
  static async findAll(client: PoolClient): Promise<Sale[]> {
    const res = await client.query(
      `SELECT id, order_id, order_number, payment_method, payment_method_name, amount_paid, amount_due, paid_at, cashier_id, cashier_name
       FROM sales
       ORDER BY paid_at DESC`
    );
    return res.rows;
  }

  static async create(client: PoolClient, payload: any, cashierId: string, cashierName: string): Promise<Sale> {
    const pmCode = payload.payment_method || 'cash';

    const pmRes = await client.query(
      `SELECT name, linked_account_id, linked_account_name FROM payment_methods WHERE code = $1 OR LOWER(name) LIKE $2 LIMIT 1`,
      [pmCode, `%${pmCode.toLowerCase()}%`]
    );
    const pm = pmRes.rows[0];

    const pmName = pm ? pm.name : (pmCode === 'cash' ? 'Cash Register Float' : pmCode.toUpperCase());
    const linkedAccountId = pm ? pm.linked_account_id : null;

    const saleId = `sal-${Date.now()}`;
    const res = await client.query(
      `INSERT INTO sales (id, order_id, order_number, payment_method, payment_method_name, amount_paid, amount_due, paid_at, cashier_id, cashier_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, $9)
       RETURNING id, order_id, order_number, payment_method, payment_method_name, amount_paid, amount_due, paid_at, cashier_id, cashier_name`,
      [saleId, payload.order_id, payload.order_number || '#POS', pmCode, pmName, payload.amount_paid, payload.amount_due || 0, cashierId, cashierName]
    );

    const sale = res.rows[0];

    // AUTOMATIC LEDGER REGISTER UPDATES IN SAME TRANSACTION:
    const accRes = await client.query(
      `SELECT id, name, balance FROM ledger_accounts WHERE id = $1 OR type = 'cash' LIMIT 1`,
      [linkedAccountId]
    );
    const ledgerAcc = accRes.rows[0];

    if (ledgerAcc) {
      const newBal = Math.round((Number(ledgerAcc.balance) + payload.amount_paid) * 100) / 100;
      await client.query(
        `UPDATE ledger_accounts SET balance = $1 WHERE id = $2`,
        [newBal, ledgerAcc.id]
      );

      await client.query(
        `INSERT INTO ledger_entries (id, account_id, account_name, debit, credit, reference_type, reference_id, description, created_at)
         VALUES ($1, $2, $3, $4, 0, 'sale', $5, $6, NOW())`,
        [`ent-${Date.now()}-1`, ledgerAcc.id, ledgerAcc.name, payload.amount_paid, sale.order_number, `Order completion sale via ${pmName}`]
      );
    }

    // Revenue Account
    const revRes = await client.query(
      `SELECT id, name, balance FROM ledger_accounts WHERE type = 'revenue' LIMIT 1`
    );
    const revAcc = revRes.rows[0];

    if (revAcc) {
      const newBal = Math.round((Number(revAcc.balance) + payload.amount_paid) * 100) / 100;
      await client.query(
        `UPDATE ledger_accounts SET balance = $1 WHERE id = $2`,
        [newBal, revAcc.id]
      );

      await client.query(
        `INSERT INTO ledger_entries (id, account_id, account_name, debit, credit, reference_type, reference_id, description, created_at)
         VALUES ($1, $2, $3, 0, $4, 'sale', $5, $6, NOW())`,
        [`ent-${Date.now()}-2`, revAcc.id, revAcc.name, payload.amount_paid, sale.order_number, `Order completion revenue for ${sale.order_number}`]
      );
    }

    // If explicitly requested, update order status
    if (payload.mark_completed) {
      await client.query(
        `UPDATE orders SET status = 'completed', updated_at = NOW() WHERE id = $1`,
        [payload.order_id]
      );
    }

    return sale;
  }
}
