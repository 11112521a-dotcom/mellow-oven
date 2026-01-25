// ============================================================
// Quotation PDF Component
// Preview and print quotation as PDF
// ============================================================

import React, { useRef } from 'react';
import { useStore } from '../../store';
import { Quotation } from '../../../types';
import { X, Printer } from 'lucide-react';

interface QuotationPDFProps {
    quotation: Quotation;
    onClose: () => void;
}

export const QuotationPDF: React.FC<QuotationPDFProps> = ({
    quotation,
    onClose
}) => {
    const { shopInfo } = useStore();
    const printRef = useRef<HTMLDivElement>(null);

    // Format address
    const formatAddress = () => {
        if (!shopInfo) return '';
        const parts = [
            shopInfo.addressNumber,
            shopInfo.addressMoo && `หมู่ ${shopInfo.addressMoo}`,
            shopInfo.addressSoi && `ซอย ${shopInfo.addressSoi}`,
            shopInfo.addressRoad && `ถนน ${shopInfo.addressRoad}`,
            shopInfo.addressSubdistrict && `ตำบล/แขวง ${shopInfo.addressSubdistrict}`,
            shopInfo.addressDistrict && `อำเภอ/เขต ${shopInfo.addressDistrict}`,
            shopInfo.addressProvince,
            shopInfo.addressPostalCode
        ].filter(Boolean);
        return parts.join(' ');
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const addr = formatAddress();
        const logoImg = shopInfo?.logoUrl ? `<img src="${shopInfo.logoUrl}" alt="Logo" style="width:60px;height:60px;object-fit:contain;" />` : '';

        const itemsHtml = quotation.items.map((item, idx) => `
            <tr>
                <td style="text-align:center;border:1px solid #d1d5db;padding:8px;">${idx + 1}</td>
                <td style="border:1px solid #d1d5db;padding:8px;">
                    ${item.name}
                    ${item.description ? `<div style="font-size:11px;color:#666;">${item.description}</div>` : ''}
                </td>
                <td style="text-align:center;border:1px solid #d1d5db;padding:8px;">${item.quantity}</td>
                <td style="text-align:right;border:1px solid #d1d5db;padding:8px;">฿${item.unitPrice.toLocaleString()}</td>
                <td style="text-align:right;border:1px solid #d1d5db;padding:8px;">฿${item.lineTotal.toLocaleString()}</td>
            </tr>
        `).join('');

        const discountRow = quotation.discountAmount > 0
            ? `<div style="display:flex;justify-content:space-between;padding:5px 0;color:#dc2626;">
                <span>ส่วนลด ${quotation.discountNote ? `(${quotation.discountNote})` : ''}</span>
                <span>-฿${quotation.discountAmount.toLocaleString()}</span>
               </div>`
            : '';

        const conditionsHtml = quotation.conditions
            ? `<div style="background:#f9fafb;padding:12px;border-radius:5px;margin:15px 0;">
                <div style="font-weight:600;margin-bottom:8px;">เงื่อนไข:</div>
                <p style="font-size:12px;color:#555;white-space:pre-line;">${quotation.conditions}</p>
               </div>`
            : '';

        const bankHtml = shopInfo?.bankName
            ? `<div style="background:#eff6ff;padding:12px;border-radius:5px;margin:15px 0;">
                <div style="font-weight:600;margin-bottom:8px;">ข้อมูลบัญชีธนาคาร:</div>
                <p style="font-size:12px;color:#444;margin:3px 0;">ธนาคาร: ${shopInfo.bankName}</p>
                <p style="font-size:12px;color:#444;margin:3px 0;">ชื่อบัญชี: ${shopInfo.bankAccountName}</p>
                <p style="font-size:12px;color:#444;margin:3px 0;">เลขที่บัญชี: ${shopInfo.bankAccountNumber}</p>
               </div>`
            : '';

        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>ใบเสนอราคา ${quotation.quotationNumber}</title>
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
            font-family: 'Sarabun', 'Tahoma', sans-serif; 
            font-size: 14px;
            line-height: 1.5;
            color: #333;
            background: white;
        }
        .container {
            width: 210mm;
            min-height: 297mm;
            padding: 15mm;
            margin: 0 auto;
            background: white;
        }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 13px; }
        th { background: #f3f4f6; font-weight: 600; text-align: left; border: 1px solid #d1d5db; padding: 10px 8px; }
        @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .container { padding: 10mm; }
        }
        @page { size: A4; margin: 0; }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div style="display:flex;justify-content:space-between;border-bottom:2px solid #333;padding-bottom:15px;margin-bottom:20px;">
            <div style="display:flex;gap:15px;align-items:flex-start;">
                ${logoImg}
                <div>
                    <div style="font-size:20px;font-weight:700;color:#1a1a1a;">${shopInfo?.shopName || 'ร้านค้า'}</div>
                    <div style="font-size:12px;color:#666;">${addr}</div>
                    <div style="font-size:12px;color:#666;">โทร: ${shopInfo?.phone || ''}</div>
                </div>
            </div>
            <div style="text-align:right;">
                <div style="font-size:22px;font-weight:700;color:#2563eb;margin-bottom:5px;">ใบเสนอราคา</div>
                <div style="font-size:13px;color:#444;">เลขที่: ${quotation.quotationNumber}</div>
                <div style="font-size:13px;color:#444;">วันที่: ${new Date(quotation.createdAt).toLocaleDateString('th-TH')}</div>
            </div>
        </div>
        
        <!-- Customer -->
        <div style="margin-bottom:15px;">
            <div style="font-weight:600;color:#333;margin-bottom:8px;">เสนอราคาแก่:</div>
            <div style="font-size:13px;color:#444;">${quotation.customerName}</div>
            ${quotation.customerContact ? `<div style="font-size:13px;color:#444;">ผู้ติดต่อ: ${quotation.customerContact}</div>` : ''}
            ${quotation.customerPhone ? `<div style="font-size:13px;color:#444;">โทร: ${quotation.customerPhone}</div>` : ''}
            ${quotation.customerAddress ? `<div style="font-size:13px;color:#444;">ที่อยู่: ${quotation.customerAddress}</div>` : ''}
        </div>
        
        <!-- Items Table -->
        <table>
            <thead>
                <tr>
                    <th style="text-align:center;width:40px;">ลำดับ</th>
                    <th>รายการ</th>
                    <th style="text-align:center;width:60px;">จำนวน</th>
                    <th style="text-align:right;width:80px;">ราคา/หน่วย</th>
                    <th style="text-align:right;width:80px;">รวม</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHtml}
            </tbody>
        </table>
        
        <!-- Totals -->
        <div style="display:flex;justify-content:flex-end;margin:15px 0;">
            <div style="width:200px;">
                <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:13px;">
                    <span>รวม</span>
                    <span>฿${quotation.subtotal.toLocaleString()}</span>
                </div>
                ${discountRow}
                <div style="display:flex;justify-content:space-between;padding:10px 0 5px 0;font-size:16px;font-weight:700;border-top:2px solid #333;margin-top:5px;">
                    <span>รวมทั้งสิ้น</span>
                    <span>฿${quotation.totalPrice.toLocaleString()}</span>
                </div>
                ${quotation.totalPriceText ? `<div style="font-size:11px;color:#666;text-align:right;margin-top:5px;">(${quotation.totalPriceText})</div>` : ''}
            </div>
        </div>
        
        ${conditionsHtml}
        ${bankHtml}
        
        <div style="font-size:11px;color:#666;margin:15px 0;">
            ใบเสนอราคานี้มีอายุ ${quotation.validityDays} วัน นับจากวันที่ออก
        </div>
        
        <!-- Signatures -->
        <div style="display:flex;gap:50px;margin-top:40px;">
            <div style="flex:1;text-align:center;">
                <div style="border-bottom:1px solid #333;height:50px;margin-bottom:8px;"></div>
                <div style="font-size:13px;color:#444;">ผู้เสนอราคา</div>
                ${shopInfo?.ownerName ? `<div style="font-size:11px;color:#666;">(${shopInfo.ownerName})</div>` : ''}
            </div>
            <div style="flex:1;text-align:center;">
                <div style="border-bottom:1px solid #333;height:50px;margin-bottom:8px;"></div>
                <div style="font-size:13px;color:#444;">ผู้รับใบเสนอราคา</div>
            </div>
        </div>
    </div>
</body>
</html>`;

        printWindow.document.write(html);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 300);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">ใบเสนอราคา {quotation.quotationNumber}</h2>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30"
                        >
                            <Printer className="w-4 h-4" />
                            พิมพ์
                        </button>
                        <button onClick={onClose} className="text-white/80 hover:text-white">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* PDF Preview */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-100">
                    <div ref={printRef} className="bg-white p-8 shadow-lg mx-auto max-w-3xl">
                        {/* Header */}
                        <div className="flex justify-between items-start border-b-2 border-gray-800 pb-4 mb-6">
                            <div className="flex items-center gap-4">
                                {shopInfo?.logoUrl && (
                                    <img src={shopInfo.logoUrl} alt="Logo" className="w-16 h-16 object-contain" />
                                )}
                                <div>
                                    <h1 className="text-xl font-bold text-gray-800">{shopInfo?.shopName || 'ร้านค้า'}</h1>
                                    <p className="text-sm text-gray-600">{formatAddress()}</p>
                                    <p className="text-sm text-gray-600">โทร: {shopInfo?.phone}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <h2 className="text-xl font-bold text-blue-600">ใบเสนอราคา</h2>
                                <p className="text-gray-600">เลขที่: {quotation.quotationNumber}</p>
                                <p className="text-gray-600">วันที่: {new Date(quotation.createdAt).toLocaleDateString('th-TH')}</p>
                            </div>
                        </div>

                        {/* Customer */}
                        <div className="mb-6">
                            <h3 className="font-bold text-gray-700 mb-2">เสนอราคาแก่:</h3>
                            <p className="text-gray-800">{quotation.customerName}</p>
                            {quotation.customerContact && <p className="text-gray-600">ผู้ติดต่อ: {quotation.customerContact}</p>}
                            {quotation.customerPhone && <p className="text-gray-600">โทร: {quotation.customerPhone}</p>}
                            {quotation.customerAddress && <p className="text-gray-600">ที่อยู่: {quotation.customerAddress}</p>}
                        </div>

                        {/* Items Table */}
                        <table className="w-full border-collapse mb-6">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="border border-gray-300 px-3 py-2 text-center w-12">ลำดับ</th>
                                    <th className="border border-gray-300 px-3 py-2 text-left">รายการ</th>
                                    <th className="border border-gray-300 px-3 py-2 text-center w-16">จำนวน</th>
                                    <th className="border border-gray-300 px-3 py-2 text-right w-24">ราคา/หน่วย</th>
                                    <th className="border border-gray-300 px-3 py-2 text-right w-24">รวม</th>
                                </tr>
                            </thead>
                            <tbody>
                                {quotation.items.map((item, idx) => (
                                    <tr key={idx}>
                                        <td className="border border-gray-300 px-3 py-2 text-center">{idx + 1}</td>
                                        <td className="border border-gray-300 px-3 py-2">
                                            <div>{item.name}</div>
                                            {item.description && <div className="text-sm text-gray-500">{item.description}</div>}
                                        </td>
                                        <td className="border border-gray-300 px-3 py-2 text-center">{item.quantity}</td>
                                        <td className="border border-gray-300 px-3 py-2 text-right">฿{item.unitPrice.toLocaleString()}</td>
                                        <td className="border border-gray-300 px-3 py-2 text-right">฿{item.lineTotal.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Totals */}
                        <div className="flex justify-end mb-6">
                            <div className="w-56 space-y-2">
                                <div className="flex justify-between">
                                    <span>รวม</span>
                                    <span>฿{quotation.subtotal.toLocaleString()}</span>
                                </div>
                                {quotation.discountAmount > 0 && (
                                    <div className="flex justify-between text-red-600">
                                        <span>ส่วนลด {quotation.discountNote && `(${quotation.discountNote})`}</span>
                                        <span>-฿{quotation.discountAmount.toLocaleString()}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-lg font-bold border-t-2 border-gray-800 pt-2">
                                    <span>รวมทั้งสิ้น</span>
                                    <span>฿{quotation.totalPrice.toLocaleString()}</span>
                                </div>
                                {quotation.totalPriceText && (
                                    <p className="text-sm text-gray-600 text-right">({quotation.totalPriceText})</p>
                                )}
                            </div>
                        </div>

                        {/* Conditions */}
                        {quotation.conditions && (
                            <div className="mb-6 bg-gray-50 p-4 rounded-lg">
                                <h3 className="font-bold text-gray-700 mb-2">เงื่อนไข:</h3>
                                <p className="text-sm text-gray-600 whitespace-pre-line">{quotation.conditions}</p>
                            </div>
                        )}

                        {/* Bank Info */}
                        {shopInfo?.bankName && (
                            <div className="mb-6 bg-blue-50 p-4 rounded-lg">
                                <h3 className="font-bold text-gray-700 mb-2">ข้อมูลบัญชีธนาคาร:</h3>
                                <p className="text-gray-600">ธนาคาร: {shopInfo.bankName}</p>
                                <p className="text-gray-600">ชื่อบัญชี: {shopInfo.bankAccountName}</p>
                                <p className="text-gray-600">เลขที่บัญชี: {shopInfo.bankAccountNumber}</p>
                            </div>
                        )}

                        {/* Validity */}
                        <div className="text-sm text-gray-500 mb-6">
                            ใบเสนอราคานี้มีอายุ {quotation.validityDays} วัน นับจากวันที่ออก
                        </div>

                        {/* Signatures */}
                        <div className="grid grid-cols-2 gap-8 mt-12">
                            <div className="text-center">
                                <div className="border-b border-gray-400 mb-2 h-12"></div>
                                <p className="text-gray-600">ผู้เสนอราคา</p>
                                {shopInfo?.ownerName && <p className="text-sm text-gray-500">({shopInfo.ownerName})</p>}
                            </div>
                            <div className="text-center">
                                <div className="border-b border-gray-400 mb-2 h-12"></div>
                                <p className="text-gray-600">ผู้รับใบเสนอราคา</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
