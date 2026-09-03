import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User as UserIcon, ArrowRight, AlertCircle, ShieldCheck, KeyRound, RotateCcw } from 'lucide-react';
import AnimatedPage from '../components/AnimatedPage';
import LanguageToggle from '../components/LanguageToggle';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { getHomeForRole } from '../utils/roleHome';

const RESEND_COOLDOWN = 60;

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

  const [step, setStep] = useState('details'); // 'details' | 'otp'
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      setError('Please fill in all fields.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.post('/auth/request-otp', { email: form.email });
      toast.success(`Verification code sent to ${form.email}`);
      setStep('otp');
      setCooldown(RESEND_COOLDOWN);
    } catch (err) {
      setError(err.message || 'Could not send verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (cooldown > 0) return;
    setLoading(true);
    setError(null);
    try {
      await api.post('/auth/request-otp', { email: form.email });
      toast.success('A new code has been sent.');
      setCooldown(RESEND_COOLDOWN);
    } catch (err) {
      setError(err.message || 'Could not resend code.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndCreate = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(otp)) {
      setError('Enter the 6-digit code from your email.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.post('/auth/verify-otp', { email: form.email, otp });
      await api.post('/auth/signup', form);
      toast.success('Account created and email verified! Please log in.');
      navigate('/login');
    } catch (err) {
      setError(err.message || 'Verification failed. Please try again.');
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
              {step === 'details' ? t('auth.createAccount') : t('auth.verifyEmail')}
            </h1>
            <p className="text-muted font-medium">
              {step === 'details'
                ? t('auth.signupSubtitle')
                : <>{t('auth.codeSentTo')} <span className="font-semibold text-ink">{form.email}</span></>}
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

            <AnimatePresence mode="wait">
              {step === 'details' ? (
                <motion.form
                  key="details"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  onSubmit={handleSendOtp}
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
                        {t('auth.sendCode')}
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform opacity-90" />
                      </>
                    )}
                  </button>
                </motion.form>
              ) : (
                <motion.form
                  key="otp"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  onSubmit={handleVerifyAndCreate}
                  className="space-y-5"
                >
                  <div className="space-y-1.5 group">
                    <label className="text-sm font-semibold text-ink/70 ml-1 group-focus-within:text-primary-700 transition-colors">{t('auth.sixDigitCode')}</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <KeyRound className="h-5 w-5 text-muted group-focus-within:text-primary-600 transition-colors" />
                      </div>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        required
                        placeholder="123456"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="input-field pl-11 tracking-[0.5em] font-bold text-center"
                      />
                    </div>
                    <p className="text-xs text-muted ml-1">{t('auth.codeExpiry')}</p>
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
                        {t('auth.verifyAndCreate')}
                        <ShieldCheck className="w-5 h-5 opacity-90" />
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-between text-sm pt-1">
                    <button
                      type="button"
                      onClick={() => { setStep('details'); setError(null); }}
                      className="text-muted hover:text-ink font-medium"
                    >
                      &larr; {t('auth.editDetails')}
                    </button>
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={cooldown > 0 || loading}
                      className="flex items-center gap-1.5 text-primary-700 hover:text-primary-800 font-bold disabled:text-muted disabled:cursor-not-allowed"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      {cooldown > 0 ? t('auth.resendIn', { seconds: cooldown }) : t('auth.resendCode')}
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

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

