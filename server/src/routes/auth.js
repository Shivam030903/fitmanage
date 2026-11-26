import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db, getGymSubscription } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fitmanage_super_secret_jwt_key_2026';

// Initialize Super Admin user if not present
(async function initSuperAdmin() {
  const existing = db.users.findOne({ email: 'superadmin@fitmanage.io' });
  if (!existing) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('password123', salt);
    db.users.insertOne({
      _id: 'user_superadmin_01',
      name: 'FitManage SaaS Founder',
      email: 'superadmin@fitmanage.io',
      password: hash,
      role: 'superadmin',
      isSuperAdmin: true,
      phone: '+91 99999 00000',
      gymId: 'gym_fitzone_01'
    });
    console.log('✅ [SuperAdmin] Created default master account: superadmin@fitmanage.io');
  }
})();

// Quick demo login info helper
router.get('/demo-users', (req, res) => {
  res.json({
    demoAccounts: [
      { role: 'Owner', email: 'owner@fitmanage.io', password: 'password123', label: 'Vikram Singhania (Owner)' },
      { role: 'Admin', email: 'admin@fitmanage.io', password: 'password123', label: 'Pooja Sharma (Admin)' },
      { role: 'SuperAdmin', email: 'superadmin@fitmanage.io', password: 'password123', label: '⭐ SaaS Founder (Master Admin)' }
    ]
  });
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Please enter both email and password.' });
    }

    const user = db.users.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials. User does not exist.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid password. Please check your credentials.' });
    }

    const gym = user.gymId ? db.gyms.findById(user.gymId) : null;
    const isSuperAdmin = user.role === 'superadmin' || user.email === 'soravjain453@gmail.com' || Boolean(user.isSuperAdmin);

    const token = jwt.sign(
      { userId: user._id, gymId: user.gymId, role: user.role, isSuperAdmin },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Don't send password hash
    const { password: _, ...userSafe } = user;
    const gymSafe = gym ? { ...gym, subscription: getGymSubscription(gym) } : null;

    res.json({
      token,
      user: {
        ...userSafe,
        isSuperAdmin
      },
      gym: gymSafe
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login. Please try again.' });
  }
});

// Register Owner & Gym
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, gymName, address } = req.body;

    if (!name || !email || !password || !gymName) {
      return res.status(400).json({ error: 'Name, email, password and gym name are required.' });
    }

    const existingUser = db.users.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const gymId = `gym_${Date.now()}`;
    const gym = db.gyms.insertOne({
      _id: gymId,
      gymName: gymName.trim(),
      address: address || '',
      phone: phone || '',
      email: email.toLowerCase().trim(),
      settings: {
        currency: 'INR',
        currencySymbol: '₹',
        timezone: 'Asia/Kolkata',
        expiryReminderDays: [7, 3, 1, 0, -1],
        allowPartialAccess: true,
        whatsapp: {
          provider: 'whatsapp_qr',
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
            },
            stage_3days_after: {
              enabled: true,
              days: -3,
              template: `We miss seeing you, {customerName}! 🥺\n\nIt has been 3 days since your membership at {gymName} expired on {expiryDate}.\n\nVisit us today and let's get back on track! 💖💪\n\n_{gymName}_`
            }
          }
        },
        whatsappTemplates: {
          expiringSoon: `Hello {customerName}! 👋\nYour gym membership at {gymName} is expiring on {expiryDate}.\nWe would love to continue having you with us! Please contact us or visit the reception to renew.\nThank you! 💪`,
          expired: `Hello {customerName}!\nYour gym membership at {gymName} has expired. We hope you enjoyed your fitness journey with us.\nWould you like to renew your membership? We would be happy to help you get started again.\nRegards, {gymName} Team`,
          paymentDue: `Hello {customerName}! 👋\nFriendly reminder regarding your pending balance of ₹{pendingAmount} for your gym membership at {gymName}.\nPlease clear this at the reception desk. Thank you! 🙏`,
          welcome: `Welcome to {gymName}, {customerName}! 🎉\nYour membership is active until {expiryDate}.\nLet's crush your fitness goals! 🚀`
        },
        announcements: [],
        occupancy: {
          maxCapacity: 50,
          currentMembers: 18,
          slots: [
            { id: 'slot_1', time: '6:00 AM - 8:00 AM', expectedMembers: 30 },
            { id: 'slot_2', time: '8:00 AM - 10:00 AM', expectedMembers: 45 },
            { id: 'slot_3', time: '11:00 AM - 4:00 PM', expectedMembers: 15 },
            { id: 'slot_4', time: '5:00 PM - 7:00 PM', expectedMembers: 48 },
            { id: 'slot_5', time: '7:00 PM - 10:00 PM', expectedMembers: 32 }
          ]
        }
      }
    });

    // Create default plans for this new gym
    const defaultPlans = [
      { gymId, name: 'Monthly Standard', durationDays: 30, price: 1500, description: '30 days gym access', active: true },
      { gymId, name: 'Quarterly', durationDays: 90, price: 4000, description: '90 days access', active: true },
      { gymId, name: 'Half-Yearly', durationDays: 180, price: 7500, description: '180 days access', active: true },
      { gymId, name: 'Yearly VIP', durationDays: 365, price: 13000, description: '1 year all inclusive', active: true }
    ];
    defaultPlans.forEach(p => db.plans.insertOne(p));

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = db.users.insertOne({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: passwordHash,
      phone: phone || '',
      role: 'owner',
      gymId
    });

    const token = jwt.sign(
      { userId: user._id, gymId, role: 'owner' },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    const { password: _, ...userSafe } = user;

    res.status(201).json({
      token,
      user: userSafe,
      gym
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

// Current user profile & gym info
router.get('/me', authMiddleware, (req, res) => {
  const gym = req.gymId ? db.gyms.findById(req.gymId) : null;
  const { password: _, ...userSafe } = req.user;
  const isSuperAdmin = req.user.role === 'superadmin' || req.user.email === 'soravjain453@gmail.com' || Boolean(req.user.isSuperAdmin);

  res.json({
    user: {
      ...userSafe,
      isSuperAdmin
    },
    gym: gym ? { ...gym, subscription: getGymSubscription(gym) } : null
  });
});

// Logout
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully.' });
});

export default router;
