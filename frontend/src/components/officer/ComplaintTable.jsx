import React from 'react';
import { useNavigate } from 'react-router-dom';
import StatusBadge from '../StatusBadge';
import { Eye } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getHomeForRole } from '../../utils/roleHome';

const ComplaintTable = ({ complaints }) => {
  const navigate = useNavigate();
  const { role } = useAuth();
  // Officer/Head and Admin share this exact table component but live under
  // different route prefixes (/officer/complaints/:id vs /admin/complaints/:id).
  // The "View" action must navigate under whichever portal the current user
  // actually has access to, or RoleRoute bounces them straight back to their
  // dashboard overview.
  const portalPrefix = getHomeForRole(role);

  return (
    <div className="bg-white border border-ink/10 rounded-2xl shadow-[0_2px_10px_rgb(0,0,0,0.02)] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-ink/5">
          <thead className="bg-background/50">
            <tr>
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-muted uppercase tracking-wider">
                ID
              </th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-muted uppercase tracking-wider">
                Description
              </th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-muted uppercase tracking-wider">
                District / Dept
              </th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-muted uppercase tracking-wider">
                Priority
              </th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-muted uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-muted uppercase tracking-wider">
                Created
              </th>
              <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-muted uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-ink/5">
            {complaints.length > 0 ? (
              complaints.map((complaint) => (
                <tr key={complaint.id || complaint.ticket_id} className="hover:bg-background/80 transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-ink">
                    #{complaint.ticket_id || complaint.id}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-semibold text-ink line-clamp-1">{complaint.title || 'Untitled'}</div>
                    <div className="text-sm text-muted line-clamp-1 max-w-xs mt-0.5">{complaint.description}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-ink">{complaint.district || complaint.location || 'N/A'}</div>
                    <div className="text-xs text-muted mt-0.5">{complaint.department || 'General'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider
                      ${complaint.priority === 'high' ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-600/20' : 
                        complaint.priority === 'medium' ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20' : 
                        'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20'}`}>
                      {complaint.priority || 'Normal'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={complaint.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-muted">
                    {complaint.created_at ? new Date(complaint.created_at).toLocaleDateString() : 'Just now'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => navigate(`${portalPrefix}/complaints/${encodeURIComponent(complaint.ticket_id || complaint.id)}`)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-ink/10 text-ink/80 hover:text-primary-700 hover:border-primary-200 hover:bg-primary-600 rounded-lg transition-all shadow-sm font-semibold opacity-0 group-hover:opacity-100 focus:opacity-100"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="px-6 py-12 text-center text-muted font-medium">
                  No complaints found matching the criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ComplaintTable;
