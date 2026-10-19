-- ====================================================================
-- KRETZ PLATFORM - EXECUTIVE ADMIN SECURITY & RLS SCHEMA MIGRATION
-- ====================================================================
-- Enforces Row Level Security (RLS), role-based access control (RBAC),
-- and prevents privilege escalation on administrative operations.

-- 1. Create Profiles Table Linked to auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'investor' CHECK (role IN ('investor', 'admin', 'super_admin')),
  account_type TEXT DEFAULT 'individual_investor',
  kyc_status TEXT DEFAULT 'unverified',
  mfa_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies for Profiles
-- Policy A: Users can view their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Policy B: Administrators can view all profiles
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

-- Policy C: Only Administrators can update user profiles & roles (Prevents Privilege Escalation)
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

-- Policy D: Users can update non-critical attributes on their own profile (excluding role)
DROP POLICY IF EXISTS "Users can update own basic profile" ON public.profiles;
CREATE POLICY "Users can update own basic profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    -- Ensure role attribute is NOT changed by non-admins
    role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  );

-- 4. Secure Automatic User Creation Trigger
-- Assigns 'admin' role ONLY to authorized executive domain emails
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  assigned_role TEXT;
BEGIN
  -- Restrict admin role assignment to official executive emails only
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
    role = CASE WHEN public.profiles.role = 'admin' THEN 'admin' ELSE EXCLUDED.role END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-attach Trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
