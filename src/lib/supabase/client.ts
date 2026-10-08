import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rkljugrrscmqopeuwtpd.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJrbGp1Z3Jyc2NtcW9wZXV3dHBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0NTg2NzcsImV4cCI6MjEwNzAzNDY3N30.5ZGZjrPq8cCMBhX_pIuMOsFjq0H50JhhLHdIlmo5HQ0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
