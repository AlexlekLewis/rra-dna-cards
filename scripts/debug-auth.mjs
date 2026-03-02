import { createClient } from '@supabase/supabase-js';

const sb = createClient(
    'https://pudldzgmluwoocwxtzhw.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1ZGxkemdtbHV3b29jd3h0emh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0MTA0OTQsImV4cCI6MjA4NDk4NjQ5NH0.X-pDkxLGDGIpno_HVmPTURXf4IZ2jucZURXjj3si0gg'
);

// Test 1: RPC error shape
console.log('=== TEST 1: RPC call ===');
const { data: rpcData, error: rpcError } = await sb.rpc('lookup_member_for_login', { p_username: 'alex.lewis' });
console.log('RPC data:', JSON.stringify(rpcData));
console.log('RPC error:', JSON.stringify(rpcError));

// Test 2: Direct table query
console.log('\n=== TEST 2: Direct query ===');
const { data: directData, error: directError } = await sb
    .from('program_members')
    .select('auth_user_id, role, active')
    .eq('username', 'alex.lewis')
    .limit(1)
    .single();
console.log('Direct data:', JSON.stringify(directData));
console.log('Direct error:', JSON.stringify(directError));

// Test 3: Auth sign-in
if (directData) {
    console.log('\n=== TEST 3: Auth sign-in ===');
    const { data: authData, error: authError } = await sb.auth.signInWithPassword({
        email: 'alex.lewis@rra.internal',
        password: 'Royals1987!',
    });
    console.log('Auth user:', authData?.user?.id);
    console.log('Auth session:', !!authData?.session);
    console.log('Auth error:', JSON.stringify(authError));
    await sb.auth.signOut();
}
