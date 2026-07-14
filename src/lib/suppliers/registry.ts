import type { Supplier } from "@/lib/suppliers/types";
import { LztSupplier } from "@/lib/suppliers/lzt/adapter";

/**
 * Supplier registry. Add future suppliers here — the rest of the app resolves
 * suppliers by slug and never imports a concrete supplier directly.
 */
const suppliers: Record<string, Supplier> = {
  lzt: new LztSupplier(),
};

export function getSupplier(slug: string): Supplier | null {
  return suppliers[slug] ?? null;
}

export function listSuppliers(): Supplier[] {
  return Object.values(suppliers);
}
