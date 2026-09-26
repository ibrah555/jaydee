import { create } from 'zustand';
import { db, ProductAttribute, AttributeType } from '../db/schema';

export const DEFAULT_ATTRIBUTES: Record<AttributeType, string[]> = {
  category: [
    'Skincare',
    'Makeup',
    'Fragrance',
    'Hair Care',
    'Tools & Accessories',
    'Bath & Body',
    'Health & Wellness',
    'General Merchandise'
  ],
  type: [
    'All',
    'Oily',
    'Dry',
    'Combination',
    'Sensitive',
    'Normal',
    'Universal',
    'Powder',
    'Liquid',
    'Cream',
    'Gel',
    'Solid'
  ],
  concern: [
    'Acne & Blemishes',
    'Anti-Aging',
    'Brightening',
    'Hydration',
    'Pores',
    'Redness',
    'Damage Repair',
    'Daily Maintenance',
    'Dryness'
  ],
  tag: [
    'Vegan',
    'Cruelty-Free',
    'Organic',
    'Fragrance-Free',
    'SPF',
    'Paraben-Free',
    'Best Seller',
    'New Arrival',
    'On Sale',
    'Eco-Friendly'
  ]
};

interface AttributeState {
  categories: ProductAttribute[];
  types: ProductAttribute[];
  concerns: ProductAttribute[];
  tags: ProductAttribute[];
  loading: boolean;
  loadAttributes: () => Promise<void>;
  addAttribute: (type: AttributeType, name: string) => Promise<{ success: boolean; message: string; attribute?: ProductAttribute }>;
  updateAttribute: (id: number, name: string) => Promise<{ success: boolean; message: string }>;
  deleteAttribute: (id: number) => Promise<{ success: boolean; message: string }>;
}

export const useAttributeStore = create<AttributeState>((set, get) => ({
  categories: [],
  types: [],
  concerns: [],
  tags: [],
  loading: false,

  loadAttributes: async () => {
    set({ loading: true });
    try {
      let all = await db.productAttributes.toArray();

      // If database has no attributes yet, seed defaults
      if (all.length === 0) {
        const toSeed: ProductAttribute[] = [];
        const now = Date.now();

        (Object.keys(DEFAULT_ATTRIBUTES) as AttributeType[]).forEach((type) => {
          DEFAULT_ATTRIBUTES[type].forEach((name) => {
            toSeed.push({
              type,
              name,
              createdAt: now
            });
          });
        });

        await db.productAttributes.bulkAdd(toSeed);
        all = await db.productAttributes.toArray();
      }

      // Check existing products to preserve any custom categories, types, concerns, or tags already in use
      const products = await db.products.toArray();
      const existingNames = new Set(all.map((a) => `${a.type}:${a.name.trim().toLowerCase()}`));
      const newItemsFromProducts: ProductAttribute[] = [];
      const now = Date.now();

      products.forEach((p) => {
        if (p.category && p.category.trim()) {
          const key = `category:${p.category.trim().toLowerCase()}`;
          if (!existingNames.has(key)) {
            existingNames.add(key);
            newItemsFromProducts.push({ type: 'category', name: p.category.trim(), createdAt: now });
          }
        }
        (p.skinTypes || []).forEach((st) => {
          if (st && st.trim()) {
            const key = `type:${st.trim().toLowerCase()}`;
            if (!existingNames.has(key)) {
              existingNames.add(key);
              newItemsFromProducts.push({ type: 'type', name: st.trim(), createdAt: now });
            }
          }
        });
        (p.concerns || []).forEach((c) => {
          if (c && c.trim()) {
            const key = `concern:${c.trim().toLowerCase()}`;
            if (!existingNames.has(key)) {
              existingNames.add(key);
              newItemsFromProducts.push({ type: 'concern', name: c.trim(), createdAt: now });
            }
          }
        });
        (p.tags || []).forEach((t) => {
          if (t && t.trim()) {
            const key = `tag:${t.trim().toLowerCase()}`;
            if (!existingNames.has(key)) {
              existingNames.add(key);
              newItemsFromProducts.push({ type: 'tag', name: t.trim(), createdAt: now });
            }
          }
        });
      });

      if (newItemsFromProducts.length > 0) {
        await db.productAttributes.bulkAdd(newItemsFromProducts);
        all = await db.productAttributes.toArray();
      }

      const categories = all.filter((a) => a.type === 'category').sort((a, b) => a.name.localeCompare(b.name));
      const types = all.filter((a) => a.type === 'type').sort((a, b) => a.name.localeCompare(b.name));
      const concerns = all.filter((a) => a.type === 'concern').sort((a, b) => a.name.localeCompare(b.name));
      const tags = all.filter((a) => a.type === 'tag').sort((a, b) => a.name.localeCompare(b.name));

      set({ categories, types, concerns, tags, loading: false });
    } catch (err) {
      console.error('Failed to load attributes:', err);
      set({ loading: false });
    }
  },

  addAttribute: async (type: AttributeType, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) {
      return { success: false, message: 'Attribute name cannot be empty' };
    }

    try {
      const existing = await db.productAttributes
        .where('type')
        .equals(type)
        .filter((a) => a.name.toLowerCase() === trimmed.toLowerCase())
        .first();

      if (existing) {
        return { success: false, message: `"${trimmed}" already exists as a ${type}` };
      }

      const newAttr: ProductAttribute = {
        type,
        name: trimmed,
        createdAt: Date.now()
      };

      const id = await db.productAttributes.add(newAttr);
      const created = { ...newAttr, id };

      await get().loadAttributes();
      return { success: true, message: `Added "${trimmed}" successfully`, attribute: created };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to add attribute' };
    }
  },

  updateAttribute: async (id: number, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) {
      return { success: false, message: 'Name cannot be empty' };
    }

    try {
      const current = await db.productAttributes.get(id);
      if (!current) {
        return { success: false, message: 'Attribute not found' };
      }

      const duplicate = await db.productAttributes
        .where('type')
        .equals(current.type)
        .filter((a) => a.name.toLowerCase() === trimmed.toLowerCase() && a.id !== id)
        .first();

      if (duplicate) {
        return { success: false, message: `Another ${current.type} with the name "${trimmed}" already exists` };
      }

      const oldName = current.name;
      await db.productAttributes.update(id, { name: trimmed });

      // If category was renamed, optionally update products with that category
      if (current.type === 'category') {
        const affectedProducts = await db.products.where('category').equals(oldName).toArray();
        for (const p of affectedProducts) {
          if (p.id) {
            await db.products.update(p.id, { category: trimmed });
          }
        }
      }

      await get().loadAttributes();
      return { success: true, message: 'Updated successfully' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to update attribute' };
    }
  },

  deleteAttribute: async (id: number) => {
    try {
      const current = await db.productAttributes.get(id);
      if (!current) {
        return { success: false, message: 'Attribute not found' };
      }

      await db.productAttributes.delete(id);
      await get().loadAttributes();
      return { success: true, message: `Deleted "${current.name}"` };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to delete attribute' };
    }
  }
}));
