import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';

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

import { authMiddleware, requireRole } from './middlewares/auth.middleware';
import { tenantMiddleware, subscriptionMiddleware } from './middlewares/tenant.middleware';
import { initPgDatabase } from './db/pg.client';

const app = express();
const PORT = process.env.PORT || 4000;

// CORS Preflight & Headers Configuration for Org Admin, Super Admin & Mobile Apps
const allowedOrigins = [
  process.env.ORG_ADMIN_URL || 'https://restuarants-org-admin.vercel.app',
  process.env.SUPER_ADMIN_URL || 'https://restuarants-super-admin.vercel.app',
  'https://restuarants-org-admin.vercel.app',
  'https://restuarants-super-admin.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:8081',
  'http://localhost:19006'
];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like Expo, React Native, Mobile Apps, cURL, Postman)
    if (!origin || origin === 'null') {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app') || origin.includes('localhost')) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-Org-Id']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(compression());

// Support base64 image uploads up to 10MB
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ----------------------------------------------------
// SYSTEM HEALTHCHECK & ROOT ENDPOINTS (Instant Response < 5ms)
// ----------------------------------------------------
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    system: 'Restaurant SaaS Multi-Tenant API Server',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get(['/health', '/api/health', '/api/v1/health'], (req, res) => {
  res.json({ status: 'ok', system: 'online', time: new Date().toISOString() });
});

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
app.use('/api/v1/:orgId/settings', authMiddleware, tenantMiddleware, subscriptionMiddleware, requireRole('admin', 'owner'), tenantSettingsRoutes);
app.use('/api/v1/:orgId/users', authMiddleware, tenantMiddleware, subscriptionMiddleware, requireRole('admin', 'owner'), userRoutes);
app.use('/api/v1/:orgId', authMiddleware, tenantMiddleware, subscriptionMiddleware, productRoutes);
app.use('/api/v1/:orgId/inventory', authMiddleware, tenantMiddleware, subscriptionMiddleware, inventoryRoutes);
app.use('/api/v1/:orgId/orders', authMiddleware, tenantMiddleware, subscriptionMiddleware, orderRoutes);
app.use('/api/v1/:orgId/sales', authMiddleware, tenantMiddleware, subscriptionMiddleware, saleRoutes);
app.use('/api/v1/:orgId/payment-methods', authMiddleware, tenantMiddleware, subscriptionMiddleware, paymentMethodRoutes);
app.use('/api/v1/:orgId/ledger', authMiddleware, tenantMiddleware, subscriptionMiddleware, requireRole('admin', 'owner'), ledgerRoutes);
app.use('/api/v1/:orgId/clients', authMiddleware, tenantMiddleware, subscriptionMiddleware, clientRoutes);
app.use('/api/v1/:orgId/tasks', authMiddleware, tenantMiddleware, subscriptionMiddleware, taskRoutes);
app.use('/api/v1/:orgId/audit-log', authMiddleware, tenantMiddleware, subscriptionMiddleware, requireRole('admin', 'owner'), auditLogRoutes);

// Lazy database initialization middleware for Vercel serverless cold-starts
let isDbInitStarted = false;
app.use(async (req, res, next) => {
  if (!isDbInitStarted) {
    isDbInitStarted = true;
    initPgDatabase().catch(err => {
      console.warn('[Vercel DB Init Warning]:', err?.message);
    });
  }
  next();
});

// URL Path Normalizer & Trailing Slash/Backslash Safety
app.use((req, res, next) => {
  try {
    if (req.url && req.url.length > 1 && (req.url.endsWith('/') || req.url.endsWith('\\'))) {
      req.url = req.url.replace(/[/\\]+$/, '');
      if (req.url === '') req.url = '/';
    }
    next();
  } catch (_) {
    next();
  }
});

// 404 Fallback Handler with logging for Vercel routing debugging
app.use((req, res) => {
  console.log(`[API 404 Not Found] Method: ${req.method} | Path: ${req.path} | OriginalUrl: ${req.originalUrl}`);
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.originalUrl || req.path}`,
      path: req.originalUrl || req.path
    }
  });
});

// Global Express Error Handler (Prevents serverless function invocation 500 crashes)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[API Error]:', err?.message || 'Server Error');
  if (res.headersSent) {
    return next(err);
  }
  res.status(err?.status || 500).json({
    error: {
      code: err?.code || 'INTERNAL_SERVER_ERROR',
      message: err?.message || 'An unexpected server error occurred',
      path: req.originalUrl || req.path
    }
  });
});

// Standalone Server Boot for Local/Docker environment
if (!process.env.VERCEL) {
  initPgDatabase().then(() => {
    app.listen(PORT, () => {
      console.log(`[Restaurant SaaS Modular API] Server active on http://localhost:${PORT}`);
      console.log(`[Cloudinary Integration] Cloud name: ${process.env.CLOUDINARY_CLOUD_NAME || 'dvucauhqo'}`);
    });
  });
}

export default app;
module.exports = app;
