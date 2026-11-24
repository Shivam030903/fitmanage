import express from 'express';
import { db, calculateMembershipStatus, getDaysRemaining } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

// GET /api/memberships - Get memberships with search and filters
router.get('/', (req, res) => {
  try {
    const { gymId } = req;
    const { status, customerId } = req.query;

    let query = { gymId };
    if (customerId) query.customerId = customerId;

    let memberships = db.memberships.find(query);

    // Populate customer details and live computed status
    let populated = memberships.map(m => {
      const customer = db.customers.findOne({ gymId, customerId: m.customerId });
      const computedStatus = calculateMembershipStatus(m.startDate, m.endDate, m.status === 'cancelled');
      const daysRemaining = getDaysRemaining(m.endDate);

      return {
        ...m,
        computedStatus,
        daysRemaining,
        customerName: customer ? customer.name : 'Unknown',
        customerPhone: customer?.contacts?.primary || '',
        customer
      };
    });

    if (status && status !== 'all') {
      populated = populated.filter(m => m.computedStatus === status);
    }

    // Sort by end date descending
    populated.sort((a, b) => new Date(b.endDate) - new Date(a.endDate));

    res.json({ memberships: populated, total: populated.length });
  } catch (err) {
    console.error('Error fetching memberships:', err);
    res.status(500).json({ error: 'Failed to retrieve memberships.' });
  }
});

// POST /api/memberships - Create new membership for a customer
router.post('/', (req, res) => {
  try {
    const { gymId, user } = req;
    const { customerId, planName, startDate, endDate, amount, paymentMethod, amountPaid } = req.body;

    if (!customerId || !planName || !startDate || !endDate) {
      return res.status(400).json({ error: 'Customer, Plan, Start Date, and End Date are required.' });
    }

    const customer = db.customers.findOne({ gymId, customerId });
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    const status = calculateMembershipStatus(startDate, endDate);

    const membership = db.memberships.insertOne({
      gymId,
      customerId,
      planName,
      startDate,
      endDate,
      amount: Number(amount) || 0,
      status,
      createdBy: user.name,
      createdAt: new Date().toISOString()
    });

    // Record payment if specified (settled in full upfront)
    let payment = null;
    const total = Number(amount) || 0;
    const validMethods = ['UPI', 'Cash', 'Other'];
    const pMethod = validMethods.includes(paymentMethod) ? paymentMethod : 'UPI';

    if (total > 0) {
      payment = db.payments.insertOne({
        gymId,
        customerId,
        membershipId: membership._id,
        totalAmount: total,
        amountPaid: total,
        pendingAmount: 0,
        paymentMethod: pMethod,
        paymentDate: startDate || new Date().toISOString().split('T')[0],
        transactionReference: `PAY-${Date.now().toString().slice(-6)}`,
        notes: 'Full payment cleared upfront',
        createdAt: new Date().toISOString()
      });
    }

    res.status(201).json({
      message: 'Membership created successfully.',
      membership,
      payment
    });
  } catch (err) {
    console.error('Error creating membership:', err);
    res.status(500).json({ error: 'Failed to create membership.' });
  }
});

// POST /api/memberships/:id/renew - Renew membership
// Keeps past membership in history, creates new membership record, updates current status
router.post('/:id/renew', (req, res) => {
  try {
    const { gymId, user } = req;
    const { id } = req.params;
    const { planName, startDate, endDate, amount, amountPaid, paymentMethod, notes } = req.body;

    // The :id can be existing membership ID or customer ID
    let existingMemb = db.memberships.findOne({ gymId, _id: id });
    let customerId = existingMemb?.customerId;

    if (!existingMemb) {
      // Check if :id is customerId
      const cust = db.customers.findOne({ gymId, customerId: id }) || db.customers.findOne({ gymId, _id: id });
      if (cust) {
        customerId = cust.customerId;
      }
    }

    if (!customerId) {
      return res.status(404).json({ error: 'Customer or existing membership not found.' });
    }

    const customer = db.customers.findOne({ gymId, customerId });
    if (!customer) {
      return res.status(404).json({ error: 'Customer record not found.' });
    }

    if (!planName || !startDate || !endDate) {
      return res.status(400).json({ error: 'Plan name, start date and end date are required for renewal.' });
    }

    const newStatus = calculateMembershipStatus(startDate, endDate);

    // Create a new fresh membership record (preserving previous in historical records!)
    const renewedMembership = db.memberships.insertOne({
      gymId,
      customerId,
      planName,
      startDate,
      endDate,
      amount: Number(amount) || 0,
      status: newStatus,
      isRenewal: true,
      renewedFrom: existingMemb ? existingMemb._id : null,
      notes: notes || '',
      createdBy: user.name,
      createdAt: new Date().toISOString()
    });

    // Record payment for the renewal (settled in full upfront)
    let payment = null;
    const total = Number(amount) || 0;
    const validMethods = ['UPI', 'Cash', 'Other'];
    const pMethod = validMethods.includes(paymentMethod) ? paymentMethod : 'UPI';

    if (total > 0) {
      payment = db.payments.insertOne({
        gymId,
        customerId,
        membershipId: renewedMembership._id,
        totalAmount: total,
        amountPaid: total,
        pendingAmount: 0,
        paymentMethod: pMethod,
        paymentDate: startDate || new Date().toISOString().split('T')[0],
        transactionReference: `PAY-${Date.now().toString().slice(-6)}`,
        notes: notes || 'Renewal payment settled in full upfront',
        createdAt: new Date().toISOString()
      });
    }

    res.status(201).json({
      message: `Membership successfully renewed for ${customer.name}!`,
      membership: renewedMembership,
      payment
    });
  } catch (err) {
    console.error('Error renewing membership:', err);
    res.status(500).json({ error: 'Failed to renew membership.' });
  }
});

// PATCH /api/memberships/:id/cancel - Cancel membership
router.patch('/:id/cancel', (req, res) => {
  try {
    const { gymId, user } = req;
    const { id } = req.params;
    const { reason = 'Cancelled by staff' } = req.body;

    const membership = db.memberships.findOne({ gymId, _id: id });
    if (!membership) {
      return res.status(404).json({ error: 'Membership not found.' });
    }

    const updated = db.memberships.updateOne(
      { _id: id },
      {
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
        cancelledBy: user.name,
        cancellationReason: reason
      }
    );

    res.json({ message: 'Membership cancelled successfully.', membership: updated });
  } catch (err) {
    console.error('Error cancelling membership:', err);
    res.status(500).json({ error: 'Failed to cancel membership.' });
  }
});

export default router;
