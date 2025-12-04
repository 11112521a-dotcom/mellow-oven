import React from 'react';
import { Jar } from '@/types';
import { formatCurrency } from '@/src/lib/utils';
import { Box, Hammer, Zap, ShieldAlert, Smile } from 'lucide-react';

interface JarsSectionProps {
    jars: Jar[];
    onJarClick: (jarId: string) => void;
}

export const JarsSection: React.FC<JarsSectionProps> = ({ jars, onJarClick }) => {

    const getJarConfig = (id: string) => {
        switch (id) {
            case 'Working':
                return {
                    icon: <Box size={24} className="text-blue-600" />,
                    bg: 'bg-blue-50',
                    text: 'text-blue-900',
                    iconBg: 'bg-blue-100',
                    percentage: 40 // Example allocation
                };
            case 'CapEx':
                return {
                    icon: <Hammer size={24} className="text-purple-600" />,
                    bg: 'bg-purple-50',
                    text: 'text-purple-900',
                    iconBg: 'bg-purple-100',
                    percentage: 10
                };
            case 'Opex':
                return {
                    icon: <Zap size={24} className="text-orange-600" />,
                    bg: 'bg-orange-50',
                    text: 'text-orange-900',
                    iconBg: 'bg-orange-100',
                    percentage: 30
                };
            case 'Emergency':
                return {
                    icon: <ShieldAlert size={24} className="text-rose-600" />,
                    bg: 'bg-rose-50',
                    text: 'text-rose-900',
                    iconBg: 'bg-rose-100',
                    percentage: 10
                };
            case 'Owner':
                return {
                    icon: <Smile size={24} className="text-emerald-600" />,
                    bg: 'bg-emerald-50',
                    text: 'text-emerald-900',
                    iconBg: 'bg-emerald-100',
                    percentage: 10
                };
            default:
                return {
                    icon: <Box size={24} className="text-gray-600" />,
                    bg: 'bg-gray-50',
                    text: 'text-gray-900',
                    iconBg: 'bg-gray-100',
                    percentage: 0
                };
        }
    };

    return (
        <div>
            <h2 className="text-xl font-bold text-cafe-800 mb-6 flex items-center gap-2">
                <span className="w-2 h-8 bg-cafe-600 rounded-full"></span>
                กระเป๋าเงิน (Cloud Pockets)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                {jars.map((jar) => {
                    const config = getJarConfig(jar.id);
                    return (
                        <div
                            key={jar.id}
                            onClick={() => onJarClick(jar.id)}
                            className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer border border-cafe-50 h-40 flex flex-col justify-between relative overflow-hidden group"
                        >
                            {/* Top Row */}
                            <div className="flex justify-between items-start">
                                <div className={`w-12 h-12 rounded-2xl ${config.iconBg} flex items-center justify-center transition-transform group-hover:scale-110`}>
                                    {config.icon}
                                </div>
                                <div className="text-right">
                                    <p className={`text-xl font-bold ${config.text}`}>
                                        {formatCurrency(jar.balance)}
                                    </p>
                                </div>
                            </div>

                            {/* Bottom Row */}
                            <div className="flex justify-between items-end mt-4">
                                <div>
                                    <p className="font-semibold text-cafe-700 text-lg">{jar.name}</p>
                                    <p className="text-xs text-cafe-400 line-clamp-1">{jar.description}</p>
                                </div>
                                <div className={`text-xs font-bold px-2 py-1 rounded-lg ${config.bg} ${config.text}`}>
                                    {config.percentage}%
                                </div>
                            </div>

                            {/* Decorative Background Blob */}
                            <div className={`absolute -bottom-8 -right-8 w-24 h-24 rounded-full ${config.bg} opacity-50 blur-2xl pointer-events-none group-hover:opacity-80 transition-opacity`}></div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
