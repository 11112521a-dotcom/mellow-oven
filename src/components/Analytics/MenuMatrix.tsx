import React from 'react';
import { Product } from '@/types';
import { calculateMenuMatrix } from '@/src/lib/analytics';
import { Info } from 'lucide-react';

interface MenuMatrixProps {
    logs: any[];
    products: Product[];
}

export const MenuMatrix: React.FC<MenuMatrixProps> = ({ logs, products }) => {
    const data = calculateMenuMatrix(logs, products);

    if (data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-cafe-400 bg-cafe-50 rounded-xl border border-dashed border-cafe-200">
                <Info size={24} className="mb-2" />
                <p>ยังไม่มีข้อมูลการขายเพียงพอสำหรับการวิเคราะห์</p>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-cafe-100">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="text-lg font-bold text-cafe-800 flex items-center gap-2">
                        🧩 Menu Engineering Matrix
                    </h3>
                    <p className="text-sm text-cafe-500">วิเคราะห์ความนิยม vs กำไร เพื่อปรับกลยุทธ์เมนู</p>
                </div>
                <div className="flex gap-2 text-xs">
                    <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500"></span> Star</div>
                    <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-500"></span> Workhorse</div>
                    <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500"></span> Puzzle</div>
                    <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500"></span> Dog</div>
                </div>
            </div>

            {/* Product List Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-cafe-50 text-cafe-600 text-xs uppercase">
                        <tr>
                            <th className="px-4 py-3 text-left">สินค้า</th>
                            <th className="px-4 py-3 text-center">ประเภท</th>
                            <th className="px-4 py-3 text-right">ยอดขาย</th>
                            <th className="px-4 py-3 text-right">กำไร/ชิ้น</th>
                            <th className="px-4 py-3 text-left">คำแนะนำ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-cafe-100">
                        {data.sort((a, b) => b.soldQty - a.soldQty).map((item) => (
                            <tr key={item.name} className="hover:bg-cafe-50/50">
                                <td className="px-4 py-3 font-medium text-cafe-800">{item.name}</td>
                                <td className="px-4 py-3 text-center">
                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
                                        ${item.category === 'Star' ? 'bg-green-100 text-green-700' :
                                            item.category === 'Workhorse' ? 'bg-yellow-100 text-yellow-700' :
                                                item.category === 'Puzzle' ? 'bg-blue-100 text-blue-700' :
                                                    'bg-red-100 text-red-700'}`}>
                                        {item.category === 'Star' && '⭐'}
                                        {item.category === 'Workhorse' && '🐴'}
                                        {item.category === 'Puzzle' && '🧩'}
                                        {item.category === 'Dog' && '🐕'}
                                        {item.category}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-right font-medium">{item.soldQty} ชิ้น</td>
                                <td className="px-4 py-3 text-right font-medium">฿{item.contributionMargin.toFixed(2)}</td>
                                <td className="px-4 py-3 text-cafe-600 text-xs">
                                    {item.category === 'Star' && 'รักษาคุณภาพ ห้ามของขาด'}
                                    {item.category === 'Workhorse' && 'ขึ้นราคา หรือลดต้นทุน'}
                                    {item.category === 'Puzzle' && 'จัดโปรโมชั่น เชียร์ขาย'}
                                    {item.category === 'Dog' && 'พิจารณาตัดออกจากเมนู'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <StrategyCard title="Star (ทำเงิน+ขายดี)" desc="รักษาคุณภาพ ห้ามของขาด" color="green" />
                <StrategyCard title="Workhorse (ขายดี+กำไรน้อย)" desc="ขึ้นราคา หรือลดต้นทุน" color="yellow" />
                <StrategyCard title="Puzzle (กำไรเยอะ+ขายน้อย)" desc="จัดโปรโมชั่น เชียร์ขาย" color="blue" />
                <StrategyCard title="Dog (ขายไม่ออก+กำไรน้อย)" desc="ตัดออกจากเมนู" color="red" />
            </div>
        </div>
    );
};

const StrategyCard = ({ title, desc, color }: any) => {
    const colors: any = {
        green: 'bg-green-50 border-green-200 text-green-800',
        yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800',
        blue: 'bg-blue-50 border-blue-200 text-blue-800',
        red: 'bg-red-50 border-red-200 text-red-800'
    };
    return (
        <div className={`p-3 rounded-lg border ${colors[color]} text-center`}>
            <h4 className="font-bold text-xs mb-1">{title}</h4>
            <p className="text-[10px] opacity-80">{desc}</p>
        </div>
    );
};
