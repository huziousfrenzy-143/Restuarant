import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import authRoutes from './modules/auth/auth.routes';
import organizationRoutes from './modules/organizations/organization.routes';
import tenantSettingsRoutes from './modules/organizations/tenant-settings.routes';
import productRoutes from './modules/products/product.routes';
import inventoryRoutes from './modules/inventory/inventory.routes';
import orderRoutes from './modules/orders/order.routes';
import saleRoutes from './modules/sales/sale.routes';
import ledgerRoutes from './modules/ledger/ledger.routes';
import clientRoutes from './modules/clients/client.routes';
import taskRoutes from './modules/tasks/task.routes';
import auditLogRoutes from './modules/audit-log/audit-log.routes';
import userRoutes from './modules/users/user.routes';
import paymentMethodRoutes from './modules/payment-methods/payment-method.routes';
import uploadRoutes from './modules/upload/upload.routes';

import { authMiddleware } from './middlewares/auth.middleware';
import { tenantMiddleware, subscriptionMiddleware } from './middlewares/tenant.middleware';
import { initPgDatabase } from './db/pg.client';

const app = express();
const PORT = process.env.PORT || 4000;

// CORS Preflight & Headers Configuration
const corsOptions = {
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-Org-Id']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(helmet({ crossOriginResourcePolicy: false }));

// Support base64 image uploads up to 10MB
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

// ----------------------------------------------------
// PUBLIC & PLATFORM ROUTES
// ----------------------------------------------------
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/organizations', organizationRoutes);
app.use('/api/v1', uploadRoutes);

// ----------------------------------------------------
// TENANT ROUTED FEATURE MODULES (Pattern: /api/v1/:orgId/<feature>)
// ----------------------------------------------------
app.use('/api/v1/:orgId/settings', authMiddleware, tenantMiddleware, subscriptionMiddleware, tenantSettingsRoutes);
app.use('/api/v1/:orgId/users', authMiddleware, tenantMiddleware, subscriptionMiddleware, userRoutes);
app.use('/api/v1/:orgId', authMiddleware, tenantMiddleware, subscriptionMiddleware, productRoutes);
app.use('/api/v1/:orgId/inventory', authMiddleware, tenantMiddleware, subscriptionMiddleware, inventoryRoutes);
app.use('/api/v1/:orgId/orders', authMiddleware, tenantMiddleware, subscriptionMiddleware, orderRoutes);
app.use('/api/v1/:orgId/sales', authMiddleware, tenantMiddleware, subscriptionMiddleware, saleRoutes);
app.use('/api/v1/:orgId/payment-methods', authMiddleware, tenantMiddleware, subscriptionMiddleware, paymentMethodRoutes);
app.use('/api/v1/:orgId/ledger', authMiddleware, tenantMiddleware, subscriptionMiddleware, ledgerRoutes);
app.use('/api/v1/:orgId/clients', authMiddleware, tenantMiddleware, subscriptionMiddleware, clientRoutes);
app.use('/api/v1/:orgId/tasks', authMiddleware, tenantMiddleware, subscriptionMiddleware, taskRoutes);
app.use('/api/v1/:orgId/audit-log', authMiddleware, tenantMiddleware, subscriptionMiddleware, auditLogRoutes);

// Instant Server Boot (Database connection initialized without loading full data upfront)
async function startServer() {
  await initPgDatabase();

  app.listen(PORT, () => {
    console.log(`[Restaurant SaaS Modular API] Server active on http://localhost:${PORT}`);
    console.log(`[Cloudinary Integration] Cloud name: ${process.env.CLOUDINARY_CLOUD_NAME || 'dvucauhqo'}`);
  });
}

startServer();
