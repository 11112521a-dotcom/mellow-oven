// ============================================================
// Detailed Sales Report Modal
// Select date range and export comprehensive PDF report
// 🛡️ Mellow Oven Standards Compliance:
// - #13: Memory Leak Prevention (cleanup in useEffect)
// - #15: Idempotency (loading state on print button)
// - #22: ESC key dismiss, backdrop click, scroll lock
// ============================================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useStore } from '@/src/store';
import { X, FileText, Calendar, Download, TrendingUp, Store, Package, BarChart3, Printer } from 'lucide-react';
import { formatCurrency } from '@/src/lib/utils';
import { numberToBahtText } from '@/src/utils/bahtText';
// Titan Analytics (Replaced by Oracle Core)
import { runOracle, OraclePattern } from '@/src/lib/oracle/oracleEngine';
import { OracleInsightCard } from '../SalesReport/OracleInsightCard';

interface DetailedSalesReportModalProps {
    isOpen: boolean;
    onClose: () => void;
}

// Weather icons
const weatherIcons: Record<string, string> = {
    sunny: '☀️',
    cloudy: '☁️',
    rain: '🌧️',
    storm: '⛈️'
};

export const DetailedSalesReportModal: React.FC<DetailedSalesReportModalProps> = ({ isOpen, onClose }) => {
    const { productSales, fetchProductSales, markets, shopInfo, products } = useStore();

    // Date range - default to last 7 days
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const [fromDate, setFromDate] = useState(weekAgo);
    const [toDate, setToDate] = useState(today);
    const [isPrinting, setIsPrinting] = useState(false); // #15: Idempotency

    // Oracle Core State
    const [oraclePatterns, setOraclePatterns] = useState<OraclePattern[]>([]);
    const [isOracleLoading, setIsOracleLoading] = useState(false);

    // Run Oracle on Top Products
    useEffect(() => {
        if (!isOpen || productSales.length === 0) return;

        const runAnalysis = async () => {
            setIsOracleLoading(true);
            try {
                // 1. Identify Top Products (Limit to Top 5 for performance)
                const productRevenueMap = new Map<string, number>();
                productSales.forEach(s => {
                    const rev = productRevenueMap.get(s.productId) || 0;
                    productRevenueMap.set(s.productId, rev + s.totalRevenue);
                });
                const topProductIds = Array.from(productRevenueMap.entries())
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(e => e[0]);

                // 2. Run Oracle for each top product
                const allPatterns: OraclePattern[] = [];

                for (const pid of topProductIds) {
                    const productHistory = productSales.filter(s => s.productId === pid);
                    const product = products.find(p => p.id === pid);

                    if (product && productHistory.length > 10) { // Min data check
                        const patterns = await runOracle(
                            product.name,
                            pid,
                            productHistory,
                            productSales // Context
                        );
                        allPatterns.push(...patterns);
                    }
                }

                // 3. Set Results (Sort by Lift Impact)
                setOraclePatterns(allPatterns.sort((a, b) => Math.abs(b.metrics.lift) - Math.abs(a.metrics.lift)));
            } catch (error) {
                console.error("Oracle Analysis Failed:", error);
            } finally {
                setIsOracleLoading(false);
            }
        };

        // Debounce slightly to allow UI to settle
        const timer = setTimeout(runAnalysis, 500);
        return () => clearTimeout(timer);
    }, [isOpen, productSales, products]);

    // #22: ESC key to dismiss modal
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown); // #13: Cleanup
    }, [isOpen, onClose]);

    // #22: Scroll lock when modal is open
    useEffect(() => {
        if (isOpen) {
            const originalOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = originalOverflow; // #13: Cleanup - restore scroll
            };
        }
    }, [isOpen]);

    // Fetch data when modal opens
    useEffect(() => {
        if (isOpen) {
            fetchProductSales();
        }
    }, [isOpen, fetchProductSales]);

    // Filter data by date range
    const filteredSales = useMemo(() => {
        return productSales.filter(sale =>
            sale.saleDate >= fromDate && sale.saleDate <= toDate
        );
    }, [productSales, fromDate, toDate]);

    // Summary calculations
    const summary = useMemo(() => {
        const totalRevenue = filteredSales.reduce((sum, s) => sum + s.totalRevenue, 0);
        const totalCost = filteredSales.reduce((sum, s) => sum + s.totalCost, 0);
        const totalProfit = filteredSales.reduce((sum, s) => sum + s.grossProfit, 0);
        const totalQuantity = filteredSales.reduce((sum, s) => sum + s.quantitySold, 0);
        const totalWaste = filteredSales.reduce((sum, s) => sum + (s.wasteQty || 0), 0);
        const wasteCost = filteredSales.reduce((sum, s) => sum + ((s.wasteQty || 0) * s.costPerUnit), 0);

        return { totalRevenue, totalCost, totalProfit, totalQuantity, totalWaste, wasteCost };
    }, [filteredSales]);

    // Group by market
    const byMarket = useMemo(() => {
        const map = new Map<string, {
            marketId: string;
            marketName: string;
            revenue: number;
            cost: number;
            profit: number;
            quantity: number;
            waste: number;
        }>();

        filteredSales.forEach(sale => {
            const existing = map.get(sale.marketId) || {
                marketId: sale.marketId,
                marketName: sale.marketName,
                revenue: 0, cost: 0, profit: 0, quantity: 0, waste: 0
            };
            existing.revenue += sale.totalRevenue;
            existing.cost += sale.totalCost;
            existing.profit += sale.grossProfit;
            existing.quantity += sale.quantitySold;
            existing.waste += (sale.wasteQty || 0);
            map.set(sale.marketId, existing);
        });

        return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
    }, [filteredSales]);

    // Group by product
    const byProduct = useMemo(() => {
        const map = new Map<string, {
            productId: string;
            productName: string;
            category: string;
            quantity: number;
            revenue: number;
            profit: number;
        }>();

        filteredSales.forEach(sale => {
            const key = sale.productId + (sale.variantId || '');
            const name = sale.variantName ? `${sale.productName} (${sale.variantName})` : sale.productName;
            const existing = map.get(key) || {
                productId: sale.productId,
                productName: name,
                category: sale.category,
                quantity: 0, revenue: 0, profit: 0
            };
            existing.quantity += sale.quantitySold;
            existing.revenue += sale.totalRevenue;
            existing.profit += sale.grossProfit;
            map.set(key, existing);
        });

        return Array.from(map.values()).sort((a, b) => b.quantity - a.quantity);
    }, [filteredSales]);

    // Group by date (daily breakdown)
    const byDate = useMemo(() => {
        const map = new Map<string, {
            date: string;
            revenue: number;
            profit: number;
            quantity: number;
            weather: string | null;
        }>();

        filteredSales.forEach(sale => {
            const existing = map.get(sale.saleDate) || {
                date: sale.saleDate,
                revenue: 0, profit: 0, quantity: 0, weather: null
            };
            existing.revenue += sale.totalRevenue;
            existing.profit += sale.grossProfit;
            existing.quantity += sale.quantitySold;
            if (sale.weatherCondition) existing.weather = sale.weatherCondition;
            map.set(sale.saleDate, existing);
        });

        return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
    }, [filteredSales]);

    // NEW: Detailed products breakdown by market
    const productsByMarket = useMemo(() => {
        const marketMap = new Map<string, {
            marketId: string;
            marketName: string;
            products: Map<string, {
                productName: string;
                category: string;
                quantity: number;
                revenue: number;
                cost: number;
                profit: number;
                waste: number;
            }>;
        }>();

        filteredSales.forEach(sale => {
            if (!marketMap.has(sale.marketId)) {
                marketMap.set(sale.marketId, {
                    marketId: sale.marketId,
                    marketName: sale.marketName,
                    products: new Map()
                });
            }
            const market = marketMap.get(sale.marketId)!;
            const productKey = sale.productId + (sale.variantId || '');
            const productName = sale.variantName ? `${sale.productName} (${sale.variantName})` : sale.productName;

            if (!market.products.has(productKey)) {
                market.products.set(productKey, {
                    productName,
                    category: sale.category,
                    quantity: 0, revenue: 0, cost: 0, profit: 0, waste: 0
                });
            }
            const product = market.products.get(productKey)!;
            product.quantity += sale.quantitySold;
            product.revenue += sale.totalRevenue;
            product.cost += sale.totalCost;
            product.profit += sale.grossProfit;
            product.waste += (sale.wasteQty || 0);
        });

        return Array.from(marketMap.values()).map(m => ({
            ...m,
            products: Array.from(m.products.values()).sort((a, b) => b.quantity - a.quantity)
        })).sort((a, b) => {
            const aTotal = a.products.reduce((sum, p) => sum + p.revenue, 0);
            const bTotal = b.products.reduce((sum, p) => sum + p.revenue, 0);
            return bTotal - aTotal;
        });
    }, [filteredSales]);

    // Top 10 products
    const topProducts = byProduct.slice(0, 10);

    // #22: Backdrop click to dismiss
    const handleBackdropClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    }, [onClose]);

    // Print handler with loading state (#15: Idempotency)
    const handlePrint = useCallback(() => {
        if (isPrinting) return; // Prevent double-click
        setIsPrinting(true);

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            setIsPrinting(false);
            return;
        }

        const formatDate = (d: string) => new Date(d).toLocaleDateString('th-TH');

        // Generate HTML tables
        const marketRows = byMarket.map(m => `
            <tr>
                <td style="padding:8px;border:1px solid #ddd;">${m.marketName}</td>
                <td style="padding:8px;border:1px solid #ddd;text-align:right;">฿${m.revenue.toLocaleString()}</td>
                <td style="padding:8px;border:1px solid #ddd;text-align:right;">฿${m.cost.toLocaleString()}</td>
                <td style="padding:8px;border:1px solid #ddd;text-align:right;color:${m.profit >= 0 ? '#16a34a' : '#dc2626'};">฿${m.profit.toLocaleString()}</td>
                <td style="padding:8px;border:1px solid #ddd;text-align:center;">${m.quantity}</td>
                <td style="padding:8px;border:1px solid #ddd;text-align:center;color:#dc2626;">${m.waste}</td>
            </tr>
        `).join('');

        const dailyRows = byDate.map(d => `
            <tr>
                <td style="padding:8px;border:1px solid #ddd;">${formatDate(d.date)}</td>
                <td style="padding:8px;border:1px solid #ddd;text-align:right;">฿${d.revenue.toLocaleString()}</td>
                <td style="padding:8px;border:1px solid #ddd;text-align:right;color:${d.profit >= 0 ? '#16a34a' : '#dc2626'};">฿${d.profit.toLocaleString()}</td>
                <td style="padding:8px;border:1px solid #ddd;text-align:center;">${d.quantity}</td>
                <td style="padding:8px;border:1px solid #ddd;text-align:center;">${d.weather ? weatherIcons[d.weather] || '' : '-'}</td>
            </tr>
        `).join('');

        const topProductRows = topProducts.map((p, idx) => `
            <tr>
                <td style="padding:8px;border:1px solid #ddd;text-align:center;">${idx + 1}</td>
                <td style="padding:8px;border:1px solid #ddd;">${p.productName}</td>
                <td style="padding:8px;border:1px solid #ddd;">${p.category}</td>
                <td style="padding:8px;border:1px solid #ddd;text-align:center;">${p.quantity}</td>
                <td style="padding:8px;border:1px solid #ddd;text-align:right;">฿${p.revenue.toLocaleString()}</td>
                <td style="padding:8px;border:1px solid #ddd;text-align:right;color:#16a34a;">฿${p.profit.toLocaleString()}</td>
            </tr>
        `).join('');

        const allProductRows = byProduct.map(p => `
            <tr>
                <td style="padding:6px;border:1px solid #ddd;font-size:12px;">${p.productName}</td>
                <td style="padding:6px;border:1px solid #ddd;font-size:12px;">${p.category}</td>
                <td style="padding:6px;border:1px solid #ddd;text-align:center;font-size:12px;">${p.quantity}</td>
                <td style="padding:6px;border:1px solid #ddd;text-align:right;font-size:12px;">฿${p.revenue.toLocaleString()}</td>
                <td style="padding:6px;border:1px solid #ddd;text-align:right;font-size:12px;color:#16a34a;">฿${p.profit.toLocaleString()}</td>
            </tr>
        `).join('');

        // NEW: Generate per-market product breakdown
        const perMarketSections = productsByMarket.map(market => {
            const marketTotalRevenue = market.products.reduce((s, p) => s + p.revenue, 0);
            const marketTotalProfit = market.products.reduce((s, p) => s + p.profit, 0);
            const marketTotalQty = market.products.reduce((s, p) => s + p.quantity, 0);
            const marketTotalWaste = market.products.reduce((s, p) => s + p.waste, 0);

            const productRows = market.products.map(p => `
                <tr>
                    <td style="padding:6px;border:1px solid #ddd;font-size:11px;">${p.productName}</td>
                    <td style="padding:6px;border:1px solid #ddd;font-size:11px;">${p.category}</td>
                    <td style="padding:6px;border:1px solid #ddd;text-align:center;font-size:11px;">${p.quantity}</td>
                    <td style="padding:6px;border:1px solid #ddd;text-align:right;font-size:11px;">฿${p.revenue.toLocaleString()}</td>
                    <td style="padding:6px;border:1px solid #ddd;text-align:right;font-size:11px;">฿${p.cost.toLocaleString()}</td>
                    <td style="padding:6px;border:1px solid #ddd;text-align:right;font-size:11px;color:#16a34a;">฿${p.profit.toLocaleString()}</td>
                    <td style="padding:6px;border:1px solid #ddd;text-align:center;font-size:11px;color:#dc2626;">${p.waste}</td>
                </tr>
            `).join('');

            return `
                <div style="page-break-inside:avoid;margin-bottom:25px;">
                    <h3 style="font-size:14px;color:#1e40af;margin:15px 0 8px 0;background:#dbeafe;padding:8px;border-radius:4px;">
                        🏪 ${market.marketName}
                        <span style="float:right;font-size:12px;color:#666;">รวม: ฿${marketTotalRevenue.toLocaleString()} | กำไร: ฿${marketTotalProfit.toLocaleString()} | ${marketTotalQty} ชิ้น</span>
                    </h3>
                    <table style="width:100%;border-collapse:collapse;font-size:11px;">
                        <thead>
                            <tr style="background:#f3f4f6;">
                                <th style="padding:6px;border:1px solid #ddd;text-align:left;">สินค้า</th>
                                <th style="padding:6px;border:1px solid #ddd;text-align:left;">หมวด</th>
                                <th style="padding:6px;border:1px solid #ddd;text-align:center;">จำนวน</th>
                                <th style="padding:6px;border:1px solid #ddd;text-align:right;">รายได้</th>
                                <th style="padding:6px;border:1px solid #ddd;text-align:right;">ต้นทุน</th>
                                <th style="padding:6px;border:1px solid #ddd;text-align:right;">กำไร</th>
                                <th style="padding:6px;border:1px solid #ddd;text-align:center;">เสีย</th>
                            </tr>
                        </thead>
                        <tbody>${productRows}</tbody>
                        <tfoot>
                            <tr style="background:#f0fdf4;font-weight:bold;">
                                <td colspan="2" style="padding:6px;border:1px solid #ddd;">รวม ${market.marketName}</td>
                                <td style="padding:6px;border:1px solid #ddd;text-align:center;">${marketTotalQty}</td>
                                <td style="padding:6px;border:1px solid #ddd;text-align:right;">฿${marketTotalRevenue.toLocaleString()}</td>
                                <td style="padding:6px;border:1px solid #ddd;text-align:right;"></td>
                                <td style="padding:6px;border:1px solid #ddd;text-align:right;color:#16a34a;">฿${marketTotalProfit.toLocaleString()}</td>
                                <td style="padding:6px;border:1px solid #ddd;text-align:center;color:#dc2626;">${marketTotalWaste}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            `;
        }).join('');

        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>รายงานการขาย ${formatDate(fromDate)} - ${formatDate(toDate)}</title>
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
            font-family: 'Sarabun', sans-serif; 
            font-size: 14px; 
            line-height: 1.6; 
            color: #1f2937; 
            background: #f3f4f6; 
        }
        .container { 
            width: 210mm; 
            padding: 20mm 15mm; 
            margin: 0 auto; 
            background: white;
        }
        
        /* Header */
        .header {
            background: linear-gradient(135deg, #3b82f6 0%, #6366f1 50%, #8b5cf6 100%);
            margin: -20mm -15mm 25px -15mm;
            padding: 30px;
            color: white;
            border-radius: 0 0 20px 20px;
        }
        .header h1 { 
            font-size: 28px; 
            font-weight: 700;
            margin-bottom: 5px;
        }
        .header p { 
            opacity: 0.9; 
            font-size: 14px;
        }
        
        /* Section headers */
        h2 { 
            font-size: 16px; 
            color: #1e40af; 
            margin: 30px 0 15px 0; 
            padding: 12px 16px;
            background: linear-gradient(90deg, #dbeafe 0%, #eff6ff 100%);
            border-radius: 10px;
            border-left: 4px solid #3b82f6;
        }
        
        /* Summary cards */
        .summary-grid { 
            display: grid; 
            grid-template-columns: repeat(3, 1fr); 
            gap: 12px; 
            margin: 20px 0 25px 0; 
        }
        .summary-card { 
            padding: 18px 15px; 
            border-radius: 12px; 
            text-align: center;
            border: 1px solid #e5e7eb;
        }
        .summary-card.blue { background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-color: #93c5fd; }
        .summary-card.red { background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border-color: #fca5a5; }
        .summary-card.green { background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-color: #86efac; }
        .summary-card.amber { background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); border-color: #fcd34d; }
        .summary-card.rose { background: linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%); border-color: #fda4af; }
        .summary-card.purple { background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%); border-color: #c4b5fd; }
        
        .summary-label { font-size: 11px; color: #6b7280; margin-bottom: 4px; font-weight: 500; }
        .summary-value { font-size: 20px; font-weight: 700; color: #1f2937; }
        .summary-value.green { color: #16a34a; }
        .summary-value.red { color: #dc2626; }
        .summary-value.blue { color: #2563eb; }
        
        /* Tables */
        table { 
            width: 100%; 
            border-collapse: separate; 
            border-spacing: 0;
            margin-bottom: 20px; 
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        th { 
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
            padding: 12px 10px; 
            border-bottom: 2px solid #e2e8f0;
            text-align: left; 
            font-weight: 600;
            font-size: 12px;
            color: #475569;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        td {
            padding: 10px;
            border-bottom: 1px solid #f1f5f9;
            font-size: 13px;
        }
        tr:hover td { background: #f8fafc; }
        tr:last-child td { border-bottom: none; }
        
        /* Colors */
        .text-green { color: #16a34a; font-weight: 600; }
        .text-red { color: #dc2626; font-weight: 600; }
        .text-blue { color: #2563eb; font-weight: 600; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        
        /* Market sections */
        .market-section {
            page-break-inside: avoid;
            margin-bottom: 25px;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            overflow: hidden;
        }
        .market-header {
            background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%);
            padding: 12px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #c7d2fe;
        }
        .market-name { font-weight: 700; color: #4338ca; font-size: 14px; }
        .market-stats { font-size: 12px; color: #6366f1; }
        
        /* Footer */
        .footer { 
            margin-top: 40px; 
            text-align: center; 
            font-size: 11px; 
            color: #9ca3af;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
        }
        
        /* Print settings */
        @media print { 
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; } 
            .container { box-shadow: none; }
        }
        @page { size: A4; margin: 10mm; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 รายงานการขายละเอียด</h1>
            <p>ช่วงวันที่: ${formatDate(fromDate)} - ${formatDate(toDate)} | ${shopInfo?.shopName || 'ร้านค้า'}</p>
        </div>



        <!-- Summary Cards -->
        <div class="summary-grid">
            <div class="summary-card blue">
                <div class="summary-label">💰 รายได้รวม</div>
                <div class="summary-value blue">฿${summary.totalRevenue.toLocaleString()}</div>
            </div>
            <div class="summary-card red">
                <div class="summary-label">📦 ต้นทุนรวม</div>
                <div class="summary-value red">฿${summary.totalCost.toLocaleString()}</div>
            </div>
            <div class="summary-card green">
                <div class="summary-label">📈 กำไรขั้นต้น</div>
                <div class="summary-value green">฿${summary.totalProfit.toLocaleString()}</div>
            </div>
            <div class="summary-card amber">
                <div class="summary-label">🛒 จำนวนขาย</div>
                <div class="summary-value">${summary.totalQuantity} ชิ้น</div>
            </div>
            <div class="summary-card rose">
                <div class="summary-label">🗑️ ของเสีย</div>
                <div class="summary-value red">${summary.totalWaste} ชิ้น</div>
            </div>
            <div class="summary-card purple">
                <div class="summary-label">💸 มูลค่าของเสีย</div>
                <div class="summary-value red">฿${summary.wasteCost.toLocaleString()}</div>
            </div>
        </div>

        <p style="text-align:right;color:#666;font-size:12px;margin-bottom:20px;">(${numberToBahtText(summary.totalRevenue)})</p>

        <!-- By Market -->
        <h2>🏪 แยกตามตลาด</h2>
        <table>
            <thead>
                <tr>
                    <th>ตลาด</th>
                    <th style="text-align:right;">รายได้</th>
                    <th style="text-align:right;">ต้นทุน</th>
                    <th style="text-align:right;">กำไร</th>
                    <th style="text-align:center;">ชิ้น</th>
                    <th style="text-align:center;">เสีย</th>
                </tr>
            </thead>
            <tbody>${marketRows}</tbody>
        </table>

        <!-- Daily Breakdown -->
        <h2>📅 รายงานรายวัน</h2>
        <table>
            <thead>
                <tr>
                    <th>วันที่</th>
                    <th style="text-align:right;">รายได้</th>
                    <th style="text-align:right;">กำไร</th>
                    <th style="text-align:center;">ชิ้น</th>
                    <th style="text-align:center;">อากาศ</th>
                </tr>
            </thead>
            <tbody>${dailyRows}</tbody>
        </table>

        <!-- Top 10 Products -->
        <h2>🏆 Top 10 สินค้าขายดี</h2>
        <table>
            <thead>
                <tr>
                    <th style="text-align:center;width:40px;">#</th>
                    <th>สินค้า</th>
                    <th>หมวดหมู่</th>
                    <th style="text-align:center;">จำนวน</th>
                    <th style="text-align:right;">รายได้</th>
                    <th style="text-align:right;">กำไร</th>
                </tr>
            </thead>
            <tbody>${topProductRows}</tbody>
        </table>

        <!-- All Products -->
        <h2>📦 รายละเอียดทุกสินค้า</h2>
        <table>
            <thead>
                <tr>
                    <th>สินค้า</th>
                    <th>หมวดหมู่</th>
                    <th style="text-align:center;">จำนวน</th>
                    <th style="text-align:right;">รายได้</th>
                    <th style="text-align:right;">กำไร</th>
                </tr>
            </thead>
            <tbody>${allProductRows}</tbody>
        </table>

        <!-- NEW: Detailed Breakdown Per Market -->
        <h2 style="page-break-before:always;">📊 รายละเอียดแยกตามตลาด</h2>
        <p style="color:#666;font-size:12px;margin-bottom:15px;">แสดงสินค้าทั้งหมดที่ขายในแต่ละตลาด</p>
        ${perMarketSections}

        <div style="margin-top:30px;text-align:center;color:#999;font-size:11px;">
            พิมพ์เมื่อ: ${new Date().toLocaleString('th-TH')}
        </div>
    </div>
</body>
</html>`;

        printWindow.document.write(html);
        printWindow.document.close();
        setTimeout(() => {
            printWindow.print();
            setIsPrinting(false); // Reset loading state
        }, 300);
    }, [isPrinting, byMarket, byDate, topProducts, byProduct, productsByMarket, summary, fromDate, toDate, shopInfo]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto"
            onClick={handleBackdropClick}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
        >
            {/* #22: Backdrop click to dismiss - Stop propagation to prevent backdrop click when clicking modal content */}
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <BarChart3 className="w-6 h-6 text-white" />
                        <h2 id="modal-title" className="text-xl font-bold text-white">รายงานการขายแบบละเอียด</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white/80 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
                        aria-label="ปิด Modal"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Date Range Selector */}
                <div className="px-6 py-4 bg-gray-50 border-b flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-gray-500" />
                        <span className="text-gray-600">ช่วงวันที่:</span>
                    </div>
                    <input
                        type="date"
                        value={fromDate}
                        onChange={e => setFromDate(e.target.value)}
                        className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-gray-400">ถึง</span>
                    <input
                        type="date"
                        value={toDate}
                        onChange={e => setToDate(e.target.value)}
                        className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                        onClick={handlePrint}
                        disabled={isPrinting}
                        className={`ml-auto flex items-center gap-2 px-4 py-2 rounded-lg transition-all min-h-[44px] ${isPrinting
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                    >
                        {isPrinting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                กำลังโหลด...
                            </>
                        ) : (
                            <>
                                <Printer className="w-4 h-4" />
                                พิมพ์ / Export PDF
                            </>
                        )}
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Titan Analytics Insights */}
                    {/* Titan Analytics Insights -> Replaced by Oracle Core */}
                    <OracleInsightCard patterns={oraclePatterns} isLoading={isOracleLoading} />

                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        <div className="bg-blue-50 p-4 rounded-xl text-center">
                            <p className="text-xs text-blue-600 mb-1">รายได้รวม</p>
                            <p className="text-lg font-bold text-blue-700">{formatCurrency(summary.totalRevenue)}</p>
                        </div>
                        <div className="bg-red-50 p-4 rounded-xl text-center">
                            <p className="text-xs text-red-600 mb-1">ต้นทุนรวม</p>
                            <p className="text-lg font-bold text-red-700">{formatCurrency(summary.totalCost)}</p>
                        </div>
                        <div className="bg-green-50 p-4 rounded-xl text-center">
                            <p className="text-xs text-green-600 mb-1">กำไรขั้นต้น</p>
                            <p className="text-lg font-bold text-green-700">{formatCurrency(summary.totalProfit)}</p>
                        </div>
                        <div className="bg-amber-50 p-4 rounded-xl text-center">
                            <p className="text-xs text-amber-600 mb-1">จำนวนขาย</p>
                            <p className="text-lg font-bold text-amber-700">{summary.totalQuantity} ชิ้น</p>
                        </div>
                        <div className="bg-rose-50 p-4 rounded-xl text-center">
                            <p className="text-xs text-rose-600 mb-1">ของเสีย</p>
                            <p className="text-lg font-bold text-rose-700">{summary.totalWaste} ชิ้น</p>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-xl text-center">
                            <p className="text-xs text-purple-600 mb-1">มูลค่าเสีย</p>
                            <p className="text-lg font-bold text-purple-700">{formatCurrency(summary.wasteCost)}</p>
                        </div>
                    </div>

                    {/* By Market */}
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                            <Store className="w-5 h-5 text-blue-600" />
                            แยกตามตลาด
                        </h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-blue-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left">ตลาด</th>
                                        <th className="px-4 py-2 text-right">รายได้</th>
                                        <th className="px-4 py-2 text-right">ต้นทุน</th>
                                        <th className="px-4 py-2 text-right">กำไร</th>
                                        <th className="px-4 py-2 text-center">ชิ้น</th>
                                        <th className="px-4 py-2 text-center">เสีย</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {byMarket.map(m => (
                                        <tr key={m.marketId} className="border-b">
                                            <td className="px-4 py-2 font-medium">{m.marketName}</td>
                                            <td className="px-4 py-2 text-right">{formatCurrency(m.revenue)}</td>
                                            <td className="px-4 py-2 text-right text-red-600">{formatCurrency(m.cost)}</td>
                                            <td className={`px-4 py-2 text-right font-bold ${m.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {formatCurrency(m.profit)}
                                            </td>
                                            <td className="px-4 py-2 text-center">{m.quantity}</td>
                                            <td className="px-4 py-2 text-center text-red-500">{m.waste}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Top Products */}
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-green-600" />
                            Top 10 สินค้าขายดี
                        </h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-green-50">
                                    <tr>
                                        <th className="px-4 py-2 text-center w-10">#</th>
                                        <th className="px-4 py-2 text-left">สินค้า</th>
                                        <th className="px-4 py-2 text-left">หมวดหมู่</th>
                                        <th className="px-4 py-2 text-center">จำนวน</th>
                                        <th className="px-4 py-2 text-right">รายได้</th>
                                        <th className="px-4 py-2 text-right">กำไร</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {topProducts.map((p, idx) => (
                                        <tr key={p.productId} className="border-b">
                                            <td className="px-4 py-2 text-center font-bold text-amber-600">{idx + 1}</td>
                                            <td className="px-4 py-2 font-medium">{p.productName}</td>
                                            <td className="px-4 py-2 text-gray-500">{p.category}</td>
                                            <td className="px-4 py-2 text-center">{p.quantity}</td>
                                            <td className="px-4 py-2 text-right">{formatCurrency(p.revenue)}</td>
                                            <td className="px-4 py-2 text-right text-green-600 font-bold">{formatCurrency(p.profit)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Daily Breakdown */}
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-purple-600" />
                            รายงานรายวัน
                        </h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-purple-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left">วันที่</th>
                                        <th className="px-4 py-2 text-right">รายได้</th>
                                        <th className="px-4 py-2 text-right">กำไร</th>
                                        <th className="px-4 py-2 text-center">ชิ้น</th>
                                        <th className="px-4 py-2 text-center">อากาศ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {byDate.map(d => (
                                        <tr key={d.date} className="border-b">
                                            <td className="px-4 py-2">{new Date(d.date).toLocaleDateString('th-TH')}</td>
                                            <td className="px-4 py-2 text-right">{formatCurrency(d.revenue)}</td>
                                            <td className={`px-4 py-2 text-right font-bold ${d.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {formatCurrency(d.profit)}
                                            </td>
                                            <td className="px-4 py-2 text-center">{d.quantity}</td>
                                            <td className="px-4 py-2 text-center text-xl">
                                                {d.weather ? weatherIcons[d.weather] : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* NEW: Per Market Product Breakdown */}
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                            <Package className="w-5 h-5 text-indigo-600" />
                            รายละเอียดแยกตามตลาด
                        </h3>
                        <div className="space-y-4">
                            {productsByMarket.map(market => {
                                const marketTotalRevenue = market.products.reduce((s, p) => s + p.revenue, 0);
                                const marketTotalProfit = market.products.reduce((s, p) => s + p.profit, 0);
                                const marketTotalQty = market.products.reduce((s, p) => s + p.quantity, 0);

                                return (
                                    <div key={market.marketId} className="border rounded-xl overflow-hidden">
                                        <div className="bg-indigo-50 px-4 py-3 flex justify-between items-center">
                                            <span className="font-bold text-indigo-800">🏪 {market.marketName}</span>
                                            <div className="text-sm text-indigo-600">
                                                {marketTotalQty} ชิ้น | {formatCurrency(marketTotalRevenue)} | กำไร {formatCurrency(marketTotalProfit)}
                                            </div>
                                        </div>
                                        <table className="w-full text-xs">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-3 py-2 text-left">สินค้า</th>
                                                    <th className="px-3 py-2 text-left">หมวด</th>
                                                    <th className="px-3 py-2 text-center">จำนวน</th>
                                                    <th className="px-3 py-2 text-right">รายได้</th>
                                                    <th className="px-3 py-2 text-right">ต้นทุน</th>
                                                    <th className="px-3 py-2 text-right">กำไร</th>
                                                    <th className="px-3 py-2 text-center">เสีย</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {market.products.map((p, idx) => (
                                                    <tr key={idx} className="border-t">
                                                        <td className="px-3 py-1.5">{p.productName}</td>
                                                        <td className="px-3 py-1.5 text-gray-500">{p.category}</td>
                                                        <td className="px-3 py-1.5 text-center">{p.quantity}</td>
                                                        <td className="px-3 py-1.5 text-right">{formatCurrency(p.revenue)}</td>
                                                        <td className="px-3 py-1.5 text-right text-red-500">{formatCurrency(p.cost)}</td>
                                                        <td className="px-3 py-1.5 text-right text-green-600 font-bold">{formatCurrency(p.profit)}</td>
                                                        <td className="px-3 py-1.5 text-center text-red-500">{p.waste > 0 ? p.waste : '-'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
