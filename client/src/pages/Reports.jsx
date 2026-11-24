import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Download, 
  FileSpreadsheet, 
  TrendingUp, 
  CheckCircle2, 
  PieChart as PieIcon, 
  Users, 
  CreditCard,
  Calendar,
  Filter
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { api } from '../services/api';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6'];

const formatMonthLabel = (yyyymm) => {
  if (!yyyymm || yyyymm === 'all') return 'All Time';
  const [year, month] = yyyymm.split('-');
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const mIndex = parseInt(month, 10) - 1;
  return `${monthNames[mIndex] || month} ${year}`;
};

export default function Reports() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState('all');

  const loadReports = async (monthVal) => {
    try {
      setLoading(true);
      const res = await api.getAnalytics({ month: monthVal });
      setData(res);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports(selectedMonth);
  }, [selectedMonth]);

  const handleExport = async (type, monthOverride = null) => {
    const targetMonth = monthOverride !== null ? monthOverride : selectedMonth;
    try {
      const token = localStorage.getItem('fitmanage_token');
      const queryParam = targetMonth ? `&month=${targetMonth}` : '';
      const res = await fetch(`/api/reports/export/${type}?token=${token}${queryParam}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to download report.');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const monthTag = targetMonth === 'all' ? 'all_time' : targetMonth;
      a.download = `${type}_${monthTag}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert('Export failed: ' + e.message);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { 
    summary = {}, 
    paymentMethodsBreakdown = [], 
    planPopularity = [], 
    monthlyRegistrations = [],
    availableMonths = []
  } = data || {};

  const currentMonthLabel = formatMonthLabel(selectedMonth);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header with Month Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Reports & Business Analytics
          </h1>
          <p className="text-xs text-slate-500">
            Insights on customer retention, subscription churn, payment modes, and CSV export.
          </p>
        </div>

        {/* Month Selector Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center space-x-1.5 bg-white border border-slate-200/90 rounded-xl px-3 py-1.5 shadow-sm">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold text-slate-700">Filter Period:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
            >
              <option value="all">All Time (All Months)</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {formatMonthLabel(m)}
                </option>
              ))}
            </select>
          </div>

          {/* Quick All Time Reset */}
          {selectedMonth !== 'all' && (
            <button
              onClick={() => setSelectedMonth('all')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-xl border border-emerald-200 transition-colors"
            >
              Show All Time
            </button>
          )}
        </div>
      </div>

      {/* CSV Export Bar */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-sm tracking-tight">
              Export Filtered CSV Data ({currentMonthLabel})
            </h3>
          </div>
          <p className="text-xs text-slate-400">
            Exported data is strictly sorted in chronological order with intact columns for Excel and Google Sheets.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleExport('customers')}
            className="px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-emerald-500/20 transition-all"
            title={`Export Customers for ${currentMonthLabel}`}
          >
            <Download className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Customers CSV</span>
          </button>

          <button
            onClick={() => handleExport('payments')}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center space-x-1.5 border border-slate-700 transition-all"
            title={`Export Payments for ${currentMonthLabel}`}
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Payments CSV</span>
          </button>

          <button
            onClick={() => handleExport('renewals')}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center space-x-1.5 border border-slate-700 transition-all"
            title={`Export Renewals for ${currentMonthLabel}`}
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Renewals CSV</span>
          </button>

          {selectedMonth !== 'all' && (
            <button
              onClick={() => handleExport('customers', 'all')}
              className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center space-x-1 border border-slate-700 transition-all"
              title="Export All-Time Records"
            >
              <span>Export All-Time</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Row (Reflects Selected Month vs All-Time) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Collections / Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {selectedMonth === 'all' ? 'Total Revenue' : `${currentMonthLabel} Revenue`}
          </span>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono mt-1">
            ₹{(summary?.revenue || 0).toLocaleString('en-IN')}
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {selectedMonth === 'all' ? 'Lifetime collections' : `Lifetime: ₹${(summary?.lifetimeRevenue || 0).toLocaleString('en-IN')}`}
          </p>
        </div>

        {/* Renewal Rate */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Renewal Rate</span>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono mt-1">
            {summary?.renewalRate || 0}%
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {summary?.renewalCount || 0} renewals recorded
          </p>
        </div>

        {/* Member Status Ratio */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active vs Expired</span>
          <div className="text-2xl sm:text-3xl font-black text-slate-800 font-mono mt-1">
            <span className="text-emerald-600">{summary?.activeCount || 0}</span>
            <span className="text-slate-300 text-xl font-normal mx-1">/</span>
            <span className="text-rose-500">{summary?.expiredCount || 0}</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {summary?.totalMembers || 0} registered members
          </p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Registrations & Revenue Trend */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Month-Wise Growth & Registrations</h3>
              <p className="text-[11px] text-slate-400">Past 6 months member onboarding trend</p>
            </div>
            <span className="text-[10px] bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-full uppercase">
              Monthly Trend
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyRegistrations}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip 
                  formatter={(val, name) => [
                    name === 'registrations' ? `${val} Members` : `₹${Number(val).toLocaleString('en-IN')}`, 
                    name === 'registrations' ? 'New Members' : 'Collections'
                  ]}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="registrations" name="New Members" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Methods Distribution */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Payment Methods Breakdown</h3>
              <p className="text-[11px] text-slate-400">Collections by UPI, Cash, Card ({currentMonthLabel})</p>
            </div>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full uppercase">
              Collections
            </span>
          </div>

          {paymentMethodsBreakdown.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-xs text-slate-400">
              No payments recorded for {currentMonthLabel}.
            </div>
          ) : (
            <>
              <div className="h-56 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentMethodsBreakdown}
                      dataKey="amount"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      innerRadius={48}
                      paddingAngle={4}
                    >
                      {paymentMethodsBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(val) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Amount']}
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="flex flex-wrap justify-center gap-3 text-xs pt-1 border-t border-slate-100">
                {paymentMethodsBreakdown.map((item, idx) => (
                  <div key={item.name} className="flex items-center space-x-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                    <span className="text-slate-600 font-medium">{item.name}:</span>
                    <span className="font-mono font-bold text-slate-900">₹{item.amount?.toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Plan Popularity Breakdown */}
      {planPopularity.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">Membership Plan Distribution</h3>
            <span className="text-[10px] text-slate-400 font-bold uppercase">{currentMonthLabel}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {planPopularity.map((p, idx) => (
              <div key={p.name} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">{p.name}</span>
                  <span className="text-[10px] text-slate-400">Enrolled members</span>
                </div>
                <span className="text-lg font-black text-slate-900 font-mono">{p.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}