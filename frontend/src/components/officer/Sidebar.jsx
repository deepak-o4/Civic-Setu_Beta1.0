import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, FileText, Search, MessageSquare, Settings, LogOut, ShieldAlert, BarChart3, ListTodo, X, Sparkles, Flame } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Sidebar = ({ mobileOpen, onClose }) => {
  const { role, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const adminItems = [
    { name: 'Admin Panel', path: '/admin', icon: LayoutDashboard, end: true },
    { name: 'All Complaints', path: '/admin/complaints', icon: ListTodo, end: false },
    { name: 'City Heatmap', path: '/admin/heatmap', icon: Flame, end: false },
    { name: 'Analytics', path: '/admin/analytics', icon: BarChart3, end: false },
    { name: 'AI Assistant', path: '/admin/chat', icon: Sparkles, end: false },
  ];

  // Same feature set as Admin (full parity), just pointed at the /officer
  // URL prefix so the portal branding stays distinct for Officer/Head users.
  const officerItems = [
    { name: 'Overview', path: '/officer', icon: LayoutDashboard, end: true },
    { name: 'All Complaints', path: '/officer/complaints', icon: ListTodo, end: false },
    { name: 'City Heatmap', path: '/officer/heatmap', icon: Flame, end: false },
    { name: 'Analytics', path: '/officer/analytics', icon: BarChart3, end: false },
    { name: 'AI Assistant', path: '/officer/chat', icon: Sparkles, end: false },
  ];

  const citizenItems = [
    { name: 'My Complaints', path: '/dashboard', icon: LayoutDashboard, end: true },
    { name: 'Submit Complaint', path: '/dashboard/submit', icon: FileText, end: false },
    { name: 'Track Status', path: '/dashboard/track', icon: Search, end: false },
    { name: 'Feedback', path: '/dashboard/feedback', icon: MessageSquare, end: false },
    { name: 'AI Assistant', path: '/dashboard/chat', icon: Sparkles, end: false },
  ];

  const navItemsByRole = { admin: adminItems, officer: officerItems, head: officerItems, citizen: citizenItems };
  const navItems = navItemsByRole[role] || citizenItems;

  const portalLabelByRole = {
    admin: 'Admin Portal',
    officer: 'Officer Portal',
    head: 'Department Head Portal',
    citizen: 'Citizen Portal',
  };

  const sidebarContent = (
    <>
      <div className="h-16 flex items-center px-6 border-b border-white/5">
        <div className="flex items-center gap-3 text-white w-full group cursor-pointer">
          <div className="w-9 h-9 bg-gradient-to-br bg-accent rounded-xl flex items-center justify-center shadow-lg shadow-accent/20 group-hover:shadow-accent/40 transition-shadow">
            <ShieldAlert className="w-5 h-5 text-ink" />
          </div>
          <div className="flex flex-col flex-1">
            <span className="font-bold text-[18px] tracking-tight group-hover:text-accent transition-colors leading-tight">
              CivicSetu
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-accent">
              {portalLabelByRole[role] || 'Citizen Portal'}
            </span>
          </div>
          {/* Mobile close button */}
          {mobileOpen && (
            <button onClick={onClose} className="md:hidden p-1 text-slate-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-8 px-4 space-y-2 scrollbar-hide">
        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-4 px-3">
          Overview
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.path}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 px-3 py-3 rounded-xl font-medium transition-colors duration-300 ${
                  isActive ? 'text-ink' : 'text-white/50 hover:text-white/80'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-highlight"
                      className="absolute inset-0 bg-accent rounded-xl"
                      initial={false}
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                  <Icon className={`w-5 h-5 relative z-10 transition-colors duration-300 ${isActive ? 'text-accent' : 'text-slate-500 group-hover:text-slate-300'}`} />
                  <span className="relative z-10">{item.name}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>

      <div className="p-4 border-t border-white/5 space-y-2 mb-2">
        <button className="group relative flex items-center gap-3 px-3 py-3 w-full text-left rounded-xl font-medium text-slate-400 hover:text-white/70 transition-colors duration-300">
          <div className="absolute inset-0 bg-slate-800/0 group-hover:bg-slate-800/50 rounded-xl transition-colors duration-300" />
          <Settings className="w-5 h-5 relative z-10 text-slate-500 group-hover:text-slate-300 transition-colors" />
          <span className="relative z-10">Settings</span>
        </button>
        <button onClick={handleLogout} className="group relative flex items-center gap-3 px-3 py-3 w-full text-left rounded-xl font-medium text-slate-400 hover:text-rose-400 transition-colors duration-300">
          <div className="absolute inset-0 bg-rose-500/0 group-hover:bg-rose-500/10 rounded-xl transition-colors duration-300" />
          <LogOut className="w-5 h-5 relative z-10 text-slate-500 group-hover:text-rose-400 transition-colors" />
          <span className="relative z-10">Logout</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="w-64 bg-ink border-r border-white/5 text-slate-300 flex-col h-full shrink-0 transition-all duration-300 shadow-xl hidden md:flex">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed top-0 left-0 w-64 h-full bg-ink border-r border-white/5 text-slate-300 flex flex-col z-50 shadow-2xl md:hidden"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;
