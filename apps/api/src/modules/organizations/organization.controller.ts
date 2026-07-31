import { Request, Response } from 'express';
import { OrganizationService } from './organization.service';
import { CreateOrganizationInputSchema, UpdateOrganizationInputSchema, ExtendSubscriptionInputSchema } from '@restaurant-saas/shared-schemas';

export class OrganizationController {
  static async getAll(req: Request, res: Response) {
    const data = await OrganizationService.getAllOrganizations();
    res.json({ data });
  }

  static async getById(req: Request, res: Response) {
    const org = await OrganizationService.getOrganizationById(req.params.id);
    if (!org) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Organization not found' } });
    }
    res.json({ data: org });
  }

  static async create(req: Request, res: Response) {
    const parseResult = CreateOrganizationInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parseResult.error.format() } });
    }

    const result = await OrganizationService.createOrganization(parseResult.data);
    res.status(201).json({
      data: result.org,
      tempOwnerPassword: result.tempOwnerPassword,
      message: `Tenant Organization '${result.org.name}' provisioned. Dedicated schema '${result.org.schema_name}' migrated and onboarding email sent to ${parseResult.data.owner_email}.`
    });
  }

  static async update(req: Request, res: Response) {
    const parseResult = UpdateOrganizationInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid update payload', details: parseResult.error.format() } });
    }

    const updated = await OrganizationService.updateOrganization(req.params.id, parseResult.data);
    if (!updated) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Organization not found' } });
    }

    res.json({ data: updated, message: 'Organization details updated' });
  }

  static async toggleStatus(req: Request, res: Response) {
    const { is_active } = req.body;
    const updated = await OrganizationService.toggleOrganizationStatus(req.params.id, Boolean(is_active));
    if (!updated) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Organization not found' } });
    }
    res.json({ data: updated, message: `Organization ${updated.is_active ? 'activated' : 'suspended'}` });
  }

  static async extendSubscription(req: Request, res: Response) {
    const parseResult = ExtendSubscriptionInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parseResult.error.format() } });
    }

    const { org_id, extension_type, custom_expires_at } = parseResult.data;
    const updated = await OrganizationService.extendSubscription(org_id, extension_type, custom_expires_at);

    if (!updated) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Organization not found' } });
    }

    res.json({ data: updated, message: 'Subscription successfully extended' });
  }

  static async delete(req: Request, res: Response) {
    const success = await OrganizationService.deleteOrganization(req.params.id);
    if (!success) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Organization not found or already deleted' } });
    }
    res.json({ message: 'Organization permanently removed' });
  }
}
