import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ImportButton } from './ImportButton';

// Fix Leaflet default icon paths broken by Vite asset bundling
import markerIconUrl from 'leaflet/dist/images/marker-icon.png';
import markerIcon2xUrl from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadowUrl from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIconUrl,
  iconRetinaUrl: markerIcon2xUrl,
  shadowUrl: markerShadowUrl,
});

// Morocco centre coordinates and zoom level
const MOROCCO_CENTER: [number, number] = [31.7917, -7.0926];
const MOROCCO_ZOOM = 6;

export default function MoroccoMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);

  // Initialise Leaflet map once
  useEffect(() => {
    if (!mapRef.current || leafletMapRef.current) return;

    const map = L.map(mapRef.current, {
      center: MOROCCO_CENTER,
      zoom: MOROCCO_ZOOM,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    leafletMapRef.current = map;

    // Cleanup on unmount
    return () => {
      map.remove();
      leafletMapRef.current = null;
    };
  }, []);

  // Ensure map resizes correctly if container changes
  useEffect(() => {
    if (leafletMapRef.current) {
      leafletMapRef.current.invalidateSize();
    }
  }, []);

  return (
    <div className="bg-white border border-slate-300 rounded-md overflow-hidden shadow-sm">
      <div className="bg-slate-200 px-3 py-1.5 border-b border-slate-300 text-sm font-bold text-slate-600 uppercase">
        Carte du Maroc
      </div>
      <div ref={mapRef} style={{ height: '500px', width: '100%' }} />
      {/* Bouton d’import orange */}
      <div className="mt-4 flex justify-center">
        <ImportButton label="Importer des cartes" buttonClass="bg-orange-500 hover:bg-orange-600" onUploadComplete={url => console.log('Map file URL:', url)} />
      </div>
      {/* Import button for Word, PDF, Excel files */}
      <div className="mt-4 flex justify-center">
        <ImportButton
          label="Add document"
          onUploadComplete={url => console.log('Uploaded file URL:', url)}
        />
      </div>
    </div>
  );
}
