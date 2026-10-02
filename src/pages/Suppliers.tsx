import React, { useState } from 'react';
import { db, Supplier, Product } from '../db/schema';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Edit2, Trash2, Download, Package, AlertCircle } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ProductForm from '../components/ProductForm';

export default function Suppliers() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null);
  const [showProductForm, setShowProductForm] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');

  const suppliers = useLiveQuery(() => db.suppliers.toArray(), []) || [];
  const products = useLiveQuery(() => db.products.toArray(), []) || [];

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
        await db.suppliers.add({
          name: name.trim(),
          contactName: contactName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          address: address.trim(),
          createdAt: Date.now()
        });
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error saving supplier:', err);
      alert('Failed to save supplier. Name might not be unique.');
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this supplier?')) {
      await db.suppliers.delete(id);
      if (selectedSupplierId === id) setSelectedSupplierId(null);
    }
  };

  const selectedSupplier = suppliers.find(s => s.id === selectedSupplierId);
  const supplierProducts = selectedSupplier ? products.filter(p => p.supplier === selectedSupplier.name) : [];
  
  // Products that need restocking
  const lowStockProducts = supplierProducts.filter(p => p.stockQuantity <= (p.lowStockThreshold || 5));

  const downloadPDF = () => {
    if (!selectedSupplier) return;
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text(`Order List: ${selectedSupplier.name}`, 14, 22);
    
    doc.setFontSize(11);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 30);
    if (selectedSupplier.phone) doc.text(`Phone: ${selectedSupplier.phone}`, 14, 36);

    const tableData = lowStockProducts.map(p => [
      p.name,
      p.stockQuantity.toString(),
      (p.lowStockThreshold || 5).toString(),
      p.costPrice.toLocaleString()
    ]);

    autoTable(doc, {
      startY: 45,
      head: [['Product Name', 'Current Stock', 'Reorder Threshold', 'Cost Price (KES)']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [183, 110, 121] }
    });

    doc.save(`OrderList_${selectedSupplier.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const downloadCSV = () => {
    if (!selectedSupplier) return;
    const headers = ['Product Name', 'Current Stock', 'Reorder Threshold', 'Cost Price'];
    const rows = lowStockProducts.map(p => [
      `"${p.name}"`,
      p.stockQuantity,
      p.lowStockThreshold || 5,
      p.costPrice
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `OrderList_${selectedSupplier.name.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ----------------------------------------------------
  // Bulk Import Helper (Hardcoded from User Request)
  // ----------------------------------------------------
  const handleBulkImport = async () => {
    if (!confirm('This will import the 130+ initial products with 0 stock. Proceed?')) return;
    
    // Extracted from user prompt
    const rawData = [
      ["BESTMAN", "1L Bamsi conditioner", 143, 200],
      ["BESTMAN", "240g Bamsi curl gel", 95, 200],
      ["BESTMAN", "5L Bamsi shampoo", 330, 450],
      ["BESTMAN", "50ml Seduction spray", 75, 130],
      ["BESTMAN", "Spot fix - Luron", 130, 200],
      ["BESTMAN", "200g Miqdi relaxer", 183, 250],
      ["BESTMAN", "1L Miqdi shampoo", 210, 350],
      ["BESTMAN", "450ml Miqdi shampoo", 135, 250],
      ["BESTMAN", "60ml Radiant dye", 70, 100],
      ["BESTMAN", "70ml Radiant dye", 100, 150],
      ["BESTMAN", "Radiant leave in", 113, 200],
      ["BESTMAN", "TCB hairfood", 130, 200],
      ["BESTMAN", "200ml Vaseline aloe Htn", 265, 300],
      ["BESTMAN", "160ml Aloe vera rooting gel", 170, 300],
      ["BESTMAN", "260ml Aloe vera soothing gel", 230, 350],
      ["BESTMAN", "120ml soothing gel", 135, 250],
      ["BESTMAN", "Vaseline oil (Pink)", 320, 550],
      ["BESTMAN", "Skala Active", 80, 130],
      ["BESTMAN", "Skala Cool", 80, 130],
      ["BESTMAN", "Morit curl gel", 90, 150],
      ["BESTMAN", "Vaseline oil (cocoa)", 320, 550],
      ["BESTMAN", "Soft carrot", 100, 130],
      ["BESTMAN", "Super white cream", 230, 300],
      ["BESTMAN", "Pretty white tube", 130, 200],
      ["BESTMAN", "Pawpaw oil", 130, 200],
      ["BESTMAN", "G1 carambola soap", 135, 200],
      ["BESTMAN", "Epiderm", 45, 100],
      ["BESTMAN", "Chandni cream", 230, 300],
      ["BESTMAN", "Diamond white cream", 230, 300],
      ["BESTMAN", "Chelsea spray", 270, 400],
      ["BESTMAN", "AL Rehab spray 50ml", 270, 400],
      ["BESTMAN", "Amara Htn Argan/Jojoba 400ml", 240, 300],
      ["BESTMAN", "Guess gel (1-1/33-1-350)", 350, 450],
      ["BESTMAN", "90g Afrocare jelly", 57, 100],
      ["BESTMAN", "100g Babycare", 53, 100],
      ["BESTMAN", "200g Babycare", 103, 150],
      ["BESTMAN", "125g Babylove perfume", 88, 150],
      ["BESTMAN", "250g perfumed Babylove", 145, 200],
      ["BESTMAN", "250g Bamsi conditioner", 60, 100],
      ["BESTMAN", "500ml/1L conditioner", 98, 150],
      ["BESTMAN", "80g Bamsi curl gel", 36, 80],
      ["BESTMAN", "200ml Blue for men spray", 290, 400],
      ["BESTMAN", "Darling Havana plus", 480, 600],
      ["BESTMAN", "50ml Luron vanishing", 150, 250],
      ["BESTMAN", "100ml Mega Growth Htn food", 165, 250],
      ["BESTMAN", "Mega Growth X Touch", 320, 600],
      ["BESTMAN", "200g Movit jelly", 160, 250],
      ["BESTMAN", "100g Movit jelly", 87, 150],
      ["BESTMAN", "100g Movit sheen", 130, 200],
      ["BESTMAN", "150g Movit styling gel", 138, 200],
      ["BESTMAN", "360ml NIL Htn", 260, 300],
      ["BESTMAN", "212g TCB relaxer", 195, 300],
      ["BESTMAN", "212g TCB relaxer Super", 195, 300],
      ["BESTMAN", "45g Vaseline jelly", 64, 100],
      ["BESTMAN", "95ml Vaseline jelly", 115, 200],
      ["BESTMAN", "Venus antidandruff lotion", 155, 250],
      ["BESTMAN", "T-Guards", 45, 100],
      ["BESTMAN", "3 in 1 mirror", 30, 50],
      ["BESTMAN", "Mirror", 38, 100],
      ["BESTMAN", "Powder", 117, 140],
      ["BESTMAN", "Jelly combs", 4, 30],
      ["BESTMAN", "Pony tail", 160, 250],
      ["BESTMAN", "25g Babycare", 17, 30],
      ["BESTMAN", "100ml Bamsi leave in", 58, 150],
      ["BESTMAN", "140g Bamsi wax", 220, 300],
      ["BESTMAN", "15g Luron acne cream", 125, 200],
      ["BESTMAN", "400g Miqdi blowout", 180, 350],
      ["BESTMAN", "110ml NIL glycerin cocoa", 165, 200],
      ["BESTMAN", "85g Sedoso wax", 95, 150],
      ["BESTMAN", "200g Skala cream", 72, 120],
      ["BESTMAN", "100ml Amara Htn", 90, 100],
      ["BESTMAN", "200ml Amara Htn", 135, 200],
      ["BESTMAN", "50g Arimis jelly", 34, 50],
      ["BESTMAN", "125g Babylove jelly", 90, 150],
      ["BESTMAN", "500g Babylove jelly", 285, 400],
      ["BESTMAN", "Bamsi pink oil 65ml", 53, 100],
      ["BESTMAN", "Brazilian pink oil 65ml", 36, 70],
      ["BESTMAN", "500g Babylove jelly", 90, 400],
      ["BESTMAN", "50ml Bodyluxe glycerin", 34, 50],
      ["BESTMAN", "150ml Brazil nut shea butter", 135, 200],
      ["BESTMAN", "250ml Movit relaxer", 120, 200],
      ["BESTMAN", "100g Brazilian wool", 100, 200],
      ["BESTMAN", "150ml Bodyluxe glycerin", 53, 100],
      ["BESTMAN", "Brazilian body wax", 100, 400],
      ["BESTMAN", "470ml Morit sheen", 245, 300],
      ["BESTMAN", "250g Natural Fair", 65, 100],
      ["BESTMAN", "45ml Vaseline jelly (Men)", 75, 100],
      ["CYGRA", "Sandals (Net)", 250, 500],
      ["CYGRA", "Sandals", 200, 350],
      ["CYGRA", "Sandals", 300, 600],
      ["CYGRA", "Sandals", 300, 600],
      ["CYGRA", "Sandals", 180, 300],
      ["CYGRA", "Hermes sandals", 230, 500],
      ["CYGRA", "Dolly shoes", 280, 450],
      ["CYGRA", "Dolly (kamba)", 350, 600],
      ["CYGRA", "YCQ 218", 380, 650],
      ["CYGRA", "Gumboots (5-11)", 350, 500],
      ["CYGRA", "Gumboot toto", 250, 400],
      ["CYGRA", "Daisy boots", 350, 500],
      ["CYGRA", "Gumboots (5-11)", 350, 500],
      ["CYGRA", "Toto boots 31-36", 180, 350],
      ["CYGRA", "Toto boots 25-30", 160, 300],
      ["CYGRA", "BL 157", 480, 750],
      ["CYGRA", "CAT", 240, 450],
      ["CYGRA", "YCQ 242", 380, 650],
      ["CYGRA", "Max", 170, 300],
      ["CYGRA", "Max", 150, 350],
      ["CYGRA", "Open", 500, 800],
      ["SUNRAYS", "140g Bamsi wax", 210, 300],
      ["SUNRAYS", "500g Babylove perfumed", 280, 400],
      ["SUNRAYS", "50ml Bodyluxe glycerin", 40, 70],
      ["SUNRAYS", "Dear Body", 280, 400],
      ["SUNRAYS", "135g Dove soap", 180, 250],
      ["SUNRAYS", "8-pack Mega Growth relaxer", 500, 750],
      ["SUNRAYS", "Soban", 40, 100],
      ["SUNRAYS", "Turmeric oil 300ml", 250, 350],
      ["SUNRAYS", "360ml Air fresheners", 150, 250],
      ["SUNRAYS", "400ml Amara cooling-gro", 240, 300],
      ["SUNRAYS", "200ml Amara Men", 120, 200],
      ["SUNRAYS", "500g Babycare", 225, 300],
      ["SUNRAYS", "400ml Amara Men", 210, 300],
      ["SUNRAYS", "100g Ballet Aloe vera", 120, 180],
      ["SUNRAYS", "500g Babylove antidandruff", 300, 400],
      ["SUNRAYS", "450ml Bamsi leave in", 175, 400],
      ["SUNRAYS", "250ml Bamsi leave in", 120, 250],
      ["SUNRAYS", "200g Bodylux cream", 60, 100],
      ["SUNRAYS", "50ml Bodyluxe glycerin", 40, 70],
      ["SUNRAYS", "500ml Methylated spirit", 90, 150],
      ["SUNRAYS", "Dr Rachel Niacinamide moisturizer", 250, 350],
      ["SUNRAYS", "Dr Rachel suncream", 250, 300],
      ["SUNRAYS", "Ideal Rose water", 120, 200],
      ["SUNRAYS", "Imperial leather soap", 95, 130],
      ["SUNRAYS", "100g Mega Growth leave in", 170, 250],
      ["SUNRAYS", "Miss Beauty scrub", 330, 500],
      ["SUNRAYS", "470ml Morit sheen spray", 245, 300],
      ["SUNRAYS", "360ml NIL Htn", 250, 350],
      ["SUNRAYS", "Nivea roll on 50ml", 140, 200],
      ["SUNRAYS", "Rexona roll on", 140, 200],
      ["SUNRAYS", "Sancho dye", 130, 200],
      ["SUNRAYS", "Venus hairfood 100g", 130, 200],
      ["SUNRAYS", "360ml NIL Htn", 245, 300],
      ["SUNRAYS", "25g Natural Fair", 65, 100],
      ["SUNRAYS", "45ml Vaseline jelly (Men)", 75, 100],
      ["SUNRAYS", "200ml Amara Htn", 120, 200],
      ["SUNRAYS", "400ml Amara Htn", 210, 300],
      ["SUNRAYS", "25g Arimis jelly", 20, 30],
      ["SUNRAYS", "80g Bamsi curl gel", 40, 80],
      ["SUNRAYS", "Bamsi shampoo 500ml", 100, 150],
      ["SUNRAYS", "5L Bamsi shampoo", 330, 450],
      ["SUNRAYS", "25ml Rexona Active", 135, 200],
      ["SUNRAYS", "200g Skala cream (papaya)", 75, 120],
      ["SUNRAYS", "50g Skala jelly", 25, 50],
      ["SUNRAYS", "95ml Vaseline jelly (Men)", 120, 200],
      ["SUNRAYS", "100ml Nivea soft glycerin", 160, 200],
      ["SUNRAYS", "Skala sprays", 75, 100], // Extrapolated from user list missing selling price
      ["SUNRAYS", "Bodyluxe sprays", 75, 100],
      ["JAMWAS", "Bottega earrings (big)", 35, 100],
      ["JAMWAS", "Wedding earrings (big)", 35, 100],
      ["JAMWAS", "Toe rings", 30, 100],
      ["JAMWAS", "Nose rings", 50, 100],
      ["JAMWAS", "Anklets", 30, 100],
      ["JAMWAS", "Small chunky earrings", 30, 50],
      ["JAMWAS", "MK earrings", 30, 50],
      ["JAMWAS", "Mood lipglass", 25, 50],
      ["JAMWAS", "Mousse", 200, 300],
      ["JAMWAS", "Dr Rachel moisturizer", 220, 350],
      ["JAMWAS", "120ml soothing gel", 140, 250],
      ["JAMWAS", "Exfoliating scrubs", 180, 300],
      ["JAMWAS", "260ml soothing gel", 220, 350],
      ["JAMWAS", "Davis eye pencil", 30, 50],
      ["JAMWAS", "Disaar shaving foam", 220, 300],
      ["JAMWAS", "160ml soothing gel", 170, 300],
      ["JAMWAS", "Crochet", 20, 70],
      ["JAMWAS", "Estelin sun cream", 250, 400],
      ["JAMWAS", "Kristina bands", 250, 350],
      ["JAMWAS", "Exfoliating scrub", 180, 300],
      ["JAMWAS", "Miss beauty scrub", 180, 250],
      ["JAMWAS", "85ml olive sheen", 140, 200],
      ["JAMWAS", "500ml massage oil", 270, 400],
      ["JAMWAS", "Olive mousse", 200, 300],
      ["JAMWAS", "Bonnets with rope", 100, 150],
      ["JAMWAS", "Neck rolls", 64, 150],
      ["JAMWAS", "59ml bodysplash", 110, 150],
      ["JAMWAS", "Matte lipgloss", 70, 150],
      ["JAMWAS", "Rice soaps", 70, 100],
      ["JAMWAS", "Green tea ponds", 180, 250],
      ["JAMWAS", "Sleek foundation", 60, 100],
      ["JAMWAS", "Sancho", 150, 200],
      ["JAMWAS", "Papaya Htn", 900, 1200],
      ["JAMWAS", "Kojie san soap", 90, 150],
      ["JAMWAS", "Lashes", 50, 100],
      ["JAMWAS", "Collagen serum", 300, 450],
      ["JAMWAS", "Shower roll on", 150, 200],
      ["JAMWAS", "Dear body (dark)", 280, 400],
      ["JAMWAS", "Licorie serum", 200, 350],
      ["JAMWAS", "Foot file", 120, 180],
      ["JAMWAS", "Licorie glow oil", 230, 450],
      ["JAMWAS", "Baby powder", 22, 40],
      ["JAMWAS", "3 in 1 comb", 30, 50],
      ["JAMWAS", "Skala jelly", 30, 50],
      ["JAMWAS", "Afrocare jelly", 60, 100],
      ["JAMWAS", "Hair clips", 50, 100],
      ["JAMWAS", "Moana clips", 50, 100],
      ["LUPPET", "Fluffy kinky - Long", 315, 450],
      ["LUPPET", "Fluffy kinky - 1/33 - L", 315, 450],
      ["LUPPET", "Fluffy kinky - 1 (Short)", 325, 450],
      ["LUPPET", "Cute curls", 490, 700],
      ["SO NICE", "Caro light (big)", 350, 500],
      ["SO NICE", "Peau claire", 160, 200],
      ["SO NICE", "Miss caroline", 250, 300],
      ["SO NICE", "Chandni", 220, 350],
      ["SO NICE", "Dodo", 200, 300],
      ["SO NICE", "Pawpaw", 160, 250],
      ["SO NICE", "Caro light", 250, 350],
      ["JAZI TRADERS", "Licorie fac wash", 180, 300],
      ["JAZI TRADERS", "Glow body oils", 200, 450],
      ["LINBON", "Baby powder", 22, 40],
      ["LINBON", "3 in 1 comb", 30, 50],
      ["LINBON", "Skala jelly", 30, 50],
      ["LINBON", "Afrocare jelly", 60, 100],
      ["LINBON", "Hair clips", 50, 100],
      ["LINBON", "Moana clips", 50, 100],
      ["MOFRA", "Magic lip gloss", 25, 50],
      ["MOFRA", "170g skin touch", 200, 300],
      ["MOFRA", "Dear body (Days)", 300, 400],
      ["SUNRAYS", "Mini wipers", 25, 50],
      ["SUNRAYS", "Pocket tissues", 16, 30]
    ];

    try {
      const existingSuppliers = await db.suppliers.toArray();
      const existingSupplierNames = new Set(existingSuppliers.map(s => s.name));

      // Extract unique suppliers from rawData
      const newSuppliers = Array.from(new Set(rawData.map(row => row[0] as string)))
        .filter(name => !existingSupplierNames.has(name))
        .map(name => ({
          name,
          createdAt: Date.now()
        }));
      
      if (newSuppliers.length > 0) {
        await db.suppliers.bulkAdd(newSuppliers);
      }

      // Create products
      const newProducts = rawData.map(row => {
        const sup = row[0] as string;
        const name = row[1] as string;
        const cp = row[2] as number;
        const sp = row[3] as number;

        return {
          sku: 'SKU-' + Date.now() + Math.floor(Math.random() * 1000000),
          barcode: '',
          name: name,
          brand: '',
          category: 'General',
          subcategory: '',
          variant: '',
          shadeHex: '#b76e79',
          skinTypes: [],
          concerns: [],
          tags: [],
          ingredients: '',
          batchNumber: '',
          manufacturingDate: '',
          expiryDate: '',
          costPrice: cp,
          sellingPrice: sp,
          stockQuantity: 0,
          testerQuantity: 0,
          supplier: sup,
          imageUrl: '',
          notes: 'Auto-imported',
          lowStockThreshold: 5,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
      });

      await db.products.bulkAdd(newProducts);
      
      // Force an immediate push to cloud to prevent background sync from deleting offline imports
      try {
        const { pushAllProductsToSupabase } = await import('../services/supabase');
        await pushAllProductsToSupabase();
      } catch (err) {
        console.warn('Failed to instantly push imported products to cloud:', err);
      }

      alert('Import successful! Added ' + newProducts.length + ' products.');
    } catch (e) {
      console.error(e);
      alert('Error during import. See console.');
    }
  };

  return (
    <div className="p-4 md:p-6 bg-secondary/30 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Suppliers & Restocking</h1>
            <p className="text-gray-500">Manage vendors and generate low-stock order lists.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleBulkImport}
              className="px-4 py-2 bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-lg text-sm font-medium"
            >
              Run Initial Data Import
            </button>
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
            >
              <Plus className="w-5 h-5" />
              <span>Add Supplier</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Suppliers List */}
          <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 border-b pb-2">Your Suppliers</h2>
            
            {suppliers.length === 0 ? (
              <p className="text-gray-500 text-center py-6">No suppliers found. Add one or run the import.</p>
            ) : (
              <div className="space-y-2">
                {suppliers.map(supplier => (
                  <div 
                    key={supplier.id}
                    onClick={() => setSelectedSupplierId(supplier.id!)}
                    className={`p-3 rounded-lg cursor-pointer border transition-colors flex justify-between items-center ${
                      selectedSupplierId === supplier.id ? 'bg-primary/5 border-primary/20' : 'bg-white hover:bg-gray-50 border-gray-100'
                    }`}
                  >
                    <div>
                      <h3 className={`font-medium ${selectedSupplierId === supplier.id ? 'text-primary' : 'text-gray-900'}`}>
                        {supplier.name}
                      </h3>
                      {supplier.phone && <p className="text-xs text-gray-500 mt-1">{supplier.phone}</p>}
                    </div>
                    <div className="flex gap-1">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleOpenModal(supplier); }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 rounded-md hover:bg-blue-50"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDelete(supplier.id!); }}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Restocking Dashboard */}
          <div className="lg:col-span-2 space-y-6">
            {selectedSupplier ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full">
                <div className="p-5 border-b border-gray-100 flex flex-wrap justify-between items-center gap-4 bg-gray-50/50">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{selectedSupplier.name}</h2>
                    <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                      <Package className="w-4 h-4" /> 
                      Total Products: {supplierProducts.length}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowProductForm(true)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white hover:bg-primary/90 rounded-lg text-sm font-medium transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add Product
                    </button>
                    <button
                      onClick={downloadCSV}
                      disabled={lowStockProducts.length === 0}
                      className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Download className="w-4 h-4" />
                      CSV
                    </button>
                    <button
                      onClick={downloadPDF}
                      disabled={lowStockProducts.length === 0}
                      className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white hover:bg-green-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Download className="w-4 h-4" />
                      Generate PDF Order
                    </button>
                  </div>
                </div>

                <div className="p-5">
                  <h3 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-500" />
                    Low Stock Alert ({lowStockProducts.length})
                  </h3>

                  {lowStockProducts.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                      <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No products need restocking from this supplier right now.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50 text-gray-700 uppercase font-medium">
                          <tr>
                            <th className="px-4 py-3 rounded-tl-lg">Product</th>
                            <th className="px-4 py-3">Cost Price</th>
                            <th className="px-4 py-3">Stock</th>
                            <th className="px-4 py-3 rounded-tr-lg">Reorder Target</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {lowStockProducts.map(p => (
                            <tr key={p.id} className="hover:bg-gray-50/50">
                              <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                              <td className="px-4 py-3 text-gray-500">KES {p.costPrice.toLocaleString()}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.stockQuantity <= 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                  {p.stockQuantity}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-gray-400">{p.lowStockThreshold}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center h-full flex flex-col justify-center items-center">
                <Package className="w-12 h-12 text-gray-200 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">Select a Supplier</h3>
                <p className="text-gray-500">Choose a supplier from the list to view their products and generate restocking orders.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Supplier Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
            <h2 className="text-xl font-bold mb-4">{editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}</h2>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Name *</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Product Form (pre-filled with selected supplier) */}
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
