import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, Pencil, Trash2, Sliders, RefreshCw, Cloud, CloudOff, Check, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useProductStore } from '../stores/product';
import { useAttributeStore } from '../stores/attribute';
import { useAuthStore } from '../stores/auth';
import { Product } from '../db/schema';
import ProductForm from '../components/ProductForm';
import CloudSyncModal from '../components/CloudSyncModal';
import { isSupabaseConfigured, subscribeToSupabaseProducts } from '../services/supabase';

export default function Products() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const { products, loading, search, category, loadProducts, setSearch, setCategory, deleteProduct, syncWithCloud } = useProductStore();
  const { categories, loadAttributes } = useAttributeStore();
  const { user } = useAuthStore();

  const isAdmin = user && ['owner', 'manager', 'superadmin'].includes(user.role);
  const hasCloud = isSupabaseConfigured();

  useEffect(() => {
    loadProducts();
    loadAttributes();

    // Subscribe to real-time changes across devices via Supabase
    const unsubscribe = subscribeToSupabaseProducts(() => {
      loadProducts();
      loadAttributes();
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
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

  useEffect(() => {
    setCurrentPage(1);
  }, [search, category, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, currentPage, pageSize]);

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

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncMessage('');
    const res = await syncWithCloud();
    setIsSyncing(false);
    if (res.success) {
      setSyncMessage(`Synced ${res.count} product(s) from cloud!`);
      setTimeout(() => setSyncMessage(''), 4000);
    } else {
      setSyncMessage(res.error || 'Sync failed');
      setTimeout(() => setSyncMessage(''), 5000);
    }
  };

  return (
    <div className="min-h-screen p-4 pb-28">
      <header className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-slate-500">Product catalog</p>
          <div className="flex items-center gap-2 mt-1">
            <h1 className="text-2xl font-semibold text-accent">Products</h1>
            {hasCloud ? (
              <button
                type="button"
                onClick={() => setIsCloudModalOpen(true)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200 hover:bg-emerald-100 transition cursor-pointer"
                title="Cloud sync connected. Click to manage."
              >
                <Cloud className="w-3 h-3" />
                Cloud Synced
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsCloudModalOpen(true)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded-full border border-amber-200 hover:bg-amber-100 transition cursor-pointer"
                title="Running in local mode. Click to connect cloud."
              >
                <CloudOff className="w-3 h-3" />
                Local Device Only (Tap to Setup)
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={hasCloud ? handleManualSync : () => setIsCloudModalOpen(true)}
            disabled={isSyncing}
            className="inline-flex items-center gap-2 rounded-3xl border border-slate-200 bg-white px-3.5 py-3 text-slate-700 shadow-sm transition hover:bg-slate-50 font-medium text-sm disabled:opacity-50"
            title="Sync products with cloud"
          >
            <RefreshCw className={`h-4 w-4 text-slate-500 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Cloud'}</span>
          </button>

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

      {/* Sync toast */}
      {syncMessage && (
        <div className="mb-4 p-3 rounded-2xl bg-slate-900 text-white text-xs font-medium flex items-center justify-between shadow-lg">
          <span>{syncMessage}</span>
          <button onClick={() => setSyncMessage('')}><Check className="w-4 h-4 text-emerald-400" /></button>
        </div>
      )}

      {/* Banner if cloud sync is not configured */}
      {!hasCloud && (
        <div className="mb-4 rounded-3xl bg-amber-50 p-4 border border-amber-200 text-xs text-amber-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-900">Multi-Device Cloud Sync Not Configured</p>
              <p className="mt-0.5 text-amber-700">
                Products added on this phone/computer are saved in local storage. Connect Firebase or export a backup to sync with your other devices.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsCloudModalOpen(true)}
            className="shrink-0 px-3.5 py-2 rounded-2xl bg-amber-600 text-white font-semibold text-xs hover:bg-amber-700 transition"
          >
            Setup Cloud Sync
          </button>
        </div>
      )}

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
            {/* Pagination Controls Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl shadow-sm ring-1 ring-slate-200 text-xs">
              <span className="text-slate-600">
                Showing <strong className="text-slate-900">{(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredProducts.length)}</strong> of <strong className="text-slate-900">{filteredProducts.length}</strong> products
              </span>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <span>Per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs outline-none focus:border-accent text-slate-800 font-semibold cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    title="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4 text-slate-600" />
                  </button>

                  <span className="px-2 py-1 font-semibold text-slate-700">
                    {currentPage} / {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    title="Next page"
                  >
                    <ChevronRight className="w-4 h-4 text-slate-600" />
                  </button>
                </div>
              </div>
            </div>

            {paginatedProducts.map((product) => (
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

            {/* Bottom pagination if multiple pages */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between bg-white p-3 rounded-2xl shadow-sm ring-1 ring-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition font-medium"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Previous
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                    .map((p, idx, arr) => (
                      <span key={p} className="flex items-center">
                        {idx > 0 && p - arr[idx - 1] > 1 && <span className="px-1 text-slate-400">…</span>}
                        <button
                          type="button"
                          onClick={() => setCurrentPage(p)}
                          className={`w-7 h-7 rounded-lg font-semibold transition ${
                            currentPage === p ? 'bg-accent text-white shadow-sm' : 'hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          {p}
                        </button>
                      </span>
                    ))}
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition font-medium"
                >
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {isOpen && <ProductForm product={editingProduct} onClose={handleFormClose} onSaved={handleFormSaved} />}
      <CloudSyncModal isOpen={isCloudModalOpen} onClose={() => setIsCloudModalOpen(false)} />
    </div>
  );
}
