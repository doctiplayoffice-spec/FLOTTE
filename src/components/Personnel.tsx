import React, { useState } from 'react';
import { ImportButton } from './ImportButton';
import { useApp } from '../context/AppContext';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit2
} from 'lucide-react';
import Modal from './common/Modal';
import { Grade, GRADES_RANKS, GRADES_OFFICERS, PersonnelStatus, LicenceCategory, LICENCE_CATEGORY_LABELS } from '../models/Personnel';

export default function PersonnelComponent() {
  const { 
    personnel, 
    addNewStaff, 
    updateStaffData, 
    removeStaff, 
    canWrite, 
    canDelete 
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  // Sorting state
  const [sortField, setSortField] = useState('lastname');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);

  // Form states
  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [service, setService] = useState('Logistique');
  const [matricule, setMatricule] = useState('');
  const [grade, setGrade] = useState<Grade>('Soldat 2e classe');
  const [licenceCategories, setLicenceCategories] = useState<LicenceCategory[]>([]);
  const [licenceExpiry, setLicenceExpiry] = useState('');
  const [status, setStatus] = useState<PersonnelStatus>('Présent');
  const [statusEndDate, setStatusEndDate] = useState('');
  const [notes, setNotes] = useState('');

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstname || !lastname || !matricule || !grade) return;

    await addNewStaff({
      firstname,
      lastname,
      service,
      matricule: matricule.toUpperCase().trim(),
      grade,
      licenceCategories,
      licenceExpiry: licenceExpiry || undefined,
      statusEndDate: statusEndDate || undefined,
      notes: notes || undefined
    });

    setFirstname('');
    setLastname('');
    setMatricule('');
    setGrade('Soldat 2e classe');
    setLicenceCategories([]);
    setLicenceExpiry('');
    setStatusEndDate('');
    setNotes('');
    setIsAddOpen(false);
  };

  const startEdit = (s: any) => {
    setEditingStaff(s);
    setFirstname(s.firstname);
    setLastname(s.lastname);
    setService(s.service);
    setMatricule(s.matricule || '');
    setGrade(s.grade || 'Soldat 2e classe');
    setLicenceCategories(s.licenceCategories || []);
    setLicenceExpiry(s.licenceExpiry || '');
    setStatus(s.status || 'Présent');
    setStatusEndDate(s.statusEndDate || '');
    setNotes(s.notes || '');
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;

    await updateStaffData(editingStaff.id, {
      firstname,
      lastname,
      service,
      matricule: matricule.toUpperCase().trim(),
      grade,
      licenceCategories,
      licenceExpiry: licenceExpiry || undefined,
      status,
      statusEndDate: (status === 'Présent' || status === 'En mission') ? undefined : (statusEndDate || undefined),
      notes: notes || undefined
    });

    setIsEditOpen(false);
    setEditingStaff(null);
    setLicenceCategories([]);
    setLicenceExpiry('');
    setStatusEndDate('');
    setNotes('');
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleLicenceCheckboxChange = (cat: LicenceCategory, checked: boolean) => {
    if (checked) {
      setLicenceCategories(prev => [...prev, cat]);
    } else {
      setLicenceCategories(prev => prev.filter(c => c !== cat));
    }
  };

  // Filter
  const filtered = personnel.filter(p => {
    const fullName = `${p.firstname} ${p.lastname}`.toLowerCase();
    const matchesSearch = fullName.includes(searchTerm.toLowerCase()) || 
                          p.service.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.grade.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (p.matricule && p.matricule.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (statusFilter === 'All') return matchesSearch;
    return matchesSearch && p.status === statusFilter;
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

  const staffStatuses: PersonnelStatus[] = ['Présent', 'En mission', 'Permission', 'Congé', 'Maladie', 'Formation'];

  return (
    <div className="space-y-4">
      
      {/* Title */}
      <div className="border-b border-slate-300 pb-2">
        <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight">
          REGISTRE MILITAIRE DES AGENTS ET CHAUFFEURS (BTC)
        </h2>
      </div>

      {/* Filter Roster Controls */}
      <div className="bg-white border border-slate-300 p-3 flex flex-col md:flex-row md:justify-between md:items-center gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Keyword Search */}
          <div className="relative flex items-center">
            <Search className="absolute left-2.5 text-slate-400" size={14} />
            <input 
              type="text" 
              placeholder="Rechercher par nom, grade, matricule..."
              className="admin-input pl-8 w-60"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Status select filter */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Statut d'activité :</span>
            <select
              className="admin-input py-1 px-2 text-xs w-44"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="All">-- Tous les statuts --</option>
              {staffStatuses.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Add staff CTA */}
        {canWrite() && (
          <div className="flex items-center gap-2">
            <ImportButton label="Importer les conducteurs" />
            <button 
              onClick={() => setIsAddOpen(true)}
              className="admin-btn admin-btn-primary font-bold text-xs"
            >
              <Plus size={14} className="mr-1" /> Enregistrer un agent
            </button>
          </div>
        )}
      </div>

      {/* Spreadsheet Table */}
      <div className="overflow-x-auto border border-slate-300 bg-white">
        <table className="admin-table min-w-full">
          <thead>
            <tr>
              <th onClick={() => handleSort('matricule')} className="cursor-pointer select-none text-left w-24">
                Matricule{getSortIcon('matricule')}
              </th>
              <th onClick={() => handleSort('grade')} className="cursor-pointer select-none text-left w-36">
                Grade{getSortIcon('grade')}
              </th>
              <th onClick={() => handleSort('lastname')} className="cursor-pointer select-none text-left">
                Nom & Prénom{getSortIcon('lastname')}
              </th>
              <th onClick={() => handleSort('service')} className="cursor-pointer select-none text-left">
                Service / Unité{getSortIcon('service')}
              </th>
              <th className="text-left w-36">Permis détenus</th>
              <th onClick={() => handleSort('status')} className="cursor-pointer select-none text-left w-40">
                Statut journalier{getSortIcon('status')}
              </th>
              <th className="text-left w-28">Fin indispo.</th>
              {canWrite() && <th className="text-center w-28">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {sorted.length > 0 ? (
              sorted.map(p => (
                <tr key={p.id}>
                  <td className="font-mono font-bold text-slate-800">{p.matricule || '-'}</td>
                  <td className="font-semibold text-slate-700">{p.grade}</td>
                  <td className="font-bold text-slate-900">{p.lastname.toUpperCase()} {p.firstname}</td>
                  <td>{p.service}</td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {p.licenceCategories && p.licenceCategories.length > 0 ? (
                        p.licenceCategories.map((cat: string) => (
                          <span key={cat} className="px-1 bg-slate-200 text-slate-700 font-mono text-[9px] font-extrabold border border-slate-300 rounded-sm">
                            {cat}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400 text-[10px] italic">Aucun</span>
                      )}
                    </div>
                  </td>
                  <td>
                    {/* Inline instant selector (1-2 click change) */}
                    <select
                      value={p.status}
                      disabled={!canWrite()}
                      onChange={async (e) => {
                        const newStatus = e.target.value as PersonnelStatus;
                        let newEndDate = p.statusEndDate || '';
                        if (newStatus !== 'Présent' && newStatus !== 'En mission') {
                          const ed = prompt(`Saisir la date de fin prévue (YYYY-MM-DD) pour "${newStatus}" (optionnel) :`, p.statusEndDate || '');
                          if (ed === null) return; // cancel change
                          newEndDate = ed;
                        } else {
                          newEndDate = '';
                        }
                        await updateStaffData(p.id, { status: newStatus, statusEndDate: newEndDate });
                      }}
                      className={`text-xs font-bold py-1 px-1.5 border border-slate-350 outline-none w-full rounded-sm ${
                        p.status === 'Présent' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                        p.status === 'En mission' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                        p.status === 'Permission' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                        p.status === 'Congé' ? 'bg-indigo-100 text-indigo-800 border-indigo-300' :
                        p.status === 'Maladie' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                        'bg-purple-100 text-purple-800 border-purple-300' /* Formation */
                      }`}
                    >
                      {staffStatuses.map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </td>
                  <td className="font-mono text-slate-600 text-[11px]">
                    {p.statusEndDate && p.status !== 'Présent' && p.status !== 'En mission' ? p.statusEndDate : '-'}
                  </td>
                  {canWrite() && (
                    <td className="text-center">
                      <div className="inline-flex gap-1">
                        <button 
                          onClick={() => startEdit(p)}
                          title="Modifier"
                          className="admin-btn p-1 text-blue-700 hover:bg-slate-200"
                        >
                          <Edit2 size={12} />
                        </button>
                        {canDelete() && (
                          <button 
                            onClick={async () => {
                              if (confirm(`Confirmer la suppression de l'agent ${p.firstname} ${p.lastname} ?`)) {
                                await removeStaff(p.id);
                              }
                            }}
                            title="Supprimer"
                            className="admin-btn p-1 text-red-750 hover:bg-red-50"
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
                <td colSpan={canWrite() ? 8 : 7} className="text-center text-slate-500 py-8">
                  Aucun agent répertorié.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Enregistrer un agent">
        <form onSubmit={handleAddSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="admin-label">Prénom *</label>
              <input 
                type="text" 
                required 
                placeholder="e.g. Jean" 
                className="admin-input"
                value={firstname}
                onChange={e => setFirstname(e.target.value)}
              />
            </div>
            <div>
              <label className="admin-label">Nom *</label>
              <input 
                type="text" 
                required 
                placeholder="e.g. Dupont" 
                className="admin-input"
                value={lastname}
                onChange={e => setLastname(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="admin-label">Matricule Militaire *</label>
              <input 
                type="text" 
                required 
                placeholder="e.g. M101293" 
                className="admin-input"
                value={matricule}
                onChange={e => setMatricule(e.target.value)}
              />
            </div>
            <div>
              <label className="admin-label">Grade Militaire</label>
              <select 
                className="admin-input"
                value={grade}
                onChange={e => setGrade(e.target.value as Grade)}
              >
                <optgroup label="Sous-officiers & Rangs">
                  {GRADES_RANKS.map(gr => (
                    <option key={gr} value={gr}>{gr}</option>
                  ))}
                </optgroup>
                <optgroup label="Officiers">
                  {GRADES_OFFICERS.map(go => (
                    <option key={go} value={go}>{go}</option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="admin-label">Service / Unité d'affectation</label>
              <select 
                className="admin-input"
                value={service}
                onChange={e => setService(e.target.value)}
              >
                <option value="Logistique">Logistique (BTC)</option>
                <option value="Exploitation">Exploitation</option>
                <option value="Maintenance">Maintenance Technique</option>
                <option value="Administration">Administration des effectifs</option>
              </select>
            </div>
            <div>
              <label className="admin-label">Date Expiry Permis (optionnelle)</label>
              <input 
                type="date" 
                className="admin-input"
                value={licenceExpiry}
                onChange={e => setLicenceExpiry(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="admin-label mb-1">Permis / Catégories de Conduite Détenues</label>
            <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 border border-slate-300">
              {(Object.keys(LICENCE_CATEGORY_LABELS) as LicenceCategory[]).map(cat => (
                <label key={cat} className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-700">
                  <input 
                    type="checkbox" 
                    checked={licenceCategories.includes(cat)}
                    onChange={e => handleLicenceCheckboxChange(cat, e.target.checked)}
                    className="accent-blue-800"
                  />
                  <span>{cat}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="admin-label">Notes / Observation</label>
            <textarea 
              placeholder="e.g. Apte service continu, permis VL et PL à jour." 
              className="admin-input min-h-[50px] font-sans"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setIsAddOpen(false)} className="admin-btn">Annuler</button>
            <button type="submit" className="admin-btn admin-btn-primary">Valider l'enregistrement</button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={isEditOpen} onClose={() => { setIsEditOpen(false); setEditingStaff(null); }} title="Modifier le profil agent">
        <form onSubmit={handleEditSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="admin-label">Prénom *</label>
              <input 
                type="text" 
                required 
                className="admin-input"
                value={firstname}
                onChange={e => setFirstname(e.target.value)}
              />
            </div>
            <div>
              <label className="admin-label">Nom *</label>
              <input 
                type="text" 
                required 
                className="admin-input"
                value={lastname}
                onChange={e => setLastname(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="admin-label">Matricule Militaire (non modifiable)</label>
              <input 
                type="text" 
                disabled 
                className="admin-input bg-slate-100 cursor-not-allowed text-slate-500 font-mono font-bold"
                value={matricule}
              />
            </div>
            <div>
              <label className="admin-label">Grade Militaire</label>
              <select 
                className="admin-input"
                value={grade}
                onChange={e => setGrade(e.target.value as Grade)}
              >
                <optgroup label="Sous-officiers & Rangs">
                  {GRADES_RANKS.map(gr => (
                    <option key={gr} value={gr}>{gr}</option>
                  ))}
                </optgroup>
                <optgroup label="Officiers">
                  {GRADES_OFFICERS.map(go => (
                    <option key={go} value={go}>{go}</option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="admin-label">Service / Unité d'affectation</label>
              <select 
                className="admin-input"
                value={service}
                onChange={e => setService(e.target.value)}
              >
                <option value="Logistique">Logistique (BTC)</option>
                <option value="Exploitation">Exploitation</option>
                <option value="Maintenance">Maintenance Technique</option>
                <option value="Administration">Administration des effectifs</option>
              </select>
            </div>
            <div>
              <label className="admin-label">Date Expiry Permis (optionnelle)</label>
              <input 
                type="date" 
                className="admin-input"
                value={licenceExpiry}
                onChange={e => setLicenceExpiry(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="admin-label">Statut journalier *</label>
              <select 
                className="admin-input"
                value={status}
                onChange={e => setStatus(e.target.value as PersonnelStatus)}
              >
                {staffStatuses.map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>
            {(status !== 'Présent' && status !== 'En mission') && (
              <div>
                <label className="admin-label">Fin d'indisponibilité prévue</label>
                <input 
                  type="date" 
                  className="admin-input"
                  value={statusEndDate}
                  onChange={e => setStatusEndDate(e.target.value)}
                />
              </div>
            )}
          </div>

          <div>
            <label className="admin-label mb-1">Permis / Catégories de Conduite Détenues</label>
            <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 border border-slate-300">
              {(Object.keys(LICENCE_CATEGORY_LABELS) as LicenceCategory[]).map(cat => (
                <label key={cat} className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-700">
                  <input 
                    type="checkbox" 
                    checked={licenceCategories.includes(cat)}
                    onChange={e => handleLicenceCheckboxChange(cat, e.target.checked)}
                    className="accent-blue-800"
                  />
                  <span>{cat}</span>
                </label>
              ))}
            </div>
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
            <button type="button" onClick={() => { setIsEditOpen(false); setEditingStaff(null); }} className="admin-btn">Annuler</button>
            <button type="submit" className="admin-btn admin-btn-primary">Enregistrer les modifications</button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
