// ============================================================
// 📅 Thai Calendar - Holidays & Events for Demand Forecasting
// Includes Thai holidays, paydays, and special events
// ============================================================

export interface ThaiCalendarEvent {
    date: string;
    name: string;
    type: 'holiday' | 'festival' | 'payday' | 'long_weekend' | 'special';
    demandFactor: number; // Multiplier for demand (1.0 = normal)
    description?: string;
}

// Thai Holidays for 2025-2027
const THAI_HOLIDAYS: ThaiCalendarEvent[] = [
    // 2025
    { date: '2025-01-01', name: 'วันขึ้นปีใหม่', type: 'holiday', demandFactor: 0.4 }, // Holiday = Bad
    { date: '2025-02-14', name: 'วันวาเลนไทน์', type: 'special', demandFactor: 1.5 },
    { date: '2025-02-26', name: 'วันมาฆบูชา', type: 'holiday', demandFactor: 0.6 }, // Gov Holiday = Bad
    { date: '2025-04-06', name: 'วันจักรี', type: 'holiday', demandFactor: 0.6 },
    { date: '2025-04-13', name: 'วันสงกรานต์', type: 'festival', demandFactor: 0.3 }, // Market closed/Target travels
    { date: '2025-04-14', name: 'วันสงกรานต์', type: 'festival', demandFactor: 0.3 },
    { date: '2025-04-15', name: 'วันสงกรานต์', type: 'festival', demandFactor: 0.3 },
    { date: '2025-05-01', name: 'วันแรงงาน', type: 'holiday', demandFactor: 0.8 },
    { date: '2025-05-04', name: 'วันฉัตรมงคล', type: 'holiday', demandFactor: 0.6 },
    { date: '2025-05-12', name: 'วันวิสาขบูชา', type: 'holiday', demandFactor: 0.6 },
    { date: '2025-06-03', name: 'วันเฉลิมฯ สมเด็จพระราชินี', type: 'holiday', demandFactor: 0.6 },
    { date: '2025-07-28', name: 'วันเฉลิมฯ ร.10', type: 'holiday', demandFactor: 0.6 },
    { date: '2025-08-12', name: 'วันแม่', type: 'holiday', demandFactor: 0.7 }, // Mother day might be okay? User said Gov Holiday bad.
    { date: '2025-10-13', name: 'วันคล้ายวันสวรรคต ร.9', type: 'holiday', demandFactor: 0.6 },
    { date: '2025-10-23', name: 'วันปิยมหาราช', type: 'holiday', demandFactor: 0.6 },
    { date: '2025-11-05', name: 'วันลอยกระทง', type: 'festival', demandFactor: 1.3 }, // Festival evening = Good
    { date: '2025-12-05', name: 'วันพ่อ', type: 'holiday', demandFactor: 0.6 },
    { date: '2025-12-10', name: 'วันรัฐธรรมนูญ', type: 'holiday', demandFactor: 0.6 },
    { date: '2025-12-25', name: 'วันคริสต์มาส', type: 'special', demandFactor: 1.3 },
    { date: '2025-12-31', name: 'วันสิ้นปี', type: 'holiday', demandFactor: 0.5 },

    // 2026
    { date: '2026-01-01', name: 'วันขึ้นปีใหม่', type: 'holiday', demandFactor: 0.3 },
    { date: '2026-02-14', name: 'วันวาเลนไทน์', type: 'special', demandFactor: 1.5 },
    { date: '2026-02-15', name: 'วันมาฆบูชา', type: 'holiday', demandFactor: 0.7 },
    { date: '2026-04-06', name: 'วันจักรี', type: 'holiday', demandFactor: 0.8 },
    { date: '2026-04-13', name: 'วันสงกรานต์', type: 'festival', demandFactor: 0.4 },
    { date: '2026-04-14', name: 'วันสงกรานต์', type: 'festival', demandFactor: 0.4 },
    { date: '2026-04-15', name: 'วันสงกรานต์', type: 'festival', demandFactor: 0.4 },
    { date: '2026-05-01', name: 'วันแรงงาน', type: 'holiday', demandFactor: 1.2 },
    { date: '2026-05-04', name: 'วันฉัตรมงคล', type: 'holiday', demandFactor: 0.8 },
    { date: '2026-05-31', name: 'วันวิสาขบูชา', type: 'holiday', demandFactor: 0.7 },
    { date: '2026-06-03', name: 'วันเฉลิมฯ สมเด็จพระราชินี', type: 'holiday', demandFactor: 0.8 },
    { date: '2026-07-28', name: 'วันเฉลิมฯ ร.10', type: 'holiday', demandFactor: 0.8 },
    { date: '2026-08-12', name: 'วันแม่', type: 'holiday', demandFactor: 1.4 },
    { date: '2026-10-13', name: 'วันคล้ายวันสวรรคต ร.9', type: 'holiday', demandFactor: 0.7 },
    { date: '2026-10-23', name: 'วันปิยมหาราช', type: 'holiday', demandFactor: 0.8 },
    { date: '2026-10-25', name: 'วันลอยกระทง', type: 'festival', demandFactor: 1.3 },
    { date: '2026-12-05', name: 'วันพ่อ', type: 'holiday', demandFactor: 1.4 },
    { date: '2026-12-10', name: 'วันรัฐธรรมนูญ', type: 'holiday', demandFactor: 0.8 },
    { date: '2026-12-25', name: 'วันคริสต์มาส', type: 'special', demandFactor: 1.3 },
    { date: '2026-12-31', name: 'วันสิ้นปี', type: 'holiday', demandFactor: 1.5 },

    // 2027
    { date: '2027-01-01', name: 'วันขึ้นปีใหม่', type: 'holiday', demandFactor: 0.3 },
    { date: '2027-02-14', name: 'วันวาเลนไทน์', type: 'special', demandFactor: 1.5 },
    { date: '2027-03-06', name: 'วันมาฆบูชา', type: 'holiday', demandFactor: 0.7 },
    { date: '2027-04-06', name: 'วันจักรี', type: 'holiday', demandFactor: 0.8 },
    { date: '2027-04-13', name: 'วันสงกรานต์', type: 'festival', demandFactor: 0.4 },
    { date: '2027-04-14', name: 'วันสงกรานต์', type: 'festival', demandFactor: 0.4 },
    { date: '2027-04-15', name: 'วันสงกรานต์', type: 'festival', demandFactor: 0.4 },
    { date: '2027-05-01', name: 'วันแรงงาน', type: 'holiday', demandFactor: 1.2 },
    { date: '2027-05-04', name: 'วันฉัตรมงคล', type: 'holiday', demandFactor: 0.8 },
    { date: '2027-05-20', name: 'วันวิสาขบูชา', type: 'holiday', demandFactor: 0.7 },
    { date: '2027-06-03', name: 'วันเฉลิมฯ สมเด็จพระราชินี', type: 'holiday', demandFactor: 0.8 },
    { date: '2027-07-28', name: 'วันเฉลิมฯ ร.10', type: 'holiday', demandFactor: 0.8 },
    { date: '2027-08-12', name: 'วันแม่', type: 'holiday', demandFactor: 1.4 },
    { date: '2027-10-13', name: 'วันคล้ายวันสวรรคต ร.9', type: 'holiday', demandFactor: 0.7 },
    { date: '2027-10-23', name: 'วันปิยมหาราช', type: 'holiday', demandFactor: 0.8 },
    { date: '2027-11-14', name: 'วันลอยกระทง', type: 'festival', demandFactor: 1.3 },
    { date: '2027-12-05', name: 'วันพ่อ', type: 'holiday', demandFactor: 1.4 },
    { date: '2027-12-10', name: 'วันรัฐธรรมนูญ', type: 'holiday', demandFactor: 0.8 },
    { date: '2027-12-25', name: 'วันคริสต์มาส', type: 'special', demandFactor: 1.3 },
    { date: '2027-12-31', name: 'วันสิ้นปี', type: 'holiday', demandFactor: 1.5 },

    // 2028
    { date: '2028-01-01', name: 'วันขึ้นปีใหม่', type: 'holiday', demandFactor: 0.3 },
    { date: '2028-02-14', name: 'วันวาเลนไทน์', type: 'special', demandFactor: 1.5 },
    { date: '2028-02-24', name: 'วันมาฆบูชา', type: 'holiday', demandFactor: 0.7 },
    { date: '2028-04-06', name: 'วันจักรี', type: 'holiday', demandFactor: 0.8 },
    { date: '2028-04-13', name: 'วันสงกรานต์', type: 'festival', demandFactor: 0.4 },
    { date: '2028-04-14', name: 'วันสงกรานต์', type: 'festival', demandFactor: 0.4 },
    { date: '2028-04-15', name: 'วันสงกรานต์', type: 'festival', demandFactor: 0.4 },
    { date: '2028-05-01', name: 'วันแรงงาน', type: 'holiday', demandFactor: 1.2 },
    { date: '2028-05-04', name: 'วันฉัตรมงคล', type: 'holiday', demandFactor: 0.8 },
    { date: '2028-05-09', name: 'วันวิสาขบูชา', type: 'holiday', demandFactor: 0.7 },
    { date: '2028-06-03', name: 'วันเฉลิมฯ สมเด็จพระราชินี', type: 'holiday', demandFactor: 0.8 },
    { date: '2028-07-28', name: 'วันเฉลิมฯ ร.10', type: 'holiday', demandFactor: 0.8 },
    { date: '2028-08-12', name: 'วันแม่', type: 'holiday', demandFactor: 1.4 },
    { date: '2028-10-13', name: 'วันคล้ายวันสวรรคต ร.9', type: 'holiday', demandFactor: 0.7 },
    { date: '2028-10-23', name: 'วันปิยมหาราช', type: 'holiday', demandFactor: 0.8 },
    { date: '2028-11-02', name: 'วันลอยกระทง', type: 'festival', demandFactor: 1.3 },
    { date: '2028-12-05', name: 'วันพ่อ', type: 'holiday', demandFactor: 1.4 },
    { date: '2028-12-10', name: 'วันรัฐธรรมนูญ', type: 'holiday', demandFactor: 0.8 },
    { date: '2028-12-25', name: 'วันคริสต์มาส', type: 'special', demandFactor: 1.3 },
    { date: '2028-12-31', name: 'วันสิ้นปี', type: 'holiday', demandFactor: 1.5 },

    // 2029
    { date: '2029-01-01', name: 'วันขึ้นปีใหม่', type: 'holiday', demandFactor: 0.3 },
    { date: '2029-02-14', name: 'วันวาเลนไทน์', type: 'special', demandFactor: 1.5 },
    { date: '2029-02-13', name: 'วันมาฆบูชา', type: 'holiday', demandFactor: 0.7 },
    { date: '2029-04-06', name: 'วันจักรี', type: 'holiday', demandFactor: 0.8 },
    { date: '2029-04-13', name: 'วันสงกรานต์', type: 'festival', demandFactor: 0.4 },
    { date: '2029-04-14', name: 'วันสงกรานต์', type: 'festival', demandFactor: 0.4 },
    { date: '2029-04-15', name: 'วันสงกรานต์', type: 'festival', demandFactor: 0.4 },
    { date: '2029-05-01', name: 'วันแรงงาน', type: 'holiday', demandFactor: 1.2 },
    { date: '2029-05-04', name: 'วันฉัตรมงคล', type: 'holiday', demandFactor: 0.8 },
    { date: '2029-05-27', name: 'วันวิสาขบูชา', type: 'holiday', demandFactor: 0.7 },
    { date: '2029-06-03', name: 'วันเฉลิมฯ สมเด็จพระราชินี', type: 'holiday', demandFactor: 0.8 },
    { date: '2029-07-28', name: 'วันเฉลิมฯ ร.10', type: 'holiday', demandFactor: 0.8 },
    { date: '2029-08-12', name: 'วันแม่', type: 'holiday', demandFactor: 1.4 },
    { date: '2029-10-13', name: 'วันคล้ายวันสวรรคต ร.9', type: 'holiday', demandFactor: 0.7 },
    { date: '2029-10-23', name: 'วันปิยมหาราช', type: 'holiday', demandFactor: 0.8 },
    { date: '2029-11-21', name: 'วันลอยกระทง', type: 'festival', demandFactor: 1.3 },
    { date: '2029-12-05', name: 'วันพ่อ', type: 'holiday', demandFactor: 1.4 },
    { date: '2029-12-10', name: 'วันรัฐธรรมนูญ', type: 'holiday', demandFactor: 0.8 },
    { date: '2029-12-25', name: 'วันคริสต์มาส', type: 'special', demandFactor: 1.3 },
    { date: '2029-12-31', name: 'วันสิ้นปี', type: 'holiday', demandFactor: 1.5 },

    // 2030
    { date: '2030-01-01', name: 'วันขึ้นปีใหม่', type: 'holiday', demandFactor: 0.3 },
    { date: '2030-02-14', name: 'วันวาเลนไทน์', type: 'special', demandFactor: 1.5 },
    { date: '2030-03-03', name: 'วันมาฆบูชา', type: 'holiday', demandFactor: 0.7 },
    { date: '2030-04-06', name: 'วันจักรี', type: 'holiday', demandFactor: 0.8 },
    { date: '2030-04-13', name: 'วันสงกรานต์', type: 'festival', demandFactor: 0.4 },
    { date: '2030-04-14', name: 'วันสงกรานต์', type: 'festival', demandFactor: 0.4 },
    { date: '2030-04-15', name: 'วันสงกรานต์', type: 'festival', demandFactor: 0.4 },
    { date: '2030-05-01', name: 'วันแรงงาน', type: 'holiday', demandFactor: 1.2 },
    { date: '2030-05-04', name: 'วันฉัตรมงคล', type: 'holiday', demandFactor: 0.8 },
    { date: '2030-05-16', name: 'วันวิสาขบูชา', type: 'holiday', demandFactor: 0.7 },
    { date: '2030-06-03', name: 'วันเฉลิมฯ สมเด็จพระราชินี', type: 'holiday', demandFactor: 0.8 },
    { date: '2030-07-28', name: 'วันเฉลิมฯ ร.10', type: 'holiday', demandFactor: 0.8 },
    { date: '2030-08-12', name: 'วันแม่', type: 'holiday', demandFactor: 1.4 },
    { date: '2030-10-13', name: 'วันคล้ายวันสวรรคต ร.9', type: 'holiday', demandFactor: 0.7 },
    { date: '2030-10-23', name: 'วันปิยมหาราช', type: 'holiday', demandFactor: 0.8 },
    { date: '2030-11-10', name: 'วันลอยกระทง', type: 'festival', demandFactor: 1.3 },
    { date: '2030-12-05', name: 'วันพ่อ', type: 'holiday', demandFactor: 1.4 },
    { date: '2030-12-10', name: 'วันรัฐธรรมนูญ', type: 'holiday', demandFactor: 0.8 },
    { date: '2030-12-25', name: 'วันคริสต์มาส', type: 'special', demandFactor: 1.3 },
    { date: '2030-12-31', name: 'วันสิ้นปี', type: 'holiday', demandFactor: 1.5 },

    // 2031
    { date: '2031-01-01', name: 'วันขึ้นปีใหม่', type: 'holiday', demandFactor: 0.3 },
    { date: '2031-02-14', name: 'วันวาเลนไทน์', type: 'special', demandFactor: 1.5 },
    { date: '2031-02-20', name: 'วันมาฆบูชา', type: 'holiday', demandFactor: 0.7 },
    { date: '2031-04-06', name: 'วันจักรี', type: 'holiday', demandFactor: 0.8 },
    { date: '2031-04-13', name: 'วันสงกรานต์', type: 'festival', demandFactor: 0.4 },
    { date: '2031-04-14', name: 'วันสงกรานต์', type: 'festival', demandFactor: 0.4 },
    { date: '2031-04-15', name: 'วันสงกรานต์', type: 'festival', demandFactor: 0.4 },
    { date: '2031-05-01', name: 'วันแรงงาน', type: 'holiday', demandFactor: 1.2 },
    { date: '2031-05-04', name: 'วันฉัตรมงคล', type: 'holiday', demandFactor: 0.8 },
    { date: '2031-05-06', name: 'วันวิสาขบูชา', type: 'holiday', demandFactor: 0.7 },
    { date: '2031-06-03', name: 'วันเฉลิมฯ สมเด็จพระราชินี', type: 'holiday', demandFactor: 0.8 },
    { date: '2031-07-28', name: 'วันเฉลิมฯ ร.10', type: 'holiday', demandFactor: 0.8 },
    { date: '2031-08-12', name: 'วันแม่', type: 'holiday', demandFactor: 1.4 },
    { date: '2031-10-13', name: 'วันคล้ายวันสวรรคต ร.9', type: 'holiday', demandFactor: 0.7 },
    { date: '2031-10-23', name: 'วันปิยมหาราช', type: 'holiday', demandFactor: 0.8 },
    { date: '2031-10-30', name: 'วันลอยกระทง', type: 'festival', demandFactor: 1.3 },
    { date: '2031-12-05', name: 'วันพ่อ', type: 'holiday', demandFactor: 1.4 },
    { date: '2031-12-10', name: 'วันรัฐธรรมนูญ', type: 'holiday', demandFactor: 0.8 },
    { date: '2031-12-25', name: 'วันคริสต์มาส', type: 'special', demandFactor: 1.3 },
    { date: '2031-12-31', name: 'วันสิ้นปี', type: 'holiday', demandFactor: 1.5 },

    // 2032
    { date: '2032-01-01', name: 'วันขึ้นปีใหม่', type: 'holiday', demandFactor: 0.3 },
    { date: '2032-02-14', name: 'วันวาเลนไทน์', type: 'special', demandFactor: 1.5 },
    { date: '2032-02-10', name: 'วันมาฆบูชา', type: 'holiday', demandFactor: 0.7 },
    { date: '2032-04-06', name: 'วันจักรี', type: 'holiday', demandFactor: 0.8 },
    { date: '2032-04-13', name: 'วันสงกรานต์', type: 'festival', demandFactor: 0.4 },
    { date: '2032-04-14', name: 'วันสงกรานต์', type: 'festival', demandFactor: 0.4 },
    { date: '2032-04-15', name: 'วันสงกรานต์', type: 'festival', demandFactor: 0.4 },
    { date: '2032-05-01', name: 'วันแรงงาน', type: 'holiday', demandFactor: 1.2 },
    { date: '2032-05-04', name: 'วันฉัตรมงคล', type: 'holiday', demandFactor: 0.8 },
    { date: '2032-05-24', name: 'วันวิสาขบูชา', type: 'holiday', demandFactor: 0.7 },
    { date: '2032-06-03', name: 'วันเฉลิมฯ สมเด็จพระราชินี', type: 'holiday', demandFactor: 0.8 },
    { date: '2032-07-28', name: 'วันเฉลิมฯ ร.10', type: 'holiday', demandFactor: 0.8 },
    { date: '2032-08-12', name: 'วันแม่', type: 'holiday', demandFactor: 1.4 },
    { date: '2032-10-13', name: 'วันคล้ายวันสวรรคต ร.9', type: 'holiday', demandFactor: 0.7 },
    { date: '2032-10-23', name: 'วันปิยมหาราช', type: 'holiday', demandFactor: 0.8 },
    { date: '2032-11-18', name: 'วันลอยกระทง', type: 'festival', demandFactor: 1.3 },
    { date: '2032-12-05', name: 'วันพ่อ', type: 'holiday', demandFactor: 1.4 },
    { date: '2032-12-10', name: 'วันรัฐธรรมนูญ', type: 'holiday', demandFactor: 0.8 },
    { date: '2032-12-25', name: 'วันคริสต์มาส', type: 'special', demandFactor: 1.3 },
    { date: '2032-12-31', name: 'วันสิ้นปี', type: 'holiday', demandFactor: 1.5 },

    // 2033
    { date: '2033-01-01', name: 'วันขึ้นปีใหม่', type: 'holiday', demandFactor: 0.3 },
    { date: '2033-02-14', name: 'วันวาเลนไทน์', type: 'special', demandFactor: 1.5 },
    { date: '2033-02-28', name: 'วันมาฆบูชา', type: 'holiday', demandFactor: 0.7 },
    { date: '2033-04-06', name: 'วันจักรี', type: 'holiday', demandFactor: 0.8 },
    { date: '2033-04-13', name: 'วันสงกรานต์', type: 'festival', demandFactor: 0.4 },
    { date: '2033-04-14', name: 'วันสงกรานต์', type: 'festival', demandFactor: 0.4 },
    { date: '2033-04-15', name: 'วันสงกรานต์', type: 'festival', demandFactor: 0.4 },
    { date: '2033-05-01', name: 'วันแรงงาน', type: 'holiday', demandFactor: 1.2 },
    { date: '2033-05-04', name: 'วันฉัตรมงคล', type: 'holiday', demandFactor: 0.8 },
    { date: '2033-05-13', name: 'วันวิสาขบูชา', type: 'holiday', demandFactor: 0.7 },
    { date: '2033-06-03', name: 'วันเฉลิมฯ สมเด็จพระราชินี', type: 'holiday', demandFactor: 0.8 },
    { date: '2033-07-28', name: 'วันเฉลิมฯ ร.10', type: 'holiday', demandFactor: 0.8 },
    { date: '2033-08-12', name: 'วันแม่', type: 'holiday', demandFactor: 1.4 },
    { date: '2033-10-13', name: 'วันคล้ายวันสวรรคต ร.9', type: 'holiday', demandFactor: 0.7 },
    { date: '2033-10-23', name: 'วันปิยมหาราช', type: 'holiday', demandFactor: 0.8 },
    { date: '2033-11-07', name: 'วันลอยกระทง', type: 'festival', demandFactor: 1.3 },
    { date: '2033-12-05', name: 'วันพ่อ', type: 'holiday', demandFactor: 1.4 },
    { date: '2033-12-10', name: 'วันรัฐธรรมนูญ', type: 'holiday', demandFactor: 0.8 },
    { date: '2033-12-25', name: 'วันคริสต์มาส', type: 'special', demandFactor: 1.3 },
    { date: '2033-12-31', name: 'วันสิ้นปี', type: 'holiday', demandFactor: 1.5 },

    // 2034
    { date: '2034-01-01', name: 'วันขึ้นปีใหม่', type: 'holiday', demandFactor: 0.3 },
    { date: '2034-02-14', name: 'วันวาเลนไทน์', type: 'special', demandFactor: 1.5 },
    { date: '2034-02-17', name: 'วันมาฆบูชา', type: 'holiday', demandFactor: 0.7 },
    { date: '2034-04-06', name: 'วันจักรี', type: 'holiday', demandFactor: 0.8 },
    { date: '2034-04-13', name: 'วันสงกรานต์', type: 'festival', demandFactor: 0.4 },
    { date: '2034-04-14', name: 'วันสงกรานต์', type: 'festival', demandFactor: 0.4 },
    { date: '2034-04-15', name: 'วันสงกรานต์', type: 'festival', demandFactor: 0.4 },
    { date: '2034-05-01', name: 'วันแรงงาน', type: 'holiday', demandFactor: 1.2 },
    { date: '2034-05-02', name: 'วันวิสาขบูชา', type: 'holiday', demandFactor: 0.7 },
    { date: '2034-05-04', name: 'วันฉัตรมงคล', type: 'holiday', demandFactor: 0.8 },
    { date: '2034-06-03', name: 'วันเฉลิมฯ สมเด็จพระราชินี', type: 'holiday', demandFactor: 0.8 },
    { date: '2034-07-28', name: 'วันเฉลิมฯ ร.10', type: 'holiday', demandFactor: 0.8 },
    { date: '2034-08-12', name: 'วันแม่', type: 'holiday', demandFactor: 1.4 },
    { date: '2034-10-13', name: 'วันคล้ายวันสวรรคต ร.9', type: 'holiday', demandFactor: 0.7 },
    { date: '2034-10-23', name: 'วันปิยมหาราช', type: 'holiday', demandFactor: 0.8 },
    { date: '2034-10-27', name: 'วันลอยกระทง', type: 'festival', demandFactor: 1.3 },
    { date: '2034-12-05', name: 'วันพ่อ', type: 'holiday', demandFactor: 1.4 },
    { date: '2034-12-10', name: 'วันรัฐธรรมนูญ', type: 'holiday', demandFactor: 0.8 },
    { date: '2034-12-25', name: 'วันคริสต์มาส', type: 'special', demandFactor: 1.3 },
    { date: '2034-12-31', name: 'วันสิ้นปี', type: 'holiday', demandFactor: 1.5 },

    // 2035
    { date: '2035-01-01', name: 'วันขึ้นปีใหม่', type: 'holiday', demandFactor: 0.3 },
    { date: '2035-02-14', name: 'วันวาเลนไทน์', type: 'special', demandFactor: 1.5 },
    { date: '2035-03-07', name: 'วันมาฆบูชา', type: 'holiday', demandFactor: 0.7 },
    { date: '2035-04-06', name: 'วันจักรี', type: 'holiday', demandFactor: 0.8 },
    { date: '2035-04-13', name: 'วันสงกรานต์', type: 'festival', demandFactor: 0.4 },
    { date: '2035-04-14', name: 'วันสงกรานต์', type: 'festival', demandFactor: 0.4 },
    { date: '2035-04-15', name: 'วันสงกรานต์', type: 'festival', demandFactor: 0.4 },
    { date: '2035-05-01', name: 'วันแรงงาน', type: 'holiday', demandFactor: 1.2 },
    { date: '2035-05-04', name: 'วันฉัตรมงคล', type: 'holiday', demandFactor: 0.8 },
    { date: '2035-05-21', name: 'วันวิสาขบูชา', type: 'holiday', demandFactor: 0.7 },
    { date: '2035-06-03', name: 'วันเฉลิมฯ สมเด็จพระราชินี', type: 'holiday', demandFactor: 0.8 },
    { date: '2035-07-28', name: 'วันเฉลิมฯ ร.10', type: 'holiday', demandFactor: 0.8 },
    { date: '2035-08-12', name: 'วันแม่', type: 'holiday', demandFactor: 1.4 },
    { date: '2035-10-13', name: 'วันคล้ายวันสวรรคต ร.9', type: 'holiday', demandFactor: 0.7 },
    { date: '2035-10-23', name: 'วันปิยมหาราช', type: 'holiday', demandFactor: 0.8 },
    { date: '2035-11-15', name: 'วันลอยกระทง', type: 'festival', demandFactor: 1.3 },
    { date: '2035-12-05', name: 'วันพ่อ', type: 'holiday', demandFactor: 1.4 },
    { date: '2035-12-10', name: 'วันรัฐธรรมนูญ', type: 'holiday', demandFactor: 0.8 },
    { date: '2035-12-25', name: 'วันคริสต์มาส', type: 'special', demandFactor: 1.3 },
    { date: '2035-12-31', name: 'วันสิ้นปี', type: 'holiday', demandFactor: 1.5 },

    // 2036
    { date: '2036-01-01', name: 'วันขึ้นปีใหม่', type: 'holiday', demandFactor: 0.3 },
    { date: '2036-02-14', name: 'วันวาเลนไทน์', type: 'special', demandFactor: 1.5 },
    { date: '2036-02-25', name: 'วันมาฆบูชา', type: 'holiday', demandFactor: 0.7 },
    { date: '2036-04-06', name: 'วันจักรี', type: 'holiday', demandFactor: 0.8 },
    { date: '2036-04-13', name: 'วันสงกรานต์', type: 'festival', demandFactor: 0.4 },
    { date: '2036-04-14', name: 'วันสงกรานต์', type: 'festival', demandFactor: 0.4 },
    { date: '2036-04-15', name: 'วันสงกรานต์', type: 'festival', demandFactor: 0.4 },
    { date: '2036-05-01', name: 'วันแรงงาน', type: 'holiday', demandFactor: 1.2 },
    { date: '2036-05-04', name: 'วันฉัตรมงคล', type: 'holiday', demandFactor: 0.8 },
    { date: '2036-05-09', name: 'วันวิสาขบูชา', type: 'holiday', demandFactor: 0.7 },
    { date: '2036-06-03', name: 'วันเฉลิมฯ สมเด็จพระราชินี', type: 'holiday', demandFactor: 0.8 },
    { date: '2036-07-28', name: 'วันเฉลิมฯ ร.10', type: 'holiday', demandFactor: 0.8 },
    { date: '2036-08-12', name: 'วันแม่', type: 'holiday', demandFactor: 1.4 },
    { date: '2036-10-13', name: 'วันคล้ายวันสวรรคต ร.9', type: 'holiday', demandFactor: 0.7 },
    { date: '2036-10-23', name: 'วันปิยมหาราช', type: 'holiday', demandFactor: 0.8 },
    { date: '2036-11-03', name: 'วันลอยกระทง', type: 'festival', demandFactor: 1.3 },
    { date: '2036-12-05', name: 'วันพ่อ', type: 'holiday', demandFactor: 1.4 },
    { date: '2036-12-10', name: 'วันรัฐธรรมนูญ', type: 'holiday', demandFactor: 0.8 },
    { date: '2036-12-25', name: 'วันคริสต์มาส', type: 'special', demandFactor: 1.3 },
    { date: '2036-12-31', name: 'วันสิ้นปี', type: 'holiday', demandFactor: 1.5 },
];

/**
 * Check if a date is a Thai holiday or special event
 */
export function getThaiEvent(date: string): ThaiCalendarEvent | null {
    return THAI_HOLIDAYS.find(h => h.date === date) || null;
}

/**
 * Check if date is near a holiday (within N days)
 */
export function isNearHoliday(date: string, daysRange: number = 2): ThaiCalendarEvent | null {
    const targetDate = new Date(date);

    for (const holiday of THAI_HOLIDAYS) {
        const holidayDate = new Date(holiday.date);
        const daysDiff = Math.abs(
            (targetDate.getTime() - holidayDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysDiff > 0 && daysDiff <= daysRange) {
            return {
                ...holiday,
                description: `${Math.round(daysDiff)} วัน${targetDate > holidayDate ? 'หลัง' : 'ก่อน'}${holiday.name}`
            };
        }
    }

    return null;
}

/**
 * Check if date is a payday period (25th-5th)
 */
export function isPaydayPeriod(date: string): boolean {
    const day = new Date(date).getDate();
    return day >= 25 || day <= 5;
}

/**
 * Get payday factor for a date
 */
export function getPaydayFactor(date: string): number {
    return isPaydayPeriod(date) ? 1.20 : 1.0;
}

/**
 * Get all calendar factors for a date
 */
export function getCalendarFactors(date: string): {
    event: ThaiCalendarEvent | null;
    nearHoliday: ThaiCalendarEvent | null;
    isPayday: boolean;
    totalFactor: number;
    factors: Array<{ name: string; factor: number }>;
} {
    const event = getThaiEvent(date);
    const nearHoliday = isNearHoliday(date);
    const isPayday = isPaydayPeriod(date);

    const factors: Array<{ name: string; factor: number }> = [];
    let totalFactor = 1.0;

    // Apply event factor
    if (event) {
        factors.push({ name: event.name, factor: event.demandFactor });
        totalFactor *= event.demandFactor;
    }

    // Apply near-holiday factor (reduced impact)
    if (!event && nearHoliday) {
        const nearFactor = 1 + (nearHoliday.demandFactor - 1) * 0.3; // 30% of holiday effect
        factors.push({ name: nearHoliday.description || 'ใกล้วันหยุด', factor: nearFactor });
        totalFactor *= nearFactor;
    }

    // Apply payday factor (only if not a holiday)
    // REMOVED: Applied dynamically via getMarketAdjustment in smartForecaster.ts instead to prevent double-counting.

    return {
        event,
        nearHoliday,
        isPayday,
        totalFactor,
        factors
    };
}

/**
 * Get upcoming events for display
 */
export function getUpcomingEvents(fromDate: string, days: number = 30): ThaiCalendarEvent[] {
    const from = new Date(fromDate);
    const to = new Date(fromDate);
    to.setDate(to.getDate() + days);

    return THAI_HOLIDAYS.filter(h => {
        const eventDate = new Date(h.date);
        return eventDate >= from && eventDate <= to;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/**
 * Get month seasonality factor
 */
export function getMonthSeasonality(date: string): { factor: number; description: string } {
    const month = new Date(date).getMonth(); // 0-11

    // Based on User Interview (Market Seller)
    // - Government officials are key customers -> Gov holidays = BAD sales (-40%)
    // - School Break = BAD sales (-20%) -> Mar, Apr, Oct
    // - Rainy Season = BAD
    const monthFactors: Record<number, { factor: number; description: string }> = {
        0: { factor: 0.90, description: 'หลังปีใหม่ - คนใช้จ่ายน้อยลง' },     // January
        1: { factor: 1.15, description: 'วาเลนไทน์ - ยอดดี' },                  // February
        2: { factor: 0.80, description: 'ปิดเทอม - นร.หาย (ยอดตก)' },          // March (School Break)
        3: { factor: 0.50, description: 'ปิดเทอม + สงกรานต์ (หยุดราชการ)' },   // April (School Break + Holidays)
        4: { factor: 0.85, description: 'เปิดเทอมกลางเดือน - เริ่มฟื้น' },      // May
        5: { factor: 0.90, description: 'หน้าฝน - คนเดินตลาดน้อย' },            // June
        6: { factor: 0.85, description: 'หน้าฝน - คนเดินตลาดน้อย' },            // July
        7: { factor: 0.90, description: 'กลางพรรษา - เงียบ' },                 // August (Mother day is holiday = bad?)
        8: { factor: 0.80, description: 'หน้าฝนชุก - ระวังพายุ' },              // September
        9: { factor: 0.80, description: 'ปิดเทอมตุลา - นร.หาย' },              // October (School Break)
        10: { factor: 1.10, description: 'ลอยกระทง - คนคึกคัก' },               // November
        11: { factor: 1.30, description: 'สิ้นปี/ปีใหม่ - เทศกาล' },           // December
    };

    return monthFactors[month] || { factor: 1.0, description: 'ปกติ' };
}

export default {
    getThaiEvent,
    isNearHoliday,
    isPaydayPeriod,
    getPaydayFactor,
    getCalendarFactors,
    getUpcomingEvents,
    getMonthSeasonality
};
