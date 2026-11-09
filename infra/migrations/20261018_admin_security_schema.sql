-- ====================================================================
-- KRETZ PLATFORM - EXECUTIVE ADMIN SECURITY & RLS SCHEMA MIGRATION
-- ====================================================================
-- Enforces Row Level Security (RLS), role-based access control (RBAC),
-- and prevents privilege escalation on administrative operations.

-- 1. Create Profiles Table Linked to auth.users (if not exists)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'investor',
  account_type TEXT DEFAULT 'individual_investor',
  kyc_status TEXT DEFAULT 'unverified',
  mfa_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all columns exist even if table was previously created
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'investor';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'individual_investor';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS kyc_status TEXT DEFAULT 'unverified';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT FALSE;

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies for Profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE public.profiles.id = auth.uid()
      AND public.profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
CREATE POLICY "Admins can update profiles"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE public.profiles.id = auth.uid()
      AND public.profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can update own basic profile" ON public.profiles;
CREATE POLICY "Users can update own basic profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  );

-- 4. Secure Automatic User Creation Trigger for Admin & Investors
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  assigned_role TEXT;
BEGIN
  -- Restrict admin role assignment exclusively to authorized executive admin emails
  IF LOWER(NEW.email) = 'info@kretz.site' 
     OR LOWER(NEW.email) = 'admin@kretz.com' 
     OR LOWER(NEW.email) LIKE '%@kretz.site' THEN
    assigned_role := 'admin';
  ELSE
    assigned_role := 'investor';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role, account_type, kyc_status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
    assigned_role,
    CASE WHEN assigned_role = 'admin' THEN 'admin' ELSE 'individual_investor' END,
    CASE WHEN assigned_role = 'admin' THEN 'verified' ELSE 'unverified' END
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    role = CASE WHEN LOWER(EXCLUDED.email) IN ('info@kretz.site', 'admin@kretz.com') OR EXCLUDED.email LIKE '%@kretz.site' THEN 'admin' ELSE public.profiles.role END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-attach Trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Immediate Bootstrap: Promote existing admin accounts in auth.users if already registered
UPDATE public.profiles
SET role = 'admin', account_type = 'admin', kyc_status = 'verified'
WHERE LOWER(email) IN ('info@kretz.site', 'admin@kretz.com') OR email LIKE '%@kretz.site';
