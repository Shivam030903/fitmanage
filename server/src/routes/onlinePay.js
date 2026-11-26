import express from 'express';
import crypto from 'crypto';
import { db, calculateMembershipStatus, getDaysRemaining, getCustomerCurrentMembership } from '../db.js';
import { enrichCustomer } from './customers.js';
import { whatsappService } from '../services/whatsapp.js';

const router = express.Router();

/**
 * GET /api/online-pay/:token
 * Public checkout endpoint for a customer renewal.
 * :token can be a customerId (e.g. FIT-1001) or MongoDB _id.
 */
router.get('/:token', (req, res) => {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({ error: 'Customer identifier token is required.' });
    }

    // Locate customer by customerId or _id
    const customer = db.customers.findOne({ customerId: token }) || db.customers.findOne({ _id: token });
    if (!customer) {
      return res.status(404).json({ 
        error: 'Member profile not found. Please verify your renewal link or contact gym reception.' 
      });
    }

    const gym = db.gyms.findById(customer.gymId);
    if (!gym) {
      return res.status(404).json({ error: 'Gym details not found.' });
    }

    // Decorate customer with current membership & balance
    const enriched = enrichCustomer(customer, customer.gymId);

    // Active membership plans for this gym
    const plans = db.plans.find({ gymId: customer.gymId, active: true });

    // Payment gateway settings (excluding sensitive secret)
    const pg = gym.settings?.paymentGateway || {};
    const paymentConfig = {
      enabled: pg.enabled !== false,
      razorpayEnabled: Boolean(pg.razorpayEnabled && pg.razorpayKeyId),
      razorpayKeyId: pg.razorpayKeyId || '',
      upiEnabled: pg.upiEnabled !== false && Boolean(pg.upiId),
      upiId: pg.upiId || '',
      upiName: pg.upiName || gym.gymName || 'FitManage Club',
      allowCustomDues: pg.allowCustomDues !== false,
      allowPlanRenewal: pg.allowPlanRenewal !== false
    };

    res.json({
      customer: {
        _id: customer._id,
        customerId: customer.customerId,
        name: customer.name,
        phone: customer.contacts?.primary || '',
        email: customer.contacts?.email || '',
        avatar: customer.avatar || null
      },
      gym: {
        _id: gym._id,
        gymName: gym.gymName || 'FitManage Club',
        tagline: gym.tagline || 'Modern Gym & Fitness Studio',
        phone: gym.phone || '',
        email: gym.email || '',
        address: gym.address || '',
        logo: gym.logo || null
      },
      currentMembership: enriched.currentMembership ? {
        _id: enriched.currentMembership._id,
        planName: enriched.currentMembership.planName,
        startDate: enriched.currentMembership.startDate,
        endDate: enriched.currentMembership.endDate,
        status: enriched.status,
        daysRemaining: enriched.daysRemaining,
        isExpired: enriched.daysRemaining < 0
      } : null,
      status: enriched.status,
      daysRemaining: enriched.daysRemaining,
      outstandingBalance: enriched.outstandingBalance || 0,
      plans: plans.map(p => ({
        _id: p._id,
        name: p.name,
        durationDays: p.durationDays,
        price: p.price,
        description: p.description || ''
      })),
      paymentConfig
    });
  } catch (err) {
    console.error('Error fetching online pay data:', err);
    res.status(500).json({ error: 'Failed to load renewal checkout.' });
  }
});

/**
 * POST /api/online-pay/create-order
 * Generates an order for Razorpay checkout.
 */
router.post('/create-order', async (req, res) => {
  try {
    const { token, amount, planId, type = 'renewal' } = req.body;

    if (!token || !amount || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Valid customer token and amount are required.' });
    }

    const customer = db.customers.findOne({ customerId: token }) || db.customers.findOne({ _id: token });
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    const gym = db.gyms.findById(customer.gymId);
    if (!gym) {
      return res.status(404).json({ error: 'Gym not found.' });
    }

    const pg = gym.settings?.paymentGateway || {};
    const amountInPaise = Math.round(Number(amount) * 100);

    // If Razorpay is enabled with valid live/test API keys
    if (pg.razorpayEnabled && pg.razorpayKeyId && pg.razorpayKeySecret) {
      try {
        const authHeader = 'Basic ' + Buffer.from(`${pg.razorpayKeyId.trim()}:${pg.razorpayKeySecret.trim()}`).toString('base64');
        const response = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            amount: amountInPaise,
            currency: 'INR',
            receipt: `rcpt_${customer.customerId}_${Date.now().toString().slice(-6)}`,
            notes: {
              gymId: gym._id,
              customerId: customer.customerId,
              planId: planId || '',
              type
            }
          })
        });

        const orderData = await response.json();
        if (!response.ok) {
          console.error('Razorpay Order API error:', orderData);
          return res.status(400).json({ 
            error: orderData.error?.description || 'Could not initiate Razorpay order. Please try UPI or contact front desk.' 
          });
        }

        return res.json({
          orderId: orderData.id,
          amount: orderData.amount,
          currency: orderData.currency,
          keyId: pg.razorpayKeyId,
          gymName: gym.gymName
        });
      } catch (rErr) {
        console.error('Error contacting Razorpay:', rErr);
        return res.status(502).json({ error: 'Payment gateway communication failed: ' + rErr.message });
      }
    }

    // Fallback: If in test/demo mode or Razorpay credentials not provided, simulate order
    const mockOrderId = `order_demo_${Date.now().toString().slice(-8)}`;
    return res.json({
      orderId: mockOrderId,
      amount: amountInPaise,
      currency: 'INR',
      keyId: pg.razorpayKeyId || 'rzp_test_fitmanage_demo',
      gymName: gym.gymName,
      isDemo: true
    });
  } catch (err) {
    console.error('Error creating online payment order:', err);
    res.status(500).json({ error: 'Failed to create payment order.' });
  }
});

/**
 * POST /api/online-pay/verify
 * Verifies Razorpay signature or accepts UPI transaction confirmation,
 * creates the payment record, extends or creates membership, and sends WhatsApp receipt.
 */
router.post('/verify', async (req, res) => {
  try {
    const {
      token,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      planId,
      amount,
      type = 'renewal',
      paymentMethod = 'Razorpay',
      upiRef,
      isDemo
    } = req.body;

    if (!token || !amount || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Missing required payment verification details.' });
    }

    const customer = db.customers.findOne({ customerId: token }) || db.customers.findOne({ _id: token });
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    const gym = db.gyms.findById(customer.gymId);
    if (!gym) {
      return res.status(404).json({ error: 'Gym not found.' });
    }

    const pg = gym.settings?.paymentGateway || {};

    // If Razorpay live signature verification required
    if (paymentMethod === 'Razorpay' && !isDemo && pg.razorpayKeySecret && razorpay_order_id && razorpay_payment_id) {
      const generatedSignature = crypto
        .createHmac('sha256', pg.razorpayKeySecret.trim())
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (generatedSignature !== razorpay_signature) {
        return res.status(400).json({ error: 'Payment verification failed: Invalid transaction signature.' });
      }
    }

    // Find current active membership to calculate intelligent renewal start date
    const memberships = db.memberships.find({ gymId: gym._id, customerId: customer.customerId });
    const currentMemb = getCustomerCurrentMembership(memberships);

    let planName = 'General Membership';
    let durationDays = 30;

    if (planId) {
      const plan = db.plans.findOne({ gymId: gym._id, _id: planId }) || db.plans.findOne({ gymId: gym._id, name: planId });
      if (plan) {
        planName = plan.name;
        durationDays = Number(plan.durationDays) || 30;
      }
    } else if (currentMemb) {
      planName = currentMemb.planName;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    let newStartDate = todayStr;

    // If current membership is still active and has future end date, append duration to end date!
    if (currentMemb && currentMemb.endDate && currentMemb.endDate >= todayStr && currentMemb.status !== 'cancelled') {
      newStartDate = currentMemb.endDate;
    }

    const startDateObj = new Date(newStartDate);
    const endDateObj = new Date(startDateObj.getTime() + durationDays * 24 * 60 * 60 * 1000);
    const newEndDate = endDateObj.toISOString().split('T')[0];

    // 1. Create fresh renewed membership record
    let newMembership = null;
    if (type === 'renewal' || planId) {
      newMembership = db.memberships.insertOne({
        gymId: gym._id,
        customerId: customer.customerId,
        planName,
        startDate: newStartDate,
        endDate: newEndDate,
        amount: Number(amount),
        status: 'active',
        isRenewal: true,
        renewedFrom: currentMemb ? currentMemb._id : null,
        notes: `Online self-renewal (${paymentMethod}${isDemo ? ' Demo' : ''})`,
        createdBy: 'Online Self-Checkout',
        createdAt: new Date().toISOString()
      });
    }

    // 2. Record payment transaction in db.payments
    const txRef = `PAY-ONL-${Date.now().toString().slice(-6)}`;
    const newPayment = db.payments.insertOne({
      gymId: gym._id,
      customerId: customer.customerId,
      membershipId: newMembership ? newMembership._id : (currentMemb ? currentMemb._id : null),
      totalAmount: Number(amount),
      amountPaid: Number(amount),
      pendingAmount: 0,
      paymentMethod: paymentMethod === 'UPI' ? 'UPI Online' : 'Razorpay',
      paymentDate: todayStr,
      transactionReference: txRef,
      gatewayPaymentId: razorpay_payment_id || null,
      gatewayOrderId: razorpay_order_id || null,
      upiReference: upiRef || null,
      notes: `Online self-service payment (${planName})`,
      receivedBy: 'Online Portal Gateway',
      createdAt: new Date().toISOString()
    });

    // 3. Clear any historical pending amount for this customer
    const priorPayments = db.payments.find({ gymId: gym._id, customerId: customer.customerId });
    priorPayments.forEach(p => {
      if (p.pendingAmount > 0) {
        db.payments.updateOne({ _id: p._id }, { pendingAmount: 0 });
      }
    });

    // 4. Send Automated WhatsApp Confirmation & Digital Receipt
    const formattedDate = new Date(newEndDate).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });

    const waMessage = `🎉 *Payment Received & Membership Confirmed!*\n\nHi ${customer.name || 'Member'}! 👋\n\nYour online payment of *₹${Number(amount).toLocaleString('en-IN')}* for *${planName}* has been successfully processed.\n\n📄 *Receipt Ref:* ${txRef}\n🗓 *New Expiry Date:* ${formattedDate}\n💳 *Payment Method:* ${paymentMethod}\n\nThank you for choosing ${gym.gymName}! Your uninterrupted gym access is ready. Keep pushing your fitness boundaries! 💪🏋️\n\n_${gym.gymName}_`;

    if (customer.contacts?.primary) {
      whatsappService.sendAutomatedWhatsApp({
        gymId: gym._id,
        customerId: customer.customerId,
        membershipId: newMembership ? newMembership._id : null,
        contactNumber: customer.contacts.primary,
        reminderType: 'renewal_confirmation',
        message: waMessage,
        staffName: 'Online Payment Gateway'
      }).catch(err => {
        console.warn('[OnlinePay] WhatsApp alert notification warning:', err.message);
      });
    }

    res.json({
      success: true,
      message: 'Payment verified and membership renewed successfully!',
      receiptNumber: txRef,
      payment: newPayment,
      membership: newMembership,
      newStartDate,
      newEndDate,
      planName,
      amount: Number(amount),
      gymName: gym.gymName
    });
  } catch (err) {
    console.error('Error verifying online payment:', err);
    res.status(500).json({ error: 'Failed to verify payment: ' + err.message });
  }
});

export default router;
