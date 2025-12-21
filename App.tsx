import React, { useState, useEffect } from 'react';
import { useStore } from './src/store';
import { Layout } from './src/components/Layout';
import { Login } from './src/pages/Login';
import Dashboard from './pages/Dashboard';
import Financials from './pages/Financials';
import Sales from './pages/Sales';
import Production from './pages/Production';
import Inventory from './pages/Inventory';
import SalesReport from './pages/SalesReport';
import MenuStock from './pages/MenuStock';
import PromotionPage from './src/components/Promotion/PromotionPage';
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
  // Persist active tab in localStorage
  const [activeTab, setActiveTab] = useState(() => {
    const saved = localStorage.getItem('activeTab');
    return saved || 'dashboard';
  });

  const { fetchData, subscribeToRealtime, unsubscribeFromRealtime, checkSession, session, userRole } = useStore();
  const [isInitializing, setIsInitializing] = useState(true);

  // Save to localStorage whenever tab changes
  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
  }, [activeTab]);

  // Initial Data Load & Session Check
  useEffect(() => {
    const init = async () => {
      await checkSession();
      await fetchData();
      subscribeToRealtime();
      setIsInitializing(false);
    };
    init();
    return () => unsubscribeFromRealtime();
  }, [fetchData, subscribeToRealtime, unsubscribeFromRealtime, checkSession]);

  // Auth Guard
  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cafe-50">
        <Loader2 className="animate-spin text-cafe-600" size={48} />
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard onNavigate={setActiveTab} />;
      case 'financials':
        return userRole === 'owner' ? <Financials /> : <div className="p-8 text-center text-cafe-500">Access Denied</div>;
      case 'sales': return <Sales />;
      case 'salesreport': return <SalesReport />;
      case 'menustock': return <MenuStock />;
      case 'production':
        return userRole === 'owner' ? <Production /> : <div className="p-8 text-center text-cafe-500">Access Denied</div>;
      case 'promotion': return <PromotionPage />;
      case 'inventory': return <Inventory />;
      default: return <Dashboard />;
    }
  };

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      <header className="mb-8">
        <h2 className="text-3xl font-bold text-cafe-800 capitalize">{activeTab === 'financials' ? 'การเงิน (Finance)' : activeTab}</h2>
        <p className="text-cafe-500">Manage your bakery efficiently.</p>
      </header>
      {renderContent()}
    </Layout>
  );
}

export default App;
