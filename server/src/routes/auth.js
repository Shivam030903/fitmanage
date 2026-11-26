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

// Register Owner & Gym - Closed for public self-service. All gym accounts are setup exclusively via Super Admin panel.
router.post('/register', async (req, res) => {
  return res.status(403).json({
    error: 'Public registration is disabled. Gym accounts are set up exclusively by the FitManage Super Admin.'
  });
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
