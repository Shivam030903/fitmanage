import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, Calendar, CheckCircle2, AlertCircle, UserX, Clock, Ban, Search, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import RenewModal from '../components/RenewModal';
import WhatsAppModal from '../components/WhatsAppModal';

export default function Memberships() {
  const [memberships, setMemberships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [renewTarget, setRenewTarget] = useState(null);
  const [whatsAppTarget, setWhatsAppTarget] = useState(null);

  const navigate = useNavigate();

  const fetchMemberships = async () => {
    try {
      setLoading(true);
      const res = await api.getMemberships({ status: statusFilter });
      setMemberships(res.memberships || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemberships();
  }, [statusFilter]);

  const handleCancelMembership = async (id) => {
    if (window.confirm('Are you sure you want to cancel this membership?')) {
      try {
        await api.cancelMembership(id, 'Cancelled on customer request');
        fetchMemberships();
      } catch (err) {
        alert(err.message || 'Failed to cancel membership.');
      }
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Subscriptions & Memberships
          </h1>
          <p className="text-xs text-slate-500">
            Real-time tracking of active plans, expiry calculations, and renewal cycles.
          </p>
        </div>

        <button
          onClick={() => navigate('/customers/new')}
          className="self-start sm:self-auto px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20"
        >
          + New Membership
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 text-xs">
        {[
          { label: 'All Memberships', value: 'all' },
          { label: 'Active', value: 'active' },
          { label: 'Expiring Soon (7d)', value: 'expiring_soon' },
          { label: 'Expired', value: 'expired' },
          { label: 'Upcoming', value: 'upcoming' },
          { label: 'Cancelled', value: 'cancelled' },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              statusFilter === tab.value
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Memberships List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 font-semibold">
            Loading memberships...
          </div>
        ) : memberships.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            No memberships matching this status.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="py-3 px-4">Member</th>
                  <th className="py-3 px-4">Plan Name</th>
                  <th className="py-3 px-4">Validity Range</th>
                  <th className="py-3 px-4">Fee Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {memberships.map((m) => (
                  <tr key={m._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => navigate(`/customers/${m.customer?._id || m.customerId}`)}
                        className="font-bold text-slate-900 hover:text-emerald-600 block text-left"
                      >
                        {m.customerName}
                      </button>
                      <span className="font-mono text-[10px] text-slate-400">
                        {m.customerId} • +91 {m.customerPhone}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {m.planName}
                      {m.isRenewal && (
                        <span className="block text-[10px] text-emerald-600 font-medium">Renewal</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600">
                      <div>
                        {new Date(m.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} —{' '}
                        {new Date(m.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {m.daysRemaining >= 0 ? `${m.daysRemaining} days left` : `${Math.abs(m.daysRemaining)} days ago`}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      ₹{m.amount?.toLocaleString('en-IN')}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        m.computedStatus === 'active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : m.computedStatus === 'expiring_soon'
                          ? 'bg-amber-100 text-amber-800 animate-pulse'
                          : m.computedStatus === 'expired'
                          ? 'bg-rose-100 text-rose-800'
                          : m.computedStatus === 'cancelled'
                          ? 'bg-slate-100 text-slate-600'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {m.computedStatus}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => setRenewTarget(m.customer)}
                          title="Renew Plan"
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-500 text-emerald-700 hover:text-white font-bold text-xs transition-colors border border-emerald-200"
                        >
                          Renew
                        </button>
                        {m.computedStatus === 'active' && (
                          <button
                            onClick={() => handleCancelMembership(m._id)}
                            title="Cancel Membership"
                            className="p-1 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Renew Modal */}
      <RenewModal
        isOpen={Boolean(renewTarget)}
        onClose={() => setRenewTarget(null)}
        customer={renewTarget}
        onRenewalComplete={fetchMemberships}
      />
    </div>
  );
}
