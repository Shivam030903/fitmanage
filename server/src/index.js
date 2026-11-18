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
import { seedInitialData } from './db.js';

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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', product: 'FitManage API', time: new Date().toISOString() });
});

// Serve compiled frontend from client/dist if present
const clientDistPath = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/')) {
      res.sendFile(path.join(clientDistPath, 'index.html'));
    }
  });
}

// Seed data and start server
async function startServer() {
  await seedInitialData();
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
