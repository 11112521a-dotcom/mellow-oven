
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

async function debugProductInsert() {
    console.log('--- Debugging Product Insertion ---');

    // 1. Check if 'variants' column exists by selecting it
    console.log('1. Checking for "variants" column...');
    const { data: checkData, error: checkError } = await supabase.from('products').select('variants').limit(1);

    if (checkError) {
        console.log('❌ Error selecting variants column:', checkError.message);
        console.log('   (This likely means the column does NOT exist)');
    } else {
        console.log('✅ "variants" column appears to exist.');
    }

    // 2. Try to insert a product WITH variants
    console.log('\n2. Attempting to insert product WITH variants...');
    const testProduct = {
        name: 'Debug Product ' + Date.now(),
        category: 'Debug',
        price: 100,
        cost: 50,
        variants: [{ name: 'V1', price: 10, cost: 5 }]
    };

    const { data, error } = await supabase.from('products').insert(testProduct).select();

    if (error) {
        console.error('❌ Insert FAILED:', error.message);
        console.error('   Error Details:', error);
    } else {
        console.log('✅ Insert SUCCESS!');
        console.log('   Inserted Data:', data);

        // Cleanup
        if (data && data[0]) {
            await supabase.from('products').delete().eq('id', data[0].id);
            console.log('   (Cleaned up test data)');
        }
    }
}

debugProductInsert();
