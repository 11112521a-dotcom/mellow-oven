// Financial Types
export type JarType = 'Working' | 'CapEx' | 'Opex' | 'Emergency' | 'Owner';

export interface Jar {
  id: JarType;
  name: string;
  balance: number;
  allocationPercent: number;
  description: string;
}

export interface Goal {
  id: string;
  jarId: JarType;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  icon: string;
  createdAt: string;
}

export interface Alert {
  id: string;
  type: 'warning' | 'success' | 'milestone' | 'streak';
  title: string;
  message: string;
  jarId?: JarType;
  goalId?: string;
  actionLabel?: string;
  dismissible: boolean;
}

export interface JarHistory {
  date: string;
  balances: Record<JarType, number>;
}

export interface JarCustomization {
  jarId: JarType;
  name?: string;
  color?: string;
  icon?: string;
  minBalance?: number;
}

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  fromJar?: JarType;
  toJar?: JarType;
  description: string;
  category?: string;
  marketId?: string;
}

export interface UnallocatedProfit {
  id: string;
  date: string;
  amount: number;
  source: string; // e.g., "Daily Sales - Market Name"
  createdAt: string;
}

export interface ProductSaleLog {
  id: string;
  recordedAt: string;       // ISO timestamp when logged
  saleDate: string;          // YYYY-MM-DD
  marketId: string;
  marketName: string;        // Snapshot for historical accuracy

  productId: string;
  productName: string;       // Snapshot for historical accuracy
  category: string;

  quantitySold: number;
  pricePerUnit: number;      // Price at time of sale
  totalRevenue: number;
  costPerUnit: number;       // Cost at time of sale
  totalCost: number;
  grossProfit: number;          // revenue - cost

  // NEW: Weather tracking
  weatherCondition?: string; // 'sunny' | 'cloudy' | 'rain' | 'storm'
  wasteQty?: number;         // Quantity wasted/thrown away

  // NEW: Variant Tracking
  variantId?: string;
  variantName?: string;
}

// Inventory Types
export interface StockLog {
  id: string;
  date: string;
  ingredientId: string;
  amount: number;
  reason: 'PO' | 'USAGE' | 'WASTE' | 'SPILLAGE' | 'CORRECTION';
  note?: string;
}

export interface Ingredient {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
  costPerUnit: number;
  supplier: string;
  // image?: string; // Removed
  lastUpdated: string;
  buyUnit?: string; // e.g. "Pack"
  conversionRate?: number; // e.g. 30 (1 Pack = 30 Units)
  minStock?: number; // Minimum stock threshold for alerts
  isHidden?: boolean; // Hide from dashboard alerts
}

export interface PurchaseOrder {
  id: string;
  date: string;
  supplier: string;
  items: { ingredientId: string; quantity: number; cost: number }[];
  totalCost: number;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
}

// Sales & Production Types
export interface Product {
  id: string;
  name: string;
  category: string; // Cake, Tart, Beverage
  flavor?: string; // Orange, Banana, Chocolate
  price: number;
  cost: number; // This can now be auto-calculated from recipe
  recipe?: Recipe;
  variants?: Variant[]; // New: List of variants
}

export interface Variant {
  id: string;
  name: string; // e.g. "Orange", "Strawberry"
  price: number;
  cost: number;
  recipe?: Recipe;
}

export interface Recipe {
  id: string;
  name: string; // e.g. "Batch of Orange Cake"
  yield: number; // e.g. 20 pieces
  items: RecipeItem[];
  totalBatchCost: number; // Auto-calculated
  costPerUnit: number; // Auto-calculated (totalBatchCost / yield)
}

export interface RecipeItem {
  ingredientId: string;
  quantity: number; // Quantity used in the batch
  unit: string; // Unit used in the batch (e.g. g, ml)
}

export interface DailyProductionLog {
  date: string;
  productId: string;
  variantId?: string;
  preparedQty: number; // Starting Stock
  soldQty: number;
  wasteQty: number; // Production Waste
  leftoverQty: number; // Good Leftover
  sellOutTime?: string; // HH:mm
  missedOppQty?: number; // Estimated missed sales
  wasteReason?: string; // Burnt, Defect, Expired
}

export interface MarketContext {
  date: string;
  marketName: string;
  weather: 'Sunny' | 'Rainy' | 'Cloudy' | 'Storm';
  event?: string; // Special event
}

export interface Market {
  id: string;
  name: string;
  location?: string;
  description?: string;
  color?: string;
}

// The Complex Daily Report Structure (aggregated)
export interface DailyReport {
  id?: string; // Add ID for easier reference
  date: string;
  marketId: string; // Link to Market
  marketContext: MarketContext;

  // Financial Snapshot
  startCashFloat: number;
  revenue: number;
  cogsSold: number;
  wasteCost: number;
  opexToday: number;
  netProfit: number;

  // Allocations
  allocations: {
    [key in JarType]: number;
  };

  // KPIs
  billsCount: number;
  aov: number; // Average Order Value
  sellThroughRate: number; // % Sold

  // Production Data
  logs: DailyProductionLog[];
}

export interface AllocationProfile {
  id: string;
  name: string;
  allocations: {
    [key in JarType]: number; // Percentage 0-100
  };
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: 'owner' | 'staff';
  updatedAt: string;
}

// Daily Inventory (Stock ↔ Sales Integration)
export interface DailyInventory {
  id: string;
  createdAt: string;
  businessDate: string; // YYYY-MM-DD
  productId: string;
  variantId?: string;    // NEW: Optional for variant-level tracking
  variantName?: string;  // NEW: Snapshot for historical accuracy

  // Input Fields
  producedQty: number;
  toShopQty: number;
  soldQty: number;

  // Calculated/Denormalized
  stockYesterday: number;
  leftoverHome: number;  // = stockYesterday + produced - toShop
  unsoldShop: number;    // = toShop - sold
}