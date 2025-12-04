import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkRLS() {
    console.log('Checking RLS on products table...');

    // We can't directly query pg_tables via Supabase client easily without RPC.
    // Instead, we'll try an ANONYMOUS insert/select.

    // 1. Try Select
    const { data, error } = await supabase.from('products').select('*').limit(1);

    if (error) {
        console.log('Select Error:', error.message);
        console.log('RLS might be blocking access.');
    } else {
        console.log('Select Success. (RLS allows read or is disabled)');
    }

    // 2. Try Insert
    const testProduct = {
        name: 'RLS Check ' + Date.now(),
        category: 'Debug',
        price: 10,
        cost: 5
    };

    const { data: insertData, error: insertError } = await supabase.from('products').insert(testProduct).select();

    if (insertError) {
        console.log('Insert Error:', insertError.message);
        if (insertError.code === '42501') {
            console.log('❌ RLS POLICY VIOLATION: Permission denied for insert.');
        }
    } else {
        console.log('✅ Insert Success. (RLS allows write or is disabled)');
        // Cleanup
        if (insertData && insertData[0]) {
            await supabase.from('products').delete().eq('id', insertData[0].id);
        }
    }
}

checkRLS();
