import React, { useState, useEffect } from 'react';
import { useStore } from './src/store';
import { Layout } from './src/components/Layout';
import { Login } from './src/pages/Login';
import { ErrorBoundary, PageErrorBoundary } from './src/components/ErrorBoundary';
import { Loader2 } from 'lucide-react';
import { Suspense, lazy } from 'react';

// Lazy Load Pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Financials = lazy(() => import('./pages/Financials'));
const Sales = lazy(() => import('./pages/Sales'));
const Production = lazy(() => import('./pages/Production'));
const Inventory = lazy(() => import('./pages/Inventory'));
const SalesReport = lazy(() => import('./pages/SalesReport'));
const MenuStock = lazy(() => import('./pages/MenuStock'));
const PromotionPage = lazy(() => import('./src/components/Promotion/PromotionPage'));
const Settings = lazy(() => import('./pages/Settings'));

// Loading Fallback Component
const PageLoader = () => (
  <div className="flex flex-col h-[calc(100vh-100px)] items-center justify-center bg-[#fbf7f4]/50">
    <div className="relative w-24 h-24 mb-6">
      <div className="absolute inset-0 border-4 border-cafe-300 rounded-full border-t-transparent animate-spin"></div>
      <div className="absolute inset-3 border-4 border-cafe-500 rounded-full border-b-transparent animate-[spin_2s_linear_infinite_reverse]"></div>
      <div className="absolute inset-6 border-4 border-amber-200 rounded-full border-l-transparent animate-[spin_1.5s_linear_infinite]"></div>
      <div className="absolute inset-[34px] bg-cafe-500 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(176,137,104,0.5)] animate-pulse"></div>
    </div>
    <div className="flex flex-col items-center gap-1">
      <h3 className="text-xl font-bold text-cafe-800 tracking-wide">Mellow Oven</h3>
      <div className="flex gap-1.5 mt-2">
        <div className="w-2 h-2 rounded-full bg-cafe-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
        <div className="w-2 h-2 rounded-full bg-cafe-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
        <div className="w-2 h-2 rounded-full bg-cafe-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
      </div>
    </div>
  </div>
);

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
      // FIX: One-time cache purge to clear stale product data (v2.0 cache reset)
      const CACHE_VERSION = 'v3.0-thai-jars';
      const lastVersion = localStorage.getItem('cache-version');
      if (lastVersion !== CACHE_VERSION) {
        console.log('[App] Purging stale cache (Zombie Data Fix)');
        localStorage.removeItem('mellow-oven-storage');
        localStorage.setItem('cache-version', CACHE_VERSION);
      }

      // 🧹 Auto-cleanup: Delete transactions older than 6 months (runs once per day)
      const lastCleanup = localStorage.getItem('lastDbCleanup');
      const today = new Date().toISOString().split('T')[0];
      if (lastCleanup !== today) {
        try {
          const sixMonthsAgo = new Date();
          sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
          const cutoffDate = sixMonthsAgo.toISOString().split('T')[0];

          // Import supabase dynamically to avoid circular deps
          const { supabase } = await import('./src/lib/supabase');
          const { error, count } = await supabase
            .from('transactions')
            .delete()
            .lt('date', cutoffDate);

          if (!error) {
            console.log(`[App] 🧹 Cleaned up transactions older than ${cutoffDate}`);
            localStorage.setItem('lastDbCleanup', today);
          }
        } catch (e) {
          console.warn('[App] Database cleanup skipped:', e);
        }
      }

      await checkSession();
      await fetchData();
      subscribeToRealtime();
      setIsInitializing(false);
    };
    init();
    return () => unsubscribeFromRealtime();
  }, [fetchData, subscribeToRealtime, unsubscribeFromRealtime, checkSession]);

  // 🎬 Dismiss splash screen after init (Netflix-style fade-out)
  // Also cache the shop logo URL for instant display on next visit
  const { shopInfo } = useStore();

  useEffect(() => {
    if (!isInitializing) {
      // Cache logo URL for next splash screen
      if (shopInfo?.logoUrl) {
        localStorage.setItem('splash-logo-url', shopInfo.logoUrl);
      }

      const splash = document.getElementById('splash-screen');
      if (splash) {
        splash.classList.add('fade-out');
        setTimeout(() => splash.remove(), 600);
      }
    }
  }, [isInitializing, shopInfo?.logoUrl]);

  // Auth Guard - while initializing, the HTML splash handles the visual
  if (isInitializing) {
    return null; // HTML splash is already showing
  }

  if (!session) {
    return <Login />;
  }
  const renderContent = () => {
    return (
      <Suspense fallback={<PageLoader />}>
        {(() => {
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
            case 'settings': return <Settings />;
            default: return <Dashboard />;
          }
        })()}
      </Suspense>
    );
  };

  return (
    <ErrorBoundary>
      <Layout activeTab={activeTab} onTabChange={setActiveTab}>
        <header className="mb-8">
          <h2 className="text-3xl font-bold text-cafe-800 capitalize">
            {activeTab === 'financials' ? 'การเงิน (Finance)' :
              activeTab === 'promotion' ? 'ออเดอร์พิเศษ' :
                activeTab === 'overview' ? 'Business Command Center' : activeTab}
          </h2>
          <p className="text-cafe-500">
            {activeTab === 'promotion' ? 'Promotion & Snack Box' :
              activeTab === 'overview' ? 'สรุปภาพรวมและจัดการงานด่วนประจำวัน' :
                'Manage your bakery efficiently.'}
          </p>
        </header>
        <PageErrorBoundary>
          {renderContent()}
        </PageErrorBoundary>
      </Layout>
    </ErrorBoundary>
  );
}

export default App;
