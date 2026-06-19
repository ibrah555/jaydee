import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { Search, Camera, Plus, ShoppingBag, Trash2, CheckCircle2 } from 'lucide-react';
import { useProductStore } from '../stores/product';
import { useCartStore } from '../stores/cart';
import { useTransactionStore } from '../stores/transaction';
import { useAuthStore } from '../stores/auth';
import { db, Product } from '../db/schema';
import NavBar from '../components/NavBar';

export default function Sale() {
  const { products, loadProducts } = useProductStore();
  const { items, subtotal, taxTotal, total, addItem, removeItem, updateQuantity, applyDiscountPercent, clearCart } = useCartStore();
  const { saveTransaction, loadTransactions } = useTransactionStore();
  const { user } = useAuthStore();
  const [manualCode, setManualCode] = useState('');
  const [scanStatus, setScanStatus] = useState('Point camera at barcode');
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mobile_money' | 'bank_transfer'>('cash');
  const [cashReceived, setCashReceived] = useState('');
  const [message, setMessage] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerId = 'html5qr-scanner';

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    const scanner = new Html5Qrcode(scannerId);
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 260, experimentalFeatures: { useBarCodeDetectorIfSupported: true } } as any,
        async (decodedText) => {
          handleBarcodeScan(decodedText);
        },
        (error) => {
          if (error) {
            setScanStatus('Scanning...');
          }
        }
      )
      .catch(() => {
        setScanStatus('Camera access denied or unavailable');
      });

    return () => {
      (scanner.stop() as any)
        .catch(() => undefined)
        .finally(() => {
          (scanner.clear() as any).catch(() => undefined);
        });
    };
  }, []);

  const foundProducts = useMemo(
    () => products.filter((product) => {
      if (!manualCode.trim()) return true;
      const query = manualCode.toLowerCase();
      return (
        product.name.toLowerCase().includes(query) ||
        product.brand.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query) ||
        product.barcode.toLowerCase().includes(query)
      );
    }),
    [manualCode, products]
  );

  const handleBarcodeScan = async (barcode: string) => {
    const product = products.find((item) => item.barcode === barcode || item.sku === barcode);
    if (!product) {
      setScanStatus(`Not found: ${barcode}`);
      return;
    }

    addItem(product, 1);
    setScanStatus(`Added ${product.name}`);
    window.navigator.vibrate?.(50);
    playSuccessSound();
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
      // ignore browser audio restrictions
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

    addItem(product, 1);
    setManualCode('');
    setScanStatus(`Added ${product.name}`);
    window.navigator.vibrate?.(50);
    playSuccessSound();
  };

  const handleCompleteSale = async () => {
    if (items.length === 0) {
      setMessage('Add items to the cart before checkout.');
      return;
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

    await saveTransaction(
      items.map((item) => ({
        productId: item.productId,
        productName: item.name,
        shade: item.shadeHex,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        batchNumber: ''
      })),
      discount,
      16,
      paymentMethod,
      paymentDetails,
      user?.id || 'unknown',
      user?.name || 'Cashier',
      undefined
    );

    await Promise.all(
      items.map(async (cartItem) => {
        const product = products.find((item) => item.id === cartItem.productId);
        if (!product) return;
        const nextStock = Math.max(0, product.stockQuantity - cartItem.quantity);
        await db.products.update(product.id!, { stockQuantity: nextStock });
      })
    );

    await loadTransactions();
    await loadProducts();

    clearCart();
    setMessage('Sale completed and saved locally.');
  };

  return (
    <div className="min-h-screen p-4 pb-28">
      <header className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">New sale</p>
          <h1 className="mt-2 text-2xl font-semibold text-accent">Scanner & cart</h1>
        </div>
        <Link to="/products" className="rounded-3xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-200">
          Manage products
        </Link>
      </header>

      <div className="grid gap-4">
        <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div id={scannerId} className="h-72 rounded-[2rem] bg-slate-950" />
          <div className="mt-4 flex items-center justify-between gap-3 text-sm text-slate-500">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-slate-700">
              <Camera className="h-4 w-4" />
              {scanStatus}
            </div>
            <div className="text-slate-500">{items.length} items scanned</div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
            <label className="space-y-2 text-sm text-slate-700">
              Manual barcode entry
              <input
                value={manualCode}
                onChange={(event) => setManualCode(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && handleManualAdd()}
                placeholder="Enter SKU or barcode"
                className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-3xl bg-accent px-4 py-3 text-white shadow-lg hover:bg-purple-900"
              onClick={handleManualAdd}
            >
              Add
            </button>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Cart</p>
              <h2 className="mt-2 text-xl font-semibold text-accent">{items.length} items</h2>
            </div>
            <button
              type="button"
              className="rounded-3xl bg-rose-100 px-4 py-3 text-sm font-semibold text-rose-700 hover:bg-rose-200"
              onClick={clearCart}
            >
              Clear cart
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {items.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 p-5 text-sm text-slate-500">Scan a product or add manually to begin.</div>
            ) : (
              items.map((item) => (
                <div key={item.productId} className="rounded-3xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 rounded-full border" style={{ backgroundColor: item.shadeHex || '#f3f4f6' }} />
                      <div>
                        <p className="font-semibold text-slate-900">{item.name}</p>
                        <p className="text-sm text-slate-500">SKU {item.sku}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="text-rose-600 hover:text-rose-800"
                      onClick={() => removeItem(item.productId)}
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      <button
                        type="button"
                        className="px-2 text-xl leading-none"
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      >
                        −
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        type="button"
                        className="px-2 text-xl leading-none"
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                      >
                        +
                      </button>
                    </div>
                    <p className="text-sm text-slate-500">${item.unitPrice.toFixed(2)} each</p>
                    <p className="text-sm font-semibold text-slate-900">${item.totalPrice.toFixed(2)}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-5 space-y-3 rounded-3xl bg-slate-50 p-4 text-sm text-slate-700">
            <div className="flex items-center justify-between">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Discount</span>
              <input
                type="number"
                value={discount}
                min={0}
                max={100}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  setDiscount(value);
                  applyDiscountPercent(value);
                }}
                className="w-20 rounded-3xl border border-slate-200 bg-white px-3 py-2 text-right text-sm outline-none"
              />
            </div>
            <div className="flex items-center justify-between">
              <span>Tax</span>
              <span>${taxTotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-lg font-semibold text-slate-900">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-2 text-sm text-slate-700">
              Payment method
              <select
                value={paymentMethod}
                onChange={(event) => setPaymentMethod(event.target.value as any)}
                className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
              >
                <option value="cash">Cash</option>
                <option value="mobile_money">Mobile Money</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            </label>
            <label className="space-y-2 text-sm text-slate-700">
              Amount received
              <input
                type="number"
                value={cashReceived}
                onChange={(event) => setCashReceived(event.target.value)}
                className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
                placeholder="0.00"
              />
            </label>
          </div>

          <button
            type="button"
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-3xl bg-accent px-4 py-4 text-white text-lg font-semibold shadow-lg hover:bg-purple-900"
            onClick={handleCompleteSale}
          >
            <CheckCircle2 className="h-5 w-5" />
            Complete sale
          </button>

          {message && <div className="mt-3 rounded-3xl bg-emerald-100 px-4 py-3 text-sm text-emerald-900">{message}</div>}
        </div>
      </div>

      <NavBar />
    </div>
  );
}
