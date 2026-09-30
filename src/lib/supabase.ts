import { createClient } from '@supabase/supabase-js';

const getEnv = (key: string): string => {
  if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env[key]) {
    return (import.meta as any).env[key];
  }
  const proc = (globalThis as any).process;
  if (proc && proc.env && proc.env[key]) {
    return proc.env[key] || '';
  }
  return '';
};

const rawUrl = getEnv('VITE_SUPABASE_URL');
const rawKey = getEnv('VITE_SUPABASE_ANON_KEY');

// Clean up URL in case user copied the REST endpoint (/rest/v1/) instead of base URL
export const supabaseUrl = rawUrl
  ? rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '')
  : '';

export const supabaseAnonKey = rawKey;

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith('http') && 
  !supabaseUrl.includes('your-project-id')
);

// Fallback dummy URL to prevent createClient crashes if env is empty
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient('https://placeholder.supabase.co', 'placeholder-key');
