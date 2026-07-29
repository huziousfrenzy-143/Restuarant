import { z } from 'zod';

// Roles & Permissions
export const UserRoleSchema = z.enum([
  'super_admin',
  'owner',
  'admin',
  'chef',
  'salesman',
  'delivery_boy'
]);
export type UserRole = z.infer<typeof UserRoleSchema>;

// Subscription status
export const SubscriptionStatusSchema = z.enum([
  'active',
  'expiring_soon',
  'expired',
  'trial'
]);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;

// Order status - matches Design System section 3
export const OrderStatusSchema = z.enum([
  'new',
  'preparing',
  'ready',
  'out_for_delivery',
  'completed',
  'cancelled'
]);
export type OrderStatus = z.infer<typeof OrderStatusSchema>;

// Inventory Status
export const InventoryStatusSchema = z.enum([
  'in_stock',
  'low_stock',
  'out_of_stock'
]);
export type InventoryStatus = z.infer<typeof InventoryStatusSchema>;

// Organization Schema
export const OrganizationSchema = z.object({
  id: z.string(),
  name: z.string().min(2, "Name required"),
  slug: z.string(),
  schema_name: z.string(),
  subscription_status: SubscriptionStatusSchema,
  subscription_expires_at: z.string(),
  plan_type: z.enum(['basic', 'pro', 'enterprise']),
  tax_rate: z.coerce.number().default(10),
  address: z.string(),
  phone: z.string(),
  created_at: z.string(),
  is_active: z.boolean()
});
export type Organization = z.infer<typeof OrganizationSchema>;

// Create Organization Schema (Super Admin)
export const CreateOrganizationInputSchema = z.object({
  name: z.string().min(2, "Restaurant name is required"),
  slug: z.string().min(2, "Slug is required"),
  plan_type: z.enum(['basic', 'pro', 'enterprise']).default('pro'),
  tax_rate: z.coerce.number().default(10),
  address: z.string().min(3, "Address required"),
  phone: z.string().min(5, "Phone required"),
  subscription_days: z.coerce.number().positive().default(30),
  owner_email: z.string().email("Valid owner email required"),
  owner_name: z.string().min(2, "Owner name required")
});
export type CreateOrganizationInput = z.infer<typeof CreateOrganizationInputSchema>;

// Update Organization Schema
export const UpdateOrganizationInputSchema = z.object({
  name: z.string().min(2).optional(),
  plan_type: z.enum(['basic', 'pro', 'enterprise']).optional(),
  tax_rate: z.coerce.number().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  is_active: z.boolean().optional()
});
export type UpdateOrganizationInput = z.infer<typeof UpdateOrganizationInputSchema>;

// User Schema & Create User
export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  phone: z.string(),
  role: UserRoleSchema,
  is_active: z.boolean(),
  created_at: z.string()
});
export type User = z.infer<typeof UserSchema>;

export const CreateUserInputSchema = z.object({
  name: z.string().min(2, "Name required"),
  email: z.string().email("Valid email required"),
  phone: z.string().min(5, "Phone required"),
  role: UserRoleSchema,
  password: z.string().min(6, "Password must be at least 6 characters")
});
export type CreateUserInput = z.infer<typeof CreateUserInputSchema>;

// Auth Inputs & OTP
export const LoginInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(4)
});
export type LoginInput = z.infer<typeof LoginInputSchema>;

export const SendOtpInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(4)
});
export type SendOtpInput = z.infer<typeof SendOtpInputSchema>;

export const VerifyOtpInputSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6, "OTP must be 6 digits")
});
export type VerifyOtpInput = z.infer<typeof VerifyOtpInputSchema>;

export const RefreshTokenInputSchema = z.object({
  refreshToken: z.string()
});
export type RefreshTokenInput = z.infer<typeof RefreshTokenInputSchema>;

// Product Category
export const ProductCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  sort_order: z.coerce.number().default(0)
});
export type ProductCategory = z.infer<typeof ProductCategorySchema>;

export const CreateCategoryInputSchema = z.object({
  name: z.string().min(2, "Category name required"),
  sort_order: z.coerce.number().default(0)
});
export type CreateCategoryInput = z.infer<typeof CreateCategoryInputSchema>;

// Product Recipe Item
export const ProductRecipeItemSchema = z.object({
  inventory_item_id: z.string(),
  inventory_item_name: z.string(),
  qty_required: z.coerce.number().positive(),
  unit: z.string()
});
export type ProductRecipeItem = z.infer<typeof ProductRecipeItemSchema>;

// Product Schema & Create Product
export const ProductSchema = z.object({
  id: z.string(),
  category_id: z.string(),
  category_name: z.string(),
  name: z.string(),
  price: z.coerce.number().nonnegative(),
  cost_price: z.coerce.number().nonnegative(),
  sku: z.string(),
  is_available: z.boolean(),
  image_url: z.string().optional(),
  recipe: z.array(ProductRecipeItemSchema).default([])
});
export type Product = z.infer<typeof ProductSchema>;

export const CreateProductInputSchema = z.object({
  category_id: z.string().min(1, "Category is required"),
  name: z.string().min(2, "Product name is required"),
  price: z.coerce.number().positive("Price must be positive"),
  cost_price: z.coerce.number().nonnegative("Cost price required"),
  sku: z.string().min(2, "SKU is required"),
  is_available: z.boolean().default(true),
  image_url: z.string().optional(),
  recipe: z.array(ProductRecipeItemSchema).default([])
});
export type CreateProductInput = z.infer<typeof CreateProductInputSchema>;

// Inventory Item Schema & Create Item
export const InventoryItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  unit: z.enum(['kg', 'g', 'l', 'ml', 'pcs', 'box', 'portion']),
  current_qty: z.coerce.number(),
  reorder_level: z.coerce.number(),
  unit_cost: z.coerce.number(),
  status: InventoryStatusSchema
});
export type InventoryItem = z.infer<typeof InventoryItemSchema>;

export const CreateInventoryItemInputSchema = z.object({
  name: z.string().min(2, "Ingredient name required"),
  unit: z.enum(['kg', 'g', 'l', 'ml', 'pcs', 'box', 'portion']),
  current_qty: z.coerce.number().nonnegative(),
  reorder_level: z.coerce.number().nonnegative(),
  unit_cost: z.coerce.number().nonnegative()
});
export type CreateInventoryItemInput = z.infer<typeof CreateInventoryItemInputSchema>;

// Inventory Movement
export const InventoryMovementSchema = z.object({
  id: z.string(),
  item_id: z.string(),
  item_name: z.string(),
  type: z.enum(['purchase', 'sale_deduction', 'wastage', 'adjustment']),
  qty: z.coerce.number(),
  reference_id: z.string().optional(),
  created_by: z.string(),
  created_at: z.string()
});
export type InventoryMovement = z.infer<typeof InventoryMovementSchema>;

// Client Schema & Create Client
export const ClientSchema = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string(),
  address: z.string().optional(),
  notes: z.string().optional(),
  credit_balance: z.coerce.number().default(0)
});
export type Client = z.infer<typeof ClientSchema>;

export const CreateClientInputSchema = z.object({
  name: z.string().min(2, "Client name required"),
  phone: z.string().min(5, "Phone number required"),
  address: z.string().optional(),
  notes: z.string().optional(),
  credit_balance: z.coerce.number().default(0)
});
export type CreateClientInput = z.infer<typeof CreateClientInputSchema>;

// Order Item
export const OrderItemSchema = z.object({
  id: z.string().optional(),
  product_id: z.string(),
  product_name: z.string(),
  qty: z.coerce.number().positive(),
  unit_price: z.coerce.number().nonnegative(),
  notes: z.string().optional()
});
export type OrderItem = z.infer<typeof OrderItemSchema>;

// Order Schema
export const OrderSchema = z.object({
  id: z.string(),
  order_number: z.string(),
  type: z.enum(['dine_in', 'takeaway', 'delivery']),
  status: OrderStatusSchema,
  table_no: z.string().optional(),
  client_id: z.string().optional(),
  client_name: z.string().optional(),
  delivery_boy_id: z.string().optional(),
  delivery_boy_name: z.string().optional(),
  items: z.array(OrderItemSchema),
  subtotal: z.coerce.number(),
  tax: z.coerce.number(),
  discount: z.coerce.number().default(0),
  total: z.coerce.number(),
  created_by: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  prep_time_mins: z.coerce.number().default(15),
  is_overdue: z.boolean().default(false)
});
export type Order = z.infer<typeof OrderSchema>;

export const CreateOrderInputSchema = z.object({
  type: z.enum(['dine_in', 'takeaway', 'delivery']),
  table_no: z.string().optional(),
  client_id: z.string().optional(),
  client_name: z.string().optional(),
  items: z.array(z.object({
    product_id: z.string(),
    product_name: z.string(),
    qty: z.coerce.number().positive(),
    unit_price: z.coerce.number().nonnegative(),
    notes: z.string().optional()
  })),
  subtotal: z.coerce.number(),
  tax: z.coerce.number(),
  discount: z.coerce.number().default(0),
  total: z.coerce.number(),
  prep_time_mins: z.coerce.number().default(15)
});
export type CreateOrderInput = z.infer<typeof CreateOrderInputSchema>;

export const UpdateOrderInputSchema = z.object({
  items: z.array(OrderItemSchema),
  table_no: z.string().optional(),
  type: z.enum(['dine_in', 'takeaway', 'delivery']).optional(),
  client_name: z.string().optional()
});
export type UpdateOrderInput = z.infer<typeof UpdateOrderInputSchema>;

// Custom Payment Method Schema
export const PaymentMethodSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
  linked_account_id: z.string(),
  linked_account_name: z.string(),
  is_active: z.boolean().default(true)
});
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;

export const CreatePaymentMethodInputSchema = z.object({
  name: z.string().min(2, "Payment method name required"),
  code: z.string().min(2, "Code required"),
  linked_account_id: z.string().min(1, "Linked ledger account required")
});
export type CreatePaymentMethodInput = z.infer<typeof CreatePaymentMethodInputSchema>;

// Sale Schema
export const SaleSchema = z.object({
  id: z.string(),
  order_id: z.string(),
  order_number: z.string(),
  payment_method: z.string(),
  payment_method_name: z.string().optional(),
  amount_paid: z.coerce.number(),
  amount_due: z.coerce.number(),
  paid_at: z.string(),
  cashier_id: z.string(),
  cashier_name: z.string()
});
export type Sale = z.infer<typeof SaleSchema>;

export const CreateSaleInputSchema = z.object({
  order_id: z.string(),
  order_number: z.string().optional(),
  payment_method: z.string(),
  amount_paid: z.coerce.number(),
  amount_due: z.coerce.number().default(0)
});
export type CreateSaleInput = z.infer<typeof CreateSaleInputSchema>;

// Ledger Account & Entry
export const LedgerAccountSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['cash', 'bank', 'receivable', 'payable', 'revenue', 'expense']),
  balance: z.coerce.number()
});
export type LedgerAccount = z.infer<typeof LedgerAccountSchema>;

export const LedgerEntrySchema = z.object({
  id: z.string(),
  account_id: z.string(),
  account_name: z.string(),
  debit: z.coerce.number().default(0),
  credit: z.coerce.number().default(0),
  reference_type: z.string(),
  reference_id: z.string(),
  description: z.string(),
  created_at: z.string()
});
export type LedgerEntry = z.infer<typeof LedgerEntrySchema>;

// Task Schema
export const TaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  assigned_to_id: z.string(),
  assigned_to_name: z.string(),
  status: z.enum(['pending', 'in_progress', 'done']),
  due_at: z.string(),
  created_by: z.string()
});
export type Task = z.infer<typeof TaskSchema>;

export const CreateTaskInputSchema = z.object({
  title: z.string().min(2, "Task title required"),
  description: z.string().optional(),
  assigned_to_id: z.string(),
  assigned_to_name: z.string(),
  due_at: z.string()
});
export type CreateTaskInput = z.infer<typeof CreateTaskInputSchema>;

// Audit Log Schema
export const AuditLogSchema = z.object({
  id: z.string(),
  org_id: z.string().optional(),
  user_id: z.string(),
  user_name: z.string(),
  action: z.string(),
  entity: z.string(),
  entity_id: z.string(),
  metadata: z.record(z.any()).optional(),
  created_at: z.string()
});
export type AuditLog = z.infer<typeof AuditLogSchema>;

// Subscription Extension Request Schema
export const ExtendSubscriptionInputSchema = z.object({
  org_id: z.string(),
  extension_type: z.enum(['one_month', 'three_months', 'custom_date']),
  custom_expires_at: z.string().optional()
});
export type ExtendSubscriptionInput = z.infer<typeof ExtendSubscriptionInputSchema>;
