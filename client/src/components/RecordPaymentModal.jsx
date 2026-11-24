import React, { useState } from 'react';
import { X, CreditCard, Check } from 'lucide-react';
import { api } from '../services/api';

export default function RecordPaymentModal({ isOpen, onClose, customer, onPaymentRecorded }) {
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (customer && isOpen) {
      setAmountPaid(customer.outstandingBalance || customer.currentMembership?.amount || '');
    }
  }, [customer, isOpen]);

  if (!isOpen || !customer) return null;

  const pending = customer.outstandingBalance || 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amountPaid || Number(amountPaid) <= 0) {
      alert('Please enter a valid amount.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.recordPayment({
        customerId: customer.customerId,
        membershipId: customer.currentMembership?._id || null,
        totalAmount: Number(amountPaid),
        amountPaid: Number(amountPaid),
        paymentMethod,
        paymentDate,
        notes: notes.trim()
      });

      if (onPaymentRecorded) onPaymentRecorded(res.payment);
      onClose();
    } catch (err) {
      alert(err.message || 'Failed to record payment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-bold">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Record Payment</h3>
              <p className="text-xs text-slate-500">{customer.name} ({customer.customerId})</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Amount to Collect (₹)</label>
            <input
              type="number"
              required
              min="1"
              placeholder="Enter amount (₹)"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 text-sm font-mono font-bold text-slate-900"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 text-xs"
            >
              <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
              <option value="Cash">Cash</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Payment Date</label>
            <input
              type="date"
              required
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 text-xs"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Transaction Notes / Reference (Optional)</label>
            <input
              type="text"
              placeholder="e.g. UTR / UPI reference ID or remarks"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 text-xs"
            />
          </div>

          <div className="pt-2 flex items-center space-x-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/25 transition-all flex items-center justify-center space-x-1.5 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{loading ? 'Recording...' : 'Record Payment & Generate Receipt'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
