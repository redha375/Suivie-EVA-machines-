import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AuditLogItem } from '../../types';
import {
  History,
  Search,
  Filter,
  Download,
  Calendar,
  ChevronDown,
  ChevronRight,
  Shield,
  FileSpreadsheet,
  FileText,
  AlertTriangle,
  ArrowRight,
  User,
  Clock,
  Tag,
} from 'lucide-react';
import * as XLSX from 'xlsx';

export const AuditTrailView: React.FC = () => {
  const { auditLogs, can, currentUser } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [moduleFilter, setModuleFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const canExport = can('export', 'audit');

  // Filter logs
  const filteredLogs = auditLogs.filter((log) => {
    if (roleFilter !== 'all' && log.userRole !== roleFilter) return false;
    if (moduleFilter !== 'all' && log.module !== moduleFilter) return false;
    if (actionFilter !== 'all' && !log.action.toLowerCase().includes(actionFilter.toLowerCase())) return false;

    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      log.userName.toLowerCase().includes(s) ||
      log.action.toLowerCase().includes(s) ||
      log.module.toLowerCase().includes(s) ||
      log.details.toLowerCase().includes(s) ||
      (log.targetName && log.targetName.toLowerCase().includes(s)) ||
      (log.targetId && log.targetId.toLowerCase().includes(s))
    );
  });

  // Extract unique modules and actions for filter dropdowns
  const uniqueModules = Array.from(new Set(auditLogs.map((l) => l.module))).filter(Boolean);
  const uniqueActions = Array.from(new Set(auditLogs.map((l) => l.action))).filter(Boolean);

  // Export audit logs to Excel
  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      const rows: (string | number)[][] = [
        ['JOURNAL D’AUDIT ET DE TRAÇABILITÉ INDUSTRIELLE - CTP SMART'],
        ['Extrait officiel généré le :', new Date().toLocaleString('fr-FR')],
        ['Généré par :', `${currentUser.name} (${currentUser.role})`],
        ['Filtres appliqués :', `Rôle: ${roleFilter}, Module: ${moduleFilter}, Action: ${actionFilter}`],
        [],
        ['HORODATAGE', 'UTILISATEUR', 'RÔLE', 'MODULE / RESSOURCE', 'ACTION EXÉCUTÉE', 'CIBLE (NOM/CODE)', 'ID CIBLE', 'ANCIENNE VALEUR', 'NOUVELLE VALEUR', 'DÉTAILS COMPLETS'],
        ...filteredLogs.map((l) => [
          l.timestamp,
          l.userName,
          l.userRole,
          l.module,
          l.action,
          l.targetName || 'N/A',
          l.targetId || 'N/A',
          l.oldValue || 'N/A',
          l.newValue || 'N/A',
          l.details,
        ]),
      ];

      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [
        { wch: 20 },
        { wch: 22 },
        { wch: 20 },
        { wch: 20 },
        { wch: 28 },
        { wch: 22 },
        { wch: 18 },
        { wch: 30 },
        { wch: 30 },
        { wch: 45 },
      ];
      XLSX.utils.book_append_sheet(wb, ws, 'Journal_Audit');
      XLSX.writeFile(wb, `Audit_Trail_CTP_SMART_${new Date().toISOString().substring(0, 10)}.xlsx`);
    } catch (err) {
      console.error('Erreur export audit:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-blue-600" />
            Journal d'Audit et Registre de Traçabilité Réglementaire
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Historique immuable consignant chaque création, mise à jour, désactivation et tentative d'accès non autorisé avec les métadonnées complètes (<strong>utilisateur, rôle, date, heure, action, ancienne et nouvelle valeur</strong>).
          </p>
        </div>

        {canExport && (
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exporter le Journal (Excel)</span>
          </button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Keyword Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher utilisateur, cible, action..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-hidden"
            />
          </div>

          {/* Role Filter */}
          <div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2.5 text-xs text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-hidden"
            >
              <option value="all">Tous les Rôles</option>
              <option value="admin_general">Administrateur général</option>
              <option value="direction">Direction</option>
              <option value="responsable_production">Responsable production</option>
              <option value="chef_equipe">Chef d'équipe</option>
              <option value="responsable_qualite">Responsable qualité</option>
              <option value="responsable_maintenance">Responsable maintenance</option>
              <option value="responsable_stock">Responsable stock</option>
              <option value="rh">RH</option>
              <option value="operateur">Opérateur</option>
            </select>
          </div>

          {/* Module Filter */}
          <div>
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2.5 text-xs text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-hidden"
            >
              <option value="all">Tous les Modules</option>
              {uniqueModules.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Action Filter */}
          <div>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2.5 text-xs text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-hidden"
            >
              <option value="all">Toutes les Actions</option>
              {uniqueActions.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
          <span>Affichage de <strong>{filteredLogs.length}</strong> événements répertoriés</span>
          {(searchTerm || roleFilter !== 'all' || moduleFilter !== 'all' || actionFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setRoleFilter('all');
                setModuleFilter('all');
                setActionFilter('all');
              }}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Effacer les filtres
            </button>
          )}
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase text-[10px] font-semibold">
              <tr>
                <th className="w-8 px-3 py-3"></th>
                <th className="px-3.5 py-3">Date & Heure</th>
                <th className="px-3.5 py-3">Utilisateur</th>
                <th className="px-3.5 py-3">Rôle</th>
                <th className="px-3.5 py-3">Module</th>
                <th className="px-3.5 py-3">Action Exécutée</th>
                <th className="px-3.5 py-3">Cible / Élément</th>
                <th className="px-3.5 py-3">Détails Opération</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Aucun événement d'audit ne correspond aux filtres actuels.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  const hasDiff = Boolean(log.oldValue || log.newValue);
                  const isBlocked = log.action.includes('NON_AUTORISEE') || log.action.includes('BLOQUEE');
                  const isDeactivation = log.action.includes('DESACTIVATION');

                  return (
                    <React.Fragment key={log.id}>
                      <tr
                        onClick={() => hasDiff && setExpandedLogId(isExpanded ? null : log.id)}
                        className={`hover:bg-slate-50/80 transition ${
                          hasDiff ? 'cursor-pointer' : ''
                        } ${isBlocked ? 'bg-rose-50/40' : isDeactivation ? 'bg-amber-50/30' : ''}`}
                      >
                        <td className="px-3 py-3 text-center text-slate-400">
                          {hasDiff && (
                            isExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5" />
                            )
                          )}
                        </td>
                        <td className="px-3.5 py-3 font-mono text-slate-500 whitespace-nowrap">
                          {log.timestamp}
                        </td>
                        <td className="px-3.5 py-3 font-semibold text-slate-900 whitespace-nowrap">
                          {log.userName}
                        </td>
                        <td className="px-3.5 py-3 font-mono text-blue-700 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 border border-blue-100">
                            {log.userRole}
                          </span>
                        </td>
                        <td className="px-3.5 py-3 font-medium text-slate-700 whitespace-nowrap">
                          {log.module}
                        </td>
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                              isBlocked
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : isDeactivation
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-slate-100 text-slate-800 border border-slate-200'
                            }`}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td className="px-3.5 py-3 font-medium text-slate-900">
                          {log.targetName || log.targetId || '-'}
                        </td>
                        <td className="px-3.5 py-3 text-slate-600 max-w-xs truncate">
                          {log.details}
                        </td>
                      </tr>

                      {/* Expandable Diff Panel */}
                      {isExpanded && hasDiff && (
                        <tr className="bg-slate-50 border-y border-slate-200">
                          <td colSpan={8} className="p-4">
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                                <History className="w-4 h-4 text-blue-600" />
                                <span>Traçabilité des Valeurs Antérieures vs Nouvelles :</span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {/* Old Value */}
                                <div className="p-3 rounded-lg bg-rose-50/60 border border-rose-200 text-xs">
                                  <span className="font-bold text-rose-900 block mb-1">
                                    🔴 Ancienne Valeur (Avant modification) :
                                  </span>
                                  <pre className="font-mono text-[11px] text-rose-950 whitespace-pre-wrap break-all bg-white p-2 rounded border border-rose-100 max-h-40 overflow-y-auto">
                                    {log.oldValue || 'N/A'}
                                  </pre>
                                </div>

                                {/* New Value */}
                                <div className="p-3 rounded-lg bg-emerald-50/60 border border-emerald-200 text-xs">
                                  <span className="font-bold text-emerald-900 block mb-1">
                                    🟢 Nouvelle Valeur (Après modification) :
                                  </span>
                                  <pre className="font-mono text-[11px] text-emerald-950 whitespace-pre-wrap break-all bg-white p-2 rounded border border-emerald-100 max-h-40 overflow-y-auto">
                                    {log.newValue || 'N/A'}
                                  </pre>
                                </div>
                              </div>

                              <p className="text-[11px] text-slate-500">
                                Détails complémentaires : <span className="font-medium text-slate-700">{log.details}</span>
                              </p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
