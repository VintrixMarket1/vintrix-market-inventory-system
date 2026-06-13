import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { LangProvider } from '@/lib/i18n';
import Settings from './pages/Settings';
import Onboarding from './pages/Onboarding';
import CustomerCatalogWrapper from './pages/CustomerCatalog.jsx';
import Inquiries from './pages/Inquiries';

import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Listings from './pages/Listings';
import Sales from './pages/Sales.jsx';
import QuickAdd from './pages/QuickAdd';
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
import PalletDetail from './pages/PalletDetail';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin, user } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  // Wymuszamy uzupełnienie imienia i nazwiska
  if (user && !user.full_name) {
    return <Onboarding onComplete={() => window.location.reload()} />;
  }

  // Klient (role: user) widzi tylko katalog
  if (user && user.role === 'user') {
    return (
      <Routes>
        <Route path="*" element={<CustomerCatalogWrapper />} />
      </Routes>
    );
  }

  // Admin — pełny dostęp
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/Dashboard" replace />} />
      <Route element={<AppLayout />}>
        <Route path="/Dashboard" element={<Dashboard />} />
        <Route path="/Inventory" element={<Inventory />} />
        <Route path="/Pallets" element={<Pallets />} />
        <Route path="/Listings" element={<Listings />} />
        <Route path="/Sales" element={<Sales />} />
        <Route path="/QuickAdd" element={<QuickAdd />} />
        <Route path="/AddProduct" element={<AddProduct />} />
        <Route path="/ProductModels" element={<ProductModels />} />
        <Route path="/ShopifySettings" element={<ShopifySettings />} />
        <Route path="/AllegroSettings" element={<AllegroSettings />} />
        <Route path="/AllegroPublish" element={<AllegroPublish />} />
        <Route path="/AllegroTemplates" element={<AllegroTemplates />} />
        <Route path="/Settings" element={<Settings />} />
        <Route path="/WarehouseDocuments" element={<WarehouseDocuments />} />
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
          <Routes>
            <Route path="/ShopifyCallback" element={<ShopifyCallback />} />
            <Route path="/AllegroCallback" element={<AllegroCallback />} />
            <Route path="/*" element={<AuthenticatedApp />} />
          </Routes>
        </Router>
        <Toaster />
      </QueryClientProvider>
      </LangProvider>
    </AuthProvider>
  )
}

export default App