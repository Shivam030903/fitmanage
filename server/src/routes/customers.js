import express from 'express';
import { db, calculateMembershipStatus, getDaysRemaining, getCustomerCurrentMembership } from '../db.js';
import { authMiddleware, roleCheck } from '../middleware/auth.js';
import { whatsappService } from '../services/whatsapp.js';

const router = express.Router();

// Apply auth to all customer routes
router.use(authMiddleware);

// Helper to generate next unique customer ID
function generateCustomerId(gymId) {
  const existing = db.customers.find({ gymId });
  let maxNum = 1000;
  for (const c of existing) {
    if (c.customerId && c.customerId.startsWith('FIT-')) {
      const num = parseInt(c.customerId.replace('FIT-', ''), 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }
  return `FIT-${maxNum + 1}`;
}

// Helper to decorate customer with latest membership & payment balance
export function enrichCustomer(customer, gymId) {
  const memberships = db.memberships.find({ gymId, customerId: customer.customerId });

  // Intelligently select current membership (active first, then upcoming, then most recently expired)
  const currentMembership = getCustomerCurrentMembership(memberships);

  let currentStatus = 'unsubscribed';
  let daysRemaining = 0;

  if (currentMembership) {
    currentStatus = calculateMembershipStatus(
      currentMembership.startDate,
      currentMembership.endDate,
      currentMembership.status === 'cancelled'
    );
    daysRemaining = getDaysRemaining(currentMembership.endDate);
  }

  // Calculate payments & outstanding balance (excluding cancelled memberships)
  const payments = db.payments.find({ gymId, customerId: customer.customerId });
  const nonCancelled = memberships.filter(m => m.status !== 'cancelled');
  const totalBilled = nonCancelled.reduce((acc, m) => acc + (Number(m.amount) || 0), 0);
  const totalPaid = payments.reduce((acc, p) => acc + (Number(p.amountPaid) || 0), 0);
  const outstandingBalance = Math.max(0, totalBilled - totalPaid);

  let paymentStatus = 'paid';
  if (totalBilled > 0) {
    if (totalPaid === 0) paymentStatus = 'unpaid';
    else if (totalPaid < totalBilled) paymentStatus = 'partial';
  }

  return {
    ...customer,
    currentMembership,
    currentStatus,
    daysRemaining,
    totalBilled,
    totalPaid,
    outstandingBalance,
    paymentStatus,
    totalMembershipsCount: memberships.length
  };
}

// GET /api/customers - List & search with filters
router.get('/', (req, res) => {
  try {
    const { gymId } = req;
    const { search, status, plan, paymentStatus, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    let customers = db.customers.find({ gymId });

    // Enrich each customer
    let enriched = customers.map(c => enrichCustomer(c, gymId));

    // Search filter: name, customerId, primary phone, secondary phone
    if (search && search.trim()) {
      const query = search.trim().toLowerCase();
      enriched = enriched.filter(c =>
        (c.name && c.name.toLowerCase().includes(query)) ||
        (c.customerId && c.customerId.toLowerCase().includes(query)) ||
        (c.contacts?.primary && c.contacts.primary.includes(query))
      );
    }

    // Status filter: active, expiring_soon, expired, upcoming, cancelled
    if (status && status !== 'all') {
      enriched = enriched.filter(c => c.currentStatus === status);
    }

    // Plan filter
    if (plan && plan !== 'all') {
      enriched = enriched.filter(c => c.currentMembership?.planName === plan);
    }

    // Payment status filter: paid, partial, unpaid
    if (paymentStatus && paymentStatus !== 'all') {
      enriched = enriched.filter(c => c.paymentStatus === paymentStatus);
    }

    // Sorting
    enriched.sort((a, b) => {
      let valA, valB;
      if (sortBy === 'name') {
        valA = a.name.toLowerCase();
        valB = b.name.toLowerCase();
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      } else if (sortBy === 'expiryDate') {
        valA = a.currentMembership ? new Date(a.currentMembership.endDate).getTime() : 0;
        valB = b.currentMembership ? new Date(b.currentMembership.endDate).getTime() : 0;
      } else if (sortBy === 'outstandingBalance') {
        valA = a.outstandingBalance;
        valB = b.outstandingBalance;
      } else {
        // default createdAt
        valA = new Date(a.createdAt).getTime();
        valB = new Date(b.createdAt).getTime();
      }

      return sortOrder === 'asc' ? valA - valB : valB - valA;
    });

    res.json({
      customers: enriched,
      total: enriched.length
    });
  } catch (err) {
    console.error('Error fetching customers:', err);
    res.status(500).json({ error: 'Failed to retrieve customers.' });
  }
});

// GET /api/customers/:id - Single customer profile with complete history
router.get('/:id', (req, res) => {
  try {
    const { gymId } = req;
    const { id } = req.params;

    // Search by _id or customerId
    const customer = db.customers.findOne({ gymId, _id: id }) || db.customers.findOne({ gymId, customerId: id });
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    const enriched = enrichCustomer(customer, gymId);

    // Fetch full membership history (sorted descending)
    const membershipHistory = db.memberships.find({ gymId, customerId: customer.customerId })
      .map(m => ({
        ...m,
        computedStatus: calculateMembershipStatus(m.startDate, m.endDate, m.status === 'cancelled'),
        daysRemaining: getDaysRemaining(m.endDate)
      }))
      .sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

    // Fetch full payment history
    const paymentHistory = db.payments.find({ gymId, customerId: customer.customerId })
      .sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));

    // Fetch reminder history
    const reminderHistory = db.reminderLogs.find({ gymId, customerId: customer.customerId })
      .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));

    res.json({
      customer: enriched,
      membershipHistory,
      paymentHistory,
      reminderHistory
    });
  } catch (err) {
    console.error('Error fetching customer detail:', err);
    res.status(500).json({ error: 'Failed to retrieve customer details.' });
  }
});

// POST /api/customers - Create new customer (with optional initial membership and payment)
router.post('/', async (req, res) => {
  try {
    const { gymId, user } = req;
    const {
      name,
      gender = '',
      dateOfBirth = '',
      profilePhoto = '',
      contacts = {},
      address = '',
      notes = '',
      initialPlan = null // { planName, startDate, endDate, amount, amountPaid, paymentMethod }
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Customer name is required.' });
    }

    if (!contacts.primary || !contacts.primary.trim()) {
      return res.status(400).json({ error: 'Primary mobile number is required.' });
    }

    // Clean phone numbers (strip non-digits, keep standard 10-digit Indian mobile)
    const cleanPhone = (p) => p ? p.replace(/\D/g, '').slice(-10) : '';

    const normalizedContacts = {
      primary: cleanPhone(contacts.primary)
    };

    const customerId = generateCustomerId(gymId);

    const newCustomer = db.customers.insertOne({
      gymId,
      customerId,
      name: name.trim(),
      gender,
      dateOfBirth,
      profilePhoto,
      contacts: normalizedContacts,
      address: address.trim(),
      notes: notes.trim(),
      createdAt: new Date().toISOString()
    });

    let createdMembership = null;
    let createdPayment = null;

    // If initial membership details were supplied
    if (initialPlan && initialPlan.planName && initialPlan.startDate && initialPlan.endDate) {
      const membStatus = calculateMembershipStatus(initialPlan.startDate, initialPlan.endDate);
      const totalAmount = Number(initialPlan.amount) || 0;

      createdMembership = db.memberships.insertOne({
        gymId,
        customerId,
        planName: initialPlan.planName,
        startDate: initialPlan.startDate,
        endDate: initialPlan.endDate,
        amount: totalAmount,
        status: membStatus,
        createdBy: user.name,
        createdAt: new Date().toISOString()
      });

      // All settled at once, no partial payments
      const validMethods = ['UPI', 'Cash', 'Other'];
      const pMethod = validMethods.includes(initialPlan.paymentMethod) ? initialPlan.paymentMethod : 'UPI';

      createdPayment = db.payments.insertOne({
        gymId,
        customerId,
        membershipId: createdMembership._id,
        totalAmount,
        amountPaid: totalAmount, // Settled in full
        pendingAmount: 0,
        paymentMethod: pMethod,
        paymentDate: initialPlan.startDate || new Date().toISOString().split('T')[0],
        transactionReference: `PAY-${Date.now().toString().slice(-6)}`,
        notes: initialPlan.notes || 'Full upfront payment cleared',
        createdAt: new Date().toISOString()
      });
    }

    const enriched = enrichCustomer(newCustomer, gymId);

    // Automatically send WhatsApp welcome message via background service
    let whatsappResult = null;
    try {
      whatsappResult = await whatsappService.sendWelcomeMessage({
        customer: enriched,
        membership: createdMembership,
        gymId,
        staffName: user.name
      });
    } catch (waErr) {
      console.error('Error dispatching automated WhatsApp welcome:', waErr);
    }

    res.status(201).json({
      message: 'Customer registered successfully!',
      customer: enriched,
      membership: createdMembership,
      payment: createdPayment,
      whatsappStatus: whatsappResult
    });
  } catch (err) {
    console.error('Error creating customer:', err);
    res.status(500).json({ error: 'Failed to create customer.' });
  }
});

// PUT /api/customers/:id - Update customer profile & contacts
router.put('/:id', (req, res) => {
  try {
    const { gymId } = req;
    const { id } = req.params;
    const { name, gender, dateOfBirth, profilePhoto, contacts, address, notes } = req.body;

    const existing = db.customers.findOne({ gymId, _id: id }) || db.customers.findOne({ gymId, customerId: id });
    if (!existing) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    const cleanPhone = (p) => p ? p.replace(/\D/g, '').slice(-10) : '';

    const updateFields = {};
    if (name) updateFields.name = name.trim();
    if (gender !== undefined) updateFields.gender = gender;
    if (dateOfBirth !== undefined) updateFields.dateOfBirth = dateOfBirth;
    if (profilePhoto !== undefined) updateFields.profilePhoto = profilePhoto;
    if (address !== undefined) updateFields.address = address.trim();
    if (notes !== undefined) updateFields.notes = notes.trim();
    if (contacts) {
      updateFields.contacts = {
        primary: cleanPhone(contacts.primary || existing.contacts?.primary)
      };
    }

    const updated = db.customers.updateOne({ _id: existing._id }, updateFields);
    const enriched = enrichCustomer(updated, gymId);

    res.json({
      message: 'Customer profile updated successfully.',
      customer: enriched
    });
  } catch (err) {
    console.error('Error updating customer:', err);
    res.status(500).json({ error: 'Failed to update customer.' });
  }
});

// DELETE /api/customers/:id - Delete customer (only owner or admin)
router.delete('/:id', roleCheck(['owner', 'admin']), (req, res) => {
  try {
    const { gymId } = req;
    const { id } = req.params;

    const existing = db.customers.findOne({ gymId, _id: id }) || db.customers.findOne({ gymId, customerId: id });
    if (!existing) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    // Cascade delete associated memberships, payments, and reminders
    const custId = existing.customerId;
    const memberships = db.memberships.find({ gymId, customerId: custId });
    memberships.forEach(m => db.memberships.deleteOne({ _id: m._id }));

    const payments = db.payments.find({ gymId, customerId: custId });
    payments.forEach(p => db.payments.deleteOne({ _id: p._id }));

    const reminderLogs = db.reminderLogs.find({ gymId, customerId: custId });
    reminderLogs.forEach(r => db.reminderLogs.deleteOne({ _id: r._id }));

    db.customers.deleteOne({ _id: existing._id });

    res.json({ 
      message: `Customer ${existing.name} (${existing.customerId}) and all associated records deleted successfully.` 
    });
  } catch (err) {
    console.error('Error deleting customer:', err);
    res.status(500).json({ error: 'Failed to delete customer.' });
  }
});

export default router;
