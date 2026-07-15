/**
 * Supplier abstraction. Rumart never hardcodes a single supplier — LZT today,
 * other suppliers or manual stock tomorrow. Every supplier implements this
 * interface, and the sync/purchase pipeline only ever talks to the interface.
 */

/** A normalized listing coming from any supplier, before pricing is applied. */
export interface SupplierListing {
  supplierItemId: string;
  title: string;
  description?: string;
  /** Supplier price we would pay (our cost), in supplier currency. */
  cost: number;
  currency: string;
  /** Supplier-side category slug (e.g. "steam"). */
  supplierCategory: string;
  deliveryType: "auto" | "manual";
  images?: string[];
  /** Arbitrary supplier attributes (country, platform, seller rating…). */
  attributes?: Record<string, unknown>;
}

/** Filters an admin configures per sync rule. */
export interface SupplierQuery {
  supplierCategory: string;
  minSellerRating?: number;
  minPrice?: number;
  maxPrice?: number;
  country?: string;
  platform?: string;
  autoDeliveryOnly?: boolean;
  page?: number;
}

/** Result of a purchase attempt against the supplier. */
export interface SupplierPurchaseResult {
  supplierItemId: string;
  /** Human-readable credential payload to encrypt & deliver. */
  credentials: string;
  raw?: unknown;
}

export interface Supplier {
  readonly slug: string;
  readonly name: string;
  /** Whether this supplier is usable (e.g. token present). */
  isConfigured(): boolean;
  /** List available categories the supplier exposes. */
  listCategories(): Promise<{ slug: string; name: string }[]>;
  /** Fetch a page of listings matching the query. */
  listItems(query: SupplierQuery): Promise<SupplierListing[]>;
  /** Fetch a single listing by supplier item id (for availability checks). */
  getItem(supplierItemId: string): Promise<SupplierListing | null>;
  /** Purchase an item and return credentials. Throws on failure. */
  purchase(supplierItemId: string, expectedCost: number): Promise<SupplierPurchaseResult>;
  /**
   * Spendable balance on the supplier in site currency (USD), or null when
   * unknown. Used to skip doomed purchase attempts and fall back to manual
   * fulfillment instead.
   */
  getBalance?(): Promise<number | null>;
}
