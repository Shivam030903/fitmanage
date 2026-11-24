import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const DATA_DIR = path.resolve(__dirname, '../data');
const uri = process.env.MONGODB_URI;

const KEEP_CUSTOMER_IDS = ['FIT-1001', 'FIT-1002'];
const KEEP_CUSTOMER_DOC_IDS = ['id_1795021785827_121e1n', 'id_1795022168303_6641bm'];
const KEEP_MEMBERSHIP_DOC_IDS = ['id_1795021785828_sozw4d', 'id_1795022168304_hgou0v'];

async function cleanLocalFiles() {
  console.log('[1/2] Cleaning local JSON data files...');

  // 1. customers.json
  const custPath = path.join(DATA_DIR, 'customers.json');
  if (fs.existsSync(custPath)) {
    const raw = JSON.parse(fs.readFileSync(custPath, 'utf8'));
    const filtered = raw.filter(c => KEEP_CUSTOMER_DOC_IDS.includes(c._id));
    fs.writeFileSync(custPath, JSON.stringify(filtered, null, 2), 'utf8');
    console.log(`  -> customers.json: kept ${filtered.length} of ${raw.length} records.`);
  }

  // 2. memberships.json
  const membPath = path.join(DATA_DIR, 'memberships.json');
  if (fs.existsSync(membPath)) {
    const raw = JSON.parse(fs.readFileSync(membPath, 'utf8'));
    const filtered = raw.filter(m => KEEP_MEMBERSHIP_DOC_IDS.includes(m._id));
    fs.writeFileSync(membPath, JSON.stringify(filtered, null, 2), 'utf8');
    console.log(`  -> memberships.json: kept ${filtered.length} of ${raw.length} records.`);
  }

  // 3. payments.json
  const payPath = path.join(DATA_DIR, 'payments.json');
  if (fs.existsSync(payPath)) {
    const raw = JSON.parse(fs.readFileSync(payPath, 'utf8'));
    const filtered = raw.filter(p => KEEP_CUSTOMER_IDS.includes(p.customerId) && p.gymId === 'gym_1795021748195');
    fs.writeFileSync(payPath, JSON.stringify(filtered, null, 2), 'utf8');
    console.log(`  -> payments.json: kept ${filtered.length} of ${raw.length} records.`);
  }

  // 4. reminderLogs.json
  const logPath = path.join(DATA_DIR, 'reminderLogs.json');
  if (fs.existsSync(logPath)) {
    const raw = JSON.parse(fs.readFileSync(logPath, 'utf8'));
    const filtered = raw.filter(l => KEEP_CUSTOMER_IDS.includes(l.customerId));
    fs.writeFileSync(logPath, JSON.stringify(filtered, null, 2), 'utf8');
    console.log(`  -> reminderLogs.json: kept ${filtered.length} of ${raw.length} records.`);
  }
}

async function cleanAtlasDatabase() {
  if (!uri) {
    console.log('No MONGODB_URI found, skipping Atlas cloud wipe.');
    return;
  }

  console.log('[2/2] Connecting to MongoDB Atlas to clean cloud database...');
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('fitmanage');
  console.log('✅ Connected to MongoDB Atlas cluster0 (db: fitmanage)!');

  // Clean customers collection
  const custCol = db.collection('customers');
  const custResult = await custCol.deleteMany({
    _id: { $nin: KEEP_CUSTOMER_DOC_IDS }
  });
  console.log(`  -> Atlas 'customers': deleted ${custResult.deletedCount} records.`);

  // Clean memberships collection
  const membCol = db.collection('memberships');
  const membResult = await membCol.deleteMany({
    _id: { $nin: KEEP_MEMBERSHIP_DOC_IDS }
  });
  console.log(`  -> Atlas 'memberships': deleted ${membResult.deletedCount} records.`);

  // Clean payments collection
  const payCol = db.collection('payments');
  const payResult = await payCol.deleteMany({
    $or: [
      { customerId: { $nin: KEEP_CUSTOMER_IDS } },
      { gymId: { $ne: 'gym_1795021748195' } }
    ]
  });
  console.log(`  -> Atlas 'payments': deleted ${payResult.deletedCount} records.`);

  // Clean reminderLogs collection
  const logCol = db.collection('reminderLogs');
  const logResult = await logCol.deleteMany({
    customerId: { $nin: KEEP_CUSTOMER_IDS }
  });
  console.log(`  -> Atlas 'reminderLogs': deleted ${logResult.deletedCount} records.`);

  console.log('✅ MongoDB Atlas cleaned! Baileys WhatsApp sessions, gyms, users, and plans preserved intact.');
  await client.close();
}

async function run() {
  await cleanLocalFiles();
  try {
    await cleanAtlasDatabase();
  } catch (err) {
    console.error('Atlas cleanup error:', err.message);
  }
}

run();
