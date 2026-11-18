import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, MessageSquare, AlertTriangle, UserX, Clock, Phone, ArrowUpRight } from 'lucide-react';
import { api } from '../services/api';
import WhatsAppModal from '../components/WhatsAppModal';
import RenewModal from '../components/RenewModal';

export default function Renewals() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');

  const [whatsAppCustomer, setWhatsAppCustomer] = useState(null);
  const [renewCustomer, setRenewCustomer] = useState(null);

  const navigate = useNavigate();

  const fetchRenewals = async () => {
    try {
      setLoading(true);
      const res = await api.getReminders({ type: filterType });
      setQueue(res.queue || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRenewals();
  }, [filterType]);

  const expiringSoonList = queue.filter(q => q.type === 'expiring_soon' || q.type === 'expiry_today');
  const expiredList = queue.filter(q => q.type === 'expired');

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Renewals & Expirations Hub
          </h1>
          <p className="text-xs text-slate-500">
            Dedicated workspace for retaining gym members, converting expired accounts, and driving renewals.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
              filterType === 'all' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-700'
            }`}
          >
            All Renewals ({queue.length})
          </button>
          <button
            onClick={() => setFilterType('expiring_soon')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
              filterType === 'expiring_soon' ? 'bg-amber-500 text-slate-950' : 'bg-white border border-slate-200 text-slate-700'
            }`}
          >
            Expiring (7d)
          </button>
          <button
            onClick={() => setFilterType('expired')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
              filterType === 'expired' ? 'bg-rose-500 text-white' : 'bg-white border border-slate-200 text-slate-700'
            }`}
          >
            Expired
          </button>
        </div>
      </div>

      {/* Grid of Renewal Cards */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500 font-semibold">
          Scanning membership expiry schedules...
        </div>
      ) : queue.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80 shadow-sm text-slate-500 text-xs">
          🎉 No pending renewals in this filter! All gym members are up to date.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {queue.map((item) => {
            const isExpToday = item.type === 'expiry_today';
            const isExpired = item.type === 'expired';

            return (
              <div 
                key={item.id}
                className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <button
                        onClick={() => navigate(`/customers/${item.customer._id}`)}
                        className="font-bold text-slate-900 hover:text-emerald-600 text-sm block text-left"
                      >
                        {item.customer.name}
                      </button>
                      <span className="font-mono text-xs text-slate-400">
                        {item.customer.customerId}
                      </span>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isExpToday
                        ? 'bg-rose-100 text-rose-800 animate-pulse'
                        : isExpired
                        ? 'bg-slate-100 text-slate-700'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {item.triggerLabel}
                    </span>
                  </div>

                  {/* Plan & Dates */}
                  <div className="mt-3 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs space-y-1">
                    <div className="flex justify-between text-slate-600">
                      <span>Current Plan:</span>
                      <strong className="text-slate-800">{item.membership?.planName || 'Standard'}</strong>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>End Date:</span>
                      <span className="font-medium text-slate-900">
                        {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Primary Phone:</span>
                      <span className="font-mono text-slate-800 font-semibold">+91 {item.primaryPhone || '—'}</span>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="pt-2 border-t border-slate-100 flex items-center space-x-2">
                  <button
                    onClick={() => setWhatsAppCustomer(item.customer)}
                    className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center space-x-1.5 shadow-sm shadow-emerald-500/20 transition-all"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>

                  <button
                    onClick={() => setRenewCustomer(item.customer)}
                    className="flex-1 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-sm transition-all"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Renew</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* WhatsApp Modal */}
      <WhatsAppModal
        isOpen={Boolean(whatsAppCustomer)}
        onClose={() => setWhatsAppCustomer(null)}
        customer={whatsAppCustomer}
        initialTemplate={whatsAppCustomer?.currentStatus === 'expired' ? 'expired' : 'expiringSoon'}
      />

      {/* Renew Modal */}
      <RenewModal
        isOpen={Boolean(renewCustomer)}
        onClose={() => setRenewCustomer(null)}
        customer={renewCustomer}
        onRenewalComplete={fetchRenewals}
      />
    </div>
  );
}
