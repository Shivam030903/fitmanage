import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Download, 
  FileSpreadsheet, 
  TrendingUp, 
  CheckCircle2, 
  PieChart as PieIcon, 
  Users, 
  CreditCard 
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

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'];

export default function Reports() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReports() {
      try {
        setLoading(true);
        const res = await api.getAnalytics();
        setData(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadReports();
  }, []);

  const handleExport = (type) => {
    const token = localStorage.getItem('fitmanage_token');
    window.open(`/api/reports/export/${type}?token=${token}`, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { summary, paymentMethodsBreakdown = [], planPopularity = [], monthlyRegistrations = [] } = data || {};

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Reports & Business Analytics
          </h1>
          <p className="text-xs text-slate-500">
            Insights on customer retention, subscription churn, payment modes, and CSV export.
          </p>
        </div>

        {/* CSV Export Dropdown / Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleExport('customers')}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center space-x-1.5 shadow-sm transition-all"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export Customers CSV</span>
          </button>
          <button
            onClick={() => handleExport('payments')}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center space-x-1.5 border border-slate-200 transition-all"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-600" />
            <span>Export Payments CSV</span>
          </button>
          <button
            onClick={() => handleExport('renewals')}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center space-x-1.5 border border-slate-200 transition-all"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-600" />
            <span>Export Renewals CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Renewal Rate</span>
          <div className="text-3xl font-black text-emerald-600 font-mono mt-1">
            {summary?.renewalRate || 0}%
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">Recurring members percentage</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Revenue</span>
          <div className="text-3xl font-black text-slate-900 font-mono mt-1">
            ₹{(summary?.totalRevenue || 0).toLocaleString('en-IN')}
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">Lifetime collected receipts</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active vs Expired</span>
          <div className="text-2xl font-black text-slate-800 font-mono mt-1">
            <span className="text-emerald-600">{summary?.activeCount || 0}</span> / <span className="text-rose-500">{summary?.expiredCount || 0}</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">Members ratio</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500">Total Outstanding</span>
          <div className="text-3xl font-black text-rose-600 font-mono mt-1">
            ₹{(summary?.totalPending || 0).toLocaleString('en-IN')}
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">Pending collection dues</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Registrations */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">New Registrations by Month</h3>
            <span className="text-[10px] text-slate-400 font-bold uppercase">Customer Growth</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyRegistrations}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip 
                  formatter={(val) => [`${val} Members`, 'New Members']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="registrations" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Methods Distribution */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">Payment Methods Breakdown</h3>
            <span className="text-[10px] text-slate-400 font-bold uppercase">Collections</span>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paymentMethodsBreakdown}
                  dataKey="amount"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={85}
                  innerRadius={50}
                  paddingAngle={5}
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

          <div className="flex flex-wrap justify-center gap-4 text-xs pt-1">
            {paymentMethodsBreakdown.map((item, idx) => (
              <div key={item.name} className="flex items-center space-x-1.5">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                <span className="text-slate-600 font-medium">{item.name}:</span>
                <span className="font-mono font-bold text-slate-900">₹{item.amount?.toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
