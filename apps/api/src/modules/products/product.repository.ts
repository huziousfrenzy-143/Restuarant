import { PoolClient } from 'pg';
import { Product, ProductCategory } from '@restaurant-saas/shared-schemas';

export class ProductRepository {
  private static async ensureSchema(client: PoolClient) {
    await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT`).catch(() => {});
    await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS variants JSONB DEFAULT '[]'::jsonb`).catch(() => {});
  }

  static async findAllProducts(client: PoolClient): Promise<Product[]> {
    await this.ensureSchema(client);
    const res = await client.query(
      `SELECT id, category_id, category_name, name, price, cost_price, sku, is_available, image_url, recipe, variants
       FROM products
       ORDER BY name ASC`
    );
    return res.rows;
  }

  static async findAllCategories(client: PoolClient): Promise<ProductCategory[]> {
    const res = await client.query(
      `SELECT id, name, sort_order
       FROM product_categories
       ORDER BY sort_order ASC, name ASC`
    );
    return res.rows;
  }

  static async createProduct(client: PoolClient, input: any): Promise<Product> {
    await this.ensureSchema(client);
    const catRes = await client.query(
      `SELECT name FROM product_categories WHERE id = $1 LIMIT 1`,
      [input.category_id]
    );
    const categoryName = catRes.rows[0]?.name || 'General';
    const newId = `prod-${Date.now()}`;
    const recipeJson = JSON.stringify(input.recipe || []);
    const variantsJson = JSON.stringify(input.variants || []);

    const res = await client.query(
      `INSERT INTO products (id, category_id, category_name, name, price, cost_price, sku, is_available, image_url, recipe, variants)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb)
       RETURNING id, category_id, category_name, name, price, cost_price, sku, is_available, image_url, recipe, variants`,
      [newId, input.category_id, categoryName, input.name, input.price, input.cost_price, input.sku, input.is_available !== false, input.image_url || null, recipeJson, variantsJson]
    );
    return res.rows[0];
  }

  static async updateProduct(client: PoolClient, id: string, input: any): Promise<Product | null> {
    await this.ensureSchema(client);
    let categoryName = undefined;
    if (input.category_id) {
      const catRes = await client.query(
        `SELECT name FROM product_categories WHERE id = $1 LIMIT 1`,
        [input.category_id]
      );
      categoryName = catRes.rows[0]?.name;
    }

    const recipeJson = input.recipe !== undefined ? JSON.stringify(input.recipe) : undefined;
    const variantsJson = input.variants !== undefined ? JSON.stringify(input.variants) : undefined;

    const res = await client.query(
      `UPDATE products
       SET name = COALESCE($1, name),
           category_id = COALESCE($2, category_id),
           category_name = COALESCE($3, category_name),
           price = COALESCE($4, price),
           cost_price = COALESCE($5, cost_price),
           sku = COALESCE($6, sku),
           is_available = COALESCE($7, is_available),
           image_url = COALESCE($8, image_url),
           recipe = COALESCE($9::jsonb, recipe),
           variants = COALESCE($10::jsonb, variants)
       WHERE id = $11
       RETURNING id, category_id, category_name, name, price, cost_price, sku, is_available, image_url, recipe, variants`,
      [input.name, input.category_id, categoryName, input.price, input.cost_price, input.sku, input.is_available, input.image_url, recipeJson, variantsJson, id]
    );
    return res.rows[0] || null;
  }

  static async deleteProduct(client: PoolClient, id: string): Promise<boolean> {
    const res = await client.query(`DELETE FROM products WHERE id = $1 RETURNING id`, [id]);
    return res.rowCount ? res.rowCount > 0 : false;
  }

  static async createCategory(client: PoolClient, input: any): Promise<ProductCategory> {
    const newId = `cat-${Date.now()}`;
    const res = await client.query(
      `INSERT INTO product_categories (id, name, sort_order)
       VALUES ($1, $2, $3)
       RETURNING id, name, sort_order`,
      [newId, input.name, input.sort_order || 1]
    );
    return res.rows[0];
  }

  static async updateCategory(client: PoolClient, id: string, input: any): Promise<ProductCategory | null> {
    const res = await client.query(
      `UPDATE product_categories
       SET name = COALESCE($1, name),
           sort_order = COALESCE($2, sort_order)
       WHERE id = $3
       RETURNING id, name, sort_order`,
      [input.name, input.sort_order, id]
    );
    if (res.rows[0] && input.name) {
      await client.query(`UPDATE products SET category_name = $1 WHERE category_id = $2`, [input.name, id]);
    }
    return res.rows[0] || null;
  }

  static async deleteCategory(client: PoolClient, id: string): Promise<boolean> {
    const res = await client.query(`DELETE FROM product_categories WHERE id = $1 RETURNING id`, [id]);
    return res.rowCount ? res.rowCount > 0 : false;
  }
}
