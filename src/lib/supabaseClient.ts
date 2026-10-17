import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Read from Vite client-side environment variables
// Supports both VITE_SUPABASE_PUBLISHABLE_KEY and VITE_SUPABASE_ANON_KEY
const cleanEnvVal = (val: any): string => {
  if (!val) return '';
  return String(val).trim().replace(/^["']|["']$/g, '');
};

const rawUrl = cleanEnvVal(
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL
);

const rawKey = cleanEnvVal(
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export const isSupabaseConfigured = (): boolean => {
  if (!rawUrl || !rawKey) return false;
  if (
    rawUrl.includes('your-project') ||
    rawUrl.includes('MY_SUPABASE') ||
    rawKey.includes('your-anon') ||
    rawKey.includes('MY_KEY')
  ) {
    return false;
  }
  try {
    const parsed = new URL(rawUrl);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

// Safe fallback placeholder to avoid runtime crash on app initialization when keys are pending
const supabaseUrl = isSupabaseConfigured() ? rawUrl : 'https://placeholder.supabase.co';
const supabaseKey = isSupabaseConfigured() ? rawKey : 'placeholder-anon-key-unconfigured';

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
});

/**
 * Returns the recommended redirect URL for Supabase Auth flows
 * (Email verification confirmation, password recovery, magic links)
 */
export const getAuthRedirectUrl = (path: string = ''): string => {
  if (typeof window === 'undefined') return 'http://localhost:3000';
  const origin = window.location.origin;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${origin}${cleanPath}`;
};

/**
 * Known environment domains that should be registered in Supabase
 * Project Settings -> Authentication -> URL Configuration -> Redirect URLs
 */
export const ALLOWED_REDIRECT_DOMAINS = [
  'http://localhost:3000',
  'http://localhost:3000/#reset-password',
  'https://ais-dev-32px4qvn5mho5cjnbja4mq-596498626522.europe-west2.run.app',
  'https://ais-dev-32px4qvn5mho5cjnbja4mq-596498626522.europe-west2.run.app/#reset-password',
  'https://ais-pre-32px4qvn5mho5cjnbja4mq-596498626522.europe-west2.run.app',
  'https://ais-pre-32px4qvn5mho5cjnbja4mq-596498626522.europe-west2.run.app/#reset-password',
];
