import { Router, Response } from 'express';
import { OrganizationService } from './organization.service';
import { UpdateOrganizationInputSchema } from '@restaurant-saas/shared-schemas';
import { TenantRequest } from '../../middlewares/tenant.middleware';
import { requireRole } from '../../middlewares/auth.middleware';

const router = Router({ mergeParams: true });

router.put('/', requireRole('super_admin', 'owner', 'admin'), async (req: TenantRequest, res: Response) => {
  const parseResult = UpdateOrganizationInputSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid settings payload', details: parseResult.error.format() } });
  }

  const orgId = req.params.orgId;
  const updated = await OrganizationService.updateOrganization(orgId, parseResult.data);
  if (!updated) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Organization not found' } });
  }

  res.json({ data: updated, message: 'Restaurant settings updated successfully' });
});

export default router;
