import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db, SAAS_PLANS, getGymSubscription } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fitmanage_super_secret_jwt_key_2026';

// Middleware to ensure user is SuperAdmin (or founder email)
const superAdminOnly = (req, res, next) => {
  if (req.isSuperAdmin || req.user?.email === 'soravjain453@gmail.com' || req.user?.role === 'superadmin') {
    return next();
  }
  return res.status(403).json({ error: 'Access denied. SaaS Founder / Super Admin privileges required.' });
};

router.use(authMiddleware);
router.use(superAdminOnly);

/**
 * GET /api/super-admin/stats
 * High-level SaaS platform metrics for the founder.
 */
router.get('/stats', (req, res) => {
  try {
    const gyms = db.gyms.find({});
    const customers = db.customers.find({});
    const payments = db.payments.find({});
    const reminderLogs = db.reminderLogs.find({});
    const subscriptions = db.subscriptions.find({});

    let mrr = 0;
    let trialCount = 0;
    let activePaidCount = 0;
    let expiredCount = 0;
    let lockedCount = 0;

    const planBreakdown = {
      starter: 0,
      growth: 0,
      pro: 0
    };

    gyms.forEach(gym => {
      const sub = getGymSubscription(gym);
      if (gym.isLocked) {
        lockedCount++;
      }

      if (sub.status === 'trial') {
        trialCount++;
      } else if (sub.status === 'active') {
        activePaidCount++;
        const plan = SAAS_PLANS[sub.plan] || SAAS_PLANS.pro;
        if (sub.billingCycle === 'yearly') {
          mrr += Math.round(plan.yearlyPrice / 12);
        } else {
          mrr += plan.monthlyPrice;
        }
      } else if (sub.status === 'expired') {
        expiredCount++;
      }

      if (planBreakdown[sub.plan] !== undefined) {
        planBreakdown[sub.plan]++;
      }
    });

    // WhatsApp Fleet Delivery Health
    const totalWhatsAppSent = reminderLogs.length;
    const deliveredCount = reminderLogs.filter(r => r.status === 'DELIVERED' || r.status === 'DELIVERED_AUTOMATIC').length;
    const failedCount = reminderLogs.filter(r => r.status === 'FAILED').length;
    const waHealthRate = totalWhatsAppSent > 0 ? Math.round((deliveredCount / totalWhatsAppSent) * 100) : 100;

    // Total Gym Member Payments processed across all gyms
    const totalPaymentsVolume = payments.reduce((acc, p) => acc + (Number(p.amountPaid) || 0), 0);

    res.json({
      mrr,
      arr: mrr * 12,
      totalGyms: gyms.length,
      activePaidCount,
      trialCount,
      expiredCount,
      lockedCount,
      planBreakdown,
      totalMembers: customers.length,
      totalPaymentsVolume,
      totalPaymentsCount: payments.length,
      whatsAppHealth: {
        totalSent: totalWhatsAppSent,
        delivered: deliveredCount,
        failed: failedCount,
        healthPercentage: waHealthRate
      }
    });
  } catch (err) {
    console.error('Error in super-admin stats:', err);
    res.status(500).json({ error: 'Failed to retrieve SaaS metrics.' });
  }
});

/**
 * GET /api/super-admin/gyms
 * List of all gyms with complete subscription, member, and revenue metrics.
 */
router.get('/gyms', (req, res) => {
  try {
    const { search, plan, status } = req.query;
    let gyms = db.gyms.find({});

    let enriched = gyms.map(gym => {
      const sub = getGymSubscription(gym);
      const members = db.customers.find({ gymId: gym._id });
      const staffUsers = db.users.find({ gymId: gym._id });
      const gymPayments = db.payments.find({ gymId: gym._id });
      const ownerUser = staffUsers.find(u => u.role === 'owner') || staffUsers[0] || null;

      const totalRevenue = gymPayments.reduce((sum, p) => sum + (Number(p.amountPaid) || 0), 0);
      const waSettings = gym.settings?.whatsapp || {};

      return {
        _id: gym._id,
        gymName: gym.gymName,
        phone: gym.phone,
        email: gym.email,
        address: gym.address,
        createdAt: gym.createdAt,
        owner: ownerUser ? {
          _id: ownerUser._id,
          name: ownerUser.name,
          email: ownerUser.email,
          phone: ownerUser.phone
        } : null,
        subscription: sub,
        isLocked: Boolean(gym.isLocked),
        lockReason: gym.lockReason || '',
        membersCount: members.length,
        staffCount: staffUsers.length,
        totalRevenue,
        whatsAppProvider: waSettings.provider || 'whatsapp_qr',
        isMetaConfigured: Boolean(waSettings.meta?.phoneNumberId && waSettings.meta?.accessToken)
      };
    });

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      enriched = enriched.filter(g =>
        g.gymName?.toLowerCase().includes(q) ||
        g.owner?.name?.toLowerCase().includes(q) ||
        g.owner?.email?.toLowerCase().includes(q) ||
        g.phone?.includes(q)
      );
    }

    if (plan && plan !== 'all') {
      enriched = enriched.filter(g => g.subscription?.plan === plan);
    }

    if (status && status !== 'all') {
      if (status === 'locked') {
        enriched = enriched.filter(g => g.isLocked);
      } else {
        enriched = enriched.filter(g => g.subscription?.status === status && !g.isLocked);
      }
    }

    enriched.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ gyms: enriched, total: enriched.length });
  } catch (err) {
    console.error('Error listing gyms for super-admin:', err);
    res.status(500).json({ error: 'Failed to retrieve gym directory.' });
  }
});

/**
 * POST /api/super-admin/gyms
 * Direct onboarding of a new gym and owner account by Super Admin.
 */
router.post('/gyms', async (req, res) => {
  try {
    const {
      gymName,
      ownerName,
      ownerEmail,
      ownerPhone = '',
      password = 'password123',
      address = '',
      planId = 'pro',
      billingCycle = 'monthly',
      status = 'trial', // 'trial' or 'active'
      trialDays = 14,
      whatsAppProvider = 'whatsapp_qr'
    } = req.body;

    if (!gymName || !gymName.trim()) {
      return res.status(400).json({ error: 'Gym Name is required.' });
    }
    if (!ownerName || !ownerName.trim()) {
      return res.status(400).json({ error: 'Owner Full Name is required.' });
    }
    if (!ownerEmail || !ownerEmail.trim()) {
      return res.status(400).json({ error: 'Owner Email Address is required.' });
    }

    const cleanEmail = ownerEmail.toLowerCase().trim();
    const existingUser = db.users.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(400).json({ error: `An account with email "${cleanEmail}" already exists in the system.` });
    }

    const plan = SAAS_PLANS[planId] || SAAS_PLANS.pro;
    const gymId = `gym_${Date.now()}`;
    const now = new Date();
    const durationDays = status === 'trial' ? Number(trialDays) || 14 : 30;
    const periodEnd = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    // 1. Create Gym Record
    const gym = db.gyms.insertOne({
      _id: gymId,
      gymName: gymName.trim(),
      address: address.trim(),
      phone: ownerPhone.trim(),
      email: cleanEmail,
      isLocked: false,
      lockReason: '',
      subscription: {
        plan: planId,
        status,
        billingCycle,
        currentPeriodStart: now.toISOString(),
        currentPeriodEnd: periodEnd.toISOString(),
        trialEndDate: periodEnd.toISOString(),
        memberLimit: plan.memberLimit,
        staffLimit: plan.staffLimit,
        features: plan.features
      },
      settings: {
        currency: 'INR',
        currencySymbol: '₹',
        timezone: 'Asia/Kolkata',
        expiryReminderDays: [7, 3, 1, 0, -1],
        allowPartialAccess: true,
        occupancy: {
          currentMembers: 0,
          maxCapacity: 50
        },
        whatsapp: {
          provider: whatsAppProvider,
          autoWelcome: true,
          meta: {
            phoneNumberId: '',
            accessToken: '',
            businessAccountId: ''
          }
        },
        multiStageExpiry: {
          enabled: true,
          stages: {
            stage_7days: {
              enabled: true,
              days: 7,
              template: `Hello {customerName}! 👋\n\nA friendly reminder that your {planName} membership at {gymName} will expire in 7 days on {expiryDate}.\n\nRenew early to maintain uninterrupted access! 💪\n\n_{gymName}_`
            },
            stage_1day: {
              enabled: true,
              days: 1,
              template: `Hi {customerName}! ⏰\n\nYour gym membership at {gymName} expires TOMORROW ({expiryDate})!\n\nRenew today to keep your workout streak alive. 🏋️‍♂️\n\n_{gymName}_`
            },
            stage_expiry_day: {
              enabled: true,
              days: 0,
              template: `Important Notice, {customerName}! ⚠️\n\nYour {planName} membership at {gymName} expires TODAY ({expiryDate}).\n\nPlease visit the front desk to renew today! 🚀\n\n_{gymName}_`
            }
          }
        }
      },
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    });

    // 2. Create Default Membership Plans for this gym
    const defaultPlans = [
      { gymId, name: 'Monthly Standard', durationDays: 30, price: 1500, description: '30 days gym access', active: true },
      { gymId, name: 'Quarterly', durationDays: 90, price: 4000, description: '90 days access', active: true },
      { gymId, name: 'Half-Yearly', durationDays: 180, price: 7500, description: '180 days access', active: true },
      { gymId, name: 'Yearly VIP', durationDays: 365, price: 13000, description: '1 year all inclusive', active: true }
    ];
    defaultPlans.forEach(p => db.plans.insertOne(p));

    // 3. Create Owner User
    const plainPassword = password.trim() || 'password123';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(plainPassword, salt);

    const user = db.users.insertOne({
      name: ownerName.trim(),
      email: cleanEmail,
      password: hashedPassword,
      phone: ownerPhone.trim(),
      gymId: gym._id,
      role: 'owner',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    });

    // 4. Record Initial Subscription in db.subscriptions
    db.subscriptions.insertOne({
      gymId: gym._id,
      gymName: gym.gymName,
      planId,
      planName: plan.name,
      billingCycle,
      amount: status === 'active' ? plan.monthlyPrice : 0,
      status: status === 'trial' ? 'trial_initiated' : 'provisioned_by_founder',
      periodStart: now.toISOString(),
      periodEnd: periodEnd.toISOString(),
      transactionReference: `ADMIN-ONBOARD-${Date.now().toString().slice(-6)}`,
      paidBy: req.user?.name || 'SuperAdmin',
      createdAt: now.toISOString()
    });

    res.status(201).json({
      success: true,
      message: `🎉 Gym "${gym.gymName}" onboarded successfully!`,
      gym,
      owner: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      },
      credentials: {
        email: cleanEmail,
        password: plainPassword
      }
    });
  } catch (err) {
    console.error('Super-admin create gym error:', err);
    res.status(500).json({ error: 'Failed to onboard gym: ' + err.message });
  }
});

/**
 * DELETE /api/super-admin/gyms/:id
 * Delete a gym account and its associated records (Super Admin only).
 */
router.delete('/gyms/:id', (req, res) => {
  try {
    const { id } = req.params;
    const gym = db.gyms.findById(id);
    if (!gym) {
      return res.status(404).json({ error: 'Gym not found.' });
    }

    // Delete gym record
    db.gyms.deleteOne({ _id: id });
    
    // Delete users associated with this gym (never delete superadmin user)
    const gymUsers = db.users.find({ gymId: id }).filter(u => u.role !== 'superadmin');
    gymUsers.forEach(u => db.users.deleteOne({ _id: u._id }));

    // Delete related records
    db.customers.deleteMany({ gymId: id });
    db.memberships.deleteMany({ gymId: id });
    db.payments.deleteMany({ gymId: id });
    db.attendance.deleteMany({ gymId: id });
    db.leads.deleteMany({ gymId: id });
    db.plans.deleteMany({ gymId: id });

    res.json({
      success: true,
      message: `Gym "${gym.gymName}" and all associated data have been permanently removed.`
    });
  } catch (err) {
    console.error('Super-admin delete gym error:', err);
    res.status(500).json({ error: 'Failed to delete gym: ' + err.message });
  }
});

/**
 * POST /api/super-admin/gyms/:id/toggle-lock
 * Lock or unlock a gym account.
 */
router.post('/gyms/:id/toggle-lock', (req, res) => {
  try {
    const { id } = req.params;
    const { lock, reason } = req.body;

    const gym = db.gyms.findById(id);
    if (!gym) {
      return res.status(404).json({ error: 'Gym not found.' });
    }

    const updated = db.gyms.updateOne(
      { _id: id },
      {
        isLocked: Boolean(lock),
        lockReason: lock ? (reason || 'Subscription payment lapsed. Please contact billing.') : ''
      }
    );

    res.json({
      message: lock ? `Gym ${gym.gymName} has been locked.` : `Gym ${gym.gymName} unlocked.`,
      gym: updated
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update gym lock status.' });
  }
});

/**
 * POST /api/super-admin/gyms/:id/change-plan
 * Manually grant or update a gym's SaaS plan and extension days.
 */
router.post('/gyms/:id/change-plan', (req, res) => {
  try {
    const { id } = req.params;
    const { planId, status = 'active', extendDays = 30, billingCycle = 'monthly' } = req.body;

    const gym = db.gyms.findById(id);
    if (!gym) {
      return res.status(404).json({ error: 'Gym not found.' });
    }

    const plan = SAAS_PLANS[planId] || SAAS_PLANS.pro;
    const now = new Date();
    const periodEnd = new Date(now.getTime() + Number(extendDays) * 24 * 60 * 60 * 1000);

    const updated = db.gyms.updateOne(
      { _id: id },
      {
        subscription: {
          plan: planId,
          status,
          billingCycle,
          currentPeriodStart: now.toISOString(),
          currentPeriodEnd: periodEnd.toISOString(),
          trialEndDate: status === 'trial' ? periodEnd.toISOString() : (gym.subscription?.trialEndDate || now.toISOString()),
          memberLimit: plan.memberLimit,
          staffLimit: plan.staffLimit,
          features: plan.features
        },
        isLocked: false,
        lockReason: ''
      }
    );

    // Record grant in subscriptions collection
    db.subscriptions.insertOne({
      gymId: gym._id,
      gymName: gym.gymName,
      planId,
      planName: plan.name,
      billingCycle,
      amount: plan.monthlyPrice,
      status: 'granted_by_founder',
      periodStart: now.toISOString(),
      periodEnd: periodEnd.toISOString(),
      transactionReference: `FOUNDER-GRANT-${Date.now().toString().slice(-6)}`,
      paidBy: req.user.name || 'SuperAdmin',
      createdAt: now.toISOString()
    });

    res.json({
      message: `Updated plan for ${gym.gymName} to ${plan.name} (${status}) valid for ${extendDays} days.`,
      subscription: getGymSubscription(updated)
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update gym plan: ' + err.message });
  }
});

/**
 * POST /api/super-admin/gyms/:id/impersonate
 * Founder 1-click login into any gym's account for debugging.
 */
router.post('/gyms/:id/impersonate', (req, res) => {
  try {
    const { id } = req.params;
    const gym = db.gyms.findById(id);
    if (!gym) {
      return res.status(404).json({ error: 'Gym not found.' });
    }

    const owner = db.users.findOne({ gymId: id, role: 'owner' }) || db.users.findOne({ gymId: id });
    if (!owner) {
      return res.status(404).json({ error: 'No user account found for this gym.' });
    }

    const token = jwt.sign(
      { userId: owner._id, gymId: owner.gymId, role: owner.role, isImpersonated: true, originalFounder: req.user.email },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    const { password: _, ...userSafe } = owner;

    res.json({
      token,
      user: userSafe,
      gym,
      message: `Impersonation token created for ${gym.gymName}.`
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to impersonate gym account.' });
  }
});

/**
 * GET /api/super-admin/subscriptions
 * Global list of all subscription invoices.
 */
router.get('/subscriptions', (req, res) => {
  try {
    const subs = db.subscriptions.find({}).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ subscriptions: subs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch global subscriptions.' });
  }
});

export default router;
