-- RLS FIX: Allow login flow and pre-auth data loading
-- Run in Supabase SQL Editor

-- ══════════════════════════════════════════════════════════════
-- FIX 1: Allow anon users to look up program_members for login
-- The signInWithUsername() function queries program_members BEFORE
-- the user is authenticated. We need a limited anon SELECT policy.
-- ══════════════════════════════════════════════════════════════

CREATE POLICY "Anon lookup for login" ON program_members
    FOR SELECT TO anon
    USING (true);

-- Members should also be able to read their own record
CREATE POLICY "Members read own record" ON program_members
    FOR SELECT TO authenticated
    USING (auth_user_id = auth.uid());


-- ══════════════════════════════════════════════════════════════
-- FIX 2: Allow anon users to read reference data
-- The app loads competition_tiers, vmcu_associations, vccl_regions,
-- engine_constants, etc. on mount BEFORE the user logs in.
-- These are read-only reference tables — safe for public read.
-- ══════════════════════════════════════════════════════════════

DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN 
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN (
            'competition_tiers', 'vmcu_associations', 'vccl_regions',
            'engine_constants', 'assessment_domains', 'domain_weights',
            'association_competitions', 'stat_benchmarks', 
            'stat_domain_weights', 'stat_sub_weights', 'skill_definitions',
            'eligibility_rules'
        )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Anon read reference data" ON %I', tbl);
        EXECUTE format('CREATE POLICY "Anon read reference data" ON %I FOR SELECT TO anon USING (true)', tbl);
    END LOOP;
END $$;


-- ══════════════════════════════════════════════════════════════
-- FIX 3: Allow upsert on user_profiles during auth
-- The upsertUserProfile() function runs immediately after login
-- to create/update the user's profile row. The current policy
-- only allows admin writes — users can't create their own profile.
-- ══════════════════════════════════════════════════════════════

CREATE POLICY "Users upsert own profile" ON user_profiles
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users update own profile" ON user_profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);
