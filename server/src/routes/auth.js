import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fitmanage_super_secret_jwt_key_2026';

// Quick demo login info helper
router.get('/demo-users', (req, res) => {
  res.json({
    demoAccounts: [
      { role: 'Owner', email: 'owner@fitmanage.io', password: 'password123', label: 'Vikram Singhania (Owner)' },
      { role: 'Receptionist', email: 'receptionist@fitmanage.io', password: 'password123', label: 'Pooja Sharma (Staff)' }
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

    const gym = db.gyms.findById(user.gymId);

    const token = jwt.sign(
      { userId: user._id, gymId: user.gymId, role: user.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Don't send password hash
    const { password: _, ...userSafe } = user;

    res.json({
      token,
      user: userSafe,
      gym
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
        whatsappTemplates: {
          expiringSoon: `Hello {customerName}! 👋\nYour gym membership at {gymName} is expiring on {expiryDate}.\nWe would love to continue having you with us! Please contact us or visit the reception to renew.\nThank you! 💪`,
          expired: `Hello {customerName}!\nYour gym membership at {gymName} has expired. We hope you enjoyed your fitness journey with us.\nWould you like to renew your membership? We would be happy to help you get started again.\nRegards, {gymName} Team`,
          paymentDue: `Hello {customerName}! 👋\nFriendly reminder regarding your pending balance of ₹{pendingAmount} for your gym membership at {gymName}.\nPlease clear this at the reception desk. Thank you! 🙏`,
          welcome: `Welcome to {gymName}, {customerName}! 🎉\nYour membership is active until {expiryDate}.\nLet's crush your fitness goals! 🚀`
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
  const gym = db.gyms.findById(req.gymId);
  const { password: _, ...userSafe } = req.user;
  res.json({ user: userSafe, gym });
});

// Logout
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully.' });
});

export default router;
