import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Search, User, Monitor, Smartphone, Shield, LogOut, Minus, Square, X, Wifi } from 'lucide-react';
import Logo from './Logo';

interface AppBarProps {
  activeTab?: 'home' | 'search' | 'profile';
  onTabChange?: (tab: 'home' | 'search' | 'profile') => void;
  showAdminBtn?: boolean;
  isAdmin?: boolean;
  onAdminClick?: () => void;
  title?: string;
  isLoggedIn?: boolean;
}

export default function AppBar({
  activeTab = 'home',
  onTabChange,
  showAdminBtn = false,
  isAdmin = false,
  onAdminClick,
  title,
  isLoggedIn = false
}: AppBarProps) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('licenseKey');
    localStorage.removeItem('isAdmin');
    navigate('/login');
  };

  return (
    <header className="w-full bg-darker/90 backdrop-blur-2xl border-b border-gray-800/80 sticky top-0 z-50 select-none shadow-2xl">
      {/* Main Application Bar Header */}
      <div className="px-4 sm:px-8 py-3 flex items-center justify-between gap-4">
        {/* Brand & Logo */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onTabChange?.('home')}>
          <Logo size="sm" />
          {title && (
            <span className="hidden lg:inline text-xs font-bold px-2.5 py-1 bg-primary/10 border border-primary/20 text-primary rounded-full">
              {title}
            </span>
          )}
        </div>

        {/* Center Navigation Bar (Desktop / Tablet) Removed as requested */}

        {/* Right Action Controls */}
        <div className="flex items-center gap-3">
          {isLoggedIn && (
            <button
              onClick={handleLogout}
              className="p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all text-xs font-bold flex items-center gap-1.5"
              title="Αποσύνδεση"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">Έξοδος</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
