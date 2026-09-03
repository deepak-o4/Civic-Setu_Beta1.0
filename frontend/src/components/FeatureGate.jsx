import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { LogIn, ShieldAlert, ArrowRight, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getHomeForRole } from '../utils/roleHome';

/**
 * Landing-page feature preview gate.
 * If the person is already logged in, silently forwards them to the real
 * destination for their role. If not, shows a friendly "log in to view this"
 * card instead of the raw protected content.
 */
export default function FeatureGate({ title, description, titleKey, descKey, targetPath }) {
  const { t } = useTranslation();
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  const resolvedTitle = titleKey ? t(titleKey) : title;
  const resolvedDescription = descKey ? t(descKey) : description;

  useEffect(() => {
    if (!loading && user && role) {
      navigate(targetPath || getHomeForRole(role), { replace: true });
    }
  }, [loading, user, role, navigate, targetPath]);

  if (loading) return null;

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background px-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="blob-decor top-[10%] -left-[10%] w-[40%] h-[40%] bg-accent/20" />
        <div className="blob-decor bottom-[5%] -right-[10%] w-[35%] h-[35%] bg-primary-400/15" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="card p-8 md:p-10 max-w-md w-full text-center relative z-10 space-y-5"
      >
        <div className="w-14 h-14 rounded-2xl bg-ink flex items-center justify-center mx-auto">
          <ShieldAlert className="w-7 h-7 text-accent" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-display font-extrabold text-ink tracking-tight">
            {t('featureGate.loginToView', { title: resolvedTitle })}
          </h1>
          <p className="text-muted font-medium">
            {resolvedDescription || t('featureGate.genericDesc', { title: resolvedTitle })}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link to="/login" state={{ from: targetPath }} className="btn-primary flex-1 justify-center">
            <LogIn className="w-4.5 h-4.5" /> {t('featureGate.login')}
          </Link>
          <Link to="/signup" className="btn-outline flex-1 justify-center">
            <UserPlus className="w-4.5 h-4.5" /> {t('featureGate.signup')}
          </Link>
        </div>

        <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink pt-1">
          <ArrowRight className="w-4 h-4 rotate-180" /> {t('featureGate.backHome')}
        </Link>
      </motion.div>
    </div>
  );
}
