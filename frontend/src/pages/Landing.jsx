import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight, ArrowUpRight, FileText, ScanSearch, ListOrdered, CheckCircle2,
  Camera, MapPin, Gauge, Sparkles, BarChart3, Bell, Brain, ShieldCheck,
  TrendingUp, AlertTriangle, Clock, Users, Building2, Zap, Map as MapIcon,
  MessageSquareText, LayoutDashboard, Activity, ChevronRight,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, BarChart, Bar, Tooltip,
} from 'recharts';
import LandingNavbar from '../components/LandingNavbar';
import LandingFooter from '../components/LandingFooter';
import SubtleCivicBackground from '../components/SubtleCivicBackground';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const Reveal = ({ children, className = '', delay = 0 }) => (
  <motion.div
    variants={fadeUp}
    initial="hidden"
    whileInView="show"
    viewport={{ once: true, amount: 0.2 }}
    transition={{ delay }}
    className={className}
  >
    {children}
  </motion.div>
);

const baseTrendData = [
  { d: 'Mon', v: 32 }, { d: 'Tue', v: 41 }, { d: 'Wed', v: 38 },
  { d: 'Thu', v: 52 }, { d: 'Fri', v: 47 }, { d: 'Sat', v: 61 }, { d: 'Sun', v: 58 },
];

const baseCategoryData = [
  { name: 'Roads', v: 128 }, { name: 'Water', v: 94 }, { name: 'Waste', v: 76 },
  { name: 'Electric', v: 61 }, { name: 'Drainage', v: 44 },
];

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Gently jitters a base dataset on an interval so the landing page's demo
// charts read as "live" rather than a frozen mockup, without needing a real
// backend feed. Skips entirely for prefers-reduced-motion users.
const useLiveJitter = (base, { intervalMs = 2600, spread = 0.16 } = {}) => {
  const [data, setData] = useState(base);
  useEffect(() => {
    if (prefersReducedMotion()) return undefined;
    const id = setInterval(() => {
      setData((prev) =>
        prev.map((point, i) => {
          const baseVal = base[i].v;
          const drift = baseVal * spread * (Math.random() - 0.5) * 2;
          return { ...point, v: Math.max(4, Math.round(baseVal + drift)) };
        })
      );
    }, intervalMs);
    return () => clearInterval(id);
  }, [base, intervalMs, spread]);
  return data;
};

const SectionTag = ({ children }) => (
  <span className="pill-tag">{children}</span>
);

const Landing = () => {
  const { t } = useTranslation();
  const trendData = useLiveJitter(baseTrendData, { intervalMs: 2600, spread: 0.18 });
  const categoryData = useLiveJitter(baseCategoryData, { intervalMs: 3200, spread: 0.14 });

  const [resolutionPct, setResolutionPct] = useState(78);
  useEffect(() => {
    if (prefersReducedMotion()) return undefined;
    const id = setInterval(() => {
      setResolutionPct(74 + Math.round(Math.random() * 8)); // fluctuates 74–82%
    }, 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <div id="top" className="relative w-full min-h-screen overflow-x-clip">
      <SubtleCivicBackground />
      <LandingNavbar />

      {/* ============ HERO ============ */}
      <section className="relative pt-40 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
          <motion.div
            animate={{ scale: [1, 1.15, 1], rotate: [0, 8, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
            className="blob-decor top-[2%] -left-[10%] w-[42%] h-[42%] bg-accent/25"
          />
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
            className="blob-decor top-[10%] -right-[10%] w-[36%] h-[40%] bg-primary-400/20"
          />
        </div>

        <div className="max-w-5xl mx-auto text-center space-y-6">
          <Reveal>
            <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-300 text-amber-800 text-xs font-bold px-4 py-1.5 rounded-full mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Proposed Solution — Currently in Testing / Pilot Phase, Not Yet Live for Public Use
            </div>
          </Reveal>
          <Reveal>
            <SectionTag><Sparkles className="w-3.5 h-3.5" /> {t('hero.badge')}</SectionTag>
          </Reveal>
          <Reveal delay={0.05}>
            <h1 className="text-5xl md:text-7xl font-display font-extrabold text-ink tracking-tight leading-[1.02]">
              {t('hero.titleLine1')}<br />
              {t('hero.titlePrefix')} <span className="relative inline-block">
                {t('hero.titleWord')}
                <svg className="absolute -bottom-1 left-0 w-full" height="10" viewBox="0 0 200 10" preserveAspectRatio="none">
                  <path d="M0,6 Q50,0 100,5 T200,4" stroke="#C6F135" strokeWidth="6" fill="none" strokeLinecap="round" />
                </svg>
              </span> {t('hero.titleSuffix')}
            </h1>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="text-lg md:text-xl text-muted font-medium max-w-2xl mx-auto">
              {t('hero.subtitle')}
            </p>
          </Reveal>
          <Reveal delay={0.15} className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link to="/signup" className="btn-primary px-7 py-3.5 text-base">
              {t('hero.ctaPrimary')} <ArrowRight className="w-4.5 h-4.5" />
            </Link>
            <Link to="/analytics-preview" className="btn-outline px-7 py-3.5 text-base">
              {t('hero.ctaSecondary')} <ArrowUpRight className="w-4.5 h-4.5" />
            </Link>
          </Reveal>
        </div>

        {/* Hero product mockup */}
        <Reveal delay={0.25} className="max-w-6xl mx-auto mt-16">
          <div className="relative rounded-[2rem] border border-ink/10 bg-white shadow-soft p-3 md:p-5">
            <div className="flex items-center gap-1.5 px-3 pb-3">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-300" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-300" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-300" />
              <span className="ml-3 text-xs font-semibold text-muted/70">{t('hero.mockup.title')}</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-2 md:p-3">
              {/* City Overview */}
              <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: t('hero.mockup.totalReports'), value: '4,812', icon: FileText, tone: 'bg-ink text-accent' },
                  { label: t('hero.mockup.criticalIssues'), value: '37', icon: AlertTriangle, tone: 'bg-rose-500 text-white' },
                  { label: t('hero.mockup.resolvedIssues'), value: '3,960', icon: CheckCircle2, tone: 'bg-primary-500 text-white' },
                  { label: t('hero.mockup.resolutionRate'), value: '92%', icon: Gauge, tone: 'bg-accent text-ink' },
                ].map((s) => (
                  <div key={s.label} className="bg-background rounded-2xl p-4 border border-ink/5">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-3 ${s.tone}`}>
                      <s.icon className="w-4 h-4" />
                    </div>
                    <p className="text-xl font-display font-extrabold text-ink">{s.value}</p>
                    <p className="text-[11px] font-semibold text-muted uppercase tracking-wide mt-0.5">{s.label}</p>
                  </div>
                ))}

                <div className="col-span-2 sm:col-span-4 bg-background rounded-2xl p-4 border border-ink/5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold text-ink/70 uppercase tracking-wide">{t('hero.mockup.trendTitle')}</p>
                    <span className="text-xs font-semibold text-primary-700 flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5" /> +18%
                    </span>
                  </div>
                  <div className="h-24">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="heroTrend" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#22b96c" stopOpacity={0.4} />
                            <stop offset="100%" stopColor="#22b96c" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="d" hide />
                        <Area type="monotone" dataKey="v" stroke="#149a58" strokeWidth={2.5} fill="url(#heroTrend)" isAnimationActive animationDuration={900} animationEasing="ease-in-out" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* AI Insight + Priority queue */}
              <div className="space-y-3">
                <div className="bg-ink text-white rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="w-4 h-4 text-accent" />
                    <p className="text-xs font-bold uppercase tracking-wide text-white/60">{t('hero.mockup.aiInsight')}</p>
                  </div>
                  <p className="font-display font-bold text-sm mb-2">{t('hero.mockup.roadDamage')}</p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/60">{t('hero.mockup.confidence')}</span>
                    <span className="font-bold text-accent">96%</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/10 rounded-full mt-1 mb-2">
                    <div className="h-1.5 bg-accent rounded-full" style={{ width: '96%' }} />
                  </div>
                  <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    {t('hero.mockup.priorityHigh')}
                  </span>
                </div>

                <div className="bg-background rounded-2xl p-4 border border-ink/5">
                  <p className="text-xs font-bold text-ink/70 uppercase tracking-wide mb-3">{t('hero.mockup.priorityQueue')}</p>
                  <div className="space-y-2">
                    {[
                      { l: 'Critical', c: 'bg-rose-500', n: 12 },
                      { l: 'High', c: 'bg-orange-400', n: 27 },
                      { l: 'Medium', c: 'bg-amber-300', n: 64 },
                      { l: 'Low', c: 'bg-emerald-400', n: 41 },
                    ].map((p) => (
                      <div key={p.l} className="flex items-center gap-2 text-xs font-semibold text-ink/70">
                        <span className={`w-2 h-2 rounded-full ${p.c}`} />
                        <span className="flex-1">{p.l}</span>
                        <span className="text-ink">{p.n}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ============ PROBLEM STATEMENT ============ */}
      <section id="problem" className="py-16 px-4 sm:px-6 lg:px-8 scroll-mt-28">
        <Reveal className="max-w-6xl mx-auto text-center mb-12">
          <SectionTag><AlertTriangle className="w-3.5 h-3.5" /> The Problem</SectionTag>
          <h2 className="text-3xl md:text-5xl font-display font-extrabold text-ink tracking-tight mt-4">
            Why Indian cities need this
          </h2>
          <p className="text-ink/60 font-medium max-w-2xl mx-auto mt-4 leading-relaxed">
            Civic grievance redressal in most Indian municipalities today is slow, manual, and opaque.
            CivicSetu is a proposed, in-testing solution built to close these specific gaps:
          </p>
        </Reveal>

        <Reveal className="max-w-6xl mx-auto grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: Clock,
              title: 'Slow, manual triage',
              gap: 'Complaints sit in a queue until a human reads, categorizes, and routes each one — often taking days before anyone even sees it.',
              fix: 'AI classifies and routes complaints to the right department the moment they\'re submitted.',
            },
            {
              icon: MapIcon,
              title: 'Misrouted complaints',
              gap: 'Citizens often don\'t know which department handles what, so complaints land with the wrong office and get bounced around or ignored.',
              fix: 'Automatic department/category detection from the complaint text and photo — no guesswork for the citizen.',
            },
            {
              icon: Gauge,
              title: 'No real prioritization',
              gap: 'A pothole and a burst sewage pipe often wait in the same first-in-first-out line, regardless of actual urgency or risk to public safety.',
              fix: 'An explainable Priority Engine scores severity, impact, frequency, and location risk — and officers/heads can still override it after inspecting a case themselves.',
            },
            {
              icon: ShieldCheck,
              title: 'Zero transparency for citizens',
              gap: 'Once filed, a complaint usually disappears into a black box — no tracking ID, no status updates, no idea who\'s responsible.',
              fix: 'Every complaint gets a trackable ticket ID, a live status timeline, and real-time notifications as it moves through resolution.',
            },
            {
              icon: Activity,
              title: 'No visibility into patterns',
              gap: 'Municipalities rarely see the bigger picture — which areas keep generating the same complaints, or which departments are falling behind.',
              fix: 'Live analytics, heatmaps, and recurring-problem detection give administrators a city-wide view instead of a pile of individual tickets.',
            },
            {
              icon: Zap,
              title: 'Disconnected support channels',
              gap: 'Citizens have no single place to ask questions, check status, or get guidance during an active civic issue like flooding or an outage.',
              fix: 'A RAG-powered AI assistant answers questions and looks up ticket status directly, grounded in the platform\'s own complaint history.',
            },
          ].map((item) => (
            <div key={item.title} className="card p-6 h-full flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
                <item.icon className="w-5 h-5" />
              </div>
              <h3 className="font-display font-bold text-ink">{item.title}</h3>
              <p className="text-sm text-ink/60 leading-relaxed">{item.gap}</p>
              <div className="mt-auto pt-3 border-t border-ink/5 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary-600 shrink-0 mt-0.5" />
                <p className="text-sm text-ink/80 font-medium leading-relaxed">{item.fix}</p>
              </div>
            </div>
          ))}
        </Reveal>
      </section>

      {/* ============ TRUST STRIP ============ */}
      <section className="py-10 px-4 sm:px-6 lg:px-8">
        <Reveal className="max-w-6xl mx-auto flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {[
            { icon: Brain, label: t('trustStrip.aiPowered') },
            { icon: BarChart3, label: t('trustStrip.dataDriven') },
            { icon: Users, label: t('trustStrip.citizenCentric') },
            { icon: Building2, label: t('trustStrip.municipalityReady') },
            { icon: MapIcon, label: t('trustStrip.smartCityFocused') },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2 text-muted font-semibold text-sm">
              <item.icon className="w-4 h-4 text-primary-600" />
              {item.label}
            </div>
          ))}
        </Reveal>
      </section>

      {/* ============ FEATURES ============ */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center max-w-2xl mx-auto space-y-4 mb-14">
            <SectionTag>{t('features.tag')}</SectionTag>
            <h2 className="text-3xl md:text-5xl font-display font-extrabold text-ink tracking-tight">
              {t('features.title')}
            </h2>
            <p className="text-muted font-medium">
              {t('features.subtitle')}
            </p>
          </Reveal>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.15 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {[
              { icon: Brain, title: t('features.aiClassification.title'), desc: t('features.aiClassification.desc') },
              { icon: ListOrdered, title: t('features.prioritization.title'), desc: t('features.prioritization.desc') },
              { icon: BarChart3, title: t('features.analytics.title'), desc: t('features.analytics.desc') },
              { icon: ShieldCheck, title: t('features.decisionSupport.title'), desc: t('features.decisionSupport.desc') },
              { icon: Activity, title: t('features.tracking.title'), desc: t('features.tracking.desc') },
              { icon: MapPin, title: t('features.location.title'), desc: t('features.location.desc') },
            ].map((f) => (
              <motion.div key={f.title} variants={fadeUp} className="card p-6 hover:-translate-y-1 transition-transform duration-300">
                <div className="w-11 h-11 rounded-2xl bg-ink flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-accent" />
                </div>
                <h3 className="font-display font-bold text-lg text-ink mb-1.5">{f.title}</h3>
                <p className="text-sm text-muted leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section id="how-it-works" className="py-16 px-4 sm:px-6 lg:px-8 scroll-mt-28">
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center max-w-2xl mx-auto space-y-4 mb-14">
            <SectionTag>{t('howItWorks.tag')}</SectionTag>
            <h2 className="text-3xl md:text-5xl font-display font-extrabold text-ink tracking-tight">
              {t('howItWorks.title')}
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            {[
              { n: '01', title: t('howItWorks.step1.title'), desc: t('howItWorks.step1.desc'), icon: FileText },
              { n: '02', title: t('howItWorks.step2.title'), desc: t('howItWorks.step2.desc'), icon: ScanSearch },
              { n: '03', title: t('howItWorks.step3.title'), desc: t('howItWorks.step3.desc'), icon: Gauge },
              { n: '04', title: t('howItWorks.step4.title'), desc: t('howItWorks.step4.desc'), icon: CheckCircle2 },
            ].map((s, i) => (
              <Reveal key={s.n} delay={i * 0.08} className="relative card p-6">
                <span className="text-5xl font-display font-black text-ink/5 absolute top-4 right-5">{s.n}</span>
                <div className="w-11 h-11 rounded-2xl bg-accent/20 border border-accent/40 flex items-center justify-center mb-5 relative z-10">
                  <s.icon className="w-5 h-5 text-primary-700" />
                </div>
                <h3 className="font-display font-bold text-lg text-ink mb-1.5 relative z-10">{s.title}</h3>
                <p className="text-sm text-muted leading-relaxed relative z-10">{s.desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ AI INTELLIGENCE SHOWCASE ============ */}
      <section id="ai-intelligence" className="py-16 px-4 sm:px-6 lg:px-8 scroll-mt-28">
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center max-w-2xl mx-auto space-y-4 mb-14">
            <SectionTag>{t('aiIntelligence.tag')}</SectionTag>
            <h2 className="text-3xl md:text-5xl font-display font-extrabold text-ink tracking-tight">
              {t('aiIntelligence.title')}
            </h2>
          </Reveal>

          <Reveal className="card-dark p-6 md:p-10">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
              {/* Input */}
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-wide text-white/40">{t('aiIntelligence.input')}</p>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2.5">
                  <div className="flex items-center gap-2 text-sm text-white/80"><MessageSquareText className="w-4 h-4 text-accent" /> {t('aiIntelligence.citizenComplaint')}</div>
                  <div className="flex items-center gap-2 text-sm text-white/80"><Camera className="w-4 h-4 text-accent" /> {t('aiIntelligence.attachedImage')}</div>
                  <div className="flex items-center gap-2 text-sm text-white/80"><MapPin className="w-4 h-4 text-accent" /> {t('aiIntelligence.locationData')}</div>
                </div>
              </div>

              <div className="flex lg:flex-col items-center justify-center gap-2 text-accent">
                <ChevronRight className="w-6 h-6 rotate-90 lg:rotate-0" />
                <span className="text-xs font-bold uppercase tracking-wide text-white/50">{t('aiIntelligence.processing')}</span>
                <ChevronRight className="w-6 h-6 rotate-90 lg:rotate-0" />
              </div>

              {/* Output */}
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-wide text-white/40">{t('aiIntelligence.output')}</p>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
                  <p className="font-display font-bold text-white">{t('aiIntelligence.detected')}</p>
                  <div className="flex items-center justify-between text-xs text-white/70">
                    <span>{t('aiIntelligence.confidence')}</span><span className="font-bold text-accent">94%</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-white/70">
                    <span>{t('aiIntelligence.category')}</span><span className="font-semibold text-white">{t('aiIntelligence.waterSupply')}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-white/70">
                    <span>{t('aiIntelligence.priority')}</span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">{t('aiIntelligence.high')}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-white/70">
                    <span>{t('aiIntelligence.recommendedAction')}</span><span className="font-semibold text-white">{t('aiIntelligence.dispatch')}</span>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ PRIORITY ENGINE ============ */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <Reveal className="space-y-5">
            <SectionTag>{t('priorityEngine.tag')}</SectionTag>
            <h2 className="text-3xl md:text-4xl font-display font-extrabold text-ink tracking-tight">
              {t('priorityEngine.title')}
            </h2>
            <p className="text-muted font-medium">
              {t('priorityEngine.subtitle')}
            </p>
            <ul className="space-y-3">
              {[t('priorityEngine.severity'), t('priorityEngine.publicImpact'), t('priorityEngine.location'), t('priorityEngine.frequency'), t('priorityEngine.urgency')].map((f) => (
                <li key={f} className="flex items-center gap-3 text-sm font-semibold text-ink/80">
                  <span className="w-6 h-6 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary-700" />
                  </span>
                  {f}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={0.1} className="card p-6 space-y-3">
            {[
              { l: t('priorityEngine.critical.label'), d: t('priorityEngine.critical.desc'), c: 'bg-rose-500', tc: 'text-rose-600', bg: 'bg-rose-50' },
              { l: t('priorityEngine.high.label'), d: t('priorityEngine.high.desc'), c: 'bg-orange-400', tc: 'text-orange-600', bg: 'bg-orange-50' },
              { l: t('priorityEngine.medium.label'), d: t('priorityEngine.medium.desc'), c: 'bg-amber-300', tc: 'text-amber-700', bg: 'bg-amber-50' },
              { l: t('priorityEngine.low.label'), d: t('priorityEngine.low.desc'), c: 'bg-emerald-400', tc: 'text-emerald-700', bg: 'bg-emerald-50' },
            ].map((p) => (
              <div key={p.l} className={`flex items-center gap-4 p-4 rounded-2xl ${p.bg}`}>
                <span className={`w-3 h-3 rounded-full ${p.c} shrink-0`} />
                <div>
                  <p className={`font-display font-bold text-sm ${p.tc}`}>{p.l}</p>
                  <p className="text-xs text-ink/60">{p.d}</p>
                </div>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ============ CITY ANALYTICS ============ */}
      <section id="analytics" className="py-16 px-4 sm:px-6 lg:px-8 scroll-mt-28">
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center max-w-2xl mx-auto space-y-4 mb-14">
            <SectionTag>{t('analytics.tag')}</SectionTag>
            <h2 className="text-3xl md:text-5xl font-display font-extrabold text-ink tracking-tight">
              {t('analytics.title')}
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <Reveal className="lg:col-span-2 card p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs font-bold text-muted uppercase tracking-wide">{t('analytics.issueCategories')}</p>
                  <p className="font-display font-bold text-ink">{t('analytics.thisMonth')}</p>
                </div>
                <BarChart3 className="w-5 h-5 text-primary-600" />
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData}>
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6B7A74' }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: 'rgba(11,31,27,0.04)' }} />
                    <Bar dataKey="v" radius={[8, 8, 0, 0]} fill="#149a58" isAnimationActive animationDuration={900} animationEasing="ease-in-out" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Reveal>

            <div className="space-y-5">
              <Reveal delay={0.05} className="card p-6">
                <p className="text-xs font-bold text-muted uppercase tracking-wide mb-2">{t('analytics.resolutionPerformance')}</p>
                <p className="text-4xl font-display font-extrabold text-ink">92%</p>
                <p className="text-sm text-muted mt-1">{t('analytics.resolutionCaption')}</p>
              </Reveal>
              <Reveal delay={0.1} className="card p-6">
                <p className="text-xs font-bold text-muted uppercase tracking-wide mb-2">{t('analytics.geoHotspots')}</p>
                <div className="space-y-2">
                  {['Downtown District', 'Riverside Ward', 'Industrial Zone 4'].map((h) => (
                    <div key={h} className="flex items-center gap-2 text-sm font-semibold text-ink/70">
                      <MapPin className="w-3.5 h-3.5 text-rose-500" /> {h}
                    </div>
                  ))}
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ============ MAP / LOCATION INTELLIGENCE ============ */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <Reveal className="order-2 lg:order-1 relative card p-4 overflow-hidden aspect-[4/3]">
            <div className="absolute inset-4 rounded-2xl bg-gradient-to-br from-primary-50 via-background to-accent/10 border border-ink/5" />
            {[
              { top: '28%', left: '32%', tone: 'bg-rose-500' },
              { top: '55%', left: '58%', tone: 'bg-orange-400' },
              { top: '68%', left: '22%', tone: 'bg-emerald-400' },
              { top: '38%', left: '72%', tone: 'bg-amber-300' },
              { top: '20%', left: '65%', tone: 'bg-rose-500' },
            ].map((p, i) => (
              <motion.span
                key={i}
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.3 }}
                className={`absolute w-4 h-4 rounded-full ${p.tone} border-2 border-white shadow-md`}
                style={{ top: p.top, left: p.left }}
              />
            ))}
            <div className="absolute bottom-6 left-6 right-6 bg-white/90 backdrop-blur rounded-2xl p-3 flex items-center gap-4 text-xs font-semibold text-ink/70 shadow-card">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500" /> {t('locationSection.critical')}</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-400" /> {t('locationSection.high')}</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400" /> {t('locationSection.resolved')}</span>
            </div>
          </Reveal>

          <Reveal delay={0.1} className="order-1 lg:order-2 space-y-5">
            <SectionTag>{t('locationSection.tag')}</SectionTag>
            <h2 className="text-3xl md:text-4xl font-display font-extrabold text-ink tracking-tight">
              {t('locationSection.title')}
            </h2>
            <p className="text-muted font-medium">
              {t('locationSection.subtitle')}
            </p>
            <ul className="space-y-2 text-sm font-semibold text-ink/70">
              <li className="flex items-center gap-2"><MapIcon className="w-4 h-4 text-primary-600" /> {t('locationSection.point1')}</li>
              <li className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-rose-500" /> {t('locationSection.point2')}</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> {t('locationSection.point3')}</li>
            </ul>
          </Reveal>
        </div>
      </section>

      {/* ============ CITIZEN EXPERIENCE ============ */}
      <section id="citizen-experience" className="py-16 px-4 sm:px-6 lg:px-8 scroll-mt-28">
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center max-w-2xl mx-auto space-y-4 mb-14">
            <SectionTag>{t('citizenExperience.tag')}</SectionTag>
            <h2 className="text-3xl md:text-5xl font-display font-extrabold text-ink tracking-tight">
              {t('citizenExperience.title')}
            </h2>
          </Reveal>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { icon: FileText, label: t('citizenExperience.report') },
              { icon: Camera, label: t('citizenExperience.upload') },
              { icon: Brain, label: t('citizenExperience.aiAnalysis') },
              { icon: Gauge, label: t('citizenExperience.priorityAssignment') },
              { icon: Bell, label: t('citizenExperience.track') },
            ].map((s, i, arr) => (
              <Reveal key={s.label} delay={i * 0.07} className="relative flex flex-col items-center text-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-ink flex items-center justify-center shadow-soft">
                  <s.icon className="w-6 h-6 text-accent" />
                </div>
                <p className="text-sm font-bold text-ink">{s.label}</p>
                {i < arr.length - 1 && (
                  <ChevronRight className="hidden md:block absolute top-6 -right-3 w-5 h-5 text-ink/20" />
                )}
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ MUNICIPAL DASHBOARD ============ */}
      <section id="dashboard" className="py-16 px-4 sm:px-6 lg:px-8 scroll-mt-28">
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center max-w-2xl mx-auto space-y-4 mb-14">
            <SectionTag>{t('dashboardShowcase.tag')}</SectionTag>
            <h2 className="text-3xl md:text-5xl font-display font-extrabold text-ink tracking-tight">
              {t('dashboardShowcase.title')}
            </h2>
            <p className="text-muted font-medium">
              {t('dashboardShowcase.subtitle')}
            </p>
          </Reveal>

          <Reveal className="card p-4 md:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <div className="lg:col-span-1 bg-ink text-white rounded-2xl p-5 space-y-4">
                <p className="text-xs font-bold uppercase tracking-wide text-white/50 flex items-center gap-2">
                  <LayoutDashboard className="w-4 h-4 text-accent" /> {t('dashboardShowcase.aiRecommendations')}
                </p>
                {[t('dashboardShowcase.rec1'), t('dashboardShowcase.rec2'), t('dashboardShowcase.rec3')].map((r) => (
                  <div key={r} className="bg-white/5 border border-white/10 rounded-xl p-3 text-xs font-semibold flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-accent shrink-0" /> {r}
                  </div>
                ))}
              </div>

              <div className="lg:col-span-2 bg-background rounded-2xl p-5 border border-ink/5">
                <p className="text-xs font-bold uppercase tracking-wide text-muted mb-3">{t('dashboardShowcase.liveComplaints')}</p>
                <div className="space-y-2.5">
                  {[
                    { t: 'Pothole on 5th Avenue', p: 'Critical', c: 'bg-rose-100 text-rose-700 border-rose-200' },
                    { t: 'Streetlight outage — Elm St.', p: 'High', c: 'bg-orange-100 text-orange-700 border-orange-200' },
                    { t: 'Garbage overflow — Market Rd.', p: 'Medium', c: 'bg-amber-100 text-amber-700 border-amber-200' },
                    { t: 'Park bench damaged', p: 'Low', c: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
                  ].map((c) => (
                    <div key={c.t} className="flex items-center justify-between bg-white rounded-xl p-3 border border-ink/5">
                      <span className="text-sm font-semibold text-ink/80 flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-muted" /> {c.t}
                      </span>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${c.c}`}>{c.p}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-1 bg-background rounded-2xl p-5 border border-ink/5 flex flex-col justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-muted mb-3">{t('dashboardShowcase.resolutionProgress')}</p>
                  <p className="text-3xl font-display font-extrabold text-ink">{resolutionPct}%</p>
                  <div className="w-full h-2 bg-ink/10 rounded-full mt-2">
                    <div
                      className="h-2 bg-primary-500 rounded-full transition-all duration-1000 ease-in-out"
                      style={{ width: `${resolutionPct}%` }}
                    />
                  </div>
                </div>
                <Link to="/dashboard-preview" className="btn-secondary w-full justify-center mt-4 !py-2.5 text-sm">
                  {t('dashboardShowcase.openDashboard')}
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ ABOUT / IMPACT STATS ============ */}
      <section id="about" className="py-16 px-4 sm:px-6 lg:px-8 scroll-mt-28">
        <Reveal className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { v: '4,800+', l: t('about.issuesReported') },
            { v: '92%', l: t('about.resolutionRate') },
            { v: '18hr', l: t('about.avgResponseTime') },
            { v: '30+', l: t('about.departments') },
          ].map((s) => (
            <div key={s.l}>
              <p className="text-4xl font-display font-extrabold text-ink">{s.v}</p>
              <p className="text-sm font-semibold text-muted mt-1">{s.l}</p>
            </div>
          ))}
        </Reveal>
        <p className="text-center text-xs text-muted/70 mt-6 max-w-xl mx-auto">
          *Illustrative figures from pilot/testing data — CivicSetu has not yet been deployed for live public use.
        </p>
      </section>

      {/* ============ CTA ============ */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <Reveal className="max-w-5xl mx-auto card-dark p-10 md:p-16 text-center space-y-6 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-accent/20 rounded-full blur-3xl" />
          <h2 className="text-3xl md:text-5xl font-display font-extrabold tracking-tight relative z-10">
            {t('cta.title')}
          </h2>
          <p className="text-white/60 font-medium max-w-xl mx-auto relative z-10">
            {t('cta.subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 relative z-10">
            <Link to="/signup" className="btn-primary px-7 py-3.5 text-base">
              {t('cta.primary')} <ArrowRight className="w-4.5 h-4.5" />
            </Link>
            <a href="#top" className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full font-bold text-sm border-2 border-white/20 text-white hover:bg-white/10 transition-all">
              {t('cta.secondary')}
            </a>
          </div>
        </Reveal>
      </section>

      <LandingFooter />
    </div>
  );
};

export default Landing;
