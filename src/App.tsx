import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Dashboard from './components/Dashboard';
import QuickActions from './components/QuickActions';
import Vehicles from './components/Vehicles';
import Personnel from './components/Personnel';
import Missions from './components/Missions';
import Maintenance from './components/Maintenance';
import Reports from './components/Reports';
import GPSTracking from './components/GPSTracking';
import MobileDriverApp from './components/DriverTracking';
import { Menu, X } from 'lucide-react';

// ─── Device detection hook ───────────────────────────────────────────────────
function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    // Check via user agent AND viewport width
    const ua = navigator.userAgent;
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    return isMobileUA || window.innerWidth < 768;
  });

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return isMobile;
}

// ─── Mobile shell: only driver app ──────────────────────────────────────────
function MobileShell() {
  return <MobileDriverApp />;
}

// ─── Desktop shell: full ERP manager interface ───────────────────────────────
function DesktopShell() {
  const {
    user,
    activeTab,
    setActiveTab,
    loading,
    loginUser,
    logoutUser,
  } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setLoggingIn(true);
    try {
      await loginUser(email, password);
      setEmail('');
      setPassword('');
    } catch (err: any) {
      setAuthError(err.message || 'Erreur de connexion.');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleQuickLogin = async (quickEmail: string, quickPass: string) => {
    setAuthError('');
    setLoggingIn(true);
    try {
      await loginUser(quickEmail, quickPass);
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setLoggingIn(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 text-slate-500">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-800" />
      </div>
    );
  }

  // ── Login screen ──
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-100 text-slate-900 font-sans text-xs">
        <div className="w-full max-w-sm bg-white border border-slate-400 p-6 shadow-md space-y-4">
          <div className="text-center space-y-1">
            <h2 className="text-base font-bold text-slate-800 uppercase tracking-wider">Connexion — FLEETMANAGER</h2>
            <p className="text-[10px] text-slate-500 font-semibold">LOGICIEL DE GESTION ADMINISTRATIVE DE TRANSPORT</p>
          </div>

          {authError && (
            <div className="p-2 bg-red-100 border border-red-300 text-red-800 text-xs">
              <strong>Erreur :</strong> {authError}
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-3">
            <div>
              <label className="admin-label" htmlFor="login-email">Identifiant (Email)</label>
              <input
                type="email" id="login-email" className="admin-input" required
                value={email} onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="admin-label" htmlFor="login-password">Mot de passe</label>
              <input
                type="password" id="login-password" className="admin-input" required
                value={password} onChange={e => setPassword(e.target.value)}
              />
            </div>
            <button
              type="submit" disabled={loggingIn}
              className="w-full py-1.5 bg-blue-900 text-white font-bold border border-blue-950 hover:bg-blue-800 transition"
            >
              {loggingIn ? 'Validation...' : "Valider l'accès"}
            </button>
          </form>

          <div className="border-t border-slate-300 pt-4 space-y-2">
            <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider text-center">
              Accès de démonstration (ERP)
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { label: 'ADMIN', email: 'admin@fleet.com', pass: 'admin123' },
                { label: 'GESTIONNAIRE', email: 'manager@fleet.com', pass: 'manager123' },
                { label: 'CONSULTATION', email: 'viewer@fleet.com', pass: 'viewer123' },
              ].map(r => (
                <button
                  key={r.label}
                  onClick={() => handleQuickLogin(r.email, r.pass)}
                  className="px-1.5 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 text-[9px] font-bold border border-slate-300 text-center"
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Main menu items ──
  const menuItems = [
    { id: 'dashboard', label: 'Tableau de bord' },
    { id: 'quick_actions', label: 'Actions rapides' },
    { id: 'vehicles', label: 'Véhicules' },
    { id: 'personnel', label: 'Personnel' },
    { id: 'missions', label: 'Missions' },
    { id: 'maintenance', label: 'Maintenance' },
    { id: 'reports', label: 'Rapports PDF' },
    { id: 'gps_tracking', label: '🗺 Suivi GPS' },
    { id: 'driver_interface', label: '📱 Interface Chauffeur' },
  ];

  const tabTitles: Record<string, string> = {
    dashboard: 'Statut global de la flotte',
    quick_actions: 'Raccourcis & Actions rapides',
    vehicles: 'Inventaire des véhicules',
    personnel: 'Registre du personnel',
    missions: 'Missions & Ordres de route',
    maintenance: 'Suivi entretien & Atelier',
    reports: 'Rapports & Exports PDF',
    gps_tracking: 'Suivi GPS — Vue Gestionnaire',
    driver_interface: 'Interface Chauffeur Mobile',
  };

  const renderView = () => {
    switch (activeTab) {
      case 'dashboard':        return <Dashboard />;
      case 'quick_actions':    return <QuickActions />;
      case 'vehicles':         return <Vehicles />;
      case 'personnel':        return <Personnel />;
      case 'missions':         return <Missions />;
      case 'maintenance':      return <Maintenance />;
      case 'reports':          return <Reports />;
      case 'gps_tracking':     return <GPSTracking />;
      case 'driver_interface': return (
        <div className="flex justify-center py-4">
          <div style={{ width: 430, border: '2px solid #cbd5e1', borderRadius: 8, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.1)' }}>
            {/* Phone chrome */}
            <div style={{ background: '#1e3a5f', color: '#fff', padding: '6px 12px', fontSize: 10, fontWeight: 700, textAlign: 'center', letterSpacing: 1 }}>
              📱 PRÉVISUALISATION MOBILE — Interface Chauffeur
            </div>
            <MobileDriverApp />
          </div>
        </div>
      );
      default:                 return <Dashboard />;
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100 text-slate-900 font-sans text-xs">

      {/* Header */}
      <header className="h-[40px] bg-blue-900 text-white flex items-center justify-between px-4 no-print border-b border-blue-950 select-none">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1 border border-blue-800 hover:bg-blue-800 rounded-sm"
          >
            <Menu size={14} />
          </button>
          <span className="font-extrabold text-sm uppercase tracking-wider text-white">FLEETMANAGER</span>
          <span className="text-blue-700">|</span>
          <span className="font-bold text-blue-200 truncate max-w-[200px]">{tabTitles[activeTab]}</span>
        </div>

        <div className="flex items-center gap-4 text-[11px]">
          <span className="hidden sm:inline">Agent: <strong className="text-white">{user.displayName}</strong></span>
          <span className="text-blue-400 hidden sm:inline">|</span>
          <span className="hidden sm:inline">Rôle: <strong className="text-blue-200">{user.role}</strong></span>
          <button
            onClick={logoutUser}
            className="px-2 py-0.5 bg-blue-950 border border-blue-800 text-white text-[10px] font-bold hover:bg-blue-900 transition"
          >
            Déconnexion
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">

        {/* Desktop sidebar */}
        <aside className="hidden md:flex flex-col w-[200px] bg-slate-100 border-r border-slate-300 select-none">
          <div className="p-3 bg-slate-200/55 border-b border-slate-300">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Menu Principal</span>
          </div>

          <nav className="flex-1 py-2 px-1 space-y-0.5 overflow-y-auto">
            {menuItems.map(item => {
              const isActive = activeTab === item.id;
              const isGPS = item.id === 'gps_tracking' || item.id === 'driver_interface';
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full text-left px-3 py-2 text-xs font-semibold border-l-4 transition ${
                    isActive
                      ? 'bg-white border-blue-800 text-blue-900 font-bold shadow-sm'
                      : isGPS
                      ? 'border-transparent text-emerald-700 hover:bg-emerald-50 hover:text-emerald-900'
                      : 'border-transparent text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Role switcher */}
          <div className="p-3 border-t border-slate-300 bg-slate-50 space-y-2">
            <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Sélection Rôle</span>
            <div className="flex flex-col gap-1">
              {[
                { label: 'Administrateur', email: 'admin@fleet.com', pass: 'admin123', active: user?.role === 'Administrateur', cls: 'bg-rose-100 border-rose-300 text-rose-800' },
                { label: 'Gestionnaire', email: 'manager@fleet.com', pass: 'manager123', active: user?.role === 'Gestionnaire', cls: 'bg-amber-100 border-amber-300 text-amber-800' },
                { label: 'Consultation', email: 'viewer@fleet.com', pass: 'viewer123', active: user?.role === 'Consultation', cls: 'bg-emerald-100 border-emerald-300 text-emerald-800' },
              ].map(r => (
                <button
                  key={r.label}
                  onClick={() => handleQuickLogin(r.email, r.pass)}
                  className={`w-full text-left px-2 py-1 text-[10px] font-bold border transition ${
                    r.active ? r.cls : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Mobile drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            <div className="fixed inset-0 bg-black/30" onClick={() => setMobileMenuOpen(false)} />
            <div className="relative w-[200px] bg-slate-100 border-r border-slate-300 flex flex-col h-full z-50">
              <div className="flex justify-between items-center bg-blue-900 text-white p-3 border-b border-blue-950">
                <span className="font-bold text-xs">MENU</span>
                <button onClick={() => setMobileMenuOpen(false)} className="text-white"><X size={16} /></button>
              </div>
              <nav className="flex-1 py-2 px-1 space-y-0.5 overflow-y-auto">
                {menuItems.map(item => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => { setActiveTab(item.id); setMobileMenuOpen(false); }}
                      className={`w-full text-left px-3 py-2 text-xs font-semibold border-l-4 transition ${
                        isActive
                          ? 'bg-white border-blue-800 text-blue-900 font-bold'
                          : 'border-transparent text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </nav>
              <div className="p-3 border-t border-slate-300 space-y-1">
                {[
                  { label: 'Administrateur', email: 'admin@fleet.com', pass: 'admin123' },
                  { label: 'Gestionnaire', email: 'manager@fleet.com', pass: 'manager123' },
                  { label: 'Consultation', email: 'viewer@fleet.com', pass: 'viewer123' },
                ].map(r => (
                  <button
                    key={r.label}
                    onClick={() => { handleQuickLogin(r.email, r.pass); setMobileMenuOpen(false); }}
                    className={`w-full text-left px-2 py-1 text-[10px] font-bold border ${user?.role === r.label ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-white border-slate-200 text-slate-600'}`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4 bg-slate-50">
          <div className="max-w-full mx-auto">
            {renderView()}
          </div>
        </main>
      </div>
    </div>
  );
}

// ─── Root App with device detection ─────────────────────────────────────────
function AppRoot() {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <MobileShell />;
  }
  return <DesktopShell />;
}

export default function App() {
  return (
    <AppProvider>
      <AppRoot />
    </AppProvider>
  );
}
