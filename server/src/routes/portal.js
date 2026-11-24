import express from 'express';
import jwt from 'jsonwebtoken';
import { db, getDaysRemaining, calculateMembershipStatus } from '../db.js';
import { whatsappWebService } from '../services/whatsappWeb.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fitmanage_super_secret_jwt_key_2026';

// Temporary in-memory OTP storage: phone -> { otp, expiresAt, customerId, gymId }
const otpStore = new Map();

/**
 * Member Portal Authentication Middleware
 */
export function memberAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Member authentication required.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'member') {
      return res.status(403).json({ error: 'Access restricted to members.' });
    }
    req.member = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired member session.' });
  }
}

// POST /api/portal/send-otp - Request login OTP on WhatsApp
router.post('/send-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ error: 'Please enter your registered 10-digit mobile number.' });
    }

    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit mobile number.' });
    }

    // Find customer by primary contact
    const allCustomers = db.customers.find({});
    const customer = allCustomers.find(c => {
      const p = (c.contacts?.primary || '').replace(/\D/g, '').slice(-10);
      return p === cleanPhone;
    });

    if (!customer) {
      return res.status(404).json({
        error: `No member record found for +91 ${cleanPhone}. Please verify your number or contact the gym front desk.`
      });
    }

    const gym = db.gyms.findById(customer.gymId) || { gymName: 'FitManage Gym' };

    // Generate 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    otpStore.set(cleanPhone, {
      otp,
      expiresAt,
      customerId: customer.customerId,
      gymId: customer.gymId
    });

    // Send OTP via linked WhatsApp if connected
    let whatsappDispatched = false;
    if (whatsappWebService.getStatus().isConnected) {
      const msg = `🔐 *FitManage Member Portal Login*\n\nHello *${customer.name}*!\nYour One-Time Password (OTP) to access your gym pass & receipts is: *${otp}*\n\n⏱️ This code is valid for 10 minutes.\n\n_${gym.gymName}_`;
      try {
        await whatsappWebService.sendMessage(cleanPhone, msg);
        whatsappDispatched = true;
      } catch (err) {
        console.warn('[Portal OTP] WhatsApp send failed:', err.message);
      }
    }

    res.json({
      success: true,
      message: whatsappDispatched 
        ? `OTP code sent directly to your WhatsApp (+91 ${cleanPhone})!`
        : `OTP generated for +91 ${cleanPhone}. (Valid for 10 minutes)`,
      whatsappDispatched,
      // Provide devOtp if WhatsApp isn't linked for easy testing
      devOtp: !whatsappDispatched ? otp : undefined
    });
  } catch (err) {
    console.error('Send OTP Error:', err);
    res.status(500).json({ error: 'Failed to generate OTP.' });
  }
});

// POST /api/portal/verify-otp - Verify OTP and generate member token
router.post('/verify-otp', (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ error: 'Phone number and 4-digit OTP are required.' });
    }

    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    const record = otpStore.get(cleanPhone);

    if (!record) {
      return res.status(400).json({ error: 'No active OTP request found. Please request a new code.' });
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(cleanPhone);
      return res.status(400).json({ error: 'OTP has expired. Please request a new code.' });
    }

    if (record.otp !== otp.trim()) {
      return res.status(400).json({ error: 'Invalid OTP code. Please check and try again.' });
    }

    // OTP Verified successfully!
    otpStore.delete(cleanPhone);

    const token = jwt.sign(
      {
        role: 'member',
        customerId: record.customerId,
        gymId: record.gymId,
        phone: cleanPhone
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      message: 'Authentication successful.',
      token,
      customerId: record.customerId
    });
  } catch (err) {
    console.error('Verify OTP Error:', err);
    res.status(500).json({ error: 'Verification failed.' });
  }
});

// GET /api/portal/me - Member dashboard profile, passes, and receipts
router.get('/me', memberAuthMiddleware, (req, res) => {
  try {
    const { customerId, gymId } = req.member;

    const customer = db.customers.findOne({ gymId, customerId });
    if (!customer) {
      return res.status(404).json({ error: 'Member not found.' });
    }

    const gym = db.gyms.findById(gymId) || { gymName: 'FitManage Gym' };

    // Fetch all memberships sorted by date
    const memberships = db.memberships.find({ gymId, customerId })
      .sort((a, b) => new Date(b.endDate) - new Date(a.endDate));

    const activeMemb = memberships[0] || null;
    let daysRemaining = 0;
    let membershipStatus = 'unsubscribed';
    let progressPercent = 0;

    if (activeMemb && activeMemb.endDate) {
      membershipStatus = calculateMembershipStatus(activeMemb.startDate, activeMemb.endDate, activeMemb.status === 'cancelled');
      daysRemaining = getDaysRemaining(activeMemb.endDate);

      // Calculate progress percentage
      const start = new Date(activeMemb.startDate).getTime();
      const end = new Date(activeMemb.endDate).getTime();
      const now = Date.now();
      if (end > start) {
        const totalDuration = end - start;
        const elapsed = Math.max(0, now - start);
        progressPercent = Math.min(100, Math.round((elapsed / totalDuration) * 100));
      }
    }

    // Fetch member payments
    const payments = db.payments.find({ gymId, customerId })
      .sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));

    // Dynamic Gym announcements & community updates from settings
    const defaultAnnouncements = [
      {
        id: 'ann_1',
        title: '🏋️ Summer Strength & Conditioning Boot Camp',
        date: 'Starts Next Monday',
        content: 'Join our certified trainers for high-intensity morning sessions at 6:30 AM. Open to all active members!',
        tag: 'Camp'
      },
      {
        id: 'ann_2',
        title: '💪 New Equipment Zone Added',
        date: 'Updated This Week',
        content: 'Brand new Olympic bumper plates, calibrated barbells, and an isolated cable station are now live in the main weight room.',
        tag: 'Facility'
      },
      {
        id: 'ann_3',
        title: '🕒 Regular Studio Timings',
        date: 'Daily',
        content: 'Monday to Saturday: 6:00 AM – 10:00 PM | Sunday: 7:00 AM – 2:00 PM. Lockers and showers cleaned daily.',
        tag: 'Hours'
      }
    ];

    const announcements = (gym.settings?.announcements && gym.settings.announcements.length > 0)
      ? gym.settings.announcements
      : defaultAnnouncements;

    // Customizable studio occupancy & peak hour guide
    const defaultSlots = [
      { id: 'slot_1', time: '6:00 AM - 8:00 AM', expectedMembers: 30 },
      { id: 'slot_2', time: '8:00 AM - 10:00 AM', expectedMembers: 45 },
      { id: 'slot_3', time: '11:00 AM - 4:00 PM', expectedMembers: 15 },
      { id: 'slot_4', time: '5:00 PM - 7:00 PM', expectedMembers: 48 },
      { id: 'slot_5', time: '7:00 PM - 10:00 PM', expectedMembers: 32 }
    ];

    const occupancyConf = gym.settings?.occupancy || {};
    const maxCapacity = Number(occupancyConf.maxCapacity) || 50;
    const currentMembers = Number(occupancyConf.currentMembers !== undefined ? occupancyConf.currentMembers : 18);
    const slotsData = (occupancyConf.slots && occupancyConf.slots.length > 0) ? occupancyConf.slots : defaultSlots;

    const occupancyPercent = Math.min(100, Math.round((currentMembers / maxCapacity) * 100));
    let occupancyStatus = 'Quiet & Open';
    let occupancyColor = 'emerald';
    if (occupancyPercent >= 75) {
      occupancyStatus = 'Peak Hours';
      occupancyColor = 'rose';
    } else if (occupancyPercent >= 40) {
      occupancyStatus = 'Moderate';
      occupancyColor = 'amber';
    }

    const peakHours = slotsData.map(slot => {
      const exp = Number(slot.expectedMembers) || 0;
      const fill = Math.min(100, Math.round((exp / maxCapacity) * 100));
      let slotStatus = 'Quiet & Open';
      let slotColor = 'emerald';
      if (fill >= 75) {
        slotStatus = 'Peak Hours';
        slotColor = 'rose';
      } else if (fill >= 40) {
        slotStatus = 'Moderate';
        slotColor = 'amber';
      }
      return {
        id: slot.id,
        time: slot.time,
        expectedMembers: exp,
        fill,
        status: slotStatus,
        color: slotColor
      };
    });

    const liveOccupancy = {
      maxCapacity,
      currentMembers,
      percentage: occupancyPercent,
      status: occupancyStatus,
      color: occupancyColor
    };

    res.json({
      member: {
        customerId: customer.customerId,
        name: customer.name,
        phone: customer.contacts?.primary,
        email: customer.contacts?.email || '',
        joinedDate: customer.createdAt,
        emergencyContact: customer.contacts?.emergency || null
      },
      gym: {
        gymName: gym.gymName,
        tagline: gym.tagline || 'Excellence in Fitness',
        phone: gym.phone,
        address: gym.address,
        email: gym.email
      },
      currentMembership: activeMemb ? {
        planName: activeMemb.planName,
        startDate: activeMemb.startDate,
        endDate: activeMemb.endDate,
        daysRemaining,
        status: membershipStatus,
        progressPercent,
        amount: activeMemb.amount
      } : null,
      membershipHistory: memberships,
      payments,
      announcements,
      peakHours,
      occupancy: liveOccupancy
    });
  } catch (err) {
    console.error('Portal Me Error:', err);
    res.status(500).json({ error: 'Failed to retrieve member profile.' });
  }
});

export default router;
