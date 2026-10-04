import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  ShieldAlert,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Camera,
  Filter,
  Check,
  Eye,
  FileCheck,
  TrendingDown,
  Layers,
  Search,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import { SHOE_MODELS } from '../data/mockIndustrialData';
import { ShiftType } from '../types';

export const QualityView: React.FC = () => {
  const {
    t,
    qualityRecords,
    addQualityRecord,
    updateQualityStatus,
    deleteQualityRecord,
    restoreDefaultErpData,
    machines,
    currentUser,
    hasPermission,
  } = useApp();

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ouvert' | 'en_cours' | 'resolu'>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'mineur' | 'majeur' | 'critique'>('all');

  // Form states
  const [formMachine, setFormMachine] = useState<string>(machines[0]?.id || 'mach-eva-1');
  const [formShift, setFormShift] = useState<ShiftType>('matin');
  const [formModel, setFormModel] = useState<string>(SHOE_MODELS[0].name);
  const [formInspected, setFormInspected] = useState<number>(100);
  const [formRejected, setFormRejected] = useState<number>(3);
  const [formDefectReason, setFormDefectReason] = useState<string>('Bavures d\'injection');
  const [formSeverity, setFormSeverity] = useState<'mineur' | 'majeur' | 'critique'>('mineur');
  const [formCorrectiveAction, setFormCorrectiveAction] = useState<string>('Ajustement serrage moule et vérification température buse.');
  const [formPhotoUrl, setFormPhotoUrl] = useState<string>('https://images.unsplash.com/photo-1607522370275-f14206abe5d3?w=500&auto=format&fit=crop&q=60');

  const totalInspected = qualityRecords.reduce((sum, q) => sum + q.inspectedQty, 0);
  const totalConforming = qualityRecords.reduce((sum, q) => sum + q.conformingQty, 0);
  const totalRejected = qualityRecords.reduce((sum, q) => sum + q.rejectedQty, 0);
  const overallConformityRate = totalInspected > 0 ? ((totalConforming / totalInspected) * 100).toFixed(1) : '100.0';
  const overallScrapRate = totalInspected > 0 ? ((totalRejected / totalInspected) * 100).toFixed(1) : '0.0';

  const filteredQualityRecords = useMemo(() => {
    return qualityRecords.filter((record) => {
      if (statusFilter !== 'all' && record.status !== statusFilter) return false;
      if (severityFilter !== 'all' && record.severity !== severityFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          record.modelName.toLowerCase().includes(q) ||
          record.defectReason.toLowerCase().includes(q) ||
          record.machineId.toLowerCase().includes(q) ||
          record.correctiveAction?.toLowerCase().includes(q) ||
          record.auditorName?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [qualityRecords, statusFilter, severityFilter, searchQuery]);

  const handleSaveInspection = (e: React.FormEvent) => {
    e.preventDefault();
    const todayStr = new Date().toISOString().substring(0, 10);
    const nowTimeStr = new Date().toTimeString().substring(0, 5);

    addQualityRecord({
      date: todayStr,
      time: nowTimeStr,
      machineId: formMachine,
      shift: formShift,
      modelName: formModel,
      operatorId: currentUser.id,
      inspectedQty: formInspected,
      conformingQty: Math.max(0, formInspected - formRejected),
      rejectedQty: formRejected,
      defectReason: formDefectReason,
      severity: formSeverity,
      defectPhotoUrl: formPhotoUrl,
      correctiveAction: formCorrectiveAction,
      status: 'ouvert',
      auditorName: `${currentUser.name} (${t(`role_${currentUser.role}` as any)})`,
    });

    setShowAddModal(false);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-blue-600" />
            {t('qualityAuditTitle')}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Suivi des non-conformités, traçabilité par machine et plans d'actions correctives.
          </p>
        </div>

        {hasPermission('quality') && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>{t('newInspection')}</span>
          </button>
        )}
      </div>

      {/* Quality KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Paires Auditées</span>
            <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <FileCheck className="w-4 h-4" />
            </span>
          </div>
          <span className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 mt-2">
            {totalInspected.toLocaleString()}
          </span>
          <div className="text-xs text-slate-500 mt-1">Échantillonnage en atelier</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Taux de Conformité</span>
            <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <span className="text-2xl sm:text-3xl font-bold font-mono text-emerald-600 mt-2">
            {overallConformityRate}%
          </span>
          <div className="text-xs text-emerald-600 font-medium mt-1">Objectif CTP &gt; 97.0%</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Taux de Rebut Constaté</span>
            <span className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <span className="text-2xl sm:text-3xl font-bold font-mono text-rose-600 mt-2">
            {overallScrapRate}%
          </span>
          <div className="text-xs text-rose-600 font-medium mt-1">{totalRejected} pièces défectueuses</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Actions Correctives Ouvertes</span>
            <span className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
              <ShieldAlert className="w-4 h-4" />
            </span>
          </div>
          <span className="text-2xl sm:text-3xl font-bold font-mono text-amber-600 mt-2">
            {qualityRecords.filter((q) => q.status !== 'resolu').length}
          </span>
          <div className="text-xs text-amber-600 font-medium mt-1">En cours de traitement</div>
        </div>
      </div>

      {/* Quality Records Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-blue-600" />
              Fiches de Contrôle Qualité & Traçabilité
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Traçabilité complète des fiches d'audit qualité ({filteredQualityRecords.length} affichée(s) sur {qualityRecords.length})
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher modèle, défaut, machine..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:border-blue-500 outline-none w-56"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:bg-white focus:border-blue-500 outline-none"
            >
              <option value="all">Tous les statuts</option>
              <option value="ouvert">Ouvert</option>
              <option value="en_cours">En cours</option>
              <option value="resolu">Résolu</option>
            </select>

            {/* Severity Filter */}
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as any)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:bg-white focus:border-blue-500 outline-none"
            >
              <option value="all">Toutes gravités</option>
              <option value="mineur">Mineur</option>
              <option value="majeur">Majeur</option>
              <option value="critique">Critique</option>
            </select>

            {/* Bouton restauration données de base */}
            <button
              onClick={() => restoreDefaultErpData()}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Restaurer et synchroniser les fiches de base CTP"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Synchro Fiches</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase text-[10px] font-semibold">
              <tr>
                <th className="px-3.5 py-3">Date / Heure</th>
                <th className="px-3.5 py-3">Machine & Poste</th>
                <th className="px-3.5 py-3">Modèle</th>
                <th className="px-3.5 py-3 text-right">Échantillon</th>
                <th className="px-3.5 py-3 text-right">Rebuts</th>
                <th className="px-3.5 py-3">Cause de Non-Conformité</th>
                <th className="px-3.5 py-3">Gravité</th>
                <th className="px-3.5 py-3">Action Corrective</th>
                <th className="px-3.5 py-3 text-center">Photo Défaut</th>
                <th className="px-3.5 py-3 text-center">Statut</th>
                <th className="px-3.5 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredQualityRecords.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-400">
                    Aucune fiche qualité trouvée pour les filtres sélectionnés.
                  </td>
                </tr>
              ) : (
                filteredQualityRecords.map((record) => {
                  const scrap = record.inspectedQty > 0 ? ((record.rejectedQty / record.inspectedQty) * 100).toFixed(1) : '0';

                  return (
                    <tr key={record.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-3.5 py-3 font-mono text-slate-500">
                        {record.date} <span className="text-slate-400 text-[11px]">{record.time}</span>
                      </td>
                      <td className="px-3.5 py-3">
                        <div className="font-bold text-slate-900">{record.machineId.toUpperCase()}</div>
                        <div className="text-[10px] text-slate-500 capitalize">{record.shift}</div>
                      </td>
                      <td className="px-3.5 py-3 font-semibold text-slate-900">
                        {record.modelName}
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono font-medium text-slate-800">
                        {record.inspectedQty}
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono font-bold text-rose-600">
                        {record.rejectedQty} ({scrap}%)
                      </td>
                      <td className="px-3.5 py-3 font-medium text-slate-800">
                        {record.defectReason}
                      </td>
                      <td className="px-3.5 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                          record.severity === 'critique'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : record.severity === 'majeur'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          {record.severity}
                        </span>
                      </td>
                      <td className="px-3.5 py-3 max-w-[200px] truncate text-[11px] text-slate-500" title={record.correctiveAction}>
                        {record.correctiveAction}
                      </td>
                      <td className="px-3.5 py-3 text-center">
                        {record.defectPhotoUrl ? (
                          <button
                            onClick={() => setSelectedPhoto(record.defectPhotoUrl || null)}
                            className="inline-flex items-center gap-1 text-[11px] text-blue-600 font-medium hover:underline"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Photo</span>
                          </button>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-3.5 py-3 text-center">
                        <select
                          value={record.status}
                          onChange={(e) => updateQualityStatus(record.id, e.target.value as any)}
                          className={`text-[10px] font-bold rounded px-2.5 py-1 bg-white border focus:outline-none ${
                            record.status === 'resolu'
                              ? 'text-emerald-700 border-emerald-300 bg-emerald-50'
                              : record.status === 'en_cours'
                              ? 'text-amber-700 border-amber-300 bg-amber-50'
                              : 'text-rose-700 border-rose-300 bg-rose-50'
                          }`}
                        >
                          <option value="ouvert">Ouvert</option>
                          <option value="en_cours">En cours</option>
                          <option value="resolu">Résolu</option>
                        </select>
                      </td>
                      <td className="px-3.5 py-3 text-center">
                        <button
                          onClick={() => {
                            if (window.confirm(`Supprimer la fiche qualité #${record.id} pour ${record.modelName} ?`)) {
                              deleteQualityRecord(record.id);
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          title="Supprimer cette fiche"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: New Inspection Record */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-blue-600" />
                {t('newInspection')}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveInspection} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Machine</label>
                  <select
                    value={formMachine}
                    onChange={(e) => setFormMachine(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:bg-white focus:border-blue-500"
                  >
                    {machines.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.code} - {m.name.split('(')[0]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">Poste / Équipe</label>
                  <select
                    value={formShift}
                    onChange={(e) => setFormShift(e.target.value as ShiftType)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:bg-white focus:border-blue-500"
                  >
                    <option value="matin">Équipe Matin</option>
                    <option value="soir">Équipe Soir</option>
                    <option value="nuit">Équipe Nuit</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Modèle Contrôlé</label>
                <select
                  value={formModel}
                  onChange={(e) => setFormModel(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:bg-white focus:border-blue-500"
                >
                  {SHOE_MODELS.map((m) => (
                    <option key={m.id} value={m.name}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Quantité Échantillonnée</label>
                  <input
                    type="number"
                    min={1}
                    value={formInspected}
                    onChange={(e) => setFormInspected(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 font-mono focus:bg-white focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-rose-600 font-medium mb-1">Quantité Rejetée (Défauts)</label>
                  <input
                    type="number"
                    min={0}
                    value={formRejected}
                    onChange={(e) => setFormRejected(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-rose-600 font-mono font-bold focus:bg-white focus:border-rose-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Cause du Défaut</label>
                  <select
                    value={formDefectReason}
                    onChange={(e) => setFormDefectReason(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:bg-white focus:border-blue-500"
                  >
                    <option value="Bavures d'injection">Bavures d'injection</option>
                    <option value="Bulles d'air / Porosité">Bulles d'air / Porosité</option>
                    <option value="Manque matière / Injection incomplète">Manque matière / Injection incomplète</option>
                    <option value="Brûlure / Points noirs">Brûlure / Points noirs</option>
                    <option value="Déformation thermique">Déformation thermique</option>
                    <option value="Décoloration / Mauvais mélange">Décoloration / Mauvais mélange</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">Gravité</label>
                  <select
                    value={formSeverity}
                    onChange={(e) => setFormSeverity(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:bg-white focus:border-blue-500"
                  >
                    <option value="mineur">Mineur (Retouche possible)</option>
                    <option value="majeur">Majeur (Rebut direct)</option>
                    <option value="critique">Critique (Arrêt immédiat requis)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Action Corrective Engagée</label>
                <textarea
                  rows={2}
                  value={formCorrectiveAction}
                  onChange={(e) => setFormCorrectiveAction(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:bg-white focus:border-blue-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm transition"
                >
                  Enregistrer l'audit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox photo modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/80 backdrop-blur-xs">
          <div className="relative max-w-xl w-full bg-white p-3 rounded-xl border border-slate-200 shadow-2xl">
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 text-slate-700 font-bold bg-slate-100 w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-200"
            >
              ✕
            </button>
            <img src={selectedPhoto} alt="Défaut Qualité" className="w-full max-h-[75vh] object-contain rounded-lg" />
          </div>
        </div>
      )}
    </div>
  );
};
