import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://pudldzgmluwoocwxtzhw.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1ZGxkemdtbHV3b29jd3h0emh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0MTA0OTQsImV4cCI6MjA4NDk4NjQ5NH0.X-pDkxLGDGIpno_HVmPTURXf4IZ2jucZURXjj3si0gg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

