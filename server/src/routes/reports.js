import express from 'express';
import { db } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { enrichCustomer } from './customers.js';

const router = express.Router();
router.use(authMiddleware);

// GET /api/reports/analytics - High-level analytics
router.get('/analytics', (req, res) => {
  try {
    const { gymId } = req;
    const customers = db.customers.find({ gymId });
    const enriched = customers.map(c => enrichCustomer(c, gymId));
    const memberships = db.memberships.find({ gymId });
    const payments = db.payments.find({ gymId });

    // Active vs Expired
    const activeCount = enriched.filter(c => c.currentStatus === 'active' || c.currentStatus === 'expiring_soon').length;
    const expiredCount = enriched.filter(c => c.currentStatus === 'expired').length;
    const upcomingCount = enriched.filter(c => c.currentStatus === 'upcoming').length;

    // Total Renewals vs Total Memberships
    const renewalCount = memberships.filter(m => m.isRenewal).length;
    const renewalRate = memberships.length > 0 ? Math.round((renewalCount / memberships.length) * 100) : 0;

    // Total Revenue Collected
    const totalRevenue = payments.reduce((acc, p) => acc + (Number(p.amountPaid) || 0), 0);
    const totalPending = enriched.reduce((acc, c) => acc + (Number(c.outstandingBalance) || 0), 0);

    // Payment methods breakdown
    const methods = {};
    payments.forEach(p => {
      const m = p.paymentMethod || 'Cash';
      methods[m] = (methods[m] || 0) + (Number(p.amountPaid) || 0);
    });

    const paymentMethodsBreakdown = Object.keys(methods).map(name => ({
      name,
      amount: methods[name]
    }));

    // Plan popularity
    const planMap = {};
    memberships.forEach(m => {
      planMap[m.planName] = (planMap[m.planName] || 0) + 1;
    });

    const planPopularity = Object.keys(planMap).map(plan => ({
      name: plan,
      count: planMap[plan]
    }));

    // Monthly registrations (last 6 months)
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyRegistrations = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const prefix = d.toISOString().substring(0, 7);
      const label = `${monthNames[d.getMonth()]}`;
      const count = customers.filter(c => c.createdAt && c.createdAt.startsWith(prefix)).length;
      monthlyRegistrations.push({ month: label, registrations: count });
    }

    res.json({
      summary: {
        totalMembers: customers.length,
        activeCount,
        expiredCount,
        upcomingCount,
        renewalRate,
        totalRevenue,
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

// GET /api/reports/export/:type - Export data as CSV
router.get('/export/:type', (req, res) => {
  try {
    const { gymId } = req;
    const { type } = req.params;

    if (type === 'customers') {
      const customers = db.customers.find({ gymId });
      const enriched = customers.map(c => enrichCustomer(c, gymId));

      let csv = 'Customer ID,Full Name,Gender,Primary Phone,Secondary Phone,Emergency Phone,Plan Name,Start Date,End Date,Status,Outstanding Balance\n';
      enriched.forEach(c => {
        csv += `"${c.customerId}","${c.name}","${c.gender || ''}","${c.contacts?.primary || ''}","${c.contacts?.secondary || ''}","${c.contacts?.emergency || ''}","${c.currentMembership?.planName || ''}","${c.currentMembership?.startDate || ''}","${c.currentMembership?.endDate || ''}","${c.currentStatus}","₹${c.outstandingBalance}"\n`;
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=customers_export_${Date.now()}.csv`);
      return res.send(csv);
    }

    if (type === 'payments') {
      const payments = db.payments.find({ gymId });
      let csv = 'Receipt Reference,Customer Name,Customer ID,Date,Method,Total Amount,Amount Paid,Pending Amount,Notes\n';
      payments.forEach(p => {
        const cust = db.customers.findOne({ gymId, customerId: p.customerId });
        csv += `"${p.transactionReference}","${cust?.name || ''}","${p.customerId}","${p.paymentDate}","${p.paymentMethod}","₹${p.totalAmount}","₹${p.amountPaid}","₹${p.pendingAmount}","${p.notes || ''}"\n`;
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=payments_export_${Date.now()}.csv`);
      return res.send(csv);
    }

    if (type === 'renewals') {
      const renewals = db.memberships.find({ gymId, isRenewal: true });
      let csv = 'Customer ID,Customer Name,Plan Name,Start Date,End Date,Amount,Renewed On,Created By\n';
      renewals.forEach(r => {
        const cust = db.customers.findOne({ gymId, customerId: r.customerId });
        csv += `"${r.customerId}","${cust?.name || ''}","${r.planName}","${r.startDate}","${r.endDate}","₹${r.amount}","${r.createdAt}","${r.createdBy || ''}"\n`;
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=renewals_export_${Date.now()}.csv`);
      return res.send(csv);
    }

    res.status(400).json({ error: 'Invalid export type. Supported: customers, payments, renewals.' });
  } catch (err) {
    console.error('Error exporting CSV:', err);
    res.status(500).json({ error: 'Failed to export CSV.' });
  }
});

export default router;
