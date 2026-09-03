import React from 'react';
import { Search, User, Menu } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import NotificationBell from '../NotificationBell';
import LanguageToggle from '../LanguageToggle';

const Topbar = ({ onMenuToggle }) => {
  const { t } = useTranslation();
  const { user } = useAuth();

  return (
    <header className="h-20 bg-background/90 backdrop-blur-md border-b border-ink/5 flex items-center justify-between px-6 shrink-0 z-20 sticky top-0">
      
      {/* Mobile Menu Button */}
      <button 
        onClick={onMenuToggle}
        className="md:hidden mr-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-ink/5 rounded-lg transition-colors"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Search Section */}
      <div className="flex-1 max-w-md hidden sm:block">
        <div className="relative group">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-primary-600 transition-colors" />
          <input
            type="text"
            placeholder={t('dashboardChrome.search')}
            className="w-full bg-white hover:bg-white border-2 border-ink/10 rounded-full pl-10 pr-4 py-2.5 text-sm text-ink placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent/60 focus:border-accent transition-all duration-300"
          />
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-4 ml-auto sm:ml-4">
        <LanguageToggle />

        <NotificationBell />

        <div className="h-6 w-px bg-ink/10 hidden sm:block"></div>

        <button className="flex items-center gap-3 p-1 pr-3 rounded-full hover:bg-white border border-transparent hover:border-ink/10 transition-all duration-200 group focus:outline-none">
          <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center text-primary-800 group-hover:bg-accent group-hover:text-ink transition-all">
            <User className="w-4 h-4" />
          </div>
          <div className="hidden md:block text-left">
            <p className="text-sm font-bold text-slate-700 leading-tight group-hover:text-primary-700 transition-colors">
              {user?.name || 'Loading...'}
            </p>
            <p className="text-[11px] font-semibold text-slate-500 leading-tight capitalize">
              {user?.role || 'Guest'}
            </p>
          </div>
        </button>
      </div>
    </header>
  );
};

export default Topbar;
