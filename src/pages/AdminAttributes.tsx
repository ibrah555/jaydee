import { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import { useAttributeStore } from '../stores/attribute';
import { useProductStore } from '../stores/product';
import { AttributeType, ProductAttribute } from '../db/schema';
import { 
  Plus, 
  Trash2, 
  Pencil, 
  Search, 
  Check, 
  AlertCircle, 
  ArrowLeft, 
  Layers, 
  Tag, 
  Sparkles, 
  Boxes,
  X
} from 'lucide-react';

interface TabConfig {
  id: AttributeType;
  label: string;
  singular: string;
  icon: any;
  description: string;
}

const TABS: TabConfig[] = [
  {
    id: 'category',
    label: 'Categories',
    singular: 'Category',
    icon: Boxes,
    description: 'High-level product departments (e.g., Skincare, Electronics, Apparel, Beverages)'
  },
  {
    id: 'type',
    label: 'Product Types',
    singular: 'Type',
    icon: Layers,
    description: 'Formulations, skin types, material types, or product forms (e.g., Oily, Liquid, Cotton, Powder)'
  },
  {
    id: 'concern',
    label: 'Concerns & Benefits',
    singular: 'Concern / Benefit',
    icon: Sparkles,
    description: 'Targeted results, pain-points addressed, or features (e.g., Anti-Aging, Waterproof, Fast-Dry)'
  },
  {
    id: 'tag',
    label: 'Tags & Badges',
    singular: 'Tag',
    icon: Tag,
    description: 'Marketing badges and promotional attributes (e.g., Vegan, Best Seller, New, Organic, Sale)'
  }
];

export default function AdminAttributes() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const {
    categories,
    types,
    concerns,
    tags,
    loading,
    loadAttributes,
    addAttribute,
    updateAttribute,
    deleteAttribute
  } = useAttributeStore();

  const { products, loadProducts } = useProductStore();

  const [activeTab, setActiveTab] = useState<AttributeType>('category');
  const [searchTerm, setSearchTerm] = useState('');
  const [newAttrName, setNewAttrName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Check admin role
  useEffect(() => {
    if (!user || !['owner', 'manager', 'superadmin'].includes(user.role)) {
      navigate('/');
      return;
    }
    loadAttributes();
    loadProducts();
  }, [user]);

  // Determine current items list
  const currentList = useMemo(() => {
    switch (activeTab) {
      case 'category':
        return categories;
      case 'type':
        return types;
      case 'concern':
        return concerns;
      case 'tag':
        return tags;
      default:
        return [];
    }
  }, [activeTab, categories, types, concerns, tags]);

  // Calculate usage count of each attribute across products
  const usageCountMap = useMemo(() => {
    const counts = new Map<string, number>();

    products.forEach((p) => {
      // category
      if (p.category) {
        const key = `category:${p.category.toLowerCase().trim()}`;
        counts.set(key, (counts.get(key) || 0) + 1);
      }
      // types
      (p.skinTypes || []).forEach((t) => {
        if (t) {
          const key = `type:${t.toLowerCase().trim()}`;
          counts.set(key, (counts.get(key) || 0) + 1);
        }
      });
      // concerns
      (p.concerns || []).forEach((c) => {
        if (c) {
          const key = `concern:${c.toLowerCase().trim()}`;
          counts.set(key, (counts.get(key) || 0) + 1);
        }
      });
      // tags
      (p.tags || []).forEach((tg) => {
        if (tg) {
          const key = `tag:${tg.toLowerCase().trim()}`;
          counts.set(key, (counts.get(key) || 0) + 1);
        }
      });
    });

    return counts;
  }, [products]);

  // Filtered items by search
  const filteredItems = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return currentList;
    return currentList.filter((item) => item.name.toLowerCase().includes(q));
  }, [currentList, searchTerm]);

  const activeConfig = TABS.find((t) => t.id === activeTab)!;

  const handleAdd = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newAttrName.trim()) return;

    setError('');
    setSuccess('');

    const res = await addAttribute(activeTab, newAttrName.trim());
    if (res.success) {
      setSuccess(res.message);
      setNewAttrName('');
    } else {
      setError(res.message);
    }
  };

  const handleStartEdit = (attr: ProductAttribute) => {
    setEditingId(attr.id!);
    setEditingName(attr.name);
    setError('');
    setSuccess('');
  };

  const handleSaveEdit = async (id: number) => {
    if (!editingName.trim()) return;

    setError('');
    setSuccess('');

    const res = await updateAttribute(id, editingName.trim());
    if (res.success) {
      setSuccess(res.message);
      setEditingId(null);
      setEditingName('');
      loadProducts();
    } else {
      setError(res.message);
    }
  };

  const handleDelete = async (attr: ProductAttribute) => {
    const count = usageCountMap.get(`${attr.type}:${attr.name.toLowerCase().trim()}`) || 0;
    const warning = count > 0 
      ? `"${attr.name}" is currently referenced by ${count} product(s). Are you sure you want to delete it from the options list?`
      : `Are you sure you want to delete "${attr.name}"?`;

    if (!confirm(warning)) return;

    setError('');
    setSuccess('');

    const res = await deleteAttribute(attr.id!);
    if (res.success) {
      setSuccess(res.message);
    } else {
      setError(res.message);
    }
  };

  return (
    <div className="min-h-screen p-4 pb-28 bg-slate-50">
      {/* Header */}
      <header className="mb-6">
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link
                to="/products"
                className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                title="Back to products"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Catalog Architecture</p>
                <h1 className="text-2xl font-bold text-accent">Categories & Attributes</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/products"
                className="px-4 py-2.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold transition"
              >
                View Products
              </Link>
            </div>
          </div>
          <p className="mt-3 text-xs sm:text-sm text-slate-500">
            Scale your POS for any product line by creating custom categories, types, concerns/benefits, and tags.
          </p>
        </div>
      </header>

      {/* Notifications */}
      {error && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl bg-rose-50 p-4 border border-rose-200 text-sm text-rose-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')}><X className="w-4 h-4" /></button>
        </div>
      )}

      {success && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl bg-emerald-50 p-4 border border-emerald-200 text-sm text-emerald-700">
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess('')}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Tabs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          let count = 0;
          if (tab.id === 'category') count = categories.length;
          if (tab.id === 'type') count = types.length;
          if (tab.id === 'concern') count = concerns.length;
          if (tab.id === 'tag') count = tags.length;

          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSearchTerm('');
                setError('');
                setSuccess('');
                setEditingId(null);
              }}
              className={`p-4 rounded-3xl text-left transition flex items-center justify-between ${
                isActive
                  ? 'bg-accent text-white shadow-md shadow-accent/20 ring-2 ring-accent'
                  : 'bg-white text-slate-700 hover:bg-slate-100/80 ring-1 ring-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-2xl ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">{tab.label}</h3>
                  <span className={`text-xs ${isActive ? 'text-white/80' : 'text-slate-400'}`}>
                    {count} configured
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Tab Content Section */}
      <div className="bg-white rounded-3xl p-5 md:p-6 shadow-sm ring-1 ring-slate-200 space-y-6">
        {/* Tab Intro & Add Form */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{activeConfig.label}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{activeConfig.description}</p>
          </div>

          <form onSubmit={handleAdd} className="flex items-center gap-2 w-full md:w-auto">
            <input
              type="text"
              placeholder={`Add new ${activeConfig.singular.toLowerCase()}...`}
              value={newAttrName}
              onChange={(e) => setNewAttrName(e.target.value)}
              className="flex-1 md:w-64 rounded-2xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 bg-slate-50"
            />
            <button
              type="submit"
              disabled={!newAttrName.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-accent text-white text-sm font-semibold hover:bg-purple-900 disabled:opacity-50 transition shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add</span>
            </button>
          </form>
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm">
          <Search className="h-4 w-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder={`Search ${activeConfig.label.toLowerCase()}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent outline-none text-slate-800 placeholder:text-slate-400"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* List of Attributes */}
        {loading ? (
          <div className="py-12 text-center text-sm text-slate-400">Loading attributes...</div>
        ) : filteredItems.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm font-medium text-slate-600">
              {searchTerm ? `No ${activeConfig.label.toLowerCase()} match "${searchTerm}"` : `No ${activeConfig.label.toLowerCase()} added yet.`}
            </p>
            <p className="text-xs text-slate-400 mt-1">Use the input above to create your first {activeConfig.singular.toLowerCase()}.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredItems.map((attr) => {
              const count = usageCountMap.get(`${attr.type}:${attr.name.toLowerCase().trim()}`) || 0;
              const isEditing = editingId === attr.id;

              return (
                <div
                  key={attr.id}
                  className="rounded-2xl border border-slate-200 p-3.5 bg-slate-50/60 hover:bg-white hover:shadow-sm transition flex flex-col justify-between gap-3 group"
                >
                  {isEditing ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit(attr.id!);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        autoFocus
                        className="w-full rounded-xl border border-accent bg-white px-2.5 py-1.5 text-sm font-semibold outline-none"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(attr.id!) }
                          className="flex-1 px-2.5 py-1 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-purple-900 transition"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-100 transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-sm text-slate-900 break-words">{attr.name}</span>
                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition shrink-0">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(attr)}
                            className="p-1 rounded-lg hover:bg-slate-200/70 text-slate-500 transition"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(attr)}
                            className="p-1 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                        <span>{count} product{count === 1 ? '' : 's'}</span>
                        <span className="capitalize text-[10px] text-slate-300">ID #{attr.id}</span>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
