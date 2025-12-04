
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase URL or Key in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDb() {
    console.log("Checking DB connection and schema...");

    const testId = 'test-' + Date.now();
    const testProduct = {
        id: testId,
        name: 'Test Product',
        price: 10,
        cost: 5,
        category: 'Test',
        variants: [{ id: 'v1', name: 'Variant 1', price: 10, cost: 5 }]
    };

    console.log("Attempting to insert product with variants:", JSON.stringify(testProduct, null, 2));

    const { data, error } = await supabase.from('products').insert(testProduct).select();

    if (error) {
        console.error("❌ Insert failed:", error);
        if (error.message.includes('column "variants" of relation "products" does not exist')) {
            console.log("⚠️ DIAGNOSIS: The 'variants' column is missing from the 'products' table.");
        }
    } else {
        console.log("✅ Insert successful!", data);
        // Cleanup
        await supabase.from('products').delete().eq('id', testId);
    }
}

checkDb();
