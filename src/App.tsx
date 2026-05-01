/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import FirebaseSync from './components/FirebaseSync';
import BroadcastBanner from './components/BroadcastBanner';
import NotificationManager from './components/NotificationManager';

// Direct imports
import HomeScreen from './features/home/HomeScreen';
import RemindersScreen from './features/reminders/RemindersScreen';
import ConsultScreen from './features/consult/ConsultScreen';
import PharmacyScreen from './features/pharmacy/PharmacyScreen';
import RecordsScreen from './features/records/RecordsScreen';
import NursingScreen from './features/nursing/NursingScreen';
import LabScreen from './features/labs/LabScreen';
import ProfileScreen from './features/profile/ProfileScreen';
import AdminScreen from './features/admin/AdminScreen';
import ProtectedRoute from './components/ProtectedRoute';
import RoleSelection from './components/RoleSelection';
import ProviderDashboard from './features/provider/ProviderDashboard';
import { useAuthStore } from './store/useAuthStore';

export default function App() {
  const { user, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <HashRouter>
      <FirebaseSync />
      <BroadcastBanner />
      <NotificationManager />
      
      {(!user || !user.role) && (
        <RoleSelection />
      )}

      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/profile" element={<ProfileScreen />} />
          <Route path="/" element={
            (user?.role === 'provider' || user?.role === 'lab') ? <ProviderDashboard /> : <HomeScreen />
          } />
          <Route path="/consult" element={<ConsultScreen />} />
          <Route path="/reminders" element={<RemindersScreen />} />
          <Route path="/pharmacy" element={<PharmacyScreen />} />
          <Route path="/records" element={<ProtectedRoute><RecordsScreen /></ProtectedRoute>} />
          <Route path="/nursing" element={<NursingScreen />} />
          <Route path="/labs" element={<LabScreen />} />
          <Route path="/admin" element={<ProtectedRoute><AdminScreen /></ProtectedRoute>} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
