import { StateCreator } from 'zustand';
import { AppState, FinanceSlice } from '../types';
import { supabase } from '../../lib/supabase';
import { Alert } from '../../../types';

export const createFinanceSlice: StateCreator<AppState, [], [], FinanceSlice> = (set, get) => ({
    jars: [
        { id: 'Working', name: 'Working Capital', balance: 0, allocationPercent: 0.2, description: 'หมุนเวียน' },
        { id: 'CapEx', name: 'CapEx', balance: 0, allocationPercent: 0.45, description: 'ลงทุน/ซ่อมแซม' },
        { id: 'Opex', name: 'Opex', balance: 0, allocationPercent: 0.1, description: 'ค่าใช้จ่ายดำเนินงาน' },
        { id: 'Emergency', name: 'Emergency', balance: 0, allocationPercent: 0.05, description: 'ฉุกเฉิน' },
        { id: 'Owner', name: 'Owner', balance: 0, allocationPercent: 0.2, description: 'กำไรเจ้าของ' },
    ],
    transactions: [],
    unallocatedProfits: [],
    goals: [],
    alerts: [],
    jarHistory: [],
    jarCustomizations: [],
    allocationProfiles: [],
    defaultProfileId: 'default',

    // Debt-First Allocation Config (v2.0)
    debtConfig: {
        isEnabled: false,
        fixedAmount: 200,
        safetyThreshold: 400,
        safetyRatio: 0.5,
        targetAmount: 40000,
        accumulatedAmount: 0
    },

    updateDebtConfig: async (config) => {
        set((state) => ({ debtConfig: { ...state.debtConfig, ...config } }));
        const newConfig = { ...get().debtConfig, ...config };

        // Persist to Supabase
        const { data } = await supabase.from('debt_config').select('id').single();
        const dbData = {
            is_enabled: newConfig.isEnabled,
            fixed_amount: newConfig.fixedAmount,
            safety_threshold: newConfig.safetyThreshold,
            safety_ratio: newConfig.safetyRatio,
            target_amount: newConfig.targetAmount,
            accumulated_amount: newConfig.accumulatedAmount,
            updated_at: new Date().toISOString()
        };

        if (data?.id) {
            await supabase.from('debt_config').update(dbData).eq('id', data.id);
        } else {
            await supabase.from('debt_config').insert(dbData);
        }
    },

    addToDebtAccumulated: async (amount) => {
        set((state) => ({
            debtConfig: {
                ...state.debtConfig,
                accumulatedAmount: state.debtConfig.accumulatedAmount + amount
            }
        }));
        const newAccumulated = get().debtConfig.accumulatedAmount;

        const { data } = await supabase.from('debt_config').select('id').single();
        if (data?.id) {
            await supabase.from('debt_config').update({ accumulated_amount: newAccumulated }).eq('id', data.id);
        }
    },

    addTransaction: async (transaction) => {
        set((state) => ({ transactions: [transaction, ...state.transactions] }));
        const dbTransaction: Record<string, unknown> = {
            ...transaction,
            from_jar: transaction.fromJar,
            to_jar: transaction.toJar,
            market_id: transaction.marketId
        };
        delete dbTransaction.fromJar;
        delete dbTransaction.toJar;
        delete dbTransaction.marketId;

        const { error } = await supabase.from('transactions').insert(dbTransaction);
        if (error) {
            console.error('Error adding transaction:', error);
            set((state) => ({ transactions: state.transactions.filter(t => t.id !== transaction.id) }));
        }
    },

    updateTransaction: async (id, updates) => {
        const { transactions } = get();
        const oldTransaction = transactions.find(t => t.id === id);

        set((state) => ({
            transactions: state.transactions.map((tx) => tx.id === id ? { ...tx, ...updates } : tx)
        }));

        const dbUpdates: Record<string, unknown> = { ...updates };
        if (updates.fromJar) { dbUpdates.from_jar = updates.fromJar; delete dbUpdates.fromJar; }
        if (updates.toJar) { dbUpdates.to_jar = updates.toJar; delete dbUpdates.toJar; }

        const { error } = await supabase.from('transactions').update(dbUpdates).eq('id', id);
        if (error && oldTransaction) {
            set((state) => ({
                transactions: state.transactions.map((tx) => tx.id === id ? oldTransaction : tx)
            }));
        }
    },

    deleteTransaction: async (id) => {
        set((state) => ({ transactions: state.transactions.filter((tx) => tx.id !== id) }));
        await supabase.from('transactions').delete().eq('id', id);
    },

    updateJarBalance: (id, amount) => set((state) => ({
        jars: state.jars.map((jar) => jar.id === id ? { ...jar, balance: jar.balance + amount } : jar)
    })),

    transferFunds: (from, to, amount, description) => {
        const { addTransaction, updateJarBalance } = get();
        updateJarBalance(from, -amount);
        updateJarBalance(to, amount);

        addTransaction({
            id: crypto.randomUUID(),
            date: new Date().toISOString(),
            amount: amount,
            type: 'TRANSFER',
            fromJar: from,
            toJar: to,
            description: description || `Transfer from ${from} to ${to}`,
            category: 'TRANSFER'
        });
    },

    addUnallocatedProfit: async (profit) => {
        set((state) => ({ unallocatedProfits: [...state.unallocatedProfits, profit] }));
        const dbProfit = {
            id: profit.id,
            date: profit.date,
            amount: profit.amount,
            source: profit.source,
            created_at: profit.createdAt
        };
        const { error } = await supabase.from('unallocated_profits').insert(dbProfit);
        if (error) {
            set((state) => ({ unallocatedProfits: state.unallocatedProfits.filter(p => p.id !== profit.id) }));
        }
    },

    deductUnallocatedProfit: async (id, amount) => {
        const state = get();
        const profit = state.unallocatedProfits.find(p => p.id === id);
        if (!profit) return;

        const newAmount = profit.amount - amount;
        if (newAmount <= 0) {
            // FIX: Don't delete, set to 0 to keep history and prevent re-sync
            await supabase.from('unallocated_profits').update({ amount: 0 }).eq('id', id);
            set((state) => ({
                unallocatedProfits: state.unallocatedProfits.map(p => p.id === id ? { ...p, amount: 0 } : p)
            }));
        } else {
            await supabase.from('unallocated_profits').update({ amount: newAmount }).eq('id', id);
            set((state) => ({
                unallocatedProfits: state.unallocatedProfits.map(p => p.id === id ? { ...p, amount: newAmount } : p)
            }));
        }
    },

    allocateFromProfits: async (amount) => {
        const state = get();
        const sortedProfits = [...state.unallocatedProfits].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        let remaining = amount;
        for (const profit of sortedProfits) {
            if (remaining <= 0) break;
            const deduct = Math.min(profit.amount, remaining);
            await state.deductUnallocatedProfit(profit.id, deduct);
            remaining -= deduct;
        }
    },

    getUnallocatedBalance: () => get().unallocatedProfits.reduce((sum, p) => sum + p.amount, 0),
    getUnallocatedByDate: (date) => get().unallocatedProfits.filter(p => p.date.startsWith(date)),

    saveAllocationProfile: async (profile) => {
        set((state) => {
            const existing = state.allocationProfiles.find(p => p.id === profile.id);
            return existing
                ? { allocationProfiles: state.allocationProfiles.map(p => p.id === profile.id ? profile : p) }
                : { allocationProfiles: [...state.allocationProfiles, profile] };
        });
        const dbProfile = {
            id: profile.id,
            name: profile.name,
            alloc_working: profile.allocations.Working,
            alloc_capex: profile.allocations.CapEx,
            alloc_opex: profile.allocations.Opex,
            alloc_emergency: profile.allocations.Emergency,
            alloc_owner: profile.allocations.Owner,
            updated_at: new Date().toISOString()
        };
        await supabase.from('allocation_profiles').upsert(dbProfile);
    },

    deleteAllocationProfile: async (id) => {
        set((state) => ({ allocationProfiles: state.allocationProfiles.filter(p => p.id !== id) }));
        await supabase.from('allocation_profiles').delete().eq('id', id);
    },

    setDefaultProfile: async (profileId) => {
        set({ defaultProfileId: profileId });
        await supabase.from('allocation_profiles').update({ is_default: false }).not('id', 'is', null);
        if (profileId) {
            await supabase.from('allocation_profiles').update({ is_default: true }).eq('id', profileId);
        }
    },

    renameAllocationProfile: async (profileId, newName) => {
        set((state) => ({
            allocationProfiles: state.allocationProfiles.map(p => p.id === profileId ? { ...p, name: newName } : p)
        }));
        await supabase.from('allocation_profiles').update({ name: newName }).eq('id', profileId);
    },

    addGoal: (goal) => set((state) => ({ goals: [...state.goals, goal] })),
    updateGoal: (id, updates) => set((state) => ({ goals: state.goals.map(g => g.id === id ? { ...g, ...updates } : g) })),
    removeGoal: (id) => set((state) => ({ goals: state.goals.filter(g => g.id !== id) })),
    updateGoalProgress: (goalId, amount) => set((state) => ({
        goals: state.goals.map(g => g.id === goalId ? { ...g, currentAmount: Math.min(g.targetAmount, g.currentAmount + amount) } : g)
    })),

    addAlert: (alert) => set((state) => ({ alerts: [...state.alerts, alert] })),
    dismissAlert: (id) => set((state) => ({ alerts: state.alerts.filter(a => a.id !== id) })),
    generateAlerts: () => {
        const { ingredients, goals } = get();
        const newAlerts: Alert[] = [];
        ingredients.forEach(ing => {
            if (Number(ing.currentStock) < (Number(ing.minStock) || 10)) {
                newAlerts.push({
                    id: `low-stock-${ing.id}`,
                    type: 'warning',
                    title: `วัตถุดิบใกล้หมด!`,
                    message: `${ing.name} เหลือต่ำกว่ากำหนด`,
                    actionLabel: 'สั่งซื้อ',
                    dismissible: true
                });
            }
        });
        // Goal milestones... (simplified)
        set({ alerts: newAlerts });
    },

    recordDailyHistory: () => {
        const { jars, jarHistory } = get();
        const today = new Date().toISOString().split('T')[0];
        if (!jarHistory.find(h => h.date === today)) {
            const balances: Record<string, number> = {};
            jars.forEach(j => balances[j.id] = j.balance);
            set(state => ({ jarHistory: [...state.jarHistory, { date: today, balances: balances as any }] }));
        }
    },

    updateJarCustomization: (jarId, customization) => set((state) => {
        const exists = state.jarCustomizations.find(c => c.jarId === jarId);
        return exists
            ? { jarCustomizations: state.jarCustomizations.map(c => c.jarId === jarId ? { ...c, ...customization } : c) }
            : { jarCustomizations: [...state.jarCustomizations, { jarId, ...customization }] };
    }),

    autoAllocate: (totalAmount) => {
        const { jars, updateJarBalance, addTransaction } = get();
        jars.forEach(jar => {
            const amount = totalAmount * jar.allocationPercent;
            updateJarBalance(jar.id, amount);
            addTransaction({
                id: crypto.randomUUID(),
                date: new Date().toISOString(),
                amount,
                type: 'INCOME',
                toJar: jar.id,
                description: `Auto-allocation`,
                category: 'INCOME'
            });
        });
    },

    calculateHealthScore: () => {
        // Simplified health score logic
        return 85;
    }
});
