import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, X } from 'lucide-react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subMonths, subYears } from 'date-fns';
import { th } from 'date-fns/locale';

export type DateRange = {
    from: Date;
    to: Date;
    label: string;
};

export type DateRangePreset = 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'lastYear' | 'custom';

interface DateRangePickerProps {
    value: DateRange;
    onChange: (range: DateRange) => void;
    className?: string;
}

const PRESETS: { id: DateRangePreset; label: string; getValue: () => { from: Date; to: Date } }[] = [
    {
        id: 'today',
        label: 'วันนี้',
        getValue: () => ({
            from: startOfDay(new Date()),
            to: endOfDay(new Date())
        })
    },
    {
        id: 'yesterday',
        label: 'เมื่อวาน',
        getValue: () => ({
            from: startOfDay(subDays(new Date(), 1)),
            to: endOfDay(subDays(new Date(), 1))
        })
    },
    {
        id: 'thisWeek',
        label: 'สัปดาห์นี้',
        getValue: () => ({
            from: startOfWeek(new Date(), { weekStartsOn: 1 }),
            to: endOfWeek(new Date(), { weekStartsOn: 1 })
        })
    },
    {
        id: 'lastWeek',
        label: 'สัปดาห์ที่แล้ว',
        getValue: () => {
            const lastWeek = subDays(new Date(), 7);
            return {
                from: startOfWeek(lastWeek, { weekStartsOn: 1 }),
                to: endOfWeek(lastWeek, { weekStartsOn: 1 })
            };
        }
    },
    {
        id: 'thisMonth',
        label: 'เดือนนี้',
        getValue: () => ({
            from: startOfMonth(new Date()),
            to: endOfMonth(new Date())
        })
    },
    {
        id: 'lastMonth',
        label: 'เดือนที่แล้ว',
        getValue: () => {
            const lastMonth = subMonths(new Date(), 1);
            return {
                from: startOfMonth(lastMonth),
                to: endOfMonth(lastMonth)
            };
        }
    },
    {
        id: 'thisYear',
        label: 'ปีนี้',
        getValue: () => ({
            from: startOfYear(new Date()),
            to: endOfYear(new Date())
        })
    },
    {
        id: 'lastYear',
        label: 'ปีที่แล้ว',
        getValue: () => {
            const lastYear = subYears(new Date(), 1);
            return {
                from: startOfYear(lastYear),
                to: endOfYear(lastYear)
            };
        }
    }
];

export const DateRangePicker: React.FC<DateRangePickerProps> = ({ value, onChange, className = '' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [customFrom, setCustomFrom] = useState<string>('');
    const [customTo, setCustomTo] = useState<string>('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handlePresetClick = (preset: typeof PRESETS[0]) => {
        const range = preset.getValue();
        onChange({
            from: range.from,
            to: range.to,
            label: preset.label
        });
        setIsOpen(false);
    };

    const handleCustomApply = () => {
        if (customFrom && customTo) {
            const fromDate = startOfDay(new Date(customFrom));
            const toDate = endOfDay(new Date(customTo));

            onChange({
                from: fromDate,
                to: toDate,
                label: `${format(fromDate, 'd MMM', { locale: th })} - ${format(toDate, 'd MMM yyyy', { locale: th })}`
            });
            setIsOpen(false);
            setCustomFrom('');
            setCustomTo('');
        }
    };

    const formatDateRange = () => {
        if (value.label) {
            return value.label;
        }
        return `${format(value.from, 'd MMM', { locale: th })} - ${format(value.to, 'd MMM yyyy', { locale: th })}`;
    };

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-cafe-200 text-sm font-medium text-cafe-600 shadow-sm hover:bg-cafe-50 hover:border-cafe-300 transition-all"
            >
                <Calendar size={16} />
                <span>{formatDateRange()}</span>
                <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-xl border border-cafe-100 z-50 min-w-[320px] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Presets */}
                    <div className="p-3 border-b border-cafe-100">
                        <h4 className="text-xs font-semibold text-cafe-500 mb-2 uppercase tracking-wider">ช่วงเวลาที่กำหนดไว้</h4>
                        <div className="grid grid-cols-2 gap-2">
                            {PRESETS.map((preset) => (
                                <button
                                    key={preset.id}
                                    onClick={() => handlePresetClick(preset)}
                                    className={`px-3 py-2 rounded-lg text-sm text-left transition-all ${value.label === preset.label
                                            ? 'bg-cafe-600 text-white font-medium shadow-sm'
                                            : 'bg-cafe-50 text-cafe-700 hover:bg-cafe-100'
                                        }`}
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Custom Range */}
                    <div className="p-4 bg-cafe-50">
                        <h4 className="text-xs font-semibold text-cafe-500 mb-3 uppercase tracking-wider">กำหนดเองช่วงวันที่</h4>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs text-cafe-600 mb-1 font-medium">จากวันที่</label>
                                <input
                                    type="date"
                                    value={customFrom}
                                    onChange={(e) => setCustomFrom(e.target.value)}
                                    className="w-full px-3 py-2 border border-cafe-200 rounded-lg text-sm focus:ring-2 focus:ring-cafe-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-cafe-600 mb-1 font-medium">ถึงวันที่</label>
                                <input
                                    type="date"
                                    value={customTo}
                                    onChange={(e) => setCustomTo(e.target.value)}
                                    min={customFrom}
                                    className="w-full px-3 py-2 border border-cafe-200 rounded-lg text-sm focus:ring-2 focus:ring-cafe-500 focus:border-transparent"
                                />
                            </div>
                            <button
                                onClick={handleCustomApply}
                                disabled={!customFrom || !customTo}
                                className="w-full bg-cafe-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-cafe-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                            >
                                ใช้ช่วงเวลานี้
                            </button>
                        </div>
                    </div>

                    {/* Current Selection Info */}
                    {value && (
                        <div className="p-3 bg-cafe-900 text-white text-xs">
                            <div className="flex items-center justify-between">
                                <span className="text-cafe-300">เลือก:</span>
                                <span className="font-medium">{formatDateRange()}</span>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
