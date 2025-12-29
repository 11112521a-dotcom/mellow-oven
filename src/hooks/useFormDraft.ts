import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * useFormDraft - Auto-save form data to localStorage
 * 
 * Features:
 * - Debounced save (prevents excessive writes)
 * - Auto-restore on mount
 * - Clear on successful submit
 * - Shows if draft was restored
 * 
 * @param key - Unique key for localStorage (e.g., 'menu-stock-draft-2024-12-29')
 * @param data - Form data to save
 * @param debounceMs - Milliseconds to debounce saves (default: 1000)
 * @returns { hasDraft, clearDraft, wasRestored }
 */
export function useFormDraft<T>(
    key: string,
    data: T,
    setData: (data: T) => void,
    debounceMs: number = 1000
) {
    const [wasRestored, setWasRestored] = useState(false);
    const [hasDraft, setHasDraft] = useState(false);
    const isInitialMount = useRef(true);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Generate storage key with prefix
    const storageKey = `mellow-oven-draft:${key}`;

    // Restore draft on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                const parsed = JSON.parse(saved);
                setData(parsed);
                setWasRestored(true);
                setHasDraft(true);
                console.log(`[FormDraft] Restored draft for: ${key}`);
            }
        } catch (e) {
            console.warn('[FormDraft] Failed to restore draft:', e);
        }
        isInitialMount.current = false;
    }, [storageKey]); // Only run on mount

    // Save draft on data change (debounced)
    useEffect(() => {
        // Skip initial mount (we just restored)
        if (isInitialMount.current) return;

        // Clear previous timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        // Debounced save
        timeoutRef.current = setTimeout(() => {
            try {
                const serialized = JSON.stringify(data);
                localStorage.setItem(storageKey, serialized);
                setHasDraft(true);
                console.log(`[FormDraft] Saved draft for: ${key}`);
            } catch (e) {
                console.warn('[FormDraft] Failed to save draft:', e);
            }
        }, debounceMs);

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [data, storageKey, debounceMs, key]);

    // Clear draft (call after successful submit)
    const clearDraft = useCallback(() => {
        try {
            localStorage.removeItem(storageKey);
            setHasDraft(false);
            setWasRestored(false);
            console.log(`[FormDraft] Cleared draft for: ${key}`);
        } catch (e) {
            console.warn('[FormDraft] Failed to clear draft:', e);
        }
    }, [storageKey, key]);

    // Dismiss restored notification
    const dismissRestored = useCallback(() => {
        setWasRestored(false);
    }, []);

    return {
        hasDraft,
        wasRestored,
        clearDraft,
        dismissRestored
    };
}

/**
 * Simple version - just save/load without setter
 * For cases where you manage state separately
 */
export function useDraftStorage<T>(key: string) {
    const storageKey = `mellow-oven-draft:${key}`;

    const saveDraft = useCallback((data: T) => {
        try {
            localStorage.setItem(storageKey, JSON.stringify(data));
        } catch (e) {
            console.warn('[DraftStorage] Save failed:', e);
        }
    }, [storageKey]);

    const loadDraft = useCallback((): T | null => {
        try {
            const saved = localStorage.getItem(storageKey);
            return saved ? JSON.parse(saved) : null;
        } catch (e) {
            console.warn('[DraftStorage] Load failed:', e);
            return null;
        }
    }, [storageKey]);

    const clearDraft = useCallback(() => {
        try {
            localStorage.removeItem(storageKey);
        } catch (e) {
            console.warn('[DraftStorage] Clear failed:', e);
        }
    }, [storageKey]);

    return { saveDraft, loadDraft, clearDraft };
}
