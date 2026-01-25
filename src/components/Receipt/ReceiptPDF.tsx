// ============================================================
// Receipt PDF Component
// Preview and print receipt as PDF
// ============================================================

import React from 'react';
import { useStore } from '../../store';
import { Receipt, PaymentMethod } from '../../../types';
import { X, Printer } from 'lucide-react';
import { numberToBahtText } from '../../utils/bahtText';

interface ReceiptPDFProps {
    receipt: Receipt;
    onClose: () => void;
}

const paymentMethodLabels: Record<PaymentMethod, string> = {
    cash: 'เงินสด',
    transfer: 'โอนเงิน',
    credit: 'บัตรเครดิต',
    other: 'อื่นๆ'
};

export const ReceiptPDF: React.FC<ReceiptPDFProps> = ({ receipt, onClose }) => {
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

        const itemsHtml = receipt.items.map((item, idx) => `
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

        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>ใบเสร็จรับเงิน ${receipt.receiptNumber}</title>
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Sarabun', 'Tahoma', sans-serif; font-size: 14px; line-height: 1.5; color: #333; background: white; }
        .container { width: 210mm; min-height: 297mm; padding: 15mm; margin: 0 auto; background: white; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 13px; }
        th { background: #dcfce7; font-weight: 600; text-align: left; border: 1px solid #d1d5db; padding: 10px 8px; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .container { padding: 10mm; } }
        @page { size: A4; margin: 0; }
    </style>
</head>
<body>
    <div class="container">
        <div style="display:flex;justify-content:space-between;border-bottom:2px solid #16a34a;padding-bottom:15px;margin-bottom:20px;">
            <div style="display:flex;gap:15px;align-items:flex-start;">
                ${logoImg}
                <div>
                    <div style="font-size:20px;font-weight:700;color:#1a1a1a;">${shopInfo?.shopName || 'ร้านค้า'}</div>
                    <div style="font-size:12px;color:#666;">${addr}</div>
                    <div style="font-size:12px;color:#666;">โทร: ${shopInfo?.phone || ''}</div>
                </div>
            </div>
            <div style="text-align:right;">
                <div style="font-size:22px;font-weight:700;color:#16a34a;margin-bottom:5px;">ใบเสร็จรับเงิน</div>
                <div style="font-size:13px;color:#444;">เลขที่: ${receipt.receiptNumber}</div>
                <div style="font-size:13px;color:#444;">วันที่รับเงิน: ${new Date(receipt.paymentDate).toLocaleDateString('th-TH')}</div>
            </div>
        </div>
        
        <div style="margin-bottom:15px;">
            <div style="font-weight:600;color:#333;margin-bottom:8px;">ได้รับเงินจาก:</div>
            <div style="font-size:13px;color:#444;">${receipt.customerName}</div>
            ${receipt.customerPhone ? `<div style="font-size:13px;color:#444;">โทร: ${receipt.customerPhone}</div>` : ''}
            ${receipt.customerAddress ? `<div style="font-size:13px;color:#444;">ที่อยู่: ${receipt.customerAddress}</div>` : ''}
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
            <div style="width:220px;background:#dcfce7;padding:15px;border-radius:8px;">
                <div style="display:flex;justify-content:space-between;font-size:18px;font-weight:700;color:#16a34a;">
                    <span>รับเงินทั้งสิ้น</span>
                    <span>฿${receipt.totalPrice.toLocaleString()}</span>
                </div>
                <div style="font-size:12px;color:#444;text-align:center;margin-top:8px;">(${numberToBahtText(receipt.totalPrice)})</div>
                <div style="margin-top:10px;font-size:12px;color:#444;">
                    ชำระโดย: ${paymentMethodLabels[receipt.paymentMethod]}
                </div>
            </div>
        </div>
        
        ${receipt.paymentNote ? `<div style="background:#f0fdf4;padding:12px;border-radius:5px;margin:15px 0;">
            <div style="font-weight:600;margin-bottom:5px;">หมายเหตุ:</div>
            <p style="font-size:13px;color:#444;">${receipt.paymentNote}</p>
        </div>` : ''}
        
        <div style="display:flex;gap:50px;margin-top:40px;">
            <div style="flex:1;text-align:center;">
                <div style="border-bottom:1px solid #333;height:50px;margin-bottom:8px;"></div>
                <div style="font-size:13px;color:#444;">ผู้รับเงิน</div>
                ${receipt.receivedBy ? `<div style="font-size:11px;color:#666;">(${receipt.receivedBy})</div>` : ''}
            </div>
            <div style="flex:1;text-align:center;">
                <div style="border-bottom:1px solid #333;height:50px;margin-bottom:8px;"></div>
                <div style="font-size:13px;color:#444;">ผู้จ่ายเงิน</div>
            </div>
        </div>
        
        <div style="text-align:center;margin-top:30px;font-size:11px;color:#666;">
            ใบเสร็จรับเงินนี้ถือเป็นหลักฐานการรับชำระเงินแล้ว
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
                <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">ใบเสร็จรับเงิน {receipt.receiptNumber}</h2>
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
                        <div className="flex justify-between items-start border-b-2 border-green-600 pb-4 mb-6">
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
                                <h2 className="text-xl font-bold text-green-600">ใบเสร็จรับเงิน</h2>
                                <p className="text-gray-600">เลขที่: {receipt.receiptNumber}</p>
                                <p className="text-gray-600">วันที่รับเงิน: {new Date(receipt.paymentDate).toLocaleDateString('th-TH')}</p>
                            </div>
                        </div>

                        {/* Customer */}
                        <div className="mb-6">
                            <h3 className="font-bold text-gray-700 mb-2">ได้รับเงินจาก:</h3>
                            <p className="text-gray-800">{receipt.customerName}</p>
                            {receipt.customerPhone && <p className="text-gray-600">โทร: {receipt.customerPhone}</p>}
                            {receipt.customerAddress && <p className="text-gray-600">ที่อยู่: {receipt.customerAddress}</p>}
                        </div>

                        {/* Items Table */}
                        <table className="w-full border-collapse mb-6">
                            <thead>
                                <tr className="bg-green-100">
                                    <th className="border border-gray-300 px-3 py-2 text-center w-12">ลำดับ</th>
                                    <th className="border border-gray-300 px-3 py-2 text-left">รายการ</th>
                                    <th className="border border-gray-300 px-3 py-2 text-center w-16">จำนวน</th>
                                    <th className="border border-gray-300 px-3 py-2 text-right w-24">ราคา/หน่วย</th>
                                    <th className="border border-gray-300 px-3 py-2 text-right w-24">รวม</th>
                                </tr>
                            </thead>
                            <tbody>
                                {receipt.items.map((item, idx) => (
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

                        {/* Total */}
                        <div className="flex justify-end mb-6">
                            <div className="bg-green-100 p-4 rounded-lg w-56">
                                <div className="flex justify-between text-lg font-bold text-green-700">
                                    <span>รับเงินทั้งสิ้น</span>
                                    <span>฿{receipt.totalPrice.toLocaleString()}</span>
                                </div>
                                <p className="text-sm text-gray-600 text-center mt-1">({numberToBahtText(receipt.totalPrice)})</p>
                                <div className="mt-2 text-sm text-gray-600">
                                    ชำระโดย: {paymentMethodLabels[receipt.paymentMethod]}
                                </div>
                            </div>
                        </div>

                        {/* Note */}
                        {receipt.paymentNote && (
                            <div className="mb-6 bg-green-50 p-4 rounded-lg">
                                <h3 className="font-bold text-gray-700 mb-2">หมายเหตุ:</h3>
                                <p className="text-gray-600">{receipt.paymentNote}</p>
                            </div>
                        )}

                        {/* Footer text */}
                        <p className="text-center text-sm text-gray-500 mt-8">
                            ใบเสร็จรับเงินนี้ถือเป็นหลักฐานการรับชำระเงินแล้ว
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
