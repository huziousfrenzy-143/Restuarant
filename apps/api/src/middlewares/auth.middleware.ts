import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    name: string;
    email: string;
    org_id: string;
    role: string;
  };
}

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-saas-jwt-key-2026';

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  let token: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies && (req.cookies.org_admin_token || req.cookies.super_admin_token || req.cookies.token)) {
    token = req.cookies.org_admin_token || req.cookies.super_admin_token || req.cookies.token;
  } else if (req.headers.cookie) {
    const rawCookies = req.headers.cookie.split(';');
    for (const c of rawCookies) {
      const [k, v] = c.trim().split('=');
      if (k === 'org_admin_token' || k === 'super_admin_token' || k === 'token') {
        token = decodeURIComponent(v);
        break;
      }
    }
  }

  if (!token) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication token required. Please sign in.'
      }
    });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired authentication token'
      }
    });
  }
}

export function requireRole(...allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. Role '${req.user.role}' is not authorized to perform this operation. Required role(s): ${allowedRoles.join(', ')}`
        }
      });
    }

    next();
  };
}
