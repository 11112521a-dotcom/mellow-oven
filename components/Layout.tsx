import React, { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-cafe-50 text-cafe-900 font-sans">
      <main className="p-4 lg:p-8 lg:ml-64 transition-all duration-300">
        {children}
      </main>
    </div>
  );
};

export default Layout;
