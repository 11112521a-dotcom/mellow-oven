
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTableTypes(tableName) {
    console.log(`\nChecking table: ${tableName}`);
    // We can't easily get types via select, but we can try to insert a dummy record with a bad ID and see the error,
    // or just try to fetch one and see the ID format.

    const { data, error } = await supabase.from(tableName).select('id').limit(1);

    if (error) {
        console.error(`Error fetching ${tableName}:`, error.message);
        return;
    }

    if (data && data.length > 0) {
        console.log(`Sample ID from ${tableName}:`, data[0].id);
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data[0].id);
        console.log(`Is UUID? ${isUUID}`);
    } else {
        console.log(`Table ${tableName} is empty. Cannot determine ID type from data.`);
        // Try to insert a non-UUID ID and see if it fails
        const testId = 'not-a-uuid-' + Date.now();
        const { error: insertError } = await supabase.from(tableName).insert({ id: testId }).select();

        if (insertError) {
            console.log(`Insert result with string ID: Error - ${insertError.message}`);
            if (insertError.message.includes('invalid input syntax for type uuid')) {
                console.log('CONCLUSION: Table requires UUID.');
            }
        } else {
            console.log('CONCLUSION: Table accepts String IDs.');
            // Cleanup
            await supabase.from(tableName).delete().eq('id', testId);
        }
    }
}

async function run() {
    await checkTableTypes('daily_sales_reports');
    await checkTableTypes('product_sales');
    await checkTableTypes('transactions');
    await checkTableTypes('unallocated_profits');
}

run();
