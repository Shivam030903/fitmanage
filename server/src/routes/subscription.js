import express from 'express';
import crypto from 'crypto';
import { db, SAAS_PLANS, getGymSubscription } from '../db.js';
import { authMiddleware, roleCheck } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

/**
 * GET /api/subscription
 * Get current gym's SaaS platform subscription, member quota, and available plans.
 */
router.get('/', (req, res) => {
  try {
    const { gymId } = req;
    const gym = db.gyms.findById(gymId);
    if (!gym) {
      return res.status(404).json({ error: 'Gym not found.' });
    }

    const sub = getGymSubscription(gym);
    const currentMembersCount = db.customers.find({ gymId }).length;
    const currentStaffCount = db.users.find({ gymId }).length;
    const history = db.subscriptions.find({ gymId }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      subscription: sub,
      currentMembersCount,
      currentStaffCount,
      plans: SAAS_PLANS,
      billingHistory: history,
      platformRazorpayKey: process.env.PLATFORM_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || 'rzp_test_fitmanage_platform'
    });
  } catch (err) {
    console.error('Error fetching subscription:', err);
    res.status(500).json({ error: 'Failed to load subscription details.' });
  }
});

/**
 * POST /api/subscription/create-order
 * Create an order for SaaS plan upgrade/subscription.
 */
router.post('/create-order', roleCheck(['owner', 'admin']), async (req, res) => {
  try {
    const { gymId } = req;
    const { planId, billingCycle = 'monthly' } = req.body;

    const plan = SAAS_PLANS[planId];
    if (!plan) {
      return res.status(400).json({ error: 'Invalid SaaS plan selected.' });
    }

    const gym = db.gyms.findById(gymId);
    if (!gym) {
      return res.status(404).json({ error: 'Gym not found.' });
    }

    const amount = billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
    const amountInPaise = Math.round(amount * 100);

    const platformKeyId = process.env.PLATFORM_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
    const platformKeySecret = process.env.PLATFORM_RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET;

    // If live platform keys are configured, use Razorpay Orders API
    if (platformKeyId && platformKeySecret) {
      try {
        const authHeader = 'Basic ' + Buffer.from(`${platformKeyId.trim()}:${platformKeySecret.trim()}`).toString('base64');
        const response = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            amount: amountInPaise,
            currency: 'INR',
            receipt: `sub_${gymId}_${Date.now().toString().slice(-6)}`,
            notes: {
              gymId,
              planId,
              billingCycle,
              gymName: gym.gymName
            }
          })
        });

        const orderData = await response.json();
        if (!response.ok) {
          console.error('Razorpay Subscription Order Error:', orderData);
          return res.status(400).json({ error: orderData.error?.description || 'Could not initiate Razorpay order.' });
        }

        return res.json({
          orderId: orderData.id,
          amount: orderData.amount,
          currency: orderData.currency,
          keyId: platformKeyId,
          planId,
          planName: plan.name,
          billingCycle
        });
      } catch (err) {
        console.error('Error connecting to Razorpay:', err);
      }
    }

    // Demo / instant simulation order fallback
    return res.json({
      orderId: `sub_demo_${Date.now().toString().slice(-8)}`,
      amount: amountInPaise,
      currency: 'INR',
      keyId: platformKeyId || 'rzp_test_fitmanage_platform',
      planId,
      planName: plan.name,
      billingCycle,
      isDemo: true
    });
  } catch (err) {
    console.error('Error creating subscription order:', err);
    res.status(500).json({ error: 'Failed to create subscription order.' });
  }
});

/**
 * POST /api/subscription/verify
 * Verifies payment and activates the SaaS plan.
 */
router.post('/verify', roleCheck(['owner', 'admin']), async (req, res) => {
  try {
    const { gymId, user } = req;
    const {
      planId,
      billingCycle = 'monthly',
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      isDemo
    } = req.body;

    const plan = SAAS_PLANS[planId];
    if (!plan) {
      return res.status(400).json({ error: 'Invalid SaaS plan selected.' });
    }

    const gym = db.gyms.findById(gymId);
    if (!gym) {
      return res.status(404).json({ error: 'Gym not found.' });
    }

    const platformKeySecret = process.env.PLATFORM_RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET;

    // Live Razorpay signature check if configured
    if (!isDemo && platformKeySecret && razorpay_order_id && razorpay_payment_id) {
      const generatedSignature = crypto
        .createHmac('sha256', platformKeySecret.trim())
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (generatedSignature !== razorpay_signature) {
        return res.status(400).json({ error: 'Subscription payment verification failed: Invalid signature.' });
      }
    }

    const amount = billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
    const now = new Date();
    const durationDays = billingCycle === 'yearly' ? 365 : 30;
    const periodEnd = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const txRef = razorpay_payment_id || `SUB-INV-${Date.now().toString().slice(-6)}`;

    // 1. Update gym subscription in db
    const updatedGym = db.gyms.updateOne(
      { _id: gymId },
      {
        subscription: {
          plan: planId,
          status: 'active',
          billingCycle,
          currentPeriodStart: now.toISOString(),
          currentPeriodEnd: periodEnd.toISOString(),
          amount,
          lastPaymentDate: now.toISOString(),
          lastPaymentRef: txRef,
          memberLimit: plan.memberLimit,
          staffLimit: plan.staffLimit,
          features: plan.features
        },
        isLocked: false,
        lockReason: ''
      }
    );

    // 2. Record invoice in subscriptions collection
    const invoice = db.subscriptions.insertOne({
      gymId,
      gymName: gym.gymName,
      planId,
      planName: plan.name,
      billingCycle,
      amount,
      status: 'active',
      periodStart: now.toISOString(),
      periodEnd: periodEnd.toISOString(),
      transactionReference: txRef,
      gatewayPaymentId: razorpay_payment_id || null,
      gatewayOrderId: razorpay_order_id || null,
      paidBy: user.name,
      createdAt: now.toISOString()
    });

    res.json({
      success: true,
      message: `Congratulations! Your gym has been upgraded to FitManage ${plan.name} (${billingCycle}).`,
      subscription: getGymSubscription(updatedGym),
      invoice
    });
  } catch (err) {
    console.error('Error verifying subscription:', err);
    res.status(500).json({ error: 'Failed to verify subscription: ' + err.message });
  }
});

/**
 * GET /api/subscription/invoices
 * Get billing invoices for this gym.
 */
router.get('/invoices', (req, res) => {
  try {
    const { gymId } = req;
    const invoices = db.subscriptions.find({ gymId }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ invoices });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve invoices.' });
  }
});

export default router;
