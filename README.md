# FitManage - Modern Gym Management System & Installable PWA

**FitManage** is a modern, premium Gym Management System and Progressive Web App (PWA) built specifically for Indian gyms, fitness studios, CrossFit boxes, and independent gym owners. It replaces physical registers, disorganized spreadsheets, and scattered WhatsApp chats with an automated, all-in-one operations platform.

---

## ⚡ Key Highlights & PRD Compliance

| Module | Features Included |
| :--- | :--- |
| **Operational Dashboard** | 7 Live KPI Cards (Total Members, Active, Expiring Soon, Expired, New Today, Collections Today, Pending Dues), Upcoming Expirations list with direct WhatsApp action, Live Activity Stream, Monthly Revenue trend charts, and Plan Popularity breakdown. |
| **Customer Management** | Rapid customer registration (< 60s), auto-generated Unique Customer ID (`FIT-1001`+), 3-tier contact numbers (Primary, Secondary, Emergency), profile photos/avatars, notes, and full historical record preservation. |
| **Membership & Subscriptions** | Configurable duration & pricing (Monthly 30d, Quarterly 90d, Half-Yearly 180d, Yearly 365d, Custom flexi), dynamic date-based status calculation (`active`, `expiring_soon` within 7 days, `expired`, `upcoming`, `cancelled`). |
| **Renewals Engine** | One-click renewal from customer profile or Renewals Hub, preserves prior membership records, calculates advance or immediate renewal validity, records renewal payments, and updates member status seamlessly. |
| **WhatsApp Reminders** | High-priority 1-click WhatsApp click-to-chat links (`wa.me/91...`) with pre-filled dynamic templates for **Expiring Soon**, **Expired**, **Pending Payment Due**, and **Welcome**. Direct actions for Primary, Secondary, or Emergency contacts, with audit logging. |
| **Payments & Collections** | Full or partial payments, outstanding balance tracking, multiple payment modes (UPI, Cash, Debit/Credit Card, Bank Transfer, Other), and instant **downloadable/printable official receipts**. |
| **Customer Search & Filters** | Search by name, ID, primary or secondary mobile; filter by status (Active, Expiring Soon, Expired, Upcoming, Cancelled) and payment dues. |
| **Reports & Analytics** | Renewal rate %, revenue breakdown, payment modes distribution, monthly customer growth, and **one-click CSV exports** for Customers, Payments, and Renewals. |
| **Staff & Roles (RBAC)** | Role-based authorization for **Owner** (all permissions & settings), **Admin** (member & billing management), and **Receptionist** (front-desk registration & WhatsApp reminders). |
| **Installable PWA** | Web App Manifest (`manifest.webmanifest`), Service Worker (`sw.js`) with offline caching, mobile bottom navigation bar (`Home`, `Members`, `+ Add`, `Payments`, `More`), and in-app install prompt for Android and iOS Safari. |

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js**: v18+ (tested on Node v24)
- **NPM**: v9+

### 2. Running the Full Stack Application

Navigate to the project root:
```bash
cd C:\Users\shiva\.gemini\antigravity\scratch\fitmanage
```

Run both backend and frontend concurrently:
```bash
node run.js
```

Or run individually:
```bash
# Terminal 1 - Express Backend API (Port 5000)
cd server
npm start

# Terminal 2 - React + Vite Frontend (Port 3000)
cd client
npm run dev
```

### 3. Accessing the Application
- **Web App / PWA**: [http://localhost:3000](http://localhost:3000)
- **REST API Health Check**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## 🔑 Pre-Seeded Demo Accounts (1-Click Login)

The system automatically initializes realistic Indian gym sample data on first run:

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Gym Owner** | `owner@fitmanage.io` | `password123` | Complete access to operations, financial reports, staff roles, and gym settings |
| **Staff (Receptionist)** | `receptionist@fitmanage.io` | `password123` | Front-desk customer registration, membership viewing, and WhatsApp reminders |

*You can also click **"Register New Gym"** on the login screen to create a completely isolated tenant.*

---

## 📱 Installing FitManage as a Mobile App (PWA)

FitManage is engineered as an installable Progressive Web App:

### On Android (Chrome / Edge / Brave):
1. Open `http://localhost:3000` (or your deployed URL) on Chrome.
2. Tap the **"Install App"** prompt banner at the top of the screen (or browser menu `⋮` → **"Install app"** / **"Add to Home screen"**).
3. FitManage installs to your home screen with a standalone app window and native icon.

### On iPhone (Safari):
1. Open the URL in **Safari**.
2. Tap the **Share** icon (square with arrow pointing up).
3. Scroll down and tap **"Add to Home Screen"**.
4. FitManage will launch full-screen without Safari browser bars.

---

## 🏗️ Technical Architecture & Database Design

### Tech Stack:
- **Frontend**: React 18, Vite, Tailwind CSS, Lucide React, Recharts, Canvas Confetti.
- **Backend**: Node.js, Express.js, REST API, JWT Authentication, bcryptjs password hashing.
- **Data Layer**: Multi-tenant database layer isolated by `gymId`, persistent ACID JSON store in `server/data/`, with optional MongoDB Atlas connection via `MONGODB_URI`.
- **PWA**: Service Worker (`sw.js`) with network-first for APIs and cache-first for static assets, Web App Manifest with shortcuts and maskable icons.

### Database Collections:
1. **Gyms**: `_id, gymName, tagline, address, phone, email, gstin, settings: { currency: "INR", timezone: "Asia/Kolkata", expiryReminderDays: [7, 3, 1], whatsappTemplates }`
2. **Users**: `_id, gymId, name, email, password, role: "owner" | "admin" | "receptionist", phone`
3. **Customers**: `_id, gymId, customerId (FIT-1001), name, gender, dateOfBirth, contacts: { primary, secondary, emergency }, address, notes, createdAt`
4. **Memberships**: `_id, gymId, customerId, planName, startDate, endDate, amount, status, isRenewal, createdBy, createdAt`
5. **Payments**: `_id, gymId, customerId, membershipId, totalAmount, amountPaid, pendingAmount, paymentMethod, paymentDate, transactionReference (PAY-1001), notes`
6. **ReminderLogs**: `_id, gymId, customerId, membershipId, contactNumber, reminderType, message, sentAt, status: "initiated", createdBy`
7. **Plans**: `_id, gymId, name, durationDays, price, description, active`

---

## 💬 WhatsApp Integration Specification

Click-to-chat links are formatted using standard international phone specifications:
```
https://wa.me/91<10_DIGIT_PHONE>?text=<URL_ENCODED_MESSAGE>
```

Dynamic variables automatically injected into message templates:
- `{customerName}` - Member's full name
- `{gymName}` - Your gym or fitness club name
- `{expiryDate}` - Formatted expiry date (e.g., 20 Nov 2026)
- `{daysRemaining}` - Days until membership lapses
- `{pendingAmount}` - Outstanding rupee balance
- `{planName}` - Subscribed plan (e.g., Monthly Standard, Annual VIP)

Every reminder dispatched records an audit trail under **WhatsApp -> Reminder History** with timestamp, recipient number, and staff user tag.

---

## 📄 License
MIT © FitManage
