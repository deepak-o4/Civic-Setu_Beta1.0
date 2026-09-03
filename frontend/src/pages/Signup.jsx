import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User as UserIcon, ArrowRight, AlertCircle, Phone, ShieldCheck } from 'lucide-react';
import AnimatedPage from '../components/AnimatedPage';
import LanguageToggle from '../components/LanguageToggle';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { getHomeForRole } from '../utils/roleHome';

export default function Signup() {
  const { t } = useTranslation();
  const { user, role } = useAuth();
  const navigate = useNavigate();

  // Auto-redirect if already logged in
  useEffect(() => {
    if (user && role) {
      navigate(getHomeForRole(role), { replace: true });
    }
  }, [user, role, navigate]);

  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone || !form.password) {
      setError('Please fill in all fields.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (!/^\+?[1-9]\d{7,14}$/.test(form.phone)) {
      setError('Please enter a valid mobile number.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.post('/auth/signup', form);
      toast.success('Account created successfully. Please log in.');
      navigate('/login');
    } catch (err) {
      setError(err.message || 'Could not create your account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatedPage className="min-h-screen grid lg:grid-cols-2 bg-background relative overflow-hidden">
      {/* Left: form panel */}
      <div className="flex items-center justify-center px-4 py-16 relative order-2 lg:order-1">
        <div className="absolute inset-0 overflow-hidden pointer-events-none lg:hidden">
          <div className="blob-decor bottom-[-10%] right-[-10%] w-[50%] h-[30%] bg-accent/20" />
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
            <h1 className="font-display text-3xl font-extrabold text-ink tracking-tight">
              {t('auth.createAccount')}
            </h1>
            <p className="text-muted font-medium">
              {t('auth.signupSubtitle')}
            </p>
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

            <motion.form
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              onSubmit={handleSubmit}
              className="space-y-5"
            >
                  <div className="space-y-1.5 group">
                    <label className="text-sm font-semibold text-ink/70 ml-1 group-focus-within:text-primary-700 transition-colors">{t('auth.fullName')}</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <UserIcon className="h-5 w-5 text-muted group-focus-within:text-primary-600 transition-colors" />
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="John Doe"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="input-field pl-11"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 group">
                    <label className="text-sm font-semibold text-ink/70 ml-1 group-focus-within:text-primary-700 transition-colors">Mobile Number</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Phone className="h-5 w-5 text-muted group-focus-within:text-primary-600 transition-colors" />
                      </div>
                      <input
                        type="tel"
                        required
                        placeholder="9876543210"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/[^+\d]/g, '') })}
                        className="input-field pl-11"
                      />
                    </div>
                  </div>

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
                        Create Account
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform opacity-90" />
                      </>
                    )}
                  </button>
                </motion.form>

            <p className="mt-8 text-center text-sm text-muted font-medium">
              {t('auth.alreadyHaveAccount')}{' '}
              <Link to="/login" className="text-primary-700 hover:text-primary-800 font-bold hover:underline underline-offset-4">
                {t('auth.logIn')}
              </Link>
            </p>
          </div>
        </motion.div>
      </div>

      {/* Right: brand panel */}
      <div className="hidden lg:flex relative flex-col justify-between bg-ink text-white p-12 overflow-hidden order-1 lg:order-2">
        <div className="absolute inset-0 pointer-events-none">
          <motion.div
            animate={{ y: [0, -18, 0] }}
            transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
            className="blob-decor top-[-10%] right-[-10%] w-[55%] h-[55%] bg-accent/30"
          />
          <motion.div
            animate={{ y: [0, 16, 0] }}
            transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
            className="blob-decor bottom-[-15%] left-[-10%] w-[60%] h-[60%] bg-primary-500/30"
          />
        </div>

        <Link to="/" className="relative z-10 flex items-center gap-2.5 self-end">
          <span className="font-display font-extrabold text-xl tracking-tight">CivicSetu</span>
          <div className="w-10 h-10 bg-accent rounded-2xl flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-ink" />
          </div>
        </Link>

        <div className="relative z-10 space-y-6 max-w-md self-end text-right">
          <span className="pill-tag bg-accent/15 text-accent border-accent/30">{t('auth.signupBadge')}</span>
          <h1 className="font-display text-5xl font-extrabold leading-[1.05] tracking-tight">
            {t('auth.signupHeadline1')}<br />{t('auth.signupHeadline2')}
          </h1>
          <p className="text-white/60 font-medium">
            {t('auth.signupBrandSubtitle')}
          </p>
        </div>

        <p className="relative z-10 text-xs text-white/40 font-medium self-end">© {new Date().getFullYear()} CivicSetu</p>
      </div>
    </AnimatedPage>
  );
}

