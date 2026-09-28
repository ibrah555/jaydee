import { useEffect, useMemo, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Search, Camera, Plus, ShoppingBag, Trash2, CheckCircle2, ShoppingCart, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProductStore } from '../stores/product';
import { useCartStore } from '../stores/cart';
import { useTransactionStore } from '../stores/transaction';
import { useAuthStore } from '../stores/auth';
import { useShiftStore } from '../stores/shift';
import { db, Product, ProductVariant } from '../db/schema';
import { pushProductToSupabase } from '../services/supabase';
import ShiftManagement from '../components/ShiftManagement';
import ReceiptModal from '../components/ReceiptModal';

const SUPPORTED_BARCODE_FORMATS = [
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.CODABAR,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.QR_CODE
];

export default function Sale() {
  const { products, loadProducts } = useProductStore();
  const { items, subtotal, total, addItem, removeItem, updateQuantity, applyDiscountPercent, clearCart } = useCartStore();
  const { saveTransaction, loadTransactions, currentTransaction } = useTransactionStore();
  const { user, signOut } = useAuthStore();
  const { activeShift } = useShiftStore();
  const navigate = useNavigate();

  const [manualCode, setManualCode] = useState('');
  const [scanStatus, setScanStatus] = useState('Point camera at barcode or scan with handheld scanner');
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mobile_money' | 'bank_transfer'>('cash');
  const [cashReceived, setCashReceived] = useState('');
  const [message, setMessage] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);

  // Variant modal selector states
  const [variantSelectorProduct, setVariantSelectorProduct] = useState<Product | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScanRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });
  const scannerId = 'html5qr-scanner';

  const handleLogout = () => {
    signOut();
    navigate('/login');
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // Hardware USB/Bluetooth barcode scanner global listener
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement;
      const isInput = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');

      const now = Date.now();
      const diff = now - lastKeyTime;
      lastKeyTime = now;

      if (e.key === 'Enter') {
        if (buffer.length >= 3 && !isInput) {
          e.preventDefault();
          handleBarcodeScan(buffer);
          buffer = '';
        } else {
          buffer = '';
        }
        return;
      }

      if (e.key.length === 1) {
        if (diff > 80) {
          buffer = e.key;
        } else {
          buffer += e.key;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [products]);

  // Camera Barcode Scanner
  useEffect(() => {
    if (!activeShift) return;

    try {
      const scanner = new Html5Qrcode(scannerId, {
        formatsToSupport: SUPPORTED_BARCODE_FORMATS,
        verbose: false
      });
      scannerRef.current = scanner;

      const qrbox = (viewfinderWidth: number, viewfinderHeight: number) => {
        const width = Math.floor(Math.min(viewfinderWidth * 0.88, 360));
        const height = Math.floor(Math.min(viewfinderHeight * 0.5, 180));
        return { width, height };
      };

      scanner
        .start(
          { facingMode: 'environment' },
          {
            fps: 15,
            qrbox,
            aspectRatio: 1.777778,
            experimentalFeatures: { useBarCodeDetectorIfSupported: true }
          } as any,
          async (decodedText) => {
            handleBarcodeScan(decodedText);
          },
          () => {
            // scanning loop continuous
          }
        )
        .catch(() => {
          setScanStatus('Camera scanner offline (use search or USB scanner)');
        });
    } catch {
      setScanStatus('Camera unavailable');
    }

    return () => {
      if (scannerRef.current) {
        (scannerRef.current.stop() as any)
          .catch(() => undefined)
          .finally(() => {
            (scannerRef.current?.clear() as any).catch(() => undefined);
          });
      }
    };
  }, [activeShift]);

  const foundProducts = useMemo(
    () => products.filter((product) => {
      if (!manualCode.trim()) return false;
      const query = manualCode.toLowerCase().trim();
      return (
        product.name.toLowerCase().includes(query) ||
        product.brand.toLowerCase().includes(query) ||
        (product.sku && product.sku.toLowerCase().includes(query)) ||
        (product.barcode && product.barcode.toLowerCase().includes(query))
      );
    }),
    [manualCode, products]
  );

  const handleBarcodeScan = async (barcode: string) => {
    const clean = barcode.trim();
    if (!clean) return;

    // Cooldown throttle: ignore duplicate scans within 1.5 seconds
    const now = Date.now();
    if (lastScanRef.current.code === clean && now - lastScanRef.current.time < 1500) {
      return;
    }
    lastScanRef.current = { code: clean, time: now };

    const cleanNoSpace = clean.replace(/\s+/g, '');

    // 1. Check parent barcode or SKU
    let product = products.find((item) => {
      const b = (item.barcode || '').trim();
      const s = (item.sku || '').trim();
      return b === clean || s === clean || b.replace(/\s+/g, '') === cleanNoSpace;
    });
    
    // 2. Check sub-variant barcodes
    if (!product) {
      for (const p of products) {
        if (p.variants) {
          const v = p.variants.find((vr) => {
            const vb = (vr.barcode || '').trim();
            return vb === clean || vb.replace(/\s+/g, '') === cleanNoSpace;
          });
          if (v) {
            const res = addItem(p, 1, v);
            if (!res.success && res.message) {
              setScanStatus(res.message);
              setMessage(res.message);
              return;
            }
            setScanStatus(`Scanned: ${p.name} (${v.name})`);
            playSuccessSound();
            return;
          }
        }
      }
    }

    if (!product) {
      setScanStatus(`Barcode not recognized: ${clean}`);
      return;
    }

    // If product has variants, trigger selector
    if (product.variants && product.variants.length > 0) {
      setVariantSelectorProduct(product);
    } else {
      const res = addItem(product, 1);
      if (!res.success && res.message) {
        setScanStatus(res.message);
        setMessage(res.message);
        return;
      }
      setScanStatus(`Scanned: ${product.name}`);
      playSuccessSound();
    }
  };

  const playSuccessSound = () => {
    try {
      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = 880;
      gain.gain.value = 0.12;
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      setTimeout(() => {
        oscillator.stop();
        context.close();
      }, 100);
    } catch {
      // ignore browser restriction
    }
  };

  const handleSelectProduct = (product: Product) => {
    if (product.variants && product.variants.length > 0) {
      setVariantSelectorProduct(product);
    } else {
      const res = addItem(product, 1);
      if (!res.success && res.message) {
        setMessage(res.message);
        return;
      }
      playSuccessSound();
    }
  };

  const handleManualAdd = () => {
    const value = manualCode.trim();
    if (!value) return;
    const product = products.find((item) => item.barcode === value || item.sku === value || item.name.toLowerCase() === value.toLowerCase());
    if (!product) {
      setScanStatus(`No product found for ${value}`);
      return;
    }

    handleSelectProduct(product);
    setManualCode('');
  };

  const handleCompleteSale = async () => {
    if (items.length === 0) {
      setMessage('Add items to the cart before checkout.');
      return;
    }

    if (!activeShift) return;

    // Check stock for all items prior to completing transaction
    for (const cartItem of items) {
      const product = await db.products.get(cartItem.productId);
      if (!product) {
        setMessage(`Product "${cartItem.name}" no longer exists in catalog.`);
        return;
      }

      let available = product.stockQuantity;
      if (cartItem.variantId && product.variants) {
        const v = product.variants.find(vr => vr.id === cartItem.variantId);
        if (v) available = v.stockQuantity;
      }

      if (available < cartItem.quantity) {
        setMessage(`Cannot complete sale: Only ${available} units of "${cartItem.name}" available in stock (Cart has ${cartItem.quantity}).`);
        return;
      }
    }

    if (paymentMethod === 'cash') {
      const cash = Number(cashReceived);
      if (isNaN(cash) || cash < total) {
        setMessage('Enter amount received that covers the total.');
        return;
      }
    }

    const paymentDetails: Record<string, unknown> = { cashReceived: Number(cashReceived) || undefined };
    if (paymentMethod === 'cash') {
      paymentDetails.change = Math.round((Number(cashReceived) - total) * 100) / 100;
    }
    if (paymentMethod === 'mobile_money') {
      paymentDetails.mobileMoneyProvider = 'M-Pesa';
    }
    if (paymentMethod === 'bank_transfer') {
      paymentDetails.bankReference = 'Manual';
    }

    // Save with shiftId link
    await saveTransaction(
      items.map((item) => ({
        productId: item.productId,
        productName: item.name,
        shade: item.shadeHex,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        costPrice: item.costPrice,
        batchNumber: '',
        variantId: item.variantId
      })),
      discount,
      0,
      paymentMethod,
      paymentDetails,
      user?.id || 'unknown',
      user?.name || 'Cashier',
      activeShift.id // Shift reference
    );

    // Update stock levels (supporting variants) & push to Supabase cloud
    await Promise.all(
      items.map(async (cartItem) => {
        const product = await db.products.get(cartItem.productId);
        if (!product) return;

        let nextStock = product.stockQuantity;
        let nextVariants = product.variants;

        if (cartItem.variantId && product.variants) {
          nextVariants = product.variants.map(v => {
            if (v.id === cartItem.variantId) {
              return { ...v, stockQuantity: Math.max(0, v.stockQuantity - cartItem.quantity) };
            }
            return v;
          });
          nextStock = Math.max(0, product.stockQuantity - cartItem.quantity);
          await db.products.update(product.id!, { 
            variants: nextVariants, 
            stockQuantity: nextStock,
            updatedAt: Date.now() 
          });
        } else {
          nextStock = Math.max(0, product.stockQuantity - cartItem.quantity);
          await db.products.update(product.id!, { 
            stockQuantity: nextStock,
            updatedAt: Date.now() 
          });
        }

        // Record inventory audit log
        await db.inventoryLog.add({
          productId: product.id!,
          type: 'sale',
          quantityChange: -cartItem.quantity,
          previousQuantity: product.stockQuantity,
          newQuantity: nextStock,
          userId: Number(user?.id) || 1,
          createdAt: Date.now()
        });

        // Immediately push updated stock to Supabase so other devices update
        const refreshedProduct = await db.products.get(product.id!);
        if (refreshedProduct) {
          pushProductToSupabase(refreshedProduct).catch(() => undefined);
        }
      })
    );

    await loadTransactions();
    await loadProducts();

    clearCart();
    setMessage('Sale completed successfully.');
    setShowReceipt(true); // Open modal automatically
  };

  return (
    <div className="space-y-6 p-4 md:p-6 pb-12">
      {/* Enforce register opening float limit */}
      <ShiftManagement />

      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Checkout</span>
          <h1 className="text-2xl md:text-3xl font-bold text-accent">Cart & Scanner</h1>
        </div>
        {user?.role === 'cashier' && (
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold px-4 py-2.5 transition self-start sm:self-auto text-sm"
          >
            <LogOut className="w-4 h-4 text-slate-500" />
            Sign Out
          </button>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Scanner, Search and Results */}
        <div className="lg:col-span-7 space-y-6">
          {/* Scanner */}
          <div className="rounded-3xl bg-white p-5 shadow-sm border border-slate-100">
            <div id={scannerId} className="h-64 rounded-2xl bg-slate-900 overflow-hidden relative" />
            <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-500">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 border border-slate-100 px-3 py-1.5 text-slate-600 font-medium">
                <Camera className="h-3.5 w-3.5" />
                {scanStatus}
              </div>
              <div>{items.length} items in checkout</div>
            </div>
          </div>

          {/* Search bar */}
          <div className="rounded-3xl bg-white p-5 shadow-sm border border-slate-100 space-y-4">
            <h3 className="font-semibold text-slate-800 text-sm">Product Search</h3>
            <div className="relative">
              <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, brand, SKU or barcode..."
                value={manualCode}
                onChange={e => setManualCode(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleManualAdd()}
                className="w-full h-12 pl-12 pr-4 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-sm"
              />
            </div>

            {/* Quick search suggestions */}
            {foundProducts.length > 0 && (
              <div className="border border-slate-100 rounded-2xl divide-y divide-slate-50 max-h-56 overflow-y-auto bg-slate-50/50">
                {foundProducts.map(p => {
                  const isOutOfStock = p.stockQuantity <= 0;
                  return (
                    <button
                      key={p.id}
                      onClick={() => handleSelectProduct(p)}
                      disabled={isOutOfStock}
                      className={`w-full p-3 flex items-center justify-between text-left hover:bg-white transition text-sm ${
                        isOutOfStock ? 'opacity-50 cursor-not-allowed bg-rose-50/20' : ''
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800">{p.name}</span>
                          {isOutOfStock ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                              OUT OF STOCK
                            </span>
                          ) : p.stockQuantity <= 5 ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                              Low Stock: {p.stockQuantity}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500 font-medium">
                              ({p.stockQuantity} in stock)
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{p.brand} · SKU: {p.sku}</p>
                      </div>
                      <span className="text-accent font-bold">KES {p.sellingPrice.toLocaleString()}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Cart Summary & Checkout */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-3xl bg-white p-5 shadow-sm border border-slate-100 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-accent text-lg flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Receipt Items
              </h3>
              {items.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-xs font-semibold text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl transition"
                >
                  Clear Cart
                </button>
              )}
            </div>

            {/* Cart Items List */}
            <div className="space-y-3 max-h-96 overflow-y-auto mb-4 pr-1">
              {items.length === 0 ? (
                <div className="py-12 border border-dashed border-slate-200 rounded-2xl text-center text-sm text-slate-400">
                  Scan barcode or search for items to begin checkout.
                </div>
              ) : (
                items.map((item, idx) => (
                  <div key={idx} className="bg-slate-50/60 border border-slate-100 p-3.5 rounded-2xl space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-sm text-slate-800">{item.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-slate-400">SKU: {item.sku}</span>
                          {item.maxStock !== undefined && (
                            <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              Max: {item.maxStock}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => removeItem(item.productId, item.variantId)}
                        className="p-1 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-500 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 bg-white border border-slate-100 rounded-xl px-2 py-1 shadow-sm">
                        <button
                          onClick={() => updateQuantity(item.productId, item.variantId, item.quantity - 1)}
                          className="w-7 h-7 flex items-center justify-center font-bold text-slate-500 hover:bg-slate-50 rounded-lg"
                        >
                          -
                        </button>
                        <span className="text-sm font-semibold w-5 text-center text-slate-800">{item.quantity}</span>
                        <button
                          onClick={() => {
                            const res = updateQuantity(item.productId, item.variantId, item.quantity + 1, item.maxStock);
                            if (!res.success && res.message) {
                              setMessage(res.message);
                            }
                          }}
                          className="w-7 h-7 flex items-center justify-center font-bold text-slate-500 hover:bg-slate-50 rounded-lg"
                        >
                          +
                        </button>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-slate-400 block">KES {item.unitPrice.toLocaleString()} each</span>
                        <span className="font-bold text-sm text-slate-900">KES {item.totalPrice.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Totals */}
            <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-sm text-slate-600 mb-4">
              <div className="flex justify-between"><span>Subtotal</span><span>KES {subtotal.toLocaleString()}</span></div>
              <div className="flex justify-between items-center">
                <span>Discount %</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={discount}
                  onChange={e => {
                    const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                    setDiscount(val);
                    applyDiscountPercent(val);
                  }}
                  className="w-16 h-8 text-center rounded-lg border border-slate-200 outline-none focus:ring-1 focus:ring-accent font-semibold text-slate-800"
                />
              </div>

              <hr className="border-slate-200/60" />
              <div className="flex justify-between text-lg font-bold text-slate-900">
                <span>Total</span>
                <span className="text-accent">KES {total.toLocaleString()}</span>
              </div>
            </div>

            {/* Payment & Submit */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Method
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value as any)}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm font-semibold outline-none focus:border-accent"
                  >
                    <option value="cash">Cash</option>
                    <option value="mobile_money">M-Pesa</option>
                    <option value="bank_transfer">Card / Bank</option>
                  </select>
                </label>
                <label className="space-y-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Cash Received
                  <input
                    type="number"
                    value={cashReceived}
                    onChange={e => setCashReceived(e.target.value)}
                    disabled={paymentMethod !== 'cash'}
                    placeholder="0.00"
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm font-semibold outline-none disabled:opacity-50 focus:border-accent"
                  />
                </label>
              </div>

              {paymentMethod === 'cash' && cashReceived && parseFloat(cashReceived) >= total && (
                <div className="bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-xl px-4 py-2.5 flex justify-between text-sm font-semibold">
                  <span>Change:</span>
                  <span>KES {(parseFloat(cashReceived) - total).toLocaleString()}</span>
                </div>
              )}

              <button
                onClick={handleCompleteSale}
                disabled={items.length === 0}
                className="w-full h-14 bg-accent hover:bg-purple-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition shadow-lg shadow-accent/15 disabled:opacity-50 disabled:shadow-none"
              >
                <CheckCircle2 className="w-5 h-5" />
                Complete Transaction
              </button>
            </div>

            {message && (
              <div className="mt-4 p-3.5 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl text-center text-sm font-semibold">
                {message}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Variant Selector dialog popup */}
      {variantSelectorProduct && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold text-slate-900 mb-1">{variantSelectorProduct.name}</h3>
            <p className="text-slate-500 text-sm mb-4">Select the specific product variant / shade:</p>

            <div className="space-y-2.5 max-h-64 overflow-y-auto mb-6 pr-1">
              {variantSelectorProduct.variants?.map((v) => (
                <button
                  key={v.id}
                  onClick={() => {
                    const res = addItem(variantSelectorProduct, 1, v);
                    if (!res.success && res.message) {
                      setMessage(res.message);
                      return;
                    }
                    setVariantSelectorProduct(null);
                    playSuccessSound();
                  }}
                  disabled={v.stockQuantity <= 0}
                  className="w-full p-3 rounded-xl border border-slate-200 flex items-center justify-between text-left hover:border-accent hover:bg-slate-50/50 transition disabled:opacity-40"
                >
                  <div className="flex items-center gap-2.5">
                    {v.shadeHex && (
                      <span className="w-5 h-5 rounded-full border border-slate-300" style={{ backgroundColor: v.shadeHex }} />
                    )}
                    <div>
                      <span className="font-semibold text-slate-800 text-sm">{v.name}</span>
                      <p className="text-xs text-slate-400 mt-0.5">{v.stockQuantity} in stock</p>
                    </div>
                  </div>
                  <span className="font-bold text-accent text-sm">KES {v.sellingPrice.toLocaleString()}</span>
                </button>
              ))}
            </div>

            <button
              onClick={() => setVariantSelectorProduct(null)}
              className="w-full h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Receipts Popup */}
      {showReceipt && currentTransaction && (
        <ReceiptModal
          transaction={currentTransaction}
          onClose={() => {
            setShowReceipt(false);
            setMessage('');
          }}
        />
      )}
    </div>
  );
}
