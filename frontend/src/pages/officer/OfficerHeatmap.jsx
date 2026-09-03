import React, { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import AnimatedPage from '../../components/AnimatedPage';
import { useAuth } from '../../context/AuthContext';
import { Flame, MapPin, AlertTriangle } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';

// Fix default marker icon paths (Vite bundling quirk with Leaflet)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const DEFAULT_CENTER = [22.9734, 78.6569]; // India centroid fallback
const DEFAULT_ZOOM = 5;

export default function OfficerHeatmap() {
  const { user } = useAuth();
  const isHead = user?.role?.toUpperCase() === 'HEAD';
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const heatLayerRef = useRef(null);
  const [showMarkers, setShowMarkers] = useState(false);
  const markersLayerRef = useRef(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['officerHeatmap'],
    queryFn: async () => (await api.get('/officer/complaints/heatmap')).data,
    refetchInterval: 60000,
  });

  // Initialize map once
  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;
    markersLayerRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Draw heat layer + markers whenever data changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !data?.points?.length) return;

    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
    }

    const heatPoints = data.points.map((p) => [p.lat, p.lng, p.weight]);
    heatLayerRef.current = L.heatLayer(heatPoints, {
      radius: 28,
      blur: 22,
      maxZoom: 15,
      gradient: { 0.2: '#22b96c', 0.4: '#C6F135', 0.6: '#fbbf24', 0.8: '#fb923c', 1.0: '#e11d48' },
    }).addTo(map);

    if (markersLayerRef.current) {
      markersLayerRef.current.clearLayers();
      if (showMarkers) {
        data.points.forEach((p) => {
          const color = { CRITICAL: '#e11d48', HIGH: '#fb923c', MEDIUM: '#fbbf24', LOW: '#22b96c' }[p.priority] || '#6B7A74';
          L.circleMarker([p.lat, p.lng], {
            radius: 6,
            color,
            fillColor: color,
            fillOpacity: 0.85,
            weight: 1.5,
          })
            .bindPopup(`<b>${p.ticket_id}</b><br/>${p.title}<br/>Priority: ${p.priority}<br/>Status: ${p.status}`)
            .addTo(markersLayerRef.current);
        });
      }
    }

    const bounds = L.latLngBounds(data.points.map((p) => [p.lat, p.lng]));
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
    }
  }, [data, showMarkers]);

  const districts = Object.entries(data?.district_breakdown || {})
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 8);

  return (
    <AnimatedPage className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-ink tracking-tight flex items-center gap-2">
            <Flame className="w-7 h-7 text-rose-500" /> {isHead ? 'Department Heatmap' : 'My Complaint Hotspots'}
          </h1>
          <p className="text-muted mt-1">
            {data
              ? `${data.count} geo-tagged complaint${data.count !== 1 ? 's' : ''} ${isHead ? 'in your department' : 'assigned to you'}`
              : 'Complaint density weighted by severity.'}
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold text-ink/70 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showMarkers}
            onChange={(e) => setShowMarkers(e.target.checked)}
            className="w-4 h-4 accent-primary-600"
          />
          Show individual pins
        </label>
      </div>

      {isError && (
        <div className="card p-4 border border-rose-200 bg-rose-50 text-rose-700 text-sm font-medium flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> Could not load heatmap data.
        </div>
      )}

      <div className="card p-3 md:p-4">
        <div ref={mapContainerRef} className="w-full h-[520px] rounded-2xl overflow-hidden" />
        {!isLoading && data && data.count === 0 && (
          <p className="text-center text-sm text-muted py-4">
            No geo-tagged complaints yet — locations appear here once citizens submit complaints with location data.
          </p>
        )}
      </div>

      <div className="card p-6">
        <h2 className="font-display font-bold text-lg text-ink mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary-600" /> Top Districts by Complaint Volume
        </h2>
        {districts.length === 0 ? (
          <p className="text-muted text-sm">No district data yet.</p>
        ) : (
          <div className="space-y-2.5">
            {districts.map(([district, stats]) => (
              <div key={district} className="flex items-center justify-between bg-background rounded-xl p-3.5 border border-ink/5">
                <span className="text-sm font-semibold text-ink/80">{district}</span>
                <div className="flex items-center gap-4 text-xs font-bold">
                  <span className="text-ink/60">{stats.total} total</span>
                  {stats.critical > 0 && <span className="text-rose-600">{stats.critical} critical</span>}
                  {stats.high > 0 && <span className="text-orange-600">{stats.high} high</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AnimatedPage>
  );
}
