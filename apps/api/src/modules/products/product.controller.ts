import { Response } from 'express';
import { ProductService } from './product.service';
import { CreateProductInputSchema, CreateCategoryInputSchema } from '@restaurant-saas/shared-schemas';
import { TenantRequest } from '../../middlewares/tenant.middleware';

export class ProductController {
  static async getProducts(req: TenantRequest, res: Response) {
    if (!req.tenantDb) {
      return res.status(500).json({ error: { code: 'TENANT_DB_UNAVAILABLE', message: 'Tenant database connection not initialized' } });
    }
    const data = await ProductService.getProducts(req.tenantDb);
    res.json({ data });
  }

  static async getCategories(req: TenantRequest, res: Response) {
    if (!req.tenantDb) {
      return res.status(500).json({ error: { code: 'TENANT_DB_UNAVAILABLE', message: 'Tenant database connection not initialized' } });
    }
    const data = await ProductService.getCategories(req.tenantDb);
    res.json({ data });
  }

  static async createProduct(req: TenantRequest, res: Response) {
    const parse = CreateProductInputSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid product payload', details: parse.error.format() } });
    }

    if (!req.tenantDb) {
      return res.status(500).json({ error: { code: 'TENANT_DB_UNAVAILABLE', message: 'Tenant database connection not initialized' } });
    }

    const product = await ProductService.createProduct(req.tenantDb, parse.data);
    res.status(201).json({ data: product, message: `Menu dish '${product.name}' created successfully` });
  }

  static async updateProduct(req: TenantRequest, res: Response) {
    if (!req.tenantDb) {
      return res.status(500).json({ error: { code: 'TENANT_DB_UNAVAILABLE', message: 'Tenant database connection not initialized' } });
    }

    const updated = await ProductService.updateProduct(req.tenantDb, req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Product not found' } });
    }
    res.json({ data: updated, message: `Product '${updated.name}' updated successfully` });
  }

  static async deleteProduct(req: TenantRequest, res: Response) {
    if (!req.tenantDb) {
      return res.status(500).json({ error: { code: 'TENANT_DB_UNAVAILABLE', message: 'Tenant database connection not initialized' } });
    }

    const success = await ProductService.deleteProduct(req.tenantDb, req.params.id);
    if (!success) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Product not found' } });
    }
    res.json({ message: 'Product deleted successfully' });
  }

  static async createCategory(req: TenantRequest, res: Response) {
    const parse = CreateCategoryInputSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid category payload', details: parse.error.format() } });
    }

    if (!req.tenantDb) {
      return res.status(500).json({ error: { code: 'TENANT_DB_UNAVAILABLE', message: 'Tenant database connection not initialized' } });
    }

    const category = await ProductService.createCategory(req.tenantDb, parse.data);
    res.status(201).json({ data: category, message: `Menu category '${category.name}' created` });
  }

  static async updateCategory(req: TenantRequest, res: Response) {
    if (!req.tenantDb) {
      return res.status(500).json({ error: { code: 'TENANT_DB_UNAVAILABLE', message: 'Tenant database connection not initialized' } });
    }

    const updated = await ProductService.updateCategory(req.tenantDb, req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Category not found' } });
    }
    res.json({ data: updated, message: `Category '${updated.name}' updated successfully` });
  }

  static async deleteCategory(req: TenantRequest, res: Response) {
    if (!req.tenantDb) {
      return res.status(500).json({ error: { code: 'TENANT_DB_UNAVAILABLE', message: 'Tenant database connection not initialized' } });
    }

    const success = await ProductService.deleteCategory(req.tenantDb, req.params.id);
    if (!success) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Category not found' } });
    }
    res.json({ message: 'Category deleted successfully' });
  }
}
