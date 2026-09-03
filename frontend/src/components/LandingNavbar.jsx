import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShieldAlert, Menu, X, ArrowUpRight } from 'lucide-react';
import LanguageToggle from './LanguageToggle';

const LandingNavbar = () => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const navLinks = [
    { name: t('nav.home'), href: '#top', type: 'anchor' },
    { name: t('nav.howItWorks'), href: '#how-it-works', type: 'anchor' },
    { name: t('nav.aiIntelligence'), href: '#ai-intelligence', type: 'anchor' },
    { name: t('nav.analytics'), href: '/analytics-preview', type: 'route' },
    { name: t('nav.dashboard'), href: '/dashboard-preview', type: 'route' },
    { name: t('nav.about'), href: '#about', type: 'anchor' },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className="fixed top-4 left-0 right-0 z-50 px-4">
      <div
        className={`max-w-6xl mx-auto flex items-center justify-between gap-4 rounded-full border border-ink/5 bg-white/80 backdrop-blur-xl px-4 py-2.5 transition-shadow duration-300 ${
          scrolled ? 'shadow-soft' : 'shadow-card'
        }`}
      >
        <a href="#top" className="flex items-center gap-2.5 shrink-0">
          <div className="w-9 h-9 bg-ink rounded-xl flex items-center justify-center shadow-soft">
            <ShieldAlert className="w-4.5 h-4.5 text-accent" />
          </div>
          <span className="font-display font-extrabold text-lg text-ink tracking-tight">CivicSetu</span>
        </a>

        <nav className="hidden lg:flex items-center gap-1">
          {navLinks.map((link) =>
            link.type === 'route' ? (
              <Link
                key={link.href}
                to={link.href}
                className="px-3.5 py-2 rounded-full text-sm font-semibold text-ink/60 hover:text-ink hover:bg-ink/5 transition-colors"
              >
                {link.name}
              </Link>
            ) : (
              <a
                key={link.href}
                href={link.href}
                className="px-3.5 py-2 rounded-full text-sm font-semibold text-ink/60 hover:text-ink hover:bg-ink/5 transition-colors"
              >
                {link.name}
              </a>
            )
          )}
        </nav>

        <div className="hidden md:flex items-center gap-2 shrink-0">
          <LanguageToggle />
          <Link to="/login" className="btn-ghost !py-2">{t('nav.login')}</Link>
          <Link to="/signup" className="btn-primary !py-2 !px-5">
            {t('nav.reportIssue')} <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="flex md:hidden items-center gap-2">
          <LanguageToggle />
          <button
            className="p-2 rounded-full hover:bg-ink/5 shrink-0"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden max-w-6xl mx-auto mt-2 rounded-3xl border border-ink/5 bg-white shadow-soft p-4 space-y-1 animate-slide-up">
          {navLinks.map((link) =>
            link.type === 'route' ? (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => setOpen(false)}
                className="block px-4 py-3 rounded-2xl text-sm font-semibold text-ink/70 hover:bg-ink/5"
              >
                {link.name}
              </Link>
            ) : (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="block px-4 py-3 rounded-2xl text-sm font-semibold text-ink/70 hover:bg-ink/5"
              >
                {link.name}
              </a>
            )
          )}
          <div className="flex gap-2 pt-3">
            <Link to="/login" onClick={() => setOpen(false)} className="btn-outline flex-1 justify-center">{t('nav.login')}</Link>
            <Link to="/signup" onClick={() => setOpen(false)} className="btn-primary flex-1 justify-center">{t('nav.reportIssue')}</Link>
          </div>
        </div>
      )}
    </header>
  );
};

export default LandingNavbar;
