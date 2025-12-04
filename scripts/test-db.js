import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Missing Supabase Environment Variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
    console.log('Testing Supabase connection...');
    const { data, error } = await supabase.from('ingredients').select('count', { count: 'exact', head: true });

    if (error) {
        console.error('Connection failed:', error.message);
        process.exit(1);
    } else {
        console.log('Connection successful!');
        console.log(`Found ${data} ingredients (head count, might be null if just checking connection).`);
        // Try fetching one item to be sure
        const { data: items, error: fetchError } = await supabase.from('ingredients').select('*').limit(1);
        if (fetchError) {
            console.error('Fetch failed:', fetchError.message);
        } else {
            console.log('Successfully fetched 1 ingredient:', items.length > 0 ? items[0].name : 'No ingredients found');
        }
    }
}

testConnection();
