import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { MongoClient } from 'mongodb';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Helper to calculate membership status based on current date
export function calculateMembershipStatus(startDateStr, endDateStr, isCancelled = false) {
  if (isCancelled) return 'cancelled';
  if (!startDateStr || !endDateStr) return 'unsubscribed';

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const start = new Date(startDateStr);
  start.setHours(0, 0, 0, 0);

  const end = new Date(endDateStr);
  end.setHours(23, 59, 59, 999);

  if (start > now) {
    return 'upcoming';
  }

  if (now > end) {
    return 'expired';
  }

  // Calculate days remaining
  const diffTime = end.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 7) {
    return 'expiring_soon';
  }

  return 'active';
}

export function getDaysRemaining(endDateStr) {
  if (!endDateStr) return 0;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const end = new Date(endDateStr);
  end.setHours(23, 59, 59, 999);
  const diffTime = end.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Helper to determine the true current membership (prioritizing active over upcoming/expired)
export function getCustomerCurrentMembership(memberships) {
  if (!memberships || memberships.length === 0) return null;

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // 1. Look for currently active memberships (startDate <= today && today <= endDate && !cancelled)
  const activeList = memberships.filter(m => {
    if (m.status === 'cancelled') return false;
    const s = new Date(m.startDate);
    s.setHours(0, 0, 0, 0);
    const e = new Date(m.endDate);
    e.setHours(23, 59, 59, 999);
    return s <= now && now <= e;
  });

  if (activeList.length > 0) {
    // If multiple active, pick the one with the furthest endDate
    return activeList.sort((a, b) => new Date(b.endDate) - new Date(a.endDate))[0];
  }

  // 2. If no active, look for upcoming future memberships (startDate > today && !cancelled)
  const upcomingList = memberships.filter(m => {
    if (m.status === 'cancelled') return false;
    const s = new Date(m.startDate);
    s.setHours(0, 0, 0, 0);
    return s > now;
  });

  if (upcomingList.length > 0) {
    // Pick nearest upcoming membership
    return upcomingList.sort((a, b) => new Date(a.startDate) - new Date(b.startDate))[0];
  }

  // 3. Look for most recently ended non-cancelled membership
  const pastList = memberships.filter(m => m.status !== 'cancelled');
  if (pastList.length > 0) {
    return pastList.sort((a, b) => new Date(b.endDate) - new Date(a.endDate))[0];
  }

  // 4. Fallback to newest membership even if cancelled
  return [...memberships].sort((a, b) => new Date(b.createdAt || b.endDate) - new Date(a.createdAt || a.endDate))[0];
}

let mongoClient = null;
let mongoDb = null;

class MongoCollection {
  constructor(name) {
    this.name = name;
    this.filePath = path.join(DATA_DIR, `${name}.json`);
    this.data = this.loadLocal();
    this.atlasCol = null;
  }

  loadLocal() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error(`Error loading collection ${this.name}:`, e);
    }
    return [];
  }

  saveLocal() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error(`Error saving collection ${this.name}:`, e);
    }
  }

  async initAtlasSync(dbInstance) {
    this.atlasCol = dbInstance.collection(this.name);
    try {
      const atlasCount = await this.atlasCol.countDocuments();
      if (atlasCount === 0 && this.data.length > 0) {
        // First-time sync: Upload local documents into MongoDB Atlas
        console.log(`[MongoDB Atlas] Migrating ${this.data.length} records into Atlas collection: ${this.name}...`);
        await this.atlasCol.insertMany(this.data.map(d => ({ ...d })));
      } else if (atlasCount > 0) {
        // Atlas has data: sync cloud documents into local cache
        const docs = await this.atlasCol.find({}).toArray();
        this.data = docs;
        this.saveLocal();
      }
    } catch (err) {
      console.error(`[MongoDB Atlas] Sync error on ${this.name}:`, err.message);
    }
  }

  find(query = {}) {
    return this.data.filter(item => {
      for (const key of Object.keys(query)) {
        if (typeof query[key] === 'object' && query[key] !== null) {
          if (query[key].$in && !query[key].$in.includes(item[key])) return false;
          if (query[key].$ne && item[key] === query[key].$ne) return false;
        } else if (item[key] !== query[key]) {
          return false;
        }
      }
      return true;
    });
  }

  findOne(query = {}) {
    return this.find(query)[0] || null;
  }

  findById(id) {
    return this.findOne({ _id: id });
  }

  insertOne(doc) {
    const _id = doc._id || `id_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const newDoc = {
      ...doc,
      _id,
      createdAt: doc.createdAt || new Date().toISOString(),
      updatedAt: doc.updatedAt || new Date().toISOString()
    };
    this.data.push(newDoc);
    this.saveLocal();

    // Persist asynchronously to MongoDB Atlas
    if (this.atlasCol) {
      this.atlasCol.insertOne({ ...newDoc }).catch(err => {
        console.error(`[MongoDB Atlas] insertOne error in ${this.name}:`, err.message);
      });
    }

    return newDoc;
  }

  updateOne(query, updateData) {
    const item = this.findOne(query);
    if (!item) return null;
    const updatedAt = new Date().toISOString();
    Object.assign(item, updateData, { updatedAt });
    this.saveLocal();

    // Persist asynchronously to MongoDB Atlas
    if (this.atlasCol) {
      const filter = item._id ? { _id: item._id } : query;
      this.atlasCol.updateOne(filter, { $set: { ...updateData, updatedAt } }).catch(err => {
        console.error(`[MongoDB Atlas] updateOne error in ${this.name}:`, err.message);
      });
    }

    return item;
  }

  deleteOne(query) {
    const idx = this.data.findIndex(item => {
      for (const key of Object.keys(query)) {
        if (item[key] !== query[key]) return false;
      }
      return true;
    });
    if (idx !== -1) {
      const removed = this.data.splice(idx, 1)[0];
      this.saveLocal();

      // Persist asynchronously to MongoDB Atlas
      if (this.atlasCol) {
        const filter = removed._id ? { _id: removed._id } : query;
        this.atlasCol.deleteOne(filter).catch(err => {
          console.error(`[MongoDB Atlas] deleteOne error in ${this.name}:`, err.message);
        });
      }

      return removed;
    }
    return null;
  }

  count(query = {}) {
    return this.find(query).length;
  }
}

export const db = {
  users: new MongoCollection('users'),
  gyms: new MongoCollection('gyms'),
  customers: new MongoCollection('customers'),
  memberships: new MongoCollection('memberships'),
  payments: new MongoCollection('payments'),
  reminderLogs: new MongoCollection('reminderLogs'),
  plans: new MongoCollection('plans'),
  attendance: new MongoCollection('attendance'),
  subscriptions: new MongoCollection('subscriptions'),
  leads: new MongoCollection('leads')
};

export const SAAS_PLANS = {
  starter: {
    id: 'starter',
    name: 'Starter',
    monthlyPrice: 799,
    yearlyPrice: 7990,
    memberLimit: 100,
    staffLimit: 1,
    features: {
      whatsappQr: true,
      metaApi: false,
      multiStageAuto: false,
      attendanceScanner: false,
      unlimitedStaff: false
    }
  },
  growth: {
    id: 'growth',
    name: 'Growth',
    popular: true,
    monthlyPrice: 1999,
    yearlyPrice: 19990,
    memberLimit: 500,
    staffLimit: 3,
    features: {
      whatsappQr: true,
      metaApi: true,
      multiStageAuto: true,
      attendanceScanner: false,
      unlimitedStaff: false
    }
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: 3499,
    yearlyPrice: 34990,
    memberLimit: 100000,
    staffLimit: 100,
    features: {
      whatsappQr: true,
      metaApi: true,
      multiStageAuto: true,
      attendanceScanner: true,
      unlimitedStaff: true
    }
  }
};

export function getGymSubscription(gym) {
  if (!gym) return null;

  const now = new Date();
  const sub = gym.subscription || {};

  // If gym was created without subscription, provide 14-day free trial on Pro
  const createdAt = gym.createdAt ? new Date(gym.createdAt) : now;
  const trialEnd = sub.trialEndDate 
    ? new Date(sub.trialEndDate)
    : new Date(createdAt.getTime() + 14 * 24 * 60 * 60 * 1000);

  const planKey = sub.plan || 'pro';
  const planConfig = SAAS_PLANS[planKey] || SAAS_PLANS.pro;

  let status = sub.status;
  if (!status) {
    status = trialEnd > now ? 'trial' : 'expired';
  } else if (status === 'trial' && now > trialEnd) {
    status = 'expired';
  }

  // Calculate days remaining
  let daysRemaining = 0;
  if (status === 'trial') {
    const diff = trialEnd.getTime() - now.getTime();
    daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  } else if (sub.currentPeriodEnd) {
    const periodEnd = new Date(sub.currentPeriodEnd);
    const diff = periodEnd.getTime() - now.getTime();
    daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  return {
    plan: planKey,
    planName: planConfig.name,
    status,
    isTrial: status === 'trial',
    isTrialExpired: status === 'expired',
    isActive: status === 'active' || status === 'trial',
    isLocked: Boolean(gym.isLocked),
    lockReason: gym.lockReason || '',
    daysRemaining,
    trialEndDate: trialEnd.toISOString(),
    currentPeriodEnd: sub.currentPeriodEnd || trialEnd.toISOString(),
    billingCycle: sub.billingCycle || 'monthly',
    memberLimit: planConfig.memberLimit,
    staffLimit: planConfig.staffLimit,
    features: planConfig.features
  };
}

export function getMongoDb() {
  return mongoDb;
}

export async function connectMongoDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log('[DB] No MONGODB_URI set, running with local file store.');
    return;
  }

  try {
    console.log('[MongoDB Atlas] Connecting to cluster...');
    mongoClient = new MongoClient(uri);
    await mongoClient.connect();
    mongoDb = mongoClient.db('fitmanage');
    console.log('✅ [MongoDB Atlas] Connected successfully to database: fitmanage');

    // Initialize Atlas sync on all 7 collections
    for (const [name, col] of Object.entries(db)) {
      await col.initAtlasSync(mongoDb);
    }
    console.log('✅ [MongoDB Atlas] All 7 collections synchronized with MongoDB Atlas.');
  } catch (err) {
    console.error('⚠️ [MongoDB Atlas] Connection failed:', err.message);
  }
}

// Seed realistic Indian Gym data if empty
export async function seedInitialData() {
  if (db.gyms.count() > 0) return;

  console.log('Seeding initial FitManage gym data...');

  const gymId = 'gym_fitzone_01';
  db.gyms.insertOne({
    _id: gymId,
    gymName: 'FitZone Pro Fitness Club',
    tagline: 'Transforming Lives, Building Strength',
    address: 'Plot 42, 3rd Floor, Linking Road, Bandra West, Mumbai, Maharashtra 400050',
    phone: '+91 98200 12345',
    email: 'contact@fitzonepro.in',
    gstin: '27AABCU9603R1ZM',
    settings: {
      currency: 'INR',
      currencySymbol: '₹',
      timezone: 'Asia/Kolkata',
      expiryReminderDays: [7, 3, 1, 0, -1],
      allowPartialAccess: true,
      whatsappTemplates: {
        expiringSoon: `Hello {customerName}! 👋\nYour gym membership at {gymName} is expiring on {expiryDate} ({daysRemaining} days left).\nWe would love to continue having you with us! Please visit reception or renew via UPI/Cash to maintain your streak. 💪`,
        expired: `Hello {customerName}!\nYour gym membership at {gymName} expired on {expiryDate}. We hope you enjoyed your fitness journey with us.\nWould you like to renew? We have special renewal benefits waiting for you! 🏋️‍♂️\nRegards, {gymName} Team`,
        paymentDue: `Hello {customerName}! 👋\nThis is a friendly reminder regarding your pending balance of ₹{pendingAmount} for your {planName} membership at {gymName}.\nPlease clear this at the reception desk. Thank you! 🙏`,
        welcome: `Welcome to {gymName}, {customerName}! 🎉\nYour {planName} membership is active until {expiryDate}.\nLet's achieve your fitness goals together! Feel free to ask our trainers anytime. 🚀`
      }
    }
  });

  // Default Membership Plans
  const plansData = [
    { _id: 'plan_1m', gymId, name: 'Monthly Standard', durationDays: 30, price: 2000, description: 'Full gym floor & cardio access for 30 days', active: true },
    { _id: 'plan_3m', gymId, name: 'Quarterly Transformation', durationDays: 90, price: 5200, description: '3 months gym floor + 1 steam bath session', active: true },
    { _id: 'plan_6m', gymId, name: 'Half-Yearly Elite', durationDays: 180, price: 9500, description: '6 months access + personalized workout routine', active: true },
    { _id: 'plan_1y', gymId, name: 'Annual Champion', durationDays: 365, price: 16000, description: '365 days unlimited gym, cardio, steam & locker access', active: true },
    { _id: 'plan_custom', gymId, name: 'Custom Flexi', durationDays: 45, price: 3000, description: 'Custom tailored plan', active: true }
  ];
  plansData.forEach(p => db.plans.insertOne(p));

  // Users: Owner and Staff
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('password123', salt);

  db.users.insertOne({
    _id: 'user_owner_01',
    name: 'Vikram Singhania',
    email: 'owner@fitmanage.io',
    password: passwordHash,
    role: 'owner',
    phone: '+91 98200 99999',
    gymId
  });

  db.users.insertOne({
    _id: 'user_reception_01',
    name: 'Pooja Sharma',
    email: 'receptionist@fitmanage.io',
    password: passwordHash,
    role: 'receptionist',
    phone: '+91 98200 88888',
    gymId
  });

  // Helper date generators relative to today
  const now = new Date();
  const formatIsoDate = (d) => d.toISOString().split('T')[0];
  const addDays = (d, n) => {
    const copy = new Date(d);
    copy.setDate(copy.getDate() + n);
    return copy;
  };

  const seedCustomers = [
    {
      _id: 'cust_01',
      gymId,
      customerId: 'FIT-1001',
      name: 'Rahul Sharma',
      gender: 'Male',
      dateOfBirth: '1996-05-14',
      contacts: {
        primary: '9820111001',
        secondary: '9820111002',
        emergency: '9820111003'
      },
      address: 'B-402, Sea View Apts, Khar West, Mumbai',
      notes: 'Focusing on strength training and weight gain. Prefers evening workouts.',
      planName: 'Monthly Standard',
      startDate: formatIsoDate(addDays(now, -28)),
      endDate: formatIsoDate(addDays(now, 2)), // Expiring in 2 days
      amount: 2000,
      paid: 1500, // Pending 500
      paymentMethod: 'UPI'
    },
    {
      _id: 'cust_02',
      gymId,
      customerId: 'FIT-1002',
      name: 'Aman Verma',
      gender: 'Male',
      dateOfBirth: '1993-11-20',
      contacts: {
        primary: '9711222001',
        secondary: '9711222002',
        emergency: '9711222003'
      },
      address: 'Flat 12, Hill Road, Bandra West, Mumbai',
      notes: 'Former powerlifter, prefers early morning 6 AM slots.',
      planName: 'Quarterly Transformation',
      startDate: formatIsoDate(addDays(now, -94)),
      endDate: formatIsoDate(addDays(now, -4)), // Expired 4 days ago
      amount: 5200,
      paid: 5200,
      paymentMethod: 'Debit/Credit Card'
    },
    {
      _id: 'cust_03',
      gymId,
      customerId: 'FIT-1003',
      name: 'Priya Singh',
      gender: 'Female',
      dateOfBirth: '1998-03-22',
      contacts: {
        primary: '9930333001',
        secondary: '9930333002',
        emergency: '9930333003'
      },
      address: '701, Green Heights, Santacruz West, Mumbai',
      notes: 'Interested in HIIT and functional fitness.',
      planName: 'Annual Champion',
      startDate: formatIsoDate(addDays(now, -45)),
      endDate: formatIsoDate(addDays(now, 320)), // Active for 320 days
      amount: 16000,
      paid: 16000,
      paymentMethod: 'UPI'
    },
    {
      _id: 'cust_04',
      gymId,
      customerId: 'FIT-1004',
      name: 'Rohan Gupta',
      gender: 'Male',
      dateOfBirth: '1991-08-09',
      contacts: {
        primary: '9876543210',
        secondary: '',
        emergency: '9876543299'
      },
      address: '304, Palm Springs, Andheri West, Mumbai',
      notes: 'Has slight lower back stiffness, recommended light warmup.',
      planName: 'Half-Yearly Elite',
      startDate: formatIsoDate(addDays(now, -179)),
      endDate: formatIsoDate(addDays(now, 1)), // Expiring tomorrow!
      amount: 9500,
      paid: 8500, // Pending 1000
      paymentMethod: 'Cash'
    },
    {
      _id: 'cust_05',
      gymId,
      customerId: 'FIT-1005',
      name: 'Ananya Desai',
      gender: 'Female',
      dateOfBirth: '1995-12-05',
      contacts: {
        primary: '9123456789',
        secondary: '9123456780',
        emergency: ''
      },
      address: '15, Gulmohar Cross Rd, Juhu, Mumbai',
      notes: 'Was traveling out of town, wants to renew next week.',
      planName: 'Monthly Standard',
      startDate: formatIsoDate(addDays(now, -40)),
      endDate: formatIsoDate(addDays(now, -10)), // Expired 10 days ago
      amount: 2000,
      paid: 2000,
      paymentMethod: 'UPI'
    },
    {
      _id: 'cust_06',
      gymId,
      customerId: 'FIT-1006',
      name: 'Vikram Malhotra',
      gender: 'Male',
      dateOfBirth: '1989-04-18',
      contacts: {
        primary: '9892012345',
        secondary: '',
        emergency: '9892054321'
      },
      address: '22, Pali Hill, Bandra West, Mumbai',
      notes: 'Regular member since 2024. Bodybuilding focus.',
      planName: 'Quarterly Transformation',
      startDate: formatIsoDate(addDays(now, -30)),
      endDate: formatIsoDate(addDays(now, 60)), // Active
      amount: 5200,
      paid: 5200,
      paymentMethod: 'Bank Transfer'
    },
    {
      _id: 'cust_07',
      gymId,
      customerId: 'FIT-1007',
      name: 'Sneha Reddy',
      gender: 'Female',
      dateOfBirth: '2000-01-30',
      contacts: {
        primary: '9654321098',
        secondary: '9654321099',
        emergency: '9654321090'
      },
      address: 'C-101, Sunshine Park, Bandra East, Mumbai',
      notes: 'Registered today! New fitness journey begun.',
      planName: 'Monthly Standard',
      startDate: formatIsoDate(now),
      endDate: formatIsoDate(addDays(now, 30)), // Active
      amount: 2000,
      paid: 2000,
      paymentMethod: 'UPI'
    },
    {
      _id: 'cust_08',
      gymId,
      customerId: 'FIT-1008',
      name: 'Kabir Mehta',
      gender: 'Male',
      dateOfBirth: '1997-07-11',
      contacts: {
        primary: '9819098190',
        secondary: '',
        emergency: '9819098199'
      },
      address: '502, Oceanic View, Worli, Mumbai',
      notes: 'Advance booking starting next week.',
      planName: 'Quarterly Transformation',
      startDate: formatIsoDate(addDays(now, 5)), // Upcoming
      endDate: formatIsoDate(addDays(now, 95)),
      amount: 5200,
      paid: 5200,
      paymentMethod: 'UPI'
    }
  ];

  let payIndex = 1001;

  for (const c of seedCustomers) {
    const { planName, startDate, endDate, amount, paid, paymentMethod, ...custFields } = c;

    // Customer
    db.customers.insertOne({
      ...custFields,
      createdAt: formatIsoDate(addDays(now, -40)),
      updatedAt: formatIsoDate(now)
    });

    // Active/current membership
    const membStatus = calculateMembershipStatus(startDate, endDate);
    const membDoc = db.memberships.insertOne({
      gymId,
      customerId: custFields.customerId,
      planName,
      startDate,
      endDate,
      amount,
      status: membStatus,
      createdBy: 'user_owner_01',
      createdAt: startDate
    });

    // Historical membership for Rahul Sharma to demonstrate renewal history
    if (custFields.customerId === 'FIT-1001') {
      db.memberships.insertOne({
        gymId,
        customerId: custFields.customerId,
        planName: 'Monthly Standard',
        startDate: formatIsoDate(addDays(now, -58)),
        endDate: formatIsoDate(addDays(now, -28)),
        amount: 2000,
        status: 'expired',
        createdBy: 'user_owner_01',
        createdAt: formatIsoDate(addDays(now, -58))
      });
      // Past payment
      db.payments.insertOne({
        gymId,
        customerId: custFields.customerId,
        membershipId: 'past_memb_01',
        totalAmount: 2000,
        amountPaid: 2000,
        pendingAmount: 0,
        paymentMethod: 'UPI',
        paymentDate: formatIsoDate(addDays(now, -58)),
        transactionReference: `PAY-${payIndex++}`,
        notes: 'Initial registration fee and 1st month',
        createdAt: formatIsoDate(addDays(now, -58))
      });
    }

    // Current Payment
    const pendingAmount = Math.max(0, amount - paid);
    db.payments.insertOne({
      gymId,
      customerId: custFields.customerId,
      membershipId: membDoc._id,
      totalAmount: amount,
      amountPaid: paid,
      pendingAmount,
      paymentMethod,
      paymentDate: startDate,
      transactionReference: `PAY-${payIndex++}`,
      notes: pendingAmount > 0 ? `Partial payment collected. ₹${pendingAmount} remaining balance.` : 'Full payment cleared',
      createdAt: startDate
    });
  }

  // Seed sample reminder log
  db.reminderLogs.insertOne({
    gymId,
    customerId: 'FIT-1001',
    membershipId: 'memb_rahul',
    contactNumber: '9820111001',
    reminderType: 'expiring_soon',
    message: 'Hello Rahul! 👋 Your gym membership at FitZone Pro is expiring in 2 days.',
    sentAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    status: 'initiated',
    createdBy: 'Vikram Singhania'
  });

  console.log('FitManage seeding complete!');
}
