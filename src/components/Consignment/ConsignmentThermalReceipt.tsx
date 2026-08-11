import React, { useRef, useState } from 'react';
import { ConsignmentOrder } from '../../../types';
import { Printer, Share2, X, Download, Image as ImageIcon } from 'lucide-react';

interface ConsignmentThermalReceiptProps {
    order: ConsignmentOrder;
    onClose: () => void;
}

// 100% Synchronous 384px Native Thermal Canvas Renderer (Exact 1:1 width for 57mm C15 PRO / Fun Print)
const generateReceiptCanvasImage = (order: ConsignmentOrder): string => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    const deliveryDateObj = new Date(order.deliveryDate);
    const collectionDueDateObj = new Date(deliveryDateObj.getTime() + 14 * 24 * 60 * 60 * 1000);
    const formattedDeliveryDate = deliveryDateObj.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
    const formattedDueDate = collectionDueDateObj.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
    const formattedSettleDate = order.settleDate
        ? new Date(order.settleDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
        : null;

    const totalSentAmount = order.items.reduce((sum, item) => sum + (item.quantitySent * item.unitPrice), 0);

    const width = 384; // Standard 1:1 dot resolution for 57mm thermal printers
    const leftMargin = 16;
    const rightMargin = 368; // 16px right margin (384 - 16)

    const baseHeight = 360 + (order.contactName ? 26 : 0) + (order.status === 'settled' ? 26 : 0);
    const itemHeight = order.items.length * 38;
    const height = baseHeight + itemHeight;

    canvas.width = width;
    canvas.height = height;

    // Fill White Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    let currentY = 24;

    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';

    // Store Header
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('Mellow Oven', width / 2, currentY);
    currentY += 26;

    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('ใบส่งสินค้าฝากขาย / ส่งสาขา', width / 2, currentY);
    currentY += 20;

    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#444444';
    ctx.fillText(`เลขที่: ${order.orderNumber}`, width / 2, currentY);
    currentY += 16;

    // Dashed Divider
    ctx.strokeStyle = '#888888';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.moveTo(leftMargin, currentY);
    ctx.lineTo(rightMargin, currentY);
    ctx.stroke();
    currentY += 22;

    // Meta Details
    ctx.fillStyle = '#000000';

    ctx.textAlign = 'left';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('ร้านฝากขาย:', leftMargin, currentY);
    ctx.textAlign = 'right';
    ctx.fillText(order.shopName, rightMargin, currentY);
    currentY += 22;

    ctx.textAlign = 'left';
    ctx.font = '12px sans-serif';
    ctx.fillText('วันที่ลงของ:', leftMargin, currentY);
    ctx.textAlign = 'right';
    ctx.fillText(formattedDeliveryDate, rightMargin, currentY);
    currentY += 22;

    ctx.textAlign = 'left';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('ดิวเก็บเงิน (14วัน):', leftMargin, currentY);
    ctx.textAlign = 'right';
    ctx.fillText(formattedDueDate, rightMargin, currentY);
    currentY += 22;

    if (order.status === 'settled' && formattedSettleDate) {
        ctx.textAlign = 'left';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillStyle = '#047857';
        ctx.fillText('วันที่เคลียร์ยอด:', leftMargin, currentY);
        ctx.textAlign = 'right';
        ctx.fillText(formattedSettleDate, rightMargin, currentY);
        ctx.fillStyle = '#000000';
        currentY += 22;
    }

    if (order.contactName) {
        ctx.textAlign = 'left';
        ctx.font = '11px sans-serif';
        ctx.fillStyle = '#555555';
        ctx.fillText(`ผู้รับ/โทร: ${order.contactName} (${order.contactPhone || '-'})`, leftMargin, currentY);
        ctx.fillStyle = '#000000';
        currentY += 20;
    }

    // Dashed Divider
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.moveTo(leftMargin, currentY);
    ctx.lineTo(rightMargin, currentY);
    ctx.stroke();
    currentY += 20;

    // Items Header
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('สินค้า', leftMargin, currentY);
    ctx.textAlign = 'center';
    ctx.fillText('จำนวน', 255, currentY);
    ctx.textAlign = 'right';
    ctx.fillText('รวม (฿)', rightMargin, currentY);
    currentY += 10;

    // Solid Line
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(leftMargin, currentY);
    ctx.lineTo(rightMargin, currentY);
    ctx.stroke();
    currentY += 20;

    // Items List
    order.items.forEach((item) => {
        ctx.textAlign = 'left';
        ctx.font = 'bold 13px sans-serif';
        const nameText = item.variantName ? `${item.productName} (${item.variantName})` : item.productName;
        ctx.fillText(nameText, leftMargin, currentY);

        ctx.textAlign = 'center';
        ctx.font = 'bold 13px sans-serif';
        ctx.fillText(`x${item.quantitySent}`, 255, currentY);

        ctx.textAlign = 'right';
        ctx.font = 'bold 13px sans-serif';
        ctx.fillText((item.quantitySent * item.unitPrice).toLocaleString(), rightMargin, currentY);
        currentY += 16;

        ctx.textAlign = 'left';
        ctx.font = '10px sans-serif';
        ctx.fillStyle = '#666666';
        ctx.fillText(`  @฿${item.unitPrice}`, leftMargin, currentY);
        ctx.fillStyle = '#000000';
        currentY += 20;
    });

    // Dashed Divider
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.moveTo(leftMargin, currentY);
    ctx.lineTo(rightMargin, currentY);
    ctx.stroke();
    currentY += 20;

    // Summary Totals
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('รวมจำนวนลงของ:', leftMargin, currentY);
    ctx.textAlign = 'right';
    ctx.fillText(`${order.totalQuantitySent} ชิ้น`, rightMargin, currentY);
    currentY += 22;

    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('มูลค่าสินค้าลงของ:', leftMargin, currentY);
    ctx.textAlign = 'right';
    ctx.fillText(`฿${totalSentAmount.toLocaleString()}`, rightMargin, currentY);
    currentY += 30;

    // Signatures Line
    ctx.setLineDash([]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(25, currentY + 24); ctx.lineTo(160, currentY + 24);
    ctx.moveTo(224, currentY + 24); ctx.lineTo(359, currentY + 24);
    ctx.stroke();

    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#333333';
    ctx.fillText('ผู้ส่งสินค้า', 92, currentY + 40);
    ctx.fillText('ผู้รับฝากขาย', 291, currentY + 40);
    currentY += 65;

    // Footer Message
    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#666666';
    ctx.fillText('*** ขอบคุณที่ร่วมธุรกิจกับ Mellow Oven ***', width / 2, currentY);

    return canvas.toDataURL('image/png');
};

export const ConsignmentThermalReceipt: React.FC<ConsignmentThermalReceiptProps> = ({ order, onClose }) => {
    const receiptRef = useRef<HTMLDivElement>(null);
    const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

    // Calculate dates
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

    const totalSentAmount = order.items.reduce((sum, item) => sum + (item.quantitySent * item.unitPrice), 0);

    // Print via Browser
    const handlePrint = () => {
        window.print();
    };

    // Generate & Show Receipt Image Modal for Mobile (100% synchronous & reliable)
    const handleGenerateImage = async () => {
        const imageUrl = generateReceiptCanvasImage(order);
        if (!imageUrl) {
            alert('ไม่สามารถสร้างรูปภาพได้');
            return;
        }

        setPreviewImageUrl(imageUrl);

        // Try Native Share if supported
        try {
            const res = await fetch(imageUrl);
            const blob = await res.blob();
            const fileName = `Slip_${order.orderNumber}_${order.shopName}.png`;
            const file = new File([blob], fileName, { type: 'image/png' });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: `สลิปฝากขาย ${order.shopName}`,
                });
            }
        } catch {
            // Ignore cancel / share errors
        }
    };

    // Manual Direct Download for Image Modal
    const handleDownloadDirect = () => {
        if (!previewImageUrl) return;
        const link = document.createElement('a');
        link.download = `Slip_${order.orderNumber}_${order.shopName}.png`;
        link.href = previewImageUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/70 backdrop-blur-sm print:p-0 print:bg-white print:static print:inset-auto">
            {/* Control Bar */}
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-sm w-full border border-stone-200 print:shadow-none print:border-none print:w-full print:max-w-none">
                <div className="bg-stone-900 text-white p-4 flex items-center justify-between print:hidden">
                    <div className="flex items-center gap-2">
                        <Printer size={18} className="text-emerald-400" />
                        <span className="font-bold text-sm">ใบส่งสินค้าฝากขาย (57mm)</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-stone-800 rounded-lg text-stone-400 hover:text-white transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Print Control Action Buttons */}
                <div className="p-3 bg-stone-100 border-b border-stone-200 flex gap-2 print:hidden">
                    <button
                        onClick={handlePrint}
                        className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95"
                    >
                        <Printer size={15} />
                        <span>สั่งพิมพ์ (Browser/Printer)</span>
                    </button>
                    <button
                        onClick={handleGenerateImage}
                        className="flex-1 py-2.5 px-3 bg-stone-800 hover:bg-stone-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95"
                        title="สำหรับเซฟรูปเพื่อส่งพิมพ์ในแอป Fun Print"
                    >
                        <Share2 size={15} />
                        <span>แชร์/บันทึกรูป (Fun Print)</span>
                    </button>
                </div>

                {/* THERMAL RECEIPT CONTAINER */}
                <div className="p-4 bg-stone-200 flex justify-center print:p-0 print:bg-white overflow-y-auto max-h-[70vh] print:max-h-none">
                    <div
                        ref={receiptRef}
                        id="printable-thermal-receipt"
                        className="w-[280px] bg-white p-4 font-mono text-stone-900 text-xs shadow-md rounded-lg print:shadow-none print:rounded-none print:w-[57mm] print:p-1 print:m-0"
                        style={{ fontFamily: "'Courier New', Courier, monospace" }}
                    >
                        {/* Store Header */}
                        <div className="text-center space-y-1 pb-3 border-b border-dashed border-stone-400">
                            <h2 className="font-bold text-base tracking-tight uppercase">Mellow Oven</h2>
                            <p className="text-[11px] font-bold text-stone-800">ใบส่งสินค้าฝากขาย / ส่งสาขา</p>
                            <p className="text-[10px] text-stone-600 font-mono">เลขที่: {order.orderNumber}</p>
                        </div>

                        {/* Order & Shop Meta */}
                        <div className="py-2 space-y-1 text-[11px] border-b border-dashed border-stone-400">
                            <div className="flex justify-between items-start gap-2">
                                <span className="font-bold shrink-0">ร้านฝากขาย:</span>
                                <span className="font-bold text-right text-stone-900">{order.shopName}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span>วันที่ลงของ:</span>
                                <span>{formattedDeliveryDate}</span>
                            </div>
                            <div className="flex justify-between items-center font-bold text-stone-800">
                                <span>ดิวเก็บเงิน (14วัน):</span>
                                <span>{formattedDueDate}</span>
                            </div>
                            {order.status === 'settled' && formattedSettleDate && (
                                <div className="flex justify-between items-center text-emerald-700 font-bold">
                                    <span>วันที่เคลียร์ยอด:</span>
                                    <span>{formattedSettleDate}</span>
                                </div>
                            )}
                            {order.contactName && (
                                <div className="flex justify-between items-start gap-2 text-[10px] text-stone-600">
                                    <span className="shrink-0">ผู้รับ/โทร:</span>
                                    <span className="text-right">{order.contactName} ({order.contactPhone || '-'})</span>
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
                            <div className="flex justify-between items-center">
                                <span>รวมจำนวนลงของ:</span>
                                <span>{order.totalQuantitySent} ชิ้น</span>
                            </div>
                            <div className="flex justify-between items-center text-sm pt-0.5">
                                <span>มูลค่าสินค้าลงของ:</span>
                                <span>฿{totalSentAmount.toLocaleString()}</span>
                            </div>
                        </div>

                        {/* Official Signatures Section */}
                        <div className="pt-3 pb-2 space-y-3 text-[10px]">
                            <div className="flex justify-between items-end pt-3">
                                <div className="text-center w-[45%]">
                                    <div className="border-b border-stone-400 mb-1"></div>
                                    <p className="font-bold">ผู้ส่งสินค้า</p>
                                </div>
                                <div className="text-center w-[45%]">
                                    <div className="border-b border-stone-400 mb-1"></div>
                                    <p className="font-bold">ผู้รับฝากขาย</p>
                                </div>
                            </div>
                        </div>

                        {/* Official Footer Message */}
                        <div className="text-center pt-2 text-[9px] text-stone-500">
                            <p>*** ขอบคุณที่ร่วมธุรกิจกับ Mellow Oven ***</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* PREVIEW IMAGE MODAL FOR MOBILE LONG-PRESS SAVE */}
            {previewImageUrl && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <div className="bg-stone-900 rounded-3xl p-4 max-w-sm w-full border border-stone-700 space-y-3 text-center text-white">
                        <div className="flex justify-between items-center border-b border-stone-800 pb-2">
                            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                                <ImageIcon size={18} />
                                <span>รูปสลิปพร้อมบันทึก (Fun Print)</span>
                            </div>
                            <button
                                onClick={() => setPreviewImageUrl(null)}
                                className="p-1 hover:bg-stone-800 rounded-lg text-stone-400 hover:text-white"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Instruction Badge */}
                        <div className="bg-amber-500/20 border border-amber-500/40 text-amber-300 p-2.5 rounded-xl text-xs font-semibold space-y-1">
                            <p>📱 <b>คำแนะนำสำหรับมือถือ:</b></p>
                            <p>กดค้างที่รูปภาพด้านล่างแล้วเลือก <b>"บันทึกรูปภาพ" (Save Image)</b> เพื่อนำไปเปิดในแอป Fun Print ได้เลยครับ!</p>
                        </div>

                        {/* Rendered Canvas PNG Image */}
                        <div className="bg-stone-800 p-2 rounded-2xl max-h-[55vh] overflow-y-auto flex justify-center">
                            <img
                                src={previewImageUrl}
                                alt="Thermal Receipt Slip"
                                className="w-full max-w-[320px] bg-white rounded shadow-lg select-all"
                            />
                        </div>

                        {/* Download Fallback Button */}
                        <div className="flex gap-2 pt-1">
                            <button
                                onClick={handleDownloadDirect}
                                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95"
                            >
                                <Download size={16} />
                                <span>ดาวน์โหลดรูปภาพ</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
