import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
    console.log('Reading add_market_ids_to_products.sql...');
    const sqlPath = path.resolve(__dirname, '../add_market_ids_to_products.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Sending SQL query to Supabase exec_sql RPC...');
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
        console.error('❌ Failed to run migration via RPC:', error.message);
        console.log('\n--- MANUAL ACTION REQUIRED ---');
        console.log('Please copy the content of "add_market_ids_to_products.sql" and run it in the Supabase SQL Editor.');
        console.log('------------------------------\n');
        process.exit(1);
    } else {
        console.log('✅ Migration ran successfully via RPC!');
        process.exit(0);
    }
}

runMigration();
