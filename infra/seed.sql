-- ============================================================================
-- Restaurant SaaS — Root Database Seed Script
-- Populates root super admin account in public.super_admin_users
-- ============================================================================

INSERT INTO public.super_admin_users (id, name, email, password_hash)
VALUES
('usr-super-admin', 'Super Admin Operator', 'huziouzfrenzy@gmail.com', '4c9dd5571061a59cf3bb3317e71a24b620e2298271838edc39ae77a50b190d952b5ff08566793419df8d6edcd110fd0a0cc3f6da0b40817ce4bb86029c5f9869')
ON CONFLICT (id) DO UPDATE SET password_hash = EXCLUDED.password_hash, email = EXCLUDED.email;
