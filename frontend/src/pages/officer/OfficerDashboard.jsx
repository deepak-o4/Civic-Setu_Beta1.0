import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import AnimatedPage from '../../components/AnimatedPage';
import { useAuth } from '../../context/AuthContext';
import { FileText, AlertTriangle, CheckCircle2, Clock, ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function OfficerDashboard() {
  const { user } = useAuth();

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['officerSummary'],
    queryFn: async () => (await api.get('/officer/complaints/summary')).data,
  });

  const { data: complaints = [], isLoading } = useQuery({
    queryKey: ['officerComplaints'],
    queryFn: async () => (await api.get('/officer/complaints')).data,
  });

  const recent = complaints.slice(0, 6);
  const isHead = user?.role?.toUpperCase() === 'HEAD';

  const statCards = [
    { label: 'Total', value: summary?.total ?? '—', icon: FileText, tone: 'bg-ink text-accent' },
    { label: 'Critical', value: summary?.by_priority?.CRITICAL ?? 0, icon: AlertTriangle, tone: 'bg-rose-500 text-white' },
    { label: 'Resolved', value: summary?.by_status?.RESOLVED ?? 0, icon: CheckCircle2, tone: 'bg-primary-500 text-white' },
    { label: 'Pending', value: (summary?.total ?? 0) - (summary?.by_status?.RESOLVED ?? 0) - (summary?.by_status?.CLOSED ?? 0), icon: Clock, tone: 'bg-accent text-ink' },
  ];

  const statusTone = (status) => {
    switch (status?.toLowerCase()) {
      case 'resolved': case 'closed': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'processing': return 'bg-primary-100 text-primary-800 border-primary-200';
      case 'assigned': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'escalated': case 'failed': case 'failed_final': return 'bg-rose-100 text-rose-700 border-rose-200';
      default: return 'bg-ink/5 text-ink/80 border-ink/10';
    }
  };

  return (
    <AnimatedPage className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-ink tracking-tight">
          {isHead ? 'Department Overview' : 'My Assigned Complaints'}
        </h1>
        <p className="text-muted mt-1">
          {isHead
            ? `Every complaint routed to the ${user?.department || 'your'} department.`
            : 'Complaints currently assigned to you.'}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className="card p-5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${s.tone}`}>
              <s.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-display font-extrabold text-ink">{summaryLoading ? '—' : s.value}</p>
            <p className="text-xs font-semibold text-muted uppercase tracking-wide mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-lg text-ink">Recent Complaints</h2>
          <Link to="/officer/complaints" className="text-sm font-bold text-primary-700 hover:text-primary-800 flex items-center gap-1">
            View all <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>

        {isLoading ? (
          <p className="text-muted text-sm">Loading…</p>
        ) : recent.length === 0 ? (
          <p className="text-muted text-sm">No complaints to show right now.</p>
        ) : (
          <div className="space-y-2.5">
            {recent.map((c, i) => (
              <motion.div
                key={c.ticket_id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Link
                  to={`/officer/complaints/${c.ticket_id}`}
                  className="flex items-center justify-between bg-background rounded-xl p-3.5 border border-ink/5 hover:border-ink/15 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink/80 truncate">{c.title}</p>
                    <p className="text-xs text-muted mt-0.5">{c.ticket_id} · {c.district}</p>
                  </div>
                  <span className={`shrink-0 ml-3 text-[11px] font-bold px-2 py-0.5 rounded-full border ${statusTone(c.status)}`}>
                    {c.status}
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AnimatedPage>
  );
}
