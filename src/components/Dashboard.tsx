import React from 'react';
import { useApp } from '../context/AppContext';
import { AlertTriangle } from 'lucide-react';

export default function Dashboard() {
  const { vehicles, missions, maintenance, personnel, setActiveTab } = useApp();

  // Date calculation utilities (today is fixed to '2026-06-13')
  const getDaysDiff = (dateStr: string) => {
    if (!dateStr) return 9999;
    const today = new Date('2026-06-13');
    const target = new Date(dateStr);
    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getImmobilizationDays = (statusChangedDate: string) => {
    if (!statusChangedDate) return 0;
    const today = new Date('2026-06-13');
    const target = new Date(statusChangedDate);
    const diffTime = today.getTime() - target.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  // Stats calculation
  const totalVehicles = vehicles.length;
  const availableCount = vehicles.filter(v => v.status === 'Disponible').length;
  const missionCount = vehicles.filter(v => v.status === 'En mission').length;
  const maintCount = vehicles.filter(v => v.status === 'Maintenance').length;
  const breakdownCount = vehicles.filter(v => v.status === 'Panne').length;
  const outOfServiceCount = maintCount + breakdownCount;

  const ongoingMissions = missions.filter(m => m.status === 'En cours');
  const completedMissionsCount = missions.filter(m => m.status === 'Terminée').length;
  const missionsTodayCount = missions.filter(m => m.departureDate === '2026-06-13').length;
  const availableStaffCount = personnel.filter(p => p.status === 'Présent').length;

  const pendingAlerts = maintenance.filter(m => m.status === 'Prévue' || m.status === 'En cours');

  // Auto-calculated Alerts
  const alerts: { type: string; message: string; vehiclePlate: string; vehicleDesc: string }[] = [];

  vehicles.forEach(v => {
    // 1. Visite technique dans moins de 30 jours
    if (v.nextInspection) {
      const days = getDaysDiff(v.nextInspection);
      if (days <= 30) {
        alerts.push({
          type: 'Visite Technique',
          message: days < 0 
            ? `Visite technique dépassée de ${Math.abs(days)} jours (échéance : ${v.nextInspection})` 
            : `Visite technique obligatoire sous ${days} jours (le ${v.nextInspection})`,
          vehiclePlate: v.plate,
          vehicleDesc: `${v.brand} ${v.model}`
        });
      }
    }

    // 2. Assurance expire dans moins de 15 jours
    if (v.insuranceExpiry) {
      const days = getDaysDiff(v.insuranceExpiry);
      if (days <= 15) {
        alerts.push({
          type: 'Assurance',
          message: days < 0 
            ? `Assurance expirée de ${Math.abs(days)} jours (échéance : ${v.insuranceExpiry})` 
            : `L'assurance expire dans ${days} jours (le ${v.insuranceExpiry})`,
          vehiclePlate: v.plate,
          vehicleDesc: `${v.brand} ${v.model}`
        });
      }
    }

    // 3. Maintenance prévue dans moins de 1000 km
    if (v.nextMaintMileage) {
      const diff = v.nextMaintMileage - v.mileage;
      if (diff <= 1000) {
        alerts.push({
          type: 'Maintenance Odomètre',
          message: diff < 0 
            ? `Entretien dépassé de ${Math.abs(diff)} km (limite : ${v.nextMaintMileage} km)` 
            : `Entretien requis dans ${diff} km (limite : ${v.nextMaintMileage} km)`,
          vehiclePlate: v.plate,
          vehicleDesc: `${v.brand} ${v.model}`
        });
      }
    }

    // 4. Véhicule en panne
    if (v.status === 'Panne') {
      alerts.push({
        type: 'Panne active',
        message: `Véhicule signalé en PANNE : ${v.notes || 'panne moteur'}`,
        vehiclePlate: v.plate,
        vehicleDesc: `${v.brand} ${v.model}`
      });
    }

    // 5. Véhicule immobilisé trop longtemps (>= 10 jours)
    if (v.status === 'Maintenance' || v.status === 'Panne') {
      const days = getImmobilizationDays(v.statusChangedDate);
      if (days >= 10) {
        alerts.push({
          type: 'Immobilisation prolongée',
          message: `Véhicule immobilisé depuis ${days} jours consécutifs (Statut : ${v.status})`,
          vehiclePlate: v.plate,
          vehicleDesc: `${v.brand} ${v.model}`
        });
      }
    }
  });

  const getStaffName = (id: string) => {
    const s = personnel.find(p => p.id === id);
    return s ? `${s.firstname} ${s.lastname}` : 'Inconnu';
  };

  const getVehicleDesc = (plate: string) => {
    const v = vehicles.find(veh => veh.plate === plate);
    return v ? `${v.brand} ${v.model}` : plate;
  };

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="border-b border-slate-300 pb-2">
        <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight">
          TABLEAU DE BORD GENERAL - SITUATION DE LA FLOTTE
        </h2>
        <p className="text-[11px] text-slate-500">Date du jour de référence : 13/06/2026</p>
      </div>

      {/* Top Split: Situation du jour & Fleet metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Table 1: Situation du jour */}
        <div className="bg-white border border-slate-300 p-4 space-y-3">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-1 flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 bg-blue-600"></span>
            Situation du Jour (Briefing)
          </h3>
          <table className="admin-table">
            <thead>
              <tr>
                <th className="text-left">Indicateur / Statut</th>
                <th className="text-right w-24">Valeur</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Véhicules Disponibles</td>
                <td className="text-right font-bold text-emerald-600 bg-emerald-50/30">{availableCount}</td>
              </tr>
              <tr>
                <td>Véhicules En Mission</td>
                <td className="text-right font-bold text-amber-600 bg-amber-50/30">{missionCount}</td>
              </tr>
              <tr>
                <td>Véhicules En Maintenance (Atelier)</td>
                <td className="text-right font-bold text-rose-600 bg-rose-50/30">{maintCount}</td>
              </tr>
              <tr>
                <td className="font-semibold text-red-800 bg-red-50/40">Véhicules En Panne</td>
                <td className="text-right font-bold text-red-850 bg-red-100/40">{breakdownCount}</td>
              </tr>
              <tr>
                <td>Missions du Jour</td>
                <td className="text-right font-bold text-slate-800">{missionsTodayCount}</td>
              </tr>
              <tr>
                <td>Alertes Actives</td>
                <td className={`text-right font-bold ${alerts.length > 0 ? 'text-red-700 bg-red-50' : 'text-slate-850'}`}>
                  {alerts.length}
                </td>
              </tr>
              <tr>
                <td>Agents Disponibles</td>
                <td className="text-right font-bold text-emerald-650 bg-emerald-50/20">{availableStaffCount}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Table 2: KPIs Fleet status breakdown */}
        <div className="bg-white border border-slate-300 p-4 space-y-3">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-1 flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 bg-slate-600"></span>
            Indicateurs de Performance et Seuils
          </h3>
          <table className="admin-table">
            <thead>
              <tr>
                <th className="text-left">Indicateur de Performance</th>
                <th className="text-right w-24">Valeur</th>
                <th className="text-left">Description / Seuil</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="font-semibold">Flotte Totale</td>
                <td className="text-right font-bold text-slate-800">{totalVehicles}</td>
                <td>Total des véhicules enregistrés</td>
              </tr>
              <tr>
                <td className="font-semibold text-emerald-700">Véhicules Disponibles (Uptime)</td>
                <td className="text-right font-bold text-emerald-700 bg-emerald-50/20">{availableCount}</td>
                <td>Prêts pour affectation immédiate</td>
              </tr>
              <tr>
                <td className="font-semibold text-amber-700">Véhicules En Mission</td>
                <td className="text-right font-bold text-amber-700 bg-amber-50/20">{missionCount}</td>
                <td>En transit opérationnel</td>
              </tr>
              <tr>
                <td className="font-semibold text-red-850 bg-red-50/30">Véhicules En Panne</td>
                <td className="text-right font-bold text-red-850 bg-red-50/30">{breakdownCount}</td>
                <td className="text-red-800 font-semibold">Incident technique critique (en rouge foncé)</td>
              </tr>
              <tr>
                <td className="font-semibold text-rose-800 bg-rose-50/30">Véhicules Hors Service</td>
                <td className="text-right font-bold text-rose-800 bg-rose-50/30">{outOfServiceCount}</td>
                <td>Total Atelier + Pannes</td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>

      {/* Row: Alertes à traiter */}
      {alerts.length > 0 && (
        <div className="bg-red-50 border border-red-300 p-4 space-y-3">
          <h3 className="text-xs font-bold text-red-800 uppercase tracking-wider border-b border-red-200 pb-1 flex items-center gap-1.5">
            <AlertTriangle className="text-red-750" size={14} />
            Alertes à traiter ({alerts.length})
          </h3>
          <table className="admin-table">
            <thead>
              <tr>
                <th className="text-left text-red-800" style={{ backgroundColor: '#fee2e2' }}>Véhicule</th>
                <th className="text-left text-red-800" style={{ backgroundColor: '#fee2e2' }}>Type d'Alerte</th>
                <th className="text-left text-red-800" style={{ backgroundColor: '#fee2e2' }}>Description / Échéance</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((alert, idx) => (
                <tr key={idx} className="hover:bg-red-100/30">
                  <td className="font-semibold">{alert.vehicleDesc} ({alert.vehiclePlate})</td>
                  <td className="font-mono text-[10px] text-red-700 font-bold uppercase">{alert.type}</td>
                  <td className="text-red-900">{alert.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Row: Summary Activity & Ongoing Missions Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Résumé d'activité */}
        <div className="bg-white border border-slate-300 p-4 space-y-3">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-1 flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 bg-blue-700"></span>
            Résumé d'Activité
          </h3>
          <table className="admin-table">
            <thead>
              <tr>
                <th className="text-left">Activité</th>
                <th className="text-right w-24">Nombre</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Missions en cours</td>
                <td className="text-right font-bold text-amber-600 bg-amber-50/20">{ongoingMissions.length}</td>
              </tr>
              <tr>
                <td>Missions clôturées</td>
                <td className="text-right font-bold text-emerald-600 bg-emerald-50/20">{completedMissionsCount}</td>
              </tr>
              <tr>
                <td>Alertes entretien actives</td>
                <td className="text-right font-bold text-rose-650 bg-rose-50/20">{pendingAlerts.length}</td>
              </tr>
            </tbody>
          </table>
          <div className="pt-2">
            <button 
              onClick={() => setActiveTab('quick_actions')}
              className="admin-btn w-full font-bold text-xs"
            >
              Accéder aux Actions Rapides
            </button>
          </div>
        </div>

        {/* Ongoing Missions table */}
        <div className="bg-white border border-slate-300 p-4 space-y-3 lg:col-span-2">
          <div className="flex justify-between items-center border-b border-slate-200 pb-1">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 bg-indigo-600"></span>
              Missions en Cours ({ongoingMissions.length})
            </h3>
            <button 
              onClick={() => setActiveTab('missions')}
              className="text-xs text-blue-650 font-bold hover:underline"
            >
              Voir tout le manifeste
            </button>
          </div>
          <table className="admin-table">
            <thead>
              <tr>
                <th className="text-left">N° Mission</th>
                <th className="text-left">Véhicule</th>
                <th className="text-left">Chauffeur</th>
                <th className="text-left">Destination</th>
                <th className="text-right">Retour Prévu</th>
              </tr>
            </thead>
            <tbody>
              {ongoingMissions.length > 0 ? (
                ongoingMissions.map(m => (
                  <tr key={m.id}>
                    <td className="font-mono font-semibold">{m.num}</td>
                    <td>{getVehicleDesc(m.vehicleId)}</td>
                    <td>{getStaffName(m.personnelId)}</td>
                    <td>{m.destination}</td>
                    <td className="text-right font-bold text-amber-600 bg-amber-50/10">{m.returnDatePlanned}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-center text-slate-450 py-6">Aucun véhicule n'est actuellement en mission.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
}
