// ============================================================
// Thai Baht Text Utility
// Convert number to Thai baht text (e.g. 370 -> "สามร้อยเจ็ดสิบบาทถ้วน")
// ============================================================

const THAI_DIGITS = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
const THAI_UNITS = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];

/**
 * Convert a number to Thai text
 */
const numberToThaiText = (num: number): string => {
    if (num === 0) return 'ศูนย์';
    if (num < 0) return 'ลบ' + numberToThaiText(Math.abs(num));

    let result = '';
    const numStr = Math.floor(num).toString();

    // Handle numbers larger than 999999
    if (num >= 1000000) {
        const millions = Math.floor(num / 1000000);
        result += numberToThaiText(millions) + 'ล้าน';
        num = num % 1000000;
        if (num === 0) return result;
    }

    // Process remaining digits
    const remaining = Math.floor(num).toString().padStart(6, '0');

    for (let i = 0; i < remaining.length; i++) {
        const digit = parseInt(remaining[i]);
        const position = remaining.length - 1 - i;

        if (digit === 0) continue;

        // Special case for position 1 (tens place)
        if (position === 1) {
            if (digit === 1) {
                result += 'สิบ';
            } else if (digit === 2) {
                result += 'ยี่สิบ';
            } else {
                result += THAI_DIGITS[digit] + 'สิบ';
            }
        }
        // Special case for position 0 (ones place)
        else if (position === 0) {
            if (digit === 1 && remaining.length > 1 && parseInt(remaining[remaining.length - 2]) !== 0) {
                result += 'เอ็ด';
            } else {
                result += THAI_DIGITS[digit];
            }
        }
        // All other positions
        else {
            result += THAI_DIGITS[digit] + THAI_UNITS[position];
        }
    }

    return result;
};

/**
 * Convert number to Thai Baht text format
 * @param amount - The amount in baht (can include satang)
 * @returns Thai text representation of the amount
 */
export const numberToBahtText = (amount: number): string => {
    if (amount === 0) return 'ศูนย์บาทถ้วน';

    const baht = Math.floor(amount);
    const satang = Math.round((amount - baht) * 100);

    let result = '';

    if (baht > 0) {
        result += numberToThaiText(baht) + 'บาท';
    }

    if (satang > 0) {
        result += numberToThaiText(satang) + 'สตางค์';
    } else {
        result += 'ถ้วน';
    }

    return result;
};

export default numberToBahtText;
