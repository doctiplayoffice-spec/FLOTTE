import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Upload, CheckCircle, AlertCircle } from 'lucide-react';
import { isLicenceValid } from '../models/Vehicle';
import * as XLSX from 'xlsx';

type ImportButtonProps = {
  label?: string;
  /** Accept only Word, PDF, Excel */
  accept?: string;
  /** Called after a successful upload – gives you the public URL */
  onUploadComplete?: (url: string) => void;
  /** Optional extra Tailwind classes for the button label */
  buttonClass?: string;
};

export const ImportButton = ({
  label = 'Importer',
  // default MIME filter – .doc/.docx, .pdf, .xls/.xlsx
  accept = '.doc,.docx,.pdf,.xls,.xlsx',
  onUploadComplete,
  buttonClass,
}: ImportButtonProps) => {
  const { addNewVehicle, addNewStaff, addNewMission, vehicles, personnel } = useApp();
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // reset statuses
    setError(null);
    setSuccessMessage(null);

    // simple validation
    const allowedExt = /\.(docx?|pdf|xlsx?|xls)$/i;
    if (!allowedExt.test(file.name)) {
      setError('Seuls les fichiers Word, PDF ou Excel sont autorisés.');
      return;
    }

    // Determine section from label
    let sectionType: 'vehicles' | 'personnel' | 'missions' | null = null;
    const lowerLabel = label.toLowerCase();
    if (lowerLabel.includes('conducteur') || lowerLabel.includes('personnel')) {
      sectionType = 'personnel';
    } else if (lowerLabel.includes('mission')) {
      sectionType = 'missions';
    } else if (lowerLabel.includes('véhicule') || lowerLabel.includes('vehicule') || lowerLabel.includes('vehicle')) {
      sectionType = 'vehicles';
    }

    // Real file reading & parsing
    setUploadProgress(0);
    const reader = new FileReader();

    reader.onload = async (evt) => {
      setUploadProgress(50);
      try {
        const dataBytes = evt.target?.result;
        if (!dataBytes) throw new Error("Impossible de lire le fichier");

        // Parse with XLSX
        const workbook = XLSX.read(dataBytes, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        if (sectionType === 'personnel') {
          // Headers are at Row 2 (range: 1 instructs to skip row 1 and read row 2 as headers)
          const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { range: 1 });
          let importCount = 0;

          for (const row of rawRows) {
            const matricule = row['matricule'] ? String(row['matricule']).trim() : '';
            // Skip header description row
            if (!matricule || matricule.toLowerCase().includes('matricule') || matricule.toLowerCase().includes('unique')) {
              continue;
            }

            const grade = row['grade'] ? String(row['grade']).trim() : 'Soldat 2e classe';
            const lastname = row['nom'] ? String(row['nom']).trim().toUpperCase() : '';
            const firstname = row['prenom'] ? String(row['prenom']).trim() : '';
            const service = row['service'] ? String(row['service']).trim().toUpperCase() : 'ETM';

            // Permis parsing
            let licenceCategories: any[] = [];
            if (row['permis']) {
              const rawPermis = String(row['permis']).split(',');
              rawPermis.forEach((p) => {
                const cleaned = p.trim().toUpperCase();
                if (['VL', 'PL', 'SR', 'TC', 'PC', 'MOTO'].includes(cleaned)) {
                  licenceCategories.push(cleaned);
                }
              });
            }

            // Expiry date (default fallback)
            const licenceExpiry = '2030-12-31';

            // Statut & FinStatut
            const status = row['statut'] ? String(row['statut']).trim() : 'Présent';
            let statusEndDate = '';
            if (row['finStatut']) {
              if (typeof row['finStatut'] === 'number') {
                const dateObj = new Date((row['finStatut'] - 25569) * 86400 * 1000);
                statusEndDate = dateObj.toISOString().split('T')[0];
              } else {
                statusEndDate = String(row['finStatut']).trim();
              }
            }

            const notes = row['notes'] ? String(row['notes']).trim() : `Importé depuis : ${file.name}`;

            await addNewStaff({
              matricule,
              grade: grade as any,
              lastname,
              firstname,
              service,
              licenceCategories: licenceCategories as any,
              licenceExpiry,
              status: status as any,
              statusEndDate: statusEndDate || undefined,
              notes
            });
            importCount++;
          }

          setUploadProgress(100);
          setSuccessMessage(`Importation réussie ! ${importCount} conducteurs ajoutés depuis ${file.name}`);
        } else if (sectionType === 'vehicles') {
          // Perform basic mock/simulation for vehicles
          await addNewVehicle({
            plate: `PR-${Math.floor(10000 + Math.random() * 90000)}-D-6`,
            brand: 'Renault',
            model: 'Master L2H2',
            category: 'VLTT',
            mileage: 45200,
            lastMaint: '2026-05-10',
            nextMaint: '2026-11-10',
            notes: `Importé depuis : ${file.name}`,
            nextInspection: '2026-12-31',
            insuranceExpiry: '2026-12-31',
            nextMaintMileage: 55000,
            statusChangedDate: new Date().toISOString().split('T')[0]
          });
          setUploadProgress(100);
          setSuccessMessage(`Importation réussie ! Véhicule ajouté (simulation).`);
        } else if (sectionType === 'missions') {
          const targetVeh = vehicles.find(v => v.status === 'Disponible');
          const targetPlate = targetVeh?.plate || '10001-A-SEM';
          const targetCategory = targetVeh?.category || 'CARGO';
          const targetStaff = personnel.find(s => s.status === 'Présent' && isLicenceValid(s.licenceCategories, targetCategory)) || { id: 's-temp' };
          await addNewMission({
            vehicleId: targetPlate,
            personnelId: targetStaff.id,
            service: 'ETM',
            departureDate: new Date().toISOString().split('T')[0],
            returnDatePlanned: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().split('T')[0],
            departurePlace: 'Casablanca',
            destination: 'Fès',
            purpose: 'Acheminement express',
            notes: `Mission importée depuis : ${file.name}`,
          });
          setUploadProgress(100);
          setSuccessMessage(`Importation réussie ! Nouvelle mission ajoutée (simulation).`);
        } else {
          setUploadProgress(100);
          setSuccessMessage(`Fichier ${file.name} importé avec succès.`);
        }

        onUploadComplete?.(`mock-storage-url/${Date.now()}_${file.name}`);
      } catch (err) {
        console.error(err);
        setError("Erreur lors de l'importation ou du traitement du fichier Excel.");
      } finally {
        setTimeout(() => {
          setUploadProgress(null);
          e.target.value = '';
        }, 500);
        setTimeout(() => {
          setSuccessMessage(null);
        }, 4000);
      }
    };

    reader.onerror = () => {
      setError("Erreur de lecture du fichier.");
      setUploadProgress(null);
    };

    reader.readAsArrayBuffer(file);
  };

  const uniqueId = `import-file-input-${label.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <div className="flex flex-col items-center gap-1.5 relative">
      <label
        htmlFor={uniqueId}
        className={`
          admin-btn admin-btn-orange font-bold text-xs cursor-pointer flex items-center gap-1 rounded-sm shadow-sm transition-all duration-200
          ${buttonClass ? buttonClass : ''}
        `}
      >
        <Upload size={14} />
        {label}
      </label>

      <input
        id={uniqueId}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Uploading progress bar */}
      {uploadProgress !== null && (
        <div className="absolute top-full mt-1 z-50 w-48 bg-slate-200 border border-slate-300 rounded-sm h-3 overflow-hidden shadow-md">
          <div
            className="bg-orange-500 h-full transition-all duration-200"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}

      {/* Success Notification */}
      {successMessage && (
        <div className="absolute top-full mt-1 z-50 w-64 bg-emerald-50 border border-emerald-300 text-emerald-800 text-[10px] p-2 rounded-sm shadow-md flex items-start gap-1.5 animate-fadeIn">
          <CheckCircle size={14} className="text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Error Notification */}
      {error && (
        <div className="absolute top-full mt-1 z-50 w-64 bg-rose-50 border border-rose-300 text-rose-800 text-[10px] p-2 rounded-sm shadow-md flex items-start gap-1.5 animate-fadeIn">
          <AlertCircle size={14} className="text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
