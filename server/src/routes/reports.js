import express from 'express';
import { db } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { enrichCustomer } from './customers.js';

const router = express.Router();
router.use(authMiddleware);

// Safe CSV cell escaping to ensure commas, quotes, linebreaks never break column alignment
const escapeCSV = (val) => {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
};

// GET /api/reports/analytics - High-level analytics with month-wise filtering and available months
router.get('/analytics', (req, res) => {
  try {
    const { gymId } = req;
    const { month } = req.query; // optional: YYYY-MM or 'all'

    const allCustomers = db.customers.find({ gymId });
    const enrichedAll = allCustomers.map(c => enrichCustomer(c, gymId));
    const allMemberships = db.memberships.find({ gymId });
    const allPayments = db.payments.find({ gymId });

    // Derive distinct available months from data
    const monthSet = new Set();
    const currentMonthPrefix = new Date().toISOString().substring(0, 7);
    monthSet.add(currentMonthPrefix);

    allCustomers.forEach(c => {
      if (c.createdAt && c.createdAt.length >= 7) monthSet.add(c.createdAt.substring(0, 7));
    });
    allPayments.forEach(p => {
      if (p.paymentDate && p.paymentDate.length >= 7) monthSet.add(p.paymentDate.substring(0, 7));
      if (p.createdAt && p.createdAt.length >= 7) monthSet.add(p.createdAt.substring(0, 7));
    });
    allMemberships.forEach(m => {
      if (m.startDate && m.startDate.length >= 7) monthSet.add(m.startDate.substring(0, 7));
      if (m.createdAt && m.createdAt.length >= 7) monthSet.add(m.createdAt.substring(0, 7));
    });

    const availableMonths = Array.from(monthSet).sort().reverse(); // e.g. ['2026-11', '2026-10', ...]

    // Filter by month if specified and not 'all'
    const isMonthFilter = month && month !== 'all';
    const targetMonth = isMonthFilter ? month : null;

    const filteredPayments = targetMonth
      ? allPayments.filter(p => (p.paymentDate && p.paymentDate.startsWith(targetMonth)) || (p.createdAt && p.createdAt.startsWith(targetMonth)))
      : allPayments;

    const filteredCustomers = targetMonth
      ? allCustomers.filter(c => c.createdAt && c.createdAt.startsWith(targetMonth))
      : allCustomers;

    const filteredMemberships = targetMonth
      ? allMemberships.filter(m => (m.createdAt && m.createdAt.startsWith(targetMonth)) || (m.startDate && m.startDate.startsWith(targetMonth)))
      : allMemberships;

    // Active vs Expired (overall status)
    const activeCount = enrichedAll.filter(c => c.currentStatus === 'active' || c.currentStatus === 'expiring_soon').length;
    const expiredCount = enrichedAll.filter(c => c.currentStatus === 'expired').length;
    const upcomingCount = enrichedAll.filter(c => c.currentStatus === 'upcoming').length;

    // Renewals
    const renewalCount = filteredMemberships.filter(m => m.isRenewal).length;
    const renewalRate = filteredMemberships.length > 0 
      ? Math.round((renewalCount / filteredMemberships.length) * 100) 
      : (allMemberships.length > 0 ? Math.round((allMemberships.filter(m => m.isRenewal).length / allMemberships.length) * 100) : 0);

    // Revenue calculations
    const selectedRevenue = filteredPayments.reduce((acc, p) => acc + (Number(p.amountPaid) || 0), 0);
    const totalLifetimeRevenue = allPayments.reduce((acc, p) => acc + (Number(p.amountPaid) || 0), 0);
    const totalPending = enrichedAll.reduce((acc, c) => acc + (Number(c.outstandingBalance) || 0), 0);

    // Payment methods breakdown for selected period
    const methods = {};
    filteredPayments.forEach(p => {
      const m = p.paymentMethod || 'Cash';
      methods[m] = (methods[m] || 0) + (Number(p.amountPaid) || 0);
    });

    const paymentMethodsBreakdown = Object.keys(methods).map(name => ({
      name,
      amount: methods[name]
    }));

    // Plan popularity for selected period
    const planMap = {};
    filteredMemberships.forEach(m => {
      planMap[m.planName] = (planMap[m.planName] || 0) + 1;
    });

    const planPopularity = Object.keys(planMap).map(plan => ({
      name: plan,
      count: planMap[plan]
    }));

    // Monthly registrations (last 6 months trend)
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyRegistrations = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      const count = allCustomers.filter(c => c.createdAt && c.createdAt.startsWith(prefix)).length;
      const rev = allPayments
        .filter(p => (p.paymentDate && p.paymentDate.startsWith(prefix)) || (p.createdAt && p.createdAt.startsWith(prefix)))
        .reduce((sum, p) => sum + (Number(p.amountPaid) || 0), 0);
      monthlyRegistrations.push({ month: label, registrations: count, revenue: rev, rawMonth: prefix });
    }

    res.json({
      selectedMonth: month || 'all',
      availableMonths,
      summary: {
        totalMembers: allCustomers.length,
        filteredMembers: filteredCustomers.length,
        activeCount,
        expiredCount,
        upcomingCount,
        renewalRate,
        renewalCount,
        revenue: selectedRevenue,
        lifetimeRevenue: totalLifetimeRevenue,
        totalPending
      },
      paymentMethodsBreakdown,
      planPopularity,
      monthlyRegistrations
    });
  } catch (err) {
    console.error('Error fetching analytics:', err);
    res.status(500).json({ error: 'Failed to retrieve analytics.' });
  }
});

// GET /api/reports/export/:type - Export data as CSV with strict ordering & optional month filter
router.get('/export/:type', (req, res) => {
  try {
    const { gymId } = req;
    const { type } = req.params;
    const { month } = req.query; // optional: YYYY-MM or 'all'

    const isMonthFilter = month && month !== 'all';
    const targetMonth = isMonthFilter ? month : null;

    if (type === 'customers') {
      let customers = db.customers.find({ gymId });
      
      // Optional month filter
      if (targetMonth) {
        customers = customers.filter(c => c.createdAt && c.createdAt.startsWith(targetMonth));
      }

      // Strict stable ordering: Newest registrations first
      customers.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

      const enriched = customers.map(c => enrichCustomer(c, gymId));

      const headers = [
        'Customer ID',
        'Full Name',
        'Gender',
        'Mobile Number',
        'Current Plan',
        'Start Date',
        'End Date',
        'Status',
        'Payment Status',
        'Registration Date',
        'Address',
        'Notes'
      ];

      let csv = headers.map(escapeCSV).join(',') + '\n';

      enriched.forEach(c => {
        const row = [
          c.customerId || '',
          c.name || '',
          c.gender || '',
          c.contacts?.primary || '',
          c.currentMembership?.planName || 'None',
          c.currentMembership?.startDate || '',
          c.currentMembership?.endDate || '',
          c.currentStatus || '',
          'Settled in Full',
          c.createdAt ? c.createdAt.split('T')[0] : '',
          c.address || '',
          c.notes || ''
        ];
        csv += row.map(escapeCSV).join(',') + '\n';
      });

      const filename = `customers_${targetMonth || 'all'}_${Date.now()}.csv`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(csv);
    }

    if (type === 'payments') {
      let payments = db.payments.find({ gymId });

      // Optional month filter
      if (targetMonth) {
        payments = payments.filter(p => 
          (p.paymentDate && p.paymentDate.startsWith(targetMonth)) || 
          (p.createdAt && p.createdAt.startsWith(targetMonth))
        );
      }

      // Strict stable ordering: Newest payments first
      payments.sort((a, b) => new Date(b.paymentDate || b.createdAt || 0) - new Date(a.paymentDate || a.createdAt || 0));

      const headers = [
        'Receipt Reference',
        'Payment Date',
        'Customer ID',
        'Customer Name',
        'Customer Phone',
        'Payment Method',
        'Total Amount (₹)',
        'Amount Paid (₹)',
        'Pending Balance (₹)',
        'Notes',
        'Created At'
      ];

      let csv = headers.map(escapeCSV).join(',') + '\n';

      payments.forEach(p => {
        const cust = db.customers.findOne({ gymId, customerId: p.customerId });
        const row = [
          p.transactionReference || '',
          p.paymentDate || '',
          p.customerId || '',
          cust?.name || '',
          cust?.contacts?.primary || '',
          p.paymentMethod || 'Cash',
          p.totalAmount || 0,
          p.amountPaid || 0,
          p.pendingAmount || 0,
          p.notes || '',
          p.createdAt ? p.createdAt.split('T')[0] : ''
        ];
        csv += row.map(escapeCSV).join(',') + '\n';
      });

      const filename = `payments_${targetMonth || 'all'}_${Date.now()}.csv`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(csv);
    }

    if (type === 'renewals') {
      let renewals = db.memberships.find({ gymId, isRenewal: true });

      // Optional month filter
      if (targetMonth) {
        renewals = renewals.filter(r => 
          (r.createdAt && r.createdAt.startsWith(targetMonth)) || 
          (r.startDate && r.startDate.startsWith(targetMonth))
        );
      }

      // Strict stable ordering: Newest renewals first
      renewals.sort((a, b) => new Date(b.createdAt || b.startDate || 0) - new Date(a.createdAt || a.startDate || 0));

      const headers = [
        'Customer ID',
        'Customer Name',
        'Customer Phone',
        'Plan Name',
        'Start Date',
        'End Date',
        'Plan Amount (₹)',
        'Renewal Date',
        'Created By'
      ];

      let csv = headers.map(escapeCSV).join(',') + '\n';

      renewals.forEach(r => {
        const cust = db.customers.findOne({ gymId, customerId: r.customerId });
        const row = [
          r.customerId || '',
          cust?.name || '',
          cust?.contacts?.primary || '',
          r.planName || '',
          r.startDate || '',
          r.endDate || '',
          r.amount || 0,
          r.createdAt ? r.createdAt.split('T')[0] : (r.startDate || ''),
          r.createdBy || 'Staff'
        ];
        csv += row.map(escapeCSV).join(',') + '\n';
      });

      const filename = `renewals_${targetMonth || 'all'}_${Date.now()}.csv`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(csv);
    }

    res.status(400).json({ error: 'Invalid export type. Supported: customers, payments, renewals.' });
  } catch (err) {
    console.error('Error exporting CSV:', err);
    res.status(500).json({ error: 'Failed to export CSV.' });
  }
});

export default router;