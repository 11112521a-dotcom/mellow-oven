import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase Environment Variables');
}

export const supabase = createClient(supabaseUrl || '', supabaseKey || '');

// ============================================================
// 🛡️ fetchAllRows: ป้องกัน Supabase default 1000-row cap
// ============================================================
// Supabase PostgREST จะตัด response ที่เกิน 1000 rows โดยอัตโนมัติ
// ทำให้ข้อมูลเก่าหาย และหน้ารายงานแสดงผลผิด
//
// ฟังก์ชันนี้ดึงข้อมูลทีละ page (1000 rows) วนจนครบ 100%
// ไม่ว่าจะมีข้อมูลกี่แสนแถวก็ไม่มีทางพลาด
//
// @param tableName - ชื่อตาราง Supabase
// @param options   - orderBy, direction, filters (optional)
// @returns         - array ข้อมูลทั้งหมดในตาราง
// ============================================================
const PAGE_SIZE = 1000;

export async function fetchAllRows<T>(
    tableName: string,
    options?: {
        orderBy?: string;
        ascending?: boolean;
        filters?: (query: ReturnType<typeof supabase.from>) => ReturnType<typeof supabase.from>;
    }
): Promise<T[]> {
    const allRows: T[] = [];
    let page = 0;

    while (true) {
        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let query: any = supabase.from(tableName).select('*').range(from, to);

        if (options?.orderBy) {
            query = query.order(options.orderBy, { ascending: options?.ascending ?? true });
        }
        if (options?.filters) {
            query = options.filters(query);
        }

        const { data, error } = await query;

        if (error) {
            console.error(`[fetchAllRows] Error fetching "${tableName}" page ${page}:`, error);
            break;
        }

        if (!data || data.length === 0) break;

        allRows.push(...(data as T[]));

        // ถ้าได้ข้อมูลน้อยกว่า PAGE_SIZE แปลว่าถึง page สุดท้ายแล้ว
        if (data.length < PAGE_SIZE) break;

        page++;
    }

    return allRows;
}

