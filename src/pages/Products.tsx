import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, ChevronRight } from 'lucide-react';
import { useProductStore } from '../stores/product';
import ProductForm from '../components/ProductForm';

const categories = ['All', 'Skincare', 'Makeup', 'Fragrance', 'Hair', 'Tools', 'Accessories'];

export default function Products() {
  const [isOpen, setIsOpen] = useState(false);
  const { products, loading, search, category, loadProducts, setSearch, setCategory } = useProductStore();

  useEffect(() => {
    loadProducts();
  }, []);

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

  return (
    <div className="min-h-screen p-4 pb-28">
      <header className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-slate-500">Product catalog</p>
          <h1 className="mt-2 text-2xl font-semibold text-accent">Products</h1>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-3xl bg-accent px-4 py-3 text-white shadow-lg transition hover:bg-purple-900"
          onClick={() => setIsOpen(true)}
        >
          <Plus className="h-5 w-5" />
          Add product
        </button>
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
            <p className="text-sm text-slate-500">Filters</p>
            <Filter className="h-5 w-5 text-slate-400" />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {categories.map((option) => (
              <button
                key={option}
                type="button"
                className={`rounded-full border px-4 py-2 text-sm ${category === option ? 'border-accent bg-accent/10 text-accent' : 'border-slate-200 bg-slate-50 text-slate-700'}`}
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
                    <div className="h-12 w-12 rounded-full border" style={{ backgroundColor: product.shadeHex || '#f3f4f6' }} />
                    <div>
                      <p className="text-sm text-slate-500">{product.brand}</p>
                      <h2 className="text-lg font-semibold text-slate-900">{product.name}</h2>
                      <p className="mt-1 text-sm text-slate-500">SKU {product.sku} • {product.category}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-400" />
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
                  <span>Price KES {product.sellingPrice.toLocaleString()}</span>
                  <span>Stock {product.stockQuantity}</span>
                  <span>Barcode {product.barcode || 'N/A'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isOpen && <ProductForm onClose={() => setIsOpen(false)} onSaved={() => { setIsOpen(false); loadProducts(); }} />}
    </div>
  );
}
