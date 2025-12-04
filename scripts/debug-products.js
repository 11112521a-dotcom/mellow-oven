import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Missing Supabase Environment Variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugProductsTable() {
    console.log('--- Debugging Products Table ---');

    // 1. Try to fetch one product to see columns
    console.log('\n1. Fetching first product...');
    const { data: products, error: fetchError } = await supabase.from('products').select('*').limit(1);

    if (fetchError) {
        console.error('❌ Fetch Error:', fetchError);
    } else {
        console.log('✅ Fetch Success. Columns found:', products.length > 0 ? Object.keys(products[0]).join(', ') : 'No products found (Table exists but is empty)');
    }

    // 2. Try to insert a test product
    console.log('\n2. Attempting Test Insert...');
    const testProduct = {
        name: 'Debug Product ' + Date.now(),
        category: 'Debug',
        price: 100,
        cost: 50
    };

    const { data: insertData, error: insertError } = await supabase.from('products').insert(testProduct).select();

    if (insertError) {
        console.error('❌ Insert Error:', insertError);
        if (insertError.code === '42501') {
            console.error('   -> RLS Policy Violation! (Permission Denied)');
        }
    } else {
        console.log('✅ Insert Success:', insertData);

        // Clean up
        if (insertData && insertData[0]?.id) {
            console.log('   Cleaning up test product...');
            await supabase.from('products').delete().eq('id', insertData[0].id);
        }
    }
}

debugProductsTable();
