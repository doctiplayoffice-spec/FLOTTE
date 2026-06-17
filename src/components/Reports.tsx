import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Printer } from 'lucide-react';
import { VEHICLE_CATEGORY_LABELS } from '../models/Vehicle';

export default function Reports() {
  const { vehicles, missions, maintenance, personnel } = useApp();
  const [reportType, setReportType] = useState<'missions' | 'available' | 'maintenance' | 'summary'>('summary');

  // Filter states
  const availableVehicles = vehicles.filter(v => v.status === 'Disponible');
  const maintenanceVehicles = vehicles.filter(v => v.status === 'Maintenance');
  
  const completedMissions = missions.filter(m => m.status === 'Terminée');
  const activeMissions = missions.filter(m => m.status === 'En cours');

  const getStaffName = (id: string) => {
    const s = personnel.find(p => p.id === id);
    return s ? `${s.firstname} ${s.lastname}` : 'Inconnu';
  };

  const getVehicleDesc = (plate: string) => {
    const v = vehicles.find(veh => veh.plate === plate);
    return v ? `${v.brand} ${v.model}` : plate;
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      
      {/* Title */}
      <div className="border-b border-slate-300 pb-2 no-print">
        <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight">
          EDITION ET EXTRACTION DE RAPPORTS LOGISTIQUES
        </h2>
      </div>

      {/* Report selector tabs & print button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print bg-white border border-slate-300 p-3">
        
        {/* Selector tabs */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setReportType('summary')}
            className={`admin-btn ${reportType === 'summary' ? 'admin-btn-primary' : ''}`}
          >
            Résumé mensuel
          </button>
          <button
            onClick={() => setReportType('missions')}
            className={`admin-btn ${reportType === 'missions' ? 'admin-btn-primary' : ''}`}
          >
            Rapport des missions
          </button>
          <button
            onClick={() => setReportType('available')}
            className={`admin-btn ${reportType === 'available' ? 'admin-btn-primary' : ''}`}
          >
            Véhicules disponibles
          </button>
          <button
            onClick={() => setReportType('maintenance')}
            className={`admin-btn ${reportType === 'maintenance' ? 'admin-btn-primary' : ''}`}
          >
            Véhicules en maintenance
          </button>
        </div>

        {/* Print PDF trigger */}
        <button
          onClick={handlePrint}
          className="admin-btn font-bold text-xs"
        >
          <Printer size={12} className="mr-1.5" /> Exporter en PDF / Imprimer
        </button>
      </div>

      {/* Printable Area Container */}
      <div className="bg-white border border-slate-300 p-6 space-y-6">
        
        {/* Print-only Header block */}
        <div className="hidden print:block border-b border-slate-300 pb-4 mb-4">
          <h1 className="text-xl font-bold uppercase tracking-tight text-slate-800">RAPPORT LOGISTIQUE INTERNE - FLEETMANAGER</h1>
          <p className="text-[10px] text-slate-500 mt-1">Date d'édition : {new Date().toLocaleDateString('fr-FR')} | Auteur : Coordinateur de flotte</p>
        </div>

        {/* 1. Monthly Summary Activity */}
        {reportType === 'summary' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Résumé d'activité de la flotte</h2>
              <p className="text-[11px] text-slate-400">Indicateurs clés du fonctionnement opérationnel.</p>
            </div>

            {/* Indicator row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-500 font-bold block uppercase">Missions effectives</span>
                <strong className="text-xl block text-slate-800">{completedMissions.length + activeMissions.length}</strong>
                <span className="text-[10px] text-slate-400 font-medium">{completedMissions.length} achevées / {activeMissions.length} en transit</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-500 font-bold block uppercase">Taux d'utilisation</span>
                <strong className="text-xl text-blue-700 block">
                  {vehicles.length > 0 ? Math.round((vehicles.filter(v => v.status === 'En mission').length / vehicles.length) * 100) : 0}%
                </strong>
                <span className="text-[10px] text-slate-400 font-medium">Proportion active sur route</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-500 font-bold block uppercase">Incidents / Atelier</span>
                <strong className="text-xl text-red-700 block">{maintenanceVehicles.length}</strong>
                <span className="text-[10px] text-slate-400 font-medium">Véhicules immobilisés à l'atelier</span>
              </div>
            </div>

            {/* List breakdown */}
            <div className="border border-slate-300">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th className="text-left">Statut Véhicules</th>
                    <th className="text-right w-24">Quantité</th>
                    <th className="text-right w-24">Proportion</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="font-semibold text-emerald-700">Disponibles / Prêts</td>
                    <td className="text-right font-bold">{availableVehicles.length}</td>
                    <td className="text-right font-mono text-slate-500">
                      {vehicles.length > 0 ? Math.round((availableVehicles.length / vehicles.length) * 100) : 0}%
                    </td>
                  </tr>
                  <tr>
                    <td className="font-semibold text-amber-700">En mission / Expédition</td>
                    <td className="text-right font-bold">{vehicles.filter(v => v.status === 'En mission').length}</td>
                    <td className="text-right font-mono text-slate-500">
                      {vehicles.length > 0 ? Math.round((vehicles.filter(v => v.status === 'En mission').length / vehicles.length) * 100) : 0}%
                    </td>
                  </tr>
                  <tr>
                    <td className="font-semibold text-rose-700">Maintenance / Immobilisés</td>
                    <td className="text-right font-bold">{maintenanceVehicles.length}</td>
                    <td className="text-right font-mono text-slate-500">
                      {vehicles.length > 0 ? Math.round((maintenanceVehicles.length / vehicles.length) * 100) : 0}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 2. Missions details table list */}
        {reportType === 'missions' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Rapport des Missions Logistiques</h2>
              <p className="text-[11px] text-slate-400">Historique et suivi des dossiers de transport.</p>
            </div>
            
            <div className="border border-slate-300">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th className="text-left w-28">Numéro</th>
                    <th className="text-left">Objet</th>
                    <th className="text-left">Véhicule</th>
                    <th className="text-left">Agent affecté</th>
                    <th className="text-left">Destination</th>
                    <th className="text-left w-24">Départ</th>
                    <th className="text-left w-24">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {missions.map(m => (
                    <tr key={m.id}>
                      <td className="font-mono font-bold text-slate-800">{m.num}</td>
                      <td>{m.purpose}</td>
                      <td className="font-mono text-xs">{getVehicleDesc(m.vehicleId)}</td>
                      <td>{getStaffName(m.personnelId)}</td>
                      <td>{m.destination}</td>
                      <td className="font-mono text-xs">{m.departureDate}</td>
                      <td>
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          m.status === 'Terminée' ? 'bg-emerald-100 text-emerald-800' :
                          m.status === 'En cours' ? 'bg-amber-100 text-amber-800' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {m.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. Available vehicles list */}
        {reportType === 'available' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Rapport des véhicules disponibles</h2>
              <p className="text-[11px] text-slate-400">Liste des matériels disponibles au dépôt central.</p>
            </div>
            
            <div className="border border-slate-300">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th className="text-left w-36">Immatriculation</th>
                    <th className="text-left">Constructeur & Modèle</th>
                    <th className="text-left">Type</th>
                    <th className="text-right w-32">Kilométrage</th>
                    <th className="text-left w-32">Dernier entretien</th>
                  </tr>
                </thead>
                <tbody>
                  {availableVehicles.map(v => (
                    <tr key={v.plate}>
                      <td className="font-mono font-bold text-slate-800">{v.plate}</td>
                      <td className="font-semibold">{v.brand} {v.model}</td>
                      <td>{VEHICLE_CATEGORY_LABELS[v.category] || v.category}</td>
                      <td className="text-right font-mono font-semibold">{v.mileage.toLocaleString()} km</td>
                      <td className="font-mono">{v.lastMaint || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {availableVehicles.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-6">Aucun véhicule disponible en dépôt.</p>
              )}
            </div>
          </div>
        )}

        {/* 4. In Maintenance vehicles list */}
        {reportType === 'maintenance' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Rapport des Véhicules Immobilisés (Atelier)</h2>
              <p className="text-[11px] text-slate-400">Inventaire des matériels actuellement en réparation ou entretien.</p>
            </div>
            
            <div className="border border-slate-300">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th className="text-left w-36">Immatriculation</th>
                    <th className="text-left">Véhicule</th>
                    <th className="text-left">Nature des pannes / Travaux</th>
                    <th className="text-left w-32">Prochain passage</th>
                    <th className="text-left">Observation</th>
                  </tr>
                </thead>
                <tbody>
                  {maintenanceVehicles.map(v => {
                    const activeAlert = maintenance.find(m => m.vehicleId === v.plate && m.status !== 'Terminée');
                    return (
                      <tr key={v.plate}>
                        <td className="font-mono font-bold text-slate-800">{v.plate}</td>
                        <td className="font-semibold">{v.brand} {v.model}</td>
                        <td className="text-rose-700 font-bold">{activeAlert ? activeAlert.desc : 'Visite de contrôle'}</td>
                        <td className="font-mono text-xs">{v.nextMaint || '-'}</td>
                        <td className="text-slate-500 font-medium text-xs">{v.notes || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {maintenanceVehicles.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-6">Aucun véhicule immobilisé en maintenance.</p>
              )}
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
