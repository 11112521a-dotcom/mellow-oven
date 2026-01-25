// ============================================================
// Invoice PDF Component
// Preview and print invoice as PDF
// ============================================================

import React from 'react';
import { useStore } from '../../store';
import { Invoice } from '../../../types';
import { X, Printer } from 'lucide-react';
import { numberToBahtText } from '../../utils/bahtText';

interface InvoicePDFProps {
    invoice: Invoice;
    onClose: () => void;
}

export const InvoicePDF: React.FC<InvoicePDFProps> = ({ invoice, onClose }) => {
    const { shopInfo } = useStore();

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

        const itemsHtml = invoice.items.map((item, idx) => `
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

        const discountRow = invoice.discountAmount > 0
            ? `<div style="display:flex;justify-content:space-between;padding:5px 0;color:#dc2626;">
                <span>ส่วนลด ${invoice.discountNote ? `(${invoice.discountNote})` : ''}</span>
                <span>-฿${invoice.discountAmount.toLocaleString()}</span>
               </div>`
            : '';

        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>ใบแจ้งหนี้ ${invoice.invoiceNumber}</title>
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Sarabun', 'Tahoma', sans-serif; font-size: 14px; line-height: 1.5; color: #333; background: white; }
        .container { width: 210mm; min-height: 297mm; padding: 15mm; margin: 0 auto; background: white; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 13px; }
        th { background: #dbeafe; font-weight: 600; text-align: left; border: 1px solid #d1d5db; padding: 10px 8px; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .container { padding: 10mm; } }
        @page { size: A4; margin: 0; }
    </style>
</head>
<body>
    <div class="container">
        <div style="display:flex;justify-content:space-between;border-bottom:2px solid #1e40af;padding-bottom:15px;margin-bottom:20px;">
            <div style="display:flex;gap:15px;align-items:flex-start;">
                ${logoImg}
                <div>
                    <div style="font-size:20px;font-weight:700;color:#1a1a1a;">${shopInfo?.shopName || 'ร้านค้า'}</div>
                    <div style="font-size:12px;color:#666;">${addr}</div>
                    <div style="font-size:12px;color:#666;">โทร: ${shopInfo?.phone || ''}</div>
                </div>
            </div>
            <div style="text-align:right;">
                <div style="font-size:22px;font-weight:700;color:#1e40af;margin-bottom:5px;">ใบแจ้งหนี้</div>
                <div style="font-size:13px;color:#444;">เลขที่: ${invoice.invoiceNumber}</div>
                <div style="font-size:13px;color:#444;">วันที่: ${new Date(invoice.createdAt).toLocaleDateString('th-TH')}</div>
                <div style="font-size:13px;color:#dc2626;font-weight:600;">ครบกำหนด: ${new Date(invoice.dueDate).toLocaleDateString('th-TH')}</div>
            </div>
        </div>
        
        <div style="margin-bottom:15px;">
            <div style="font-weight:600;color:#333;margin-bottom:8px;">เรียกเก็บจาก:</div>
            <div style="font-size:13px;color:#444;">${invoice.customerName}</div>
            ${invoice.customerContact ? `<div style="font-size:13px;color:#444;">ผู้ติดต่อ: ${invoice.customerContact}</div>` : ''}
            ${invoice.customerPhone ? `<div style="font-size:13px;color:#444;">โทร: ${invoice.customerPhone}</div>` : ''}
            ${invoice.customerAddress ? `<div style="font-size:13px;color:#444;">ที่อยู่: ${invoice.customerAddress}</div>` : ''}
        </div>
        
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
        
        <div style="display:flex;justify-content:flex-end;margin:15px 0;">
            <div style="width:200px;">
                <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:13px;">
                    <span>รวม</span>
                    <span>฿${invoice.subtotal.toLocaleString()}</span>
                </div>
                ${discountRow}
                <div style="display:flex;justify-content:space-between;padding:10px 0 5px 0;font-size:18px;font-weight:700;border-top:2px solid #1e40af;margin-top:5px;color:#1e40af;">
                    <span>ยอดชำระ</span>
                    <span>฿${invoice.totalPrice.toLocaleString()}</span>
                </div>
                <div style="font-size:12px;color:#666;text-align:right;margin-top:5px;">(${numberToBahtText(invoice.totalPrice)})</div>
            </div>
        </div>
        
        ${invoice.paymentTerms ? `<div style="background:#dbeafe;padding:12px;border-radius:5px;margin:15px 0;">
            <div style="font-weight:600;margin-bottom:5px;">เงื่อนไขการชำระ:</div>
            <p style="font-size:13px;color:#1e40af;">${invoice.paymentTerms}</p>
        </div>` : ''}
        
        ${shopInfo?.bankName ? `
            <div style="background:#eff6ff;padding:12px;border-radius:5px;margin:15px 0;">
                <div style="font-weight:600;margin-bottom:8px;">ข้อมูลบัญชีธนาคาร:</div>
                <p style="font-size:12px;color:#444;margin:3px 0;">ธนาคาร: ${shopInfo.bankName}</p>
                <p style="font-size:12px;color:#444;margin:3px 0;">ชื่อบัญชี: ${shopInfo.bankAccountName}</p>
                <p style="font-size:12px;color:#444;margin:3px 0;">เลขที่บัญชี: ${shopInfo.bankAccountNumber}</p>
            </div>
        ` : ''}
        
        <div style="display:flex;gap:50px;margin-top:40px;">
            <div style="flex:1;text-align:center;">
                <div style="border-bottom:1px solid #333;height:50px;margin-bottom:8px;"></div>
                <div style="font-size:13px;color:#444;">ผู้ออกใบแจ้งหนี้</div>
                ${shopInfo?.ownerName ? `<div style="font-size:11px;color:#666;">(${shopInfo.ownerName})</div>` : ''}
            </div>
            <div style="flex:1;text-align:center;">
                <div style="border-bottom:1px solid #333;height:50px;margin-bottom:8px;"></div>
                <div style="font-size:13px;color:#444;">ผู้รับใบแจ้งหนี้</div>
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
                <div className="bg-gradient-to-r from-blue-700 to-indigo-700 px-6 py-4 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">ใบแจ้งหนี้ {invoice.invoiceNumber}</h2>
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

                {/* Preview Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-100">
                    <div className="bg-white p-8 shadow-lg mx-auto max-w-3xl">
                        {/* Header */}
                        <div className="flex justify-between items-start border-b-2 border-blue-700 pb-4 mb-6">
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
                                <h2 className="text-xl font-bold text-blue-700">ใบแจ้งหนี้</h2>
                                <p className="text-gray-600">เลขที่: {invoice.invoiceNumber}</p>
                                <p className="text-gray-600">วันที่: {new Date(invoice.createdAt).toLocaleDateString('th-TH')}</p>
                                <p className="text-red-600 font-semibold">ครบกำหนด: {new Date(invoice.dueDate).toLocaleDateString('th-TH')}</p>
                            </div>
                        </div>

                        {/* Customer */}
                        <div className="mb-6">
                            <h3 className="font-bold text-gray-700 mb-2">เรียกเก็บจาก:</h3>
                            <p className="text-gray-800">{invoice.customerName}</p>
                            {invoice.customerContact && <p className="text-gray-600">ผู้ติดต่อ: {invoice.customerContact}</p>}
                            {invoice.customerPhone && <p className="text-gray-600">โทร: {invoice.customerPhone}</p>}
                            {invoice.customerAddress && <p className="text-gray-600">ที่อยู่: {invoice.customerAddress}</p>}
                        </div>

                        {/* Items Table */}
                        <table className="w-full border-collapse mb-6">
                            <thead>
                                <tr className="bg-blue-100">
                                    <th className="border border-gray-300 px-3 py-2 text-center w-12">ลำดับ</th>
                                    <th className="border border-gray-300 px-3 py-2 text-left">รายการ</th>
                                    <th className="border border-gray-300 px-3 py-2 text-center w-16">จำนวน</th>
                                    <th className="border border-gray-300 px-3 py-2 text-right w-24">ราคา/หน่วย</th>
                                    <th className="border border-gray-300 px-3 py-2 text-right w-24">รวม</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoice.items.map((item, idx) => (
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
                                    <span>฿{invoice.subtotal.toLocaleString()}</span>
                                </div>
                                {invoice.discountAmount > 0 && (
                                    <div className="flex justify-between text-red-600">
                                        <span>ส่วนลด {invoice.discountNote && `(${invoice.discountNote})`}</span>
                                        <span>-฿{invoice.discountAmount.toLocaleString()}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-lg font-bold border-t-2 border-blue-700 pt-2 text-blue-700">
                                    <span>ยอดชำระ</span>
                                    <span>฿{invoice.totalPrice.toLocaleString()}</span>
                                </div>
                                <p className="text-sm text-gray-500 text-right mt-1">({numberToBahtText(invoice.totalPrice)})</p>
                            </div>
                        </div>

                        {/* Bank Info */}
                        {shopInfo?.bankName && (
                            <div className="mb-6 bg-blue-50 p-4 rounded-lg">
                                <h3 className="font-bold text-gray-700 mb-2">ข้อมูลบัญชีธนาคาร:</h3>
                                <p className="text-gray-600">ธนาคาร: {shopInfo.bankName}</p>
                                <p className="text-gray-600">ชื่อบัญชี: {shopInfo.bankAccountName}</p>
                                <p className="text-gray-600">เลขที่บัญชี: {shopInfo.bankAccountNumber}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
