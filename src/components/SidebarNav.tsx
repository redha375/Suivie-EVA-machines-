import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { canUserAccessTab } from '../utils/rbacEngine';
import {
  LayoutDashboard,
  Factory,
  Lock,
  Boxes,
  Briefcase,
  Wrench,
  Cog,
  Camera,
  Zap,
  ShieldAlert,
  Users,
  FileBarChart2,
  FileText,
  Settings,
  Bell,
  Database,
  ShieldCheck,
  Mail,
  FileSpreadsheet,
  Layers,
  CircleDollarSign,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react';

export const SidebarNav: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    t,
    hasPermission,
    alerts,
    maintenanceTickets,
    qualityRecords,
    currentUser,
    ctpStock,
    cartonsReadyToCloseCount,
    wipOpenAlert,
  } = useApp();

  const [showSecondaryModules, setShowSecondaryModules] = useState<boolean>(false);

  const openTicketsCount = maintenanceTickets.filter((t) => t.status !== 'resolu').length;
  const openQualityCount = qualityRecords.filter((q) => q.status !== 'resolu').length;
  const unreadAlertsCount = alerts.filter((a) => !a.read).length;
  const lowStockCount = ctpStock.filter((s) => s.stock_cartons < 10).length;

  // 6 Interfaces Officielles CTP Chaussures 2026 + Module Pilotage EVA 12 Stations + Production Tracker
  const ctp6Menus = [
    {
      id: 'ctp_tracker',
      label: '🎯 CTP Production Tracker',
      icon: Target,
      badge: 'Auto & Rôles',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      color: 'text-amber-400',
    },
    {
      id: 'machine_eva',
      label: '⚡ Machine EVA (12 Stations)',
      icon: Factory,
      badge: 'EVA 1/2/3',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
      color: 'text-indigo-400',
    },
    {
      id: 'ctp_production',
      label: '1. Production (Saisie A/B)',
      icon: Factory,
      badge: 'Atelier EVA',
      color: 'text-blue-400',
    },
    {
      id: 'ctp_flow',
      label: '2. Flux Réel (3 Étapes)',
      icon: Layers,
      badge: 'Calcul Réel',
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      color: 'text-purple-400',
    },
    {
      id: 'ctp_fermeture',
      label: '3. Fermeture (Équipe C)',
      icon: Lock,
      badge: cartonsReadyToCloseCount > 0 ? `${cartonsReadyToCloseCount} prêts` : (wipOpenAlert ? '⚠️ Alerte WIP' : 'Clôture C'),
      badgeColor: cartonsReadyToCloseCount > 0
        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
        : wipOpenAlert
        ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
        : undefined,
      color: 'text-amber-400',
    },
    {
      id: 'ctp_stock',
      label: '4. Stock (Vue Auto)',
      icon: Boxes,
      badge: lowStockCount > 0 ? `${lowStockCount} alerte(s)` : 'Base 12',
      badgeColor: lowStockCount > 0 ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' : undefined,
      color: 'text-emerald-400',
    },
    {
      id: 'ctp_commercial',
      label: '5. Commercial & Ventes',
      icon: Briefcase,
      badge: 'BL & Facture',
      color: 'text-cyan-400',
    },
    {
      id: 'ctp_maintenance',
      label: '6. Maintenance & Pannes',
      icon: Wrench,
      badge: 'Compteurs',
      color: 'text-orange-400',
    },
    {
      id: 'ctp_dashboard',
      label: '7. Tableau de Bord CTP',
      icon: LayoutDashboard,
      badge: 'KPIs Usine',
      color: 'text-indigo-400',
    },
  ];

  const secondaryNavItems = [
    { id: 'pnl', label: 'P&L Management', icon: CircleDollarSign, perm: 'pnl', badge: '💰 P&L' },
    { id: 'fiche_ocr', label: 'Fiche Prod. IA (OCR)', icon: FileSpreadsheet, perm: 'production', badge: 'IA OCR' },
    { id: 'counter_scanner', label: t('navCounterScanner'), icon: Camera, perm: 'counter_scanner', badge: 'IA' },
    { id: 'fast_entry', label: '1Click – Production', icon: Zap, perm: 'fast_entry', badge: '1-Clic' },
    { id: 'quality', label: t('navQuality'), icon: ShieldAlert, perm: 'quality', count: openQualityCount },
    { id: 'raw_materials', label: 'Matières Premières', icon: Boxes, perm: 'stock', badge: 'Stock' },
    { id: 'hr', label: t('navHR'), icon: Users, perm: 'hr' },
    { id: 'reports', label: t('navReports'), icon: FileBarChart2, perm: 'reports' },
    { id: 'model_master', label: 'Model Master 2026', icon: Layers, perm: 'referentials', badge: 'Articles' },
    { id: 'gmail', label: 'Messagerie Gmail', icon: Mail, perm: 'dashboard', badge: 'Google' },
    { id: 'referentials', label: 'Référentiels Industriels', icon: Database, perm: 'referentials' },
    { id: 'roles_permissions', label: 'Gestion Permissions', icon: ShieldCheck, perm: 'roles_permissions' },
    { id: 'notifications', label: t('notifications'), icon: Bell, perm: 'dashboard', count: unreadAlertsCount },
    { id: 'settings', label: t('navSettings'), icon: Settings, perm: 'settings' },
  ];

  const userInitials = currentUser?.name
    ? currentUser.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()
    : 'JD';

  return (
    <aside className="no-print hidden lg:flex w-64 bg-[#0F172A] text-white flex-col shrink-0 h-full border-r border-slate-800 shadow-xl z-20">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-700 bg-slate-900/80">
        <div className="flex items-center gap-2.5">
          <img
            src="/ctp-shoe-logo.png"
            alt="Logo CTP Chaussures"
            className="w-10 h-10 rounded-xl object-cover border border-blue-500/30 shadow-md shrink-0"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <div>
            <h1 className="text-sm font-extrabold tracking-tight text-white font-mono leading-tight">
              CTP SMART ERP
            </h1>
            <p className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider">
              Chaussures & Injection EVA
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 py-4 overflow-y-auto space-y-4">
        {/* LES 6 INTERFACES PRINCIPALES CTP */}
        <div>
          <div className="px-5 mb-2 text-[11px] font-extrabold text-blue-400 uppercase tracking-wider flex items-center justify-between">
            <span>Interfaces Usine CTP</span>
            <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-[9px] text-blue-300 font-mono">CTP-2026</span>
          </div>

          <div className="space-y-1">
            {ctp6Menus.filter((item) => canUserAccessTab(currentUser, item.id)).map((item) => {
              const Icon = item.icon;
              // Support both 'ctp_xxx' and short aliases
              const isActive =
                activeTab === item.id ||
                (item.id === 'machine_eva' && (activeTab === 'eva_machine' || activeTab === 'eva' || activeTab === 'eva_stations' || activeTab === 'eva_pilotage')) ||
                (item.id === 'ctp_production' && activeTab === 'production') ||
                (item.id === 'ctp_flow' && (activeTab === 'flow' || activeTab === 'flux_cartons')) ||
                (item.id === 'ctp_fermeture' && activeTab === 'fermeture') ||
                (item.id === 'ctp_stock' && activeTab === 'stock') ||
                (item.id === 'ctp_commercial' && activeTab === 'commercial') ||
                (item.id === 'ctp_maintenance' && activeTab === 'maintenance') ||
                (item.id === 'ctp_dashboard' && activeTab === 'dashboard');

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-5 py-3 text-sm transition-all text-left rtl:text-right ${
                    isActive
                      ? 'bg-blue-600/20 border-l-4 border-blue-500 text-white font-bold rtl:border-l-0 rtl:border-r-4 shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white font-medium'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : item.color}`} />
                    <span className="truncate">{item.label}</span>
                  </div>

                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      item.badgeColor
                        ? item.badgeColor
                        : isActive
                        ? 'bg-blue-500/30 text-blue-200'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* SUIVI D'ATELIER & RÉFÉRENTIEL MODÈLES (ACCÈS DIRECT ET CLAIR) */}
        {(canUserAccessTab(currentUser, 'team_evaluation') ||
          canUserAccessTab(currentUser, 'fiche_suivi') ||
          canUserAccessTab(currentUser, 'model_master')) && (
          <div className="pt-2 border-t border-slate-800/80">
            <div className="px-5 mb-2 text-[11px] font-extrabold text-emerald-400 uppercase tracking-wider flex items-center justify-between">
              <span>Suivi & Modèles CTP</span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-[9px] text-emerald-300 font-mono">DIRECT</span>
            </div>

            <div className="space-y-1">
              {canUserAccessTab(currentUser, 'team_evaluation') && (
                <button
                  onClick={() => setActiveTab('team_evaluation')}
                  className={`w-full flex items-center justify-between px-5 py-3 text-sm transition-all text-left rtl:text-right ${
                    activeTab === 'team_evaluation' || activeTab === 'evaluation_equipes' || activeTab === 'evaluation'
                      ? 'bg-blue-600/20 border-l-4 border-blue-500 text-white font-bold rtl:border-l-0 rtl:border-r-4 shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white font-medium'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Users className="w-4 h-4 text-blue-400" />
                    <span className="truncate">Évaluation Équipes A/B/C</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    A / B / C
                  </span>
                </button>
              )}

              {canUserAccessTab(currentUser, 'fiche_suivi') && (
                <button
                  onClick={() => setActiveTab('fiche_suivi')}
                  className={`w-full flex items-center justify-between px-5 py-3 text-sm transition-all text-left rtl:text-right ${
                    activeTab === 'fiche_suivi' || activeTab === 'fiche_production'
                      ? 'bg-emerald-600/20 border-l-4 border-emerald-500 text-white font-bold rtl:border-l-0 rtl:border-r-4 shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white font-medium'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    <span className="truncate">Fiche Suivi Production</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Atelier
                  </span>
                </button>
              )}

              {canUserAccessTab(currentUser, 'model_master') && (
                <button
                  onClick={() => setActiveTab('model_master')}
                  className={`w-full flex items-center justify-between px-5 py-3 text-sm transition-all text-left rtl:text-right ${
                    activeTab === 'model_master' || activeTab === 'modeles_produits'
                      ? 'bg-blue-600/20 border-l-4 border-blue-500 text-white font-bold rtl:border-l-0 rtl:border-r-4 shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white font-medium'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Boxes className="w-4 h-4 text-blue-400" />
                    <span className="truncate">Modèles Produits</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    Catalogue
                  </span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* SECTION COLLAPSIBLE : AUTRES MODULES COMPATIBILITÉ */}
        <div className="pt-2 border-t border-slate-800/80">
          <button
            onClick={() => setShowSecondaryModules(!showSecondaryModules)}
            className="w-full px-5 py-2 flex items-center justify-between text-[11px] font-semibold text-slate-400 hover:text-slate-200 uppercase tracking-wider transition-colors"
          >
            <span>Autres Modules ({secondaryNavItems.length})</span>
            {showSecondaryModules ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>

          {showSecondaryModules && (
            <div className="space-y-0.5 mt-1 animate-fade-in">
              {secondaryNavItems
                .filter((item) => canUserAccessTab(currentUser, item.id))
                .map((item) => {
                  if (item.perm && !hasPermission(item.perm)) return null;
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center justify-between px-5 py-2 text-xs transition-colors text-left rtl:text-right ${
                      isActive
                        ? 'bg-slate-800 text-blue-400 font-bold'
                        : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-400' : 'text-slate-500'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.badge && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-800 text-slate-400">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </nav>

      {/* Sleek User Profile Footer */}
      <div className="p-4 bg-slate-900/90 border-t border-slate-800">
        <div className="flex items-center">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-sm">
            {userInitials}
          </div>
          <div className="ml-3 rtl:ml-0 rtl:mr-3 overflow-hidden">
            <p className="text-xs font-bold truncate text-white">{currentUser?.name || 'Responsable ERP CTP'}</p>
            <p className="text-[10px] text-emerald-400 font-medium truncate">
              Atelier EVA 1 / EVA 2 / EVA 3
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};

