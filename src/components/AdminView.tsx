import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Settings,
  Users,
  Shield,
  History,
  Sliders,
  Database,
  ShieldCheck,
  Plus,
  Lock,
} from 'lucide-react';
import { UserRole } from '../types';
import { ReferentialsManagement } from './referentials/ReferentialsManagement';
import { PermissionsMatrix } from './admin/PermissionsMatrix';
import { AuditTrailView } from './admin/AuditTrailView';

export const AdminView: React.FC = () => {
  const {
    t,
    currentTenant,
    currentUser,
    setCurrentUser,
    activeTab: contextActiveTab,
    can,
    logAudit,
  } = useApp();

  // Determine initial sub-tab based on the global navigation item
  const getInitialTab = (): 'referentials' | 'permissions' | 'logs' | 'users' | 'settings' => {
    if (contextActiveTab === 'referentials') return 'referentials';
    if (contextActiveTab === 'roles_permissions') return 'permissions';
    if (contextActiveTab === 'audit') return 'logs';
    if (contextActiveTab === 'settings') return 'settings';
    return 'referentials';
  };

  const [activeTab, setActiveTab] = useState<'referentials' | 'permissions' | 'logs' | 'users' | 'settings'>(getInitialTab);

  useEffect(() => {
    if (contextActiveTab === 'referentials') setActiveTab('referentials');
    else if (contextActiveTab === 'roles_permissions') setActiveTab('permissions');
    else if (contextActiveTab === 'audit') setActiveTab('logs');
    else if (contextActiveTab === 'settings') setActiveTab('settings');
  }, [contextActiveTab]);

  // List of registered corporate users
  const [usersList, setUsersList] = useState([
    { id: 'u-1', name: 'Karim Ben Salah', role: 'admin_general' as UserRole, email: 'admin@ctpsmart.tn', lastLogin: '2026-09-06 14:15' },
    { id: 'u-2', name: 'Slim Triki', role: 'direction' as UserRole, email: 'direction@ctpsmart.tn', lastLogin: '2026-09-06 11:30' },
    { id: 'u-3', name: 'Mohamed Ali', role: 'resp_production' as UserRole, email: 'prod@ctpsmart.tn', lastLogin: '2026-09-06 13:45' },
    { id: 'u-4', name: 'Ahmed Cherif', role: 'chef_equipe' as UserRole, email: 'chef@ctpsmart.tn', lastLogin: '2026-09-06 14:02' },
    { id: 'u-5', name: 'Yassine Khelifi', role: 'resp_qualite' as UserRole, email: 'qualite@ctpsmart.tn', lastLogin: '2026-09-06 09:20' },
    { id: 'u-6', name: 'Tarek Mansouri', role: 'resp_maintenance' as UserRole, email: 'maint@ctpsmart.tn', lastLogin: '2026-09-06 12:10' },
    { id: 'u-7', name: 'Lotfi Ben Romdhane', role: 'resp_stock' as UserRole, email: 'stock@ctpsmart.tn', lastLogin: '2026-09-06 10:05' },
    { id: 'u-8', name: 'Sami Dridi', role: 'operateur' as UserRole, email: 'op1@ctpsmart.tn', lastLogin: '2026-09-06 14:00' },
  ]);

  const canManageRoles = can('update', 'roles_permissions');
  const canReadReferentials = can('read', 'referentials_workers') || can('read', 'referentials_machines');
  const canReadPermissions = can('read', 'roles_permissions');
  const canReadAudit = can('read', 'audit');

  const handleRoleChange = (userId: string, newRole: UserRole) => {
    if (!canManageRoles) {
      alert("Seul l'Administrateur Général peut modifier les attributions de rôles.");
      return;
    }

    const targetUser = usersList.find((u) => u.id === userId);
    if (!targetUser) return;
    const oldRole = targetUser.role;

    setUsersList((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    );

    // If current logged in user changed their own role
    if (currentUser.id === userId) {
      setCurrentUser({ ...currentUser, role: newRole });
    }

    logAudit(
      'MODIFICATION_ROLE_UTILISATEUR',
      'Sécurité & Rôles',
      `Attribution du rôle "${newRole}" à l'utilisateur ${targetUser.name}`,
      {
        targetId: userId,
        targetName: targetUser.name,
        oldValue: oldRole,
        newValue: newRole,
      }
    );
  };

  const navTabs = [
    {
      id: 'referentials',
      label: 'Référentiels Industriels',
      icon: Database,
      visible: canReadReferentials,
    },
    {
      id: 'permissions',
      label: 'Matrice des Permissions',
      icon: ShieldCheck,
      visible: canReadPermissions,
    },
    {
      id: 'logs',
      label: "Journal d'Audit & Traçabilité",
      icon: History,
      visible: canReadAudit,
    },
    {
      id: 'users',
      label: 'Comptes Utilisateurs & Rôles',
      icon: Users,
      visible: canManageRoles || currentUser.role === 'admin_general' || currentUser.role === 'direction',
    },
    {
      id: 'settings',
      label: 'Paramètres & Seuils Usine',
      icon: Sliders,
      visible: currentUser.role === 'admin_general' || currentUser.role === 'direction',
    },
  ].filter((t) => t.visible);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-6 h-6 text-blue-600" />
            {t('navAdmin')} • Pilotage Système & Référentiels
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Gestion centralisée des référentiels atelier, des permissions par profil (RBAC), du registre d'audit et de l'organigramme usine.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
            {currentTenant.name} ({currentTenant.subdomain})
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-xs font-mono font-semibold">
            Session : {currentUser.role}
          </div>
        </div>
      </div>

      {/* Sub Tabs Navigation - Automatically filters out unauthorized menus */}
      <div className="flex flex-wrap gap-1.5 bg-white p-1.5 rounded-xl border border-slate-200 shadow-xs">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-medium transition ${
                isSelected
                  ? 'bg-blue-600 text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* View Content based on Selected SubTab */}

      {/* 1. Référentiels Industriels */}
      {activeTab === 'referentials' && <ReferentialsManagement />}

      {/* 2. Matrice des Permissions Granulaires */}
      {activeTab === 'permissions' && <PermissionsMatrix />}

      {/* 3. Journal d'Audit & Traçabilité */}
      {activeTab === 'logs' && <AuditTrailView />}

      {/* 4. Utilisateurs & Attribution des Rôles */}
      {activeTab === 'users' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-600" />
                Comptes Utilisateurs & Attribution des Rôles Système
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Chaque rôle hérite automatiquement des permissions définies dans la matrice RBAC.
              </p>
            </div>

            {canManageRoles && (
              <button
                onClick={() => alert("Formulaire d'invitation d'un nouvel utilisateur par email.")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition"
              >
                <Plus className="w-3.5 h-3.5" /> Ajouter un utilisateur
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase text-[10px] font-semibold">
                <tr>
                  <th className="px-3.5 py-3">Nom complet</th>
                  <th className="px-3.5 py-3">Email Pro</th>
                  <th className="px-3.5 py-3">Rôle Système Assigné</th>
                  <th className="px-3.5 py-3">Dernière Connexion</th>
                  <th className="px-3.5 py-3 text-center">Statut Compte</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {usersList.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-3.5 py-3 font-semibold text-slate-900">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[11px]">
                          {u.name.split(' ').map((n) => n[0]).join('').substring(0, 2)}
                        </div>
                        <span>{u.name}</span>
                        {currentUser.id === u.id && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 font-semibold">
                            Vous
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3.5 py-3 font-mono text-slate-500">{u.email}</td>
                    <td className="px-3.5 py-3">
                      {canManageRoles ? (
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                          className="bg-slate-50 border border-slate-200 text-blue-700 font-semibold rounded-lg px-2.5 py-1 text-xs focus:bg-white focus:border-blue-500"
                        >
                          <option value="admin_general">Administrateur général</option>
                          <option value="direction">Direction</option>
                          <option value="resp_production">Responsable production</option>
                          <option value="chef_equipe">Chef d’équipe</option>
                          <option value="resp_qualite">Responsable qualité</option>
                          <option value="resp_maintenance">Responsable maintenance</option>
                          <option value="resp_stock">Responsable stock</option>
                          <option value="rh">RH</option>
                          <option value="operateur">Opérateur</option>
                        </select>
                      ) : (
                        <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                          {u.role}
                        </span>
                      )}
                    </td>
                    <td className="px-3.5 py-3 font-mono text-slate-500">{u.lastLogin}</td>
                    <td className="px-3.5 py-3 text-center">
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Actif
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Paramètres & Seuils Usine */}
      {activeTab === 'settings' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-2xl space-y-5 shadow-xs">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-600" />
              Paramétrage des Seuils Critiques Usine
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Ces seuils déclenchent automatiquement les alertes de production et les notifications sur le tableau de bord.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-700 font-medium mb-1">
                Seuil d'alerte Rebuts Plasturgie (%)
              </label>
              <input
                type="number"
                defaultValue={3.0}
                step="0.1"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 font-mono focus:bg-white focus:border-blue-500"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Au-delà de ce pourcentage de rebuts par lot, une alerte qualité haute priorité est émise.
              </span>
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">
                Objectif de Taux de Rendement Synthétique (TRS Atelier %)
              </label>
              <input
                type="number"
                defaultValue={95.0}
                step="0.5"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 font-mono focus:bg-white focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">
                Seuil de Réapprovisionnement Automatique Granulés (Sacs de 25kg)
              </label>
              <input
                type="number"
                defaultValue={50}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 font-mono focus:bg-white focus:border-blue-500"
              />
            </div>

            <button
              onClick={() => {
                logAudit('PARAMETRAGE_SEUILS', 'Configuration Usine', 'Mise à jour des seuils critiques TRS et Rebuts');
                alert('Paramètres usine enregistrés avec succès !');
              }}
              className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs mt-2 transition"
            >
              Sauvegarder les paramètres
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
