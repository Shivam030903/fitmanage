import express from 'express';
import { db } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { enrichCustomer } from './customers.js';

const router = express.Router();
router.use(authMiddleware);

// GET /api/payments - List payments with filters
router.get('/', (req, res) => {
  try {
    const { gymId } = req;
    const { customerId, method, startDate, endDate, month } = req.query;

    let payments = db.payments.find({ gymId });

    if (customerId) {
      payments = payments.filter(p => p.customerId === customerId);
    }

    if (month && month !== 'all') {
      payments = payments.filter(p => (p.paymentDate && p.paymentDate.startsWith(month)) || (p.createdAt && p.createdAt.startsWith(month)));
    }

    if (method && method !== 'all') {
      payments = payments.filter(p => p.paymentMethod === method);
    }

    if (startDate) {
      payments = payments.filter(p => p.paymentDate >= startDate);
    }

    if (endDate) {
      payments = payments.filter(p => p.paymentDate <= endDate);
    }

    // Populate customer and membership plan
    const populated = payments.map(p => {
      const customer = db.customers.findOne({ gymId, customerId: p.customerId });
      const membership = p.membershipId ? db.memberships.findById(p.membershipId) : null;
      const enriched = customer ? enrichCustomer(customer, gymId) : null;

      // Use the customer's current actual pending dues so cleared dues are immediately shown
      const currentPending = enriched ? enriched.outstandingBalance : (Number(p.pendingAmount) || 0);

      return {
        ...p,
        pendingAmount: currentPending,
        customerName: customer ? customer.name : 'Unknown',
        customerPhone: customer?.contacts?.primary || '',
        customerContacts: customer?.contacts || {},
        planName: membership ? membership.planName : 'General / Add-on'
      };
    });

    // Sort descending by payment date
    populated.sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));

    // Calculate totals accurately across gym
    const totalCollected = populated.reduce((sum, p) => sum + (Number(p.amountPaid) || 0), 0);
    
    // Gym total pending balance from all customers' current actual balances
    const allCustomers = db.customers.find({ gymId });
    const totalPending = allCustomers.reduce((sum, c) => {
      const enriched = enrichCustomer(c, gymId);
      return sum + (Number(enriched.outstandingBalance) || 0);
    }, 0);

    res.json({
      payments: populated,
      total: populated.length,
      totalCollected,
      totalPending
    });
  } catch (err) {
    console.error('Error fetching payments:', err);
    res.status(500).json({ error: 'Failed to retrieve payments.' });
  }
});

// POST /api/payments - Record new payment (all settled at once)
router.post('/', (req, res) => {
  try {
    const { gymId, user } = req;
    const { customerId, membershipId, amountPaid, totalAmount, paymentMethod, paymentDate, notes } = req.body;

    if (!customerId || amountPaid === undefined || amountPaid === null) {
      return res.status(400).json({ error: 'Customer ID and amount paid are required.' });
    }

    const customer = db.customers.findOne({ gymId, customerId });
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    const paid = Number(amountPaid);
    const validMethods = ['UPI', 'Cash', 'Other'];
    const pMethod = validMethods.includes(paymentMethod) ? paymentMethod : 'UPI';

    const txRef = `PAY-${Date.now().toString().slice(-6)}`;

    // All settled at once, zero pending balance
    const newPayment = db.payments.insertOne({
      gymId,
      customerId,
      membershipId: membershipId || null,
      totalAmount: paid,
      amountPaid: paid,
      pendingAmount: 0,
      paymentMethod: pMethod,
      paymentDate: paymentDate || new Date().toISOString().split('T')[0],
      transactionReference: txRef,
      notes: notes || 'Full payment settled at once',
      receivedBy: user.name,
      createdAt: new Date().toISOString()
    });

    // Mark any previous payments for this customer as cleared
    const allPriorPayments = db.payments.find({ gymId, customerId });
    allPriorPayments.forEach(prev => {
      db.payments.updateOne({ _id: prev._id }, { pendingAmount: 0 });
    });

    res.status(201).json({
      message: `Payment of ₹${paid.toLocaleString('en-IN')} recorded and settled in full.`,
      payment: newPayment,
      outstandingBalance: 0
    });
  } catch (err) {
    console.error('Error recording payment:', err);
    res.status(500).json({ error: 'Failed to record payment.' });
  }
});

// GET /api/payments/:id/receipt - Get full receipt data for printable receipt
router.get('/:id/receipt', (req, res) => {
  try {
    const { gymId } = req;
    const { id } = req.params;

    const payment = db.payments.findOne({ gymId, _id: id }) || db.payments.findOne({ gymId, transactionReference: id });
    if (!payment) {
      return res.status(404).json({ error: 'Payment record not found.' });
    }

    const customer = db.customers.findOne({ gymId, customerId: payment.customerId });
    const gym = db.gyms.findById(gymId);
    const membership = payment.membershipId ? db.memberships.findById(payment.membershipId) : null;
    const enrichedCust = customer ? enrichCustomer(customer, gymId) : null;
    const currentPending = enrichedCust ? enrichedCust.outstandingBalance : (Number(payment.pendingAmount) || 0);

    res.json({
      receiptNumber: payment.transactionReference,
      paymentDate: payment.paymentDate,
      gym: {
        name: gym?.gymName || 'FitManage Club',
        address: gym?.address || '',
        phone: gym?.phone || '',
        email: gym?.email || '',
        gstin: gym?.gstin || ''
      },
      customer: {
        name: customer?.name || 'Customer',
        customerId: customer?.customerId || '',
        primaryPhone: customer?.contacts?.primary || '',
        address: customer?.address || ''
      },
      membership: {
        planName: membership?.planName || 'Gym Subscription',
        startDate: membership?.startDate || '',
        endDate: membership?.endDate || ''
      },
      payment: {
        totalAmount: payment.totalAmount,
        amountPaid: payment.amountPaid,
        pendingAmount: currentPending,
        paymentMethod: payment.paymentMethod,
        notes: payment.notes,
        receivedBy: payment.receivedBy || 'Staff'
      }
    });
  } catch (err) {
    console.error('Error generating receipt:', err);
    res.status(500).json({ error: 'Failed to fetch receipt data.' });
  }
});

export default router;
