import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import AnimatedPage from '../../components/AnimatedPage';
import toast from 'react-hot-toast';
import { resolveFileUrl } from '../../utils/url';
import {
  ArrowLeft, MapPin, User, Phone, Mail, Calendar, Gauge, Building2, CheckCircle2, Paperclip, ExternalLink,
} from 'lucide-react';

const STATUS_FLOW = ['SUBMITTED', 'PROCESSING', 'ASSIGNED', 'RESOLVED', 'CLOSED', 'ESCALATED'];

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

export default function OfficerComplaintDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [note, setNote] = useState('');
  const [updating, setUpdating] = useState(false);

  const [newPriority, setNewPriority] = useState('');
  const [priorityNote, setPriorityNote] = useState('');
  const [updatingPriority, setUpdatingPriority] = useState(false);

  const { data: complaint, isLoading, isError } = useQuery({
    queryKey: ['officerComplaint', id],
    queryFn: async () => (await api.get(`/officer/complaints/${id}`)).data,
  });

  useEffect(() => {
    if (complaint?.priority) {
      setNewPriority(complaint.priority.toUpperCase());
    }
  }, [complaint?.priority]);

  const handleStatusUpdate = async (newStatus) => {
    setUpdating(true);
    try {
      await api.patch(`/officer/complaints/${id}`, { status: newStatus, note: note || undefined });
      toast.success(`Status updated to ${newStatus}`);
      setNote('');
      queryClient.invalidateQueries({ queryKey: ['officerComplaint', id] });
      queryClient.invalidateQueries({ queryKey: ['officerComplaints'] });
      queryClient.invalidateQueries({ queryKey: ['officerSummary'] });
    } catch (err) {
      toast.error(err.message || 'Could not update status.');
    } finally {
      setUpdating(false);
    }
  };

  const handlePriorityUpdate = async () => {
    setUpdatingPriority(true);
    try {
      await api.patch(`/officer/complaints/${id}/priority`, { priority: newPriority, note: priorityNote || undefined });
      toast.success(`Priority updated to ${newPriority}`);
      setPriorityNote('');
      queryClient.invalidateQueries({ queryKey: ['officerComplaint', id] });
      queryClient.invalidateQueries({ queryKey: ['officerComplaints'] });
      queryClient.invalidateQueries({ queryKey: ['officerSummary'] });
    } catch (err) {
      toast.error(err.message || 'Could not update priority.');
    } finally {
      setUpdatingPriority(false);
    }
  };

  if (isLoading) {
    return <AnimatedPage className="p-6 text-muted">Loading complaint…</AnimatedPage>;
  }

  if (isError || !complaint) {
    return (
      <AnimatedPage className="p-10 text-center">
        <p className="text-rose-600 font-semibold">This complaint isn't available to you.</p>
        <button onClick={() => navigate('/officer/complaints')} className="mt-4 btn-outline">
          Back to my complaints
        </button>
      </AnimatedPage>
    );
  }

  return (
    <AnimatedPage className="space-y-6 max-w-4xl">
      <Link to="/officer/complaints" className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft className="w-4 h-4" /> Back to my complaints
      </Link>

      <div className="card p-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-muted uppercase tracking-wide">{complaint.ticket_id}</p>
            <h1 className="text-2xl font-display font-extrabold text-ink mt-1">{complaint.title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-extrabold px-2.5 py-1 rounded-full ${priorityTone(complaint.priority)}`}>
              {complaint.priority}
            </span>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${statusTone(complaint.status)}`}>
              {complaint.status}
            </span>
          </div>
        </div>

        {complaint.priority_breakdown?.manual_override && (
          <p className="text-xs text-amber-600 font-medium -mt-2">
            Priority manually changed from {complaint.priority_breakdown.manual_override.previous_priority} by{' '}
            {complaint.priority_breakdown.manual_override.overridden_by_role?.toLowerCase() || 'staff'}{' '}
            {complaint.priority_breakdown.manual_override.overridden_by_name}
            {complaint.priority_breakdown.manual_override.note ? `: "${complaint.priority_breakdown.manual_override.note}"` : ''}
          </p>
        )}

        <p className="text-ink/70 leading-relaxed">{complaint.description || 'No description provided.'}</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2 border-t border-ink/5">
          <div className="flex items-center gap-2 text-sm text-ink/70">
            <Building2 className="w-4 h-4 text-muted" /> {complaint.department}
          </div>
          <div className="flex items-center gap-2 text-sm text-ink/70">
            <MapPin className="w-4 h-4 text-muted" /> {complaint.district}
          </div>
          <div className="flex items-center gap-2 text-sm text-ink/70">
            <Calendar className="w-4 h-4 text-muted" /> {new Date(complaint.created_at).toLocaleDateString()}
          </div>
          {complaint.priority_score != null && (
            <div className="flex items-center gap-2 text-sm text-ink/70">
              <Gauge className="w-4 h-4 text-muted" /> Priority Score: {complaint.priority_score}
            </div>
          )}
          {complaint.citizen_name && (
            <div className="flex items-center gap-2 text-sm text-ink/70">
              <User className="w-4 h-4 text-muted" /> {complaint.citizen_name}
            </div>
          )}
          {complaint.citizen_phone && (
            <div className="flex items-center gap-2 text-sm text-ink/70">
              <Phone className="w-4 h-4 text-muted" /> {complaint.citizen_phone}
            </div>
          )}
          {complaint.citizen_email && (
            <div className="flex items-center gap-2 text-sm text-ink/70">
              <Mail className="w-4 h-4 text-muted" /> {complaint.citizen_email}
            </div>
          )}
          {complaint.lat != null && complaint.lon != null && (
            <a
              href={`https://www.google.com/maps?q=${complaint.lat},${complaint.lon}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-700 hover:text-primary-800"
            >
              <MapPin className="w-4 h-4" /> View pinned location on map
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>

      {complaint.attachments && complaint.attachments.length > 0 && (
        <div className="card p-6">
          <h2 className="font-display font-bold text-lg text-ink mb-4 flex items-center gap-2">
            <Paperclip className="w-4.5 h-4.5" /> Attached Evidence
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {complaint.attachments.map((att, i) => (
              <a
                key={i}
                href={resolveFileUrl(att.file_url)}
                target="_blank"
                rel="noreferrer"
                className="block aspect-square rounded-xl overflow-hidden border border-ink/10 hover:border-primary-400 transition-colors"
              >
                <img src={resolveFileUrl(att.file_url)} alt={`Evidence ${i + 1}`} className="w-full h-full object-cover" />
              </a>
            ))}
          </div>
        </div>
      )}

      {complaint.timeline && complaint.timeline.length > 0 && (
        <div className="card p-6">
          <h2 className="font-display font-bold text-lg text-ink mb-4">Status Timeline</h2>
          <div className="space-y-4">
            {[...complaint.timeline].reverse().map((event, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-2 h-2 rounded-full bg-primary-500 mt-1.5 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-ink">{event.status}</p>
                  {event.note && <p className="text-sm text-ink/60 mt-0.5">{event.note}</p>}
                  <p className="text-xs text-muted mt-0.5">{new Date(event.created_at).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card p-6 space-y-4">
        <div>
          <h2 className="font-display font-bold text-lg text-ink">Priority Override</h2>
          <p className="text-sm text-muted mt-1">
            The AI assigned this priority automatically. After reviewing it yourself, you can change it.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((p) => (
            <button
              key={p}
              disabled={updatingPriority}
              onClick={() => setNewPriority(p)}
              className={`text-sm font-bold px-4 py-2 rounded-full border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                p === newPriority
                  ? `${priorityTone(p)} border-transparent`
                  : 'bg-white text-ink/70 border-ink/10 hover:border-ink/30'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <textarea
          value={priorityNote}
          onChange={(e) => setPriorityNote(e.target.value)}
          placeholder="Reason for change (optional)…"
          rows={2}
          className="input-field resize-none"
        />
        <button
          onClick={handlePriorityUpdate}
          disabled={updatingPriority || newPriority === (complaint.priority || 'LOW').toUpperCase()}
          className={`text-sm font-bold px-5 py-2.5 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
            'bg-amber-500 text-white hover:bg-amber-600'
          }`}
        >
          {updatingPriority ? 'Saving…' : 'Save Priority'}
        </button>
      </div>

      <div className="card p-6 space-y-4">
        <h2 className="font-display font-bold text-lg text-ink">Update Status</h2>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional note about this update…"
          rows={3}
          className="input-field resize-none"
        />
        <div className="flex flex-wrap gap-2">
          {STATUS_FLOW.map((s) => (
            <button
              key={s}
              disabled={updating || s === complaint.status}
              onClick={() => handleStatusUpdate(s)}
              className={`text-sm font-bold px-4 py-2 rounded-full border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                s === complaint.status
                  ? 'bg-ink text-white border-ink'
                  : 'bg-white text-ink/70 border-ink/10 hover:border-ink/30'
              }`}
            >
              {s === complaint.status && <CheckCircle2 className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />}
              {s}
            </button>
          ))}
        </div>
      </div>
    </AnimatedPage>
  );
}
