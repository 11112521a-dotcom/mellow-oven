import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | null | undefined): string {
    if (amount === null || amount === undefined || isNaN(amount)) {
        return '฿0.00';
    }
    try {
        return new Intl.NumberFormat('th-TH', {
            style: 'currency',
            currency: 'THB',
        }).format(amount)
    } catch (e) {
        return '฿0.00';
    }
}

export function formatDate(date: Date | string | null | undefined): string {
    if (!date) return '-';
    try {
        const d = new Date(date)
        if (isNaN(d.getTime())) return '-'; // Check for Invalid Date
        return new Intl.DateTimeFormat('th-TH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        }).format(d)
    } catch (e) {
        return '-';
    }
}
