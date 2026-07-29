import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';
import { pgPool } from '../db/pg.client';
import { withTenantConnection, TenantDbHelper } from '../db/tenant-connection';

export interface TenantRequest extends AuthenticatedRequest {
  tenantSchema?: string;
  tenantDb?: TenantDbHelper;
  org?: any;
}

// In-memory cache for organization metadata (orgId -> { org, expiresAt })
const orgCache = new Map<string, { org: any; cachedAt: number }>();
const CACHE_TTL_MS = 60 * 1000; // 1 minute cache

export async function tenantMiddleware(req: TenantRequest, res: Response, next: NextFunction) {
  const requestedOrgId = req.params.orgId || req.user?.org_id || 'org-1';

  let org: any = null;
  const cached = orgCache.get(requestedOrgId);

  if (cached && (Date.now() - cached.cachedAt) < CACHE_TTL_MS) {
    org = cached.org;
  } else {
    try {
      const dbRes = await pgPool.query(
        `SELECT id, name, slug, schema_name, subscription_status, subscription_expires_at, plan_type, address, phone, created_at, is_active
         FROM public.organizations
         WHERE id = $1 OR slug = $1 LIMIT 1`,
        [requestedOrgId]
      );

      if (dbRes.rows.length > 0) {
        org = dbRes.rows[0];
        orgCache.set(requestedOrgId, { org, cachedAt: Date.now() });
      }
    } catch (err: any) {
      console.error(`[TenantMiddleware Error] Failed to query organization '${requestedOrgId}':`, err.message);
    }
  }

  if (!org) {
    return res.status(404).json({
      error: {
        code: 'TENANT_NOT_FOUND',
        message: `Organization identifier '${requestedOrgId}' not found`
      }
    });
  }

  if (!org.is_active) {
    return res.status(403).json({
      error: {
        code: 'TENANT_SUSPENDED',
        message: `Organization '${org.name}' is currently suspended. Please contact Super Admin.`
      }
    });
  }

  req.org = org;
  req.tenantSchema = org.schema_name;
  req.tenantDb = <T>(fn: (client: any) => Promise<T>) => withTenantConnection(org.schema_name, fn);

  next();
}

export function subscriptionMiddleware(req: TenantRequest, res: Response, next: NextFunction) {
  if (req.method === 'GET') {
    return next();
  }

  const org = req.org;
  if (!org) {
    return next();
  }

  const isExpired = org.subscription_status === 'expired' || 
    (new Date(org.subscription_expires_at).getTime() < Date.now());

  if (isExpired) {
    return res.status(402).json({
      error: {
        code: 'SUBSCRIPTION_EXPIRED',
        message: `Organization subscription for ${org.name} expired on ${new Date(org.subscription_expires_at).toLocaleDateString()}. Please contact support to extend.`
      }
    });
  }

  next();
}
