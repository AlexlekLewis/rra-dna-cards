import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pudldzgmluwoocwxtzhw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1ZGxkemdtbHV3b29jd3h0emh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0MTA0OTQsImV4cCI6MjA4NDk4NjQ5NH0.X-pDkxLGDGIpno_HVmPTURXf4IZ2jucZURXjj3si0gg';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
    // Get ALL program_members
    const { data: members, error } = await supabase
        .from('program_members')
        .select('username, display_name, role, generated_password, active')
        .order('role');

    if (error) {
        console.log(`Error: ${error.message}`);
        return;
    }

    console.log(`Found ${members.length} members:\n`);

    const coaches = members.filter(m => m.role === 'coach');
    const admins = members.filter(m => m.role === 'admin' || m.role === 'super_admin');
    const players = members.filter(m => m.role === 'player');

    console.log('═══ ADMINS ═══');
    admins.forEach(m => console.log(`  ${m.username} (${m.display_name}) — ${m.role} — active:${m.active} — pw:${m.generated_password}`));

    console.log('\n═══ COACHES ═══');
    coaches.forEach(m => console.log(`  ${m.username} (${m.display_name}) — ${m.role} — active:${m.active} — pw:${m.generated_password}`));

    console.log('\n═══ PLAYERS ═══');
    players.forEach(m => console.log(`  ${m.username} (${m.display_name}) — ${m.role} — active:${m.active} — pw:${m.generated_password}`));
}

main().catch(console.error);
