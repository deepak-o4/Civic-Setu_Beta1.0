import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { getAdminComplaintDetail, updateComplaintStatus, updateComplaintPriority } from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import Loader from '../../components/Loader';
import { ArrowLeft, MapPin, Clock, User, Mail, Phone, Tag, Building2, AlertTriangle, Paperclip, Save, CheckCircle, Gauge, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { resolveFileUrl } from '../../utils/url';
import { useAuth } from '../../context/AuthContext';
import { getHomeForRole } from '../../utils/roleHome';

const ComplaintDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role } = useAuth();
  // This component is mounted at both /admin/complaints/:id and
  // /officer/complaints/:id (Officer/Head reuse the Admin views). "Back to
  // list" must return to whichever portal the current user is actually in,
  // or RoleRoute redirects officer/head users to their dashboard overview.
  const portalPrefix = getHomeForRole(role);
  
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Update state
  const [newStatus, setNewStatus] = useState('');
  const [remarks, setRemarks] = useState('');
  const [updating, setUpdating] = useState(false);
  const [officers, setOfficers] = useState([]);
  const [assignedOfficer, setAssignedOfficer] = useState('');

  // Manual priority override state (separate from status update, since an
  // admin may want to re-grade priority without necessarily changing status)
  const [newPriority, setNewPriority] = useState('');
  const [priorityNote, setPriorityNote] = useState('');
  const [updatingPriority, setUpdatingPriority] = useState(false);

  useEffect(() => {
    fetchComplaintDetail();
    fetchOfficers();
  }, [id]);

  const fetchOfficers = async () => {
    try {
      const res = await api.get('/users');
      const filtered = res.data.filter(u => u.role === 'OFFICER' || u.role === 'ADMIN');
      setOfficers(filtered);
    } catch (err) {
      console.error('Failed to fetch officers:', err);
    }
  };

  const fetchComplaintDetail = async () => {
    try {
      setLoading(true);
      const data = await getAdminComplaintDetail(id);
      setComplaint(data);
      let initialStatus = data.status || 'SUBMITTED';
      if (initialStatus === 'PROCESSING') initialStatus = 'IN_PROGRESS';
      if (initialStatus === 'CLOSED') initialStatus = 'REJECTED';
      setNewStatus(initialStatus);
      setAssignedOfficer(data.assigned_to || '');
      setNewPriority((data.priority || 'LOW').toUpperCase());
    } catch (err) {
      setError('Failed to fetch complaint details.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    try {
      setUpdating(true);
      await updateComplaintStatus(id, newStatus, remarks, assignedOfficer || "");
      setComplaint({ ...complaint, status: newStatus, assigned_to: assignedOfficer || null });
      toast.success('Status updated successfully!');
    } catch (err) {
      toast.error('Failed to update status.');
    } finally {
      setUpdating(false);
    }
  };

  const handlePriorityUpdate = async () => {
    try {
      setUpdatingPriority(true);
      await updateComplaintPriority(id, newPriority, priorityNote || null);
      setComplaint((prev) => ({
        ...prev,
        priority: newPriority,
        priority_breakdown: {
          ...(prev.priority_breakdown || {}),
          manual_override: {
            previous_priority: prev.priority,
            new_priority: newPriority,
            note: priorityNote || null,
            overridden_at: new Date().toISOString(),
          },
        },
      }));
      setPriorityNote('');
      toast.success('Priority updated successfully!');
    } catch (err) {
      toast.error('Failed to update priority.');
    } finally {
      setUpdatingPriority(false);
    }
  };

  if (loading) return <div className="py-20"><Loader /></div>;
  
  if (error || !complaint) return (
    <div className="bg-rose-50 text-rose-600 p-6 rounded-xl border border-rose-100 text-center animate-fade-in">
      <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
      <h3 className="text-lg font-bold">Error</h3>
      <p>{error || 'Complaint not found.'}</p>
      <button onClick={() => navigate(`${portalPrefix}/complaints`)} className="mt-4 px-4 py-2 bg-white text-rose-600 rounded-lg border border-rose-200 font-medium hover:bg-rose-50 transition-colors">
        Back to List
      </button>
    </div>
  );

  const getStepStatus = (step) => {
    const statusOrder = ['SUBMITTED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED'];
    const current = statusOrder.indexOf(complaint.status?.toUpperCase() === 'PROCESSING' ? 'IN_PROGRESS' : complaint.status?.toUpperCase() === 'CLOSED' ? 'RESOLVED' : complaint.status?.toUpperCase());
    const target = statusOrder.indexOf(step);
    if (target <= current) return 'completed';
    if (target === current + 1) return 'current';
    return 'upcoming';
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-ink/10">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(`${portalPrefix}/complaints`)}
            className="p-2 hover:bg-ink/5 rounded-lg text-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-ink">Ticket: {complaint.ticket_id || id}</h1>
            <p className="text-sm text-muted">{complaint.title || complaint.category || 'Complaint Details'}</p>
          </div>
        </div>
        <StatusBadge status={complaint.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-ink/10 p-6 space-y-6">
            <h2 className="text-lg font-bold text-ink border-b border-ink/5 pb-2">Complaint Details</h2>
            
            <p className="text-ink/80 leading-relaxed whitespace-pre-wrap">
              {complaint.description || 'No description provided.'}
            </p>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="bg-background p-3 rounded-lg border border-ink/5">
                <div className="text-xs font-semibold text-muted/70 uppercase mb-1 flex items-center gap-1"><MapPin className="w-3 h-3"/> District</div>
                <div className="font-medium text-ink">{complaint.district || 'N/A'}</div>
              </div>
              <div className="bg-background p-3 rounded-lg border border-ink/5">
                <div className="text-xs font-semibold text-muted/70 uppercase mb-1 flex items-center gap-1"><User className="w-3 h-3"/> Citizen</div>
                <div className="font-medium text-ink">{complaint.citizen_name || 'Anonymous'}</div>
              </div>
              <div className="bg-background p-3 rounded-lg border border-ink/5">
                <div className="text-xs font-semibold text-muted/70 uppercase mb-1 flex items-center gap-1"><Mail className="w-3 h-3"/> Email</div>
                <div className="font-medium text-ink truncate">{complaint.citizen_email || 'Not provided'}</div>
              </div>
              <div className="bg-background p-3 rounded-lg border border-ink/5">
                <div className="text-xs font-semibold text-muted/70 uppercase mb-1 flex items-center gap-1"><Phone className="w-3 h-3"/> Phone</div>
                <div className="font-medium text-ink">{complaint.citizen_phone || 'Not provided'}</div>
              </div>
              <div className="bg-background p-3 rounded-lg border border-ink/5">
                <div className="text-xs font-semibold text-muted/70 uppercase mb-1 flex items-center gap-1"><Tag className="w-3 h-3"/> Category</div>
                <div className="font-medium text-ink">{complaint.category || 'N/A'}</div>
              </div>
              <div className="bg-background p-3 rounded-lg border border-ink/5">
                <div className="text-xs font-semibold text-muted/70 uppercase mb-1 flex items-center gap-1"><Building2 className="w-3 h-3"/> Department</div>
                <div className="font-medium text-ink">{complaint.department || 'N/A'}</div>
              </div>
              <div className="bg-background p-3 rounded-lg border border-ink/5">
                <div className="text-xs font-semibold text-muted/70 uppercase mb-1 flex items-center gap-1"><Clock className="w-3 h-3"/> Submitted On</div>
                <div className="font-medium text-ink">{complaint.created_at ? new Date(complaint.created_at).toLocaleString() : 'N/A'}</div>
              </div>
              <div className="bg-background p-3 rounded-lg border border-ink/5">
                <div className="text-xs font-semibold text-muted/70 uppercase mb-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Priority</div>
                <div className="font-medium text-ink capitalize">
                  {complaint.priority || 'Normal'}
                  {complaint.priority_score != null && (
                    <span className="text-xs text-muted font-normal ml-1.5">({Math.round(complaint.priority_score)}/100)</span>
                  )}
                </div>
                {complaint.priority_breakdown?.manual_override && (
                  <div className="text-[11px] text-amber-600 font-medium mt-1">
                    Manually changed from {complaint.priority_breakdown.manual_override.previous_priority} by admin
                    {complaint.priority_breakdown.manual_override.note ? `: "${complaint.priority_breakdown.manual_override.note}"` : ''}
                  </div>
                )}
              </div>
            </div>

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

            {complaint.priority_breakdown && Object.keys(complaint.priority_breakdown).length > 0 && (
              <div className="bg-background p-4 rounded-xl border border-ink/5">
                <div className="text-xs font-bold text-muted/70 uppercase mb-3 flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5" /> AI Priority Breakdown
                </div>
                <div className="space-y-2">
                  {Object.entries(complaint.priority_breakdown).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-3 text-sm">
                      <span className="w-32 shrink-0 text-ink/60 capitalize">{key.replace(/_/g, ' ')}</span>
                      <div className="flex-1 h-2 bg-ink/10 rounded-full overflow-hidden">
                        <div
                          className="h-2 bg-primary-500 rounded-full"
                          style={{ width: `${Math.min(100, Number(value) || 0)}%` }}
                        />
                      </div>
                      <span className="w-8 text-right font-semibold text-ink">{typeof value === 'number' ? Math.round(value) : value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {complaint.attachments && complaint.attachments.length > 0 && (
              <div>
                <div className="text-xs font-bold text-muted/70 uppercase mb-3 flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5" /> Attached Evidence ({complaint.attachments.length})
                </div>
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
          </div>

          {/* Progress Timeline */}
          <div className="bg-white rounded-xl shadow-sm border border-ink/10 p-6">
            <h2 className="text-lg font-bold text-ink mb-6">Progress Timeline</h2>
            <div className="flex items-center gap-2 w-full max-w-lg mx-auto">
              {['SUBMITTED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED'].map((step, i, arr) => {
                const status = getStepStatus(step);
                return (
                  <React.Fragment key={step}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                      status === 'completed' ? 'bg-emerald-500' : status === 'current' ? 'bg-primary-500 ring-4 ring-blue-100' : 'bg-slate-300'
                    }`}>
                      {status === 'completed' && <CheckCircle className="w-5 h-5 text-white" />}
                    </div>
                    {i < arr.length - 1 && (
                      <div className={`flex-1 h-1 rounded-full transition-colors ${
                        status === 'completed' ? 'bg-emerald-500' : 'bg-ink/10'
                      }`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
            <div className="flex justify-between w-full max-w-lg mx-auto mt-3 text-[10px] font-bold uppercase tracking-wider text-muted">
              <span>Submitted</span>
              <span>Assigned</span>
              <span>In Progress</span>
              <span>Resolved</span>
            </div>

            {complaint.timeline && complaint.timeline.length > 0 && (
              <div className="mt-8 pt-6 border-t border-ink/5 space-y-4">
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
            )}
          </div>
        </div>

        {/* Right Column - Actions */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-ink/10 p-6 space-y-4 sticky top-24">
            <div>
              <h2 className="text-lg font-bold text-ink border-b border-ink/5 pb-2">Priority Override</h2>
              <p className="text-xs text-muted mt-2">
                The AI assigned this a priority automatically based on severity, impact, frequency, and location risk.
                After reviewing the complaint yourself, you can override it below.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-ink/80 block">Set Priority</label>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value)}
                className="w-full bg-background border border-ink/10 rounded-xl focus:ring-4 focus:ring-accent/50 focus:border-accent outline-none p-2.5 text-ink/80 font-medium"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-ink/80 block">Reason for change (optional)</label>
              <textarea
                rows="2"
                value={priorityNote}
                onChange={(e) => setPriorityNote(e.target.value)}
                placeholder="e.g. On-site inspection shows this is more urgent than the AI estimated..."
                className="w-full bg-background border border-ink/10 rounded-xl focus:ring-4 focus:ring-accent/50 focus:border-accent outline-none p-3 text-ink/80 resize-none text-sm"
              ></textarea>
            </div>

            <button
              onClick={handlePriorityUpdate}
              disabled={updatingPriority || newPriority === (complaint.priority || 'LOW').toUpperCase()}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold transition-all duration-200 ${
                updatingPriority || newPriority === (complaint.priority || 'LOW').toUpperCase()
                  ? 'bg-ink/5 text-muted/70 cursor-not-allowed'
                  : 'bg-amber-500 text-white hover:bg-amber-600 shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98]'
              }`}
            >
              <Gauge className="w-4 h-4" />
              {updatingPriority ? 'Saving...' : 'Save Priority'}
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-ink/10 p-6 space-y-5 sticky top-24">
            <h2 className="text-lg font-bold text-ink border-b border-ink/5 pb-2">Update Resolution</h2>
            
            <div className="space-y-2">
              <label className="text-sm font-semibold text-ink/80 block">Change Status</label>
              <select 
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full bg-background border border-ink/10 rounded-xl focus:ring-4 focus:ring-accent/50 focus:border-accent outline-none p-2.5 text-ink/80 font-medium"
              >
                <option value="SUBMITTED">Submitted</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-ink/80 block">Assign Officer</label>
              <select 
                value={assignedOfficer}
                onChange={(e) => setAssignedOfficer(e.target.value)}
                className="w-full bg-background border border-ink/10 rounded-xl focus:ring-4 focus:ring-accent/50 focus:border-accent outline-none p-2.5 text-ink/80 font-medium"
              >
                <option value="">-- Select Officer --</option>
                {officers.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} ({o.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-ink/80 block">Admin Remarks</label>
              <textarea 
                rows="4"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Add internal notes or resolution remarks..."
                className="w-full bg-background border border-ink/10 rounded-xl focus:ring-4 focus:ring-accent/50 focus:border-accent outline-none p-3 text-ink/80 resize-none text-sm"
              ></textarea>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-ink/80 block">Upload Proof</label>
              <div className="border-2 border-dashed border-ink/10 rounded-xl p-4 text-center hover:bg-background transition-colors cursor-pointer">
                <Paperclip className="w-5 h-5 text-muted/70 mx-auto mb-1" />
                <span className="text-xs text-muted">Click to upload files</span>
              </div>
            </div>

            <button 
              onClick={handleUpdate}
              disabled={updating || (newStatus === (complaint.status === 'PROCESSING' ? 'IN_PROGRESS' : complaint.status === 'CLOSED' ? 'REJECTED' : complaint.status) && assignedOfficer === (complaint.assigned_to || ''))}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all duration-200 ${
                updating || (newStatus === (complaint.status === 'PROCESSING' ? 'IN_PROGRESS' : complaint.status === 'CLOSED' ? 'REJECTED' : complaint.status) && assignedOfficer === (complaint.assigned_to || ''))
                  ? 'bg-ink/5 text-muted/70 cursor-not-allowed'
                  : 'bg-ink text-white hover:bg-ink-700 shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98]'
              }`}
            >
              <Save className="w-5 h-5" />
              {updating ? 'Saving...' : 'Save Update'}
            </button>

            <button 
              onClick={async () => {
                try {
                  setUpdating(true);
                  const autoRemarks = "Resolved automatically via GNCTD system verification check.";
                  await updateComplaintStatus(id, "RESOLVED", autoRemarks, assignedOfficer || "");
                  setComplaint({ ...complaint, status: "RESOLVED", assigned_to: assignedOfficer || null });
                  setNewStatus("RESOLVED");
                  setRemarks(autoRemarks);
                  toast.success('Complaint resolved successfully!');
                } catch (err) {
                  toast.error('Failed to resolve complaint.');
                } finally {
                  setUpdating(false);
                }
              }}
              disabled={updating || complaint.status === 'RESOLVED'}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all duration-200 mt-2 ${
                updating || complaint.status === 'RESOLVED'
                  ? 'bg-ink/5 text-muted/70 cursor-not-allowed'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98]'
              }`}
            >
              <CheckCircle className="w-5 h-5" />
              {updating ? 'Saving...' : 'Quick Resolve'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComplaintDetail;
