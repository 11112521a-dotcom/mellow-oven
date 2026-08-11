import React, { useRef, useState } from 'react';
import { ConsignmentOrder } from '../../../types';
import { useStore } from '../../store';
import { Printer, Share2, X, Download, Image as ImageIcon } from 'lucide-react';

interface ConsignmentThermalReceiptProps {
    order: ConsignmentOrder;
    onClose: () => void;
}

// Pure 2D Canvas Receipt Generator — High DPI, Safe Margins, No Clipping
const generateReceiptCanvasImageAsync = (order: ConsignmentOrder, logoSrc?: string): Promise<string> => {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            resolve('');
            return;
        }

        const deliveryDateObj = new Date(order.deliveryDate);
        const collectionDueDateObj = new Date(deliveryDateObj.getTime() + 14 * 24 * 60 * 60 * 1000);
        const formattedDeliveryDate = deliveryDateObj.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
        const formattedDueDate = collectionDueDateObj.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
        const formattedSettleDate = order.settleDate
            ? new Date(order.settleDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
            : null;

        const totalSentAmount = order.items.reduce((sum, item) => sum + (item.quantitySent * item.unitPrice), 0);

        const width = 576; // 300 DPI high-res thermal print width (57mm / 58mm)
        const leftMargin = 40;
        const rightMargin = width - 40; // 536px (leaving 40px safe margin on right)

        const logoHeight = 70;
        const baseHeight = 440 + logoHeight + (order.contactName ? 32 : 0) + (order.status === 'settled' ? 32 : 0);
        const itemHeight = order.items.length * 44;
        const height = baseHeight + itemHeight;

        canvas.width = width;
        canvas.height = height;

        const drawContent = (imgEl?: HTMLImageElement) => {
            // Fill White Background
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);

            let currentY = 28;

            // Draw Logo Image at top center if available
            if (imgEl && imgEl.complete && imgEl.naturalWidth > 0) {
                const imgWidth = 64;
                const imgHeight = (imgEl.naturalHeight / imgEl.naturalWidth) * imgWidth || 64;
                ctx.drawImage(imgEl, (width - imgWidth) / 2, currentY, imgWidth, Math.min(imgHeight, 70));
                currentY += Math.min(imgHeight, 70) + 12;
            } else {
                currentY += 12;
            }

            ctx.fillStyle = '#1c1917';
            ctx.textAlign = 'center';

            // Store Header (sans-serif for crisp Thai text)
            ctx.font = 'bold 30px sans-serif, system-ui';
            ctx.fillText('Mellow Oven', width / 2, currentY);
            currentY += 34;

            ctx.font = 'bold 18px sans-serif, system-ui';
            ctx.fillText('ใบส่งมอบสินค้าฝากขาย / ส่งสาขา', width / 2, currentY);
            currentY += 26;

            ctx.font = '15px sans-serif, system-ui';
            ctx.fillStyle = '#44403c';
            ctx.fillText(`เลขที่เอกสาร: ${order.orderNumber}`, width / 2, currentY);
            currentY += 20;

            // Dashed Divider Line
            ctx.strokeStyle = '#a8a29e';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.setLineDash([6, 6]);
            ctx.moveTo(leftMargin, currentY);
            ctx.lineTo(rightMargin, currentY);
            ctx.stroke();
            currentY += 30;

            // Meta Details Section
            ctx.textAlign = 'left';
            ctx.font = 'bold 17px sans-serif, system-ui';
            ctx.fillStyle = '#1c1917';

            ctx.fillText(`ร้านค้าฝากขาย:`, leftMargin, currentY);
            ctx.textAlign = 'right';
            ctx.fillText(order.shopName, rightMargin, currentY);
            currentY += 30;

            ctx.textAlign = 'left';
            ctx.font = '16px sans-serif, system-ui';
            ctx.fillText(`วันที่ส่งมอบ:`, leftMargin, currentY);
            ctx.textAlign = 'right';
            ctx.fillText(formattedDeliveryDate, rightMargin, currentY);
            currentY += 30;

            ctx.textAlign = 'left';
            ctx.font = 'bold 16px sans-serif, system-ui';
            ctx.fillText(`ดิวเก็บเงิน (14 วัน):`, leftMargin, currentY);
            ctx.textAlign = 'right';
            ctx.fillText(formattedDueDate, rightMargin, currentY);
            currentY += 30;

            if (order.status === 'settled' && formattedSettleDate) {
                ctx.textAlign = 'left';
                ctx.font = 'bold 16px sans-serif, system-ui';
                ctx.fillStyle = '#047857';
                ctx.fillText(`วันที่เคลียร์ยอด:`, leftMargin, currentY);
                ctx.textAlign = 'right';
                ctx.fillText(formattedSettleDate, rightMargin, currentY);
                ctx.fillStyle = '#1c1917';
                currentY += 30;
            }

            if (order.contactName) {
                ctx.textAlign = 'left';
                ctx.font = '15px sans-serif, system-ui';
                ctx.fillStyle = '#57534e';
                ctx.fillText(`ผู้รับ/โทร: ${order.contactName} (${order.contactPhone || '-'})`, leftMargin, currentY);
                ctx.fillStyle = '#1c1917';
                currentY += 28;
            }

            // Dashed Divider
            ctx.beginPath();
            ctx.setLineDash([6, 6]);
            ctx.moveTo(leftMargin, currentY);
            ctx.lineTo(rightMargin, currentY);
            ctx.stroke();
            currentY += 26;

            // Items Table Header
            ctx.font = 'bold 16px sans-serif, system-ui';
            ctx.fillStyle = '#1c1917';
            ctx.textAlign = 'left';
            ctx.fillText('รายการสินค้า', leftMargin, currentY);
            ctx.textAlign = 'center';
            ctx.fillText('จำนวน', width * 0.65, currentY);
            ctx.textAlign = 'right';
            ctx.fillText('มูลค่า(฿)', rightMargin, currentY);
            currentY += 14;

            // Solid Border Line
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.moveTo(leftMargin, currentY);
            ctx.lineTo(rightMargin, currentY);
            ctx.stroke();
            currentY += 28;

            // Item Rows
            order.items.forEach((item) => {
                ctx.textAlign = 'left';
                ctx.font = 'bold 17px sans-serif, system-ui';
                const nameText = item.variantName ? `${item.productName} (${item.variantName})` : item.productName;
                ctx.fillText(nameText, leftMargin, currentY);

                ctx.textAlign = 'center';
                ctx.font = 'bold 17px sans-serif, system-ui';
                ctx.fillText(`x${item.quantitySent}`, width * 0.65, currentY);

                ctx.textAlign = 'right';
                ctx.font = 'bold 17px sans-serif, system-ui';
                ctx.fillText((item.quantitySent * item.unitPrice).toLocaleString(), rightMargin, currentY);
                currentY += 22;

                // Price per unit subtitle
                ctx.textAlign = 'left';
                ctx.font = '14px sans-serif, system-ui';
                ctx.fillStyle = '#78716c';
                ctx.fillText(`  @฿${item.unitPrice}`, leftMargin, currentY);
                ctx.fillStyle = '#1c1917';
                currentY += 22;
            });

            // Dashed Divider
            ctx.beginPath();
            ctx.setLineDash([6, 6]);
            ctx.moveTo(leftMargin, currentY);
            ctx.lineTo(rightMargin, currentY);
            ctx.stroke();
            currentY += 28;

            // Summary Totals
            ctx.font = 'bold 17px sans-serif, system-ui';
            ctx.textAlign = 'left';
            ctx.fillText('รวมจำนวนลงของทั้งหมด:', leftMargin, currentY);
            ctx.textAlign = 'right';
            ctx.fillText(`${order.totalQuantitySent} ชิ้น`, rightMargin, currentY);
            currentY += 32;

            ctx.font = 'bold 20px sans-serif, system-ui';
            ctx.textAlign = 'left';
            ctx.fillText('รวมมูลค่าสินค้าลงของ:', leftMargin, currentY);
            ctx.textAlign = 'right';
            ctx.fillText(`฿${totalSentAmount.toLocaleString()}`, rightMargin, currentY);
            currentY += 44;

            // Signatures Section
            ctx.setLineDash([]);
            ctx.lineWidth = 1.5;

            // Left Signature Line (Sender)
            ctx.beginPath();
            ctx.moveTo(50, currentY + 30);
            ctx.lineTo(230, currentY + 30);
            ctx.stroke();

            // Right Signature Line (Recipient)
            ctx.beginPath();
            ctx.moveTo(width - 230, currentY + 30);
            ctx.lineTo(width - 50, currentY + 30);
            ctx.stroke();

            ctx.font = 'bold 15px sans-serif, system-ui';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#1c1917';
            ctx.fillText('ลงชื่อผู้ส่งมอบสินค้า', 140, currentY + 52);
            ctx.fillText('ลงชื่อผู้รับฝากขาย', width - 140, currentY + 52);

            ctx.font = '13px sans-serif, system-ui';
            ctx.fillStyle = '#78716c';
            ctx.fillText('( Mellow Oven )', 140, currentY + 72);
            ctx.fillText('( ผู้ตรวจรับสินค้า )', width - 140, currentY + 72);
            currentY += 105;

            // Footer Note
            ctx.font = '14px sans-serif, system-ui';
            ctx.fillStyle = '#57534e';
            ctx.fillText('*** เอกสารสำคัญ กรุณาเก็บไว้เพื่อใช้อ้างอิงการเคลียร์ยอด ***', width / 2, currentY);

            resolve(canvas.toDataURL('image/png'));
        };

        const targetLogo = logoSrc || '/pwa-192x192.png';
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => drawContent(img);
        img.onerror = () => drawContent(undefined);
        img.src = targetLogo;
    });
};

export const ConsignmentThermalReceipt: React.FC<ConsignmentThermalReceiptProps> = ({ order, onClose }) => {
    const { shopInfo } = useStore();
    const receiptRef = useRef<HTMLDivElement>(null);
    const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const logoUrl = shopInfo?.logoUrl || '/pwa-192x192.png';

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

    // Generate & Show Receipt Image Modal for Mobile (100% reliable)
    const handleGenerateImage = async () => {
        if (isGenerating) return;
        setIsGenerating(true);
        try {
            const imageUrl = await generateReceiptCanvasImageAsync(order, logoUrl);
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
                // Ignore cancel / share errors, image preview modal remains open for long-press save
            }
        } finally {
            setIsGenerating(false);
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
                        <span className="font-bold text-sm">ใบส่งมอบสินค้าฝากขาย (57mm)</span>
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
                        disabled={isGenerating}
                        className="flex-1 py-2.5 px-3 bg-stone-800 hover:bg-stone-900 disabled:bg-stone-400 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95"
                        title="สำหรับเซฟรูปเพื่อส่งพิมพ์ในแอป Fun Print"
                    >
                        <Share2 size={15} />
                        <span>{isGenerating ? 'กำลังสร้างรูป...' : 'แชร์/บันทึกรูป (Fun Print)'}</span>
                    </button>
                </div>

                {/* THERMAL RECEIPT CONTAINER (Width 57mm / ~300px representation) */}
                <div className="p-4 bg-stone-200 flex justify-center print:p-0 print:bg-white overflow-y-auto max-h-[70vh] print:max-h-none">
                    <div
                        ref={receiptRef}
                        id="printable-thermal-receipt"
                        className="w-[300px] bg-white p-3.5 font-sans text-stone-900 text-xs shadow-md rounded-lg print:shadow-none print:rounded-none print:w-[57mm] print:p-1 print:m-0"
                    >
                        {/* Store Header with Logo */}
                        <div className="text-center space-y-1 pb-2.5 border-b border-dashed border-stone-400">
                            {logoUrl && (
                                <img
                                    src={logoUrl}
                                    alt="Mellow Oven Logo"
                                    className="w-12 h-12 mx-auto mb-1 object-contain rounded-full border border-stone-200 p-0.5 bg-white shadow-sm"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                />
                            )}
                            <h2 className="font-bold text-base tracking-tight uppercase">Mellow Oven</h2>
                            <p className="text-[11px] font-bold text-stone-800">ใบส่งมอบสินค้าฝากขาย / ส่งสาขา</p>
                            <p className="text-[10px] text-stone-600 font-mono">เลขที่: {order.orderNumber}</p>
                        </div>

                        {/* Order & Shop Meta */}
                        <div className="py-2 space-y-1 text-[11px] border-b border-dashed border-stone-400">
                            <div className="flex justify-between items-start gap-2">
                                <span className="font-bold shrink-0">ร้านฝากขาย:</span>
                                <span className="font-bold text-right text-stone-900 break-words">{order.shopName}</span>
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
                                    <p className="font-bold">ลงชื่อผู้ส่งมอบสินค้า</p>
                                    <p className="text-[8px] text-stone-500">( Mellow Oven )</p>
                                </div>
                                <div className="text-center w-[45%]">
                                    <div className="border-b border-stone-400 mb-1"></div>
                                    <p className="font-bold">ลงชื่อผู้รับฝากขาย</p>
                                    <p className="text-[8px] text-stone-500">( ผู้ตรวจรับสินค้า )</p>
                                </div>
                            </div>
                        </div>

                        {/* Official Footer Message */}
                        <div className="text-center pt-2 text-[9px] text-stone-500">
                            <p>*** เอกสารสำคัญ กรุณาเก็บไว้เพื่อใช้อ้างอิงการเคลียร์ยอด ***</p>
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
                                <span>รูปสลิปทางการ (Fun Print)</span>
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
                            <p>📱 <b>สลิปฉบับทางการ (พร้อมโลโก้):</b></p>
                            <p>กดค้างที่รูปภาพด้านล่างแล้วเลือก <b>"บันทึกรูปภาพ" (Save Image)</b> เพื่อนำไปเปิดในแอป Fun Print ได้เลยครับ!</p>
                        </div>

                        {/* Rendered Canvas PNG Image */}
                        <div className="bg-stone-800 p-2 rounded-2xl max-h-[55vh] overflow-y-auto flex justify-center">
                            <img
                                src={previewImageUrl}
                                alt="Thermal Receipt Slip"
                                className="w-[280px] bg-white rounded shadow-lg select-all"
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
