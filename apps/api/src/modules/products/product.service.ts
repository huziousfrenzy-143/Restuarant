import { ProductRepository } from './product.repository';
import { CreateProductInput, CreateCategoryInput } from '@restaurant-saas/shared-schemas';
import { TenantDbHelper } from '../../db/tenant-connection';

export class ProductService {
  static async getProducts(tenantDb: TenantDbHelper) {
    return await tenantDb(async (client) => ProductRepository.findAllProducts(client));
  }

  static async getCategories(tenantDb: TenantDbHelper) {
    return await tenantDb(async (client) => ProductRepository.findAllCategories(client));
  }

  static async createProduct(tenantDb: TenantDbHelper, input: CreateProductInput) {
    return await tenantDb(async (client) => ProductRepository.createProduct(client, input));
  }

  static async updateProduct(tenantDb: TenantDbHelper, id: string, input: any) {
    return await tenantDb(async (client) => ProductRepository.updateProduct(client, id, input));
  }

  static async deleteProduct(tenantDb: TenantDbHelper, id: string) {
    return await tenantDb(async (client) => ProductRepository.deleteProduct(client, id));
  }

  static async createCategory(tenantDb: TenantDbHelper, input: CreateCategoryInput) {
    return await tenantDb(async (client) => ProductRepository.createCategory(client, input));
  }

  static async updateCategory(tenantDb: TenantDbHelper, id: string, input: any) {
    return await tenantDb(async (client) => ProductRepository.updateCategory(client, id, input));
  }

  static async deleteCategory(tenantDb: TenantDbHelper, id: string) {
    return await tenantDb(async (client) => ProductRepository.deleteCategory(client, id));
  }
}
