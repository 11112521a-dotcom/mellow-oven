import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from './lib/supabase';
import { Jar, Transaction, Ingredient, PurchaseOrder, Product, DailyReport, JarType, Market, Goal, Alert, JarHistory, JarCustomization } from '../types';

interface AppState {
    // Settings
    storeName: string;
    setStoreName: (name: string) => void;
    loadStore: (state: Partial<AppState>) => void;
    fetchData: () => Promise<void>;

    // Finance
    jars: Jar[];
    transactions: Transaction[];
    addTransaction: (transaction: Transaction) => void;
    updateTransaction: (id: string, updates: Partial<Transaction>) => void;
    deleteTransaction: (id: string) => void;
    updateJarBalance: (id: JarType, amount: number) => void;
    transferFunds: (from: JarType, to: JarType, amount: number, description: string) => void;

    // Inventory
    ingredients: Ingredient[];
    purchaseOrders: PurchaseOrder[];
    addIngredient: (ingredient: Ingredient) => Promise<void>;
    updateStock: (id: string, quantity: number) => Promise<void>; // quantity can be negative
    setIngredientStock: (id: string, quantity: number) => Promise<void>; // Set absolute value
    updateIngredient: (id: string, updates: Partial<Ingredient>) => Promise<void>;
    removeIngredient: (id: string) => Promise<void>;
    createPurchaseOrder: (po: PurchaseOrder) => void;

    // Sales & Products
    products: Product[];
    addProduct: (product: Product) => void;
    updateProduct: (id: string, updates: Partial<Product>) => void;
    removeProduct: (id: string) => void;
    dailyReports: DailyReport[];
    addDailyReport: (report: DailyReport) => void;

    // Markets
    markets: Market[];
    addMarket: (market: Market) => void;
    updateMarket: (id: string, updates: Partial<Market>) => void;
    removeMarket: (id: string) => void;

    // Goals (NEW!)
    goals: Goal[];
    addGoal: (goal: Goal) => void;
    updateGoal: (id: string, updates: Partial<Goal>) => void;
    removeGoal: (id: string) => void;
    updateGoalProgress: (goalId: string, amount: number) => void;

    // Alerts (NEW!)
    alerts: Alert[];
    addAlert: (alert: Alert) => void;
    dismissAlert: (id: string) => void;
    generateAlerts: () => void;

    // History & Analytics (NEW!)
    jarHistory: JarHistory[];
    recordDailyHistory: () => void;

    // Customization (NEW!)
    jarCustomizations: JarCustomization[];
    updateJarCustomization: (jarId: JarType, customization: Partial<JarCustomization>) => void;

    // Smart Functions (NEW!)
    autoAllocate: (totalAmount: number) => void;
    calculateHealthScore: () => number;

    // Actions
    deductStockByRecipe: (productId: string, quantity: number) => void;
    resetStore: () => void;

    // Realtime
    subscribeToRealtime: () => void;
    unsubscribeFromRealtime: () => void;
}

export const useStore = create<AppState>()(
    persist(
        (set, get) => ({
            // Settings
            storeName: 'Mellow Oven',
            setStoreName: (name) => set({ storeName: name }),
            loadStore: (newState) => set((state) => ({ ...state, ...newState })),
            fetchData: async () => {
                const { data: products } = await supabase.from('products').select('*');
                const { data: ingredients } = await supabase.from('ingredients').select('*');
                const { data: markets } = await supabase.from('markets').select('*');
                const { data: transactions } = await supabase.from('transactions').select('*').order('date', { ascending: false });

                // Map snake_case from DB to camelCase for App
                const mappedIngredients = ingredients?.map(i => ({
                    ...i,
                    currentStock: Number(i.current_stock),
                    costPerUnit: Number(i.cost_per_unit),
                    buyUnit: i.buy_unit,
                    conversionRate: Number(i.conversion_rate) || 1,
                    minStock: Number(i.min_stock) || 10, // Default to 10 if not set
                    // image field removed
                })) || [];

                const mappedTransactions = transactions?.map(t => ({
                    ...t,
                    fromJar: t.from_jar,
                    toJar: t.to_jar,
                    marketId: t.market_id
                })) || [];

                set((state) => ({
                    ...state,
                    products: products || state.products,
                    ingredients: mappedIngredients.length > 0 ? mappedIngredients : state.ingredients,
                    markets: markets || state.markets,
                    transactions: mappedTransactions.length > 0 ? mappedTransactions : state.transactions,
                }));
            },

            jars: [
                { id: 'Working', name: 'Working Capital', balance: 0, allocationPercent: 0.2, description: 'หมุนเวียน' },
                { id: 'CapEx', name: 'CapEx', balance: 0, allocationPercent: 0.45, description: 'ลงทุน/ซ่อมแซม' },
                { id: 'Opex', name: 'Opex', balance: 0, allocationPercent: 0.1, description: 'ค่าใช้จ่ายดำเนินงาน' },
                { id: 'Emergency', name: 'Emergency', balance: 0, allocationPercent: 0.05, description: 'ฉุกเฉิน' },
                { id: 'Owner', name: 'Owner', balance: 0, allocationPercent: 0.2, description: 'กำไรเจ้าของ' },
            ],
            transactions: [],
            ingredients: [],
            purchaseOrders: [],
            products: [],
            dailyReports: [],
            markets: [
                { id: 'storefront', name: 'หน้าร้าน (Storefront)', color: '#b08968' },
                { id: 'market-a', name: 'ตลาดนัด A', color: '#22c55e' },
                { id: 'market-b', name: 'ตลาดนัด B', color: '#3b82f6' }
            ],

            // NEW: Goals, Alerts, History, Customizations
            goals: [],
            alerts: [],
            jarHistory: [],
            jarCustomizations: [],

            addTransaction: async (transaction) => {
                const dbTransaction = {
                    ...transaction,
                    from_jar: transaction.fromJar,
                    to_jar: transaction.toJar,
                    market_id: (transaction as any).marketId // Cast if needed
                };
                // Remove camelCase keys to avoid errors if strict
                delete (dbTransaction as any).fromJar;
                delete (dbTransaction as any).toJar;
                delete (dbTransaction as any).marketId;

                const { error } = await supabase.from('transactions').insert(dbTransaction);
                if (!error) {
                    set((state) => ({ transactions: [transaction, ...state.transactions] }));
                } else {
                    console.error('Error adding transaction:', error);
                }
            },

            updateTransaction: async (id, updates) => {
                const dbUpdates: any = { ...updates };
                if (updates.fromJar) {
                    dbUpdates.from_jar = updates.fromJar;
                    delete dbUpdates.fromJar;
                }
                if (updates.toJar) {
                    dbUpdates.to_jar = updates.toJar;
                    delete dbUpdates.toJar;
                }

                const { error } = await supabase.from('transactions').update(dbUpdates).eq('id', id);
                if (!error) {
                    set((state) => ({
                        transactions: state.transactions.map((tx) => tx.id === id ? { ...tx, ...updates } : tx)
                    }));
                }
            },

            deleteTransaction: async (id) => {
                const { error } = await supabase.from('transactions').delete().eq('id', id);
                if (!error) {
                    set((state) => ({
                        transactions: state.transactions.filter((tx) => tx.id !== id)
                    }));
                }
            },

            updateJarBalance: (id, amount) => set((state) => ({
                jars: state.jars.map((jar) => jar.id === id ? { ...jar, balance: jar.balance + amount } : jar)
            })),

            transferFunds: (from, to, amount, description) => {
                const { addTransaction, updateJarBalance } = get();
                // Deduct from source
                updateJarBalance(from, -amount);
                addTransaction({
                    id: crypto.randomUUID(),
                    date: new Date().toISOString(),
                    amount: amount,
                    type: 'TRANSFER',
                    fromJar: from,
                    toJar: to,
                    description: `Transfer to ${to}: ${description}`
                });

                // Add to destination
                updateJarBalance(to, amount);
                addTransaction({
                    id: crypto.randomUUID(),
                    date: new Date().toISOString(),
                    amount: amount,
                    type: 'TRANSFER',
                    fromJar: from,
                    toJar: to,
                    description: `Received from ${from}: ${description}`
                });
            },

            addIngredient: async (ingredient) => {
                // Prepare payload for Supabase (exclude ID to let DB generate it)
                const dbIngredient = {
                    name: ingredient.name,
                    unit: ingredient.unit,
                    current_stock: ingredient.currentStock,
                    cost_per_unit: ingredient.costPerUnit,
                    supplier: ingredient.supplier,

                    buy_unit: ingredient.buyUnit,
                    conversion_rate: ingredient.conversionRate,
                    min_stock: ingredient.minStock
                    // image_url removed
                };

                const { data, error } = await supabase
                    .from('ingredients')
                    .insert(dbIngredient)
                    .select()
                    .single();

                if (error) {
                    console.error('Supabase Error:', error);
                    throw new Error(error.message);
                }

                if (!data) {
                    console.error('No data returned from Supabase');
                    throw new Error('บันทึกข้อมูลไม่สำเร็จ (ไม่ได้รับข้อมูลตอบกลับจากฐานข้อมูล)');
                }

                // Map back to App format using the real ID from DB
                const newIngredient: Ingredient = {
                    ...ingredient,
                    id: data.id,
                    currentStock: Number(data.current_stock),
                    costPerUnit: Number(data.cost_per_unit),
                    buyUnit: data.buy_unit,
                    conversionRate: Number(data.conversion_rate) || 1,
                    minStock: Number(data.min_stock) || 10,
                    // image removed
                    lastUpdated: data.created_at || new Date().toISOString()
                };
                set((state) => ({ ingredients: [newIngredient, ...state.ingredients] }));
            },

            updateStock: async (id, quantity) => {
                const { ingredients } = get();
                const ingredient = ingredients.find(i => i.id === id);
                if (ingredient) {
                    const newStock = Number(ingredient.currentStock) + Number(quantity);
                    const { error } = await supabase.from('ingredients').update({ current_stock: newStock }).eq('id', id);
                    if (!error) {
                        set((state) => ({
                            ingredients: state.ingredients.map((ing) => ing.id === id ? { ...ing, currentStock: newStock } : ing)
                        }));
                    } else {
                        console.error('Error updating stock:', error);
                    }
                }
            },

            setIngredientStock: async (id, quantity) => {
                const { error } = await supabase.from('ingredients').update({ current_stock: quantity }).eq('id', id);
                if (!error) {
                    set((state) => ({
                        ingredients: state.ingredients.map((ing) => ing.id === id ? { ...ing, currentStock: quantity } : ing)
                    }));
                } else {
                    console.error('Error setting stock:', error);
                }
            },

            updateIngredient: async (id, updates) => {
                const dbUpdates: any = { ...updates };
                if (updates.currentStock !== undefined) {
                    dbUpdates.current_stock = updates.currentStock;
                    delete dbUpdates.currentStock;
                }
                if (updates.costPerUnit !== undefined) {
                    dbUpdates.cost_per_unit = updates.costPerUnit;
                    delete dbUpdates.costPerUnit;
                }
                if (updates.conversionRate !== undefined) {
                    dbUpdates.conversion_rate = updates.conversionRate;
                    delete dbUpdates.conversionRate;
                }
                if (updates.buyUnit !== undefined) {
                    dbUpdates.buy_unit = updates.buyUnit;
                    delete dbUpdates.buyUnit;
                }
                if (updates.minStock !== undefined) {
                    dbUpdates.min_stock = updates.minStock;
                    delete dbUpdates.minStock;
                }
                // image update removed

                const { error } = await supabase.from('ingredients').update(dbUpdates).eq('id', id);
                if (!error) {
                    set((state) => ({
                        ingredients: state.ingredients.map((ing) => ing.id === id ? { ...ing, ...updates } : ing)
                    }));
                }
            },

            createPurchaseOrder: (po) => set((state) => ({ purchaseOrders: [...state.purchaseOrders, po] })),

            addProduct: async (product) => {
                const { error } = await supabase.from('products').insert(product);
                if (!error) {
                    set((state) => ({ products: [...state.products, product] }));
                }
            },

            updateProduct: async (id, updates) => {
                const { error } = await supabase.from('products').update(updates).eq('id', id);
                if (!error) {
                    set((state) => ({
                        products: state.products.map((p) => p.id === id ? { ...p, ...updates } : p)
                    }));
                }
            },

            removeProduct: async (id) => {
                const { error } = await supabase.from('products').delete().eq('id', id);
                if (!error) {
                    set((state) => ({
                        products: state.products.filter((p) => p.id !== id)
                    }));
                }
            },

            addDailyReport: (report) => set((state) => ({ dailyReports: [...state.dailyReports, report] })),

            addMarket: async (market) => {
                const { error } = await supabase.from('markets').insert(market);
                if (!error) {
                    set((state) => ({ markets: [...state.markets, market] }));
                }
            },
            updateMarket: async (id, updates) => {
                const { error } = await supabase.from('markets').update(updates).eq('id', id);
                if (!error) {
                    set((state) => ({
                        markets: state.markets.map((m) => m.id === id ? { ...m, ...updates } : m)
                    }));
                }
            },
            removeMarket: async (id) => {
                const { error } = await supabase.from('markets').delete().eq('id', id);
                if (!error) {
                    set((state) => ({
                        markets: state.markets.filter((m) => m.id !== id)
                    }));
                }
            },

            deductStockByRecipe: (productId, quantity) => {
                const { products, updateStock } = get();
                const product = products.find(p => p.id === productId);

                if (product && product.recipe) {
                    // Calculate total ingredients needed
                    // Recipe Yield is for X items. We sold Y items.
                    // Factor = Y / X
                    const factor = quantity / product.recipe.yield;

                    product.recipe.items.forEach(item => {
                        const amountToDeduct = item.quantity * factor;
                        updateStock(item.ingredientId, -amountToDeduct);
                    });
                }
            },

            removeIngredient: async (id) => {
                const { error } = await supabase.from('ingredients').delete().eq('id', id);
                if (!error) {
                    set((state) => ({
                        ingredients: state.ingredients.filter((ing) => ing.id !== id)
                    }));
                }
            },

            // Goals Management
            addGoal: (goal) => set((state) => ({ goals: [...state.goals, goal] })),

            updateGoal: (id, updates) => set((state) => ({
                goals: state.goals.map((g) => g.id === id ? { ...g, ...updates } : g)
            })),

            removeGoal: (id) => set((state) => ({
                goals: state.goals.filter((g) => g.id !== id)
            })),

            updateGoalProgress: (goalId, amount) => set((state) => ({
                goals: state.goals.map((g) =>
                    g.id === goalId
                        ? { ...g, currentAmount: Math.min(g.targetAmount, g.currentAmount + amount) }
                        : g
                )
            })),

            // Alerts Management
            addAlert: (alert) => set((state) => ({ alerts: [...state.alerts, alert] })),

            dismissAlert: (id) => set((state) => ({
                alerts: state.alerts.filter((a) => a.id !== id)
            })),

            generateAlerts: () => {
                const { jars, goals, jarCustomizations, ingredients } = get();
                const newAlerts: Alert[] = [];

                // Check low balance warnings
                // Check low balance warnings - REMOVED as per user request
                /*
                jars.forEach(jar => {
                    const customization = jarCustomizations.find(c => c.jarId === jar.id);
                    const minBalance = customization?.minBalance || 1000;
 
                    if (jar.balance < minBalance) {
                        newAlerts.push({
                            id: `low-${jar.id}-${Date.now()}`,
                            type: 'warning',
                            title: `${jar.name} ยอดเงินต่ำ!`,
                            message: `ยอดเงินเหลือ ฿${jar.balance.toLocaleString()} (ต่ำกว่าเป้า ฿${minBalance.toLocaleString()})`,
                            jarId: jar.id,
                            actionLabel: 'เติมเงิน',
                            dismissible: true
                        });
                    }
                });
                */

                // Check low stock ingredients (NEW!)
                ingredients.forEach(ing => {
                    const threshold = ing.minStock || 10;
                    if (ing.currentStock < threshold) {
                        newAlerts.push({
                            id: `low-stock-${ing.id}`,
                            type: 'warning',
                            title: `วัตถุดิบใกล้หมด!`,
                            message: `${ing.name} เหลือเพียง ${ing.currentStock} ${ing.unit}`,
                            actionLabel: 'สั่งซื้อ',
                            dismissible: true
                        });
                    }
                });

                // Check goal milestones
                goals.forEach(goal => {
                    const progress = (goal.currentAmount / goal.targetAmount) * 100;
                    const milestones = [50, 75, 90, 95];

                    milestones.forEach(milestone => {
                        if (progress >= milestone && progress < milestone + 1) {
                            newAlerts.push({
                                id: `milestone-${goal.id}-${milestone}`,
                                type: 'milestone',
                                title: `เกือบถึงเป้า!`,
                                message: `${goal.icon} ${goal.name} ทำได้ ${progress.toFixed(0)}% แล้ว`,
                                goalId: goal.id,
                                dismissible: true
                            });
                        }
                    });

                    if (progress >= 100) {
                        newAlerts.push({
                            id: `complete-${goal.id}`,
                            type: 'success',
                            title: `🎉 บรรลุเป้าหมาย!`,
                            message: `${goal.icon} ${goal.name} ทำสำเร็จแล้ว!`,
                            goalId: goal.id,
                            dismissible: true
                        });
                    }
                });

                set({ alerts: newAlerts });
            },

            // History Recording
            recordDailyHistory: () => {
                const { jars, jarHistory } = get();
                const today = new Date().toISOString().split('T')[0];

                const todayHistory = jarHistory.find(h => h.date === today);
                if (todayHistory) return; // Already recorded today

                const balances: Record<JarType, number> = {} as Record<JarType, number>;
                jars.forEach(jar => {
                    balances[jar.id] = jar.balance;
                });

                set((state) => ({
                    jarHistory: [...state.jarHistory, { date: today, balances }]
                }));
            },

            // Customization
            updateJarCustomization: (jarId, customization) => set((state) => {
                const existing = state.jarCustomizations.find(c => c.jarId === jarId);
                if (existing) {
                    return {
                        jarCustomizations: state.jarCustomizations.map(c =>
                            c.jarId === jarId ? { ...c, ...customization } : c
                        )
                    };
                } else {
                    return {
                        jarCustomizations: [...state.jarCustomizations, { jarId, ...customization }]
                    };
                }
            }),

            // Auto Allocation
            autoAllocate: (totalAmount) => {
                const { jars, updateJarBalance, addTransaction } = get();

                jars.forEach(jar => {
                    const allocation = totalAmount * jar.allocationPercent; // Already in decimal format
                    updateJarBalance(jar.id, allocation);

                    addTransaction({
                        id: crypto.randomUUID(),
                        date: new Date().toISOString(),
                        amount: allocation,
                        type: 'INCOME',
                        toJar: jar.id,
                        description: `Auto-allocation (${(jar.allocationPercent * 100).toFixed(0)}%)`
                    });
                });
            },

            // Health Score Calculation
            calculateHealthScore: () => {
                const { jars } = get();
                let score = 0;

                // Emergency Fund Health (40 points)
                const emergency = jars.find(j => j.id === 'Emergency');
                if (emergency) {
                    const monthlyExpense = 10000; // Estimate
                    const months = emergency.balance / monthlyExpense;
                    if (months >= 6) score += 40;
                    else if (months >= 3) score += 30;
                    else if (months >= 1) score += 20;
                    else score += 10;
                }

                // Working Capital Health (30 points)
                const working = jars.find(j => j.id === 'Working');
                if (working) {
                    const target = 10000; // 2 weeks operating
                    const ratio = working.balance / target;
                    if (ratio >= 1) score += 30;
                    else if (ratio >= 0.5) score += 20;
                    else score += 10;
                }

                // Profit Margin Health (30 points)
                // Simplified: if Owner jar is growing
                const owner = jars.find(j => j.id === 'Owner');
                if (owner && owner.balance > 5000) {
                    score += 30;
                } else if (owner && owner.balance > 2000) {
                    score += 20;
                } else {
                    score += 10;
                }

                return Math.min(100, score);
            },

            resetStore: () => {
                localStorage.removeItem('bakesoft-storage');
                set({
                    jars: [],
                    transactions: [],
                    ingredients: [],
                    purchaseOrders: [],
                    products: [],
                    dailyReports: [],
                    markets: [],
                    goals: [],
                    alerts: [],
                    jarHistory: [],
                    jarCustomizations: []
                });
                window.location.reload();
            },

            subscribeToRealtime: () => {
                const { fetchData } = get();

                // Subscribe to Transactions
                supabase
                    .channel('public:transactions')
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
                        fetchData();
                    })
                    .subscribe();

                // Subscribe to Ingredients
                supabase
                    .channel('public:ingredients')
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'ingredients' }, () => {
                        fetchData();
                    })
                    .subscribe();

                // Subscribe to Markets
                supabase
                    .channel('public:markets')
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'markets' }, () => {
                        fetchData();
                    })
                    .subscribe();
            },

            unsubscribeFromRealtime: () => {
                supabase.removeAllChannels();
            }
        }),
        {
            name: 'bakesoft-storage',
            partialize: (state) => ({
                storeName: state.storeName,
                jars: state.jars, // Persist jars locally for offline support, but sync will override
                jarCustomizations: state.jarCustomizations
            })
        }
    )
);

