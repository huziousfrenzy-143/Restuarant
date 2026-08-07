import { OrderRepository } from './order.repository';
import { OrderStatus, OrderItem } from '@restaurant-saas/shared-schemas';
import { TenantDbHelper } from '../../db/tenant-connection';
import { SaleRepository } from '../sales/sale.repository';
import { ClientRepository } from '../clients/client.service';

export class OrderService {
  static async getOrders(tenantDb: TenantDbHelper) {
    return await tenantDb(async (client) => OrderRepository.findAll(client));
  }

  static async createOrder(tenantDb: TenantDbHelper, payload: any, createdBy: string) {
    return await tenantDb(async (client) => {
      const order = await OrderRepository.create(client, payload, createdBy);

      // Recipe auto-deduction logic inside same PostgreSQL transaction
      if (order.items && Array.isArray(order.items)) {
        for (const item of order.items) {
          const prodRes = await client.query(
            `SELECT recipe FROM products WHERE id = $1 LIMIT 1`,
            [item.product_id]
          );
          const prod = prodRes.rows[0];
          if (prod && prod.recipe && Array.isArray(prod.recipe)) {
            for (const rec of prod.recipe) {
              const invRes = await client.query(
                `SELECT id, name, current_qty, reorder_level FROM inventory_items WHERE id = $1 LIMIT 1`,
                [rec.inventory_item_id]
              );
              const inv = invRes.rows[0];
              if (inv) {
                const deductedQty = -(rec.qty_required * item.qty);
                const newQty = Math.max(0, Number(inv.current_qty) + deductedQty);
                const newStatus = newQty <= 0 ? 'out_of_stock' : newQty <= inv.reorder_level ? 'low_stock' : 'in_stock';

                await client.query(
                  `UPDATE inventory_items SET current_qty = $1, status = $2 WHERE id = $3`,
                  [newQty, newStatus, inv.id]
                );

                await client.query(
                  `INSERT INTO inventory_movements (id, item_id, item_name, type, qty, reference_id, created_by, created_at)
                   VALUES ($1, $2, $3, 'sale_deduction', $4, $5, 'POS Auto-Deduct', NOW())`,
                  [`mov-${Date.now()}-${inv.id}`, inv.id, inv.name, deductedQty, order.order_number]
                );
              }
            }
          }
        }
      }

      return order;
    });
  }

  static async updateOrderItems(tenantDb: TenantDbHelper, orderId: string, items: OrderItem[]) {
    return await tenantDb(async (client) => {
      const subtotal = items.reduce((acc, it) => acc + (it.unit_price * it.qty), 0);
      const tax = Math.round(subtotal * 0.10 * 100) / 100;
      const total = Math.round((subtotal + tax) * 100) / 100;

      const updatedOrder = await OrderRepository.updateOrderItems(client, orderId, items, subtotal, tax, total);
      if (!updatedOrder) return undefined;

      // Adjust Sale record if sale exists
      const saleRes = await client.query(
        `SELECT id, order_id, order_number, payment_method, amount_paid FROM sales WHERE order_id = $1 LIMIT 1`,
        [orderId]
      );
      const sale = saleRes.rows[0];

      if (sale) {
        const priceDiff = Math.round((total - Number(sale.amount_paid)) * 100) / 100;
        await client.query(
          `UPDATE sales SET amount_paid = $1 WHERE id = $2`,
          [total, sale.id]
        );

        if (priceDiff !== 0) {
          const pmRes = await client.query(
            `SELECT linked_account_id FROM payment_methods WHERE code = $1 OR LOWER(name) LIKE $2 LIMIT 1`,
            [sale.payment_method, `%${sale.payment_method.toLowerCase()}%`]
          );
          const linkedAccountId = pmRes.rows[0]?.linked_account_id;

          const accRes = await client.query(
            `SELECT id, name, balance FROM ledger_accounts WHERE id = $1 OR type = 'cash' LIMIT 1`,
            [linkedAccountId]
          );
          const ledgerAcc = accRes.rows[0];

          if (ledgerAcc) {
            const newBal = Math.round((Number(ledgerAcc.balance) + priceDiff) * 100) / 100;
            await client.query(
              `UPDATE ledger_accounts SET balance = $1 WHERE id = $2`,
              [newBal, ledgerAcc.id]
            );

            await client.query(
              `INSERT INTO ledger_entries (id, account_id, account_name, debit, credit, reference_type, reference_id, description, created_at)
               VALUES ($1, $2, $3, $4, $5, 'sale_adjustment', $6, $7, NOW())`,
              [`ent-${Date.now()}-mod-1`, ledgerAcc.id, ledgerAcc.name, priceDiff > 0 ? priceDiff : 0, priceDiff < 0 ? Math.abs(priceDiff) : 0, sale.order_number, `Order ${sale.order_number} item modification adjustment (${priceDiff > 0 ? '+' : ''}${priceDiff})`]
            );
          }
        }
      }

      return updatedOrder;
    });
  }

  static async updateOrderStatus(tenantDb: TenantDbHelper, orderId: string, status: OrderStatus) {
    return await tenantDb(async (client) => OrderRepository.updateStatus(client, orderId, status));
  }

  static async checkout(tenantDb: TenantDbHelper, payload: any, createdBy: string, cashierName: string) {
    return await tenantDb(async (client) => {
      // 1. Create Order and handle inventory deduction (reusing the logic we already have in createOrder via OrderRepository)
      const order = await OrderRepository.create(client, payload, createdBy);

      // Recipe auto-deduction logic inside same PostgreSQL transaction
      if (order.items && Array.isArray(order.items)) {
        for (const item of order.items) {
          const prodRes = await client.query(
            `SELECT recipe FROM products WHERE id = $1 LIMIT 1`,
            [item.product_id]
          );
          const prod = prodRes.rows[0];
          if (prod && prod.recipe && Array.isArray(prod.recipe)) {
            for (const rec of prod.recipe) {
              const invRes = await client.query(
                `SELECT id, name, current_qty, reorder_level FROM inventory_items WHERE id = $1 LIMIT 1`,
                [rec.inventory_item_id]
              );
              const inv = invRes.rows[0];
              if (inv) {
                const deductedQty = -(rec.qty_required * item.qty);
                const newQty = Math.max(0, Number(inv.current_qty) + deductedQty);
                const newStatus = newQty <= 0 ? 'out_of_stock' : newQty <= inv.reorder_level ? 'low_stock' : 'in_stock';

                await client.query(
                  `UPDATE inventory_items SET current_qty = $1, status = $2 WHERE id = $3`,
                  [newQty, newStatus, inv.id]
                );

                await client.query(
                  `INSERT INTO inventory_movements (id, item_id, item_name, type, qty, reference_id, created_by, created_at)
                   VALUES ($1, $2, $3, 'sale_deduction', $4, $5, 'POS Auto-Deduct', NOW())`,
                  [`mov-${Date.now()}-${inv.id}`, inv.id, inv.name, deductedQty, order.order_number]
                );
              }
            }
          }
        }
      }

      // 2. Create Sale
      const salePayload = {
        order_id: order.id,
        payment_method: payload.payment_method,
        amount_paid: order.total,
        amount_due: 0
      };
      
      const sale = await SaleRepository.create(client, salePayload, createdBy, cashierName);

      // 3. Update Client Credit Balance if borrow_credit
      let updatedClient = null;
      if (payload.payment_method === 'borrow_credit' && payload.client_id) {
        // Fetch current client balance
        const cliRes = await client.query(`SELECT id, credit_balance FROM clients WHERE id = $1 LIMIT 1`, [payload.client_id]);
        const targetClient = cliRes.rows[0];
        
        if (targetClient) {
          const newBalance = Number(targetClient.credit_balance || 0) + Number(order.total);
          updatedClient = await ClientRepository.update(client, targetClient.id, { credit_balance: newBalance });
        }
      }

      return { order, sale, updatedClient };
    });
  }
}
