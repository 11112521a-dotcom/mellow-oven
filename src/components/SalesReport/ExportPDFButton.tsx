import React from 'react';
import { FileDown, Printer } from 'lucide-react';

interface ExportPDFButtonProps {
    summary: {
        totalRevenue: number;
        totalCost: number;
        totalProfit: number;
        totalQuantity: number;
        profitMargin: number;
    };
    dateRange: { start: string; end: string };
    marketName: string;
}

export const ExportPDFButton: React.FC<ExportPDFButtonProps> = ({ summary, dateRange, marketName }) => {

    const handleExport = () => {
        // Create a new window for printing
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('กรุณาอนุญาต popup เพื่อ export PDF');
            return;
        }

        const formatCurrency = (num: number) => `฿${num.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;
        const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('th-TH', {
            year: 'numeric', month: 'long', day: 'numeric'
        });

        const html = `
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <title>รายงานการขาย - Mellow Oven</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Sarabun', 'Kanit', sans-serif; 
            padding: 40px; 
            color: #333;
            max-width: 800px;
            margin: 0 auto;
        }
        .header { 
            text-align: center; 
            border-bottom: 3px solid #6B4423; 
            padding-bottom: 20px; 
            margin-bottom: 30px; 
        }
        .header h1 { font-size: 28px; color: #6B4423; margin-bottom: 5px; }
        .header p { color: #888; font-size: 14px; }
        .date-range { 
            background: #f5f5f5; 
            padding: 15px 20px; 
            border-radius: 8px; 
            margin-bottom: 30px;
            text-align: center;
        }
        .date-range span { font-weight: bold; color: #6B4423; }
        .summary-grid { 
            display: grid; 
            grid-template-columns: repeat(3, 1fr); 
            gap: 20px; 
            margin-bottom: 30px; 
        }
        .stat-card { 
            background: linear-gradient(135deg, #f8f4f0 0%, #fff 100%);
            padding: 20px; 
            border-radius: 12px; 
            text-align: center;
            border: 1px solid #e0d5c8;
        }
        .stat-card.profit { background: linear-gradient(135deg, #d4edda 0%, #fff 100%); border-color: #28a745; }
        .stat-card.revenue { background: linear-gradient(135deg, #cce5ff 0%, #fff 100%); border-color: #007bff; }
        .stat-card .label { font-size: 12px; color: #666; margin-bottom: 5px; }
        .stat-card .value { font-size: 24px; font-weight: bold; color: #333; }
        .stat-card .sub { font-size: 11px; color: #888; margin-top: 3px; }
        .footer { 
            margin-top: 40px; 
            text-align: center; 
            font-size: 11px; 
            color: #999;
            border-top: 1px solid #eee;
            padding-top: 20px;
        }
        @media print {
            body { padding: 20px; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🥐 รายงานการขาย</h1>
        <p>Mellow Oven - Sales Report</p>
    </div>
    
    <div class="date-range">
        📅 ช่วงเวลา: <span>${formatDate(dateRange.start)}</span> - <span>${formatDate(dateRange.end)}</span>
        <br>🏪 ตลาด: <span>${marketName}</span>
    </div>
    
    <div class="summary-grid">
        <div class="stat-card revenue">
            <div class="label">💰 รายรับรวม</div>
            <div class="value">${formatCurrency(summary.totalRevenue)}</div>
        </div>
        <div class="stat-card">
            <div class="label">📦 ขายได้</div>
            <div class="value">${summary.totalQuantity.toLocaleString()}</div>
            <div class="sub">ชิ้น</div>
        </div>
        <div class="stat-card profit">
            <div class="label">📈 กำไรสุทธิ</div>
            <div class="value">${formatCurrency(summary.totalProfit)}</div>
            <div class="sub">Margin: ${summary.profitMargin.toFixed(1)}%</div>
        </div>
    </div>
    
    <div class="summary-grid">
        <div class="stat-card">
            <div class="label">💼 ต้นทุนรวม</div>
            <div class="value">${formatCurrency(summary.totalCost)}</div>
        </div>
        <div class="stat-card">
            <div class="label">💵 กำไร/ชิ้น</div>
            <div class="value">${summary.totalQuantity > 0 ? formatCurrency(summary.totalProfit / summary.totalQuantity) : '฿0'}</div>
        </div>
        <div class="stat-card">
            <div class="label">📊 ราคาเฉลี่ย/ชิ้น</div>
            <div class="value">${summary.totalQuantity > 0 ? formatCurrency(summary.totalRevenue / summary.totalQuantity) : '฿0'}</div>
        </div>
    </div>
    
    <div class="footer">
        <p>Generated by Mellow Oven POS • ${new Date().toLocaleString('th-TH')}</p>
    </div>
    
    <script>
        window.onload = function() { window.print(); }
    </script>
</body>
</html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
    };

    return (
        <button
            onClick={handleExport}
            className="bg-white/10 backdrop-blur-lg rounded-xl p-3 flex items-center gap-2 border border-white/10 text-white hover:bg-white/20 transition-all"
            title="Export PDF"
        >
            <FileDown size={18} className="text-cafe-200" />
            <span className="font-medium">Export PDF</span>
        </button>
    );
};
