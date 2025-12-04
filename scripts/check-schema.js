import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkSchema() {
    console.log('Checking products table schema...');

    // Try to select the 'variants' column
    const { data, error } = await supabase.from('products').select('variants').limit(1);

    if (error) {
        console.error('❌ Error selecting variants column:', error.message);
        if (error.message.includes('does not exist')) {
            console.log('   -> CONFIRMED: The "variants" column is MISSING.');
        }
    } else {
        console.log('✅ Success! The "variants" column EXISTS.');
    }
}

checkSchema();
