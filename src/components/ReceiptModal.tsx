import React from 'react';
import { Transaction } from '../db/schema';
import { Share2, Printer, X } from 'lucide-react';

type Props = {
  transaction: Transaction | null;
  onClose: () => void;
};

export default function ReceiptModal({ transaction, onClose }: Props) {
  if (!transaction) return null;

  const handlePrint = () => {
    const html = `
      <html>
        <head>
          <title>Receipt ${transaction.transactionId}</title>
          <meta name="viewport" content="width=device-width,initial-scale=1" />
          <style>
            body { font-family: Arial, Helvetica, sans-serif; padding: 20px; color: #111 }
            h1 { color: #b76e79 }
            table { width: 100%; border-collapse: collapse; margin-top: 10px }
            th, td { text-align: left; padding: 8px; border-bottom: 1px solid #ddd }
            .totals { margin-top: 12px }
          </style>
        </head>
        <body>
          <h1>JayDee Cosmetics</h1>
          <p>Receipt: ${transaction.transactionId}</p>
          <p>${new Date(transaction.createdAt).toLocaleString()}</p>
          <table>
            <thead>
              <tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr>
            </thead>
            <tbody>
              ${transaction.items
                .map(
                  (it) => `<tr><td>${it.productName}</td><td>${it.quantity}</td><td>KES ${it.unitPrice.toLocaleString()}</td><td>KES ${it.totalPrice.toLocaleString()}</td></tr>`
                )
                .join('')}
            </tbody>
          </table>
          <div class="totals">
            <p>Subtotal: KES ${transaction.subtotal.toLocaleString()}</p>
            <p>Discount: KES ${transaction.discountAmount.toLocaleString()}</p>
            <h3>Total: KES ${transaction.total.toLocaleString()}</h3>
          </div>
        </body>
      </html>
    `;

    const w = window.open('', '_blank');
    if (!w) return alert('Unable to open print window');
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  };

  const handleWhatsAppShare = () => {
    const dateStr = new Date(transaction.createdAt).toLocaleString();
    let text = `*JayDee Cosmetics Receipt*\n`;
    text += `*Receipt ID:* ${transaction.transactionId}\n`;
    text += `*Date:* ${dateStr}\n`;
    text += `------------------------------------\n`;
    
    transaction.items.forEach(it => {
      text += `• ${it.productName} x ${it.quantity} @ KES ${it.unitPrice.toLocaleString()} = *KES ${it.totalPrice.toLocaleString()}*\n`;
    });
    
    text += `------------------------------------\n`;
    text += `*Subtotal:* KES ${transaction.subtotal.toLocaleString()}\n`;
    if (transaction.discountAmount > 0) {
      text += `*Discount:* KES ${transaction.discountAmount.toLocaleString()}\n`;
    }
    text += `*Total:* *KES ${transaction.total.toLocaleString()}*\n\n`;
    text += `_Thank you for shopping with us!_`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-accent">Receipt</h3>
            <p className="text-xs text-slate-500 mt-0.5">{transaction.transactionId}</p>
            <p className="text-xs text-slate-400 mt-0.5">{new Date(transaction.createdAt).toLocaleString()}</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3.5 max-h-60 overflow-y-auto mb-4 pr-1">
          {transaction.items.map((it, idx) => (
            <div key={idx} className="flex items-center justify-between text-sm bg-slate-50 p-2.5 rounded-xl border border-slate-100/50">
              <div>
                <div className="font-semibold text-slate-800">{it.productName}</div>
                {it.shade && <div className="text-xs text-slate-500 mt-0.5">Shade: {it.shade}</div>}
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-400">KES {it.unitPrice.toLocaleString()} × {it.quantity}</div>
                <div className="font-bold text-slate-800 mt-0.5">KES {it.totalPrice.toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-100 pt-4 space-y-2 text-sm text-slate-600">
          <div className="flex items-center justify-between"><span>Subtotal</span><span>KES {transaction.subtotal.toLocaleString()}</span></div>
          {transaction.discountAmount > 0 && (
            <div className="flex items-center justify-between text-rose-600"><span>Discount</span><span>-KES {transaction.discountAmount.toLocaleString()}</span></div>
          )}
          <div className="pt-2 flex items-center justify-between text-lg font-bold text-slate-900 border-t border-dashed border-slate-200">
            <span>Total</span>
            <span className="text-accent">KES {transaction.total.toLocaleString()}</span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button 
            className="h-12 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition flex items-center justify-center gap-2 text-sm" 
            onClick={handlePrint}
          >
            <Printer className="w-4 h-4" />
            Print Receipt
          </button>
          <button 
            className="h-12 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold transition flex items-center justify-center gap-2 text-sm shadow-md shadow-emerald-500/10" 
            onClick={handleWhatsAppShare}
          >
            <Share2 className="w-4 h-4" />
            Share WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}
