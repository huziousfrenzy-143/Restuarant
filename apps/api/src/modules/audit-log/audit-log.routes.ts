import { Router } from 'express';
import { authMiddleware, requireRole } from '../../middlewares/auth.middleware';
import { pgPool } from '../../db/pg.client';

const router = Router({ mergeParams: true });

router.get('/', authMiddleware, requireRole('super_admin', 'owner', 'admin'), async (req, res) => {
  try {
    const orgId = req.params.orgId;
    const dbRes = await pgPool.query(
      `SELECT id, user_id, user_name, action, entity, entity_id, details, created_at
       FROM public.platform_audit_log
       WHERE entity_id = $1 OR details->>'org_id' = $1 OR user_id = 'usr-super-admin'
       ORDER BY created_at DESC LIMIT 100`,
      [orgId]
    );
    res.json({ data: dbRes.rows });
  } catch (err: any) {
    res.json({ data: [] });
  }
});

export default router;
