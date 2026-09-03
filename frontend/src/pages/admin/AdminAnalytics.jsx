import React, { useState, useEffect } from 'react';
import { getOfficerComplaints, getRecurringProblems } from '../../services/api';
import Charts from '../../components/admin/Charts';
import Loader from '../../components/Loader';
import { BarChart3, AlertTriangle, MapPin } from 'lucide-react';
import { API_ORIGIN } from '../../utils/url';

const AdminAnalytics = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recurringProblems, setRecurringProblems] = useState([]);
  const [recurringLoading, setRecurringLoading] = useState(true);

  useEffect(() => {
    fetchData();
    fetchRecurringProblems();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await getOfficerComplaints();
      setComplaints(Array.isArray(data) ? data : data.items || []);
    } catch (error) {
      console.error('Failed to fetch analytics data', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecurringProblems = async () => {
    try {
      setRecurringLoading(true);
      const data = await getRecurringProblems();
      setRecurringProblems(data?.recurring_problems || []);
    } catch (error) {
      console.error('Failed to fetch recurring problems', error);
    } finally {
      setRecurringLoading(false);
    }
  };

  if (loading) {
    return <div className="py-20"><Loader /></div>;
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary-100 text-primary-700 rounded-lg">
          <BarChart3 className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-ink">Analytics & Insights</h1>
          <p className="text-sm text-muted mt-1">Deep dive into complaint data, demographics, and trends.</p>
        </div>
      </div>

      {/* Reusing the Charts component, but here it takes full focus */}
      <div className="bg-background p-4 rounded-2xl border border-ink/10">
        <Charts complaints={complaints} />
      </div>

      {/* CivicSetu Recurring Problem Detection */}
      <div className="bg-white p-8 rounded-2xl border border-ink/10 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <h3 className="text-xl font-bold text-ink tracking-tight">Recurring Problems</h3>
        </div>
        <p className="text-muted text-sm -mt-2">
          Categories and locations where 5+ similar complaints have clustered together in the last 30 days,
          surfaced by CivicSetu's DBSCAN hotspot detection.
        </p>

        {recurringLoading ? (
          <div className="py-6"><Loader /></div>
        ) : recurringProblems.length === 0 ? (
          <p className="text-sm text-muted/70 italic">No recurring problems detected in the current window.</p>
        ) : (
          <ul className="divide-y divide-ink/5">
            {recurringProblems.map((item) => (
              <li key={`${item.cluster_id}-${item.category}`} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-ink text-sm">{item.label}</p>
                    <p className="text-xs text-muted/70">{item.category} &middot; {item.region}</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
                  {item.complaint_count} complaints
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-white p-8 rounded-2xl border border-ink/10 shadow-sm space-y-6">
        <div>
          <h3 className="text-xl font-bold text-ink tracking-tight">Export Reports & System Data</h3>
          <p className="text-muted mt-1 text-sm">Download official PDF performance summaries or export the complaints database in CSV format.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <a 
            href={`${API_ORIGIN}/reports/pdf?type=monthly`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3 px-6 bg-ink hover:bg-ink-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all text-sm hover:-translate-y-0.5"
          >
            Download PDF Report
          </a>
          <a 
            href={`${API_ORIGIN}/reports/csv`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3 px-6 bg-white hover:bg-background border border-ink/10 text-ink/80 font-bold rounded-xl shadow-sm hover:shadow transition-all text-sm hover:-translate-y-0.5"
          >
            Export CSV Spreadsheet
          </a>
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;
