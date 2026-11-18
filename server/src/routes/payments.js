import express from 'express';
import { db } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

// GET /api/payments - List payments with filters
router.get('/', (req, res) => {
  try {
    const { gymId } = req;
    const { customerId, method, startDate, endDate } = req.query;

    let payments = db.payments.find({ gymId });

    if (customerId) {
      payments = payments.filter(p => p.customerId === customerId);
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
      const membership = db.memberships.findById(p.membershipId);

      return {
        ...p,
        customerName: customer ? customer.name : 'Unknown',
        customerPhone: customer?.contacts?.primary || '',
        planName: membership ? membership.planName : 'General / Add-on'
      };
    });

    // Sort descending by payment date
    populated.sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));

    // Calculate totals
    const totalCollected = populated.reduce((sum, p) => sum + (Number(p.amountPaid) || 0), 0);
    const totalPending = populated.reduce((sum, p) => sum + (Number(p.pendingAmount) || 0), 0);

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

// POST /api/payments - Record new payment (full or partial)
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
    const total = totalAmount ? Number(totalAmount) : paid;
    const pendingAmount = Math.max(0, total - paid);

    const txRef = `PAY-${Date.now().toString().slice(-6)}`;

    const newPayment = db.payments.insertOne({
      gymId,
      customerId,
      membershipId: membershipId || null,
      totalAmount: total,
      amountPaid: paid,
      pendingAmount,
      paymentMethod: paymentMethod || 'UPI',
      paymentDate: paymentDate || new Date().toISOString().split('T')[0],
      transactionReference: txRef,
      notes: notes || '',
      receivedBy: user.name,
      createdAt: new Date().toISOString()
    });

    res.status(201).json({
      message: `Payment of ₹${paid.toLocaleString('en-IN')} recorded successfully.`,
      payment: newPayment
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
        pendingAmount: payment.pendingAmount,
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
