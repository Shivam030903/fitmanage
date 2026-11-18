import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MessageSquare, 
  Send, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Phone, 
  Calendar, 
  History,
  Filter
} from 'lucide-react';
import { api } from '../services/api';
import WhatsAppModal from '../components/WhatsAppModal';

export default function Reminders() {
  const [data, setData] = useState({ queue: [], logs: [] });
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [selectedCustomerForWhatsApp, setSelectedCustomerForWhatsApp] = useState(null);
  const [initialTemplate, setInitialTemplate] = useState('expiringSoon');

  const navigate = useNavigate();

  const fetchReminders = async () => {
    try {
      setLoading(true);
      const res = await api.getReminders({ type: filterType });
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReminders();
  }, [filterType]);

  const queue = data.queue || [];
  const logs = data.logs || [];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            WhatsApp Renewal Reminders
          </h1>
          <p className="text-xs text-slate-500">
            Never miss an expiring member. Send personalized WhatsApp reminders with pre-filled message templates.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {[
            { label: 'All Attention', value: 'all' },
            { label: 'Expiring (7d)', value: 'expiring_soon' },
            { label: 'Expires Today', value: 'expiry_today' },
            { label: 'Expired', value: 'expired' },
            { label: 'Pending Dues', value: 'pending_payment' },
          ].map((btn) => (
            <button
              key={btn.value}
              onClick={() => setFilterType(btn.value)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                filterType === btn.value
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Reminder Queue Cards */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
          <span>Members Requiring Communication</span>
          <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-mono">
            {queue.length}
          </span>
        </h2>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 font-semibold bg-white rounded-2xl border border-slate-200">
            Scanning renewal queue...
          </div>
        ) : queue.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80 shadow-sm text-slate-500 text-xs">
            🎉 All caught up! No members require WhatsApp reminders in this category right now.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {queue.map((item) => {
              const cust = item.customer;
              const isUrgent = item.urgency === 'critical';

              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-2xl p-5 border shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 ${
                    isUrgent ? 'border-rose-300 ring-1 ring-rose-300 bg-rose-50/20' : 'border-slate-200/80'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <button
                          onClick={() => navigate(`/customers/${cust._id}`)}
                          className="font-bold text-slate-900 hover:text-emerald-600 text-base block text-left"
                        >
                          {cust.name}
                        </button>
                        <span className="font-mono text-xs text-slate-400">
                          {cust.customerId}
                        </span>
                      </div>

                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        item.urgency === 'critical'
                          ? 'bg-rose-100 text-rose-800 animate-pulse'
                          : item.urgency === 'high'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {item.triggerLabel}
                      </span>
                    </div>

                    {/* Member details breakdown */}
                    <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/60 text-xs space-y-1.5">
                      <div className="flex justify-between text-slate-600">
                        <span>Plan Name:</span>
                        <strong className="text-slate-800">{item.membership?.planName || 'Standard'}</strong>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>End Date:</span>
                        <span className="font-medium text-slate-900">
                          {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Primary Mobile:</span>
                        <span className="font-mono font-semibold text-slate-900">+91 {item.primaryPhone || '—'}</span>
                      </div>
                      {item.lastReminderSent && (
                        <div className="flex justify-between text-[11px] text-emerald-700 pt-1 border-t border-slate-200/60 font-medium">
                          <span>Last Reminded:</span>
                          <span>{new Date(item.lastReminderSent).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Send WhatsApp Button */}
                  <button
                    onClick={() => {
                      setSelectedCustomerForWhatsApp(cust);
                      setInitialTemplate(item.recommendedTemplate || 'expiringSoon');
                    }}
                    className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/25 flex items-center justify-center space-x-2 transition-all active:scale-95"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Send WhatsApp Reminder</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reminder Audit Logs Table */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center space-x-2">
            <History className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-slate-900 text-sm">
              Reminder Communication History & Audit Log
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">{logs.length} logged records</span>
        </div>

        {logs.length === 0 ? (
          <p className="text-xs text-slate-400 p-4 text-center">No reminders initiated yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="py-2.5 px-3">Date & Time</th>
                  <th className="py-2.5 px-3">Member</th>
                  <th className="py-2.5 px-3">Contact Number</th>
                  <th className="py-2.5 px-3">Template / Type</th>
                  <th className="py-2.5 px-3">Sent By Staff</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3 text-slate-600">
                      {new Date(log.sentAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">
                      {log.customerName}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">
                      +91 {log.contactNumber}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 capitalize">
                      {log.reminderType.replace('_', ' ')}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {log.createdBy || 'Staff'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Initiated
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* WhatsApp Modal */}
      <WhatsAppModal
        isOpen={Boolean(selectedCustomerForWhatsApp)}
        onClose={() => {
          setSelectedCustomerForWhatsApp(null);
          fetchReminders();
        }}
        customer={selectedCustomerForWhatsApp}
        initialTemplate={initialTemplate}
      />
    </div>
  );
}
