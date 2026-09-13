-- ============================================================================
-- Restaurant SaaS — Root Database Seed Script
-- Populates root super admin account in public.super_admin_users
-- ============================================================================

INSERT INTO public.super_admin_users (id, name, email, password_hash)
VALUES
('usr-super-admin', 'Super Admin Operator', 'huziouzfrenzy@gmail.com', '11be4f46ffea4a56a698cebcfbbca9ad3108c4eeb2ea24eec3bf5c4d054e70e9a11756543b5cecf3ab3eb04d2be7d47ec57dcead22a0a2df3aa8d4512e0220d9')
ON CONFLICT (id) DO UPDATE SET password_hash = EXCLUDED.password_hash, email = EXCLUDED.email;
