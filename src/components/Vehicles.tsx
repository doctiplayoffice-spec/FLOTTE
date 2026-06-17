import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ImportButton } from './ImportButton';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit2
} from 'lucide-react';
import Modal from './common/Modal';
import { VehicleCategory, VEHICLE_CATEGORY_LABELS, VehicleStatus, Vehicle } from '../models/Vehicle';

export default function Vehicles() {
  const { 
    vehicles, 
    addNewVehicle, 
    updateVehicleData, 
    removeVehicle, 
    canWrite, 
    canDelete 
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  
  // Sorting state
  const [sortField, setSortField] = useState('plate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<any>(null);

  // Form states
  const [plate, setPlate] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [category, setCategory] = useState<VehicleCategory>('VL');
  const [mileage, setMileage] = useState('');
  const [lastMaint, setLastMaint] = useState('');
  const [nextMaint, setNextMaint] = useState('');
  const [nextInspection, setNextInspection] = useState('');
  const [insuranceExpiry, setInsuranceExpiry] = useState('');
  const [nextMaintMileage, setNextMaintMileage] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<VehicleStatus>('Disponible');
  const [motif, setMotif] = useState('');

  // Handle addition
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plate || !brand || !model) return;

    await addNewVehicle({
      plate: plate.toUpperCase().trim(),
      brand,
      model,
      category,
      mileage: parseInt(mileage) || 0,
      lastMaint: lastMaint || new Date().toISOString().split('T')[0],
      nextMaint: nextMaint || new Date(Date.now() + 180 * 24 * 3600000).toISOString().split('T')[0],
      notes,
      nextInspection: nextInspection || new Date(Date.now() + 365 * 24 * 3600000).toISOString().split('T')[0],
      insuranceExpiry: insuranceExpiry || new Date(Date.now() + 365 * 24 * 3600000).toISOString().split('T')[0],
      nextMaintMileage: parseInt(nextMaintMileage) || (parseInt(mileage) || 0) + 10000,
      statusChangedDate: new Date().toISOString().split('T')[0]
    });

    // Reset
    setPlate('');
    setBrand('');
    setModel('');
    setMileage('');
    setLastMaint('');
    setNextMaint('');
    setNotes('');
    setNextInspection('');
    setInsuranceExpiry('');
    setNextMaintMileage('');
    setCategory('VL');
    setIsAddOpen(false);
  };

  // Open edit modal
  const startEdit = (v: any) => {
    setEditingVehicle(v);
    setPlate(v.plate);
    setBrand(v.brand);
    setModel(v.model);
    setCategory(v.category);
    setMileage(v.mileage.toString());
    setLastMaint(v.lastMaint || '');
    setNextMaint(v.nextMaint || '');
    setNotes(v.notes || '');
    setNextInspection(v.nextInspection || '');
    setInsuranceExpiry(v.insuranceExpiry || '');
    setNextMaintMileage(v.nextMaintMileage ? v.nextMaintMileage.toString() : '');
    setStatus(v.status || 'Disponible');
    setMotif(v.motif || '');
    setIsEditOpen(true);
  };

  // Handle edit submission
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVehicle) return;

    await updateVehicleData(editingVehicle.plate, {
      brand,
      model,
      category,
      mileage: parseInt(mileage) || 0,
      lastMaint,
      nextMaint,
      notes,
      nextInspection,
      insuranceExpiry,
      nextMaintMileage: parseInt(nextMaintMileage) || 0,
      status,
      motif: status !== 'Disponible' ? motif : ''
    });

    setIsEditOpen(false);
    setEditingVehicle(null);
    setNextInspection('');
    setInsuranceExpiry('');
    setNextMaintMileage('');
    setMotif('');
  };

  // Handle Column Header click
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filter
  const filtered = vehicles.filter(v => {
    const matchesSearch = v.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          v.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          v.model.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || v.status === statusFilter;
    const matchesCategory = categoryFilter === 'All' || v.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
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

  const getSortIcon = (field: string) => {
    if (sortField !== field) return '';
    return sortDirection === 'asc' ? ' ▲' : ' ▼';
  };

  return (
    <div className="space-y-4">
      
      {/* Title */}
      <div className="border-b border-slate-300 pb-2">
        <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight">
          INVENTAIRE DES VÉHICULES - FEUILLE DE SUIVI
        </h2>
      </div>

      {/* Search & Filters Controls */}
      <div className="bg-white border border-slate-300 p-3 flex flex-col md:flex-row md:justify-between md:items-center gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Keyword Search */}
          <div className="relative flex items-center">
            <Search className="absolute left-2.5 text-slate-400" size={14} />
            <input 
              type="text" 
              placeholder="Recherche (immat, marque)..."
              className="admin-input pl-8 w-60"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Status Select Filter */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Statut :</span>
            <select
              className="admin-input py-1 px-2 text-xs w-36"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="All">-- Tous les statuts --</option>
              <option value="Disponible">Disponible</option>
              <option value="En mission">En mission</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Panne">Panne</option>
            </select>
          </div>

          {/* Category Select Filter */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Catégorie :</span>
            <select
              className="admin-input py-1 px-2 text-xs w-44"
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
            >
              <option value="All">-- Toutes les catégories --</option>
              {(['VL', 'PL', 'SR', 'TC', 'PC', 'RE'] as VehicleCategory[]).map(cat => (
                <option key={cat} value={cat}>{VEHICLE_CATEGORY_LABELS[cat]}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Button */}
        {canWrite() && (
          <div className="flex items-center gap-2">
            <ImportButton label="Importer les véhicules" />
            <button 
              onClick={() => setIsAddOpen(true)}
              className="admin-btn admin-btn-primary font-bold text-xs"
            >
              <Plus size={14} className="mr-1" /> Ajouter véhicule
            </button>
          </div>
        )}
      </div>

      {/* Spreadsheet Table */}
      <div className="overflow-x-auto border border-slate-300 bg-white">
        <table className="admin-table min-w-full">
          <thead>
            <tr>
              <th onClick={() => handleSort('plate')} className="cursor-pointer select-none text-left w-24">
                Plaque{getSortIcon('plate')}
              </th>
              <th onClick={() => handleSort('brand')} className="cursor-pointer select-none text-left">
                Marque / Modèle{getSortIcon('brand')}
              </th>
              <th onClick={() => handleSort('category')} className="cursor-pointer select-none text-left">
                Catégorie{getSortIcon('category')}
              </th>
              <th onClick={() => handleSort('mileage')} className="cursor-pointer select-none text-right">
                Kilométrage{getSortIcon('mileage')}
              </th>
              <th onClick={() => handleSort('lastMaint')} className="cursor-pointer select-none text-left">
                Dernière maint.{getSortIcon('lastMaint')}
              </th>
              <th onClick={() => handleSort('nextMaint')} className="cursor-pointer select-none text-left">
                Prochaine maint.{getSortIcon('nextMaint')}
              </th>
              <th onClick={() => handleSort('nextInspection')} className="cursor-pointer select-none text-left">
                Visite Tech.{getSortIcon('nextInspection')}
              </th>
              <th onClick={() => handleSort('insuranceExpiry')} className="cursor-pointer select-none text-left">
                Assurance{getSortIcon('insuranceExpiry')}
              </th>
              <th onClick={() => handleSort('status')} className="cursor-pointer select-none text-left w-36">
                Statut{getSortIcon('status')}
              </th>
              {canWrite() && <th className="text-center w-28">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {sorted.length > 0 ? (
              sorted.map((v: Vehicle) => (
                <tr key={v.plate}>
                  <td className="font-mono font-bold text-slate-900">{v.plate}</td>
                  <td>
                    <div className="font-semibold text-slate-800">{v.brand} {v.model}</div>
                    {v.notes && <div className="text-[10px] text-slate-400 italic font-normal">Obs: {v.notes}</div>}
                  </td>
                  <td>{VEHICLE_CATEGORY_LABELS[v.category] || v.category}</td>
                  <td className="text-right font-mono font-semibold">{v.mileage.toLocaleString()} km</td>
                  <td>{v.lastMaint || '-'}</td>
                  <td>
                    <div>{v.nextMaint || '-'}</div>
                    {v.nextMaintMileage && (
                      <div className="text-[10px] text-slate-400 font-mono">({v.nextMaintMileage.toLocaleString()} km)</div>
                    )}
                  </td>
                  <td>{v.nextInspection || '-'}</td>
                  <td>{v.insuranceExpiry || '-'}</td>
                  <td>
                    {/* Inline instant status selector (1-2 clicks modification) */}
                    <select
                      value={v.status}
                      disabled={!canWrite()}
                      onChange={async (e) => {
                        const newStatus = e.target.value as VehicleStatus;
                        let newMotif = v.motif || '';
                        if (newStatus !== 'Disponible') {
                          const m = prompt(`Veuillez entrer le motif pour le statut "${newStatus}" :`, v.motif || '');
                          if (m === null) return; // cancel click
                          newMotif = m;
                        } else {
                          newMotif = '';
                        }
                        await updateVehicleData(v.plate, { status: newStatus, motif: newMotif });
                      }}
                      className={`text-xs font-bold py-1 px-1.5 border border-slate-350 outline-none w-full rounded-sm ${
                        v.status === 'Disponible' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                        v.status === 'En mission' ? 'bg-amber-100 text-amber-800 bg-amber-50 border-amber-300' :
                        v.status === 'Maintenance' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                        'bg-red-750 text-white font-bold border-red-800' /* Panne */
                      }`}
                    >
                      <option value="Disponible">Disponible</option>
                      <option value="En mission">En mission</option>
                      <option value="Maintenance">Maintenance</option>
                      <option value="Panne">Panne</option>
                    </select>
                    {v.status !== 'Disponible' && v.motif && (
                      <div className="text-[10px] text-slate-500 italic mt-0.5 max-w-[150px] truncate" title={v.motif}>
                        Motif : {v.motif}
                      </div>
                    )}
                  </td>
                  {canWrite() && (
                    <td className="text-center">
                      <div className="inline-flex gap-1">
                        <button 
                          onClick={() => startEdit(v)}
                          title="Modifier"
                          className="admin-btn p-1 text-blue-700 hover:bg-slate-200"
                        >
                          <Edit2 size={12} />
                        </button>
                        {canDelete() && (
                          <button 
                            onClick={async () => {
                              if (confirm(`Confirmer la suppression du véhicule ${v.plate} ?`)) {
                                  await removeVehicle(v.plate);
                              }
                            }}
                            title="Supprimer"
                            className="admin-btn p-1 text-red-700 hover:bg-red-50"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={canWrite() ? 10 : 9} className="text-center text-slate-500 py-8">
                  Aucun véhicule ne correspond aux critères de recherche.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Ajouter un véhicule">
        <form onSubmit={handleAddSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="admin-label">Plaque d'Immatriculation *</label>
              <input 
                type="text" 
                required 
                placeholder="e.g. 12345-A-6" 
                className="admin-input"
                value={plate}
                onChange={e => setPlate(e.target.value)}
              />
            </div>
            <div>
              <label className="admin-label">Catégorie</label>
              <select 
                className="admin-input"
                value={category}
                onChange={e => setCategory(e.target.value as VehicleCategory)}
              >
                {(Object.keys(VEHICLE_CATEGORY_LABELS) as VehicleCategory[]).map(cat => (
                  <option key={cat} value={cat}>{VEHICLE_CATEGORY_LABELS[cat]}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="admin-label">Marque *</label>
              <input 
                type="text" 
                required 
                placeholder="e.g. Renault" 
                className="admin-input"
                value={brand}
                onChange={e => setBrand(e.target.value)}
              />
            </div>
            <div>
              <label className="admin-label">Modèle *</label>
              <input 
                type="text" 
                required 
                placeholder="e.g. Master" 
                className="admin-input"
                value={model}
                onChange={e => setModel(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="admin-label">Kilométrage Actuel (km)</label>
            <input 
              type="number" 
              placeholder="e.g. 150000" 
              className="admin-input"
              value={mileage}
              onChange={e => setMileage(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="admin-label">Dernier entretien</label>
              <input 
                type="date" 
                className="admin-input"
                value={lastMaint}
                onChange={e => setLastMaint(e.target.value)}
              />
            </div>
            <div>
              <label className="admin-label">Prochain entretien</label>
              <input 
                type="date" 
                className="admin-input"
                value={nextMaint}
                onChange={e => setNextMaint(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="admin-label">Date visite technique</label>
              <input 
                type="date" 
                className="admin-input"
                value={nextInspection}
                onChange={e => setNextInspection(e.target.value)}
              />
            </div>
            <div>
              <label className="admin-label">Expiration assurance</label>
              <input 
                type="date" 
                className="admin-input"
                value={insuranceExpiry}
                onChange={e => setInsuranceExpiry(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="admin-label">Kilométrage prochain entretien (km)</label>
            <input 
              type="number" 
              placeholder="e.g. 160000" 
              className="admin-input"
              value={nextMaintMileage}
              onChange={e => setNextMaintMileage(e.target.value)}
            />
          </div>

          <div>
            <label className="admin-label">Observation / Notes</label>
            <textarea 
              placeholder="e.g. Aucun défaut mécanique majeur." 
              className="admin-input min-h-[50px] font-sans"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setIsAddOpen(false)} className="admin-btn">Annuler</button>
            <button type="submit" className="admin-btn admin-btn-primary">Valider l'ajout</button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={isEditOpen} onClose={() => { setIsEditOpen(false); setEditingVehicle(null); }} title="Modifier le véhicule">
        <form onSubmit={handleEditSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="admin-label">Immatriculation (non modifiable)</label>
              <input 
                type="text" 
                disabled 
                className="admin-input bg-slate-100 cursor-not-allowed text-slate-500"
                value={plate}
              />
            </div>
            <div>
              <label className="admin-label">Catégorie</label>
              <select 
                className="admin-input"
                value={category}
                onChange={e => setCategory(e.target.value as VehicleCategory)}
              >
                {(Object.keys(VEHICLE_CATEGORY_LABELS) as VehicleCategory[]).map(cat => (
                  <option key={cat} value={cat}>{VEHICLE_CATEGORY_LABELS[cat]}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="admin-label">Marque *</label>
              <input 
                type="text" 
                required 
                className="admin-input"
                value={brand}
                onChange={e => setBrand(e.target.value)}
              />
            </div>
            <div>
              <label className="admin-label">Modèle *</label>
              <input 
                type="text" 
                required 
                className="admin-input"
                value={model}
                onChange={e => setModel(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="admin-label">Statut</label>
              <select 
                className="admin-input"
                value={status}
                onChange={e => setStatus(e.target.value as VehicleStatus)}
              >
                <option value="Disponible">Disponible</option>
                <option value="En mission">En mission</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Panne">Panne</option>
              </select>
            </div>
            <div>
              <label className="admin-label">Kilométrage (km)</label>
              <input 
                type="number" 
                className="admin-input"
                value={mileage}
                onChange={e => setMileage(e.target.value)}
              />
            </div>
          </div>

          {status !== 'Disponible' && (
            <div>
              <label className="admin-label">Motif d'indisponibilité *</label>
              <input 
                type="text" 
                required
                placeholder="Indiquer la raison (ex: Alternateur défectueux...)"
                className="admin-input"
                value={motif}
                onChange={e => setMotif(e.target.value)}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="admin-label">Dernier entretien</label>
              <input 
                type="date" 
                className="admin-input"
                value={lastMaint}
                onChange={e => setLastMaint(e.target.value)}
              />
            </div>
            <div>
              <label className="admin-label">Prochain entretien</label>
              <input 
                type="date" 
                className="admin-input"
                value={nextMaint}
                onChange={e => setNextMaint(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="admin-label">Date visite technique</label>
              <input 
                type="date" 
                className="admin-input"
                value={nextInspection}
                onChange={e => setNextInspection(e.target.value)}
              />
            </div>
            <div>
              <label className="admin-label">Expiration assurance</label>
              <input 
                type="date" 
                className="admin-input"
                value={insuranceExpiry}
                onChange={e => setInsuranceExpiry(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="admin-label">Kilométrage prochain entretien (km)</label>
            <input 
              type="number" 
              className="admin-input"
              value={nextMaintMileage}
              onChange={e => setNextMaintMileage(e.target.value)}
            />
          </div>

          <div>
            <label className="admin-label">Observation / Notes</label>
            <textarea 
              className="admin-input min-h-[50px] font-sans"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => { setIsEditOpen(false); setEditingVehicle(null); }} className="admin-btn">Annuler</button>
            <button type="submit" className="admin-btn admin-btn-primary">Valider les modifications</button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
