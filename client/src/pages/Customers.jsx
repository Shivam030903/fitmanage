import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  Phone, 
  MessageSquare, 
  RefreshCw, 
  Eye, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  UserX,
  CreditCard,
  Trash2
} from 'lucide-react';
import { api } from '../services/api';
import WhatsAppModal from '../components/WhatsAppModal';
import RenewModal from '../components/RenewModal';

export default function Customers() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [paymentFilter, setPaymentFilter] = useState(searchParams.get('paymentStatus') || 'all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  const [whatsAppModalCustomer, setWhatsAppModalCustomer] = useState(null);
  const [renewModalCustomer, setRenewModalCustomer] = useState(null);
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const navigate = useNavigate();

  const handleConfirmDeleteCustomer = async () => {
    if (!customerToDelete) return;
    setDeleting(true);
    try {
      await api.deleteCustomer(customerToDelete._id || customerToDelete.customerId);
      setCustomerToDelete(null);
      fetchCustomers();
    } catch (err) {
      alert(err.message || 'Failed to delete customer.');
    } finally {
      setDeleting(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await api.getCustomers({
        search,
        status: statusFilter,
        paymentStatus: paymentFilter,
        sortBy,
        sortOrder
      });
      setCustomers(res.customers || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [statusFilter, paymentFilter, sortBy, sortOrder]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchCustomers();
  };

  const getStatusBadge = (status, daysRemaining) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Active</span>
          </span>
        );
      case 'expiring_soon':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 animate-pulse">
            <AlertCircle className="w-3 h-3 text-amber-600" />
            <span>Expiring ({daysRemaining}d)</span>
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
            <UserX className="w-3 h-3 text-rose-600" />
            <span>Expired</span>
          </span>
        );
      case 'upcoming':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">
            <Clock className="w-3 h-3 text-blue-600" />
            <span>Upcoming</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
            <span>Cancelled</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600">
            Unsubscribed
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Customer Directory
          </h1>
          <p className="text-xs text-slate-500">
            Manage gym members, 3-tier contact details, subscriptions, and renewal status.
          </p>
        </div>

        <button
          onClick={() => navigate('/customers/new')}
          className="self-start sm:self-auto px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/25 flex items-center space-x-1.5 transition-all"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>New Customer</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search by customer name, FIT-1001 ID, mobile phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-xs pl-9 pr-4 py-2.5 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs px-3 py-2.5 rounded-xl focus:outline-none focus:border-emerald-500 font-medium text-slate-700"
            >
              <option value="all">All Subscription Statuses</option>
              <option value="active">Active Members</option>
              <option value="expiring_soon">Expiring Soon (7 Days)</option>
              <option value="expired">Expired Members</option>
              <option value="upcoming">Upcoming</option>
              <option value="cancelled">Cancelled</option>
            </select>

            {/* Sort Filter */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs px-3 py-2.5 rounded-xl focus:outline-none focus:border-emerald-500 font-medium text-slate-700"
            >
              <option value="createdAt">Registered Date</option>
              <option value="name">Customer Name</option>
              <option value="expiryDate">Expiry Date</option>
            </select>

            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs"
            >
              Search
            </button>
          </div>
        </form>

        {/* Quick Filter Badges */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100 text-xs">
          <span className="text-slate-400 text-[11px] font-semibold mr-1">Quick Filters:</span>
          {[
            { label: 'All', value: 'all' },
            { label: 'Active', value: 'active' },
            { label: 'Expiring Soon', value: 'expiring_soon' },
            { label: 'Expired', value: 'expired' }
          ].map((pill) => (
            <button
              key={pill.value}
              onClick={() => setStatusFilter(pill.value)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === pill.value
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Customer Directory List & Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 font-semibold">
            Loading customer list...
          </div>
        ) : customers.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Users className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">No customers found</p>
            <p className="text-xs text-slate-500">Try adjusting your search criteria or register a new customer.</p>
          </div>
        ) : (
          <>
            {/* Mobile Responsive Cards View (Phones & Small Tablets) */}
            <div className="block md:hidden divide-y divide-slate-100">
              {customers.map((c) => (
                <div key={c._id} className="p-4 space-y-3 hover:bg-slate-50/50 transition-colors">
                  {/* Top: Name, ID & Status Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-800 font-bold flex items-center justify-center uppercase text-xs border border-slate-200">
                        {c.name.charAt(0)}
                      </div>
                      <div>
                        <button
                          onClick={() => navigate(`/customers/${c._id}`)}
                          className="font-bold text-slate-900 hover:text-emerald-600 text-left text-sm block leading-tight"
                        >
                          {c.name}
                        </button>
                        <div className="flex items-center space-x-1.5 text-[11px] text-slate-400 mt-0.5">
                          <span className="font-mono text-slate-500">{c.customerId}</span>
                          <span>•</span>
                          <span>{c.gender || 'Member'}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      {getStatusBadge(c.currentStatus, c.daysRemaining)}
                    </div>
                  </div>

                  {/* Contact & Membership Info */}
                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Mobile Phone</span>
                      <span className="font-mono font-semibold text-slate-800 block mt-0.5">
                        +91 {c.contacts?.primary || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Current Plan</span>
                      <span className="font-medium text-slate-800 block mt-0.5 truncate">
                        {c.currentMembership?.planName || 'No plan'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Validity</span>
                      <span className="text-slate-600 block mt-0.5 text-[11px]">
                        {c.currentMembership?.endDate ? c.currentMembership.endDate : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Payment</span>
                      <span className="text-emerald-700 font-bold block mt-0.5 text-[11px]">Settled in Full</span>
                    </div>
                  </div>

                  {/* Actions Row (WhatsApp, Renew, View, Delete) */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <button
                      onClick={() => setWhatsAppModalCustomer(c)}
                      className="flex-1 py-2 px-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center space-x-1 border border-emerald-200"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                      <span>WhatsApp</span>
                    </button>

                    <button
                      onClick={() => setRenewModalCustomer(c)}
                      className="flex-1 py-2 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center space-x-1 border border-slate-200"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
                      <span>Renew</span>
                    </button>

                    <button
                      onClick={() => navigate(`/customers/${c._id}`)}
                      className="py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center space-x-1"
                    >
                      <Eye className="w-3.5 h-3.5 text-emerald-400" />
                      <span>View</span>
                    </button>

                    <button
                      onClick={() => setCustomerToDelete(c)}
                      className="py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs flex items-center justify-center space-x-1 border border-rose-200"
                      title="Delete Customer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Mobile Phone</th>
                    <th className="py-3 px-4">Current Plan</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Validity</th>
                    <th className="py-3 px-4">Payment</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customers.map((c) => (
                    <tr key={c._id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Customer Name & ID */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center uppercase text-xs border border-slate-200">
                            {c.name.charAt(0)}
                          </div>
                          <div>
                            <button
                              onClick={() => navigate(`/customers/${c._id}`)}
                              className="font-bold text-slate-900 hover:text-emerald-600 text-left block"
                            >
                              {c.name}
                            </button>
                            <div className="flex items-center space-x-2 text-[10px] text-slate-400">
                              <span className="font-mono">{c.customerId}</span>
                              <span>•</span>
                              <span>{c.gender || 'Member'}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Contact Number */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono text-slate-800 font-semibold flex items-center space-x-1">
                          <Phone className="w-3 h-3 text-emerald-600" />
                          <span>+91 {c.contacts?.primary || '—'}</span>
                        </div>
                      </td>

                      {/* Current Plan */}
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-slate-700 block">
                          {c.currentMembership?.planName || 'No active plan'}
                        </span>
                      </td>

                      {/* Computed Status */}
                      <td className="py-3.5 px-4">
                        {getStatusBadge(c.currentStatus, c.daysRemaining)}
                      </td>

                      {/* Validity Dates */}
                      <td className="py-3.5 px-4 text-slate-600">
                        {c.currentMembership?.endDate ? (
                          <div>
                            <span className="font-medium text-slate-800">
                              {new Date(c.currentMembership.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                            <span className="text-[10px] text-slate-400 block">
                              {c.daysRemaining >= 0 ? `${c.daysRemaining} days remaining` : `${Math.abs(c.daysRemaining)} days ago`}
                            </span>
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>

                      {/* Payment Status */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center text-emerald-700 font-bold text-[11px] bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/60">
                          Settled in Full
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* WhatsApp Action */}
                          <button
                            onClick={() => setWhatsAppModalCustomer(c)}
                            title="Send WhatsApp Reminder"
                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-500 text-emerald-700 hover:text-white transition-all border border-emerald-200"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>

                          {/* Renew Action */}
                          <button
                            onClick={() => setRenewModalCustomer(c)}
                            title="Renew Membership"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>

                          {/* View Profile Action */}
                          <button
                            onClick={() => navigate(`/customers/${c._id}`)}
                            title="View Profile"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-700 transition-all"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Delete Customer Action */}
                          <button
                            onClick={() => setCustomerToDelete(c)}
                            title="Delete Customer"
                            className="px-2 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-600 transition-all border border-rose-200 flex items-center space-x-1 text-xs font-semibold"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="hidden xl:inline">Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Delete Customer Confirmation Modal */}
      {customerToDelete && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setCustomerToDelete(null)}
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
                Are you sure you want to permanently delete <strong className="text-slate-900">{customerToDelete.name} ({customerToDelete.customerId})</strong>?
              </p>
            </div>
            <div className="p-3 bg-rose-50 rounded-xl text-rose-800 text-[11px] leading-relaxed border border-rose-200">
              ⚠️ This will remove their customer profile, along with all associated historical subscriptions, payments, and reminder logs. This action cannot be undone.
            </div>
            <div className="pt-2 flex items-center space-x-2">
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDeleteCustomer}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Yes, Delete Customer'}
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => setCustomerToDelete(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Modal */}
      <WhatsAppModal
        isOpen={Boolean(whatsAppModalCustomer)}
        onClose={() => setWhatsAppModalCustomer(null)}
        customer={whatsAppModalCustomer}
        initialTemplate={whatsAppModalCustomer?.currentStatus === 'expired' ? 'expired' : 'expiringSoon'}
      />

      {/* Renew Modal */}
      <RenewModal
        isOpen={Boolean(renewModalCustomer)}
        onClose={() => setRenewModalCustomer(null)}
        customer={renewModalCustomer}
        onRenewalComplete={fetchCustomers}
      />
    </div>
  );
}
