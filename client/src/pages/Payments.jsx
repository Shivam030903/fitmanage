import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, IndianRupee, Search, Filter, Printer, Download, Plus, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import ReceiptModal from '../components/ReceiptModal';
import RecordPaymentModal from '../components/RecordPaymentModal';

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [methodFilter, setMethodFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [totalCollected, setTotalCollected] = useState(0);
  const [totalPending, setTotalPending] = useState(0);

  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [recordPaymentCustomer, setRecordPaymentCustomer] = useState(null);
  const [allCustomers, setAllCustomers] = useState([]);
  const [showSelectCustomerToPay, setShowSelectCustomerToPay] = useState(false);

  const navigate = useNavigate();

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await api.getPayments({ method: methodFilter });
      setPayments(res.payments || []);
      setTotalCollected(res.totalCollected || 0);
      setTotalPending(res.totalPending || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [methodFilter]);

  const loadCustomersForPayment = async () => {
    try {
      const res = await api.getCustomers();
      setAllCustomers(res.customers || []);
      setShowSelectCustomerToPay(true);
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenReceipt = async (paymentId) => {
    try {
      const data = await api.getReceipt(paymentId);
      setSelectedReceipt(data);
    } catch (err) {
      alert('Could not fetch receipt.');
    }
  };

  const filteredPayments = payments.filter(p => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (p.customerName && p.customerName.toLowerCase().includes(q)) ||
      (p.customerId && p.customerId.toLowerCase().includes(q)) ||
      (p.transactionReference && p.transactionReference.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Payments & Collections
          </h1>
          <p className="text-xs text-slate-500">
            Real-time ledger of UPI, Cash & Card collections, partial receipts and pending dues.
          </p>
        </div>

        <button
          onClick={loadCustomersForPayment}
          className="self-start sm:self-auto px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/25 flex items-center space-x-1.5 transition-all"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Record Payment</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Collected</span>
          <div className="text-2xl font-black text-emerald-600 font-mono mt-1">
            ₹{totalCollected.toLocaleString('en-IN')}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Recorded across all modes</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500">Pending Balances</span>
          <div className="text-2xl font-black text-rose-600 font-mono mt-1">
            ₹{totalPending.toLocaleString('en-IN')}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Outstanding member dues</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Transactions Count</span>
          <div className="text-2xl font-black text-slate-900 font-mono mt-1">
            {payments.length}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Receipts generated</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search by customer name, ID, or receipt ref (PAY-1001)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 text-xs pl-9 pr-4 py-2.5 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-xs px-3 py-2.5 rounded-xl focus:outline-none focus:border-emerald-500 text-slate-700 font-medium"
          >
            <option value="all">All Payment Methods</option>
            <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
            <option value="Cash">Cash</option>
            <option value="Debit/Credit Card">Debit / Credit Card</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 font-semibold">
            Loading payment receipts...
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            No payments match your search.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="py-3 px-4">Receipt Ref</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Plan / Purpose</th>
                  <th className="py-3 px-4">Payment Date</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Amount Paid</th>
                  <th className="py-3 px-4">Status / Balance</th>
                  <th className="py-3 px-4 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayments.map((p) => {
                  const isPartial = (p.pendingAmount || 0) > 0;
                  return (
                    <tr key={p._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {p.transactionReference}
                      </td>

                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => navigate(`/customers/${p.customerId}`)}
                          className="font-bold text-slate-900 hover:text-emerald-600 block text-left"
                        >
                          {p.customerName}
                        </button>
                        <span className="font-mono text-[10px] text-slate-400">{p.customerId}</span>
                      </td>

                      <td className="py-3.5 px-4 font-medium text-slate-700">
                        {p.planName}
                      </td>

                      <td className="py-3.5 px-4 text-slate-600">
                        {p.paymentDate}
                      </td>

                      <td className="py-3.5 px-4 font-medium text-slate-700">
                        <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-bold">
                          {p.paymentMethod}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-700 text-sm">
                        ₹{p.amountPaid?.toLocaleString('en-IN')}
                      </td>

                      <td className="py-3.5 px-4">
                        {isPartial ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            Bal: ₹{p.pendingAmount?.toLocaleString('en-IN')}
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Fully Paid
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleOpenReceipt(p._id)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-900 hover:text-white font-bold text-xs text-slate-700 flex items-center space-x-1.5 ml-auto transition-all"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Receipt</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Select Customer to record payment modal */}
      {showSelectCustomerToPay && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowSelectCustomerToPay(false)}
        >
          <div 
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-slate-900 text-base">Select Customer for Payment</h3>
              <button onClick={() => setShowSelectCustomerToPay(false)} className="text-slate-400">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2">
              {allCustomers.map(c => (
                <button
                  key={c._id}
                  onClick={() => {
                    setShowSelectCustomerToPay(false);
                    setRecordPaymentCustomer(c);
                  }}
                  className="w-full p-3 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 text-left transition-all flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-900 block">{c.name}</span>
                    <span className="text-slate-500 font-mono">{c.customerId} • +91 {c.contacts?.primary}</span>
                  </div>
                  {c.outstandingBalance > 0 ? (
                    <span className="font-mono font-bold text-rose-600">Dues: ₹{c.outstandingBalance}</span>
                  ) : (
                    <span className="text-slate-400">No dues</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      <RecordPaymentModal
        isOpen={Boolean(recordPaymentCustomer)}
        onClose={() => setRecordPaymentCustomer(null)}
        customer={recordPaymentCustomer}
        onPaymentRecorded={(payment) => {
          fetchPayments();
          if (payment) handleOpenReceipt(payment._id);
        }}
      />

      {/* Receipt Modal */}
      <ReceiptModal
        isOpen={Boolean(selectedReceipt)}
        onClose={() => setSelectedReceipt(null)}
        receiptData={selectedReceipt}
      />
    </div>
  );
}
