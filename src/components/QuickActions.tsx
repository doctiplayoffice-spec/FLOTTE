import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ShieldAlert } from 'lucide-react';
import { VehicleCategory, VEHICLE_CATEGORY_LABELS } from '../models/Vehicle';
import { MOROCCAN_CITIES } from '../models/Cities';

export default function QuickActions() {
  const { 
    vehicles, 
    personnel, 
    missions, 
    maintenance,
    canWrite,
    addNewVehicle,
    updateVehicleData,
    updateStaffData,
    addNewMission,
    updateMissionData,
    closeMissionData,
    addNewMaintenance,
    updateMaintenanceData
  } = useApp();

  const [activeAction, setActiveAction] = useState<string | null>('mission');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Form Fields states
  const [plate, setPlate] = useState('');
  const [desc, setDesc] = useState('');
  const [driverId, setDriverId] = useState('');
  const [destination, setDestination] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [customDest, setCustomDest] = useState('');
  const [odometer, setOdometer] = useState('');
  const [purpose, setPurpose] = useState('');
  
  // Add vehicle form state
  const [addVehPlate, setAddVehPlate] = useState('');
  const [addVehBrand, setAddVehBrand] = useState('');
  const [addVehModel, setAddVehModel] = useState('');
  const [addVehType, setAddVehType] = useState<VehicleCategory>('VL');
  const [addVehMileage, setAddVehMileage] = useState('');

  const triggerSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setErrorMsg('');
    setTimeout(() => setSuccessMessage(''), 4000);
    // Reset inputs
    setPlate('');
    setDesc('');
    setDriverId('');
    setDestination('');
    setSelectedCity('');
    setCustomDest('');
    setOdometer('');
    setPurpose('');
    setAddVehPlate('');
    setAddVehBrand('');
    setAddVehModel('');
    setAddVehMileage('');
  };

  const triggerError = (msg: string) => {
    setErrorMsg(msg);
    setSuccessMessage('');
  };

  // 1. Declare vehicle in Maintenance
  const handleSendToMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plate || !desc) return triggerError("Remplissez tous les champs.");

    try {
      await addNewMaintenance({
        vehicleId: plate,
        type: 'Corrective',
        date: new Date().toISOString().split('T')[0],
        mileage: vehicles.find(v => v.plate === plate)?.mileage || 0,
        desc
      });
      await updateVehicleData(plate, { status: 'Maintenance' });
      triggerSuccess(`Le véhicule ${plate} a été déclaré en Maintenance.`);
    } catch (err: any) {
      triggerError("Échec lors de l'opération.");
    }
  };

  // 2. Declare vehicle Available (from Maintenance or Breakdown)
  const handleReturnFromMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plate) return triggerError("Sélectionnez un véhicule.");

    try {
      const activeRec = maintenance.find(m => m.vehicleId === plate && (m.status === 'En cours' || m.status === 'Prévue'));
      if (activeRec) {
        await updateMaintenanceData(activeRec.id, { status: 'Terminée' });
      }
      await updateVehicleData(plate, { status: 'Disponible' });
      triggerSuccess(`Le véhicule ${plate} est de nouveau Disponible.`);
    } catch (err: any) {
      triggerError("Échec lors de l'opération.");
    }
  };

  // 2b. Declare vehicle in Breakdown (Panne)
  const handleDeclareBreakdown = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plate || !desc) return triggerError("Remplissez tous les champs.");

    try {
      await updateVehicleData(plate, { 
        status: 'Panne', 
        notes: `Panne signalée: ${desc}` 
      });
      triggerSuccess(`Le véhicule ${plate} a été déclaré en Panne.`);
    } catch (err: any) {
      triggerError("Échec lors de l'opération.");
    }
  };

  // 3. Dispatch Vehicle on a Mission
  const handleLaunchMission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plate || !driverId || !destination || !purpose) {
      return triggerError("Veuillez remplir tous les champs.");
    }

    try {
      const selectedVeh = vehicles.find(v => v.plate === plate);
      const selectedDriver = personnel.find(p => p.id === driverId);
      if (!selectedVeh || !selectedDriver) return triggerError("Erreur ressources.");

      if (!selectedDriver.licenceCategories || !selectedDriver.licenceCategories.includes(selectedVeh.category)) {
        return triggerError(`L'agent sélectionné ne possède pas le permis requis (${selectedVeh.category}) pour ce véhicule.`);
      }

      const newM = await addNewMission({
        vehicleId: plate,
        personnelId: driverId,
        service: selectedDriver.service,
        departureDate: new Date().toISOString().split('T')[0],
        returnDatePlanned: new Date(Date.now() + 48 * 3600000).toISOString().split('T')[0], // +2 days
        departurePlace: 'Dépôt Principal',
        destination,
        purpose,
        notes: ''
      });

      await updateMissionData(newM.id, { status: 'En cours' });
      await updateVehicleData(plate, { status: 'En mission' });
      await updateStaffData(driverId, { status: 'En mission' });

      triggerSuccess(`Mission créée et lancée. Véhicule ${plate} et chauffeur ${selectedDriver.firstname} affectés.`);
    } catch (err: any) {
      triggerError("Échec lors de la création de mission.");
    }
  };

  // 4. Close an active mission
  const handleCloseMission = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeMiss = missions.find(m => m.vehicleId === plate && m.status === 'En cours');
    if (!activeMiss || !plate || !odometer) return triggerError("Remplissez tous les champs.");

    const returnMileage = parseInt(odometer);
    const initialMileage = vehicles.find(v => v.plate === plate)?.mileage || 0;
    if (returnMileage < initialMileage) {
      return triggerError(`Le kilométrage de retour (${returnMileage} km) ne peut pas être inférieur au kilométrage de départ (${initialMileage} km).`);
    }

    try {
      await closeMissionData(activeMiss.id, returnMileage, 'Terminée', 'Clôturé via actions rapides');
      triggerSuccess(`Mission clôturée. Véhicule ${plate} libéré.`);
    } catch (err: any) {
      triggerError("Échec de la clôture.");
    }
  };

  // 5. Add new vehicle
  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addVehPlate || !addVehBrand || !addVehModel) {
      return triggerError("Veuillez saisir les champs requis.");
    }

    try {
      await addNewVehicle({
        plate: addVehPlate,
        brand: addVehBrand,
        model: addVehModel,
        category: addVehType,
        mileage: parseInt(addVehMileage) || 0,
        lastMaint: new Date().toISOString().split('T')[0],
        nextMaint: new Date(Date.now() + 180 * 24 * 3600000).toISOString().split('T')[0],
        notes: 'Enregistré via actions rapides',
        nextInspection: new Date(Date.now() + 365 * 24 * 3600000).toISOString().split('T')[0],
        insuranceExpiry: new Date(Date.now() + 365 * 24 * 3600000).toISOString().split('T')[0],
        nextMaintMileage: (parseInt(addVehMileage) || 0) + 10000,
        statusChangedDate: new Date().toISOString().split('T')[0]
      });
      triggerSuccess(`Véhicule ${addVehPlate} ajouté.`);
    } catch (err) {
      triggerError("Erreur d'ajout.");
    }
  };

  if (!canWrite()) {
    return (
      <div className="bg-rose-50 border border-rose-350 p-6 text-center space-y-3">
        <ShieldAlert className="mx-auto text-rose-700" size={48} />
        <h3 className="text-lg font-bold text-rose-700">Accès restreint</h3>
        <p className="text-sm text-rose-700 max-w-md mx-auto">
          Votre rôle actuel (Consultation) permet uniquement de lire les données. 
          Veuillez vous authentifier en tant que **Gestionnaire** ou **Administrateur** pour effectuer ces opérations.
        </p>
      </div>
    );
  }

  // Filters for available resources
  const availableVehicles = vehicles.filter(v => v.status === 'Disponible');
  const activeMissionVehicles = vehicles.filter(v => v.status === 'En mission');
  const maintenanceOrBrokenVehicles = vehicles.filter(v => v.status === 'Maintenance' || v.status === 'Panne');
  const availableStaff = personnel.filter(p => p.status === 'Présent');

  return (
    <div className="space-y-4">
      
      {/* Title */}
      <div className="border-b border-slate-300 pb-2">
        <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight">
          PUPITRE D'ACTIONS RAPIDES & SAISIE EXPRESS
        </h2>
      </div>

      {/* Raccourcis Menu bar */}
      <div className="bg-slate-200 border border-slate-350 p-2 flex flex-wrap gap-2">
        <button 
          onClick={() => { setActiveAction('mission'); setErrorMsg(''); }}
          className={`admin-btn ${activeAction === 'mission' ? 'admin-btn-primary' : ''}`}
        >
          Départ en mission
        </button>
        <button 
          onClick={() => { setActiveAction('maintenance_start'); setErrorMsg(''); }}
          className={`admin-btn ${activeAction === 'maintenance_start' ? 'admin-btn-primary' : ''}`}
        >
          Immobiliser (Atelier)
        </button>
        <button 
          onClick={() => { setActiveAction('maintenance_end'); setErrorMsg(''); }}
          className={`admin-btn ${activeAction === 'maintenance_end' ? 'admin-btn-primary' : ''}`}
        >
          Remettre Disponible
        </button>
        <button 
          onClick={() => { setActiveAction('breakdown_start'); setErrorMsg(''); }}
          className={`admin-btn ${activeAction === 'breakdown_start' ? 'admin-btn-primary' : ''}`}
        >
          Déclarer une Panne
        </button>
        <button 
          onClick={() => { setActiveAction('mission_close'); setErrorMsg(''); }}
          className={`admin-btn ${activeAction === 'mission_close' ? 'admin-btn-primary' : ''}`}
        >
          Clôturer une Mission
        </button>
        <button 
          onClick={() => { setActiveAction('add_vehicle'); setErrorMsg(''); }}
          className={`admin-btn ${activeAction === 'add_vehicle' ? 'admin-btn-primary' : ''}`}
        >
          Créer un Véhicule
        </button>
      </div>

      {/* Feedback Logs */}
      {successMessage && (
        <div className="p-2.5 bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold">
          {successMessage}
        </div>
      )}
      {errorMsg && (
        <div className="p-2.5 bg-rose-100 border border-rose-300 text-rose-800 text-xs font-bold">
          {errorMsg}
        </div>
      )}

      {/* Main Form container */}
      <div className="bg-white border border-slate-300 p-4 max-w-lg">
        
        {/* Action 1: Mission */}
        {activeAction === 'mission' && (
          <form onSubmit={handleLaunchMission} className="space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-1.5 mb-2">
              Lancement rapide d'un transport
            </h3>
            <div>
              <label className="admin-label">Libellé / Objet de la mission *</label>
              <input 
                type="text" 
                className="admin-input"
                placeholder="e.g. Navette dépôt Tanger-Casablanca"
                required
                value={purpose}
                onChange={e => setPurpose(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="admin-label">Véhicule Disponible *</label>
                <select 
                  className="admin-input"
                  required
                  value={plate}
                  onChange={e => setPlate(e.target.value)}
                >
                  <option value="">-- Choisir --</option>
                  {availableVehicles.map(v => (
                    <option key={v.plate} value={v.plate}>{v.brand} {v.model} ({v.plate})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="admin-label">Chauffeur Disponible *</label>
                <select 
                  className="admin-input"
                  required
                  value={driverId}
                  onChange={e => setDriverId(e.target.value)}
                >
                  <option value="">-- Choisir --</option>
                  {availableStaff.filter(p => {
                    const selVeh = vehicles.find(v => v.plate === plate);
                    if (!selVeh) return true;
                    return p.licenceCategories && p.licenceCategories.includes(selVeh.category);
                  }).map(p => (
                    <option key={p.id} value={p.id}>{p.grade} {p.lastname} {p.firstname} (Permis: {p.licenceCategories?.join(', ') || 'aucun'})</option>
                  ))}
                </select>
              </div>
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
                    setDestination(customDest);
                  } else {
                    setDestination(val);
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
                    placeholder="Saisir la destination (ex: Casablanca Centre)"
                    className="admin-input" 
                    required
                    value={customDest}
                    onChange={e => {
                      setCustomDest(e.target.value);
                      setDestination(e.target.value);
                    }}
                  />
                </div>
              )}
            </div>

            <div className="pt-2">
              <button type="submit" className="admin-btn admin-btn-primary w-full">
                Valider l'affectation et lancer le transport
              </button>
            </div>
          </form>
        )}

        {/* Action 2: Send to Maintenance */}
        {activeAction === 'maintenance_start' && (
          <form onSubmit={handleSendToMaintenance} className="space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-1.5 mb-2">
              Immobilisation d'un véhicule à l'atelier
            </h3>
            <div>
              <label className="admin-label">Véhicule à immobiliser *</label>
              <select 
                className="admin-input"
                required
                value={plate}
                onChange={e => setPlate(e.target.value)}
              >
                <option value="">-- Choisir un véhicule --</option>
                {availableVehicles.map(v => (
                  <option key={v.plate} value={v.plate}>{v.brand} {v.model} ({v.plate})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="admin-label">Anomalie ou motif de révision *</label>
              <textarea 
                className="admin-input min-h-[70px] font-sans"
                placeholder="e.g. Remplacement pneus, vidange, problème de boîte..."
                required
                value={desc}
                onChange={e => setDesc(e.target.value)}
              />
            </div>

            <div className="pt-2">
              <button type="submit" className="admin-btn admin-btn-primary w-full bg-rose-700 border-rose-800 hover:bg-rose-800">
                Déclarer l'immobilisation atelier
              </button>
            </div>
          </form>
        )}

        {/* Action 3: Return from Maintenance or Breakdown */}
        {activeAction === 'maintenance_end' && (
          <form onSubmit={handleReturnFromMaintenance} className="space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-1.5 mb-2">
              Remise en ligne opérationnelle d'un véhicule
            </h3>
            <div>
              <label className="admin-label">Véhicule à libérer *</label>
              <select 
                className="admin-input"
                required
                value={plate}
                onChange={e => setPlate(e.target.value)}
              >
                <option value="">-- Choisir un véhicule à libérer --</option>
                {maintenanceOrBrokenVehicles.map(v => (
                  <option key={v.plate} value={v.plate}>{v.brand} {v.model} ({v.plate}) - {v.status}</option>
                ))}
              </select>
            </div>

            <p className="text-[10px] text-slate-500 italic">
              Cette action remet le véhicule en statut "Disponible" et clôture tout dossier de réparation ou panne associé.
            </p>

            <div className="pt-2">
              <button type="submit" className="admin-btn admin-btn-primary w-full bg-emerald-700 border-emerald-800 hover:bg-emerald-800">
                Valider la remise en service
              </button>
            </div>
          </form>
        )}

        {/* Action 3b: Declare Breakdown (Panne) */}
        {activeAction === 'breakdown_start' && (
          <form onSubmit={handleDeclareBreakdown} className="space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-1.5 mb-2">
              Déclaration de panne critique
            </h3>
            <div>
              <label className="admin-label">Véhicule en panne *</label>
              <select 
                className="admin-input"
                required
                value={plate}
                onChange={e => setPlate(e.target.value)}
              >
                <option value="">-- Choisir un véhicule --</option>
                {availableVehicles.map(v => (
                  <option key={v.plate} value={v.plate}>{v.brand} {v.model} ({v.plate})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="admin-label">Description de la panne *</label>
              <textarea 
                className="admin-input min-h-[70px] font-sans"
                placeholder="e.g. Batterie HS, fuite d'huile, crevaison..."
                required
                value={desc}
                onChange={e => setDesc(e.target.value)}
              />
            </div>

            <div className="pt-2">
              <button type="submit" className="admin-btn admin-btn-primary w-full bg-red-800 border-red-900 hover:bg-red-900">
                Déclarer la panne (Immobilisation immédiate)
              </button>
            </div>
          </form>
        )}

        {/* Action 4: Close Mission */}
        {activeAction === 'mission_close' && (
          <form onSubmit={handleCloseMission} className="space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-1.5 mb-2">
              Clôture de dossier de transport
            </h3>
            <div>
              <label className="admin-label">Véhicule de retour *</label>
              <select 
                className="admin-input"
                required
                value={plate}
                onChange={e => setPlate(e.target.value)}
              >
                <option value="">-- Choisir un véhicule en transit --</option>
                {activeMissionVehicles.map(v => (
                  <option key={v.plate} value={v.plate}>{v.brand} {v.model} ({v.plate})</option>
                ))}
              </select>
            </div>

            {plate && (
              <div>
                <label className="admin-label">
                  Index Kilométrique de retour (Départ: {vehicles.find(v => v.plate === plate)?.mileage} km) *
                </label>
                <input 
                  type="number" 
                  className="admin-input"
                  required
                  placeholder="Saisir index odomètre de retour"
                  value={odometer}
                  onChange={e => setOdometer(e.target.value)}
                />
              </div>
            )}

            <div className="pt-2">
              <button type="submit" className="admin-btn admin-btn-primary w-full">
                Clôturer la Mission (Libérer chauffeur & véhicule)
              </button>
            </div>
          </form>
        )}

        {/* Action 5: Add Vehicle */}
        {activeAction === 'add_vehicle' && (
          <form onSubmit={handleAddVehicle} className="space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-1.5 mb-2">
              Création express d'une fiche véhicule
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="admin-label">Plaque d'immatriculation *</label>
                <input 
                  type="text" 
                  className="admin-input"
                  required
                  placeholder="12345-A-6"
                  value={addVehPlate}
                  onChange={e => setAddVehPlate(e.target.value)}
                />
              </div>

              <div>
                <label className="admin-label">Catégorie Véhicule</label>
                <select 
                  className="admin-input"
                  value={addVehType}
                  onChange={e => setAddVehType(e.target.value as any)}
                >
                  {Object.entries(VEHICLE_CATEGORY_LABELS).map(([cat, label]) => (
                    <option key={cat} value={cat}>{label} ({cat})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="admin-label">Constructeur *</label>
                <input 
                  type="text" 
                  className="admin-input"
                  required
                  placeholder="e.g. Scania, Mercedes..."
                  value={addVehBrand}
                  onChange={e => setAddVehBrand(e.target.value)}
                />
              </div>

              <div>
                <label className="admin-label">Modèle *</label>
                <input 
                  type="text" 
                  className="admin-input"
                  required
                  placeholder="e.g. R500, Sprinter..."
                  value={addVehModel}
                  onChange={e => setAddVehModel(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="admin-label">Index Kilométrique initial (km)</label>
              <input 
                type="number" 
                className="admin-input"
                placeholder="e.g. 124000"
                value={addVehMileage}
                onChange={e => setAddVehMileage(e.target.value)}
              />
            </div>

            <div className="pt-2">
              <button type="submit" className="admin-btn admin-btn-primary w-full">
                Ajouter le Véhicule au registre
              </button>
            </div>
          </form>
        )}

      </div>

    </div>
  );
}
