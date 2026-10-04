import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { User } from '../../types';
import { PWAInstallButton } from '../pwa/PWAInstallButton';
import {
  Factory,
  Shield,
  KeyRound,
  UserCheck,
  Sparkles,
  Lock,
  ArrowRight,
  CheckCircle2,
  Clock,
  Layers,
  AlertCircle,
  Building2,
  Cpu,
  UserX,
  Download,
} from 'lucide-react';

export const LoginView: React.FC = () => {
  const { users, login, t, isRtl } = useApp();

  const [matriculeInput, setMatriculeInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTabFilter, setActiveTabFilter] = useState<'all' | 'u1' | 'u2' | 'direction'>('all');

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const q = matriculeInput.trim().toLowerCase();
    if (!q) {
      setErrorMsg('Veuillez saisir votre matricule ou adresse e-mail.');
      return;
    }

    const found = users.find(
      (u) =>
        u.matricule.toLowerCase() === q ||
        u.email?.toLowerCase() === q ||
        u.name.toLowerCase().includes(q)
    );

    if (!found) {
      setErrorMsg(`Aucun utilisateur trouvé avec le matricule ou l'identifiant "${matriculeInput}".`);
      return;
    }

    login(found);
  };

  const selectUserDirect = (user: User) => {
    login(user);
  };

  // Groupes d'utilisateurs
  const u1Users = users.filter((u) => u.unite === 'U1');
  const u2Users = users.filter((u) => u.unite === 'U2');
  const directionUsers = users.filter((u) => u.unite === 'Toutes' || !u.unite);

  const getFilteredUsers = () => {
    if (activeTabFilter === 'u1') return u1Users;
    if (activeTabFilter === 'u2') return u2Users;
    if (activeTabFilter === 'direction') return directionUsers;
    return users;
  };

  return (
    <div
      className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-8 font-sans selection:bg-blue-600 selection:text-white"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Background industrial grid decor */}
      <div className="fixed inset-0 pointer-events-none opacity-5 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px]" />

      {/* Header Branding */}
      <header className="max-w-7xl mx-auto w-full flex items-center justify-between py-2 border-b border-slate-800/80 mb-6">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <img
              src="/ctp-shoe-logo.png"
              alt="Logo CTP Chaussures"
              className="w-12 h-12 rounded-xl object-cover border-2 border-blue-500/40 shadow-lg shadow-blue-500/20"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-xl tracking-wider text-white">CTP SMART</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                C.T PLAST 2026
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Système ERP Industriel • Injection EVA & Production de Semelles
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <PWAInstallButton variant="header" />
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Serveur Usine Opérationnel (U1 & U2)</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto w-full flex-1 flex flex-col lg:flex-row gap-8 items-start my-auto">
        {/* Left Column: Direct Credentials Login Form */}
        <div className="w-full lg:w-96 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-2xl backdrop-blur-md">
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-semibold border border-blue-500/20 mb-3">
              <Lock className="w-3.5 h-3.5" /> Authentification Atelier
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">Connexion Session</h1>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Saisissez votre matricule officiel (ex: <code className="text-blue-300">CTP-GER-01</code> ou{' '}
              <code className="text-blue-300">CTP-CE-1A</code>) pour accéder à votre poste.
            </p>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleManualLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Matricule ou Identifiant
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={matriculeInput}
                  onChange={(e) => setMatriculeInput(e.target.value)}
                  placeholder="ex: CTP-GER-01 ou CTP-CE-1A"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Mot de passe</span>
                <span className="text-[10px] text-slate-500">Défaut: ctp2026</span>
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <span>Ouvrir la session</span>
              <ArrowRight className="w-4 h-4 rtl:rotate-180" />
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-800 text-[11px] text-slate-500 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Shield className="w-3.5 h-3.5 text-blue-400" />
              <span>Contrôle strict : Rôle + Unité + Machine + Shift</span>
            </div>
            <p>Toutes les connexions, saisies et validations sont tracées dans le Journal d'Audit.</p>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800">
            <PWAInstallButton variant="hero" className="w-full" />
          </div>
        </div>

        {/* Right Column: 1-Click Fast Switcher Organigramme Usine (4 Gérants + 12 Chefs d'équipe) */}
        <div className="flex-1 w-full space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Sélection Rapide par Poste de Travail (Organigramme Usine)</span>
              </h2>
              <p className="text-xs text-slate-400">
                Total réglementaire : 4 Gérants + 12 Chefs d'équipe + Qualité + RH + Direction
              </p>
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs">
              <button
                onClick={() => setActiveTabFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition font-medium ${
                  activeTabFilter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Tous ({users.length})
              </button>
              <button
                onClick={() => setActiveTabFilter('u1')}
                className={`px-2.5 py-1 rounded-lg transition font-medium ${
                  activeTabFilter === 'u1'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Unité 1 (EVA 1-3)
              </button>
              <button
                onClick={() => setActiveTabFilter('u2')}
                className={`px-2.5 py-1 rounded-lg transition font-medium ${
                  activeTabFilter === 'u2'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Unité 2 (EVA 4)
              </button>
              <button
                onClick={() => setActiveTabFilter('direction')}
                className={`px-2.5 py-1 rounded-lg transition font-medium ${
                  activeTabFilter === 'direction'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Direction & RH
              </button>
            </div>
          </div>

          {/* Grid of Users */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[600px] overflow-y-auto pr-1">
            {getFilteredUsers().map((user) => {
              const isGerant = user.role === 'gerant';
              const isChef = user.role === 'chef_equipe';
              const isDir = user.role === 'resp_production' || user.role === 'direction' || user.role === 'admin_general';
              const isQual = user.role === 'resp_qualite';
              const isRh = user.role === 'rh';

              return (
                <button
                  key={user.id}
                  onClick={() => selectUserDirect(user)}
                  className="text-left rtl:text-right p-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between group shadow-sm hover:shadow-md cursor-pointer relative overflow-hidden"
                >
                  {/* Subtle top indicator bar */}
                  <div
                    className={`absolute top-0 left-0 right-0 h-1 ${
                      isGerant
                        ? 'bg-purple-500'
                        : isChef
                        ? 'bg-blue-500'
                        : isDir
                        ? 'bg-amber-500'
                        : isQual
                        ? 'bg-emerald-500'
                        : isRh
                        ? 'bg-rose-500'
                        : 'bg-slate-700'
                    }`}
                  />

                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      {/* Role Badge */}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                          isGerant
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : isChef
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            : isDir
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : isQual
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : isRh
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {isGerant
                          ? 'GÉRANT'
                          : isChef
                          ? "CHEF D'ÉQUIPE"
                          : isDir
                          ? 'DIRECTEUR'
                          : isQual
                          ? 'QUALITÉ'
                          : isRh
                          ? 'GESTION RH'
                          : user.role}
                      </span>

                      {/* Machine Badge */}
                      {user.assignedMachine && user.assignedMachine !== 'Toutes' && (
                        <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700">
                          {user.assignedMachine}
                        </span>
                      )}
                    </div>

                    <div className="font-semibold text-sm text-white group-hover:text-blue-300 transition">
                      {user.name}
                    </div>

                    <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                      {user.matricule}
                    </div>

                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                      {user.department}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
                    <span className="flex items-center gap-1">
                      {user.unite && (
                        <span className="font-medium text-slate-300">
                          {user.unite === 'Toutes' ? 'Toutes Unités' : `Unité ${user.unite}`}
                        </span>
                      )}
                      {user.assignedShift && (
                        <span className="text-slate-400">
                          • Shift {user.assignedShift.toUpperCase()} ({user.assignedEquipe || ''})
                        </span>
                      )}
                    </span>
                    <span className="text-blue-400 font-semibold group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition flex items-center gap-0.5">
                      Entrer <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </main>

      {/* Footer Industrial Notes */}
      <footer className="max-w-7xl mx-auto w-full py-4 border-t border-slate-800/80 text-center text-xs text-slate-500 mt-6">
        <p>
          CTP SMART 2026 © Société C.T PLAST Algérie • Système Industriel de Pilotage Production, Qualité & RH
        </p>
      </footer>
    </div>
  );
};
