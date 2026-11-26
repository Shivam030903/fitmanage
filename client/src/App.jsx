import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import MobileBottomNav from './components/MobileBottomNav';
import PWAInstallBanner from './components/PWAInstallBanner';
import TrialBanner from './components/TrialBanner';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import AddCustomer from './pages/AddCustomer';
import Memberships from './pages/Memberships';
import Renewals from './pages/Renewals';
import Payments from './pages/Payments';
import Reminders from './pages/Reminders';
import Reports from './pages/Reports';
import Staff from './pages/Staff';
import Settings from './pages/Settings';
import Portal from './pages/Portal';
import Attendance from './pages/Attendance';
import PublicPayment from './pages/PublicPayment';
import Subscription from './pages/Subscription';
import SuperAdmin from './pages/SuperAdmin';

function ProtectedLayout({ children, title }) {
  const { user, loading } = useAuth();
  const [showPwaModal, setShowPwaModal] = useState(false);

  const handleInstallClick = async () => {
    if (window.deferredPWAEvent) {
      try {
        window.deferredPWAEvent.prompt();
        const choice = await window.deferredPWAEvent.userChoice;
        if (choice && choice.outcome === 'accepted') {
          window.deferredPWAEvent = null;
          return;
        }
      } catch (err) {
        console.error('Install prompt error:', err);
      }
    }
    setShowPwaModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* Desktop Dark Sidebar */}
      <Sidebar />

      {/* Main App Container */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* PWA Floating Install Notification */}
        <PWAInstallBanner showModal={showPwaModal} setShowModal={setShowPwaModal} />

        {/* Top Header */}
        <Header 
          title={title} 
          onInstallClick={handleInstallClick} 
        />

        {/* 14-Day Free Trial & Subscription Status Banner */}
        <TrialBanner />

        {/* Workspace Canvas (Light SaaS theme) */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto pb-24 lg:pb-12">
          {children}
        </main>

        {/* Mobile Sticky Bottom Navigation */}
        <MobileBottomNav />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/dashboard" element={
            <ProtectedLayout title="Operational Dashboard">
              <Dashboard />
            </ProtectedLayout>
          } />

          <Route path="/customers" element={
            <ProtectedLayout title="Member Management">
              <Customers />
            </ProtectedLayout>
          } />

          <Route path="/customers/new" element={
            <ProtectedLayout title="Register Member">
              <AddCustomer />
            </ProtectedLayout>
          } />

          <Route path="/customers/:id" element={
            <ProtectedLayout title="Member Profile">
              <CustomerDetail />
            </ProtectedLayout>
          } />

          <Route path="/memberships" element={
            <ProtectedLayout title="Subscriptions">
              <Memberships />
            </ProtectedLayout>
          } />

          <Route path="/renewals" element={
            <ProtectedLayout title="Renewals Hub">
              <Renewals />
            </ProtectedLayout>
          } />

          <Route path="/payments" element={
            <ProtectedLayout title="Payments & Receipts">
              <Payments />
            </ProtectedLayout>
          } />

          <Route path="/reminders" element={
            <ProtectedLayout title="WhatsApp Reminders">
              <Reminders />
            </ProtectedLayout>
          } />

          <Route path="/reports" element={
            <ProtectedLayout title="Analytics & CSV">
              <Reports />
            </ProtectedLayout>
          } />

          <Route path="/staff" element={
            <ProtectedLayout title="Staff & Roles">
              <Staff />
            </ProtectedLayout>
          } />

          <Route path="/settings" element={
            <ProtectedLayout title="Gym Settings">
              <Settings />
            </ProtectedLayout>
          } />

          <Route path="/attendance" element={
            <ProtectedLayout title="Attendance & Check-in">
              <Attendance />
            </ProtectedLayout>
          } />

          <Route path="/subscription" element={
            <ProtectedLayout title="SaaS Subscription">
              <Subscription />
            </ProtectedLayout>
          } />

          <Route path="/super-admin" element={
            <ProtectedLayout title="Super Admin OS">
              <SuperAdmin />
            </ProtectedLayout>
          } />

          <Route path="/portal" element={<Portal />} />
          <Route path="/pay/:token" element={<PublicPayment />} />
          <Route path="/renew/:token" element={<PublicPayment />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
