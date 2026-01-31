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

// Debt-First Allocation Configuration (v2.0)
export interface DebtAllocationConfig {
  isEnabled: boolean;           // Toggle debt-first mode
  fixedAmount: number;          // Fixed deduction amount (e.g., 200)
  safetyThreshold: number;      // Safety threshold (e.g., 400)
  safetyRatio: number;          // Ratio when below threshold (e.g., 0.5 = 50%)
  targetAmount: number;         // Goal amount (e.g., 40,000)
  accumulatedAmount: number;    // Current progress
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
  weatherCondition?: string; // 'sunny' | 'cloudy' | 'rain' | 'storm' | 'wind' | 'cold'
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
  variants?: Variant[]; // List of variants
  bundleConfig?: BundleConfig | null; // NEW: Config for composite products (Snack Box)
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
  marketId?: string;     // NEW: Optional for multi-market support
  productId: string;
  variantId?: string;    // NEW: Optional for variant-level tracking
  variantName?: string;  // NEW: Snapshot for historical accuracy

  // Input Fields
  producedQty: number;
  toShopQty: number;
  soldQty: number;
  wasteQty?: number;     // NEW: Items discarded at home (before shop)

  // Calculated/Denormalized
  stockYesterday: number;
  leftoverHome: number;  // = stockYesterday + produced - toShop - waste
  unsoldShop: number;    // = toShop - sold
}

// ==================== PROMOTION & SNACK BOX SYSTEM ====================

export interface Promotion {
  id: string;
  name: string;
  description?: string;

  // Product
  productId: string;
  productName: string;
  variantId?: string;
  variantName?: string;

  // Pricing
  originalPrice: number;
  discountPrice: number;
  discountPercent: number;

  // Conditions
  minQuantity: number;
  maxQuantity?: number;
  validFrom?: string;
  validUntil?: string;

  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Bundle {
  id: string;
  name: string;
  description?: string;

  bundlePrice: number;
  estimatedCost: number;
  profitMargin: number;

  items: BundleItem[];

  isActive: boolean;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BundleItem {
  id: string;
  bundleId: string;

  productId: string;
  productName: string;
  variantId?: string;
  variantName?: string;

  quantity: number;
  unitCost: number;
  subtotalCost: number;
  sortOrder: number;
}

export type SpecialOrderType = 'promotion' | 'bundle' | 'custom';
export type SpecialOrderStatus = 'pending' | 'confirmed' | 'producing' | 'delivered' | 'cancelled';

export interface SpecialOrder {
  id: string;
  orderNumber: string;
  orderDate: string;
  deliveryDate: string;

  orderType: SpecialOrderType;
  promotionId?: string;
  bundleId?: string;

  customerName?: string;
  customerPhone?: string;
  customerNote?: string;

  totalQuantity: number;
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;

  items: SpecialOrderItem[];

  status: SpecialOrderStatus;
  stockDeducted: boolean;
  stockDeductedAt?: string;

  createdAt: string;
  updatedAt: string;
}

export interface SpecialOrderItem {
  id: string;
  specialOrderId: string;

  productId: string;
  productName: string;
  variantId?: string;
  variantName?: string;

  quantity: number;
  unitPrice: number;
  unitCost: number;

  subtotalRevenue: number;
  subtotalCost: number;
  subtotalProfit: number;
  sortOrder: number;
  selectedOptions?: BundleSelectionSnapshot | null; // NEW: Snapshot of selected bundle choices
}

// ==================== BUNDLE SYSTEM TYPES ====================

// ตัวเลือกย่อยในแต่ละ Slot (เช่น "บราวนี่", "ครัวซองต์")
export interface BundleOption {
  id: string;          // ID ของตัวเลือก (ใช้ productId หรือสร้างใหม่ก็ได้)
  productId: string;   // Link ไปยัง Inventory จริง (UUID)
  name: string;        // ชื่อที่แสดง (Snapshot เผื่อเปลี่ยนชื่อ)
  surcharge: number;   // ราคาบวกเพิ่ม (0 = ไม่บวก)
  isDefault?: boolean; // เป็นตัวเลือกเริ่มต้นไหม (ไม่ใช้ใน Phase 1)
}

// หลุมให้เลือก (เช่น "เลือกขนม", "เลือกน้ำ")
export interface BundleSlot {
  id: string;          // Key สำหรับอ้างอิง (เช่น 'main_snack', 'drink')
  title: string;       // หัวข้อที่โชว์ลูกค้า
  type: 'single' | 'multiple'; // Phase 1 ใช้ 'single' ไปก่อน
  required: boolean;   // บังคับเลือกไหม
  options: BundleOption[];
}

// Config หลักที่จะอยู่ใน Product (JSONB)
export interface BundleConfig {
  isBundle: boolean;
  basePrice: number;   // ราคาตั้งต้น (เช่น ค่ากล่อง + ค่าแรง)
  slots: BundleSlot[];
}

// สิ่งที่บันทึกตอนขาย (Snapshot) - Historical Data Protection
export interface BundleSelectionSnapshot {
  [slotId: string]: {
    productId: string;   // ID สินค้าที่เลือก
    productName: string; // ชื่อตอนที่ขาย (Snapshot)
    unitCost: number;    // ต้นทุนตอนที่ขาย (Snapshot)
    surcharge: number;   // ราคาเพิ่มตอนที่ขาย (Snapshot)
  };
}

// ==================== SNACK BOX & PROMOTION TYPES ====================

// Shop Info - ข้อมูลร้านค้า
export interface ShopInfo {
  id: string;
  shopName: string;
  ownerName: string;
  idCardNumber: string;

  // Address
  addressNumber: string;
  addressMoo: string;
  addressSoi: string;
  addressRoad: string;
  addressSubdistrict: string;
  addressDistrict: string;
  addressProvince: string;
  addressPostalCode: string;

  // Contact
  phone: string;
  lineId: string;
  email: string;
  facebook: string;

  // Bank
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;

  // Logo (Supabase Storage URL)
  logoUrl: string | null;

  updatedAt: string;
}

// Packaging Options - บรรจุภัณฑ์
export interface PackagingOption {
  id: string;
  name: string;
  extraCost: number;
  isActive: boolean;
  sortOrder: number;
}

// Snack Box Set Item - รายการสินค้าใน Set
export interface SnackBoxSetItem {
  id: string;
  setId: string;
  category: string;
  quantity: number;
  selectionType: 'pick_one' | 'pick_many' | 'all';
  productIds: string[];
  sortOrder: number;
}

// Snack Box Set - Set Menu
export interface SnackBoxSet {
  id: string;
  name: string;
  nameThai: string;
  description: string;
  price: number;
  minQuantity: number;
  packagingId: string;
  packaging?: PackagingOption;
  items: SnackBoxSetItem[];
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// Promotion Order Status
export type PromotionOrderStatus = 'pending' | 'confirmed' | 'preparing' | 'delivered' | 'cancelled';

// Promotion Order Item - รายการสินค้าในออเดอร์
export interface PromotionOrderItem {
  id: string;
  orderId: string;
  productId: string;
  variantId: string | null;
  variantNote: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  // Joined fields for display
  productName?: string;
  variantName?: string;
}

// Promotion Order - ออเดอร์โปรโมชั่น
export interface PromotionOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  deliveryDate: string;
  deliveryTime: string;
  calculatedPrice: number;
  manualPrice: number | null;
  useManualPrice: boolean;
  discountNote: string;
  totalPrice: number;
  notes: string;
  status: PromotionOrderStatus;
  items: PromotionOrderItem[];
  createdAt: string;
  updatedAt: string;
}

// Quotation Item
export interface QuotationItem {
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

// Quotation Status
export type QuotationStatus = 'draft' | 'sent' | 'accepted' | 'invoiced' | 'expired' | 'cancelled';

// Quotation - ใบเสนอราคา
export interface Quotation {
  id: string;
  quotationNumber: string;
  customerName: string;
  customerAddress: string;
  customerContact: string;
  customerPhone: string;
  orderId: string | null;
  items: QuotationItem[];
  subtotal: number;
  discountAmount: number;
  discountNote: string;
  totalPrice: number;
  totalPriceText: string;
  validityDays: number;
  conditions: string;
  status: QuotationStatus;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// Invoice (ใบแจ้งหนี้/ใบวางบิล)
// ============================================================

// Invoice Status
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

// Invoice - ใบแจ้งหนี้
export interface Invoice {
  id: string;
  invoiceNumber: string;
  quotationId: string | null; // Reference for tracking (data is snapshotted)
  customerName: string;
  customerAddress: string;
  customerContact: string;
  customerPhone: string;
  items: QuotationItem[]; // SNAPSHOTTED at creation time
  subtotal: number;
  discountAmount: number;
  discountNote: string;
  totalPrice: number;
  dueDate: string; // Payment due date
  paymentTerms: string; // e.g., "Net 30", "COD"
  notes: string;
  status: InvoiceStatus;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// Receipt (ใบเสร็จรับเงิน)
// ============================================================

// Payment Method
export type PaymentMethod = 'cash' | 'transfer' | 'credit' | 'other';

// Receipt - ใบเสร็จรับเงิน
export interface Receipt {
  id: string;
  receiptNumber: string;
  quotationId: string | null; // Reference for tracking
  invoiceId: string | null; // Reference for tracking
  customerName: string;
  customerAddress: string;
  customerPhone: string;
  items: QuotationItem[]; // SNAPSHOTTED at creation time
  totalPrice: number;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  paymentNote: string;
  receivedBy: string;
  createdAt: string;
}