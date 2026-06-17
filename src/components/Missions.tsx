import React, { useState } from 'react';
import { ImportButton } from './ImportButton';
import { useApp } from '../context/AppContext';
import { 
  Plus, 
  Search, 
  Play,
  CheckCircle
} from 'lucide-react';
import Modal from './common/Modal';
import { MOROCCAN_CITIES } from '../models/Cities';
import { isLicenceValid, VEHICLE_REQUIRED_LICENCE } from '../models/Vehicle';

export default function Missions() {
  const { 
    missions, 
    vehicles, 
    personnel, 
    addNewMission, 
    updateMissionData, 
    closeMissionData,
    canWrite 
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  // Sorting state
  const [sortField, setSortField] = useState('num');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isCloseOpen, setIsCloseOpen] = useState(false);
  const [closingMissionId, setClosingMissionId] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [personnelId, setPersonnelId] = useState('');
  const [service, setService] = useState('Logistique');
  const [depDate, setDepDate] = useState(new Date().toISOString().split('T')[0]);
  const [retDate, setRetDate] = useState(new Date(Date.now() + 24 * 3600000).toISOString().split('T')[0]);
  const [depPlace, setDepPlace] = useState('Dépôt Central');
  const [dest, setDest] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [customDest, setCustomDest] = useState('');
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState('');

  // Close mission form states
  const [odometer, setOdometer] = useState('');
  const [closeStatus, setCloseStatus] = useState<'Terminée' | 'Annulée'>('Terminée');
  const [closeNotes, setCloseNotes] = useState('');

  // Dropdown options
  const availableVehicles = vehicles.filter(v => v.status === 'Disponible');
  const availableStaff = personnel.filter(p => p.status === 'Présent');

  // Filter staff by selected vehicle's licence category
  const selectedVehicle = vehicles.find(v => v.plate === vehicleId);
  const eligibleStaff = availableStaff.filter(p => {
    if (!selectedVehicle) return true;
    return isLicenceValid(p.licenceCategories, selectedVehicle.category);
  });

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');

    if (!title || !vehicleId || !personnelId || !dest) {
      setErr("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    const selectedDriver = personnel.find(p => p.id === personnelId);
    if (selectedVehicle && selectedDriver) {
      if (!isLicenceValid(selectedDriver.licenceCategories, selectedVehicle.category)) {
        const reqLic = VEHICLE_REQUIRED_LICENCE[selectedVehicle.category];
        setErr(`L'agent sélectionné ne possède pas le permis requis (${reqLic}) pour conduire ce véhicule.`);
        return;
      }
    }

    try {
      await addNewMission({
        purpose: title,
        vehicleId,
        personnelId,
        service,
        departureDate: depDate,
        returnDatePlanned: retDate,
        departurePlace: depPlace,
        destination: dest,
        notes
      });

      // Reset
      setTitle('');
      setVehicleId('');
      setPersonnelId('');
      setDest('');
      setSelectedCity('');
      setCustomDest('');
      setNotes('');
      setIsAddOpen(false);
    } catch (err) {
      setErr("Une erreur est survenue.");
    }
  };

  const handleStartMission = async (id: string) => {
    await updateMissionData(id, { status: 'En cours' });
  };

  const triggerCloseModal = (id: string) => {
    setClosingMissionId(id);
    const m = missions.find(x => x.id === id);
    const v = vehicles.find(x => x.plate === m?.vehicleId);
    setOdometer(v ? v.mileage.toString() : '');
    setCloseNotes('');
    setCloseStatus('Terminée');
    setIsCloseOpen(true);
  };

  const handleCloseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!closingMissionId || !odometer) return;

    const returnMileage = parseInt(odometer);
    const activeMiss = missions.find(x => x.id === closingMissionId);
    if (!activeMiss) return;

    const v = vehicles.find(x => x.plate === activeMiss.vehicleId);
    const initialMileage = v ? v.mileage : 0;

    if (returnMileage < initialMileage) {
      setErr(`Le kilométrage de retour (${returnMileage}) ne peut pas être inférieur au kilométrage de départ (${initialMileage}).`);
      return;
    }

    await closeMissionData(closingMissionId, returnMileage, closeStatus, closeNotes);
    setIsCloseOpen(false);
    setClosingMissionId(null);
    setErr('');
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filter & Search
  const filtered = missions.filter(m => {
    const v = vehicles.find(veh => veh.plate === m.vehicleId);
    const vDesc = v ? `${v.brand} ${v.model} ${v.plate}` : m.vehicleId;
    const matchesSearch = vDesc.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          m.service.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          m.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          m.purpose.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          m.num.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (statusFilter === 'All') return matchesSearch;
    return matchesSearch && m.status === statusFilter;
  });

  // Sort
  const sorted = [...filtered].sort((a: any, b: any) => {
    let aVal = a[sortField];
    let bVal = b[sortField];

    if (aVal === undefined || aVal === null) aVal = '';
    if (bVal === undefined || bVal === null) bVal = '';

    if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const getStaffName = (id: string) => {
    const s = personnel.find(p => p.id === id);
    return s ? `${s.grade} ${s.lastname} ${s.firstname}` : 'Inconnu';
  };

  const getVehicleDesc = (plate: string) => {
    const v = vehicles.find(veh => veh.plate === plate);
    return v ? `${v.brand} ${v.model} (${plate})` : plate;
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) return '';
    return sortDirection === 'asc' ? ' ▲' : ' ▼';
  };

  return (
    <div className="space-y-4">
      
      {/* Title */}
      <div className="border-b border-slate-300 pb-2">
        <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight">
          MANIFESTE DE TRANSPORT - RAPPORTS DE MISSIONS
        </h2>
      </div>

      {/* Roster Filters Bar */}
      <div className="bg-white border border-slate-300 p-3 flex flex-col md:flex-row md:justify-between md:items-center gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Keyword Search */}
          <div className="relative flex items-center">
            <Search className="absolute left-2.5 text-slate-400" size={14} />
            <input 
              type="text" 
              placeholder="Rechercher par véhicule, numéro..."
              className="admin-input pl-8 w-60"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Status select filter */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Statut :</span>
            <select
              className="admin-input py-1 px-2 text-xs w-44"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="All">-- Toutes les missions --</option>
              <option value="Planifiée">Planifiée</option>
              <option value="En cours">En cours</option>
              <option value="Terminée">Terminée</option>
              <option value="Annulée">Annulée</option>
            </select>
          </div>
        </div>

        {/* Add CTA */}
        {canWrite() && (
          <div className="flex items-center gap-2">
            <ImportButton label="Importer les missions" />
            <button 
              onClick={() => setIsAddOpen(true)}
              className="admin-btn admin-btn-primary font-bold text-xs"
            >
              <Plus size={14} className="mr-1" /> Lancer une mission
            </button>
          </div>
        )}
      </div>

      {/* Spreadsheet Table */}
      <div className="overflow-x-auto border border-slate-300 bg-white">
        <table className="admin-table min-w-full">
          <thead>
            <tr>
              <th onClick={() => handleSort('num')} className="cursor-pointer select-none text-left">
                N° Mission{getSortIcon('num')}
              </th>
              <th onClick={() => handleSort('purpose')} className="cursor-pointer select-none text-left">
                Objet / Purpose{getSortIcon('purpose')}
              </th>
              <th onClick={() => handleSort('departurePlace')} className="cursor-pointer select-none text-left">
                Lieu Départ{getSortIcon('departurePlace')}
              </th>
              <th onClick={() => handleSort('destination')} className="cursor-pointer select-none text-left">
                Destination{getSortIcon('destination')}
              </th>
              <th onClick={() => handleSort('vehicleId')} className="cursor-pointer select-none text-left">
                Véhicule{getSortIcon('vehicleId')}
              </th>
              <th onClick={() => handleSort('personnelId')} className="cursor-pointer select-none text-left">
                Chauffeur{getSortIcon('personnelId')}
              </th>
              <th onClick={() => handleSort('departureDate')} className="cursor-pointer select-none text-left">
                Date Départ{getSortIcon('departureDate')}
              </th>
              <th onClick={() => handleSort('returnDatePlanned')} className="cursor-pointer select-none text-left">
                Retour Prévu{getSortIcon('returnDatePlanned')}
              </th>
              <th onClick={() => handleSort('status')} className="cursor-pointer select-none text-left w-32">
                Statut{getSortIcon('status')}
              </th>
              {canWrite() && <th className="text-center w-36">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {sorted.length > 0 ? (
              sorted.map(m => {
                const isPending = m.status === 'Planifiée';
                const isActive = m.status === 'En cours';

                return (
                  <tr key={m.id}>
                    <td className="font-mono font-bold text-slate-800">{m.num}</td>
                    <td>
                      <div className="font-semibold text-slate-800">{m.purpose}</div>
                      <div className="text-[10px] text-slate-400">Service : {m.service}</div>
                      {m.notes && <div className="text-[10px] text-slate-500 italic mt-0.5">Obs: {m.notes}</div>}
                    </td>
                    <td>{m.departurePlace}</td>
                    <td className="font-semibold">{m.destination}</td>
                    <td className="font-mono text-xs text-slate-700">{getVehicleDesc(m.vehicleId)}</td>
                    <td>{getStaffName(m.personnelId)}</td>
                    <td>{m.departureDate}</td>
                    <td>{m.returnDatePlanned}</td>
                    <td>
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        m.status === 'Planifiée' ? 'bg-slate-100 text-slate-600 border border-slate-300' :
                        m.status === 'En cours' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                        m.status === 'Terminée' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                        'bg-rose-100 text-rose-800 border border-rose-300'
                      }`}>
                        {m.status}
                      </span>
                    </td>
                    {canWrite() && (
                      <td className="text-center">
                        {isPending && (
                          <button
                            onClick={() => handleStartMission(m.id)}
                            className="admin-btn text-amber-700 font-bold text-[10px] py-1 px-2 hover:bg-amber-50"
                          >
                            <Play size={10} className="inline mr-1" fill="currentColor" /> DÉMARRER
                          </button>
                        )}
                        {isActive && (
                          <button
                            onClick={() => triggerCloseModal(m.id)}
                            className="admin-btn text-emerald-700 font-bold text-[10px] py-1 px-2 hover:bg-emerald-50"
                          >
                            <CheckCircle size={10} className="inline mr-1" /> CLÔTURER
                          </button>
                        )}
                        {!isPending && !isActive && <span className="text-slate-400 text-xs">-</span>}
                      </td>
                    )}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={canWrite() ? 10 : 9} className="text-center text-slate-500 py-8">
                  Aucun transport enregistré.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Dispatch Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Lancer une mission">
        <form onSubmit={handleAddSubmit} className="space-y-3">
          {err && (
            <div className="p-2 bg-rose-50 border border-rose-200 text-rose-600 text-xs rounded">
              {err}
            </div>
          )}

          <div>
            <label className="admin-label">Objet de la mission *</label>
            <input 
              type="text" 
              placeholder="e.g. Transport de transformateur haute tension"
              className="admin-input" 
              required
              value={title}
              onChange={e => { setTitle(e.target.value); setErr(''); }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="admin-label">Lieu de départ</label>
              <input 
                type="text" 
                className="admin-input"
                value={depPlace}
                onChange={e => setDepPlace(e.target.value)}
              />
            </div>
            <div>
              <label className="admin-label">Destination *</label>
              <select 
                className="admin-input"
                required
                value={selectedCity}
                onChange={e => {
                  const val = e.target.value;
                  setSelectedCity(val);
                  if (val === '__custom__') {
                    setDest(customDest);
                  } else {
                    setDest(val);
                  }
                }}
              >
                <option value="">-- Choisir une ville --</option>
                {MOROCCAN_CITIES.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
                <option value="__custom__">-- Autre (Saisie manuellement) --</option>
              </select>

              {selectedCity === '__custom__' && (
                <div className="mt-2 animate-fadeIn">
                  <input 
                    type="text" 
                    placeholder="Saisir la destination (ex: Dépôt de Casablanca)"
                    className="admin-input" 
                    required
                    value={customDest}
                    onChange={e => {
                      setCustomDest(e.target.value);
                      setDest(e.target.value);
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="admin-label">Date de départ</label>
              <input 
                type="date" 
                className="admin-input"
                value={depDate}
                onChange={e => setDepDate(e.target.value)}
              />
            </div>
            <div>
              <label className="admin-label">Date de retour prévue</label>
              <input 
                type="date" 
                className="admin-input"
                value={retDate}
                onChange={e => setRetDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="admin-label">Véhicule Disponible *</label>
              <select 
                className="admin-input"
                required
                value={vehicleId}
                onChange={e => { setVehicleId(e.target.value); setPersonnelId(''); setErr(''); }}
              >
                <option value="">-- Choisir --</option>
                {availableVehicles.map(v => (
                  <option key={v.plate} value={v.plate}>{v.brand} {v.model} ({v.plate})</option>
                ))}
              </select>
              {availableVehicles.length === 0 && (
                <span className="text-[10px] text-rose-500 mt-1 block">Aucun véhicule dispo !</span>
              )}
            </div>

            <div>
              <label className="admin-label">Agent Habilité *</label>
              <select 
                className="admin-input"
                required
                value={personnelId}
                onChange={e => setPersonnelId(e.target.value)}
              >
                <option value="">-- Choisir --</option>
                {eligibleStaff.map(p => (
                  <option key={p.id} value={p.id}>{p.grade} {p.lastname} {p.firstname} (Permis: {p.licenceCategories?.join(', ') || 'aucun'})</option>
                ))}
              </select>
              {availableStaff.length === 0 ? (
                <span className="text-[10px] text-rose-500 mt-1 block">Aucun agent disponible !</span>
              ) : selectedVehicle && eligibleStaff.length === 0 ? (
                <span className="text-[10px] text-rose-500 mt-1 block font-bold animate-pulse">
                  ⚠ Aucun agent disponible ne possède le permis {VEHICLE_REQUIRED_LICENCE[selectedVehicle.category]} requis !
                </span>
              ) : null}
            </div>
          </div>

          <div>
            <label className="admin-label">Unité / Service Concerné</label>
            <select 
              className="admin-input"
              value={service}
              onChange={e => setService(e.target.value)}
            >
              <option value="Logistique">Logistique</option>
              <option value="Exploitation">Exploitation</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Administration">Administration</option>
            </select>
          </div>

          <div>
            <label className="admin-label">Observations / Consignes</label>
            <textarea 
              placeholder="e.g. Vérifier le serrage des sangles à mi-parcours." 
              className="admin-input min-h-[50px] font-sans"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <button type="button" onClick={() => setIsAddOpen(false)} className="admin-btn">Annuler</button>
            <button 
              type="submit" 
              className="admin-btn admin-btn-primary" 
              disabled={availableVehicles.length === 0 || eligibleStaff.length === 0}
            >
              Enregistrer la mission
            </button>
          </div>
        </form>
      </Modal>

      {/* Close Mission Modal */}
      <Modal isOpen={isCloseOpen} onClose={() => { setIsCloseOpen(false); setClosingMissionId(null); setErr(''); }} title="Clôturer le transport">
        <form onSubmit={handleCloseSubmit} className="space-y-3">
          
          {err && (
            <div className="p-2 bg-rose-50 border border-rose-200 text-rose-600 text-xs rounded">
              {err}
            </div>
          )}

          <div>
            <label className="admin-label">Kilométrage Odomètre de retour *</label>
            <input 
              type="number" 
              required
              placeholder="Saisir index du compteur"
              className="admin-input"
              value={odometer}
              onChange={e => { setOdometer(e.target.value); setErr(''); }}
            />
            <span className="text-[10px] text-gray-500 mt-1 block">
              Saisir l'odomètre réel du véhicule à son retour au dépôt.
            </span>
          </div>

          <div>
            <label className="admin-label">Statut Final</label>
            <select 
              className="admin-input"
              value={closeStatus}
              onChange={e => setCloseStatus(e.target.value as any)}
            >
              <option value="Terminée">Terminée avec succès</option>
              <option value="Annulée">Annulée en cours de route</option>
            </select>
          </div>

          <div>
            <label className="admin-label">Rapport de clôture (Observations)</label>
            <textarea 
              placeholder="e.g. Transport sans encombres. Véhicule garé allée B." 
              className="admin-input min-h-[50px] font-sans"
              value={closeNotes}
              onChange={e => setCloseNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <button type="button" onClick={() => { setIsCloseOpen(false); setClosingMissionId(null); setErr(''); }} className="admin-btn">
              Annuler
            </button>
            <button type="submit" className="admin-btn admin-btn-primary">
              Valider la clôture du dossier
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
