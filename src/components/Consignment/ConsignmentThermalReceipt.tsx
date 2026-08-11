import React, { useRef, useEffect, useState } from 'react';
import { ConsignmentOrder } from '../../../types';
import { Printer, Download, X, Loader2 } from 'lucide-react';
import domtoimage from 'dom-to-image-more';
import QRCode from 'qrcode';

interface ConsignmentThermalReceiptProps {
    order: ConsignmentOrder;
    onClose: () => void;
}

export const ConsignmentThermalReceipt: React.FC<ConsignmentThermalReceiptProps> = ({ order, onClose }) => {
    const receiptRef = useRef<HTMLDivElement>(null);
    const [qrDataUrl, setQrDataUrl] = useState<string>('');

    // Generate QR Code locally (no CORS issues with html2canvas)
    useEffect(() => {
        const qrData = `MO-VERIFY:${order.orderNumber}:${order.shopId}`;
        QRCode.toDataURL(qrData, {
            width: 200,
            margin: 1,
            color: { dark: '#1c1917', light: '#ffffff' },
            errorCorrectionLevel: 'M',
        }).then((url) => setQrDataUrl(url)).catch(console.error);
    }, [order.orderNumber, order.shopId]);

    // Calculate collection date (deliveryDate + 14 days default if settleDate missing)
    const deliveryDateObj = new Date(order.deliveryDate);
    const collectionDueDateObj = new Date(deliveryDateObj.getTime() + 14 * 24 * 60 * 60 * 1000);

    const formattedDeliveryDate = deliveryDateObj.toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });

    const formattedDueDate = collectionDueDateObj.toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });

    const formattedSettleDate = order.settleDate
        ? new Date(order.settleDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
        : null;

    // Total calculated amount sent
    const totalSentAmount = order.items.reduce((sum, item) => sum + (item.quantitySent * item.unitPrice), 0);

    // Handle Print via Window Print (Scoped CSS for Thermal Printer)
    const handlePrint = () => {
        window.print();
    };

    // Save as Image for Bluetooth Apps like Fun Print
    const [isDownloading, setIsDownloading] = useState(false);

    const handleDownloadImage = async () => {
        if (!receiptRef.current || isDownloading) return;
        setIsDownloading(true);
        try {
            // Wait a tick to ensure QR image is painted
            await new Promise(r => setTimeout(r, 200));
            const dataUrl = await domtoimage.toPng(receiptRef.current, {
                quality: 1,
                scale: 3,   // High DPI for 300DPI thermal printers
                bgcolor: '#ffffff',
            });
            const link = document.createElement('a');
            link.download = `Slip_${order.orderNumber}_${order.shopName}.png`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error('Failed to generate receipt image:', err);
            alert('เกิดข้อผิดพลาด กรุณาลองอีกครั้ง');
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/70 backdrop-blur-sm print:p-0 print:bg-white print:static print:inset-auto">
            {/* Control Bar (Hidden on Print) */}
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-sm w-full border border-stone-200 print:shadow-none print:border-none print:w-full print:max-w-none">
                <div className="bg-stone-900 text-white p-4 flex items-center justify-between print:hidden">
                    <div className="flex items-center gap-2">
                        <Printer size={18} className="text-emerald-400" />
                        <span className="font-bold text-sm">สลิปใบส่งของฝากขาย (57mm)</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-stone-800 rounded-lg text-stone-400 hover:text-white transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Print Control Action Buttons (Hidden on Print) */}
                <div className="p-3 bg-stone-100 border-b border-stone-200 flex gap-2 print:hidden">
                    <button
                        onClick={handlePrint}
                        className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95"
                    >
                        <Printer size={15} />
                        <span>สั่งพิมพ์ (Browser/Printer)</span>
                    </button>
                    <button
                        onClick={handleDownloadImage}
                        disabled={isDownloading || !qrDataUrl}
                        className="flex-1 py-2.5 px-3 bg-stone-800 hover:bg-stone-900 disabled:bg-stone-400 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95"
                        title="สำหรับเซฟรูปเพื่อส่งพิมพ์ในแอป Fun Print"
                    >
                        {isDownloading
                            ? <><Loader2 size={15} className="animate-spin" /><span>กำลังสร้างรูป...</span></>
                            : <><Download size={15} /><span>เซฟรูป (แอป Fun Print)</span></>}
                    </button>
                </div>

                {/* THERMAL RECEIPT CONTAINER (Width 57mm / ~280px representation) */}
                <div className="p-4 bg-stone-200 flex justify-center print:p-0 print:bg-white overflow-y-auto max-h-[70vh] print:max-h-none">
                    <div
                        ref={receiptRef}
                        id="printable-thermal-receipt"
                        className="w-[280px] bg-white p-4 font-mono text-stone-900 text-xs shadow-md rounded-lg print:shadow-none print:rounded-none print:w-[57mm] print:p-1 print:m-0"
                        style={{ fontFamily: "'Courier New', Courier, monospace" }}
                    >
                        {/* Store Header */}
                        <div className="text-center space-y-1 pb-3 border-b border-dashed border-stone-400">
                            <h2 className="font-bold text-base tracking-tight">Mellow Oven</h2>
                            <p className="text-[11px] font-bold">ใบส่งสินค้าฝากขาย / ส่งสาขา</p>
                            <p className="text-[10px] text-stone-600">เลขที่: {order.orderNumber}</p>
                        </div>

                        {/* Order & Shop Meta */}
                        <div className="py-2 space-y-1 text-[11px] border-b border-dashed border-stone-400">
                            <div className="flex justify-between">
                                <span className="font-bold">ร้านฝากขาย:</span>
                                <span className="font-bold text-right">{order.shopName}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>วันที่ลงของ:</span>
                                <span>{formattedDeliveryDate}</span>
                            </div>
                            <div className="flex justify-between font-bold text-stone-800">
                                <span>ดิวเก็บเงิน (14วัน):</span>
                                <span>{formattedDueDate}</span>
                            </div>
                            {order.status === 'settled' && formattedSettleDate && (
                                <div className="flex justify-between text-emerald-700 font-bold">
                                    <span>วันที่เคลียร์ยอด:</span>
                                    <span>{formattedSettleDate}</span>
                                </div>
                            )}
                            {order.contactName && (
                                <div className="flex justify-between text-[10px] text-stone-600">
                                    <span>ผู้รับ/โทร:</span>
                                    <span>{order.contactName} ({order.contactPhone || '-'})</span>
                                </div>
                            )}
                        </div>

                        {/* Items List Table */}
                        <div className="py-2 border-b border-dashed border-stone-400">
                            <table className="w-full text-[11px]">
                                <thead>
                                    <tr className="border-b border-stone-300">
                                        <th className="text-left font-bold pb-1">สินค้า</th>
                                        <th className="text-center font-bold pb-1">จำนวน</th>
                                        <th className="text-right font-bold pb-1">รวม(฿)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {order.items.map((item, idx) => (
                                        <tr key={item.id || idx} className="align-top">
                                            <td className="py-1 pr-1">
                                                <div className="font-bold">{item.productName}</div>
                                                {item.variantName && (
                                                    <div className="text-[9px] text-stone-500">({item.variantName})</div>
                                                )}
                                                <div className="text-[9px] text-stone-500">@฿{item.unitPrice}</div>
                                            </td>
                                            <td className="py-1 text-center font-bold">
                                                x{item.quantitySent}
                                            </td>
                                            <td className="py-1 text-right font-bold">
                                                {(item.quantitySent * item.unitPrice).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Summary Total */}
                        <div className="py-2 space-y-1 text-[11px] border-b border-dashed border-stone-400 font-bold">
                            <div className="flex justify-between">
                                <span>รวมจำนวนลงของ:</span>
                                <span>{order.totalQuantitySent} ชิ้น</span>
                            </div>
                            <div className="flex justify-between text-sm pt-1">
                                <span>มูลค่าสินค้าลงของ:</span>
                                <span>฿{totalSentAmount.toLocaleString()}</span>
                            </div>
                        </div>

                        {/* Signatures */}
                        <div className="pt-3 pb-2 space-y-4 text-[10px]">
                            <div className="flex justify-between items-end pt-4">
                                <div className="text-center w-[45%]">
                                    <div className="border-b border-stone-400 mb-1"></div>
                                    <p>ผู้ส่งสินค้า</p>
                                </div>
                                <div className="text-center w-[45%]">
                                    <div className="border-b border-stone-400 mb-1"></div>
                                    <p>ผู้รับฝากขาย</p>
                                </div>
                            </div>
                        </div>

                        {/* Verification QR Code — generated locally, no CORS */}
                        <div className="pt-2 pb-1 text-center flex flex-col items-center justify-center">
                            {qrDataUrl ? (
                                <img
                                    src={qrDataUrl}
                                    alt="QR Verification"
                                    className="w-16 h-16 border border-stone-300 p-0.5 bg-white rounded my-1"
                                />
                            ) : (
                                <div className="w-16 h-16 border border-stone-200 rounded my-1 flex items-center justify-center text-[8px] text-stone-400">
                                    QR...
                                </div>
                            )}
                            <p className="text-[8px] font-bold text-stone-600">สแกนตรวจสอบสถานะบิล & ยอดค้าง</p>
                        </div>

                        {/* Footer Message */}
                        <div className="text-center pt-2 text-[9px] text-stone-500">
                            <p>*** ขอบคุณที่ร่วมธุรกิจกับ Mellow Oven ***</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
