import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Calendar, CreditCard } from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';

export default function RenewModal({ isOpen, onClose, customer, onRenewalComplete }) {
  const [plans, setPlans] = useState([]);
  const [selectedPlanName, setSelectedPlanName] = useState('Monthly Standard');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [amount, setAmount] = useState(2000);
  const [amountPaid, setAmountPaid] = useState(2000);
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchPlans() {
      try {
        const res = await api.getSettings();
        if (res.plans && res.plans.length > 0) {
          setPlans(res.plans);
        }
      } catch (e) {
        console.error('Failed to load plans:', e);
      }
    }
    fetchPlans();
  }, []);

  // Determine intelligent start date
  useEffect(() => {
    if (customer && isOpen) {
      const todayStr = new Date().toISOString().split('T')[0];
      const currentEnd = customer.currentMembership?.endDate;

      let defaultStart = todayStr;
      // If current membership is still active and ends in future, default to next day after expiry
      if (currentEnd && currentEnd >= todayStr) {
        const nextDay = new Date(currentEnd);
        nextDay.setDate(nextDay.getDate() + 1);
        defaultStart = nextDay.toISOString().split('T')[0];
      }

      setStartDate(defaultStart);
      calculateEndDate(defaultStart, 30);
    }
  }, [customer, isOpen]);

  const calculateEndDate = (startStr, durationDays) => {
    if (!startStr) return;
    const s = new Date(startStr);
    s.setDate(s.getDate() + Number(durationDays));
    setEndDate(s.toISOString().split('T')[0]);
  };

  const handlePlanChange = (planName) => {
    setSelectedPlanName(planName);
    const planObj = plans.find(p => p.name === planName);
    if (planObj) {
      setAmount(planObj.price);
      setAmountPaid(planObj.price); // default full payment
      calculateEndDate(startDate, planObj.durationDays);
    }
  };

  const handleStartDateChange = (val) => {
    setStartDate(val);
    const planObj = plans.find(p => p.name === selectedPlanName);
    const duration = planObj ? planObj.durationDays : 30;
    calculateEndDate(val, duration);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.renewMembership(customer._id || customer.customerId, {
        planName: selectedPlanName,
        startDate,
        endDate,
        amount: Number(amount),
        amountPaid: Number(amountPaid),
        paymentMethod,
        notes: notes.trim()
      });

      // Celebration effect!
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 }
      });

      if (onRenewalComplete) onRenewalComplete();
      onClose();
    } catch (err) {
      alert(err.message || 'Failed to renew membership.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !customer) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-bold">
              <RefreshCw className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Renew Membership</h3>
              <p className="text-xs text-slate-500">{customer.name} ({customer.customerId})</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {/* Plan Selection */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Select Membership Plan</label>
            <div className="grid grid-cols-2 gap-2">
              {(plans.length > 0 ? plans : [
                { name: 'Monthly Standard', price: 2000, durationDays: 30 },
                { name: 'Quarterly Transformation', price: 5200, durationDays: 90 },
                { name: 'Half-Yearly Elite', price: 9500, durationDays: 180 },
                { name: 'Annual Champion', price: 16000, durationDays: 365 },
              ]).map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => handlePlanChange(p.name)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    selectedPlanName === p.name
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-500/20 font-bold'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="truncate font-semibold">{p.name}</div>
                  <div className="text-[11px] text-slate-500">₹{p.price?.toLocaleString('en-IN')} • {p.durationDays}d</div>
                </button>
              ))}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Renewal Start Date</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="w-full p-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Renewal End Date</label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full p-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 text-xs"
              />
            </div>
          </div>

          {/* Pricing & Payment Collection */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Total Fee (₹)</label>
              <input
                type="number"
                required
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full p-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 font-mono text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Amount Paid Today (₹)</label>
              <input
                type="number"
                required
                min="0"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                className="w-full p-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 font-mono text-xs font-bold text-emerald-700"
              />
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full p-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 text-xs"
            >
              <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
              <option value="Cash">Cash</option>
              <option value="Debit/Credit Card">Debit / Credit Card</option>
              <option value="Bank Transfer">Bank Transfer (IMPS / NEFT)</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Notes (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Regular discount applied or coupon"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 text-xs"
            />
          </div>

          {/* Submit */}
          <div className="pt-2 flex items-center space-x-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/25 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Renewing...' : 'Confirm & Activate Renewal'}</span>
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
