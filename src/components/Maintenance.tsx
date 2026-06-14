import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Plus, 
  Search, 
  Play, 
  Check 
} from 'lucide-react';
import Modal from './common/Modal';

export default function Maintenance() {
  const { 
    maintenance, 
    vehicles, 
    addNewMaintenance, 
    updateMaintenanceData, 
    canWrite 
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Sorting state
  const [sortField, setSortField] = useState('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Form states
  const [vehicleId, setVehicleId] = useState('');
  const [type, setType] = useState<'Préventive' | 'Corrective'>('Préventive');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [mileage, setMileage] = useState('');
  const [desc, setDesc] = useState('');

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleId || !mileage) return;

    await addNewMaintenance({
      vehicleId,
      type,
      date,
      mileage: parseInt(mileage) || 0,
      desc
    });

    setVehicleId('');
    setMileage('');
    setDesc('');
    setIsAddOpen(false);
  };

  const handleStartWork = async (id: string) => {
    await updateMaintenanceData(id, { status: 'En cours' });
  };

  const handleFinishWork = async (id: string) => {
    await updateMaintenanceData(id, { status: 'Terminée' });
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filter
  const filtered = maintenance.filter(m => {
    const v = vehicles.find(veh => veh.plate === m.vehicleId);
    const vName = v ? `${v.brand} ${v.model} ${v.plate}` : m.vehicleId;
    const matchesSearch = vName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          m.desc.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          m.type.toLowerCase().includes(searchTerm.toLowerCase());

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
          DOSSIERS DE MAINTENANCE ET INTERVENTIONS ATELIER
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
              placeholder="Rechercher par véhicule, description..."
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
              <option value="All">-- Toutes les interventions --</option>
              <option value="Prévue">Prévue</option>
              <option value="En cours">En cours</option>
              <option value="Terminée">Terminée</option>
            </select>
          </div>
        </div>

        {/* Add CTA */}
        {canWrite() && (
          <button 
            onClick={() => setIsAddOpen(true)}
            className="admin-btn admin-btn-primary font-bold text-xs"
          >
            <Plus size={14} className="mr-1" /> Planifier maintenance
          </button>
        )}
      </div>

      {/* Spreadsheet Table */}
      <div className="overflow-x-auto border border-slate-300 bg-white">
        <table className="admin-table min-w-full">
          <thead>
            <tr>
              <th onClick={() => handleSort('vehicleId')} className="cursor-pointer select-none text-left">
                Véhicule{getSortIcon('vehicleId')}
              </th>
              <th onClick={() => handleSort('desc')} className="cursor-pointer select-none text-left">
                Intervention / Description{getSortIcon('desc')}
              </th>
              <th onClick={() => handleSort('type')} className="cursor-pointer select-none text-left">
                Type{getSortIcon('type')}
              </th>
              <th onClick={() => handleSort('date')} className="cursor-pointer select-none text-left">
                Date{getSortIcon('date')}
              </th>
              <th onClick={() => handleSort('mileage')} className="cursor-pointer select-none text-right">
                Kilométrage{getSortIcon('mileage')}
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
                const isPlanned = m.status === 'Prévue';
                const isActive = m.status === 'En cours';

                return (
                  <tr key={m.id}>
                    <td className="font-bold text-slate-800">{getVehicleDesc(m.vehicleId)}</td>
                    <td className="font-medium text-slate-700">{m.desc}</td>
                    <td>
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        m.type === 'Préventive' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {m.type}
                      </span>
                    </td>
                    <td className="font-mono text-xs">{m.date}</td>
                    <td className="text-right font-mono font-semibold">{m.mileage.toLocaleString()} km</td>
                    <td>
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        isPlanned ? 'bg-slate-100 text-slate-650 border border-slate-300' :
                        isActive ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                        'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      }`}>
                        {m.status}
                      </span>
                    </td>
                    {canWrite() && (
                      <td className="text-center">
                        {isPlanned && (
                          <button
                            onClick={() => handleStartWork(m.id)}
                            className="admin-btn text-amber-700 font-bold text-[10px] py-1 px-2 hover:bg-amber-50"
                          >
                            <Play size={10} className="inline mr-1" fill="currentColor" /> DÉBUT TRAVAUX
                          </button>
                        )}
                        {isActive && (
                          <button
                            onClick={() => handleFinishWork(m.id)}
                            className="admin-btn text-emerald-700 font-bold text-[10px] py-1 px-2 hover:bg-emerald-50"
                          >
                            <Check size={10} className="inline mr-1" /> REÇU CONFORME
                          </button>
                        )}
                        {!isPlanned && !isActive && <span className="text-slate-400 text-xs">Clôturé</span>}
                      </td>
                    )}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={canWrite() ? 7 : 6} className="text-center text-slate-500 py-8">
                  Aucun dossier de maintenance enregistré.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Planifier une intervention">
        <form onSubmit={handleAddSubmit} className="space-y-3">
          <div>
            <label className="admin-label">Véhicule concerné *</label>
            <select 
              className="admin-input"
              required
              value={vehicleId}
              onChange={e => setVehicleId(e.target.value)}
            >
              <option value="">-- Sélectionner --</option>
              {vehicles.map(v => (
                <option key={v.plate} value={v.plate}>{v.brand} {v.model} ({v.plate}) - {v.status}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="admin-label">Type d'entretien</label>
              <select 
                className="admin-input"
                value={type}
                onChange={e => setType(e.target.value as any)}
              >
                <option value="Préventive">Préventive (Révision, Vidange...)</option>
                <option value="Corrective">Corrective (Panne, Réparation...)</option>
              </select>
            </div>
            
            <div>
              <label className="admin-label">Date d'intervention</label>
              <input 
                type="date" 
                className="admin-input"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="admin-label">Kilométrage actuel (km) *</label>
            <input 
              type="number" 
              required
              placeholder="e.g. 124000"
              className="admin-input"
              value={mileage}
              onChange={e => setMileage(e.target.value)}
            />
          </div>

          <div>
            <label className="admin-label">Description courte *</label>
            <textarea 
              required
              placeholder="e.g. Remplacement disques et plaquettes avant."
              className="admin-input min-h-[50px] font-sans"
              value={desc}
              onChange={e => setDesc(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <button type="button" onClick={() => setIsAddOpen(false)} className="admin-btn">Annuler</button>
            <button type="submit" className="admin-btn admin-btn-primary">Planifier l'intervention</button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
