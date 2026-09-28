import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { db, Product, ProductAttribute, Transaction } from '../db/schema';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

const DEFAULT_SUPABASE_URL = 'https://xhmxgagyydglqgarrocd.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhobXhnYWd5eWRnbHFnYXJyb2NkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1MTk3MDIsImV4cCI6MjEwNjA5NTcwMn0.avbhXSONWo5byNiJCMmhYdnEfQVekPY_tyouzlGJy5o';

let supabaseClient: SupabaseClient | null = null;
let activeUrl: string | null = null;

// Track deleted SKUs locally so a deleted item is never resurrected by a stale push
export function recordDeletedSku(sku: string) {
  try {
    const raw = localStorage.getItem('jaydee_deleted_skus') || '[]';
    const list: string[] = JSON.parse(raw);
    if (!list.includes(sku)) {
      list.push(sku);
      localStorage.setItem('jaydee_deleted_skus', JSON.stringify(list));
    }
  } catch {}
}

export function getDeletedSkus(): Set<string> {
  try {
    const raw = localStorage.getItem('jaydee_deleted_skus');
    if (raw) return new Set(JSON.parse(raw));
  } catch {}
  return new Set();
}

export function clearDeletedSku(sku: string) {
  try {
    const raw = localStorage.getItem('jaydee_deleted_skus');
    if (raw) {
      const list: string[] = JSON.parse(raw).filter((s: string) => s !== sku);
      localStorage.setItem('jaydee_deleted_skus', JSON.stringify(list));
    }
  } catch {}
}

export function getStoredSupabaseConfig(): SupabaseConfig | null {
  try {
    const raw = localStorage.getItem('jaydee_supabase_config');
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export function saveStoredSupabaseConfig(config: SupabaseConfig): boolean {
  try {
    localStorage.setItem('jaydee_supabase_config', JSON.stringify(config));
    initSupabase(true);
    return true;
  } catch {
    return false;
  }
}

export function clearStoredSupabaseConfig() {
  try {
    localStorage.removeItem('jaydee_supabase_config');
    initSupabase(true);
  } catch {}
}

export function initSupabase(force = false): SupabaseClient | null {
  try {
    if (supabaseClient && !force) return supabaseClient;

    const stored = getStoredSupabaseConfig();
    const url = import.meta.env.VITE_SUPABASE_URL || stored?.url || DEFAULT_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || stored?.anonKey || DEFAULT_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      supabaseClient = null;
      activeUrl = null;
      return null;
    }

    supabaseClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      },
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    });

    activeUrl = url;
    return supabaseClient;
  } catch (err) {
    console.error('Failed to init Supabase client:', err);
    supabaseClient = null;
    activeUrl = null;
    return null;
  }
}

// Initialize on module load
initSupabase();

export function getSupabase(): SupabaseClient | null {
  if (!supabaseClient) initSupabase();
  return supabaseClient;
}

export function isSupabaseConfigured(): boolean {
  return !!supabaseClient && !!activeUrl;
}

export function getSupabaseProjectUrl(): string | null {
  return activeUrl;
}

// Convert Product to Postgres row format
function toPostgresProduct(p: Product) {
  return {
    sku: p.sku,
    barcode: p.barcode || '',
    name: p.name,
    brand: p.brand || '',
    category: p.category || 'General',
    subcategory: p.subcategory || '',
    variant: p.variant || '',
    variants: p.variants || [],
    shade_hex: p.shadeHex || '#b76e79',
    skin_types: p.skinTypes || [],
    concerns: p.concerns || [],
    tags: p.tags || [],
    ingredients: p.ingredients || '',
    batch_number: p.batchNumber || '',
    manufacturing_date: p.manufacturingDate || '',
    expiry_date: p.expiryDate || '',
    cost_price: Number(p.costPrice) || 0,
    selling_price: Number(p.sellingPrice) || 0,
    stock_quantity: Number(p.stockQuantity) || 0,
    tester_quantity: Number(p.testerQuantity) || 0,
    supplier: p.supplier || '',
    image_url: p.imageUrl || '',
    notes: p.notes || '',
    low_stock_threshold: Number(p.lowStockThreshold) || 5,
    updated_at: new Date().toISOString()
  };
}

// Convert Postgres row to local Dexie Product format
function fromPostgresProduct(r: any): Product {
  return {
    sku: r.sku,
    barcode: r.barcode || '',
    name: r.name,
    brand: r.brand || '',
    category: r.category || 'General',
    subcategory: r.subcategory || '',
    variant: r.variant || '',
    variants: Array.isArray(r.variants) ? r.variants : [],
    shadeHex: r.shade_hex || '#b76e79',
    skinTypes: Array.isArray(r.skin_types) ? r.skin_types : [],
    concerns: Array.isArray(r.concerns) ? r.concerns : [],
    tags: Array.isArray(r.tags) ? r.tags : [],
    ingredients: r.ingredients || '',
    batchNumber: r.batch_number || '',
    manufacturingDate: r.manufacturing_date || '',
    expiryDate: r.expiry_date || '',
    costPrice: Number(r.cost_price) || 0,
    sellingPrice: Number(r.selling_price) || 0,
    stockQuantity: Number(r.stock_quantity) || 0,
    testerQuantity: Number(r.tester_quantity) || 0,
    supplier: r.supplier || '',
    imageUrl: r.image_url || '',
    notes: r.notes || '',
    lowStockThreshold: Number(r.low_stock_threshold) || 5,
    createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
    updatedAt: r.updated_at ? new Date(r.updated_at).getTime() : Date.now()
  };
}

// Push a single product to Supabase
export async function pushProductToSupabase(product: Product): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  // If this product was marked deleted, do not push
  const deletedSkus = getDeletedSkus();
  if (deletedSkus.has(product.sku)) return false;

  try {
    const row = toPostgresProduct(product);
    const { error } = await client
      .from('products')
      .upsert(row, { onConflict: 'sku' });

    if (error) {
      console.error('Supabase upsert error:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Failed to push product to Supabase:', e);
    return false;
  }
}

// Delete product from Supabase
export async function deleteProductFromSupabase(sku: string): Promise<boolean> {
  recordDeletedSku(sku);

  const client = getSupabase();
  if (!client) return false;

  try {
    const { error } = await client
      .from('products')
      .delete()
      .eq('sku', sku);

    if (error) {
      console.error('Supabase delete product error:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Failed to delete product from Supabase:', e);
    return false;
  }
}

// Push local products to Supabase (ignoring deleted items)
export async function pushAllProductsToSupabase(): Promise<{ success: boolean; count: number; error?: string }> {
  const client = getSupabase();
  if (!client) {
    return { success: false, count: 0, error: 'Supabase client is not connected' };
  }

  try {
    const deletedSkus = getDeletedSkus();
    const products = (await db.products.toArray()).filter((p) => !deletedSkus.has(p.sku));
    if (products.length === 0) return { success: true, count: 0 };

    const rows = products.map(toPostgresProduct);
    const { error } = await client
      .from('products')
      .upsert(rows, { onConflict: 'sku' });

    if (error) {
      return { success: false, count: 0, error: error.message };
    }

    return { success: true, count: products.length };
  } catch (e: any) {
    return { success: false, count: 0, error: e?.message || 'Failed to upload products' };
  }
}

// Pull all products from Supabase and synchronize local Dexie
// Purges any products from local Dexie that no longer exist on Supabase
export async function pullProductsFromSupabase(): Promise<{ success: boolean; count: number; error?: string }> {
  const client = getSupabase();
  if (!client) {
    return { success: false, count: 0, error: 'Supabase client is not connected' };
  }

  try {
    const { data, error } = await client
      .from('products')
      .select('*');

    if (error) {
      return { success: false, count: 0, error: error.message };
    }

    const serverProducts = data || [];
    const serverSkus = new Set(serverProducts.map((r: any) => r.sku));
    const deletedSkus = getDeletedSkus();

    // 1. Remove any local products that no longer exist on the server or were marked deleted
    const localProducts = await db.products.toArray();
    for (const lp of localProducts) {
      if (!serverSkus.has(lp.sku) || deletedSkus.has(lp.sku)) {
        await db.products.delete(lp.id!);
      }
    }

    // 2. Add or update products from server (skip if explicitly marked deleted locally)
    let count = 0;
    for (const row of serverProducts) {
      if (deletedSkus.has(row.sku)) {
        // If this device deleted it, remove it from server as well
        client.from('products').delete().eq('sku', row.sku).then(() => undefined);
        continue;
      }

      const prod = fromPostgresProduct(row);
      const existing = await db.products.where('sku').equals(prod.sku).first();

      if (existing && existing.id) {
        await db.products.update(existing.id, {
          ...prod,
          id: existing.id
        });
      } else {
        await db.products.add(prod);
      }
      count++;
    }

    return { success: true, count };
  } catch (e: any) {
    return { success: false, count: 0, error: e?.message || 'Failed to download products' };
  }
}

// Push all local attributes to Supabase
export async function pushAllAttributesToSupabase(): Promise<{ success: boolean; count: number }> {
  const client = getSupabase();
  if (!client) return { success: false, count: 0 };

  try {
    const attrs = await db.productAttributes.toArray();
    if (attrs.length === 0) return { success: true, count: 0 };

    const rows = attrs.map((a) => ({
      type: a.type,
      name: a.name
    }));

    const { error } = await client
      .from('product_attributes')
      .upsert(rows, { onConflict: 'type,name' });

    if (error) {
      console.error('Supabase attribute upsert error:', error.message);
      return { success: false, count: 0 };
    }

    return { success: true, count: attrs.length };
  } catch {
    return { success: false, count: 0 };
  }
}

// Pull all attributes from Supabase
export async function pullAttributesFromSupabase(): Promise<{ success: boolean; count: number }> {
  const client = getSupabase();
  if (!client) return { success: false, count: 0 };

  try {
    const { data, error } = await client
      .from('product_attributes')
      .select('*');

    if (error || !data) return { success: false, count: 0 };

    let count = 0;
    for (const r of data) {
      const existing = await db.productAttributes
        .where('type')
        .equals(r.type)
        .filter((a) => a.name.toLowerCase() === r.name.toLowerCase())
        .first();

      if (!existing) {
        await db.productAttributes.add({
          type: r.type,
          name: r.name,
          createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now()
        });
        count++;
      }
    }

    return { success: true, count };
  } catch {
    return { success: false, count: 0 };
  }
}

// Complete two-way sync: PULLS FIRST to purge deletions, then PUSHES valid local items
export async function syncCatalogWithSupabase(): Promise<{
  success: boolean;
  pushed: number;
  pulled: number;
  error?: string;
}> {
  const client = getSupabase();
  if (!client) {
    return { success: false, pushed: 0, pulled: 0, error: 'Supabase is not connected' };
  }

  try {
    // 1. Pull cloud products FIRST so deleted items are removed locally before any push
    const pullRes = await pullProductsFromSupabase();
    if (!pullRes.success && pullRes.error) {
      return { success: false, pushed: 0, pulled: 0, error: pullRes.error };
    }

    // 2. Pull cloud attributes
    await pullAttributesFromSupabase();

    // 3. Push remaining local products to Supabase (will not push deleted items)
    const pushRes = await pushAllProductsToSupabase();

    // 4. Push local attributes to Supabase
    await pushAllAttributesToSupabase();

    return {
      success: true,
      pushed: pushRes.count,
      pulled: pullRes.count
    };
  } catch (e: any) {
    return {
      success: false,
      pushed: 0,
      pulled: 0,
      error: e?.message || 'Sync failed'
    };
  }
}

// Real-time subscription to Supabase products table
export function subscribeToSupabaseProducts(onSync?: () => void): (() => void) | null {
  const client = getSupabase();
  if (!client) return null;

  try {
    const channel = client
      .channel('public:products')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        async (payload: any) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const deletedSkus = getDeletedSkus();
            if (payload.new?.sku && deletedSkus.has(payload.new.sku)) {
              return;
            }

            const prod = fromPostgresProduct(payload.new);
            const existing = await db.products.where('sku').equals(prod.sku).first();

            if (existing && existing.id) {
              await db.products.update(existing.id, {
                ...prod,
                id: existing.id
              });
            } else {
              await db.products.add(prod);
            }
          } else if (payload.eventType === 'DELETE') {
            const oldSku = payload.old?.sku;
            if (oldSku) {
              recordDeletedSku(oldSku);
              const existing = await db.products.where('sku').equals(oldSku).first();
              if (existing && existing.id) {
                await db.products.delete(existing.id);
              }
            } else {
              // Postgres default replica identity does not always include sku on delete,
              // so pull fresh state to purge deleted products immediately
              await pullProductsFromSupabase();
            }
          }

          if (onSync) {
            onSync();
          }
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  } catch (e) {
    console.error('Failed to subscribe to Supabase products:', e);
    return null;
  }
}

// Push a completed sale transaction to Supabase
export async function pushTransactionToSupabase(t: Transaction): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  try {
    const row = {
      transaction_id: t.transactionId,
      cashier_id: t.cashierId || 'unknown',
      cashier_name: t.cashierName || 'Cashier',
      shift_id: t.shiftId || null,
      items: t.items || [],
      subtotal: Number(t.subtotal) || 0,
      tax_amount: Number(t.taxAmount) || 0,
      discount_amount: Number(t.discountAmount) || 0,
      total: Number(t.total) || 0,
      payment_method: t.paymentMethod || 'cash',
      payment_details: t.paymentDetails || {},
      status: t.status || 'completed',
      created_at: t.createdAt ? new Date(t.createdAt).toISOString() : new Date().toISOString()
    };

    const { error } = await client
      .from('transactions')
      .upsert(row, { onConflict: 'transaction_id' });

    if (error) {
      console.error('Supabase transaction push error:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Failed to push transaction to Supabase:', e);
    return false;
  }
}

/**
 * Wipe all system data (products, sales, shifts, logs, cart, deleted sku records)
 * across both Supabase cloud database and local IndexedDB so the store can start fresh.
 */
export async function wipeAllSystemData(wipeAttributes: boolean = false): Promise<{ success: boolean; message: string }> {
  try {
    const client = getSupabase();
    if (client) {
      try {
        await client.from('products').delete().neq('sku', '__never_match__');
        await client.from('transactions').delete().neq('transaction_id', '__never_match__');
        await client.from('shifts').delete().neq('cashier_name', '__never_match__');
        if (wipeAttributes) {
          await client.from('product_attributes').delete().neq('name', '__never_match__');
        }
      } catch (cloudErr) {
        console.warn('Cloud tables wipe warning:', cloudErr);
      }
    }

    // Clear local IndexedDB tables
    await db.products.clear();
    await db.transactions.clear();
    await db.inventoryLog.clear();
    await db.shifts.clear();
    await db.customers.clear();
    if (wipeAttributes) {
      await db.productAttributes.clear();
    }

    // Clear local storage tracking
    localStorage.removeItem('jaydee_deleted_skus');
    localStorage.removeItem('jaydee-cart');

    return { success: true, message: 'All system data wiped successfully. You can now start entering products fresh!' };
  } catch (e: any) {
    console.error('Wipe data error:', e);
    return { success: false, message: e.message || 'Failed to wipe system data.' };
  }
}

