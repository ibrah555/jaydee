import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, Pencil, Trash2, Sliders } from 'lucide-react';
import { useProductStore } from '../stores/product';
import { useAttributeStore } from '../stores/attribute';
import { useAuthStore } from '../stores/auth';
import { Product } from '../db/schema';
import ProductForm from '../components/ProductForm';

export default function Products() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);
  const { products, loading, search, category, loadProducts, setSearch, setCategory, deleteProduct } = useProductStore();
  const { categories, loadAttributes } = useAttributeStore();
  const { user } = useAuthStore();

  const isAdmin = user && ['owner', 'manager', 'superadmin'].includes(user.role);

  useEffect(() => {
    loadProducts();
    loadAttributes();
  }, []);

  // Compute dynamic category options for filtering
  const categoryOptions = useMemo(() => {
    const list = categories.map((c) => c.name);
    products.forEach((p) => {
      if (p.category && !list.includes(p.category)) {
        list.push(p.category);
      }
    });
    return ['All', ...list];
  }, [categories, products]);

  const filteredProducts = useMemo(
    () =>
      products.filter((product) => {
        const query = search.toLowerCase();
        const matchesSearch =
          product.name.toLowerCase().includes(query) ||
          product.brand.toLowerCase().includes(query) ||
          product.sku.toLowerCase().includes(query) ||
          product.barcode.toLowerCase().includes(query);
        const matchesCategory = category === 'All' || product.category === category;
        return matchesSearch && matchesCategory;
      }),
    [products, search, category]
  );

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsOpen(true);
  };

  const handleDelete = async (product: Product) => {
    if (!product.id) return;
    if (!confirm(`Are you sure you want to delete "${product.name}"? This action cannot be undone.`)) return;
    await deleteProduct(product.id);
  };

  const handleFormClose = () => {
    setIsOpen(false);
    setEditingProduct(undefined);
  };

  const handleFormSaved = () => {
    setIsOpen(false);
    setEditingProduct(undefined);
    loadProducts();
    loadAttributes();
  };

  return (
    <div className="min-h-screen p-4 pb-28">
      <header className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-slate-500">Product catalog</p>
          <h1 className="mt-2 text-2xl font-semibold text-accent">Products</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <Link
              to="/admin/attributes"
              className="inline-flex items-center gap-2 rounded-3xl border border-slate-200 bg-white px-4 py-3 text-slate-700 shadow-sm transition hover:bg-slate-50 font-medium text-sm"
              title="Manage categories, types, concerns, and tags"
            >
              <Sliders className="h-4 w-4 text-slate-500" />
              <span>Categories & Tags</span>
            </Link>
          )}
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-3xl bg-accent px-4 py-3 text-white shadow-lg transition hover:bg-purple-900 font-medium text-sm"
            onClick={() => { setEditingProduct(undefined); setIsOpen(true); }}
          >
            <Plus className="h-5 w-5" />
            Add product
          </button>
        </div>
      </header>

      <div className="space-y-4">
        <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3">
            <Search className="h-5 w-5 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, brand, SKU, barcode"
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>
        </div>

        <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Filter by Category</p>
            <Filter className="h-5 w-5 text-slate-400" />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {categoryOptions.map((option) => (
              <button
                key={option}
                type="button"
                className={`rounded-full border px-4 py-2 text-sm transition ${
                  category === option
                    ? 'border-accent bg-accent/10 text-accent font-semibold'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
                onClick={() => setCategory(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="rounded-3xl bg-white p-5 text-slate-500 shadow-sm ring-1 ring-slate-200">Loading products…</div>
        ) : filteredProducts.length === 0 ? (
          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">No products found.</p>
            <p className="mt-3 text-sm text-slate-600">Use Add product to build your inventory catalog.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredProducts.map((product) => (
              <div key={product.id} className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full border shrink-0" style={{ backgroundColor: product.shadeHex || '#f3f4f6' }} />
                    <div>
                      <p className="text-sm text-slate-500">{product.brand}</p>
                      <h2 className="text-lg font-semibold text-slate-900">{product.name}</h2>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-xs font-medium bg-slate-100 px-2.5 py-0.5 rounded-full text-slate-600">
                          {product.category}
                        </span>
                        <span className="text-xs text-slate-400">
                          SKU {product.sku}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleEdit(product)}
                      className="rounded-xl p-2 text-slate-400 hover:bg-accent/10 hover:text-accent transition"
                      title="Edit product"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(product)}
                      className="rounded-xl p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 transition"
                      title="Delete product"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Badges for types and tags */}
                {((product.skinTypes && product.skinTypes.length > 0) || (product.tags && product.tags.length > 0)) && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {product.skinTypes?.map((t) => (
                      <span key={t} className="text-[11px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md font-medium">
                        {t}
                      </span>
                    ))}
                    {product.tags?.map((tg) => (
                      <span key={tg} className="text-[11px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-medium">
                        {tg}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
                  <span className="font-semibold text-slate-900">Price KES {product.sellingPrice.toLocaleString()}</span>
                  <span>Stock: <strong className="text-slate-800">{product.stockQuantity}</strong></span>
                  <span>Barcode: <span className="font-mono text-xs">{product.barcode || 'N/A'}</span></span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isOpen && <ProductForm product={editingProduct} onClose={handleFormClose} onSaved={handleFormSaved} />}
    </div>
  );
}
