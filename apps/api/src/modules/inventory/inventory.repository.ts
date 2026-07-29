import { PoolClient } from 'pg';
import { InventoryItem, InventoryMovement } from '@restaurant-saas/shared-schemas';

export class InventoryRepository {
  static async findAll(client: PoolClient): Promise<InventoryItem[]> {
    const res = await client.query(
      `SELECT id, name, unit, current_qty, reorder_level, unit_cost, status
       FROM inventory_items
       ORDER BY name ASC`
    );
    return res.rows;
  }

  static async findById(client: PoolClient, id: string): Promise<InventoryItem | undefined> {
    const res = await client.query(
      `SELECT id, name, unit, current_qty, reorder_level, unit_cost, status
       FROM inventory_items
       WHERE id = $1 LIMIT 1`,
      [id]
    );
    return res.rows[0];
  }

  static async findMovements(client: PoolClient): Promise<InventoryMovement[]> {
    const res = await client.query(
      `SELECT id, item_id, item_name, type, qty, reference_id, created_by, created_at
       FROM inventory_movements
       ORDER BY created_at DESC`
    );
    return res.rows;
  }

  static async createItem(client: PoolClient, input: any): Promise<InventoryItem> {
    const status = input.current_qty <= 0 ? 'out_of_stock' : input.current_qty <= input.reorder_level ? 'low_stock' : 'in_stock';
    const newId = `inv-${Date.now()}`;

    const res = await client.query(
      `INSERT INTO inventory_items (id, name, unit, current_qty, reorder_level, unit_cost, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, unit, current_qty, reorder_level, unit_cost, status`,
      [newId, input.name, input.unit, input.current_qty, input.reorder_level, input.unit_cost, status]
    );
    return res.rows[0];
  }

  static async updateItem(client: PoolClient, id: string, input: any): Promise<InventoryItem | null> {
    const currentItem = await this.findById(client, id);
    if (!currentItem) return null;

    const newQty = input.current_qty !== undefined ? Number(input.current_qty) : Number(currentItem.current_qty);
    const newReorder = input.reorder_level !== undefined ? Number(input.reorder_level) : Number(currentItem.reorder_level);
    const status = newQty <= 0 ? 'out_of_stock' : newQty <= newReorder ? 'low_stock' : 'in_stock';

    const res = await client.query(
      `UPDATE inventory_items
       SET name = COALESCE($1, name),
           unit = COALESCE($2, unit),
           current_qty = $3,
           reorder_level = $4,
           unit_cost = COALESCE($5, unit_cost),
           status = $6
       WHERE id = $7
       RETURNING id, name, unit, current_qty, reorder_level, unit_cost, status`,
      [input.name, input.unit, newQty, newReorder, input.unit_cost, status, id]
    );
    return res.rows[0] || null;
  }

  static async deleteItem(client: PoolClient, id: string): Promise<boolean> {
    const res = await client.query(`DELETE FROM inventory_items WHERE id = $1 RETURNING id`, [id]);
    return res.rowCount ? res.rowCount > 0 : false;
  }

  static async recordMovement(
    client: PoolClient,
    itemId: string,
    type: 'purchase' | 'sale_deduction' | 'wastage' | 'adjustment',
    qty: number,
    createdBy: string,
    referenceId?: string
  ): Promise<{ item: InventoryItem; movement: InventoryMovement } | null> {
    const item = await this.findById(client, itemId);
    if (!item) return null;

    const newQty = Number(item.current_qty) + Number(qty);
    const newStatus = newQty <= 0 ? 'out_of_stock' : newQty <= item.reorder_level ? 'low_stock' : 'in_stock';

    const updateRes = await client.query(
      `UPDATE inventory_items
       SET current_qty = $1, status = $2
       WHERE id = $3
       RETURNING id, name, unit, current_qty, reorder_level, unit_cost, status`,
      [newQty, newStatus, itemId]
    );

    const movId = `mov-${Date.now()}`;
    const movRes = await client.query(
      `INSERT INTO inventory_movements (id, item_id, item_name, type, qty, reference_id, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING id, item_id, item_name, type, qty, reference_id, created_by, created_at`,
      [movId, item.id, item.name, type, qty, referenceId || null, createdBy]
    );

    return { item: updateRes.rows[0], movement: movRes.rows[0] };
  }
}
