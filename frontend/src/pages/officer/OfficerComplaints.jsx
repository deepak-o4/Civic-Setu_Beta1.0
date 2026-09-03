import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import AnimatedPage from '../../components/AnimatedPage';
import { Search, ArrowRight } from 'lucide-react';

const STATUS_OPTIONS = ['all', 'SUBMITTED', 'PROCESSING', 'ASSIGNED', 'RESOLVED', 'CLOSED', 'ESCALATED'];

const statusTone = (status) => {
  switch (status?.toLowerCase()) {
    case 'resolved': case 'closed': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'processing': return 'bg-primary-100 text-primary-800 border-primary-200';
    case 'assigned': return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'escalated': case 'failed': case 'failed_final': return 'bg-rose-100 text-rose-700 border-rose-200';
    default: return 'bg-ink/5 text-ink/80 border-ink/10';
  }
};

const priorityTone = (p) => {
  switch (p?.toLowerCase()) {
    case 'critical': return 'bg-rose-500 text-white';
    case 'high': return 'bg-orange-400 text-white';
    case 'medium': return 'bg-amber-300 text-ink';
    default: return 'bg-emerald-400 text-white';
  }
};

export default function OfficerComplaints() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const { data: complaints = [], isLoading } = useQuery({
    queryKey: ['officerComplaints'],
    queryFn: async () => (await api.get('/officer/complaints')).data,
  });

  const filtered = useMemo(() => {
    return complaints.filter((c) => {
      const matchStatus = statusFilter === 'all' || c.status === statusFilter;
      const q = search.toLowerCase();
      const matchSearch = !q || c.title?.toLowerCase().includes(q) || c.ticket_id?.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [complaints, statusFilter, search]);

  return (
    <AnimatedPage className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-ink tracking-tight">My Complaints</h1>
        <p className="text-muted mt-1">{complaints.length} complaint{complaints.length !== 1 ? 's' : ''} in view.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or ticket ID…"
            className="input-field pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-field sm:w-56"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s === 'all' ? 'All statuses' : s}</option>
          ))}
        </select>
      </div>

      <div className="card divide-y divide-ink/5 overflow-hidden">
        {isLoading ? (
          <p className="text-muted text-sm p-6">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-muted text-sm p-6">No complaints match your filters.</p>
        ) : (
          filtered.map((c) => (
            <Link
              key={c.ticket_id}
              to={`/officer/complaints/${c.ticket_id}`}
              className="flex items-center justify-between p-4 hover:bg-background transition-colors gap-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-ink truncate">{c.title}</p>
                  <span className={`shrink-0 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${priorityTone(c.priority)}`}>
                    {c.priority}
                  </span>
                </div>
                <p className="text-xs text-muted mt-0.5">{c.ticket_id} · {c.category} · {c.district}</p>
              </div>
              <span className={`shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full border ${statusTone(c.status)}`}>
                {c.status}
              </span>
              <ArrowRight className="w-4 h-4 text-muted shrink-0 hidden sm:block" />
            </Link>
          ))
        )}
      </div>
    </AnimatedPage>
  );
}
