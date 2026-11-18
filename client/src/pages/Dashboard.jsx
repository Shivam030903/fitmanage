import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  UserCheck, 
  AlertTriangle, 
  UserX, 
  UserPlus, 
  IndianRupee, 
  CreditCard, 
  ArrowUpRight, 
  MessageSquare, 
  RefreshCw, 
  Clock, 
  CheckCircle2, 
  TrendingUp,
  Dumbbell
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
import WhatsAppModal from '../components/WhatsAppModal';

const PIE_COLORS = ['#10b981', '#f59e0b', '#f43f5e', '#3b82f6', '#8b5cf6'];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCustomerForWhatsApp, setSelectedCustomerForWhatsApp] = useState(null);

  const navigate = useNavigate();

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error(err);
      setError('Could not load dashboard statistics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-500">Loading FitManage Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-sm">
        {error || 'Failed to load data.'}
      </div>
    );
  }

  const { kpis, membershipOverview, upcomingExpirations, recentActivities, revenueChartData, planDistribution } = stats;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Quick Action Row */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
              Live Operations Control
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              Good day, Gym Champion! ⚡
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              Here is your gym's pulse today. Focus on <strong className="text-emerald-400">{kpis.expiringSoon} memberships</strong> expiring this week.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => navigate('/customers/new')}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/25 flex items-center space-x-1.5 transition-all active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Member</span>
            </button>
            <button
              onClick={() => navigate('/reminders')}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 font-bold text-xs flex items-center space-x-1.5 transition-all"
            >
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              <span>Send Reminders</span>
            </button>
            <button
              onClick={() => navigate('/renewals')}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-bold text-xs flex items-center space-x-1.5 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Renewals</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Row (7 Primary Metrics per PRD) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 sm:gap-4">
        {/* Total Members */}
        <div 
          onClick={() => navigate('/customers')}
          className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Members</span>
            <div className="p-1.5 rounded-lg bg-slate-100 group-hover:bg-slate-200 text-slate-700">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{kpis.totalMembers}</div>
          <p className="text-[10px] text-slate-500 mt-1">All registered gym users</p>
        </div>

        {/* Active Members */}
        <div 
          onClick={() => navigate('/customers?status=active')}
          className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-emerald-600 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Active</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 group-hover:bg-emerald-100">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600">{kpis.activeMembers}</div>
          <p className="text-[10px] text-slate-500 mt-1">Valid subscriptions</p>
        </div>

        {/* Expiring Soon */}
        <div 
          onClick={() => navigate('/reminders?type=expiring_soon')}
          className="bg-white p-4 rounded-2xl border border-amber-200/80 shadow-sm hover:shadow-md transition-all cursor-pointer group bg-gradient-to-br from-white to-amber-50/30"
        >
          <div className="flex items-center justify-between text-amber-600 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Expiring (7d)</span>
            <div className="p-1.5 rounded-lg bg-amber-50 group-hover:bg-amber-100">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600">{kpis.expiringSoon}</div>
          <p className="text-[10px] text-amber-700 font-medium mt-1">Action required</p>
        </div>

        {/* Expired Members */}
        <div 
          onClick={() => navigate('/customers?status=expired')}
          className="bg-white p-4 rounded-2xl border border-rose-200/80 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-rose-600 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Expired</span>
            <div className="p-1.5 rounded-lg bg-rose-50 group-hover:bg-rose-100">
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600">{kpis.expiredMembers}</div>
          <p className="text-[10px] text-slate-500 mt-1">Sub ended</p>
        </div>

        {/* Today's New Registrations */}
        <div 
          onClick={() => navigate('/customers')}
          className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-indigo-600 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">New Today</span>
            <div className="p-1.5 rounded-lg bg-indigo-50 group-hover:bg-indigo-100">
              <UserPlus className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-indigo-600">{kpis.todayNewMembers}</div>
          <p className="text-[10px] text-slate-500 mt-1">{kpis.thisMonthNewMembers} this month</p>
        </div>

        {/* Today's Collections */}
        <div 
          onClick={() => navigate('/payments')}
          className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-emerald-700 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Today's Cash</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 group-hover:bg-emerald-100">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 truncate font-mono">
            ₹{kpis.todayCollections.toLocaleString('en-IN')}
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Collected today</p>
        </div>

        {/* Pending Payments */}
        <div 
          onClick={() => navigate('/customers?paymentStatus=partial')}
          className="bg-white p-4 rounded-2xl border border-rose-200/80 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-rose-700 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Pending Dues</span>
            <div className="p-1.5 rounded-lg bg-rose-50 group-hover:bg-rose-100">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-600 truncate font-mono">
            ₹{kpis.totalPending.toLocaleString('en-IN')}
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Outstanding dues</p>
        </div>
      </div>

      {/* Grid: Upcoming Expirations Table & Revenue Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Expirations (High priority: 2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
                <span>Upcoming Membership Expirations</span>
                <span className="text-xs bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded-full">
                  Next 7 Days
                </span>
              </h3>
              <p className="text-xs text-slate-500">Directly ping members via WhatsApp to maximize retention rate</p>
            </div>
            <button
              onClick={() => navigate('/reminders')}
              className="text-xs text-emerald-600 font-bold hover:underline flex items-center space-x-1"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {upcomingExpirations.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-xl text-slate-500 text-xs">
              🎉 Great news! No memberships are expiring in the next 7 days.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Member</th>
                    <th className="py-2.5 px-3">Plan</th>
                    <th className="py-2.5 px-3">Expiry Date</th>
                    <th className="py-2.5 px-3">Days Left</th>
                    <th className="py-2.5 px-3 text-right">Instant Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {upcomingExpirations.map((item) => (
                    <tr key={item.customerId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3">
                        <button
                          onClick={() => navigate(`/customers/${item.id}`)}
                          className="font-bold text-slate-900 hover:text-emerald-600 text-left"
                        >
                          {item.name}
                        </button>
                        <div className="text-[11px] text-slate-500 font-mono">+91 {item.phone}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-medium">
                        {item.planName}
                      </td>
                      <td className="py-3 px-3 text-slate-700 font-medium">
                        {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.daysRemaining <= 1
                            ? 'bg-rose-100 text-rose-800 animate-pulse'
                            : item.daysRemaining <= 3
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {item.daysRemaining === 0 ? 'Today' : `${item.daysRemaining} days`}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => setSelectedCustomerForWhatsApp({
                            _id: item.id,
                            customerId: item.customerId,
                            name: item.name,
                            contacts: { primary: item.phone, secondary: item.secondaryPhone, emergency: item.emergencyPhone },
                            currentMembership: { planName: item.planName, endDate: item.expiryDate },
                            daysRemaining: item.daysRemaining,
                            outstandingBalance: item.outstandingBalance
                          })}
                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-500 text-emerald-700 hover:text-white font-bold text-xs transition-all border border-emerald-200"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Membership Breakdown & Plan Popularity */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-base">Plan Popularity</h3>
            <span className="text-[10px] font-semibold text-slate-400 uppercase">Memberships</span>
          </div>

          <div className="h-44 flex items-center justify-center">
            {planDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={planDistribution}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={4}
                  >
                    {planDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(val, name) => [`${val} Members`, name]}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-slate-400">No plan data yet.</p>
            )}
          </div>

          <div className="space-y-1.5 max-h-36 overflow-y-auto pt-1">
            {planDistribution.map((p, idx) => (
              <div key={p.name} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-50">
                <div className="flex items-center space-x-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                  <span className="text-slate-700 font-medium truncate max-w-[130px]">{p.name}</span>
                </div>
                <span className="font-bold text-slate-900">{p.count} members</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Grid: Revenue Trend Chart & Recent Activity Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trend Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Collections & Revenue Overview</h3>
              <p className="text-xs text-slate-500">Monthly cash flow and subscription collections</p>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-slate-500">Month to Date</span>
              <p className="text-base font-black text-emerald-600 font-mono">
                ₹{kpis.thisMonthCollections.toLocaleString('en-IN')}
              </p>
            </div>
          </div>

          <div className="h-60 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis 
                  tick={{ fill: '#64748b', fontSize: 11 }} 
                  axisLine={false} 
                  tickLine={false} 
                  tickFormatter={(val) => `₹${val >= 1000 ? `${(val/1000).toFixed(0)}k` : val}`} 
                />
                <Tooltip 
                  formatter={(val) => [`₹${val.toLocaleString('en-IN')}`, 'Revenue']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="revenue" fill="#10b981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Operational Activity */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-base">Recent Activity</h3>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Live Log</span>
          </div>

          <div className="space-y-3 max-h-72 overflow-y-auto">
            {recentActivities.map((act, idx) => (
              <div key={idx} className="flex items-start space-x-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                <div className={`p-2 rounded-xl flex-shrink-0 mt-0.5 ${
                  act.type === 'registration'
                    ? 'bg-indigo-50 text-indigo-600'
                    : act.type === 'renewal'
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-amber-50 text-amber-600'
                }`}>
                  {act.type === 'registration' ? <UserPlus className="w-3.5 h-3.5" /> : act.type === 'renewal' ? <RefreshCw className="w-3.5 h-3.5" /> : <CreditCard className="w-3.5 h-3.5" />}
                </div>
                <div className="overflow-hidden flex-1 text-xs">
                  <p className="font-bold text-slate-800 leading-tight">{act.title}</p>
                  <p className="text-slate-500 text-[11px] mt-0.5 line-clamp-2">{act.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* WhatsApp Modal Trigger */}
      <WhatsAppModal
        isOpen={Boolean(selectedCustomerForWhatsApp)}
        onClose={() => {
          setSelectedCustomerForWhatsApp(null);
          fetchStats();
        }}
        customer={selectedCustomerForWhatsApp}
        initialTemplate="expiringSoon"
      />
    </div>
  );
}
