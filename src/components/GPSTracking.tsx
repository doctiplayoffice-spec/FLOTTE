import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon paths (Vite asset handling)
import markerIconUrl from 'leaflet/dist/images/marker-icon.png';
import markerIcon2xUrl from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadowUrl from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIconUrl,
  iconRetinaUrl: markerIcon2xUrl,
  shadowUrl: markerShadowUrl,
});

import { useApp } from '../context/AppContext';

// Helper to format timestamp
function formatDate(ts: string | number) {
  const d = new Date(ts);
  return d.toLocaleString('fr-MA', { dateStyle: 'short', timeStyle: 'short' });
}

export default function GPSTracking() {
  const { gpsTrackings, personnel, vehicles, missions } = useApp();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const [searchName, setSearchName] = useState('');
  const [searchVehicle, setSearchVehicle] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [hasFitBounds, setHasFitBounds] = useState(false);

  // Initialise Leaflet map once
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [31.7917, -7.0926], // Maroc centre
      zoom: 6,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;
    markersLayerRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markersLayerRef.current = null;
    };
  }, []);

  // Build a lookup for quick data access
  const personnelById = useMemo(() => {
    const map: Record<string, typeof personnel[0]> = {};
    personnel.forEach(p => (map[p.id] = p));
    return map;
  }, [personnel]);

  const vehicleById = useMemo(() => {
    const map: Record<string, typeof vehicles[0]> = {};
    vehicles.forEach(v => (map[v.plate] = v));
    return map;
  }, [vehicles]);

  const missionById = useMemo(() => {
    const map: Record<string, typeof missions[0]> = {};
    missions.forEach(m => (map[m.id] = m));
    return map;
  }, [missions]);

  // Update markers whenever tracking data changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    const bounds: L.LatLngBoundsExpression[] = [];
    const now = Date.now();

    gpsTrackings.forEach(tr => {
      const lat = tr.lat;
      const lng = tr.lng;
      const timestamp = new Date(tr.timestamp).getTime();
      const ageSec = (now - timestamp) / 1000;

      let color = '#ef4444'; // red default (>5min)
      if (ageSec <= 120) color = '#10b981'; // green <2min
      else if (ageSec <= 300) color = '#f59e0b'; // orange <5min

      const driver = personnelById[tr.driverId];
      const vehicle = vehicleById[tr.vehicleId];
      const mission = missionById[tr.missionId];

      const popupContent = `
        <div style="font-size:0.85rem; line-height:1.4;">
          <strong>Chauffeur :</strong> ${driver?.firstname || ''} ${driver?.lastname || ''}<br/>
          <strong>Matricule :</strong> ${driver?.id || ''}<br/>
          <strong>Véhicule :</strong> ${vehicle?.plate || ''}<br/>
          <strong>Mission :</strong> ${mission?.num || ''}<br/>
          <strong>Latitude :</strong> ${lat.toFixed(6)}<br/>
          <strong>Longitude :</strong> ${lng.toFixed(6)}<br/>
          <strong>Précision :</strong> ±${Math.round(tr.accuracy)} m<br/>
          <strong>Dernière mise à jour :</strong> ${formatDate(tr.timestamp)}<br/>
          <strong>Statut GPS :</strong> ${tr.trackingStatus || 'unknown'}
        </div>`;

      const marker = L.circleMarker([lat, lng], {
        radius: 8,
        color: '#111',
        weight: 1,
        fillColor: color,
        fillOpacity: 0.9,
      })
        .bindPopup(popupContent);

      // Highlight if selected
      if (selectedDriverId && selectedDriverId === tr.driverId) {
        marker.setStyle({ radius: 12, weight: 2, color: '#000' });
        // Open popup after adding
        setTimeout(() => marker.openPopup(), 0);
      }

      marker.addTo(layer);
      bounds.push([lat, lng]);
    });

    // Fit bounds only once on first load or when new drivers appear and map not yet fitted
    if (!hasFitBounds && bounds.length) {
      const group = L.latLngBounds(bounds);
      map.fitBounds(group, { padding: [50, 50] });
      setHasFitBounds(true);
    }
    // else: do NOT recenter on updates to avoid view jumps
  }, [gpsTrackings, selectedDriverId, hasFitBounds, personnelById, vehicleById, missionById]);

  // Filtered list for side panel
  const filteredTrackings = useMemo(() => {
    return gpsTrackings.filter(tr => {
      const driver = personnelById[tr.driverId];
      const vehicle = vehicleById[tr.vehicleId];
      const nameMatch = driver && `${driver.firstname} ${driver.lastname}`.toLowerCase().includes(searchName.toLowerCase());
      const vehicleMatch = vehicle && vehicle.plate.toLowerCase().includes(searchVehicle.toLowerCase());
      return nameMatch && vehicleMatch;
    });
  }, [gpsTrackings, searchName, searchVehicle, personnelById, vehicleById]);

  return (
    <div className="flex h-full min-h-[600px]">
      {/* Side panel */}
      <aside className="w-80 border-r border-slate-300 bg-slate-50 p-3 overflow-y-auto">
        <h2 className="text-sm font-bold mb-2 text-slate-700 uppercase tracking-wider">
          Chauffeurs actifs
        </h2>
        <div className="mb-2">
          <input
            type="text"
            placeholder="Recherche nom"
            value={searchName}
            onChange={e => setSearchName(e.target.value)}
            className="w-full mb-1 p-1 border border-slate-300 rounded text-xs"
          />
          <input
            type="text"
            placeholder="Recherche véhicule"
            value={searchVehicle}
            onChange={e => setSearchVehicle(e.target.value)}
            className="w-full p-1 border border-slate-300 rounded text-xs"
          />
        </div>
        <ul className="space-y-1 text-xs">
          {filteredTrackings.map(tr => {
            const driver = personnelById[tr.driverId];
            const vehicle = vehicleById[tr.vehicleId];
            const ageSec = (Date.now() - new Date(tr.timestamp).getTime()) / 1000;
            let status = '❌';
            if (ageSec <= 120) status = '🟢';
            else if (ageSec <= 300) status = '🟠';
            else status = '🔴';
            return (
              <li
                key={tr.driverId}
                className={`cursor-pointer p-1 rounded hover:bg-slate-100 flex justify-between items-center ${selectedDriverId === tr.driverId ? 'bg-slate-200' : ''}`}
                onClick={() => setSelectedDriverId(tr.driverId)}
              >
                <span>{driver?.firstname} {driver?.lastname}</span>
                <span className="flex items-center gap-1">
                  <span>{status}</span>
                  <span className="text-slate-500">{formatDate(tr.timestamp)}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </aside>

      {/* Map area */}
      <section className="flex-1 relative" style={{ minHeight: '600px' }}>
        <div ref={mapRef} className="w-full h-full" />
      </section>
    </div>
  );
}
