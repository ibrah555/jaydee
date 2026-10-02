import { useEffect, useState } from 'react';
import { useProductStore } from '../stores/product';
import { useAttributeStore } from '../stores/attribute';
import { Product } from '../db/schema';
import { Plus, Check, X } from 'lucide-react';

type ProductFormProps = {
  product?: Product;
  onClose: () => void;
  onSaved: () => void;
};

export default function ProductForm({ product, onClose, onSaved }: ProductFormProps) {
  const addProduct = useProductStore((state) => state.addProduct);
  const updateProduct = useProductStore((state) => state.updateProduct);
  const { categories, types, concerns, tags, loadAttributes, addAttribute } = useAttributeStore();

  const [isSaving, setIsSaving] = useState(false);

  // Quick inline add toggles and state
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showAddType, setShowAddType] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [showAddConcern, setShowAddConcern] = useState(false);
  const [newConcernName, setNewConcernName] = useState('');
  const [showAddTag, setShowAddTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');

  useEffect(() => {
    loadAttributes();
  }, []);

  const [form, setForm] = useState({
    sku: product?.sku || '',
    barcode: product?.barcode || '',
    name: product?.name || '',
    brand: product?.brand || '',
    category: product?.category || 'Skincare',
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

  // Ensure default category is selected once categories load if empty
  useEffect(() => {
    if (!product && categories.length > 0 && !form.category) {
      setForm((prev) => ({ ...prev, category: categories[0].name }));
    }
  }, [categories, product]);

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

  // Quick inline add handlers
  const handleQuickAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    const res = await addAttribute('category', newCategoryName.trim());
    if (res.success && res.attribute) {
      setForm((prev) => ({ ...prev, category: res.attribute!.name }));
      setNewCategoryName('');
      setShowAddCategory(false);
    }
  };

  const handleQuickAddType = async () => {
    if (!newTypeName.trim()) return;
    const res = await addAttribute('type', newTypeName.trim());
    if (res.success && res.attribute) {
      const addedName = res.attribute.name;
      setForm((prev) => ({
        ...prev,
        skinTypes: prev.skinTypes.includes(addedName) ? prev.skinTypes : [...prev.skinTypes, addedName]
      }));
      setNewTypeName('');
      setShowAddType(false);
    }
  };

  const handleQuickAddConcern = async () => {
    if (!newConcernName.trim()) return;
    const res = await addAttribute('concern', newConcernName.trim());
    if (res.success && res.attribute) {
      const addedName = res.attribute.name;
      setForm((prev) => ({
        ...prev,
        concerns: prev.concerns.includes(addedName) ? prev.concerns : [...prev.concerns, addedName]
      }));
      setNewConcernName('');
      setShowAddConcern(false);
    }
  };

  const handleQuickAddTag = async () => {
    if (!newTagName.trim()) return;
    const res = await addAttribute('tag', newTagName.trim());
    if (res.success && res.attribute) {
      const addedName = res.attribute.name;
      setForm((prev) => ({
        ...prev,
        tags: prev.tags.includes(addedName) ? prev.tags : [...prev.tags, addedName]
      }));
      setNewTagName('');
      setShowAddTag(false);
    }
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
              Product name *
              <input
                value={form.name}
                onChange={(event) => handleChange('name', event.target.value)}
                className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="e.g. Radiant Glow Serum, Cotton T-Shirt..."
                required
              />
            </label>
            <label className="space-y-2 text-sm text-slate-700">
              Brand / Manufacturer
              <input
                value={form.brand}
                onChange={(event) => handleChange('brand', event.target.value)}
                className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="Brand name"
              />
            </label>
          </div>

          {/* Category Field with Inline Quick Add */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 text-sm text-slate-700">
              <div className="flex items-center justify-between">
                <span className="font-medium">Category</span>
                <button
                  type="button"
                  onClick={() => setShowAddCategory(!showAddCategory)}
                  className="text-xs text-accent hover:underline font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {showAddCategory ? 'Cancel' : 'New'}
                </button>
              </div>

              {showAddCategory ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="New category..."
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleQuickAddCategory())}
                    className="flex-1 rounded-2xl border border-accent bg-white px-3 py-2 text-sm outline-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleQuickAddCategory}
                    className="px-3 py-2 rounded-2xl bg-accent text-white text-xs font-semibold hover:bg-purple-900"
                  >
                    Add
                  </button>
                </div>
              ) : (
                <select
                  value={form.category}
                  onChange={(event) => handleChange('category', event.target.value)}
                  className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  {categories.map((c) => (
                    <option key={c.id || c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                  {/* If current product has category not in list, render it */}
                  {form.category && !categories.some((c) => c.name === form.category) && (
                    <option value={form.category}>{form.category}</option>
                  )}
                </select>
              )}
            </div>

            <label className="space-y-2 text-sm text-slate-700">
              Barcode / SKU
              <input
                value={form.barcode}
                onChange={(event) => handleChange('barcode', event.target.value)}
                className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="Scan or enter barcode"
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="space-y-2 text-sm text-slate-700">
              Buying price / Cost (KES)
              <input
                type="number"
                value={form.costPrice}
                onChange={(event) => handleChange('costPrice', Number(event.target.value))}
                className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="0.00"
                min={0}
              />
            </label>
            <label className="space-y-2 text-sm text-slate-700">
              Selling price (KES) *
              <input
                type="number"
                value={form.sellingPrice}
                onChange={(event) => handleChange('sellingPrice', Number(event.target.value))}
                className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="0.00"
                min={0}
                required
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
            <label className="space-y-2 text-sm text-slate-700">
              Low stock alert at
              <input
                type="number"
                value={form.lowStockThreshold}
                min={0}
                onChange={(event) => handleChange('lowStockThreshold', Number(event.target.value))}
                className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="5"
              />
            </label>
          </div>

          {form.sellingPrice > 0 && form.costPrice > 0 && (
            <div className="text-xs font-semibold px-3 py-1.5 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 inline-flex items-center gap-2">
              <span>Estimated Profit: KES {(form.sellingPrice - form.costPrice).toLocaleString()}</span>
              <span>•</span>
              <span>Margin: {Math.round(((form.sellingPrice - form.costPrice) / form.sellingPrice) * 100)}%</span>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-2 text-sm text-slate-700">
              Variant / Shade color
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={form.shadeHex}
                  onChange={(event) => handleChange('shadeHex', event.target.value)}
                  className="h-12 w-14 rounded-2xl border border-slate-200 bg-slate-50 cursor-pointer"
                />
                <input
                  type="text"
                  value={form.variant}
                  onChange={(event) => handleChange('variant', event.target.value)}
                  className="flex-1 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
                  placeholder="Variant name (e.g. Crimson, Medium, 500ml)"
                />
              </div>
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
            Notes & Description
            <textarea
              value={form.notes}
              onChange={(event) => handleChange('notes', event.target.value)}
              className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              rows={2}
              placeholder="Product notes, usage instructions, or customer guidance"
            />
          </label>

          {/* Scalable Product Taxonomy: Types, Concerns, Tags */}
          <div className="grid gap-4 pt-2 border-t border-slate-100">
            {/* Product Types / Classifications */}
            <div className="space-y-2 text-sm text-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900">Product Types / Classifications</p>
                  <p className="text-xs text-slate-400">Skin types, product formulations, or material types</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddType(!showAddType)}
                  className="text-xs text-accent hover:underline font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {showAddType ? 'Cancel' : 'Add Type'}
                </button>
              </div>

              {showAddType && (
                <div className="flex items-center gap-2 pb-2">
                  <input
                    type="text"
                    placeholder="New type name..."
                    value={newTypeName}
                    onChange={(e) => setNewTypeName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleQuickAddType())}
                    className="flex-1 rounded-2xl border border-accent bg-white px-3 py-1.5 text-xs outline-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleQuickAddType}
                    className="px-3 py-1.5 rounded-2xl bg-accent text-white text-xs font-semibold hover:bg-purple-900"
                  >
                    Add
                  </button>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {types.map((t) => (
                  <button
                    key={t.id || t.name}
                    type="button"
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      form.skinTypes.includes(t.name)
                        ? 'border-accent bg-accent/10 text-accent font-semibold'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                    onClick={() => toggleArrayValue('skinTypes', t.name)}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Concerns & Benefits */}
            <div className="space-y-2 text-sm text-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900">Concerns & Benefits</p>
                  <p className="text-xs text-slate-400">Target problems solved or product benefits</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddConcern(!showAddConcern)}
                  className="text-xs text-accent hover:underline font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {showAddConcern ? 'Cancel' : 'Add Concern'}
                </button>
              </div>

              {showAddConcern && (
                <div className="flex items-center gap-2 pb-2">
                  <input
                    type="text"
                    placeholder="New concern or benefit..."
                    value={newConcernName}
                    onChange={(e) => setNewConcernName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleQuickAddConcern())}
                    className="flex-1 rounded-2xl border border-accent bg-white px-3 py-1.5 text-xs outline-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleQuickAddConcern}
                    className="px-3 py-1.5 rounded-2xl bg-accent text-white text-xs font-semibold hover:bg-purple-900"
                  >
                    Add
                  </button>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {concerns.map((item) => (
                  <button
                    key={item.id || item.name}
                    type="button"
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      form.concerns.includes(item.name)
                        ? 'border-accent bg-accent/10 text-accent font-semibold'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                    onClick={() => toggleArrayValue('concerns', item.name)}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Tags & Badges */}
            <div className="space-y-2 text-sm text-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900">Tags & Labels</p>
                  <p className="text-xs text-slate-400">Marketing tags, badges, and filters</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddTag(!showAddTag)}
                  className="text-xs text-accent hover:underline font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {showAddTag ? 'Cancel' : 'Add Tag'}
                </button>
              </div>

              {showAddTag && (
                <div className="flex items-center gap-2 pb-2">
                  <input
                    type="text"
                    placeholder="New tag label..."
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleQuickAddTag())}
                    className="flex-1 rounded-2xl border border-accent bg-white px-3 py-1.5 text-xs outline-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleQuickAddTag}
                    className="px-3 py-1.5 rounded-2xl bg-accent text-white text-xs font-semibold hover:bg-purple-900"
                  >
                    Add
                  </button>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {tags.map((item) => (
                  <button
                    key={item.id || item.name}
                    type="button"
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      form.tags.includes(item.name)
                        ? 'border-accent bg-accent/10 text-accent font-semibold'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                    onClick={() => toggleArrayValue('tags', item.name)}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-3 border-t border-slate-100">
            <button
              type="button"
              className="w-full rounded-3xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200 sm:w-auto"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="w-full rounded-3xl bg-accent px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-purple-900 sm:w-auto disabled:opacity-50"
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
