import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Upload, CheckCircle, AlertCircle } from 'lucide-react';

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
  const { addNewVehicle, addNewStaff, addNewMission } = useApp();
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

    // Simulate progress
    setUploadProgress(0);
    let progress = 0;
    const interval = setInterval(async () => {
      progress += 20;
      setUploadProgress(progress);

      if (progress >= 100) {
        clearInterval(interval);
        
        try {
          // Perform mock data ingestion depending on section type
          if (sectionType === 'vehicles') {
            await addNewVehicle({
              plate: `PR-${Math.floor(10000 + Math.random() * 90000)}-D-6`,
              brand: 'Renault',
              model: 'Master L2H2',
              category: 'VL',
              mileage: 45200,
              lastMaint: '2026-05-10',
              nextMaint: '2026-11-10',
              notes: `Importé depuis le fichier : ${file.name}`,
              nextInspection: '2026-12-31',
              insuranceExpiry: '2026-12-31',
              nextMaintMileage: 55000,
              statusChangedDate: new Date().toISOString().split('T')[0]
            });
            await addNewVehicle({
              plate: `PR-${Math.floor(10000 + Math.random() * 90000)}-A-7`,
              brand: 'Peugeot',
              model: 'Partner',
              category: 'VL',
              mileage: 23100,
              lastMaint: '2026-06-01',
              nextMaint: '2026-12-01',
              notes: `Importé depuis le fichier : ${file.name}`,
              nextInspection: '2027-06-01',
              insuranceExpiry: '2027-06-01',
              nextMaintMileage: 30000,
              statusChangedDate: new Date().toISOString().split('T')[0]
            });
            setSuccessMessage(`Importation réussie ! 2 véhicules ajoutés depuis ${file.name}`);
          } else if (sectionType === 'personnel') {
            await addNewStaff({
              matricule: `M${Math.floor(100000 + Math.random() * 900000)}`,
              grade: 'Sergent',
              firstname: 'Yassine',
              lastname: 'Bennani',
              service: 'Logistique',
              licenceCategories: ['VL', 'PL'],
              licenceExpiry: '2030-12-31',
              notes: `Importé depuis le fichier : ${file.name}`
            });
            await addNewStaff({
              matricule: `M${Math.floor(100000 + Math.random() * 900000)}`,
              grade: 'Caporal',
              firstname: 'Sanaa',
              lastname: 'Mansouri',
              service: 'Exploitation',
              licenceCategories: ['VL'],
              licenceExpiry: '2029-06-30',
              notes: `Importé depuis le fichier : ${file.name}`
            });
            setSuccessMessage(`Importation réussie ! 2 conducteurs/agents ajoutés depuis ${file.name}`);
          } else if (sectionType === 'missions') {
            // Add a realistic mission using existing drivers/vehicles
            await addNewMission({
              vehicleId: '12345-A-6',
              personnelId: 's-3', // Rachid Amrani
              service: 'Logistique',
              departureDate: new Date().toISOString().split('T')[0],
              returnDatePlanned: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().split('T')[0],
              departurePlace: 'Casablanca',
              destination: 'Fès',
              purpose: 'Acheminement express',
              notes: `Mission importée depuis le fichier : ${file.name}`,
            });
            setSuccessMessage(`Importation réussie ! Nouvelle mission ajoutée depuis ${file.name}`);
          } else {
            setSuccessMessage(`Fichier ${file.name} téléversé avec succès (simulation).`);
          }

          // Call callback
          onUploadComplete?.(`mock-storage-url/${Date.now()}_${file.name}`);
        } catch (err) {
          console.error(err);
          setError("Erreur lors de l'importation des données.");
        } finally {
          setUploadProgress(null);
          // Reset file input value so same file can be selected again
          e.target.value = '';
          // Auto-clear success message after 4 seconds
          setTimeout(() => {
            setSuccessMessage(null);
          }, 4000);
        }
      }
    }, 200);
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
