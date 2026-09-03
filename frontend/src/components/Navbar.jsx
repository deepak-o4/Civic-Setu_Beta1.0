import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShieldAlert, FileText, Activity, MessageSquare, Menu, X, ArrowUpRight } from 'lucide-react';

const Navbar = () => {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const navLinks = [
    { name: 'Submit Complaint', path: '/', icon: FileText },
    { name: 'Track Status', path: '/track', icon: Activity },
    { name: 'Feedback', path: '/feedback', icon: MessageSquare },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-ink/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 bg-ink rounded-2xl flex items-center justify-center shadow-soft group-hover:rotate-6 transition-transform duration-300">
              <ShieldAlert className="w-5 h-5 text-accent" />
            </div>
            <span className="font-display font-extrabold text-xl text-ink tracking-tight">CivicSetu</span>
          </Link>

          <div className="hidden md:flex items-center gap-1 bg-white border border-ink/5 rounded-full p-1.5 shadow-card">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-ink text-accent'
                      : 'text-ink/60 hover:bg-ink/5 hover:text-ink'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.name}
                </Link>
              );
            })}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link to="/login" className="btn-ghost">Log in</Link>
            <Link to="/signup" className="btn-primary">
              Get started <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>

          <button className="md:hidden p-2 rounded-full hover:bg-ink/5" onClick={() => setOpen(!open)}>
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-ink/5 bg-background px-4 py-4 space-y-2 animate-slide-up">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold ${
                  isActive ? 'bg-ink text-accent' : 'text-ink/70 hover:bg-ink/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                {link.name}
              </Link>
            );
          })}
          <div className="flex gap-2 pt-2">
            <Link to="/login" onClick={() => setOpen(false)} className="btn-outline flex-1">Log in</Link>
            <Link to="/signup" onClick={() => setOpen(false)} className="btn-primary flex-1">Sign up</Link>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
