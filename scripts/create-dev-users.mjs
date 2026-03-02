import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pudldzgmluwoocwxtzhw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1ZGxkemdtbHV3b29jd3h0emh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0MTA0OTQsImV4cCI6MjA4NDk4NjQ5NH0.X-pDkxLGDGIpno_HVmPTURXf4IZ2jucZURXjj3si0gg';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
    // 1. Get program_members columns
    console.log('═══ program_members schema ═══');
    const { data: cols, error: colErr } = await supabase
        .from('program_members')
        .select('*')
        .limit(1);
    if (colErr) {
        console.log(`Error: ${colErr.message}`);
    } else if (cols && cols.length > 0) {
        console.log('Columns:', Object.keys(cols[0]).join(', '));
        console.log('Sample row:', JSON.stringify(cols[0], null, 2));
    } else {
        console.log('Empty table. Checking column names from error...');
        // Try selecting specific known columns
        const { data: d2, error: e2 } = await supabase
            .from('program_members')
            .select('username, role, active, email, auth_user_id')
            .limit(5);
        if (e2) {
            console.log(`Columns query error: ${e2.message}`);
        } else {
            console.log('Found columns work: username, role, active, email, auth_user_id');
            console.log('Rows:', JSON.stringify(d2, null, 2));
        }
    }

    // 2. Try creating a user with a valid email format
    console.log('\n═══ Creating dev coach user ═══');
    const email = 'devcoach@rra.internal';
    const password = 'DevCoach2026!';

    // Try signUp with emailConfirm disabled (requires admin to have disabled confirm)
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
            emailRedirectTo: undefined,
            data: { full_name: 'Dev Coach' },
        },
    });

    console.log('SignUp result:', JSON.stringify({
        user: signUpData?.user?.id,
        session: !!signUpData?.session,
        error: signUpError?.message
    }, null, 2));

    // 3. Try using a different email format
    console.log('\n═══ Trying alternative email ═══');
    const altEmail = 'devcoach+test@gmail.com';
    const { data: alt, error: altErr } = await supabase.auth.signUp({
        email: altEmail,
        password,
    });
    console.log('Alt result:', JSON.stringify({
        user: alt?.user?.id,
        session: !!alt?.session,
        confirmed: alt?.user?.confirmed_at,
        error: altErr?.message
    }, null, 2));

    if (alt?.user?.id) {
        // Try inserting program_members
        const { error: pmErr } = await supabase
            .from('program_members')
            .insert({
                username: 'devcoach',
                email: altEmail,
                role: 'coach',
                active: true,
                auth_user_id: alt.user.id,
            });
        console.log('program_members insert:', pmErr ? pmErr.message : '✓ OK');

        // Try user_profiles
        const { error: upErr } = await supabase
            .from('user_profiles')
            .upsert({
                id: alt.user.id,
                email: altEmail,
                role: 'coach',
                updated_at: new Date().toISOString(),
            }, { onConflict: 'id' });
        console.log('user_profiles upsert:', upErr ? upErr.message : '✓ OK');
    }

    await supabase.auth.signOut();
}

main().catch(console.error);
