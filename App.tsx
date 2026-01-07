
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Vehicles from './pages/Vehicles';
import Services from './pages/Services';
import ServiceOrders from './pages/ServiceOrders';
import Layout from './components/Layout';
import { db } from './services/db';
import { ToastProvider } from './components/Toast';

// Explicitly type ProtectedRoute as React.FC to fix children requirement errors
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const user = db.getCurrentUser();
  if (!user) return <Navigate to="/auth" replace />;
  return <Layout>{children}</Layout>;
};

const App: React.FC = () => {
  return (
    <ToastProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          
          <Route path="/dashboard" element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
          } />
          <Route path="/clientes" element={
            <ProtectedRoute><Clients /></ProtectedRoute>
          } />
          <Route path="/veiculos" element={
            <ProtectedRoute><Vehicles /></ProtectedRoute>
          } />
          <Route path="/servicos" element={
            <ProtectedRoute><Services /></ProtectedRoute>
          } />
          <Route path="/ordens-servico" element={
            <ProtectedRoute><ServiceOrders /></ProtectedRoute>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ToastProvider>
  );
};

export default App;
