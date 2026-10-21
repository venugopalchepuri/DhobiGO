import React from 'react';
import { Home, History, Settings, Plus } from 'lucide-react';

export type TabDestination = 'home' | 'history' | 'settings';

interface NavigationProps {
  currentTab: TabDestination;
  onSelectTab: (tab: TabDestination) => void;
  onAddLaundry: () => void;
  activeBagCount?: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onSelectTab,
  onAddLaundry,
  activeBagCount = 0,
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between relative">
        {/* Tab 1: Home */}
        <button
          onClick={() => onSelectTab('home')}
          className={`flex-1 min-h-[48px] flex flex-col items-center justify-center transition-colors ${
            currentTab === 'home' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Home className={`w-5 h-5 ${currentTab === 'home' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
          <span className="text-[11px] font-semibold tracking-tight mt-1">Home</span>
        </button>

        {/* Tab 2: History */}
        <button
          onClick={() => onSelectTab('history')}
          className={`flex-1 min-h-[48px] flex flex-col items-center justify-center transition-colors relative ${
            currentTab === 'history' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <div className="relative">
            <History className={`w-5 h-5 ${currentTab === 'history' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
            {activeBagCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-blue-600 text-white text-[10px] font-bold rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center">
                {activeBagCount}
              </span>
            )}
          </div>
          <span className="text-[11px] font-semibold tracking-tight mt-1">History</span>
        </button>

        {/* Primary Center Action: Add Laundry */}
        <div className="flex-1 flex justify-center -translate-y-4">
          <button
            onClick={onAddLaundry}
            title="Add New Laundry Bag"
            className="w-14 h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-blue-600/35 transition-all border-4 border-[#F8F9FA]"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>

        {/* Tab 3: Settings */}
        <button
          onClick={() => onSelectTab('settings')}
          className={`flex-1 min-h-[48px] flex flex-col items-center justify-center transition-colors ${
            currentTab === 'settings' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Settings className={`w-5 h-5 ${currentTab === 'settings' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
          <span className="text-[11px] font-semibold tracking-tight mt-1">Settings</span>
        </button>
      </div>
    </nav>
  );
};
