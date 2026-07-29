import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';

const router = Router();

// Dedicated Super Admin Authentication Routes
router.post('/super-admin/request-otp', AuthController.requestSuperAdminOtp);
router.post('/super-admin/verify-otp', AuthController.verifySuperAdminOtp);

// Standard Tenant Staff Authentication Routes
router.post('/request-otp', AuthController.requestOtp);
router.post('/verify-otp', AuthController.verifyOtp);
router.post('/login', AuthController.loginStaff);
router.post('/switch-org', authMiddleware, AuthController.switchOrganization);
router.post('/refresh', AuthController.refreshToken);
router.post('/change-password', authMiddleware, AuthController.changePassword);
router.get('/me', authMiddleware, AuthController.getProfile);

export default router;
