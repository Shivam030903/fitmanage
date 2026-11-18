import express from 'express';
import { db, calculateMembershipStatus, getDaysRemaining } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { enrichCustomer } from './customers.js';

const router = express.Router();
router.use(authMiddleware);

router.get('/stats', (req, res) => {
  try {
    const { gymId } = req;
    const todayStr = new Date().toISOString().split('T')[0];
    const currentMonthPrefix = todayStr.substring(0, 7); // YYYY-MM

    const allCustomers = db.customers.find({ gymId });
    const enrichedCustomers = allCustomers.map(c => enrichCustomer(c, gymId));
    const allMemberships = db.memberships.find({ gymId });
    const allPayments = db.payments.find({ gymId });

    // 1. KPI Counts
    const totalMembers = enrichedCustomers.length;
    const activeMembers = enrichedCustomers.filter(c => c.currentStatus === 'active').length;
    const expiringSoon = enrichedCustomers.filter(c => c.currentStatus === 'expiring_soon').length;
    const expiredMembers = enrichedCustomers.filter(c => c.currentStatus === 'expired').length;
    const upcomingMembers = enrichedCustomers.filter(c => c.currentStatus === 'upcoming').length;

    // Today's new members
    const todayNewMembers = allCustomers.filter(c => c.createdAt && c.createdAt.startsWith(todayStr)).length;

    // This month's new members
    const thisMonthNewMembers = allCustomers.filter(c => c.createdAt && c.createdAt.startsWith(currentMonthPrefix)).length;

    // Today's collections
    const todayPayments = allPayments.filter(p => p.paymentDate === todayStr);
    const todayCollections = todayPayments.reduce((acc, p) => acc + (Number(p.amountPaid) || 0), 0);

    // This month's collections
    const thisMonthPayments = allPayments.filter(p => p.paymentDate && p.paymentDate.startsWith(currentMonthPrefix));
    const thisMonthCollections = thisMonthPayments.reduce((acc, p) => acc + (Number(p.amountPaid) || 0), 0);

    // Total pending balances
    const totalPending = enrichedCustomers.reduce((acc, c) => acc + (Number(c.outstandingBalance) || 0), 0);

    // 2. Upcoming Expirations Table (Expiring within 7 days or today)
    const upcomingExpirations = enrichedCustomers
      .filter(c => c.currentStatus === 'expiring_soon' || (c.currentMembership && c.daysRemaining <= 7 && c.daysRemaining >= 0))
      .map(c => ({
        customerId: c.customerId,
        id: c._id,
        name: c.name,
        phone: c.contacts?.primary || '',
        secondaryPhone: c.contacts?.secondary || '',
        emergencyPhone: c.contacts?.emergency || '',
        planName: c.currentMembership?.planName || 'Standard',
        expiryDate: c.currentMembership?.endDate || '',
        daysRemaining: c.daysRemaining,
        outstandingBalance: c.outstandingBalance
      }))
      .sort((a, b) => a.daysRemaining - b.daysRemaining)
      .slice(0, 10);

    // 3. Expired Recently (within last 14 days)
    const recentExpired = enrichedCustomers
      .filter(c => c.currentStatus === 'expired')
      .map(c => ({
        customerId: c.customerId,
        id: c._id,
        name: c.name,
        phone: c.contacts?.primary || '',
        planName: c.currentMembership?.planName || 'Standard',
        expiryDate: c.currentMembership?.endDate || '',
        daysPast: Math.abs(c.daysRemaining)
      }))
      .sort((a, b) => a.daysPast - b.daysPast)
      .slice(0, 5);

    // 4. Recent Activities Feed
    const activities = [];

    // New registrations
    allCustomers.forEach(c => {
      activities.push({
        type: 'registration',
        title: 'New Member Registered',
        description: `${c.name} joined as a new gym customer (${c.customerId})`,
        time: c.createdAt,
        timestamp: new Date(c.createdAt).getTime()
      });
    });

    // Renewals
    allMemberships.filter(m => m.isRenewal).forEach(m => {
      const cust = allCustomers.find(c => c.customerId === m.customerId);
      activities.push({
        type: 'renewal',
        title: 'Membership Renewed',
        description: `${cust?.name || m.customerId} renewed their ${m.planName} plan`,
        time: m.createdAt,
        timestamp: new Date(m.createdAt).getTime()
      });
    });

    // Payments
    allPayments.forEach(p => {
      const cust = allCustomers.find(c => c.customerId === p.customerId);
      activities.push({
        type: 'payment',
        title: 'Payment Received',
        description: `₹${(Number(p.amountPaid) || 0).toLocaleString('en-IN')} via ${p.paymentMethod} from ${cust?.name || p.customerId} (${p.transactionReference})`,
        time: p.createdAt || p.paymentDate,
        timestamp: new Date(p.createdAt || p.paymentDate).getTime()
      });
    });

    // Sort activities descending
    activities.sort((a, b) => b.timestamp - a.timestamp);
    const recentActivities = activities.slice(0, 8);

    // 5. Revenue Trend (last 6 months / recent days)
    const monthlyRevenue = {};
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    allPayments.forEach(p => {
      if (p.paymentDate) {
        const d = new Date(p.paymentDate);
        const mKey = `${months[d.getMonth()]} ${d.getFullYear()}`;
        monthlyRevenue[mKey] = (monthlyRevenue[mKey] || 0) + (Number(p.amountPaid) || 0);
      }
    });

    // Generate last 6 months list for clean chart
    const revenueChartData = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const past = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = `${months[past.getMonth()]}`;
      const fullKey = `${months[past.getMonth()]} ${past.getFullYear()}`;
      revenueChartData.push({
        month: label,
        revenue: monthlyRevenue[fullKey] || 0
      });
    }

    // Plan popularity breakdown
    const planCounts = {};
    allMemberships.forEach(m => {
      if (m.planName) {
        planCounts[m.planName] = (planCounts[m.planName] || 0) + 1;
      }
    });

    const planDistribution = Object.keys(planCounts).map(plan => ({
      name: plan,
      count: planCounts[plan]
    }));

    res.json({
      kpis: {
        totalMembers,
        activeMembers,
        expiringSoon,
        expiredMembers,
        upcomingMembers,
        todayNewMembers,
        thisMonthNewMembers,
        todayCollections,
        thisMonthCollections,
        totalPending
      },
      membershipOverview: {
        active: activeMembers,
        expiringSoon,
        expired: expiredMembers,
        upcoming: upcomingMembers,
        newThisMonth: thisMonthNewMembers
      },
      upcomingExpirations,
      recentExpired,
      recentActivities,
      revenueChartData,
      planDistribution
    });
  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
    res.status(500).json({ error: 'Failed to retrieve dashboard metrics.' });
  }
});

export default router;
