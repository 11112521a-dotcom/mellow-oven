import React from 'react';
import { NAVIGATION } from '../constants';
import { Coffee } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isOpen, setIsOpen }) => {
  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-20 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed top-0 left-0 h-full bg-cafe-700 text-cafe-100 w-64 shadow-xl z-30
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 flex items-center space-x-3 border-b border-cafe-600">
          <div className="bg-cafe-100 p-2 rounded-full text-cafe-800">
            <Coffee size={24} />
          </div>
          <h1 className="text-xl font-semibold tracking-wide text-white">BakeSoft</h1>
        </div>

        <nav className="mt-8 px-4 space-y-2">
          {NAVIGATION.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                if (window.innerWidth < 1024) setIsOpen(false);
              }}
              className={`
                w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200
                ${activeTab === item.id 
                  ? 'bg-cafe-100 text-cafe-900 shadow-md font-medium' 
                  : 'text-cafe-200 hover:bg-cafe-600 hover:text-white'}
              `}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="absolute bottom-0 w-full p-6 border-t border-cafe-600 text-xs text-cafe-300">
          <p>© 2025 BakeSoft Manager</p>
          <p className="mt-1">Connected: Google Sheets</p>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
