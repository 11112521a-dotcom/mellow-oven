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
  <div className="flex h-[calc(100vh-100px)] items-center justify-center">
    <div className="flex flex-col items-center gap-2">
      <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      <p className="text-sm text-stone-500 animate-pulse">กำลังโหลด...</p>
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

  // Auth Guard
  if (isInitializing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 relative overflow-hidden">
        {/* Background Decorations */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Floating Bread/Croissant Shapes */}
          <div className="absolute top-20 left-10 w-16 h-16 bg-amber-200/40 rounded-full animate-bounce" style={{ animationDelay: '0s', animationDuration: '3s' }} />
          <div className="absolute top-40 right-20 w-12 h-12 bg-orange-200/40 rounded-full animate-bounce" style={{ animationDelay: '0.5s', animationDuration: '2.5s' }} />
          <div className="absolute bottom-32 left-1/4 w-8 h-8 bg-rose-200/40 rounded-full animate-bounce" style={{ animationDelay: '1s', animationDuration: '2s' }} />
          <div className="absolute top-1/3 right-1/4 w-20 h-20 bg-amber-100/30 rounded-full animate-pulse" />
          <div className="absolute bottom-20 right-10 w-14 h-14 bg-orange-100/40 rounded-full animate-bounce" style={{ animationDelay: '1.5s', animationDuration: '2.8s' }} />
        </div>

        {/* Main Content */}
        <div className="relative z-10 flex flex-col items-center">
          {/* Animated Logo */}
          <div className="relative mb-6">
            <div className="w-24 h-24 bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-amber-300/50 animate-pulse">
              <span className="text-white font-black text-3xl tracking-tight">MO</span>
            </div>
            {/* Sparkle Effect */}
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-300 rounded-full animate-ping opacity-75" />
            <div className="absolute -bottom-1 -left-1 w-4 h-4 bg-amber-300 rounded-full animate-ping opacity-50" style={{ animationDelay: '0.3s' }} />
          </div>

          {/* Brand Name */}
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 mb-2">
            Mellow Oven
          </h1>
          <p className="text-amber-600/70 text-sm mb-8">Café Management System</p>

          {/* Loading Bar */}
          <div className="w-64 h-2 bg-amber-100 rounded-full overflow-hidden mb-4 shadow-inner">
            <div className="h-full bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400 rounded-full animate-loading-bar"
              style={{
                animation: 'loading-bar 1.5s ease-in-out infinite',
                backgroundSize: '200% 100%'
              }}
            />
          </div>

          {/* Loading Text */}
          <div className="flex items-center gap-2 text-amber-700">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm font-medium animate-pulse">กำลังเตรียมความอร่อย...</span>
          </div>

          {/* Fun Facts */}
          <p className="mt-6 text-xs text-amber-500/60 max-w-xs text-center italic">
            ☕ กาแฟดีๆ ต้องใช้เวลาชง เว็บดีๆ ก็ต้องใช้เวลาโหลดนิดหน่อยนะ
          </p>
        </div>

        {/* CSS for Loading Bar Animation */}
        <style>{`
          @keyframes loading-bar {
            0% { transform: translateX(-100%); }
            50% { transform: translateX(0%); }
            100% { transform: translateX(100%); }
          }
        `}</style>
      </div>
    );
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
          <h2 className="text-3xl font-bold text-cafe-800 capitalize">{activeTab === 'financials' ? 'การเงิน (Finance)' : activeTab}</h2>
          <p className="text-cafe-500">Manage your bakery efficiently.</p>
        </header>
        <PageErrorBoundary>
          {renderContent()}
        </PageErrorBoundary>
      </Layout>
    </ErrorBoundary>
  );
}

export default App;
