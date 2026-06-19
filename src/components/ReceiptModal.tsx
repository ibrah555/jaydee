import React from 'react';
import { Transaction } from '../db/schema';

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
                  (it) => `<tr><td>${it.productName}</td><td>${it.quantity}</td><td>${it.unitPrice.toFixed(2)}</td><td>${it.totalPrice.toFixed(2)}</td></tr>`
                )
                .join('')}
            </tbody>
          </table>
          <div class="totals">
            <p>Subtotal: ${transaction.subtotal.toFixed(2)}</p>
            <p>Tax: ${transaction.taxAmount.toFixed(2)}</p>
            <p>Discount: ${transaction.discountAmount.toFixed(2)}</p>
            <h3>Total: ${transaction.total.toFixed(2)}</h3>
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-accent">Receipt</h3>
            <p className="text-sm text-slate-500">{transaction.transactionId}</p>
            <p className="text-sm text-slate-400">{new Date(transaction.createdAt).toLocaleString()}</p>
          </div>
          <div className="flex gap-2">
            <button className="rounded-2xl bg-slate-100 px-3 py-2 text-sm" onClick={onClose}>Close</button>
            <button className="rounded-2xl bg-accent px-3 py-2 text-sm text-white" onClick={handlePrint}>Print / Save</button>
          </div>
        </div>

        <div className="mt-4 space-y-2 text-sm text-slate-700">
          {transaction.items.map((it, idx) => (
            <div key={idx} className="flex items-center justify-between">
              <div>
                <div className="font-medium">{it.productName}</div>
                <div className="text-xs text-slate-500">{it.shade}</div>
              </div>
              <div className="text-right">
                <div>${it.unitPrice.toFixed(2)} × {it.quantity}</div>
                <div className="font-semibold">${it.totalPrice.toFixed(2)}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 border-t pt-3 text-sm text-slate-700">
          <div className="flex items-center justify-between"><span>Subtotal</span><span>${transaction.subtotal.toFixed(2)}</span></div>
          <div className="flex items-center justify-between"><span>Tax</span><span>${transaction.taxAmount.toFixed(2)}</span></div>
          <div className="flex items-center justify-between"><span>Discount</span><span>${transaction.discountAmount.toFixed(2)}</span></div>
          <div className="mt-2 flex items-center justify-between text-lg font-semibold text-slate-900"><span>Total</span><span>${transaction.total.toFixed(2)}</span></div>
        </div>
      </div>
    </div>
  );
}
