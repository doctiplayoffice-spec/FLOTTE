import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';

/**
 * MobileDriverApp – Interface chauffeur mobile.
 *
 * GPS réel uniquement via navigator.geolocation.watchPosition().
 * Aucune coordonnée codée en dur. Aucune donnée de démonstration.
 *
 * Sécurité :
 * - HTTPS requis (ou localhost) pour le GPS
 * - Le chauffeur ne voit que sa mission et son véhicule
 * - Pas d'accès aux données des autres chauffeurs
 */

// ─── Types ────────────────────────────────────────────────────────────────────
type MobileTab = 'mission' | 'gps' | 'mileage';

type GeoStatus =
  | 'idle'          // rien encore
  | 'requesting'    // en attente de la permission
  | 'granted'       // permission accordée, position obtenue
  | 'denied'        // PERMISSION_DENIED (code 1)
  | 'unavailable'   // POSITION_UNAVAILABLE (code 2)
  | 'timeout'       // TIMEOUT (code 3)
  | 'no_https';     // protocole non sécurisé (pas localhost, pas https)

interface RealPosition {
  lat: number;
  lng: number;
  accuracy: number;   // précision en mètres
  timestamp: number;  // epoch ms (natif GeolocationPosition)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
/** Vérifie si le contexte est sécurisé (HTTPS ou localhost) */
function isSecureContext(): boolean {
  return (
    window.isSecureContext === true ||
    window.location.protocol === 'https:' ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '::1'
  );
}

/** Traduit le code d'erreur GeolocationPositionError en GeoStatus */
function geoErrorToStatus(code: number): GeoStatus {
  if (code === 1) return 'denied';
  if (code === 2) return 'unavailable';
  return 'timeout';
}

/** Traduit le GeoStatus en message utilisateur */
function geoStatusMessage(status: GeoStatus): { text: string; color: string } {
  switch (status) {
    case 'requesting':  return { text: '⏳ Demande de localisation en cours…', color: '#d97706' };
    case 'granted':     return { text: '✅ Position réelle confirmée', color: '#15803d' };
    case 'denied':      return { text: '🚫 Localisation refusée. Activez-la dans les réglages du navigateur.', color: '#dc2626' };
    case 'unavailable': return { text: '📡 GPS indisponible. Vérifiez votre signal.', color: '#dc2626' };
    case 'timeout':     return { text: '⏱ Délai dépassé. Réessayez dans une zone dégagée.', color: '#ea580c' };
    case 'no_https':    return { text: '🔒 Le GPS nécessite une connexion sécurisée HTTPS.', color: '#7c3aed' };
    default:            return { text: '', color: '' };
  }
}

// ─── Options watchPosition ─────────────────────────────────────────────────
const GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 0,          // toujours la position la plus fraîche
  timeout: 15000,
};

// ─── Composant principal ───────────────────────────────────────────────────
export default function MobileDriverApp() {
  const {
    missions, personnel, vehicles,
    gpsTrackings,
    startGPSTracking, updateGPSPosition, stopGPSTrackingMission,
    submitMileageLog,
  } = useApp();

  // ── Navigation ──
  const [tab, setTab] = useState<MobileTab>('mission');
  const [selectedMissionId, setSelectedMissionId] = useState('');

  // ── GPS state ──
  const [geoStatus, setGeoStatus] = useState<GeoStatus>('idle');
  const [tracking, setTracking] = useState(false);
  const [realPos, setRealPos] = useState<RealPosition | null>(null);
  const watchIdRef = useRef<number | null>(null);    // watchPosition ID
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null); // 45s store interval

  // ── Mileage state ──
  const [mileageValue, setMileageValue] = useState('');
  const [mileageObs, setMileageObs] = useState('');
  const [mileageSuccess, setMileageSuccess] = useState(false);
  const [mileageError, setMileageError] = useState('');

  // ── Derived data ──
  const activeMissions = missions.filter(m => m.status === 'En cours' || m.status === 'En attente');

  // Auto-select single active mission
  useEffect(() => {
    if (activeMissions.length === 1 && !selectedMissionId) {
      setSelectedMissionId(activeMissions[0].id);
    }
  }, [activeMissions.length]);

  const selectedMission = missions.find(m => m.id === selectedMissionId) ?? null;
  const vehicle = selectedMission ? (vehicles.find(v => v.plate === selectedMission.vehicleId) ?? null) : null;
  const driver = selectedMission ? (personnel.find(p => p.id === selectedMission.personnelId) ?? null) : null;
  const existingGPS = gpsTrackings.find(t => t.missionId === selectedMissionId) ?? null;

  // ── Auto-stop when mission closes ──
  useEffect(() => {
    if (tracking && selectedMission?.status === 'Terminée') {
      doStopTracking();
    }
  }, [missions]);

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      clearWatch();
      clearSendInterval();
    };
  }, []);

  // ─── GPS helpers ────────────────────────────────────────────────────────
  const clearWatch = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  const clearSendInterval = () => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  /** Reçoit une position réelle depuis watchPosition et la stocke */
  const onPositionUpdate = (
    pos: GeolocationPosition,
    missionId: string,
    vehicleId: string,
    driverId: string,
    isFirst: boolean
  ) => {
    const rp: RealPosition = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      timestamp: pos.timestamp,
    };
    setRealPos(rp);
    setGeoStatus('granted');

    if (isFirst) {
      // Premier fix : démarrer le suivi et enregistrer
      startGPSTracking(missionId, vehicleId, driverId, rp.lat, rp.lng);
      setTracking(true);

      // Mettre à jour en base toutes les 45 secondes à partir de realPos via ref
      intervalRef.current = setInterval(() => {
        // On utilise le dernier realPos via closure — mis à jour par watchPosition
        setRealPos(current => {
          if (current) {
            updateGPSPosition(missionId, vehicleId, driverId, current.lat, current.lng);
          }
          return current;
        });
      }, 45_000);
    }
  };

  const onPositionError = (err: GeolocationPositionError) => {
    setGeoStatus(geoErrorToStatus(err.code));
  };

  // ─── Handlers ───────────────────────────────────────────────────────────

  /** Étape 1 : demander la permission via getCurrentPosition (one-shot pour permission) */
  const handleAuthorizeGeo = () => {
    if (!selectedMissionId) return;

    // Vérification HTTPS
    if (!isSecureContext()) {
      setGeoStatus('no_https');
      return;
    }

    // Vérification support API
    if (!navigator.geolocation) {
      setGeoStatus('unavailable');
      return;
    }

    setGeoStatus('requesting');

    // One-shot pour déclencher la demande de permission et obtenir un premier fix
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const rp: RealPosition = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
        };
        setRealPos(rp);
        setGeoStatus('granted');
      },
      (err) => {
        setGeoStatus(geoErrorToStatus(err.code));
      },
      GEO_OPTIONS
    );
  };

  /** Étape 2 : démarrer watchPosition + intervalles d'envoi */
  const doStartTracking = () => {
    if (!selectedMission || geoStatus !== 'granted') return;
    const { vehicleId, personnelId: driverId } = selectedMission;
    const missionId = selectedMissionId;
    let isFirst = true;

    // watchPosition pour des mises à jour continues
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        onPositionUpdate(pos, missionId, vehicleId, driverId, isFirst);
        isFirst = false;
      },
      (err) => {
        onPositionError(err);
        // Ne pas arrêter le watch, l'erreur peut être transitoire
      },
      GEO_OPTIONS
    );
  };

  /** Arrêter le suivi */
  const doStopTracking = () => {
    clearWatch();
    clearSendInterval();
    setTracking(false);
    if (selectedMissionId) {
      stopGPSTrackingMission(selectedMissionId);
    }
  };

  /** Changer de mission → tout réinitialiser */
  const handleChangeMission = (id: string) => {
    if (tracking) doStopTracking();
    setGeoStatus('idle');
    setRealPos(null);
    setSelectedMissionId(id);
  };

  /** Envoi du kilométrage journalier */
  const handleSendMileage = () => {
    setMileageError('');
    setMileageSuccess(false);

    if (!selectedMissionId || !vehicle) {
      setMileageError("Sélectionnez une mission d'abord.");
      return;
    }
    const km = parseInt(mileageValue, 10);
    if (!mileageValue || isNaN(km) || km <= 0) {
      setMileageError('Kilométrage invalide. Saisissez un entier positif.');
      return;
    }
    if (vehicle && km < vehicle.mileage) {
      setMileageError(
        `Le kilométrage saisi (${km.toLocaleString()} km) est inférieur au kilométrage actuel enregistré (${vehicle.mileage.toLocaleString()} km). Vérifiez la valeur.`
      );
      return;
    }

    submitMileageLog({
      vehicleId: vehicle.plate,
      driverId: selectedMission!.personnelId,
      missionId: selectedMissionId,
      date: new Date().toISOString().split('T')[0],
      mileage: km,
      observation: mileageObs.trim(),
    });

    setMileageSuccess(true);
    setMileageValue('');
    setMileageObs('');
    setTimeout(() => setMileageSuccess(false), 5000);
  };

  // ─── Computed display values ─────────────────────────────────────────────
  const statusMsg = geoStatusMessage(geoStatus);
  const posTime = realPos ? new Date(realPos.timestamp).toLocaleTimeString('fr-MA') : null;
  const https = isSecureContext();

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: 480, margin: '0 auto' }}>

      {/* ── Header ── */}
      <header style={{ background: '#1e3a5f', color: '#fff', padding: '12px 16px 10px' }}>
        <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase' }}>
          🚛 FleetManager — Chauffeur
        </div>
        <div style={{ fontSize: 10, color: '#93c5fd', marginTop: 2 }}>
          {https ? '🔒 Connexion sécurisée HTTPS' : '⚠️ Non sécurisé (HTTPS requis pour GPS)'}
        </div>

        {/* Bannière GPS actif */}
        {tracking && (
          <div style={{ marginTop: 8, background: '#15803d', borderRadius: 4, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#fff', animation: 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite' }} />
            <div>
              <div style={{ fontWeight: 800, fontSize: 12 }}>📡 SUIVI GPS ACTIF</div>
              <div style={{ fontSize: 10, color: '#dcfce7' }}>Mise à jour store toutes les 45 s — watchPosition en continu</div>
            </div>
          </div>
        )}
      </header>

      {/* ── Mission card (always visible) ── */}
      <div style={{ background: '#fff', margin: '8px 8px 0', padding: '12px', border: '1px solid #cbd5e1', borderRadius: 4 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>
          Mission en cours
        </div>

        {activeMissions.length === 0 ? (
          <p style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>Aucune mission active assignée.</p>
        ) : activeMissions.length === 1 ? (
          selectedMission ? (
            <div style={{ fontSize: 12 }}>
              <div style={{ fontWeight: 800, color: '#1e3a5f', fontSize: 14 }}>{selectedMission.num}</div>
              <div style={{ color: '#334155', marginTop: 3 }}>📍 {selectedMission.departurePlace} → <strong>{selectedMission.destination}</strong></div>
              {vehicle && <div style={{ color: '#475569', marginTop: 2 }}>🚗 {vehicle.plate} — {vehicle.brand} {vehicle.model}</div>}
              {driver && <div style={{ color: '#475569', marginTop: 2 }}>👤 {driver.firstname} {driver.lastname}</div>}
              <div style={{ marginTop: 6 }}>
                <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 3, fontSize: 10, fontWeight: 700, background: selectedMission.status === 'En cours' ? '#dcfce7' : '#fef9c3', color: selectedMission.status === 'En cours' ? '#15803d' : '#854d0e', border: `1px solid ${selectedMission.status === 'En cours' ? '#86efac' : '#fde68a'}` }}>
                  {selectedMission.status}
                </span>
              </div>
            </div>
          ) : null
        ) : (
          <select
            disabled={tracking}
            style={{ width: '100%', padding: '8px', fontSize: 12, border: '1px solid #cbd5e1', background: '#fff', borderRadius: 3 }}
            value={selectedMissionId}
            onChange={e => handleChangeMission(e.target.value)}
          >
            <option value="">— Sélectionner une mission —</option>
            {activeMissions.map(m => (
              <option key={m.id} value={m.id}>
                {m.num} : {m.departurePlace} → {m.destination}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* ── Tab bar ── */}
      <div style={{ display: 'flex', background: '#fff', border: '1px solid #e2e8f0', margin: '8px 8px 0', borderRadius: 4, overflow: 'hidden' }}>
        {([
          { id: 'mission' as MobileTab, label: '📋 Mission' },
          { id: 'gps' as MobileTab, label: '📡 GPS' },
          { id: 'mileage' as MobileTab, label: '🔢 Km' },
        ]).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1, padding: '10px 4px', fontSize: 11, fontWeight: 700,
              background: tab === t.id ? '#1e3a5f' : '#fff',
              color: tab === t.id ? '#fff' : '#64748b',
              border: 'none', borderRight: '1px solid #e2e8f0', cursor: 'pointer',
              textTransform: 'uppercase', letterSpacing: 0.5,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div style={{ flex: 1, padding: '8px', overflowY: 'auto' }}>

        {/* ─ Tab: Mission details ─ */}
        {tab === 'mission' && (
          <div style={{ background: '#fff', border: '1px solid #cbd5e1', padding: 14, borderRadius: 4 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 10 }}>
              Détails de la mission
            </div>
            {!selectedMission ? (
              <p style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>Sélectionnez une mission ci-dessus.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <tbody>
                  {([
                    ['N° Mission', selectedMission.num],
                    ['Départ', selectedMission.departurePlace],
                    ['Destination', selectedMission.destination],
                    ['Date départ', selectedMission.departureDate],
                    ['Retour prévu', selectedMission.returnDatePlanned],
                    ['Objet', selectedMission.purpose],
                    ['Statut', selectedMission.status],
                    ['Véhicule', vehicle ? `${vehicle.plate} – ${vehicle.brand} ${vehicle.model}` : '—'],
                    ['Km actuel', vehicle ? `${vehicle.mileage.toLocaleString('fr-MA')} km` : '—'],
                    ['Chauffeur', driver ? `${driver.firstname} ${driver.lastname}` : '—'],
                  ] as [string, string][]).map(([label, value]) => (
                    <tr key={label} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '6px 4px', color: '#64748b', fontWeight: 600, width: '40%', verticalAlign: 'top' }}>{label}</td>
                      <td style={{ padding: '6px 4px', color: '#0f172a', fontWeight: 500 }}>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ─ Tab: GPS ─ */}
        {tab === 'gps' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

            {/* Pas de mission sélectionnée */}
            {!selectedMissionId && (
              <div style={{ background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 4, padding: 12, fontSize: 12, color: '#713f12' }}>
                ⚠️ Sélectionnez d'abord une mission (onglet Mission).
              </div>
            )}

            {/* Avertissement HTTPS */}
            {selectedMissionId && !https && (
              <div style={{ background: '#f5f3ff', border: '1px solid #c4b5fd', borderRadius: 4, padding: 12, fontSize: 12, color: '#6d28d9' }}>
                🔒 <strong>Le GPS nécessite une connexion sécurisée HTTPS.</strong><br />
                <span style={{ fontSize: 11 }}>Cette page est actuellement servie en HTTP. Accédez à l'URL HTTPS déployée pour utiliser le GPS sur mobile.</span>
              </div>
            )}

            {/* ── Étape 1 : Autoriser ── */}
            {selectedMissionId && https && geoStatus === 'idle' && (
              <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: 4, padding: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 8 }}>
                  Étape 1 — Autoriser la localisation GPS
                </div>
                <p style={{ fontSize: 12, color: '#334155', marginBottom: 12, lineHeight: 1.6 }}>
                  Votre position GPS sera transmise au gestionnaire <strong>uniquement pendant cette mission</strong>. L'autorisation est <strong>volontaire</strong>.
                  Seule la vraie position GPS de votre appareil est utilisée.
                </p>
                <button
                  onClick={handleAuthorizeGeo}
                  style={{ width: '100%', padding: '16px 0', background: '#d97706', color: '#fff', fontWeight: 800, fontSize: 15, border: 'none', borderRadius: 4, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 1 }}
                >
                  📍 Autoriser la localisation GPS
                </button>
              </div>
            )}

            {/* ── Demande en cours ── */}
            {selectedMissionId && https && geoStatus === 'requesting' && (
              <div style={{ background: '#fff', border: '1px solid #fde68a', borderRadius: 4, padding: 14, textAlign: 'center' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>📡</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e' }}>Acquisition GPS en cours…</div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Acceptez la demande de localisation dans votre navigateur</div>
              </div>
            )}

            {/* ── Erreur ── */}
            {selectedMissionId && ['denied', 'unavailable', 'timeout', 'no_https'].includes(geoStatus) && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 4, padding: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#dc2626', marginBottom: 4 }}>
                  {statusMsg.text}
                </div>
                {geoStatus === 'denied' && (
                  <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>
                    Sur iOS : Réglages → Confidentialité → Localisation → Safari → Autoriser<br />
                    Sur Android : Paramètres → Applications → Chrome → Autorisations → Localisation
                  </div>
                )}
                <button
                  onClick={() => { setGeoStatus('idle'); setRealPos(null); }}
                  style={{ marginTop: 10, padding: '8px 16px', background: '#fff', border: '1px solid #cbd5e1', fontSize: 11, fontWeight: 700, borderRadius: 3, cursor: 'pointer' }}
                >
                  Réessayer
                </button>
              </div>
            )}

            {/* ── Permission accordée — position réelle obtenue ── */}
            {selectedMissionId && https && geoStatus === 'granted' && !tracking && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 4, padding: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#15803d', marginBottom: 6 }}>
                    ✅ Position réelle confirmée
                  </div>
                  {realPos && (
                    <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                      <tbody>
                        {([
                          ['Latitude', realPos.lat.toFixed(6) + ' °'],
                          ['Longitude', realPos.lng.toFixed(6) + ' °'],
                          ['Précision', `± ${Math.round(realPos.accuracy)} m`],
                          ['Heure de fix', new Date(realPos.timestamp).toLocaleTimeString('fr-MA')],
                        ] as [string, string][]).map(([k, v]) => (
                          <tr key={k}>
                            <td style={{ color: '#64748b', fontWeight: 600, padding: '2px 0', width: '50%' }}>{k}</td>
                            <td style={{ color: '#0f172a', fontWeight: 700 }}>{v}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <button
                  onClick={doStartTracking}
                  style={{ width: '100%', padding: '16px 0', background: '#15803d', color: '#fff', fontWeight: 800, fontSize: 16, border: 'none', borderRadius: 4, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 1 }}
                >
                  ▶ DÉMARRER LE SUIVI GPS
                </button>
              </div>
            )}

            {/* ── Suivi actif ── */}
            {tracking && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* Position en temps réel */}
                <div style={{ background: '#f0fdf4', border: '2px solid #86efac', borderRadius: 4, padding: 14 }}>
                  <div style={{ fontWeight: 800, color: '#15803d', fontSize: 13, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#16a34a', display: 'inline-block', boxShadow: '0 0 0 3px rgba(22,163,74,0.3)' }} />
                    Position GPS réelle — mise à jour en continu
                  </div>
                  {realPos ? (
                    <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                      <tbody>
                        {([
                          ['Latitude', realPos.lat.toFixed(6) + ' °'],
                          ['Longitude', realPos.lng.toFixed(6) + ' °'],
                          ['Précision', `± ${Math.round(realPos.accuracy)} m`],
                          ['Dernière mise à jour', new Date(realPos.timestamp).toLocaleTimeString('fr-MA')],
                        ] as [string, string][]).map(([k, v]) => (
                          <tr key={k} style={{ borderBottom: '1px solid #dcfce7' }}>
                            <td style={{ color: '#64748b', fontWeight: 600, padding: '5px 0', width: '52%' }}>{k}</td>
                            <td style={{ color: '#0f172a', fontWeight: 800 }}>{v}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic' }}>Acquisition en cours…</p>
                  )}
                  <div style={{ marginTop: 8, fontSize: 10, color: '#64748b', borderTop: '1px solid #dcfce7', paddingTop: 6 }}>
                    Les coordonnées proviennent exclusivement du GPS de votre appareil.<br />
                    Mise à jour en base de données toutes les <strong>45 secondes</strong>.
                  </div>
                </div>

                <button
                  onClick={doStopTracking}
                  style={{ width: '100%', padding: '16px 0', background: '#dc2626', color: '#fff', fontWeight: 800, fontSize: 16, border: 'none', borderRadius: 4, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 1 }}
                >
                  ■ ARRÊTER LE SUIVI GPS
                </button>
              </div>
            )}

            {/* ── Suivi précédemment arrêté ── */}
            {!tracking && existingGPS?.trackingStatus === 'arrêté' && geoStatus === 'idle' && (
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 4, padding: 10, fontSize: 12, color: '#64748b' }}>
                ■ Le suivi GPS a été arrêté pour cette mission.
              </div>
            )}

            {/* Note confidentialité */}
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 4, padding: 10, fontSize: 11, color: '#1e40af', lineHeight: 1.5 }}>
              <strong>ℹ Confidentialité :</strong> Votre position n'est jamais transmise sans votre accord explicite.
              Seule la dernière position est conservée (pas d'historique de parcours).
              Le suivi s'arrête automatiquement à la fin de la mission.
            </div>
          </div>
        )}

        {/* ─ Tab: Mileage ─ */}
        {tab === 'mileage' && (
          <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: 4, padding: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 10 }}>
              Envoi du kilométrage journalier
            </div>

            {!selectedMissionId ? (
              <p style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic', marginBottom: 10 }}>
                Sélectionnez d'abord une mission (onglet Mission).
              </p>
            ) : vehicle ? (
              <>
                {/* Véhicule info */}
                <div style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 4, padding: 10, fontSize: 12, marginBottom: 14 }}>
                  <div style={{ fontWeight: 700, color: '#334155' }}>🚗 {vehicle.plate} — {vehicle.brand} {vehicle.model}</div>
                  <div style={{ color: '#64748b', marginTop: 3 }}>Kilométrage enregistré : <strong>{vehicle.mileage.toLocaleString('fr-MA')} km</strong></div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Date */}
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: 4 }}>
                      Date du jour
                    </label>
                    <input
                      readOnly
                      value={new Date().toLocaleDateString('fr-MA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      style={{ width: '100%', padding: '8px', fontSize: 12, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#334155', boxSizing: 'border-box', borderRadius: 3 }}
                    />
                  </div>

                  {/* Kilométrage */}
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: 4 }}>
                      Kilométrage actuel (km) *
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      placeholder={`Supérieur à ${vehicle.mileage.toLocaleString('fr-MA')}`}
                      value={mileageValue}
                      onChange={e => setMileageValue(e.target.value)}
                      style={{ width: '100%', padding: '12px 8px', fontSize: 18, fontWeight: 700, border: '2px solid #cbd5e1', background: '#fff', color: '#0f172a', boxSizing: 'border-box', borderRadius: 4 }}
                    />
                  </div>

                  {/* Observation */}
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: 4 }}>
                      Observation (facultatif)
                    </label>
                    <textarea
                      placeholder="Ex: Plein effectué à Meknès, retard autoroute…"
                      value={mileageObs}
                      onChange={e => setMileageObs(e.target.value)}
                      rows={3}
                      style={{ width: '100%', padding: '8px', fontSize: 12, border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', boxSizing: 'border-box', resize: 'vertical', borderRadius: 3 }}
                    />
                  </div>

                  {/* Erreur */}
                  {mileageError && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 4, padding: 10, fontSize: 12, color: '#dc2626' }}>
                      ⚠ {mileageError}
                    </div>
                  )}

                  {/* Succès */}
                  {mileageSuccess && (
                    <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 4, padding: 12, fontSize: 13, color: '#15803d', fontWeight: 700, textAlign: 'center' }}>
                      ✅ Kilométrage transmis au gestionnaire !
                    </div>
                  )}

                  {/* Bouton envoi */}
                  <button
                    onClick={handleSendMileage}
                    disabled={!mileageValue}
                    style={{
                      width: '100%', padding: '15px 0',
                      background: !mileageValue ? '#94a3b8' : '#1e3a5f',
                      color: '#fff', fontWeight: 800, fontSize: 14, border: 'none',
                      borderRadius: 4, cursor: !mileageValue ? 'default' : 'pointer',
                      textTransform: 'uppercase', letterSpacing: 1,
                    }}
                  >
                    📤 ENVOYER LE KILOMÉTRAGE
                  </button>
                </div>
              </>
            ) : (
              <p style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>Aucun véhicule lié à cette mission.</p>
            )}
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div style={{ background: '#f1f5f9', borderTop: '1px solid #e2e8f0', padding: '8px 12px', fontSize: 10, color: '#94a3b8', textAlign: 'center' }}>
        FleetManager Mobile · GPS réel uniquement · Suivi volontaire · {https ? '🔒 HTTPS' : '⚠ HTTP'}
      </div>
    </div>
  );
}
