import { Jar, Product, DailyReport } from './types';
import { LayoutDashboard, Wallet, Package, ShoppingBag, TrendingUp, Settings } from 'lucide-react';
import React from 'react';

export const NAVIGATION = [
  { id: 'dashboard', label: 'ภาพรวมร้าน (Dashboard)', icon: <LayoutDashboard size={20} /> },
  { id: 'financials', label: 'ระบบการเงิน (5 Jars)', icon: <Wallet size={20} /> },
  { id: 'production', label: 'การผลิต & พยากรณ์', icon: <TrendingUp size={20} /> },
  { id: 'sales', label: 'บันทึกยอดขาย', icon: <ShoppingBag size={20} /> },
  { id: 'inventory', label: 'สต็อกสินค้า', icon: <Package size={20} /> },
];

export const MOCK_JARS: Jar[] = [
  { id: 'Working', name: 'หมุนเวียน (Working)', balance: 15420, allocationPercent: 0.20, description: 'ซื้อของรอบถัดไป' },
  { id: 'CapEx', name: 'ลงทุน (CapEx)', balance: 45000, allocationPercent: 0.45, description: 'เก็บเพื่อซื้อของชิ้นใหญ่/ขยายร้าน' },
  { id: 'Opex', name: 'ค่าใช้จ่าย (Opex)', balance: 8200, allocationPercent: 0.10, description: 'ค่าน้ำ, ค่าไฟ, ค่าที่, น้ำแข็ง' },
  { id: 'Emergency', name: 'ฉุกเฉิน (Emergency)', balance: 12000, allocationPercent: 0.05, description: 'สำรองเผื่อเหตุไม่คาดฝัน' },
  { id: 'Owner', name: 'กำไรเจ้าของ (Owner)', balance: 35000, allocationPercent: 0.20, description: 'เงินเดือนเจ้าของ/ปันผล' },
];

export const MOCK_PRODUCTS: Product[] = [
  { id: 'p1', name: 'เค้กมินิ', category: 'Cake', flavor: 'ส้ม', price: 25, cost: 12 },
  { id: 'p2', name: 'เค้กมินิ', category: 'Cake', flavor: 'ช็อคโกแลต', price: 25, cost: 13 },
  { id: 'p3', name: 'ทาร์ตไข่', category: 'Tart', flavor: 'ออริจินัล', price: 20, cost: 8 },
  { id: 'p4', name: 'เค้กกล้วยหอม', category: 'Cake', flavor: 'ชีส', price: 35, cost: 18 },
];

// Simulated Historical Data for Charts
export const MOCK_HISTORY_DATA = [
  { date: '16/11', revenue: 4200, profit: 1800, waste: 200, market: 'ตลาดนัดรถไฟ' },
  { date: '17/11', revenue: 4500, profit: 2100, waste: 150, market: 'ตลาดนัดรถไฟ' },
  { date: '18/11', revenue: 3800, profit: 1500, waste: 400, market: 'ตลาดนัดรถไฟ' },
  { date: '19/11', revenue: 5100, profit: 2400, waste: 100, market: 'หน้ามหาลัย' },
  { date: '20/11', revenue: 4900, profit: 2200, waste: 120, market: 'หน้ามหาลัย' },
  { date: '21/11', revenue: 6200, profit: 3100, waste: 50, market: 'งานวัด' },
  { date: '22/11', revenue: 5010, profit: 2155, waste: 17, market: 'งานวัด' },
];

export const WEATHER_IMPACT_DATA = [
  { condition: 'Sunny', efficiency: 95 },
  { condition: 'Cloudy', efficiency: 85 },
  { condition: 'Rainy', efficiency: 60 },
  { condition: 'Storm', efficiency: 30 },
];
