import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  UserRole,
  PermissionResource,
  PermissionAction,
} from '../../types';
import {
  ShieldCheck,
  RotateCcw,
  Check,
  X,
  Lock,
  Eye,
  Plus,
  Edit,
  Power,
  Trash2,
  CheckCircle2,
  Download,
  AlertTriangle,
  Info,
} from 'lucide-react';

export const PermissionsMatrix: React.FC = () => {
  const {
    currentUser,
    rolePermissions,
    updateRolePermission,
    resetRolePermissions,
    can,
  } = useApp();

  const [selectedRole, setSelectedRole] = useState<UserRole>('resp_production');
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const canEditMatrix = can('update', 'roles_permissions');

  const rolesList: { role: UserRole; label: string; badge: string; description: string }[] = [
    {
      role: 'admin_general',
      label: 'Administrateur Général',
      badge: 'Accès Total',
      description: 'Supervision globale, gestion des droits RBAC, configuration usine et serveurs.',
    },
    {
      role: 'direction',
      label: 'Direction Générale',
      badge: 'Stratégique',
      description: 'Pilotage financier & KPIs, lecture complète, validation bilans, exports certifiés.',
    },
    {
      role: 'resp_production',
      label: 'Responsable Production',
      badge: 'Opérationnel Ligne',
      description: 'Pilotage des presses EVA/PVC/TPR, validation des lots, gestion équipes et moules.',
    },
    {
      role: 'chef_equipe',
      label: "Chef d'Équipe Atelier",
      badge: 'Supervision Poste',
      description: 'Pointages ouvriers, saisie des arrêts machines, déclarations des paires et rebuts.',
    },
    {
      role: 'resp_qualite',
      label: 'Responsable Qualité',
      badge: 'Contrôle Normes',
      description: 'Inspections, gestion des non-conformités, validation et blocage de séries.',
    },
    {
      role: 'resp_maintenance',
      label: 'Responsable Maintenance',
      badge: 'Technique',
      description: 'Maintenance préventive & curative, gestion des pièces de rechange et pannes.',
    },
    {
      role: 'resp_stock',
      label: 'Responsable Stock',
      badge: 'Logistique',
      description: 'Réception granulés EVA/PVC, sorties matière première et inventaires.',
    },
    {
      role: 'rh',
      label: 'Ressources Humaines',
      badge: 'RH & Paie',
      description: 'Gestion des fiches travailleurs, pointages de présence et plannings.',
    },
    {
      role: 'operateur',
      label: 'Opérateur de Presse',
      badge: 'Atelier Direct',
      description: 'Saisie rapide en 1-clic des paires produites et numérisation OCR compteurs.',
    },
  ];

  const resourcesList: { id: PermissionResource; label: string; group: 'referentials' | 'operations' | 'system' }[] = [
    // Référentiels
    { id: 'referentials_workers', label: 'Travailleurs & Opérateurs', group: 'referentials' },
    { id: 'referentials_teams', label: 'Équipes & Shifts', group: 'referentials' },
    { id: 'referentials_machines', label: 'Presses & Machines (EVA 1-3)', group: 'referentials' },
    { id: 'referentials_models', label: 'Modèles de Chaussures', group: 'referentials' },
    { id: 'referentials_molds', label: 'Moules Industriels', group: 'referentials' },
    { id: 'referentials_sizes', label: 'Pointures Normalisées', group: 'referentials' },
    { id: 'referentials_colors', label: 'Palette Couleurs', group: 'referentials' },
    { id: 'referentials_materials', label: 'Matières Premières & Granulés', group: 'referentials' },
    // Modules Opérationnels
    { id: 'production', label: 'Saisie & Suivi Production', group: 'operations' },
    { id: 'quality', label: 'Contrôle & Audits Qualité', group: 'operations' },
    { id: 'stock', label: 'Gestion Stocks Matières', group: 'operations' },
    { id: 'maintenance', label: 'Maintenance & Tickets Pannes', group: 'operations' },
    { id: 'hr', label: 'Présences & Pointages RH', group: 'operations' },
    { id: 'reports', label: 'Bilans & Rapports d’Atelier', group: 'operations' },
    // Système
    { id: 'audit', label: 'Journal d’Audit & Traçabilité', group: 'system' },
    { id: 'roles_permissions', label: 'Matrice des Permissions (RBAC)', group: 'system' },
  ];

  const actionsList: { id: PermissionAction; label: string; icon: React.FC<{ className?: string }>; description: string }[] = [
    { id: 'read', label: 'Voir', icon: Eye, description: 'Consulter la ressource et les listes' },
    { id: 'create', label: 'Ajouter', icon: Plus, description: 'Créer de nouveaux enregistrements' },
    { id: 'update', label: 'Modifier', icon: Edit, description: 'Modifier les paramètres et fiches' },
    { id: 'deactivate', label: 'Désactiver', icon: Power, description: 'Désactiver/Réactiver un élément' },
    { id: 'delete', label: 'Supprimer', icon: Trash2, description: 'Suppression physique (si aucun historique)' },
    { id: 'validate', label: 'Valider', icon: CheckCircle2, description: 'Approuver ou viser un lot ou document' },
    { id: 'export', label: 'Exporter', icon: Download, description: 'Télécharger en PDF ou Excel' },
  ];

  const handleToggle = (resource: PermissionResource, action: PermissionAction, currentValue: boolean) => {
    if (!canEditMatrix) {
      setFeedbackMessage('Modification interdite : Seul l’Administrateur Général peut modifier les permissions.');
      setTimeout(() => setFeedbackMessage(null), 4000);
      return;
    }

    if (selectedRole === 'admin_general') {
      setFeedbackMessage("Les permissions de l'Administrateur Général sont immuables (sécurité système).");
      setTimeout(() => setFeedbackMessage(null), 3000);
      return;
    }

    updateRolePermission(selectedRole, resource, action, !currentValue);
    setFeedbackMessage(`Permission "${action}" sur "${resource}" mise à jour pour le rôle ${selectedRole}.`);
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  const handleReset = () => {
    if (!canEditMatrix) return;
    if (window.confirm('Voulez-vous réinitialiser toutes les permissions aux valeurs d’usine par défaut ?')) {
      resetRolePermissions();
      setFeedbackMessage('Toutes les permissions ont été réinitialisées selon les réglages standard CTP SMART.');
      setTimeout(() => setFeedbackMessage(null), 4000);
    }
  };

  const currentRoleRules = rolePermissions[selectedRole] || {};

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            Matrice des Permissions Granulaires (RBAC)
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Configurez avec précision les 7 droits fondamentaux (<strong>Voir, Ajouter, Modifier, Désactiver, Supprimer, Valider, Exporter</strong>) pour chaque profil d’utilisateur selon l’organigramme de la société CTP.
          </p>
        </div>

        {canEditMatrix && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Réinitialiser aux valeurs d'usine</span>
          </button>
        )}
      </div>

      {/* Feedback Toast */}
      {feedbackMessage && (
        <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs font-semibold flex items-center justify-between shadow-xs animate-fade-in">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            <span>{feedbackMessage}</span>
          </div>
          <button onClick={() => setFeedbackMessage(null)} className="text-blue-500 hover:text-blue-800">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Role Selection Tabs */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2 mb-2">
          Sélectionner le Rôle à configurer
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
          {rolesList.map((r) => {
            const isSelected = selectedRole === r.role;
            return (
              <button
                key={r.role}
                onClick={() => setSelectedRole(r.role)}
                className={`p-3 rounded-lg border text-left transition ${
                  isSelected
                    ? 'bg-blue-50/80 border-blue-500 ring-1 ring-blue-500'
                    : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-bold ${isSelected ? 'text-blue-700' : 'text-slate-800'}`}>
                    {r.label}
                  </span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold bg-white border border-slate-200 text-slate-600 inline-block mb-1">
                  {r.badge}
                </span>
                <p className="text-[10px] text-slate-500 line-clamp-2 leading-tight">
                  {r.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Role Status & Matrix Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-xs font-bold text-slate-900">
              Droits d'accès actifs pour :{' '}
              <span className="text-blue-600 font-mono">
                {rolesList.find((r) => r.role === selectedRole)?.label}
              </span>
            </span>
            <span className="text-slate-400 text-xs ml-2">
              ({selectedRole === 'admin_general' ? 'Rôle Super-Admin (Immuable)' : canEditMatrix ? 'Cliquer sur une case pour basculer la permission' : 'Lecture seule'})
            </span>
          </div>

          {!canEditMatrix && (
            <div className="flex items-center gap-1.5 text-xs text-amber-700 font-semibold bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
              <Lock className="w-3.5 h-3.5" />
              <span>Droits d'administration requis pour éditer</span>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100/75 text-slate-600 border-b border-slate-200 uppercase text-[10px] font-bold">
              <tr>
                <th className="px-4 py-3 min-w-[200px]">Ressource / Module</th>
                {actionsList.map((act) => {
                  const Icon = act.icon;
                  return (
                    <th key={act.id} className="px-3 py-3 text-center min-w-[90px]">
                      <div className="flex flex-col items-center gap-1">
                        <Icon className="w-3.5 h-3.5 text-slate-500" />
                        <span>{act.label}</span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-700">
              {/* Group 1: Référentiels Industriels */}
              <tr className="bg-blue-50/40">
                <td colSpan={8} className="px-4 py-2 font-bold text-[11px] text-blue-900 uppercase tracking-wider">
                  📦 1. Référentiels Industriels & Paramètres Usine
                </td>
              </tr>
              {resourcesList
                .filter((r) => r.group === 'referentials')
                .map((res) => {
                  return (
                    <tr key={res.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-2.5 font-medium text-slate-900">
                        {res.label}
                        <span className="block text-[10px] font-mono text-slate-400 font-normal">
                          {res.id}
                        </span>
                      </td>

                      {actionsList.map((act) => {
                        const isGranted =
                          selectedRole === 'admin_general' ||
                          Boolean(currentRoleRules[res.id]?.[act.id]);

                        return (
                          <td key={act.id} className="px-3 py-2 text-center">
                            <button
                              type="button"
                              disabled={!canEditMatrix || selectedRole === 'admin_general'}
                              onClick={() => handleToggle(res.id, act.id, isGranted)}
                              className={`w-7 h-7 rounded-lg inline-flex items-center justify-center transition ${
                                isGranted
                                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-300 shadow-2xs hover:bg-emerald-100'
                                  : 'bg-slate-50 text-slate-300 border border-slate-200 hover:bg-slate-100'
                              } ${
                                !canEditMatrix || selectedRole === 'admin_general'
                                  ? 'cursor-default opacity-80'
                                  : 'cursor-pointer active:scale-95'
                              }`}
                              title={`${isGranted ? 'Autorisé' : 'Interdit'} : ${act.label} sur ${res.label}`}
                            >
                              {isGranted ? (
                                <Check className="w-4 h-4 font-bold" />
                              ) : (
                                <X className="w-3.5 h-3.5 text-slate-300" />
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}

              {/* Group 2: Modules Opérationnels */}
              <tr className="bg-slate-100/60">
                <td colSpan={8} className="px-4 py-2 font-bold text-[11px] text-slate-800 uppercase tracking-wider">
                  🏭 2. Modules Opérationnels d'Atelier
                </td>
              </tr>
              {resourcesList
                .filter((r) => r.group === 'operations')
                .map((res) => {
                  return (
                    <tr key={res.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-2.5 font-medium text-slate-900">
                        {res.label}
                        <span className="block text-[10px] font-mono text-slate-400 font-normal">
                          {res.id}
                        </span>
                      </td>

                      {actionsList.map((act) => {
                        const isGranted =
                          selectedRole === 'admin_general' ||
                          Boolean(currentRoleRules[res.id]?.[act.id]);

                        return (
                          <td key={act.id} className="px-3 py-2 text-center">
                            <button
                              type="button"
                              disabled={!canEditMatrix || selectedRole === 'admin_general'}
                              onClick={() => handleToggle(res.id, act.id, isGranted)}
                              className={`w-7 h-7 rounded-lg inline-flex items-center justify-center transition ${
                                isGranted
                                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-300 shadow-2xs hover:bg-emerald-100'
                                  : 'bg-slate-50 text-slate-300 border border-slate-200 hover:bg-slate-100'
                              } ${
                                !canEditMatrix || selectedRole === 'admin_general'
                                  ? 'cursor-default opacity-80'
                                  : 'cursor-pointer active:scale-95'
                              }`}
                              title={`${isGranted ? 'Autorisé' : 'Interdit'} : ${act.label} sur ${res.label}`}
                            >
                              {isGranted ? (
                                <Check className="w-4 h-4 font-bold" />
                              ) : (
                                <X className="w-3.5 h-3.5 text-slate-300" />
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}

              {/* Group 3: Système & Sécurité */}
              <tr className="bg-amber-50/40">
                <td colSpan={8} className="px-4 py-2 font-bold text-[11px] text-amber-900 uppercase tracking-wider">
                  🛡️ 3. Système, Audit & Sécurité
                </td>
              </tr>
              {resourcesList
                .filter((r) => r.group === 'system')
                .map((res) => {
                  return (
                    <tr key={res.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-2.5 font-medium text-slate-900">
                        {res.label}
                        <span className="block text-[10px] font-mono text-slate-400 font-normal">
                          {res.id}
                        </span>
                      </td>

                      {actionsList.map((act) => {
                        const isGranted =
                          selectedRole === 'admin_general' ||
                          Boolean(currentRoleRules[res.id]?.[act.id]);

                        return (
                          <td key={act.id} className="px-3 py-2 text-center">
                            <button
                              type="button"
                              disabled={!canEditMatrix || selectedRole === 'admin_general'}
                              onClick={() => handleToggle(res.id, act.id, isGranted)}
                              className={`w-7 h-7 rounded-lg inline-flex items-center justify-center transition ${
                                isGranted
                                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-300 shadow-2xs hover:bg-emerald-100'
                                  : 'bg-slate-50 text-slate-300 border border-slate-200 hover:bg-slate-100'
                              } ${
                                !canEditMatrix || selectedRole === 'admin_general'
                                  ? 'cursor-default opacity-80'
                                  : 'cursor-pointer active:scale-95'
                              }`}
                              title={`${isGranted ? 'Autorisé' : 'Interdit'} : ${act.label} sur ${res.label}`}
                            >
                              {isGranted ? (
                                <Check className="w-4 h-4 font-bold" />
                              ) : (
                                <X className="w-3.5 h-3.5 text-slate-300" />
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
