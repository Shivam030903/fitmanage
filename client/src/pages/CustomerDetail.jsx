import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Phone, 
  MessageSquare, 
  RefreshCw, 
  CreditCard, 
  Calendar, 
  Clock, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  UserX, 
  Edit3, 
  Printer,
  History,
  AlertTriangle,
  Trash2
} from 'lucide-react';
import { api } from '../services/api';
import WhatsAppModal from '../components/WhatsAppModal';
import RenewModal from '../components/RenewModal';
import RecordPaymentModal from '../components/RecordPaymentModal';
import ReceiptModal from '../components/ReceiptModal';

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsAppInitialTemplate, setWhatsAppInitialTemplate] = useState('expiringSoon');
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedReceiptData, setSelectedReceiptData] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editPrimary, setEditPrimary] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchCustomer = async () => {
    try {
      setLoading(true);
      const res = await api.getCustomer(id);
      setData(res);
      // prep edit fields
      if (res.customer) {
        setEditName(res.customer.name || '');
        setEditPrimary(res.customer.contacts?.primary || '');
        setEditAddress(res.customer.address || '');
        setEditNotes(res.customer.notes || '');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load customer profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomer();
  }, [id]);

  const handleOpenReceipt = async (paymentId) => {
    try {
      const receipt = await api.getReceipt(paymentId);
      setSelectedReceiptData(receipt);
    } catch (e) {
      alert('Could not generate receipt.');
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setSavingEdit(true);
    try {
      await api.updateCustomer(id, {
        name: editName,
        contacts: {
          primary: editPrimary
        },
        address: editAddress,
        notes: editNotes
      });
      setShowEditModal(false);
      fetchCustomer();
    } catch (err) {
      alert(err.message || 'Failed to update customer.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteCustomer = async () => {
    setDeleting(true);
    try {
      const targetId = data?.customer?._id || data?.customer?.customerId || id;
      await api.deleteCustomer(targetId);
      navigate('/customers');
    } catch (err) {
      alert(err.message || 'Failed to delete customer.');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-sm">
        {error || 'Customer not found.'}
      </div>
    );
  }

  const { customer, membershipHistory = [], paymentHistory = [], reminderHistory = [] } = data;
  const current = customer.currentMembership;
  const daysLeft = customer.daysRemaining;

  return (
    <div className="space-y-6 pb-16">
      {/* Top Bar with Back & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/customers')}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                {customer.name}
              </h1>
              <span className="font-mono text-xs font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full border border-slate-200">
                {customer.customerId}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Registered on {new Date(customer.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* WhatsApp Action Button */}
          <button
            onClick={() => {
              setWhatsAppInitialTemplate(customer.currentStatus === 'expired' ? 'expired' : 'expiringSoon');
              setShowWhatsAppModal(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 flex items-center space-x-1.5 transition-all"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Send WhatsApp</span>
          </button>

          {/* Renew Button */}
          <button
            onClick={() => setShowRenewModal(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm flex items-center space-x-1.5 transition-all"
          >
            <RefreshCw className="w-4 h-4 text-emerald-400" />
            <span>Renew Membership</span>
          </button>

          {/* Record Payment Button */}
          <button
            onClick={() => setShowPaymentModal(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center space-x-1.5 transition-all border border-slate-200"
          >
            <CreditCard className="w-4 h-4 text-slate-600" />
            <span>Record Payment</span>
          </button>

          {/* Edit Profile */}
          <button
            onClick={() => setShowEditModal(true)}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors border border-slate-200 flex items-center space-x-1"
            title="Edit Customer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button>

          {/* Delete Customer */}
          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs transition-colors border border-rose-200 flex items-center space-x-1"
            title="Delete Customer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Grid: 3-Tier Contacts & Current Membership KPI Box */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact Number Box */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
              Contact Details
            </h3>
            <span className="text-[10px] text-emerald-600 font-bold uppercase">WhatsApp</span>
          </div>

          <div className="space-y-2 text-xs">
            {/* Primary Phone */}
            <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/80 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider block">
                  Mobile Number (WhatsApp)
                </span>
                <span className="font-mono font-bold text-slate-900 text-sm mt-0.5 block">
                  +91 {customer.contacts?.primary || 'None'}
                </span>
              </div>
              {customer.contacts?.primary && (
                <button
                  onClick={() => {
                    setWhatsAppInitialTemplate('expiringSoon');
                    setShowWhatsAppModal(true);
                  }}
                  className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center space-x-1"
                  title="WhatsApp Contact"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-semibold">Chat</span>
                </button>
              )}
            </div>
          </div>

          {/* Personal Details */}
          <div className="border-t border-slate-100 pt-3 space-y-1.5 text-xs text-slate-600">
            <div>Gender: <strong className="text-slate-800">{customer.gender || 'Not specified'}</strong></div>
            <div>Date of Birth: <strong className="text-slate-800">{customer.dateOfBirth || 'Not specified'}</strong></div>
            <div>Address: <strong className="text-slate-800">{customer.address || 'Not specified'}</strong></div>
            {customer.notes && (
              <div className="mt-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs leading-relaxed">
                <span className="font-bold text-slate-900 block text-[10px] uppercase">Member Notes</span>
                {customer.notes}
              </div>
            )}
          </div>
        </div>

        {/* Current Active Subscription Status (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Current Membership Status
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-0.5">
                  {current?.planName || 'No Active Membership'}
                </h3>
              </div>

              {/* Status Badge */}
              <div>
                {customer.currentStatus === 'active' && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Active Plan</span>
                  </span>
                )}
                {customer.currentStatus === 'expiring_soon' && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 flex items-center space-x-1 animate-pulse">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Expiring Soon ({daysLeft} days)</span>
                  </span>
                )}
                {customer.currentStatus === 'expired' && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 flex items-center space-x-1">
                    <UserX className="w-3.5 h-3.5 text-rose-600" />
                    <span>Expired ({Math.abs(daysLeft)} days ago)</span>
                  </span>
                )}
                {customer.currentStatus === 'upcoming' && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    <span>Upcoming Subscription</span>
                  </span>
                )}
              </div>
            </div>

            {/* Validity Timeline */}
            {current ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Start Date</span>
                  <p className="font-semibold text-slate-900 mt-0.5">
                    {new Date(current.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">End Date</span>
                  <p className="font-semibold text-slate-900 mt-0.5">
                    {new Date(current.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Days Remaining</span>
                  <p className={`font-black text-sm mt-0.5 ${daysLeft <= 3 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {daysLeft >= 0 ? `${daysLeft} Days` : 'Expired'}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Plan Fee</span>
                  <p className="font-mono font-bold text-slate-900 text-sm mt-0.5">
                    ₹{current.amount?.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl mt-4">
                This member does not have an active membership. Click <strong>Renew Membership</strong> to enroll them in a plan.
              </div>
            )}
          </div>

          {/* Payment Settlement Status */}
          <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-500">Payment Status:</span>
              <span className="font-bold text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/60">
                Settled in Full (No Pending Dues)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs / Sections: Membership History & Payment Records */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Previous Memberships (Preserved History per PRD) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center space-x-2">
              <History className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-slate-900 text-sm">
                Subscription History
              </h3>
            </div>
            <span className="text-[11px] text-slate-400 font-bold">{membershipHistory.length} Total Records</span>
          </div>

          {membershipHistory.length === 0 ? (
            <p className="text-xs text-slate-400 p-4 text-center">No subscriptions on record.</p>
          ) : (
            <div className="space-y-2.5 max-h-80 overflow-y-auto">
              {membershipHistory.map((m, idx) => (
                <div key={m._id} className="p-3 rounded-xl border border-slate-200/80 hover:bg-slate-50 transition-colors text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{m.planName}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      m.computedStatus === 'active'
                        ? 'bg-emerald-100 text-emerald-800'
                        : m.computedStatus === 'expiring_soon'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {m.computedStatus}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-500 text-[11px]">
                    <span>
                      {new Date(m.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} to{' '}
                      {new Date(m.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <span className="font-mono font-semibold text-slate-800">₹{m.amount?.toLocaleString('en-IN')}</span>
                  </div>
                  {m.isRenewal && (
                    <span className="inline-block text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-medium">
                      ✓ Renewed from prior cycle
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payment History & Receipts */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center space-x-2">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-slate-900 text-sm">
                Payment History & Receipts
              </h3>
            </div>
            <span className="text-[11px] text-slate-400 font-bold">{paymentHistory.length} Transactions</span>
          </div>

          {paymentHistory.length === 0 ? (
            <p className="text-xs text-slate-400 p-4 text-center">No payment transactions recorded.</p>
          ) : (
            <div className="space-y-2.5 max-h-80 overflow-y-auto">
              {paymentHistory.map((p) => (
                <div key={p._id} className="p-3 rounded-xl border border-slate-200/80 hover:bg-slate-50 transition-colors text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-900">{p.transactionReference}</span>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-emerald-700">₹{p.amountPaid?.toLocaleString('en-IN')}</span>
                      <button
                        onClick={() => handleOpenReceipt(p._id)}
                        className="p-1 rounded text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                        title="Print / View Receipt"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-slate-500 text-[11px]">
                    <span>Mode: <strong className="text-slate-700">{p.paymentMethod}</strong> • {p.paymentDate}</span>
                    <span className="text-emerald-600 font-semibold">Settled</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Danger Zone: Permanent Customer Deletion */}
      <div className="bg-rose-50/70 border border-rose-200/90 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-rose-950 flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span>Danger Zone: Delete Customer Record</span>
          </h4>
          <p className="text-xs text-rose-700 mt-1 max-w-xl">
            Permanently delete <strong className="font-semibold text-rose-900">{customer.name}</strong> ({customer.customerId}), along with all active/past memberships, payment receipts, and WhatsApp reminder logs. This action cannot be undone.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowDeleteModal(true)}
          className="self-start sm:self-auto px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 flex items-center space-x-2 transition-all shrink-0"
        >
          <Trash2 className="w-4 h-4" />
          <span>Delete Customer Permanently</span>
        </button>
      </div>

      {/* WhatsApp Modal */}
      <WhatsAppModal
        isOpen={showWhatsAppModal}
        onClose={() => {
          setShowWhatsAppModal(false);
          fetchCustomer();
        }}
        customer={customer}
        initialTemplate={whatsAppInitialTemplate}
      />

      {/* Renew Modal */}
      <RenewModal
        isOpen={showRenewModal}
        onClose={() => setShowRenewModal(false)}
        customer={customer}
        onRenewalComplete={fetchCustomer}
      />

      {/* Record Payment Modal */}
      <RecordPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        customer={customer}
        onPaymentRecorded={(payment) => {
          fetchCustomer();
          if (payment) handleOpenReceipt(payment._id);
        }}
      />

      {/* Receipt Modal */}
      <ReceiptModal
        isOpen={Boolean(selectedReceiptData)}
        onClose={() => setSelectedReceiptData(null)}
        receiptData={selectedReceiptData}
      />

      {/* Edit Customer Profile Modal */}
      {showEditModal && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowEditModal(false)}
        >
          <div 
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-slate-900 text-base">Edit Member Profile</h3>
            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mobile Number (WhatsApp)</label>
                <input
                  type="tel"
                  required
                  value={editPrimary}
                  onChange={(e) => setEditPrimary(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Address</label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold"
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowDeleteModal(false)}
        >
          <div 
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-bold text-slate-900 text-base">Delete Customer Record?</h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to delete <strong className="text-slate-900">{customer.name} ({customer.customerId})</strong>?
              </p>
            </div>
            <div className="p-3 bg-rose-50 rounded-xl text-rose-800 text-[11px] leading-relaxed border border-rose-200">
              ⚠️ This will permanently remove this customer's profile, all <strong>{membershipHistory.length} subscription records</strong>, and <strong>{paymentHistory.length} payment receipts</strong>. This action cannot be undone.
            </div>
            <div className="pt-2 flex items-center space-x-2">
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteCustomer}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Yes, Delete Customer'}
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
