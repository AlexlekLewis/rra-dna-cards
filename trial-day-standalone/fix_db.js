const { Client } = require('pg');
require('dotenv').config();
const connectionString = process.env.VITE_SUPABASE_DATABASE_URL || "postgres://postgres.yvccqjofqgndpczklynd:RoyalsTrial26@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres";
const client = new Client({ connectionString });
async function run() {
    await client.connect();
    try {
       const res = await client.query(`ALTER TABLE public.trial_assessments ALTER COLUMN coach_id TYPE text;`);
       console.log("Success:", res);
    } catch(e){ console.error(e); }
    await client.end();
}
run();
