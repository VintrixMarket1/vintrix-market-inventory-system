import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { LangProvider } from '@/lib/i18n';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Settings from './pages/Settings';
import Onboarding from './pages/Onboarding';
import CustomerCatalogWrapper from './pages/CustomerCatalog.jsx';
import Inquiries from './pages/Inquiries';

import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Listings from './pages/Listings';
import Sales from './pages/Sales.jsx';
import Pallets from './pages/Pallets';
import AddProduct from './pages/AddProduct';
import ProductModels from './pages/ProductModels';
import ShopifySettings from './pages/ShopifySettings';
import ShopifyCallback from './pages/ShopifyCallback';
import AllegroSettings from './pages/AllegroSettings';
import AllegroCallback from './pages/AllegroCallback';
import AllegroPublish from './pages/AllegroPublish';
import AllegroTemplates from './pages/AllegroTemplates';
import PrivacyPolicy from './pages/PrivacyPolicy';
import WarehouseDocuments from './pages/WarehouseDocuments';
import MonthlyReport from './pages/MonthlyReport';
import PalletDetail from './pages/PalletDetail';

const ProtectedApp = () => {
  const { user } = useAuth();

  // Force full_name completion
  if (user && !user.full_name) {
    return <Onboarding onComplete={() => window.location.reload()} />;
  }

  // Client (role: user) sees only catalog
  if (user.role === 'user') {
    return <CustomerCatalogWrapper />;
  }

  // Pracownik — restricted access (product creation + unknown conversion)
  if (user.role === 'pracownik') {
    return (
      <Routes>
        <Route path="/" element={<Navigate to="/Inventory" replace />} />
        <Route element={<AppLayout />}>
          <Route path="/Dashboard" element={<Dashboard />} />
          <Route path="/Inventory" element={<Inventory />} />
          <Route path="/ProductModels" element={<ProductModels />} />
          <Route path="/Pallets" element={<Pallets />} />
          <Route path="/AddProduct" element={<AddProduct />} />
          <Route path="/Settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/Inventory" replace />} />
      </Routes>
    );
  }

  // Admin — full access
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/Dashboard" replace />} />
      <Route element={<AppLayout />}>
        <Route path="/Dashboard" element={<Dashboard />} />
        <Route path="/Inventory" element={<Inventory />} />
        <Route path="/Pallets" element={<Pallets />} />
        <Route path="/Listings" element={<Listings />} />
        <Route path="/Sales" element={<Sales />} />
        <Route path="/AddProduct" element={<AddProduct />} />
        <Route path="/ProductModels" element={<ProductModels />} />
        <Route path="/ShopifySettings" element={<ShopifySettings />} />
        <Route path="/AllegroSettings" element={<AllegroSettings />} />
        <Route path="/AllegroPublish" element={<AllegroPublish />} />
        <Route path="/AllegroTemplates" element={<AllegroTemplates />} />
        <Route path="/Settings" element={<Settings />} />
        <Route path="/WarehouseDocuments" element={<WarehouseDocuments />} />
        <Route path="/MonthlyReport" element={<MonthlyReport />} />
        <Route path="/PalletDetail" element={<PalletDetail />} />
        <Route path="/Inquiries" element={<Inquiries />} />
      </Route>
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <LangProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AppRoutes />
        </Router>
        <Toaster />
      </QueryClientProvider>
      </LangProvider>
    </AuthProvider>
  )
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public auth routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      {/* OAuth callback routes (public) */}
      <Route path="/ShopifyCallback" element={<ShopifyCallback />} />
      <Route path="/AllegroCallback" element={<AllegroCallback />} />
      {/* All other routes require authentication */}
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route path="/*" element={<ProtectedApp />} />
      </Route>
    </Routes>
  );
}

export default App