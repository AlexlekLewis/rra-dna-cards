import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
const { data, error } = await supabase.rpc('execute_sql', { query: `ALTER TABLE trial_assessments ALTER COLUMN coach_id TYPE text;` });
console.log('Error?', error);
console.log('Data?', data);
