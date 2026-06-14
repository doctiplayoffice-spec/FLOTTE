import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit2
} from 'lucide-react';
import Modal from './common/Modal';

export default function Personnel() {
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
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<any>('Disponible');

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstname || !lastname || !title) return;

    await addNewStaff({
      firstname,
      lastname,
      service,
      title
    });

    setFirstname('');
    setLastname('');
    setTitle('');
    setStatus('Disponible');
    setIsAddOpen(false);
  };

  const startEdit = (s: any) => {
    setEditingStaff(s);
    setFirstname(s.firstname);
    setLastname(s.lastname);
    setService(s.service);
    setTitle(s.title);
    setStatus(s.status);
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;

    await updateStaffData(editingStaff.id, {
      firstname,
      lastname,
      service,
      title,
      status
    });

    setIsEditOpen(false);
    setEditingStaff(null);
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
  const filtered = personnel.filter(p => {
    const fullName = `${p.firstname} ${p.lastname}`.toLowerCase();
    const matchesSearch = fullName.includes(searchTerm.toLowerCase()) || 
                          p.service.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.title.toLowerCase().includes(searchTerm.toLowerCase());
    
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

  const staffStatuses = ['Disponible', 'Mission', 'Congé', 'Formation', 'Maladie', 'Atelier'];

  return (
    <div className="space-y-4">
      
      {/* Title */}
      <div className="border-b border-slate-300 pb-2">
        <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight">
          REGISTRE DES AGENTS ET CHAUFFEURS
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
              placeholder="Rechercher par nom, service..."
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
          <button 
            onClick={() => setIsAddOpen(true)}
            className="admin-btn admin-btn-primary font-bold text-xs"
          >
            <Plus size={14} className="mr-1" /> Enregistrer un agent
          </button>
        )}
      </div>

      {/* Spreadsheet Table */}
      <div className="overflow-x-auto border border-slate-300 bg-white">
        <table className="admin-table min-w-full">
          <thead>
            <tr>
              <th onClick={() => handleSort('lastname')} className="cursor-pointer select-none text-left">
                Nom{getSortIcon('lastname')}
              </th>
              <th onClick={() => handleSort('firstname')} className="cursor-pointer select-none text-left">
                Prénom{getSortIcon('firstname')}
              </th>
              <th onClick={() => handleSort('service')} className="cursor-pointer select-none text-left">
                Unité / Service{getSortIcon('service')}
              </th>
              <th onClick={() => handleSort('title')} className="cursor-pointer select-none text-left">
                Fonction{getSortIcon('title')}
              </th>
              <th onClick={() => handleSort('status')} className="cursor-pointer select-none text-left w-40">
                Statut d'activité{getSortIcon('status')}
              </th>
              {canWrite() && <th className="text-center w-28">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {sorted.length > 0 ? (
              sorted.map(p => (
                <tr key={p.id}>
                  <td className="font-bold text-slate-800">{p.lastname.toUpperCase()}</td>
                  <td className="font-semibold text-slate-700">{p.firstname}</td>
                  <td>{p.service}</td>
                  <td>{p.title}</td>
                  <td>
                    {/* Inline instant selector (1-2 click change) */}
                    <select
                      value={p.status}
                      disabled={!canWrite()}
                      onChange={async (e) => {
                        await updateStaffData(p.id, { status: e.target.value as any });
                      }}
                      className={`text-xs font-bold py-1 px-1.5 border border-slate-350 outline-none w-full ${
                        p.status === 'Disponible' ? 'bg-emerald-100 text-emerald-800' :
                        p.status === 'Mission' ? 'bg-amber-100 text-amber-800' :
                        p.status === 'Congé' ? 'bg-blue-100 text-blue-800' :
                        p.status === 'Formation' ? 'bg-purple-100 text-purple-800' :
                        p.status === 'Maladie' ? 'bg-rose-105 text-rose-800 bg-rose-50' :
                        'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {staffStatuses.map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
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
                <td colSpan={canWrite() ? 6 : 5} className="text-center text-slate-500 py-8">
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
              <label className="admin-label">Service / Unité</label>
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
              <label className="admin-label">Fonction *</label>
              <input 
                type="text" 
                required 
                placeholder="e.g. Chauffeur PL" 
                className="admin-input"
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
            </div>
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
              <label className="admin-label">Service / Unité</label>
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
              <label className="admin-label">Fonction *</label>
              <input 
                type="text" 
                required 
                className="admin-input"
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="admin-label">Statut d'activité / Disponibilité *</label>
            <select 
              className="admin-input"
              value={status}
              onChange={e => setStatus(e.target.value)}
            >
              {staffStatuses.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
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
