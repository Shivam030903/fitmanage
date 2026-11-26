import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import customerRoutes from './routes/customers.js';
import membershipRoutes from './routes/memberships.js';
import paymentRoutes from './routes/payments.js';
import reminderRoutes from './routes/reminders.js';
import dashboardRoutes from './routes/dashboard.js';
import reportRoutes from './routes/reports.js';
import staffRoutes from './routes/staff.js';
import settingsRoutes from './routes/settings.js';
import portalRoutes from './routes/portal.js';
import attendanceRoutes from './routes/attendance.js';
import onlinePayRoutes from './routes/onlinePay.js';
import { seedInitialData, connectMongoDB } from './db.js';
import { whatsappWebService } from './services/whatsappWeb.js';
import { expiryScheduler } from './services/expiryScheduler.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS and JSON Parsing
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/memberships', membershipRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/portal', portalRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/online-pay', onlinePayRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', product: 'FitManage API', time: new Date().toISOString() });
});

// Serve compiled frontend from client/dist if present
const clientDistPath = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
  // Never cache sw.js, manifest, or index.html so updates are always immediate
  app.use((req, res, next) => {
    if (req.path === '/sw.js' || req.path === '/index.html' || req.path === '/' || req.path === '/manifest.webmanifest') {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    next();
  });

  app.use(express.static(clientDistPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(path.join(clientDistPath, 'index.html'));
    }
  });
}

// Connect MongoDB Atlas, seed data, and start server
async function startServer() {
  await connectMongoDB();
  await seedInitialData();
  whatsappWebService.initAll().catch(e => console.error('WhatsApp Web init error:', e));
  expiryScheduler.start();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`===============================================`);
    console.log(` FitManage Gym Management Server Running!`);
    console.log(` Local:   http://localhost:${PORT}`);
    console.log(` Network: http://192.168.1.17:${PORT} (Access on Phone)`);
    console.log(` Health:  http://localhost:${PORT}/api/health`);
    console.log(`===============================================`);
  });
}

startServer().catch(err => {
  console.error('Failed to start FitManage server:', err);
});
