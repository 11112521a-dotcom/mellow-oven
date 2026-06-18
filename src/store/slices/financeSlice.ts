import { StateCreator } from 'zustand';
import { AppState, FinanceSlice } from '../types';
import { supabase } from '../../lib/supabase';
import { Alert, JarType, Transaction, UnallocatedProfit } from '../../../types';

export const createFinanceSlice: StateCreator<AppState, [], [], FinanceSlice> = (set, get) => ({
    jars: [
        { id: 'Working', name: 'เติมทุนหมุน', balance: 0, allocationPercent: 0.2, description: 'เงินทุนหมุนเวียน' },
        { id: 'CapEx', name: 'อุปกรณ์', balance: 0, allocationPercent: 0.45, description: 'ลงทุน/ซ่อมแซมอุปกรณ์' },
        { id: 'Opex', name: 'น้ำไฟแก๊ส', balance: 0, allocationPercent: 0.1, description: 'ค่าน้ำ ไฟ แก๊ส' },
        { id: 'Emergency', name: 'ฉุกเฉิน', balance: 0, allocationPercent: 0.05, description: 'สำรองฉุกเฉิน' },
        { id: 'Owner', name: 'เจ้าของ', balance: 0, allocationPercent: 0.2, description: 'กำไรเจ้าของ' },
    ],
    transactions: [],
    unallocatedProfits: [],
    goals: [],
    alerts: [],
    jarHistory: [],
    jarCustomizations: [],
    allocationProfiles: [],
    defaultProfileId: 'default',

    selectedWalletId: null,
    setSelectedWalletId: (id) => {
        set({ selectedWalletId: id });
        get().recalculateJarBalances();
    },

    recalculateJarBalances: () => {
        const { transactions, selectedWalletId, jars } = get();
        const calculatedBalances: Record<string, number> = {
            'Working': 0, 'CapEx': 0, 'Opex': 0, 'Emergency': 0, 'Owner': 0
        };

        transactions.forEach(tx => {
            // Filter by selected wallet (null = main store, UUID = external shop)
            const isMatch = selectedWalletId ? tx.walletId === selectedWalletId : (!tx.walletId || tx.walletId === 'main');
            if (!isMatch) return;

            if (tx.type === 'INCOME' && tx.toJar) {
                calculatedBalances[tx.toJar] = (calculatedBalances[tx.toJar] || 0) + tx.amount;
            } else if (tx.type === 'EXPENSE' && tx.fromJar) {
                calculatedBalances[tx.fromJar] = (calculatedBalances[tx.fromJar] || 0) - tx.amount;
            } else if (tx.type === 'TRANSFER') {
                if (tx.fromJar) calculatedBalances[tx.fromJar] = (calculatedBalances[tx.fromJar] || 0) - tx.amount;
                if (tx.toJar) calculatedBalances[tx.toJar] = (calculatedBalances[tx.toJar] || 0) + tx.amount;
            }
        });

        set({
            jars: jars.map(jar => ({
                ...jar,
                balance: calculatedBalances[jar.id] || 0
            }))
        });
    },

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
            market_id: transaction.marketId,
            wallet_id: transaction.walletId
        };
        delete dbTransaction.fromJar;
        delete dbTransaction.toJar;
        delete dbTransaction.marketId;
        delete dbTransaction.walletId;

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
            created_at: profit.createdAt,
            wallet_id: profit.walletId || null
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
        const targetWalletId = state.selectedWalletId;
        
        // ONLY allocate from the currently selected wallet's profits
        const filteredProfits = state.unallocatedProfits.filter(p => 
            targetWalletId ? p.walletId === targetWalletId : (!p.walletId || p.walletId === 'main')
        );
        
        const sortedProfits = [...filteredProfits].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        let remaining = amount;

        const dbUpdates: Array<{ id: string; amount: number }> = [];
        const stateUpdates: Record<string, number> = {};

        for (const profit of sortedProfits) {
            if (remaining <= 0) break;
            const deduct = Math.min(profit.amount, remaining);
            const newAmount = Math.max(0, profit.amount - deduct);

            dbUpdates.push({ id: profit.id, amount: newAmount });
            stateUpdates[profit.id] = newAmount;

            remaining -= deduct;
        }

        if (dbUpdates.length === 0) return;

        // Run database updates in parallel
        const updatePromises = dbUpdates.map(upd => 
            supabase.from('unallocated_profits').update({ amount: upd.amount }).eq('id', upd.id)
        );
        const results = await Promise.all(updatePromises);
        const errors = results.filter(r => r.error);
        if (errors.length > 0) {
            throw new Error(`Failed to update unallocated profits: ${errors.map(e => e.error?.message).join(', ')}`);
        }

        // Update Zustand state in a single batch set call
        set((state) => ({
            unallocatedProfits: state.unallocatedProfits.map(p => 
                stateUpdates[p.id] !== undefined ? { ...p, amount: stateUpdates[p.id] } : p
            )
        }));
    },

    getUnallocatedBalance: () => {
        const state = get();
        const walletId = state.selectedWalletId;
        return state.unallocatedProfits
            .filter(p => walletId ? p.walletId === walletId : (!p.walletId || p.walletId === 'main'))
            .reduce((sum, p) => sum + p.amount, 0);
    },
    getUnallocatedByDate: (date) => {
        const state = get();
        const walletId = state.selectedWalletId;
        return state.unallocatedProfits
            .filter(p => walletId ? p.walletId === walletId : (!p.walletId || p.walletId === 'main'))
            .filter(p => p.date.startsWith(date));
    },

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
    },

    executeAllocation: async (amount, allocations, fromProfit = false, specificProfits, manualDebtAmount) => {
        const { debtConfig } = get();

        // Calculate debt deduction
        let debtDeduction = 0;
        let workingAmount = amount;

        if (manualDebtAmount !== undefined) {
            debtDeduction = manualDebtAmount;
            workingAmount = Math.max(0, amount - debtDeduction);
        } else if (debtConfig.isEnabled && amount > 0) {
            if (amount >= debtConfig.safetyThreshold) {
                debtDeduction = debtConfig.fixedAmount;
            } else {
                debtDeduction = amount * debtConfig.safetyRatio;
            }
            workingAmount = amount - debtDeduction;
        }

        // Helper: Round down to nearest 5
        const roundToFive = (n: number) => Math.floor(n / 5) * 5;

        // Calculate raw amounts first (using workingAmount after debt deduction)
        const rawAmounts: Record<JarType, number> = {} as Record<JarType, number>;
        let totalRounded = 0;

        // Round all jars EXCEPT Owner
        Object.entries(allocations).forEach(([jarId, percentage]) => {
            const rawAmount = (workingAmount * percentage) / 100;
            if (jarId !== 'Owner') {
                const rounded = roundToFive(rawAmount);
                rawAmounts[jarId as JarType] = rounded;
                totalRounded += rounded;
            }
        });

        // Owner gets the remainder (to keep total exact)
        const ownerRemainder = workingAmount - totalRounded;
        rawAmounts['Owner'] = ownerRemainder;

        // Step 1: Prepare unallocated profits updates if fromProfit is true
        const profitsToUpsert: UnallocatedProfit[] = [];
        let updatedUnallocatedProfits = get().unallocatedProfits;

        if (fromProfit) {
            if (specificProfits && specificProfits.length > 0) {
                const updatedMap = new Map<string, number>();
                for (const sp of specificProfits) {
                    const p = updatedUnallocatedProfits.find(x => x.id === sp.id);
                    if (p) {
                        const newAmt = Math.max(0, p.amount - sp.amount);
                        updatedMap.set(sp.id, newAmt);
                        profitsToUpsert.push({ ...p, amount: newAmt });
                    }
                }
                updatedUnallocatedProfits = updatedUnallocatedProfits.map(p => {
                    if (updatedMap.has(p.id)) {
                        return { ...p, amount: updatedMap.get(p.id)! };
                    }
                    return p;
                });
            } else {
                const targetWalletId = get().selectedWalletId;
                const filteredProfits = updatedUnallocatedProfits.filter(p => 
                    targetWalletId ? p.walletId === targetWalletId : (!p.walletId || p.walletId === 'main')
                );
                
                const sortedProfits = [...filteredProfits].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                let remaining = amount;
                const updatedMap = new Map<string, number>();

                for (const profit of sortedProfits) {
                    if (remaining <= 0) break;
                    const deduct = Math.min(profit.amount, remaining);
                    const newAmt = Math.max(0, profit.amount - deduct);
                    updatedMap.set(profit.id, newAmt);
                    profitsToUpsert.push({ ...profit, amount: newAmt });
                    remaining -= deduct;
                }
                updatedUnallocatedProfits = updatedUnallocatedProfits.map(p => {
                    if (updatedMap.has(p.id)) {
                        return { ...p, amount: updatedMap.get(p.id)! };
                    }
                    return p;
                });
            }
        }

        // Step 2: Prepare transactions list
        const transactionsToInsert: Transaction[] = [];
        const timestamp = new Date().toISOString();

        const currentWalletId = get().selectedWalletId;

        if (debtDeduction > 0) {
            transactionsToInsert.push({
                id: crypto.randomUUID(),
                date: timestamp,
                amount: debtDeduction,
                type: 'INCOME',
                category: 'Debt Repayment',
                description: `หักเข้ากองทุนหนี้ (Priority Deduction)`,
                toJar: 'Owner',
                walletId: currentWalletId || null
            });
        }

        Object.entries(rawAmounts).forEach(([jarId, jarAmount]) => {
            if (jarAmount > 0) {
                const percentage = allocations[jarId as JarType] || 0;
                transactionsToInsert.push({
                    id: crypto.randomUUID(),
                    date: timestamp,
                    amount: jarAmount,
                    type: 'INCOME',
                    category: 'Allocation',
                    description: fromProfit
                        ? `จัดสรรจากกำไร (${percentage}%)`
                        : `จัดสรรเงินเข้าระบบ (${percentage}%)`,
                    toJar: jarId as JarType,
                    walletId: currentWalletId || null
                });
            }
        });

        const dbTransactions = transactionsToInsert.map(t => ({
            id: t.id,
            date: t.date,
            amount: t.amount,
            type: t.type,
            description: t.description,
            category: t.category,
            to_jar: t.toJar,
            from_jar: t.fromJar,
            market_id: t.marketId,
            wallet_id: t.walletId || null
        }));

        // Step 3: Prepare local state updates
        const updatedJars = get().jars.map(jar => {
            let added = 0;
            if (jar.id === 'Owner' && debtDeduction > 0) {
                added += debtDeduction;
            }
            const allocatedAmt = rawAmounts[jar.id] || 0;
            added += allocatedAmt;

            if (added !== 0) {
                return { ...jar, balance: jar.balance + added };
            }
            return jar;
        });

        const updatedDebtConfig = {
            ...get().debtConfig,
            accumulatedAmount: get().debtConfig.accumulatedAmount + debtDeduction
        };

        // Step 4: Perform DB operations (Parallel and Batch)
        const dbPromises: Promise<any>[] = [];

        if (profitsToUpsert.length > 0) {
            const dbUpserts = profitsToUpsert.map(p => ({
                id: p.id,
                date: p.date,
                amount: p.amount,
                source: p.source,
                created_at: p.createdAt
            }));
            dbPromises.push(Promise.resolve(supabase.from('unallocated_profits').upsert(dbUpserts)));
        }

        if (dbTransactions.length > 0) {
            dbPromises.push(Promise.resolve(supabase.from('transactions').insert(dbTransactions)));
        }

        if (debtDeduction > 0) {
            dbPromises.push(Promise.resolve((async () => {
                const { data: debtConfigData } = await supabase.from('debt_config').select('id').single();
                if (debtConfigData?.id) {
                    return supabase.from('debt_config').update({ accumulated_amount: updatedDebtConfig.accumulatedAmount }).eq('id', debtConfigData.id);
                }
            })()));
        }

        const results = await Promise.all(dbPromises);
        for (const res of results) {
            if (res?.error) {
                console.error('Database write error during allocation:', res.error);
                throw new Error(res.error.message || 'Database write failed');
            }
        }

        // Step 5: Update Zustand state in a single batch set call
        set((state) => ({
            jars: updatedJars,
            transactions: [...transactionsToInsert, ...state.transactions],
            unallocatedProfits: updatedUnallocatedProfits,
            debtConfig: updatedDebtConfig
        }));
    }
});
