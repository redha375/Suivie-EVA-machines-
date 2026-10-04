import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { HeaderNavbar } from './components/HeaderNavbar';
import { SidebarNav } from './components/SidebarNav';

// CTP Factory ERP 2026 Core 6 Interfaces
import { CtpProductionView } from './components/ctp/CtpProductionView';
import { CtpCartonFlowView } from './components/ctp/CtpCartonFlowView';
import { CtpFermetureView } from './components/ctp/CtpFermetureView';
import { CtpStockView } from './components/ctp/CtpStockView';
import { CtpCommercialView } from './components/ctp/CtpCommercialView';
import { CtpMaintenanceView } from './components/ctp/CtpMaintenanceView';
import { CtpDashboardView } from './components/ctp/CtpDashboardView';
import { EvaMachinePilotageView } from './components/ctp/EvaMachinePilotageView';
import { CtpProductionTrackerView } from './components/tracker/CtpProductionTrackerView';

// Secondary & Auxiliary Views
import { CounterScannerModal } from './components/CounterScannerModal';
import { FastEntryView } from './components/FastEntryView';
import { QualityView } from './components/QualityView';
import { HRView } from './components/HRView';
import { ReportsView } from './components/ReportsView';
import { AdminView } from './components/AdminView';
import { GmailView } from './components/GmailView';
import { FicheProductionOcrView } from './components/production/FicheProductionOcrView';
import { FicheSuiviProductionView } from './components/production/FicheSuiviProductionView';
import { TeamEvaluationView } from './components/production/TeamEvaluationView';
import { ModelMasterView } from './components/referentials/ModelMasterView';
import { PnlManagementView } from './components/PnlManagementView';
import { RawMaterialsView } from './components/stock/RawMaterialsView';
import { LoginView } from './components/auth/LoginView';
import { canUserAccessTab } from './utils/rbacEngine';
import { PWAInstallButton } from './components/pwa/PWAInstallButton';
import {
  Factory,
  Lock,
  Boxes,
  Briefcase,
  Wrench,
  LayoutDashboard,
  Zap,
  ShieldAlert,
  ArrowLeft,
} from 'lucide-react';

const AppContent: React.FC = () => {
  const { currentTab, setCurrentTab, isRtl, t, isAuthenticated, currentUser } = useApp();

  if (!isAuthenticated) {
    return <LoginView />;
  }

  // Security Check: is current user authorized for this tab?
  const isAuthorized = canUserAccessTab(currentUser, currentTab || 'dashboard');

  const renderActiveView = () => {
    if (!isAuthorized) {
      return (
        <div className="min-h-[500px] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white border border-rose-200 rounded-2xl p-6 sm:p-8 text-center shadow-lg">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-1">Accès Restreint</h2>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Votre compte <strong className="text-slate-900">{currentUser.name}</strong> ({currentUser.matricule}) avec le rôle{' '}
              <span className="font-semibold text-rose-600">[{currentUser.role}]</span> n'est pas habilité à consulter ce module conformément aux règles de sécurité de l'usine CTP SMART.
            </p>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 mb-5 text-left rtl:text-right">
              <div>• Machine assignée : <strong className="text-slate-700">{currentUser.assignedMachine || 'Toutes'}</strong></div>
              <div>• Shift assigné : <strong className="text-slate-700">{currentUser.assignedShift ? currentUser.assignedShift.toUpperCase() : 'Tous'}</strong></div>
              <div>• Unité : <strong className="text-slate-700">{currentUser.unite || 'Toutes'}</strong></div>
            </div>
            <button
              onClick={() => {
                if (currentUser.role === 'chef_equipe' || currentUser.role === 'gerant') {
                  setCurrentTab?.('ctp_tracker');
                } else if (currentUser.role === 'resp_qualite') {
                  setCurrentTab?.('quality');
                } else if (currentUser.role === 'rh') {
                  setCurrentTab?.('hr');
                } else {
                  setCurrentTab?.('ctp_dashboard');
                }
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" />
              <span>Retourner à mon interface autorisée</span>
            </button>
          </div>
        </div>
      );
    }

    switch (currentTab) {
      // 1. Interface Production (Saisie Équipes A et B)
      case 'ctp_production':
      case 'production':
        return <CtpProductionView />;

      // 2. Flux Réel des Cartons (3 Étapes / Couleurs sans double comptage)
      case 'ctp_flow':
      case 'flux_cartons':
      case 'flow':
        return <CtpCartonFlowView />;

      // 3. Interface Fermeture & Clôture (Équipe C UNIQUEMENT)
      case 'ctp_fermeture':
      case 'fermeture':
        return <CtpFermetureView />;

      // 3. Interface Stock (Vue Calculée Automatique & Base 12)
      case 'ctp_stock':
      case 'stock':
        return <CtpStockView />;

      // 4. Interface Commercial (Ventes & BL / Facture PDF)
      case 'ctp_commercial':
      case 'commercial':
        return <CtpCommercialView />;

      // 5. Interface Maintenance (Compteurs & Rendement EVA 1/2/3)
      case 'ctp_maintenance':
      case 'maintenance':
        return <CtpMaintenanceView />;

      // 6. Tableau de Bord (Dashboard CTP Usine)
      case 'ctp_dashboard':
      case 'dashboard':
        return <CtpDashboardView />;

      // CTP SMART Production Tracker - Système de suivi Production & Qualité
      case 'ctp_tracker':
      case 'production_tracker':
      case 'tracker':
        return <CtpProductionTrackerView />;

      // Système de Pilotage Industriel Machine EVA (12 Stations)
      case 'machine_eva':
      case 'eva_machine':
      case 'eva_pilotage':
      case 'eva':
      case 'eva_stations':
        return <EvaMachinePilotageView />;

      // Auxiliary Modules
      case 'team_evaluation':
      case 'evaluation_equipes':
      case 'evaluation':
        return <TeamEvaluationView />;
      case 'fiche_suivi':
      case 'fiche_production':
      case 'suivi_production':
        return <FicheSuiviProductionView />;
      case 'fiche_ocr':
        return <FicheProductionOcrView />;
      case 'counter_scanner':
      case 'scanner':
        return <CounterScannerModal />;
      case 'fast_entry':
        return <FastEntryView />;
      case 'quality':
        return <QualityView />;
      case 'raw_materials':
      case 'raw_materials_stock':
        return <RawMaterialsView />;
      case 'hr':
      case 'rh':
        return <HRView />;
      case 'reports':
        return <ReportsView />;
      case 'pnl':
      case 'pnl_management':
        return <PnlManagementView />;
      case 'model_master':
      case 'modeles_produits':
      case 'modeles':
        return <ModelMasterView />;
      case 'gmail':
        return <GmailView />;
      case 'admin':
      case 'settings':
      case 'referentials':
      case 'roles_permissions':
      case 'audit':
      case 'notifications':
        return <AdminView />;
      default:
        return <CtpDashboardView />;
    }
  };

  return (
    <div
      className={`h-screen w-full flex bg-[#F8FAFC] text-slate-900 font-sans overflow-hidden ${
        isRtl ? 'rtl' : 'ltr'
      }`}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Left / Right (RTL) Sleek Dark Factory Sidebar */}
      <SidebarNav />

      {/* Main Column: HeaderNavbar on top + Scrollable Content */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <HeaderNavbar />

        {/* Dynamic Content Surface */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 bg-[#F8FAFC]">
          <div className="max-w-7xl mx-auto pb-16 lg:pb-0">
            {renderActiveView()}
          </div>
        </main>
      </div>

      {/* Bottom Floating Bar on Mobile for Quick Workshop Floor Access (6 CTP Menus) */}
      <div className="no-print lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-2 py-2 flex items-center justify-around shadow-2xl">
        <button
          onClick={() => setCurrentTab?.('ctp_production')}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold transition ${
            currentTab === 'ctp_production' || currentTab === 'production'
              ? 'text-blue-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Factory className="w-4 h-4" />
          <span>Production</span>
        </button>

        <button
          onClick={() => setCurrentTab?.('ctp_fermeture')}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold transition ${
            currentTab === 'ctp_fermeture' || currentTab === 'fermeture'
              ? 'text-purple-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>Fermeture</span>
        </button>

        <button
          onClick={() => setCurrentTab?.('ctp_stock')}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold transition ${
            currentTab === 'ctp_stock' || currentTab === 'stock'
              ? 'text-amber-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>Stock</span>
        </button>

        <button
          onClick={() => setCurrentTab?.('ctp_commercial')}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold transition ${
            currentTab === 'ctp_commercial' || currentTab === 'commercial'
              ? 'text-emerald-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>Commercial</span>
        </button>

        <button
          onClick={() => setCurrentTab?.('ctp_maintenance')}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold transition ${
            currentTab === 'ctp_maintenance' || currentTab === 'maintenance'
              ? 'text-orange-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span>Maintenance</span>
        </button>

        <button
          onClick={() => setCurrentTab?.('ctp_dashboard')}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold transition ${
            currentTab === 'ctp_dashboard' || currentTab === 'dashboard'
              ? 'text-blue-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Dashboard</span>
        </button>
      </div>

      {/* Floating PWA Download / Field Launchpad Button */}
      <PWAInstallButton variant="floating" />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
