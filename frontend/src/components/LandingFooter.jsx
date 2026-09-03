import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShieldAlert, Globe, Link2, Rss, Mail } from 'lucide-react';

const socials = [Globe, Link2, Rss, Mail];

const LandingFooter = () => {
  const { t } = useTranslation();

  const columns = [
    {
      title: t('footer.platform'),
      links: [
        { name: t('nav.howItWorks'), href: '#how-it-works', type: 'anchor' },
        { name: t('nav.aiIntelligence'), href: '#ai-intelligence', type: 'anchor' },
        { name: t('nav.analytics'), href: '/analytics-preview', type: 'route' },
      ],
    },
    {
      title: t('footer.solutions'),
      links: [
        { name: t('footer.forCitizens'), href: '#citizen-experience', type: 'anchor' },
        { name: t('footer.forMunicipalities'), href: '/dashboard-preview', type: 'route' },
        { name: t('footer.smartCities'), href: '#about', type: 'anchor' },
      ],
    },
    {
      title: t('footer.company'),
      links: [
        { name: t('footer.about'), href: '#about', type: 'anchor' },
        { name: t('footer.contact'), href: '#contact', type: 'anchor' },
        { name: t('footer.privacy'), href: '#contact', type: 'anchor' },
      ],
    },
  ];

  return (
    <footer id="contact" className="bg-ink text-white rounded-t-[2.5rem] mt-8">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 pt-16 pb-10">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-10">
          <div className="col-span-2 md:col-span-3 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-accent rounded-xl flex items-center justify-center">
                <ShieldAlert className="w-4.5 h-4.5 text-ink" />
              </div>
              <span className="font-display font-extrabold text-lg tracking-tight">CivicSetu</span>
            </div>
            <p className="text-white/50 text-sm max-w-xs leading-relaxed">
              {t('footer.tagline')}
            </p>
            <div className="flex items-center gap-2 pt-2">
              {socials.map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-accent hover:text-ink transition-colors"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.title} className="col-span-1 md:col-span-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-4">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.name}>
                    {link.type === 'route' ? (
                      <Link to={link.href} className="text-sm text-white/70 hover:text-accent transition-colors">
                        {link.name}
                      </Link>
                    ) : (
                      <a href={link.href} className="text-sm text-white/70 hover:text-accent transition-colors">
                        {link.name}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-white/40">© {new Date().getFullYear()} CivicSetu. {t('footer.rights')}</p>
          <div className="flex items-center gap-5 text-xs text-white/40">
            <Link to="/login" className="hover:text-white/70">{t('nav.login')}</Link>
            <Link to="/signup" className="hover:text-white/70">{t('footer.getStarted')}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;
