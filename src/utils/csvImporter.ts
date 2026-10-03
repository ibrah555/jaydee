import { db, Product } from '../db/schema';
import { pushAllProductsToSupabase } from '../services/supabase';

export interface ImportResult {
  totalProcessed: number;
  addedCount: number;
  restockedCount: number;
  suppliersAdded: number;
  errors: string[];
}

/**
 * Robust CSV parser that handles quoted cells, commas, semicolons, tabs, and multiline values.
 */
export function parseCSV(content: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  // Normalize line endings
  const cleanContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Detect delimiter from first line (comma, semicolon, or tab)
  const firstLine = cleanContent.split('\n')[0] || '';
  let delimiter = ',';
  if ((firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length) {
    delimiter = ';';
  } else if ((firstLine.match(/\t/g) || []).length > (firstLine.match(/,/g) || []).length) {
    delimiter = '\t';
  }

  for (let i = 0; i < cleanContent.length; i++) {
    const char = cleanContent[i];
    const nextChar = cleanContent[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if (char === '\n' && !inQuotes) {
      currentRow.push(currentCell.trim());
      if (currentRow.some(c => c.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some(c => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Downloads a sample template CSV that opens cleanly in Excel or Google Sheets.
 */
export function downloadSampleTemplate() {
  const headers = [
    'Supplier',
    'Product Name',
    'Brand',
    'Barcode',
    'Buying Price',
    'Selling Price',
    'Stock Quantity',
    'Reorder Target',
    'Manufacture Date',
    'Expiry Date'
  ];

  const sampleRows = [
    [
      'BESTMAN',
      '1L Bamsi conditioner',
      'Bamsi',
      '6181100536501',
      '143',
      '200',
      '10',
      '5',
      '2026-01-01',
      '2028-01-01'
    ],
    [
      'BESTMAN',
      '240g Bamsi curl gel',
      'Bamsi',
      '6181100536502',
      '95',
      '200',
      '15',
      '10',
      '2026-01-01',
      '2028-01-01'
    ],
    [
      'CYGRA',
      'Rose Water Soothing Toner 250ml',
      'Cygra',
      '6181100536503',
      '250',
      '380',
      '20',
      '8',
      '2026-02-15',
      '2028-02-15'
    ]
  ];

  const csvString = [
    headers.join(','),
    ...sampleRows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
  ].join('\r\n');

  const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', 'JayDee_Product_Import_Template.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Process and import spreadsheet data:
 * - Adds to existing balance if product already exists
 * - Creates new product if not present
 * - Auto-creates any new suppliers
 * - Syncs immediately with Supabase
 */
export async function importProductsFromCSV(fileContent: string): Promise<ImportResult> {
  const rows = parseCSV(fileContent);
  const result: ImportResult = {
    totalProcessed: 0,
    addedCount: 0,
    restockedCount: 0,
    suppliersAdded: 0,
    errors: []
  };

  if (rows.length < 2) {
    result.errors.push('File is empty or contains only a header.');
    return result;
  }

  // Find header indices
  const header = rows[0].map(h => h.toLowerCase().trim());
  const getIndex = (...aliases: string[]) => {
    return header.findIndex(h => aliases.some(alias => h.includes(alias)));
  };

  const supplierIdx = getIndex('supplier', 'vendor');
  const nameIdx = getIndex('product name', 'product', 'name', 'item');
  const brandIdx = getIndex('brand');
  const barcodeIdx = getIndex('barcode', 'upc', 'ean', 'code');
  const buyingPriceIdx = getIndex('buying price', 'cost price', 'buying_price', 'cost', 'buying');
  const sellingPriceIdx = getIndex('selling price', 'selling_price', 'price', 'retail', 'selling');
  const stockIdx = getIndex('stock quantity', 'stock', 'quantity', 'qty');
  const reorderIdx = getIndex('reorder target', 'reorder', 'target', 'low stock', 'threshold');
  const mfgDateIdx = getIndex('manufacture', 'manufacturing', 'mfg');
  const expDateIdx = getIndex('expiry', 'expire', 'exp');

  if (nameIdx === -1) {
    result.errors.push('Could not find a "Product Name" column in the header.');
    return result;
  }

  const existingProducts = await db.products.toArray();
  const existingSuppliers = await db.suppliers.toArray();
  const knownSuppliers = new Set(existingSuppliers.map(s => s.name.trim().toLowerCase()));

  // Map existing products by barcode and by lowercase trimmed name
  const byBarcode = new Map<string, Product>();
  const byName = new Map<string, Product>();
  existingProducts.forEach(p => {
    if (p.barcode && p.barcode.trim()) {
      byBarcode.set(p.barcode.trim().toLowerCase(), p);
    }
    if (p.name && p.name.trim()) {
      byName.set(p.name.trim().toLowerCase(), p);
    }
  });

  const now = Date.now();

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const name = nameIdx !== -1 && row[nameIdx] ? row[nameIdx].trim() : '';
    if (!name) continue;

    result.totalProcessed++;

    const supplierName = supplierIdx !== -1 && row[supplierIdx] ? row[supplierIdx].trim() : 'General';
    const brand = brandIdx !== -1 && row[brandIdx] ? row[brandIdx].trim() : '';
    const barcode = barcodeIdx !== -1 && row[barcodeIdx] ? row[barcodeIdx].trim() : '';
    const costPrice = buyingPriceIdx !== -1 && row[buyingPriceIdx] ? Math.max(0, parseFloat(row[buyingPriceIdx].replace(/[^0-9.]/g, '')) || 0) : 0;
    const sellingPrice = sellingPriceIdx !== -1 && row[sellingPriceIdx] ? Math.max(0, parseFloat(row[sellingPriceIdx].replace(/[^0-9.]/g, '')) || 0) : 0;
    const incomingQty = stockIdx !== -1 && row[stockIdx] ? Math.max(0, parseInt(row[stockIdx].replace(/[^0-9]/g, '')) || 0) : 0;
    const reorderTarget = reorderIdx !== -1 && row[reorderIdx] ? Math.max(0, parseInt(row[reorderIdx].replace(/[^0-9]/g, '')) || 0) : 0;
    const mfgDate = mfgDateIdx !== -1 && row[mfgDateIdx] ? row[mfgDateIdx].trim() : '';
    const expDate = expDateIdx !== -1 && row[expDateIdx] ? row[expDateIdx].trim() : '';

    // Auto-create supplier if new
    if (supplierName && supplierName.toLowerCase() !== 'general' && !knownSuppliers.has(supplierName.toLowerCase())) {
      await db.suppliers.add({
        name: supplierName,
        createdAt: now,
        updatedAt: now
      });
      knownSuppliers.add(supplierName.toLowerCase());
      result.suppliersAdded++;
    }

    // Check if product already exists (by barcode match first, then by name)
    const existing = (barcode && byBarcode.get(barcode.toLowerCase())) || byName.get(name.toLowerCase());

    if (existing && existing.id) {
      // PRODUCT ALREADY IN SYSTEM: Add incoming quantity to existing balance
      const newStock = (existing.stockQuantity || 0) + incomingQty;
      const updatedFields: Partial<Product> = {
        stockQuantity: newStock,
        updatedAt: Date.now()
      };

      if (costPrice > 0) updatedFields.costPrice = costPrice;
      if (sellingPrice > 0) updatedFields.sellingPrice = sellingPrice;
      if (brand && !existing.brand) updatedFields.brand = brand;
      if (barcode && !existing.barcode) updatedFields.barcode = barcode;
      if (supplierName && supplierName !== 'General') updatedFields.supplier = supplierName;
      if (reorderTarget > 0) updatedFields.lowStockThreshold = reorderTarget;
      if (mfgDate) updatedFields.manufacturingDate = mfgDate;
      if (expDate) updatedFields.expiryDate = expDate;

      await db.products.update(existing.id, updatedFields);

      // Update in-memory reference
      Object.assign(existing, updatedFields);
      result.restockedCount++;
    } else {
      // NEW PRODUCT: Create catalog entry
      const sku = `JD-${now.toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;
      const newProduct: Product = {
        sku,
        barcode: barcode || '',
        name,
        brand: brand || '',
        category: 'General',
        subcategory: '',
        variant: '',
        variants: [],
        shadeHex: '#b76e79',
        skinTypes: ['All'],
        concerns: [],
        tags: [],
        ingredients: '',
        batchNumber: '',
        manufacturingDate: mfgDate,
        expiryDate: expDate,
        costPrice,
        sellingPrice: sellingPrice > 0 ? sellingPrice : costPrice * 1.3,
        stockQuantity: incomingQty,
        testerQuantity: 0,
        supplier: supplierName,
        imageUrl: '',
        notes: 'Imported via CSV/Excel',
        lowStockThreshold: reorderTarget > 0 ? reorderTarget : 0,
        createdAt: now,
        updatedAt: now
      };

      const newId = await db.products.add(newProduct);
      newProduct.id = newId;

      if (barcode) byBarcode.set(barcode.toLowerCase(), newProduct);
      byName.set(name.toLowerCase(), newProduct);
      result.addedCount++;
    }
  }

  // Sync all updates/additions to Supabase cloud immediately
  try {
    await pushAllProductsToSupabase();
  } catch (err) {
    console.warn('Background push to Supabase encountered issue:', err);
  }

  return result;
}
