import { useState } from 'react';
import { useProductStore } from '../stores/product';

import { Product } from '../db/schema';

type ProductFormProps = {
  product?: Product;
  onClose: () => void;
  onSaved: () => void;
};

const categories = ['Skincare', 'Makeup', 'Fragrance', 'Hair', 'Tools', 'Accessories'];
const skinTypes = ['All', 'Oily', 'Dry', 'Combination', 'Sensitive'];
const concerns = ['Acne', 'Aging', 'Brightening', 'Hydration', 'Pores', 'Redness'];
const tags = ['Vegan', 'Cruelty-Free', 'Organic', 'Fragrance-Free', 'SPF', 'Paraben-Free'];

export default function ProductForm({ product, onClose, onSaved }: ProductFormProps) {
  const addProduct = useProductStore((state) => state.addProduct);
  const updateProduct = useProductStore((state) => state.updateProduct);
  const [isSaving, setIsSaving] = useState(false);
  
  const [form, setForm] = useState({
    sku: product?.sku || '',
    barcode: product?.barcode || '',
    name: product?.name || '',
    brand: product?.brand || '',
    category: product?.category || categories[0],
    subcategory: product?.subcategory || '',
    variant: product?.variant || '',
    shadeHex: product?.shadeHex || '#b76e79',
    skinTypes: product?.skinTypes || (['All'] as string[]),
    concerns: product?.concerns || ([] as string[]),
    tags: product?.tags || ([] as string[]),
    ingredients: product?.ingredients || '',
    batchNumber: product?.batchNumber || '',
    manufacturingDate: product?.manufacturingDate || '',
    expiryDate: product?.expiryDate || '',
    costPrice: product?.costPrice || 0,
    sellingPrice: product?.sellingPrice || 0,
    stockQuantity: product?.stockQuantity || 1,
    testerQuantity: product?.testerQuantity || 0,
    supplier: product?.supplier || '',
    imageUrl: product?.imageUrl || '',
    notes: product?.notes || '',
    lowStockThreshold: product?.lowStockThreshold || 5
  });

  const toggleArrayValue = (key: 'skinTypes' | 'concerns' | 'tags', value: string) => {
    setForm((current) => {
      const next = current[key].includes(value)
        ? current[key].filter((item) => item !== value)
        : [...current[key], value];

      return { ...current, [key]: next };
    });
  };

  const handleChange = (field: string, value: string | number) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || form.sellingPrice <= 0) {
      return;
    }

    setIsSaving(true);
    const data = {
      sku: form.sku,
      barcode: form.barcode,
      name: form.name,
      brand: form.brand,
      category: form.category,
      subcategory: form.subcategory,
      variant: form.variant,
      shadeHex: form.shadeHex,
      skinTypes: form.skinTypes,
      concerns: form.concerns,
      tags: form.tags,
      ingredients: form.ingredients,
      batchNumber: form.batchNumber,
      manufacturingDate: form.manufacturingDate,
      expiryDate: form.expiryDate,
      costPrice: form.costPrice,
      sellingPrice: form.sellingPrice,
      stockQuantity: form.stockQuantity,
      testerQuantity: form.testerQuantity,
      supplier: form.supplier,
      imageUrl: form.imageUrl,
      notes: form.notes,
      lowStockThreshold: form.lowStockThreshold
    };

    if (product && product.id) {
      await updateProduct(product.id, data);
    } else {
      await addProduct(data);
    }
    
    setIsSaving(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 px-4 py-8">
      <div className="mx-auto w-full max-w-xl rounded-[2rem] bg-white p-5 shadow-2xl ring-1 ring-slate-200">
        <div className="flex items-center justify-between pb-4">
          <div>
            <h2 className="text-xl font-semibold text-accent">{product ? 'Edit product' : 'Add new product'}</h2>
            <p className="mt-1 text-sm text-slate-500">{product ? 'Update the product details below.' : 'Add a catalog item with full stock details.'}</p>
          </div>
          <button
            type="button"
            className="rounded-2xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-2 text-sm text-slate-700">
              Product name
              <input
                value={form.name}
                onChange={(event) => handleChange('name', event.target.value)}
                className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="e.g. Radiant Glow Serum"
              />
            </label>
            <label className="space-y-2 text-sm text-slate-700">
              Brand
              <input
                value={form.brand}
                onChange={(event) => handleChange('brand', event.target.value)}
                className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="JayDee Beauty"
              />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-2 text-sm text-slate-700">
              Category
              <select
                value={form.category}
                onChange={(event) => handleChange('category', event.target.value)}
                className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm text-slate-700">
              Barcode
              <input
                value={form.barcode}
                onChange={(event) => handleChange('barcode', event.target.value)}
                className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="Scan or enter barcode"
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-2 text-sm text-slate-700">
              Selling price
              <input
                type="number"
                value={form.sellingPrice}
                onChange={(event) => handleChange('sellingPrice', Number(event.target.value))}
                className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="0.00"
              />
            </label>
            <label className="space-y-2 text-sm text-slate-700">
              Stock quantity
              <input
                type="number"
                value={form.stockQuantity}
                min={0}
                onChange={(event) => handleChange('stockQuantity', Number(event.target.value))}
                className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-2 text-sm text-slate-700">
              Shade color
              <input
                type="color"
                value={form.shadeHex}
                onChange={(event) => handleChange('shadeHex', event.target.value)}
                className="h-14 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3"
              />
            </label>
            <label className="space-y-2 text-sm text-slate-700">
              Supplier
              <input
                value={form.supplier}
                onChange={(event) => handleChange('supplier', event.target.value)}
                className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="Supplier name"
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-2 text-sm text-slate-700">
              Manufacture date
              <input
                type="date"
                value={form.manufacturingDate}
                onChange={(event) => handleChange('manufacturingDate', event.target.value)}
                className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <label className="space-y-2 text-sm text-slate-700">
              Expiry date
              <input
                type="date"
                value={form.expiryDate}
                onChange={(event) => handleChange('expiryDate', event.target.value)}
                className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>
          </div>

          <label className="space-y-2 text-sm text-slate-700">
            Notes
            <textarea
              value={form.notes}
              onChange={(event) => handleChange('notes', event.target.value)}
              className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              rows={3}
              placeholder="Product notes, usage, or customer guidance"
            />
          </label>

          <div className="grid gap-3">
            <div className="space-y-2 text-sm text-slate-700">
              <p className="font-medium">Skin types</p>
              <div className="flex flex-wrap gap-2">
                {skinTypes.map((type) => (
                  <button
                    key={type}
                    type="button"
                    className={`rounded-full border px-3 py-2 text-sm ${form.skinTypes.includes(type) ? 'border-accent bg-accent/10 text-accent' : 'border-slate-200 bg-slate-50 text-slate-700'}`}
                    onClick={() => toggleArrayValue('skinTypes', type)}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 text-sm text-slate-700">
              <p className="font-medium">Concerns</p>
              <div className="flex flex-wrap gap-2">
                {concerns.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={`rounded-full border px-3 py-2 text-sm ${form.concerns.includes(item) ? 'border-accent bg-accent/10 text-accent' : 'border-slate-200 bg-slate-50 text-slate-700'}`}
                    onClick={() => toggleArrayValue('concerns', item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 text-sm text-slate-700">
              <p className="font-medium">Tags</p>
              <div className="flex flex-wrap gap-2">
                {tags.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={`rounded-full border px-3 py-2 text-sm ${form.tags.includes(item) ? 'border-accent bg-accent/10 text-accent' : 'border-slate-200 bg-slate-50 text-slate-700'}`}
                    onClick={() => toggleArrayValue('tags', item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              className="w-full rounded-3xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200 sm:w-auto"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="w-full rounded-3xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-purple-900 sm:w-auto"
              onClick={handleSubmit}
              disabled={isSaving || !form.name.trim() || form.sellingPrice <= 0}
            >
              {isSaving ? 'Saving...' : 'Save product'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
