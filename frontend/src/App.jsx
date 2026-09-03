import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import RoleRoute from './components/RoleRoute';

// Layout
import DashboardLayout from './layouts/DashboardLayout';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import AdminHeatmap from './pages/admin/AdminHeatmap';
import ComplaintsList from './pages/officer/ComplaintsList';
import ComplaintDetail from './pages/officer/ComplaintDetail';

// Officer / Head Pages — currently unused (routes below reuse the Admin
// components directly for full feature parity); kept importable in case a
// scoped "my assignments only" view is wanted again later.
// import OfficerDashboard from './pages/officer/OfficerDashboard';
// import OfficerComplaints from './pages/officer/OfficerComplaints';
// import OfficerComplaintDetail from './pages/officer/OfficerComplaintDetail';
// import OfficerHeatmap from './pages/officer/OfficerHeatmap';

// Citizen Pages
import CitizenDashboard from './pages/CitizenDashboard';
import Home from './pages/Home';
import Track from './pages/Track';
import Feedback from './pages/Feedback';
import Chatbot from './pages/Chatbot';
import Landing from './pages/Landing';
import FeatureGate from './components/FeatureGate';

import Login from './pages/Login';
import Signup from './pages/Signup';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Toaster position="top-right" />
        <Router>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Landing-page feature gates: shows "login to view" for guests,
                auto-forwards to the real page for whoever is already signed in */}
            <Route path="/dashboard-preview" element={
              <FeatureGate titleKey="featureGate.theDashboard" descKey="featureGate.dashboardDesc" />
            } />
            <Route path="/analytics-preview" element={
              <FeatureGate titleKey="featureGate.cityAnalytics" descKey="featureGate.analyticsDesc" targetPath="/admin/analytics" />
            } />
            
            {/* Citizen Routes */}
            <Route path="/dashboard" element={
              <RoleRoute allowedRoles={['citizen']}>
                <DashboardLayout />
              </RoleRoute>
            }>
              <Route index element={<CitizenDashboard />} />
              <Route path="submit" element={<Home />} />
              <Route path="track" element={<Track />} />
              <Route path="feedback" element={<Feedback />} />
              <Route path="chat" element={<Chatbot />} />
            </Route>

            {/* Officer / Head Routes — reuse the exact same page components as
                Admin (full feature parity: same dashboard, all complaints
                citywide, analytics, heatmap, priority override, AI assistant).
                Only the sidebar branding differs by role. */}
            <Route path="/officer" element={
              <RoleRoute allowedRoles={['officer', 'head']}>
                <DashboardLayout />
              </RoleRoute>
            }>
              <Route index element={<AdminDashboard />} />
              <Route path="complaints" element={<ComplaintsList />} />
              <Route path="complaints/:id" element={<ComplaintDetail />} />
              <Route path="heatmap" element={<AdminHeatmap />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="chat" element={<Chatbot />} />
            </Route>

            {/* Admin Routes */}
            <Route path="/admin" element={
              <RoleRoute allowedRoles={['admin']}>
                <DashboardLayout />
              </RoleRoute>
            }>
              <Route index element={<AdminDashboard />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="heatmap" element={<AdminHeatmap />} />
              <Route path="complaints" element={<ComplaintsList />} />
              <Route path="complaints/:id" element={<ComplaintDetail />} />
              <Route path="chat" element={<Chatbot />} />
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
