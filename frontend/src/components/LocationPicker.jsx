import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTranslation } from 'react-i18next';
import { MapPin, LocateFixed, Loader2 } from 'lucide-react';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const DEFAULT_CENTER = [28.6139, 77.2090]; // New Delhi fallback
const DEFAULT_ZOOM = 13;

/**
 * Lets the citizen drop / drag a pin on a map to mark exactly where an
 * issue is occurring. Reports back { lat, lng } via onChange, and — best
 * effort — a human-readable place name via free OSM reverse geocoding
 * so the district field can be pre-filled.
 */
export default function LocationPicker({ onChange, onAddressGuess }) {
  const { t } = useTranslation();
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const [locating, setLocating] = useState(false);
  const [coords, setCoords] = useState(null);

  const setPin = useCallback((lat, lng, recenter = false) => {
    setCoords({ lat, lng });
    onChange?.({ lat, lng });

    const map = mapRef.current;
    if (!map) return;

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(map);
      markerRef.current.on('dragend', () => {
        const { lat: newLat, lng: newLng } = markerRef.current.getLatLng();
        setPin(newLat, newLng);
      });
    }

    if (recenter) map.setView([lat, lng], 16);

    // Best-effort reverse geocode (free, no key) — silently ignored on failure/rate-limit
    fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`, {
      headers: { 'Accept-Language': 'en' },
    })
      .then((r) => r.json())
      .then((data) => {
        const addr = data?.address || {};
        const guess = addr.suburb || addr.neighbourhood || addr.city_district || addr.town || addr.city || addr.county;
        if (guess) onAddressGuess?.(guess);
      })
      .catch(() => {});
  }, [onChange, onAddressGuess]);

  const locateMe = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPin(pos.coords.latitude, pos.coords.longitude, true);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, [setPin]);

  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    map.on('click', (e) => setPin(e.latlng.lat, e.latlng.lng));
    mapRef.current = map;

    // Try to center on the citizen's real location on first load, silently
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => map.setView([pos.coords.latitude, pos.coords.longitude], DEFAULT_ZOOM),
        () => {},
        { timeout: 5000 }
      );
    }

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-ink/70 ml-1 flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-primary-600" /> {t('complaintForm.pinLocation')}
        </label>
        <button
          type="button"
          onClick={locateMe}
          disabled={locating}
          className="text-xs font-bold text-primary-700 hover:text-primary-800 flex items-center gap-1.5 disabled:opacity-50"
        >
          {locating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LocateFixed className="w-3.5 h-3.5" />}
          {t('complaintForm.useMyLocation')}
        </button>
      </div>
      <div ref={mapContainerRef} className="w-full h-64 rounded-2xl overflow-hidden border border-ink/10" />
      <p className="text-xs text-muted ml-1">
        {coords
          ? t('complaintForm.pinnedAt', { lat: coords.lat.toFixed(5), lng: coords.lng.toFixed(5) })
          : t('complaintForm.tapToPin')}
      </p>
    </div>
  );
}
