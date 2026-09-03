import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, ArrowRight, AlertCircle, UserCircle2 } from 'lucide-react';
import AnimatedPage from '../components/AnimatedPage';
import LanguageToggle from '../components/LanguageToggle';
import { getHomeForRole } from '../utils/roleHome';

export default function Login() {
  const { t } = useTranslation();
  const { login, user, role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Auto-redirect if already logged in
  useEffect(() => {
    if (user && role) {
      navigate(getHomeForRole(role), { replace: true });
    }
  }, [user, role, navigate]);
  
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/auth/login', form);
      login(res.data);

      const loggedInRole = res.data.user?.role?.toLowerCase();
      navigate(getHomeForRole(loggedInRole), { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatedPage className="min-h-screen grid lg:grid-cols-2 bg-background relative overflow-hidden">
      {/* Left: brand panel */}
      <div className="hidden lg:flex relative flex-col justify-between bg-ink text-white p-12 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <motion.div
            animate={{ y: [0, -18, 0], rotate: [0, 4, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            className="blob-decor top-[-10%] left-[-10%] w-[55%] h-[55%] bg-accent/30"
          />
          <motion.div
            animate={{ y: [0, 16, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
            className="blob-decor bottom-[-15%] right-[-10%] w-[60%] h-[60%] bg-primary-500/30"
          />
        </div>

        <Link to="/" className="relative z-10 flex items-center gap-2.5">
          <div className="w-10 h-10 bg-accent rounded-2xl flex items-center justify-center">
            <UserCircle2 className="w-5 h-5 text-ink" />
          </div>
          <span className="font-display font-extrabold text-xl tracking-tight">CivicSetu</span>
        </Link>

        <div className="relative z-10 space-y-6 max-w-md">
          <span className="pill-tag bg-accent/15 text-accent border-accent/30">{t('auth.brandBadge')}</span>
          <h1 className="font-display text-5xl font-extrabold leading-[1.05] tracking-tight">
            {t('auth.loginHeadline1')}<br />{t('auth.loginHeadline2')}
          </h1>
          <p className="text-white/60 font-medium">
            {t('auth.loginBrandSubtitle')}
          </p>
        </div>

        <p className="relative z-10 text-xs text-white/40 font-medium">© {new Date().getFullYear()} CivicSetu</p>
      </div>

      {/* Right: form panel */}
      <div className="flex items-center justify-center px-4 py-16 relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none lg:hidden">
          <div className="blob-decor top-[-10%] left-[-10%] w-[50%] h-[30%] bg-accent/20" />
        </div>

        <div className="absolute top-6 right-6 z-20">
          <LanguageToggle />
        </div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 20 }}
          className="w-full max-w-md relative z-10"
        >
          <div className="text-left mb-8 space-y-2">
            <h1 className="font-display text-3xl font-extrabold text-ink tracking-tight">{t('auth.welcomeBack')}</h1>
            <p className="text-muted font-medium">{t('auth.loginSubtitle')}</p>
          </div>

          <div className="card p-8">
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  className="bg-rose-50 text-rose-600 p-4 rounded-2xl text-center font-medium border border-rose-100 flex items-center justify-center gap-2 overflow-hidden"
                >
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm">{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5 group">
                <label className="text-sm font-semibold text-ink/70 ml-1 group-focus-within:text-primary-700 transition-colors">{t('auth.emailAddress')}</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-muted group-focus-within:text-primary-600 transition-colors" />
                  </div>
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="input-field pl-11"
                  />
                </div>
              </div>

              <div className="space-y-1.5 group">
                <label className="text-sm font-semibold text-ink/70 ml-1 group-focus-within:text-primary-700 transition-colors">{t('auth.password')}</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-muted group-focus-within:text-primary-600 transition-colors" />
                  </div>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="input-field pl-11"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`btn-secondary w-full mt-2 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {t('auth.signIn')}
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform opacity-90" />
                  </>
                )}
              </button>
            </form>

            <p className="mt-8 text-center text-sm text-muted font-medium">
              {t('auth.noAccount')}{' '}
              <Link to="/signup" className="text-primary-700 hover:text-primary-800 font-bold hover:underline underline-offset-4">
                {t('auth.signUp')}
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatedPage>
  );
}
