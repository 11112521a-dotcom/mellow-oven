import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '../../lib/utils';
import { LucideIcon } from 'lucide-react';

interface AnimatedButtonProps extends Omit<HTMLMotionProps<"button">, 'children'> {
    children: React.ReactNode;
    icon?: LucideIcon;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    glow?: boolean;
    fullWidth?: boolean;
}

export function AnimatedButton({
    children,
    icon: Icon,
    variant = 'primary',
    glow = false,
    fullWidth = false,
    className,
    ...props
}: AnimatedButtonProps) {
    const baseStyles = "relative flex items-center justify-center gap-2 font-medium transition-colors outline-none overflow-hidden";
    
    const variants = {
        primary: "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md hover:from-amber-400 hover:to-orange-400 focus:ring-2 focus:ring-amber-400/50",
        secondary: "bg-amber-100 text-amber-800 hover:bg-amber-200 focus:ring-2 focus:ring-amber-400/30",
        outline: "bg-white border-2 border-stone-200 text-stone-700 hover:border-amber-400 hover:text-amber-700 focus:ring-2 focus:ring-amber-400/30",
        ghost: "bg-transparent text-stone-600 hover:bg-stone-100 focus:ring-2 focus:ring-stone-400/30",
        danger: "bg-rose-50 text-rose-600 hover:bg-rose-100 focus:ring-2 focus:ring-rose-400/30 border border-rose-100"
    };

    return (
        <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            className={cn(
                baseStyles,
                variants[variant],
                fullWidth ? 'w-full px-4 py-3 rounded-xl' : 'px-4 py-2.5 rounded-xl',
                className
            )}
            {...props}
        >
            {/* Glow effect in background */}
            {glow && (
                <motion.div
                    className="absolute inset-0 bg-white/20 blur-md rounded-xl z-0"
                    initial={{ opacity: 0 }}
                    whileHover={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                />
            )}
            
            {/* Content */}
            <div className="relative z-10 flex items-center gap-2">
                {Icon && (
                    <motion.div 
                        initial={false}
                        whileHover={glow ? { y: -2 } : {}}
                        transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    >
                        <Icon size={18} className={variant === 'primary' ? 'text-amber-50' : ''} />
                    </motion.div>
                )}
                {children}
            </div>
            
            {/* Ripple-like flash on tap */}
            <motion.div
                className="absolute inset-0 bg-white/30 z-20"
                initial={{ opacity: 0 }}
                whileTap={{ opacity: 1 }}
                transition={{ duration: 0.1 }}
                style={{ pointerEvents: 'none' }}
            />
        </motion.button>
    );
}
