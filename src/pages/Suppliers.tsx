import React, { useState, useRef, useEffect } from 'react';
import { db, Supplier, Product } from '../db/schema';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Download, 
  Package, 
  AlertCircle, 
  Upload, 
  FileText, 
  CheckCircle2, 
  RefreshCw,
  Search,
  ShoppingCart,
  RotateCcw
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ProductForm from '../components/ProductForm';
import { downloadSampleTemplate, importProductsFromCSV, ImportResult } from '../utils/csvImporter';
import { pushProductToSupabase } from '../services/supabase';

export default function Suppliers() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null);
  const [showProductForm, setShowProductForm] = useState(false);

  // File upload state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importNotification, setImportNotification] = useState<string | null>(null);

  // Table filter state
  const [productSearch, setProductSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low'>('all');

  // Supplier form states
  const [name, setName] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');

  const suppliers = useLiveQuery(() => db.suppliers.toArray(), []) || [];
  const products = useLiveQuery(() => db.products.toArray(), []) || [];

  // Auto-create supplier entries from product data so every device sees them
  useEffect(() => {
    if (products.length === 0) return;

    const autoPopulate = async () => {
      const existingSuppliers = await db.suppliers.toArray();
      const existingNames = new Set(existingSuppliers.map(s => s.name.toLowerCase()));

      // Collect unique supplier names from products
      const supplierNames = new Set<string>();
      for (const p of products) {
        if (p.supplier && p.supplier.trim() && !existingNames.has(p.supplier.trim().toLowerCase())) {
          supplierNames.add(p.supplier.trim());
        }
      }

      if (supplierNames.size === 0) return;

      const now = Date.now();
      for (const sName of supplierNames) {
        try {
          await db.suppliers.add({
            name: sName,
            contactName: '',
            phone: '',
            email: '',
            address: '',
            createdAt: now,
            updatedAt: now
          });
        } catch {
          // ignore duplicate name errors
        }
      }
    };

    autoPopulate();
  }, [products.length]);

  const handleOpenModal = (supplier?: Supplier) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setName(supplier.name);
      setContactName(supplier.contactName || '');
      setPhone(supplier.phone || '');
      setEmail(supplier.email || '');
      setAddress(supplier.address || '');
    } else {
      setEditingSupplier(null);
      setName('');
      setContactName('');
      setPhone('');
      setEmail('');
      setAddress('');
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      if (editingSupplier && editingSupplier.id) {
        await db.suppliers.update(editingSupplier.id, {
          name: name.trim(),
          contactName: contactName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          address: address.trim(),
          updatedAt: Date.now()
        });
      } else {
        const id = await db.suppliers.add({
          name: name.trim(),
          contactName: contactName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          address: address.trim(),
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
        if (!selectedSupplierId) setSelectedSupplierId(id);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error saving supplier:', err);
      alert('Failed to save supplier. Name might not be unique.');
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this supplier? Products will remain in catalog.')) {
      await db.suppliers.delete(id);
      if (selectedSupplierId === id) setSelectedSupplierId(null);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportNotification(null);

    try {
      const text = await file.text();
      const res: ImportResult = await importProductsFromCSV(text);

      if (res.errors.length > 0) {
        alert(`Import note: ${res.errors.join('\n')}`);
      }

      setImportNotification(
        `Import completed! Processed ${res.totalProcessed} products: ` +
        `${res.addedCount} new added, ${res.restockedCount} existing restocked (+added to stock balance), ` +
        `and ${res.suppliersAdded} new supplier(s) registered.`
      );
    } catch (err: any) {
      console.error(err);
      alert(`Error reading file: ${err?.message || 'Could not parse file'}`);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleReorderTargetChange = async (productId: number, val: number) => {
    const newTarget = Math.max(0, val);
    await db.products.update(productId, {
      lowStockThreshold: newTarget,
      updatedAt: Date.now()
    });

    const updated = await db.products.get(productId);
    if (updated) {
      try {
        await pushProductToSupabase(updated);
      } catch (e) {
        console.error('Failed to sync reorder target to cloud:', e);
      }
    }
  };

  const handleResetAllSupplierTargets = async () => {
    if (!selectedSupplier || supplierProducts.length === 0) return;
    if (!confirm(`Reset reorder target to 0 for all ${supplierProducts.length} product(s) under ${selectedSupplier.name}?`)) return;

    await db.transaction('rw', db.products, async () => {
      for (const p of supplierProducts) {
        await db.products.update(p.id!, {
          lowStockThreshold: 0,
          updatedAt: Date.now()
        });
      }
    });

    try {
      const { pushAllProductsToSupabase } = await import('../services/supabase');
      await pushAllProductsToSupabase();
    } catch (err) {
      console.warn('Sync note:', err);
    }
  };

  const selectedSupplier = suppliers.find(s => s.id === selectedSupplierId);
  const supplierProducts = selectedSupplier ? products.filter(p => p.supplier === selectedSupplier.name) : [];
  
  // Filter products by search and low-stock filter
  const displayedProducts = supplierProducts.filter(p => {
    const matchesSearch = !productSearch || 
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.brand.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.barcode.includes(productSearch);
    const matchesStock = stockFilter === 'all' || p.stockQuantity <= (p.lowStockThreshold || 0);
    return matchesSearch && matchesStock;
  });

  // Zero-quantity exclusion: ONLY products with order target > 0 are included in orderlist
  const itemsToOrder = supplierProducts.filter(p => (p.lowStockThreshold || 0) > 0);
  const totalOrderUnits = itemsToOrder.reduce((sum, p) => sum + (p.lowStockThreshold || 0), 0);
  const totalOrderAmount = itemsToOrder.reduce((sum, p) => sum + ((p.lowStockThreshold || 0) * (p.costPrice || 0)), 0);

  const downloadPDF = () => {
    if (!selectedSupplier || itemsToOrder.length === 0) return;
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.setTextColor(30);
    doc.text(`PURCHASE ORDER: ${selectedSupplier.name}`, 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Date: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, 14, 28);
    if (selectedSupplier.contactName) doc.text(`Contact: ${selectedSupplier.contactName}`, 14, 34);
    if (selectedSupplier.phone) doc.text(`Phone: ${selectedSupplier.phone}`, 14, 40);
    if (selectedSupplier.email) doc.text(`Email: ${selectedSupplier.email}`, 14, 46);

    const startY = selectedSupplier.email ? 52 : (selectedSupplier.phone ? 46 : 36);

    // Build table with products whose target is greater than 0 (zeroes excluded)
    const tableData = itemsToOrder.map((p, idx) => {
      const orderQty = p.lowStockThreshold || 0;
      const unitCost = p.costPrice || 0;
      const lineTotal = orderQty * unitCost;
      return [
        (idx + 1).toString(),
        p.name,
        p.brand || '-',
        p.barcode || '-',
        p.stockQuantity.toString(),
        orderQty.toString(),
        unitCost.toLocaleString(),
        lineTotal.toLocaleString()
      ];
    });

    autoTable(doc, {
      startY,
      head: [['#', 'Product Name', 'Brand', 'Barcode', 'Current Stock', 'Order Qty', 'Unit Cost (KES)', 'Total (KES)']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [183, 110, 121] },
      styles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 10 },
        4: { halign: 'center' },
        5: { halign: 'center', fontStyle: 'bold' },
        6: { halign: 'right' },
        7: { halign: 'right', fontStyle: 'bold' }
      },
      foot: [[
        '',
        'GRAND TOTAL',
        '',
        '',
        '',
        totalOrderUnits.toString(),
        '',
        `KES ${totalOrderAmount.toLocaleString()}`
      ]],
      footStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], fontStyle: 'bold' }
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 150;
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text('Powered by Silent Strides Network LTD', 14, Math.min(285, finalY + 12));

    doc.save(`Order_${selectedSupplier.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const downloadCSV = () => {
    if (!selectedSupplier || itemsToOrder.length === 0) return;
    const headers = ['#', 'Product Name', 'Brand', 'Barcode', 'Current Stock', 'Order Quantity', 'Unit Cost (KES)', 'Line Total (KES)'];
    const rows = itemsToOrder.map((p, idx) => {
      const orderQty = p.lowStockThreshold || 0;
      const unitCost = p.costPrice || 0;
      const lineTotal = orderQty * unitCost;
      return [
        idx + 1,
        `"${p.name.replace(/"/g, '""')}"`,
        `"${(p.brand || '').replace(/"/g, '""')}"`,
        `"${p.barcode || ''}"`,
        p.stockQuantity,
        orderQty,
        unitCost,
        lineTotal
      ].join(',');
    });

    const summaryRow = `,"GRAND TOTAL",,,,${totalOrderUnits},,${totalOrderAmount}`;
    const csvContent = '\uFEFF' + [headers.join(','), ...rows, summaryRow].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `Order_${selectedSupplier.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 md:p-6 bg-secondary/30 min-h-screen pb-24">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Suppliers & Restocking</h1>
            <p className="text-sm text-slate-500 mt-0.5">Manage vendors, upload catalogs, and create WhatsApp/printable purchase orders.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {/* Hidden CSV file picker */}
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv,.txt,.tsv"
              onChange={handleFileUpload}
              className="hidden"
            />

            <button
              onClick={downloadSampleTemplate}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-semibold transition"
              title="Download empty Excel/CSV template with all fields"
            >
              <FileText className="w-4 h-4 text-slate-500" />
              <span>Sample Template</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-semibold transition disabled:opacity-50"
              title="Upload products via Excel/CSV spreadsheet"
            >
              {isImporting ? (
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
              ) : (
                <Upload className="w-4 h-4 text-emerald-600" />
              )}
              <span>{isImporting ? 'Importing…' : 'Upload Excel / CSV'}</span>
            </button>

            <button
              onClick={() => handleOpenModal()}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 transition shadow-sm text-xs font-semibold"
            >
              <Plus className="w-4 h-4" />
              <span>Add Supplier</span>
            </button>
          </div>
        </div>

        {/* Import success/notification banner */}
        {importNotification && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center justify-between shadow-sm animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{importNotification}</span>
            </div>
            <button
              onClick={() => setImportNotification(null)}
              className="text-emerald-700 hover:text-emerald-950 font-bold ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Suppliers List */}
          <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <h2 className="text-base font-bold text-slate-900">Your Suppliers</h2>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">
                {suppliers.length}
              </span>
            </div>
            
            {suppliers.length === 0 ? (
              <div className="text-center py-10">
                <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No suppliers found.</p>
                <p className="text-xs text-slate-400 mt-1">Add one manually or upload a spreadsheet.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {suppliers.map(supplier => {
                  const supplierProdCount = products.filter(p => p.supplier === supplier.name).length;
                  const isSelected = selectedSupplierId === supplier.id;

                  return (
                    <div 
                      key={supplier.id}
                      onClick={() => setSelectedSupplierId(supplier.id!)}
                      className={`p-3.5 rounded-xl cursor-pointer border transition flex justify-between items-center ${
                        isSelected 
                          ? 'bg-primary/5 border-primary/30 shadow-sm' 
                          : 'bg-white hover:bg-slate-50 border-slate-100'
                      }`}
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <h3 className={`font-semibold text-sm truncate ${isSelected ? 'text-primary' : 'text-slate-900'}`}>
                          {supplier.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                          <span>{supplierProdCount} product(s)</span>
                          {supplier.phone && (
                            <>
                              <span>•</span>
                              <span className="truncate">{supplier.phone}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleOpenModal(supplier); }}
                          className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition"
                          title="Edit supplier"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDelete(supplier.id!); }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                          title="Delete supplier"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Restocking Dashboard */}
          <div className="lg:col-span-2 space-y-6">
            {selectedSupplier ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-full">
                {/* Supplier Detail Header */}
                <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{selectedSupplier.name}</h2>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                      <span className="flex items-center gap-1">
                        <Package className="w-3.5 h-3.5 text-slate-400" />
                        Total: <strong>{supplierProducts.length}</strong> items
                      </span>
                      {selectedSupplier.phone && (
                        <span>Phone: <strong>{selectedSupplier.phone}</strong></span>
                      )}
                      {selectedSupplier.contactName && (
                        <span>Rep: <strong>{selectedSupplier.contactName}</strong></span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setShowProductForm(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-primary text-white hover:bg-primary/90 rounded-xl text-xs font-semibold transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Product
                    </button>

                    <button
                      onClick={handleResetAllSupplierTargets}
                      disabled={supplierProducts.length === 0}
                      className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 rounded-xl text-xs font-semibold transition disabled:opacity-40"
                      title="Reset all product targets for this supplier to 0"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                      Reset All to 0
                    </button>
                    
                    <button
                      onClick={downloadCSV}
                      disabled={itemsToOrder.length === 0}
                      className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 rounded-xl text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
                      title={itemsToOrder.length === 0 ? 'Set reorder target > 0 on items to export' : 'Export purchase order to CSV'}
                    >
                      <Download className="w-3.5 h-3.5" />
                      CSV Order ({itemsToOrder.length})
                    </button>

                    <button
                      onClick={downloadPDF}
                      disabled={itemsToOrder.length === 0}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl text-xs font-semibold transition shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                      title={itemsToOrder.length === 0 ? 'Set reorder target > 0 on items to generate' : 'Generate printable / WhatsApp PDF order'}
                    >
                      <Download className="w-3.5 h-3.5" />
                      Generate PDF ({itemsToOrder.length})
                    </button>
                  </div>
                </div>

                {/* Filter and Order summary bar */}
                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search products..."
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-primary"
                      />
                    </div>

                    <select
                      value={stockFilter}
                      onChange={(e) => setStockFilter(e.target.value as 'all' | 'low')}
                      className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none font-medium text-slate-700"
                    >
                      <option value="all">All Products</option>
                      <option value="low">Low Stock Only</option>
                    </select>
                  </div>

                  {/* Order Total Badge */}
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-accent/10 border border-accent/20 rounded-xl text-xs text-accent font-semibold">
                    <ShoppingCart className="w-4 h-4" />
                    <span>Order: <strong>{itemsToOrder.length}</strong> items ({totalOrderUnits} units) = <strong>KES {totalOrderAmount.toLocaleString()}</strong></span>
                  </div>
                </div>

                {/* Table */}
                <div className="p-4 overflow-x-auto flex-1">
                  {displayedProducts.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                      <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-medium text-slate-600">No products match the filter.</p>
                      <p className="text-xs text-slate-400 mt-1">Click "Add Product" or upload an Excel/CSV file to assign items to this supplier.</p>
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs text-slate-600">
                      <thead className="bg-slate-50 text-slate-700 uppercase font-semibold border-b border-slate-100">
                        <tr>
                          <th className="px-3 py-3">Product Name</th>
                          <th className="px-3 py-3 text-right">Cost Price</th>
                          <th className="px-3 py-3 text-center">Current Stock</th>
                          <th className="px-3 py-3 text-center">
                            <span>Reorder Target</span>
                            <span className="block text-[10px] text-slate-400 font-normal lowercase">(type to edit)</span>
                          </th>
                          <th className="px-3 py-3 text-right">Line Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {displayedProducts.map(p => {
                          const orderTarget = p.lowStockThreshold || 0;
                          const lineTotal = orderTarget * (p.costPrice || 0);
                          const isLowStock = p.stockQuantity <= orderTarget;

                          return (
                            <tr key={p.id} className="hover:bg-slate-50/50 transition">
                              <td className="px-3 py-2.5">
                                <p className="font-semibold text-slate-900">{p.name}</p>
                                <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                                  {p.brand && <span>Brand: {p.brand}</span>}
                                  {p.barcode && <span>Barcode: {p.barcode}</span>}
                                </div>
                              </td>

                              <td className="px-3 py-2.5 text-right font-medium text-slate-700">
                                KES {p.costPrice.toLocaleString()}
                              </td>

                              <td className="px-3 py-2.5 text-center">
                                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
                                  p.stockQuantity <= 0 
                                    ? 'bg-rose-100 text-rose-700' 
                                    : isLowStock 
                                    ? 'bg-amber-100 text-amber-700' 
                                    : 'bg-emerald-100 text-emerald-700'
                                }`}>
                                  {p.stockQuantity}
                                </span>
                              </td>

                              <td className="px-3 py-2.5 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  value={orderTarget}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    handleReorderTargetChange(p.id!, v === '' ? 0 : Math.max(0, parseInt(v) || 0));
                                  }}
                                  className="w-20 px-2.5 py-1.5 border border-slate-200 bg-white focus:bg-white rounded-lg text-center font-bold text-slate-800 text-xs focus:ring-2 focus:ring-primary focus:border-primary outline-none transition"
                                  title="Type the quantity you want to reorder (0 = do not order)"
                                />
                              </td>

                              <td className="px-3 py-2.5 text-right font-bold text-slate-800">
                                {orderTarget > 0 ? (
                                  <span className="text-accent">KES {lineTotal.toLocaleString()}</span>
                                ) : (
                                  <span className="text-slate-300">-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Footer notes */}
                <div className="p-3 bg-slate-50/70 border-t border-slate-100 text-[11px] text-slate-500 flex flex-wrap justify-between items-center gap-2">
                  <span>
                    💡 <em>Tip: Products set to <strong>0</strong> are automatically excluded from the generated PDF/CSV orderlist.</em>
                  </span>
                  <span>
                    Ready to order: <strong>{itemsToOrder.length}</strong> items
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center h-full flex flex-col justify-center items-center">
                <Package className="w-14 h-14 text-slate-200 mb-3" />
                <h3 className="text-base font-bold text-slate-900 mb-1">Select a Supplier</h3>
                <p className="text-xs text-slate-500 max-w-sm">Choose a supplier from the list on the left to inspect their inventory, set reorder amounts, and generate purchase orders.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Supplier Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4">{editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}</h2>
            
            <form onSubmit={handleSave} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Supplier / Company Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BESTMAN, CYGRA, LURON"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Person (Sales Rep)</label>
                <input
                  type="text"
                  placeholder="e.g. John Kamau"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number (WhatsApp)</label>
                <input
                  type="tel"
                  placeholder="e.g. +254 712 345 678"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="orders@supplier.com"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Physical Address / Depot</label>
                <input
                  type="text"
                  placeholder="e.g. Industrial Area, Nairobi"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white text-xs font-semibold rounded-xl hover:bg-primary/90 transition shadow-sm"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Product Form Modal */}
      {showProductForm && selectedSupplier && (
        <ProductForm
          onClose={() => setShowProductForm(false)}
          onSaved={() => setShowProductForm(false)}
          initialSupplier={selectedSupplier.name}
        />
      )}
    </div>
  );
}
