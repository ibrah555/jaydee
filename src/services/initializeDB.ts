// Initialize demo users and data in the database
import { db, Product, Transaction, TransactionItem } from '../db/schema';
import { hashPassword } from '../services/password';

export async function initializeDemoUsers() {
  try {
    // Check if users already exist
    const userCount = await db.users.count();
    if (userCount > 0) return;

    // Create demo superadmin user
    const superadminPassword = await hashPassword('superadmin123');
    await db.users.add({
      username: 'admin',
      email: 'admin@jaydee.com',
      name: 'Super Admin',
      phone: '+1234567890',
      passwordHash: superadminPassword,
      role: 'superadmin',
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    // Create demo cashier user
    const cashierPassword = await hashPassword('cashier123');
    await db.users.add({
      username: 'demo',
      email: 'cashier@jaydee.com',
      name: 'Demo Cashier',
      phone: '+1987654321',
      passwordHash: cashierPassword,
      role: 'cashier',
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    console.log('Demo users initialized');
    console.log('Superadmin: username=admin, password=superadmin123');
    console.log('Cashier: username=demo, password=cashier123');
  } catch (error) {
    console.error('Failed to initialize demo users:', error);
  }
}

export async function initializeDemoProducts() {
  try {
    // Check if products already exist
    const productCount = await db.products.count();
    if (productCount > 0) return;

    const now = Date.now();
    const demoProducts: Product[] = [
      {
        sku: 'SKU001',
        barcode: '8012345678900',
        name: 'Rose Face Cream',
        brand: 'Beauty Botanicals',
        category: 'Skincare',
        subcategory: 'Face Creams',
        variant: 'Rose',
        shadeHex: '#FFB6C1',
        skinTypes: ['dry', 'sensitive'],
        concerns: ['anti-aging', 'hydration'],
        tags: ['organic', 'natural'],
        ingredients: 'Rose extract, Shea butter, Vitamin C',
        batchNumber: 'BATCH001',
        manufacturingDate: new Date(now - 60 * 24 * 60 * 60 * 1000).toISOString(),
        expiryDate: new Date(now + 300 * 24 * 60 * 60 * 1000).toISOString(),
        costPrice: 500,
        sellingPrice: 1200,
        stockQuantity: 45,
        testerQuantity: 5,
        supplier: 'Beauty Imports Ltd',
        imageUrl: '',
        notes: 'Best seller in Q1',
        lowStockThreshold: 20,
        createdAt: now,
        updatedAt: now
      },
      {
        sku: 'SKU002',
        barcode: '8012345678901',
        name: 'Vitamin C Serum',
        brand: 'Glow Labs',
        category: 'Skincare',
        subcategory: 'Serums',
        variant: 'Brightening',
        shadeHex: '#FFD700',
        skinTypes: ['all'],
        concerns: ['brightening', 'spots'],
        tags: ['vegan', 'cruelty-free'],
        ingredients: 'Vitamin C, Ferulic Acid, Hyaluronic Acid',
        batchNumber: 'BATCH002',
        manufacturingDate: new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString(),
        expiryDate: new Date(now + 200 * 24 * 60 * 60 * 1000).toISOString(),
        costPrice: 800,
        sellingPrice: 2500,
        stockQuantity: 12,
        testerQuantity: 3,
        supplier: 'Glow Labs Distribution',
        imageUrl: '',
        notes: 'High demand item',
        lowStockThreshold: 15,
        createdAt: now,
        updatedAt: now
      },
      {
        sku: 'SKU003',
        barcode: '8012345678902',
        name: 'Honey Face Wash',
        brand: 'Nature Pure',
        category: 'Skincare',
        subcategory: 'Cleansers',
        variant: 'Original',
        shadeHex: '#F5DEB3',
        skinTypes: ['normal', 'oily'],
        concerns: ['cleansing', 'acne'],
        tags: ['natural', 'organic'],
        ingredients: 'Honey, Tea Tree Oil, Aloe Vera',
        batchNumber: 'BATCH003',
        manufacturingDate: new Date(now - 45 * 24 * 60 * 60 * 1000).toISOString(),
        expiryDate: new Date(now + 350 * 24 * 60 * 60 * 1000).toISOString(),
        costPrice: 250,
        sellingPrice: 650,
        stockQuantity: 78,
        testerQuantity: 10,
        supplier: 'Nature Pure Inc',
        imageUrl: '',
        notes: 'Entry-level product',
        lowStockThreshold: 30,
        createdAt: now,
        updatedAt: now
      }
    ];

    await db.products.bulkAdd(demoProducts);
    console.log('Demo products initialized:', demoProducts.length);
  } catch (error) {
    console.error('Failed to initialize demo products:', error);
  }
}

export async function initializeDemoTransactions() {
  try {
    // Check if transactions already exist
    const transactionCount = await db.transactions.count();
    if (transactionCount > 0) return;

    const now = Date.now();
    const demoTransactions: Transaction[] = [
      {
        transactionId: 'TXN-001',
        items: [
          {
            productId: 1,
            productName: 'Rose Face Cream',
            shade: 'Rose',
            quantity: 2,
            unitPrice: 1200,
            totalPrice: 2400,
            batchNumber: 'BATCH001'
          }
        ],
        subtotal: 2400,
        taxAmount: 240,
        discountAmount: 0,
        total: 2640,
        paymentMethod: 'cash',
        paymentDetails: { notes: 'customer paid exact' },
        cashierId: 'u4',
        cashierName: 'Demo User',
        status: 'completed',
        syncStatus: 'synced',
        createdAt: now - 3 * 24 * 60 * 60 * 1000
      },
      {
        transactionId: 'TXN-002',
        items: [
          {
            productId: 2,
            productName: 'Vitamin C Serum',
            shade: 'Brightening',
            quantity: 1,
            unitPrice: 2500,
            totalPrice: 2500,
            batchNumber: 'BATCH002'
          },
          {
            productId: 3,
            productName: 'Honey Face Wash',
            shade: 'Original',
            quantity: 1,
            unitPrice: 650,
            totalPrice: 650,
            batchNumber: 'BATCH003'
          }
        ],
        subtotal: 3150,
        taxAmount: 315,
        discountAmount: 100,
        total: 3365,
        paymentMethod: 'card',
        paymentDetails: { cardLast4: '4242' },
        cashierId: 'u4',
        cashierName: 'Demo User',
        status: 'completed',
        syncStatus: 'synced',
        createdAt: now - 2 * 24 * 60 * 60 * 1000
      },
      {
        transactionId: 'TXN-003',
        items: [
          {
            productId: 1,
            productName: 'Rose Face Cream',
            shade: 'Rose',
            quantity: 3,
            unitPrice: 1200,
            totalPrice: 3600,
            batchNumber: 'BATCH001'
          }
        ],
        subtotal: 3600,
        taxAmount: 360,
        discountAmount: 360,
        total: 3600,
        paymentMethod: 'mpesa',
        paymentDetails: { phone: '254712345678' },
        cashierId: 'u4',
        cashierName: 'Demo User',
        status: 'completed',
        syncStatus: 'synced',
        createdAt: now - 1 * 24 * 60 * 60 * 1000
      }
    ];

    await db.transactions.bulkAdd(demoTransactions);
    console.log('Demo transactions initialized:', demoTransactions.length);
  } catch (error) {
    console.error('Failed to initialize demo transactions:', error);
  }
}
