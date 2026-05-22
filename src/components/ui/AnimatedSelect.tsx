import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils'; // Assuming clsx/tailwind-merge is in utils

export interface SelectOption {
    value: string;
    label: string;
    icon?: React.ReactNode;
}

interface AnimatedSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: SelectOption[];
    icon?: LucideIcon;
    className?: string;
    placeholder?: string;
}

export function AnimatedSelect({
    value,
    onChange,
    options,
    icon: Icon,
    className,
    placeholder = 'Select...'
}: AnimatedSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(opt => opt.value === value);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className={cn("relative z-20", className)} ref={containerRef}>
            {/* Trigger Button */}
            <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "w-full bg-white/80 backdrop-blur-sm rounded-xl px-4 py-2.5",
                    "flex items-center justify-between gap-3",
                    "border border-amber-100 shadow-sm transition-colors",
                    "hover:bg-amber-50 hover:border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-400/30",
                    isOpen && "bg-white border-amber-300 ring-2 ring-amber-400/20"
                )}
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    {Icon && <Icon size={18} className={cn("shrink-0 transition-colors", isOpen ? "text-amber-600" : "text-amber-500")} />}
                    {selectedOption?.icon && <span className="shrink-0">{selectedOption.icon}</span>}
                    <span className="font-medium text-stone-700 truncate">
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                </div>
                <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                    <ChevronDown size={16} className="text-stone-400" />
                </motion.div>
            </motion.button>

            {/* Dropdown Menu */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                        className={cn(
                            "absolute top-full left-0 right-0 mt-2 min-w-[200px]",
                            "bg-white rounded-2xl shadow-xl shadow-amber-900/5 border border-amber-100",
                            "overflow-hidden flex flex-col py-1 z-50 origin-top"
                        )}
                    >
                        <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                            {options.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => {
                                        onChange(option.value);
                                        setIsOpen(false);
                                    }}
                                    className={cn(
                                        "w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors",
                                        "hover:bg-amber-50 text-sm",
                                        value === option.value ? "bg-amber-50/50 text-amber-900 font-semibold" : "text-stone-600 font-medium"
                                    )}
                                >
                                    {option.icon && <span>{option.icon}</span>}
                                    <span className="truncate">{option.label}</span>
                                    {value === option.value && (
                                        <motion.div
                                            layoutId="active-indicator"
                                            className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-500"
                                        />
                                    )}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
