import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Factory,
  Shield,
  Clock,
  Wifi,
  WifiOff,
  Bell,
  Globe,
  RefreshCw,
  UserCheck,
  ChevronDown,
  Sparkles,
  Search,
  Mail,
  FileSpreadsheet,
  Boxes,
  Target,
  LogOut,
} from 'lucide-react';
import { UserRole, ShiftType } from '../types';
import { PWAInstallButton } from './pwa/PWAInstallButton';

export const HeaderNavbar: React.FC = () => {
  const {
    language,
    setLanguage,
    t,
    activeTenant,
    setActiveTenant,
    tenants,
    currentUser,
    setCurrentUser,
    users,
    isOnline,
    pendingSyncCount,
    triggerManualSync,
    alerts,
    setActiveTab,
    login,
    logout,
  } = useApp();

  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentShift, setCurrentShift] = useState<ShiftType>('matin');
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showTenantMenu, setShowTenantMenu] = useState(false);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);

  // Live clock and automatic shift calculation
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const seconds = now.getSeconds().toString().padStart(2, '0');
      setCurrentTime(`${hours.toString().padStart(2, '0')}:${minutes}:${seconds}`);

      if (hours >= 6 && hours < 14) {
        setCurrentShift('matin');
      } else if (hours >= 14 && hours < 22) {
        setCurrentShift('soir');
      } else {
        setCurrentShift('nuit');
      }
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const unreadAlerts = alerts.filter((a) => !a.read);

  const getShiftBadge = () => {
    switch (currentShift) {
      case 'matin':
        return { label: t('shiftMatin'), color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
      case 'soir':
        return { label: t('shiftSoir'), color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
      case 'nuit':
        return { label: t('shiftNuit'), color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' };
    }
  };

  const shiftInfo = getShiftBadge();

  return (
    <header className="no-print h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-8 text-slate-900 sticky top-0 z-30 shadow-xs">
      <div className="flex items-center space-x-3 sm:space-x-4">
        {/* Search Bar matching Sleek Interface design */}
        <div className="relative">
          <input
            type="text"
            placeholder="Rechercher..."
            className="pl-10 pr-4 py-1.5 sm:py-2 bg-slate-100 rounded-lg text-sm border-none focus:ring-2 focus:ring-blue-500 w-36 sm:w-64 text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2 sm:top-2.5" />
        </div>

        {/* Language Switcher pill */}
        <div className="flex border border-slate-200 rounded-lg overflow-hidden bg-white shadow-xs">
          <button
            onClick={() => setLanguage('fr')}
            className={`px-3 py-1 text-xs transition-colors font-bold ${
              language === 'fr'
                ? 'bg-slate-100 text-blue-600 border-r border-slate-200'
                : 'hover:bg-slate-50 text-slate-600 border-r border-slate-200'
            }`}
          >
            FR
          </button>
          <button
            onClick={() => setLanguage('ar')}
            className={`px-3 py-1 text-xs transition-colors font-bold ${
              language === 'ar' ? 'bg-slate-100 text-blue-600' : 'hover:bg-slate-50 text-slate-600'
            }`}
          >
            عربي
          </button>
        </div>
      </div>

      {/* Center / Right Badges and Controls */}
      <div className="flex items-center space-x-2 sm:space-x-4">
        {/* Quick Access to Production Tracker, Fiche de Suivi & Modèles Produits */}
        <div className="hidden xl:flex items-center gap-2">
          <button
            onClick={() => setActiveTab('ctp_tracker')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-black transition shadow-2xs"
            title="CTP SMART Production Tracker - Saisie & Calcul Auto"
          >
            <Target className="w-3.5 h-3.5 text-amber-600" />
            <span>🎯 Production Tracker</span>
          </button>

          <button
            onClick={() => setActiveTab('fiche_suivi')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 rounded-lg text-xs font-bold transition shadow-2xs"
            title="Accès direct à la Fiche de Suivi de Production"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Fiche de Suivi</span>
          </button>

          <button
            onClick={() => setActiveTab('model_master')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200/80 rounded-lg text-xs font-bold transition shadow-2xs"
            title="Consulter et gérer les Modèles Produits"
          >
            <Boxes className="w-3.5 h-3.5 text-blue-600" />
            <span>Modèles Produits</span>
          </button>
        </div>

        {/* Shift and Factory Badges */}
        <div className="flex items-center space-x-2">
          <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse" />
            USINE ACTIVE
          </span>
          <span className="hidden sm:inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
            {shiftInfo.label}
          </span>
        </div>

        {/* Tenant Switcher */}
        <div className="relative">
          <button
            onClick={() => setShowTenantMenu(!showTenantMenu)}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium transition"
            title={t('switchTenant')}
          >
            <Factory className="w-3.5 h-3.5 text-blue-600" />
            <span className="max-w-[100px] truncate font-semibold">{activeTenant.code}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showTenantMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-50">
              <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase">
                {t('tenantLabel')}
              </div>
              {tenants.map((ten) => (
                <button
                  key={ten.id}
                  onClick={() => {
                    setActiveTenant(ten);
                    setShowTenantMenu(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs flex flex-col transition ${
                    activeTenant.id === ten.id
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>{ten.name}</span>
                  <span className="text-[10px] text-slate-400">
                    {ten.city} • {ten.code}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Online / Offline Sync status */}
        <div className="flex items-center">
          {isOnline ? (
            <button
              onClick={triggerManualSync}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-medium"
              title={pendingSyncCount > 0 ? `${pendingSyncCount} ${t('pendingSync')}` : t('synced')}
            >
              <Wifi className="w-3 h-3" />
              <span className="hidden xl:inline">
                {pendingSyncCount > 0 ? `${pendingSyncCount} ${t('pendingSync')}` : t('online')}
              </span>
              {pendingSyncCount > 0 && <RefreshCw className="w-3 h-3 animate-spin text-amber-500 ml-1" />}
            </button>
          ) : (
            <div
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-medium animate-pulse"
              title={t('offline')}
            >
              <WifiOff className="w-3 h-3" />
              <span className="hidden sm:inline">{t('offline')}</span>
            </div>
          )}
        </div>

        {/* PWA Install / Launchpad Button */}
        <PWAInstallButton variant="header" />

        {/* Gmail Quick Access */}
        <button
          onClick={() => setActiveTab('gmail')}
          className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition"
          title="Messagerie Gmail"
        >
          <Mail className="w-5 h-5 text-slate-600" />
        </button>

        {/* Notification Bell matching Design HTML */}
        <div className="relative">
          <button
            onClick={() => setShowNotificationMenu(!showNotificationMenu)}
            className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition"
            title={t('notifications')}
          >
            <Bell className="w-5 h-5 text-slate-600" />
            {unreadAlerts.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
            )}
          </button>

          {showNotificationMenu && (
            <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50">
              <div className="flex items-center justify-between px-3 pb-2 border-b border-slate-100">
                <span className="text-xs font-semibold text-slate-800">{t('notifications')}</span>
                <button
                  onClick={() => {
                    setActiveTab('notifications');
                    setShowNotificationMenu(false);
                  }}
                  className="text-[11px] text-blue-600 hover:underline font-medium"
                >
                  Voir tout
                </button>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                {alerts.slice(0, 4).map((alert) => (
                  <div
                    key={alert.id}
                    onClick={() => {
                      if (alert.linkTab) setActiveTab(alert.linkTab);
                      setShowNotificationMenu(false);
                    }}
                    className="p-2.5 text-xs hover:bg-slate-50 cursor-pointer transition"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`font-semibold ${
                          alert.severity === 'danger'
                            ? 'text-rose-600'
                            : alert.severity === 'warning'
                            ? 'text-amber-600'
                            : 'text-blue-600'
                        }`}
                      >
                        {alert.title}
                      </span>
                      <span className="text-[10px] text-slate-400">{alert.timestamp.split(' ')[1] || ''}</span>
                    </div>
                    <p className="text-slate-600 text-[11px] mt-0.5 line-clamp-2">{alert.message}</p>
                  </div>
                ))}
                {alerts.length === 0 && (
                  <div className="p-4 text-center text-xs text-slate-400">{t('allCaughtUp')}</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* User & Role Switcher */}
        <div className="flex items-center gap-2">
          {currentUser.assignedMachine && currentUser.assignedMachine !== 'Toutes' && (
            <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-mono font-bold px-2 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
              <Factory className="w-3 h-3 text-blue-600" />
              <span>{currentUser.assignedMachine}</span>
              {currentUser.unite && currentUser.unite !== 'Toutes' && (
                <span className="text-[9px] text-blue-500">({currentUser.unite})</span>
              )}
            </span>
          )}

          {currentUser.assignedShift && (
            <span className="hidden lg:inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md bg-purple-50 text-purple-700 border border-purple-200 uppercase">
              <Clock className="w-3 h-3 text-purple-600" />
              <span>Shift {currentUser.assignedShift}</span>
              {currentUser.assignedEquipe && (
                <span className="text-purple-500 font-bold">({currentUser.assignedEquipe})</span>
              )}
            </span>
          )}

          <div className="relative">
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className="flex items-center gap-2 pl-2 pr-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 transition cursor-pointer"
              title={t('switchRole')}
            >
              <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-xs">
                {currentUser.name.charAt(0)}
              </div>
              <div className="hidden sm:flex flex-col text-left rtl:text-right">
                <span className="text-xs font-semibold text-slate-800 leading-tight">{currentUser.name}</span>
                <span className="text-[10px] text-slate-500 leading-none">
                  {t(`role_${currentUser.role}` as any)}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showRoleMenu && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-50">
                <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">{t('switchRole')}</span>
                  <span className="text-[10px] text-blue-600 font-medium flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Postes Usine CTP
                  </span>
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                  {users.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        login(u);
                        setShowRoleMenu(false);
                      }}
                      className={`w-full text-left rtl:text-right px-3 py-2 text-xs flex items-center justify-between transition cursor-pointer ${
                        currentUser.id === u.id
                          ? 'bg-blue-50 text-blue-700 font-semibold'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <div className="font-medium text-slate-800 flex items-center gap-1.5">
                          <span>{u.name}</span>
                          {u.assignedMachine && u.assignedMachine !== 'Toutes' && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200 font-mono">
                              {u.assignedMachine}
                            </span>
                          )}
                        </div>
                        <div className={`text-[10px] ${currentUser.id === u.id ? 'text-blue-600' : 'text-slate-400'}`}>
                          {t(`role_${u.role}` as any)} • {u.matricule}
                          {u.assignedShift ? ` • Shift ${u.assignedShift.toUpperCase()}` : ''}
                        </div>
                      </div>
                      {currentUser.id === u.id && <UserCheck className="w-4 h-4 text-blue-600" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Déconnexion button */}
          <button
            onClick={logout}
            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition cursor-pointer"
            title="Déconnexion (Terminer la session)"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
