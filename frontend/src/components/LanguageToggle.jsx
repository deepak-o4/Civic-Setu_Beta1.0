import React from 'react';
import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';

export default function LanguageToggle({ className = '' }) {
  const { i18n } = useTranslation();
  const isHindi = i18n.language?.startsWith('hi');

  const toggle = () => {
    i18n.changeLanguage(isHindi ? 'en' : 'hi');
  };

  return (
    <button
      type="button"
      onClick={toggle}
      title={isHindi ? 'Switch to English' : 'हिंदी में बदलें'}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border border-ink/10 bg-white hover:border-ink/25 text-ink/70 hover:text-ink transition-colors ${className}`}
    >
      <Languages className="w-3.5 h-3.5" />
      <span className={!isHindi ? 'text-primary-700' : ''}>EN</span>
      <span className="text-ink/20">/</span>
      <span className={isHindi ? 'text-primary-700' : ''}>हिं</span>
    </button>
  );
}
