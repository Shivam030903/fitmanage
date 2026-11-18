import React from 'react';
import { X, Printer, Dumbbell, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ReceiptModal({ isOpen, onClose, receiptData }) {
  const { gym } = useAuth();
  if (!isOpen || !receiptData) return null;

  const handlePrint = () => {
    window.print();
  };

  const receipt = receiptData;
  const isPending = (receipt.payment?.pendingAmount || 0) > 0;

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-100 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Action Header */}
        <div className="flex items-center justify-between no-print border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-900 text-sm">Official Gym Receipt</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 font-mono text-slate-700">
              {receipt.receiptNumber}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Paper */}
        <div id="printable-receipt" className="border border-slate-200 rounded-2xl p-6 bg-slate-50/50 space-y-5 text-slate-800">
          {/* Gym Header */}
          <div className="flex justify-between items-start border-b border-slate-200 pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
                <Dumbbell className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="font-extrabold text-base text-slate-900">{receipt.gym?.name || gym?.gymName}</h2>
                <p className="text-[11px] text-slate-500 max-w-xs">{receipt.gym?.address || gym?.address}</p>
                <p className="text-[11px] text-slate-500">Phone: {receipt.gym?.phone || gym?.phone} | GSTIN: {receipt.gym?.gstin || gym?.gstin || 'N/A'}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-block px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 font-bold text-[11px] uppercase tracking-wider">
                PAYMENT RECEIPT
              </span>
              <p className="text-xs font-mono text-slate-600 mt-1">Ref: {receipt.receiptNumber}</p>
              <p className="text-xs text-slate-500">Date: {receipt.paymentDate}</p>
            </div>
          </div>

          {/* Member Details */}
          <div className="grid grid-cols-2 gap-4 bg-white p-3.5 rounded-xl border border-slate-200/60 text-xs">
            <div>
              <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Billed To Member</p>
              <p className="font-bold text-slate-900 text-sm mt-0.5">{receipt.customer?.name}</p>
              <p className="text-slate-600 font-mono text-[11px]">ID: {receipt.customer?.customerId}</p>
              <p className="text-slate-600">Mobile: +91 {receipt.customer?.primaryPhone}</p>
            </div>
            <div className="text-right">
              <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Plan & Validity</p>
              <p className="font-bold text-slate-900 text-sm mt-0.5">{receipt.membership?.planName}</p>
              <p className="text-slate-600 text-[11px]">
                {receipt.membership?.startDate} to {receipt.membership?.endDate}
              </p>
              <p className="text-slate-500 text-[11px] mt-1">Payment Mode: <strong className="text-slate-700">{receipt.payment?.paymentMethod}</strong></p>
            </div>
          </div>

          {/* Bill Breakdown Table */}
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                <th className="text-left py-2">Item Description</th>
                <th className="text-right py-2">Total Billed</th>
                <th className="text-right py-2">Amount Paid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="py-2.5 text-slate-800">
                  <span className="font-semibold">{receipt.membership?.planName}</span>
                  <p className="text-[10px] text-slate-500">{receipt.payment?.notes || 'Gym Membership & Facility Access'}</p>
                </td>
                <td className="py-2.5 text-right font-mono">₹{receipt.payment?.totalAmount?.toLocaleString('en-IN')}</td>
                <td className="py-2.5 text-right font-mono font-bold text-emerald-700">₹{receipt.payment?.amountPaid?.toLocaleString('en-IN')}</td>
              </tr>
            </tbody>
          </table>

          {/* Summary Box */}
          <div className="border-t border-slate-200 pt-3 flex justify-between items-center text-xs">
            <div className="space-y-1">
              <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full font-bold text-[11px] ${
                isPending ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
              }`}>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{isPending ? `Partial Payment (Pending: ₹${receipt.payment?.pendingAmount?.toLocaleString('en-IN')})` : 'Full Payment Received'}</span>
              </span>
              <p className="text-[10px] text-slate-400">Received by: {receipt.payment?.receivedBy || 'Staff Desk'}</p>
            </div>

            <div className="text-right space-y-0.5">
              <div className="text-xs text-slate-500">Paid Today: <strong className="text-slate-900 font-mono text-sm">₹{receipt.payment?.amountPaid?.toLocaleString('en-IN')}</strong></div>
              {isPending && (
                <div className="text-xs text-rose-600 font-semibold">Balance Due: <span className="font-mono">₹{receipt.payment?.pendingAmount?.toLocaleString('en-IN')}</span></div>
              )}
            </div>
          </div>

          {/* Footer Terms */}
          <div className="border-t border-slate-200 pt-3 text-[10px] text-slate-400 text-center leading-relaxed">
            Thank you for working out with {receipt.gym?.name || gym?.gymName}! Stay fit, stay consistent.
            <br />This is a computer-generated tax/payment receipt from FitManage System.
          </div>
        </div>

        {/* Close Button */}
        <div className="no-print pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
