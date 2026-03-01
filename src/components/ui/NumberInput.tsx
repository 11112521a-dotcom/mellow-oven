import React, { useState, useEffect } from 'react';

interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
    value: number;
    onChange: (value: number) => void;
    allowDecimals?: boolean;
}

export const NumberInput: React.FC<NumberInputProps> = ({
    value,
    onChange,
    allowDecimals = false,
    className = "",
    ...props
}) => {
    const [displayValue, setDisplayValue] = useState<string>(value === 0 ? '' : value.toString());

    useEffect(() => {
        // Only update display value from props if the parsed display value doesn't match the prop value
        // This prevents cursor jumping or weird formatting while typing
        if (parseFloat(displayValue) !== value && !(displayValue === '' && value === 0)) {
            setDisplayValue(value === 0 ? '' : value.toString());
        }
        // Special case: if prop is 0 and we want to show 0, we can. 
        // But usually we want to allow empty.
        // Let's stick to: if prop changes externally, update display.
        // But we need to be careful not to overwrite user typing "0." or "-".

        // Simpler approach: Always sync if they differ significantly, but trust local state while typing.
        // Actually, the issue is usually one-way sync.

        // Let's try a simpler "controlled" approach that just handles the "empty -> 0" conversion on blur or change, 
        // but allows empty string in the input.

        if (value === 0 && displayValue === '') return; // Don't force 0 if user cleared it
        if (Number(displayValue) === value) return; // Don't update if effectively same

        setDisplayValue(value.toString());
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value;

        // 1. Strip Leading Zeros (ยกเว้น 0. สำหรับทศนิยม)
        // ใช้ regex: ^0+(?!\.) เพื่อลบ 0 นำหน้าที่ไม่ได้ตามมาด้วยจุด
        val = val.replace(/^0+(?!\.)/, '');

        // 2. Allow Empty State
        setDisplayValue(val);

        if (val === '') {
            onChange(0);
            return;
        }

        const num = parseFloat(val);
        if (!isNaN(num)) {
            onChange(num);
        }
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        e.target.select();
        props.onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        let finalVal = displayValue;

        // 2. Allow Empty State -> Convert to 0 onBlur
        if (finalVal === '' || finalVal === '-') {
            finalVal = '0';
        } else if (finalVal.endsWith('.')) {
            // Clean up trailing dot on blur
            finalVal = finalVal.slice(0, -1);
        }

        setDisplayValue(finalVal);

        const num = parseFloat(finalVal);
        if (!isNaN(num)) {
            onChange(num);
        }

        props.onBlur?.(e);
    }

    return (
        <input
            type="number"
            value={displayValue}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className={className}
            step={allowDecimals ? "any" : "1"}
            {...props}
        />
    );
};
