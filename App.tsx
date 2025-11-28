import React, { useState, useEffect } from 'react';
import { useStore } from './src/store';
import { Layout } from './src/components/Layout';
import Dashboard from './pages/Dashboard';
import Financials from './pages/Financials';
import Sales from './pages/Sales';
import Production from './pages/Production';
import Inventory from './pages/Inventory';
import Settings from './pages/Settings';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { fetchData } = useStore();

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'financials': return <Financials />;
      case 'sales': return <Sales />;
      case 'production': return <Production />;
      case 'inventory': return <Inventory />;
      case 'settings': return <Settings />;
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
