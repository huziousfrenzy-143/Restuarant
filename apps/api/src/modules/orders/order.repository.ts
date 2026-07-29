import { PoolClient } from 'pg';
import { Order, OrderItem, OrderStatus } from '@restaurant-saas/shared-schemas';

export class OrderRepository {
  static async findAll(client: PoolClient): Promise<Order[]> {
    const res = await client.query(
      `SELECT id, order_number, type, status, table_no, client_id, client_name, items, subtotal, tax, discount, total, created_by, created_at, updated_at, prep_time_mins, is_overdue
       FROM orders
       ORDER BY created_at DESC`
    );
    return res.rows;
  }

  static async findById(client: PoolClient, id: string): Promise<Order | undefined> {
    const res = await client.query(
      `SELECT id, order_number, type, status, table_no, client_id, client_name, items, subtotal, tax, discount, total, created_by, created_at, updated_at, prep_time_mins, is_overdue
       FROM orders
       WHERE id = $1 LIMIT 1`,
      [id]
    );
    return res.rows[0];
  }

  static async getOrderCount(client: PoolClient): Promise<number> {
    const res = await client.query(`SELECT COUNT(*)::int as cnt FROM orders`);
    return res.rows[0]?.cnt || 0;
  }

  static async create(client: PoolClient, payload: any, createdBy: string): Promise<Order> {
    const count = (await this.getOrderCount(client)) + 101;
    const orderNumber = `#${count}`;
    const orderId = `ord-${Date.now()}`;
    const itemsJson = JSON.stringify(payload.items || []);

    const res = await client.query(
      `INSERT INTO orders
        (id, order_number, type, status, table_no, client_id, client_name, items, subtotal, tax, discount, total, created_by, created_at, updated_at, prep_time_mins, is_overdue)
       VALUES ($1, $2, $3, 'new', $4, $5, $6, $7::jsonb, $8, $9, $10, $11, $12, NOW(), NOW(), $13, false)
       RETURNING id, order_number, type, status, table_no, client_id, client_name, items, subtotal, tax, discount, total, created_by, created_at, updated_at, prep_time_mins, is_overdue`,
      [orderId, orderNumber, payload.type, payload.table_no || null, payload.client_id || null, payload.client_name || null, itemsJson, payload.subtotal, payload.tax, payload.discount || 0, payload.total, createdBy, payload.prep_time_mins || 15]
    );

    const createdOrder = res.rows[0];

    // Insert order items
    if (payload.items && Array.isArray(payload.items)) {
      for (const item of payload.items) {
        await client.query(
          `INSERT INTO order_items (id, order_id, product_id, product_name, qty, unit_price)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [`oi-${Date.now()}-${Math.floor(Math.random() * 1000)}`, orderId, item.product_id, item.product_name, item.qty, item.unit_price]
        );
      }
    }

    return createdOrder;
  }

  static async updateOrderItems(client: PoolClient, id: string, items: OrderItem[], subtotal: number, tax: number, total: number): Promise<Order | undefined> {
    const order = await this.findById(client, id);
    if (!order) return undefined;

    if (order.status === 'completed' || order.status === 'cancelled') {
      throw new Error(`Cannot modify order ${order.order_number} because it is already ${order.status}`);
    }

    const itemsJson = JSON.stringify(items);
    const res = await client.query(
      `UPDATE orders
       SET items = $1::jsonb, subtotal = $2, tax = $3, total = $4, updated_at = NOW()
       WHERE id = $5
       RETURNING id, order_number, type, status, table_no, client_id, client_name, items, subtotal, tax, discount, total, created_by, created_at, updated_at, prep_time_mins, is_overdue`,
      [itemsJson, subtotal, tax, total, id]
    );

    // Refresh order_items
    await client.query(`DELETE FROM order_items WHERE order_id = $1`, [id]);
    for (const item of items) {
      await client.query(
        `INSERT INTO order_items (id, order_id, product_id, product_name, qty, unit_price)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [`oi-${Date.now()}-${Math.floor(Math.random() * 1000)}`, id, item.product_id, item.product_name, item.qty, item.unit_price]
      );
    }

    return res.rows[0];
  }

  static async updateStatus(client: PoolClient, id: string, status: OrderStatus): Promise<Order | undefined> {
    const isOverdue = status === 'ready' || status === 'completed' ? false : undefined;
    const res = await client.query(
      `UPDATE orders
       SET status = $1,
           is_overdue = COALESCE($2, is_overdue),
           updated_at = NOW()
       WHERE id = $3
       RETURNING id, order_number, type, status, table_no, client_id, client_name, items, subtotal, tax, discount, total, created_by, created_at, updated_at, prep_time_mins, is_overdue`,
      [status, isOverdue, id]
    );
    return res.rows[0];
  }
}
