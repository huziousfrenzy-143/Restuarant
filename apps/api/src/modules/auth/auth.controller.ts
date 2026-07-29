import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { SendOtpInputSchema, VerifyOtpInputSchema, RefreshTokenInputSchema } from '@restaurant-saas/shared-schemas';

export class AuthController {
  // Super Admin Step 1: Request OTP
  static async requestSuperAdminOtp(req: Request, res: Response) {
    const parse = SendOtpInputSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Valid email and password are required' } });
    }

    const { email, password } = parse.data;
    const result = await AuthService.requestSuperAdminOtp(email, password);

    if (!result.success) {
      return res.status(401).json({ error: { code: 'AUTH_FAILED', message: result.message } });
    }

    res.json({ data: result });
  }

  // Super Admin Step 2: Verify OTP
  static async verifySuperAdminOtp(req: Request, res: Response) {
    const parse = VerifyOtpInputSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'OTP must be 6 digits' } });
    }

    const { email, otp } = parse.data;
    const result = await AuthService.verifySuperAdminOtp(email, otp);

    if (result.error) {
      return res.status(401).json({ error: { code: 'INVALID_OTP', message: result.error } });
    }

    res.json({ data: result });
  }

  // Staff Step 1: Request OTP
  static async requestOtp(req: Request, res: Response) {
    const parse = SendOtpInputSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Valid email and password are required' } });
    }

    const { email, password } = parse.data;
    const result = await AuthService.requestOtp(email, password);

    if (!result.success) {
      return res.status(401).json({ error: { code: 'AUTH_FAILED', message: result.message } });
    }

    res.json({ data: result });
  }

  // Staff Step 2: Verify OTP code and issue Access & Refresh tokens
  static async verifyOtp(req: Request, res: Response) {
    const parse = VerifyOtpInputSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'OTP must be 6 digits' } });
    }

    const { email, otp } = parse.data;
    const targetOrgId = req.body.targetOrgId;
    const result = await AuthService.verifyOtp(email, otp, targetOrgId);

    if (result.error) {
      return res.status(401).json({ error: { code: 'INVALID_OTP', message: result.error } });
    }

    res.json({ data: result });
  }

  // Direct Staff Login
  static async loginStaff(req: Request, res: Response) {
    const { email, targetOrgId } = req.body;
    if (!email) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Email address is required' } });
    }

    const result = await AuthService.loginStaff(email, targetOrgId);
    if (result.error) {
      return res.status(401).json({ error: { code: 'AUTH_FAILED', message: result.error } });
    }

    res.json({ data: result });
  }

  // Switch Active Organization for Multi-Tenant Workers
  static async switchOrganization(req: AuthenticatedRequest, res: Response) {
    const { targetOrgId } = req.body;
    const userEmail = req.user?.email;

    if (!targetOrgId || !userEmail) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'targetOrgId is required' } });
    }

    const result = await AuthService.switchOrganization(userEmail, targetOrgId);
    if (result.error) {
      return res.status(403).json({ error: { code: 'SWITCH_ORG_FAILED', message: result.error } });
    }

    res.json({ data: result });
  }

  // Change Password
  static async changePassword(req: AuthenticatedRequest, res: Response) {
    const { currentPassword, newPassword } = req.body;
    const userEmail = req.user?.email;

    if (!userEmail || !currentPassword || !newPassword) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Current password and new password are required' } });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'New password must be at least 6 characters long' } });
    }

    const result = await AuthService.changePassword(userEmail, currentPassword, newPassword);
    if (!result.success) {
      return res.status(400).json({ error: { code: 'PASSWORD_CHANGE_FAILED', message: result.message } });
    }

    res.json({ message: result.message });
  }

  // Refresh Token
  static refreshToken(req: Request, res: Response) {
    const parse = RefreshTokenInputSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: { code: 'INVALID_TOKEN', message: 'Refresh token required' } });
    }

    const tokens = AuthService.refreshAccessToken(parse.data.refreshToken);
    if (!tokens) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid or expired refresh token' } });
    }

    res.json({ data: tokens });
  }

  static async getProfile(req: AuthenticatedRequest, res: Response) {
    const userId = req.user?.id || 'usr-owner-1';
    const orgId = req.user?.org_id || 'org-1';
    const email = req.user?.email;
    const data = await AuthService.getProfile(userId, orgId, email);
    res.json({ data });
  }
}
