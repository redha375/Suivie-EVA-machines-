import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  Cog,
  Plus,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Boxes,
  Check,
  Trash2,
  Layers,
  ChevronRight,
  Package,
  Sparkles,
  Split,
  FileText,
  TrendingUp,
} from 'lucide-react';
import { ProductionMaterial } from '../types';
import { DailyProductionSheetModal } from './production/DailyProductionSheetModal';
import { PVCWorkflowTab } from './production/PVCWorkflowTab';
import { SoumelleWorkflowTab } from './production/SoumelleWorkflowTab';
import { EVAWorkflowTab } from './production/EVAWorkflowTab';
import { Interactive12PlatformsGrid } from './production/Interactive12PlatformsGrid';

export const ProductionView: React.FC = () => {
  const {
    t,
    machines,
    productionEntries,
    toggleVerifyEntry,
    deleteProductionEntry,
    currentUser,
    hasPermission,
    packagingCartons,
    stockSoumelle,
    setActiveTab: setAppTab,
  } = useApp();

  // Navigation tabs: Overview / Multi-Material Workflows
  const [activeTab, setActiveTab] = useState<'overview' | 'pvc' | 'soumelle' | 'eva'>('overview');

  // Filter by Material
  const [selectedMaterialFilter, setSelectedMaterialFilter] = useState<'all' | ProductionMaterial>('all');
  const [selectedMachineId, setSelectedMachineId] = useState<string>(machines[0]?.id || 'mach-eva-1');
  const [filterShift, setFilterShift] = useState<string>('all');
  const [selectedPlatform, setSelectedPlatform] = useState<number | null>(1);

  // Modal Daily Production Sheet
  const [showDailySheetModal, setShowDailySheetModal] = useState<boolean>(false);
  const [dailySheetDefaultMaterial, setDailySheetDefaultMaterial] = useState<ProductionMaterial>('PVC');

  // Filter machines based on selected material filter
  const filteredMachines = useMemo(() => {
    if (selectedMaterialFilter === 'all') return machines;
    return machines.filter((m) => {
      if (m.material === selectedMaterialFilter) return true;
      if (m.supportedMaterials?.includes(selectedMaterialFilter)) return true;
      if (selectedMaterialFilter === 'EVA' && m.code.includes('EVA')) return true;
      if (selectedMaterialFilter === 'PVC' && m.code.includes('PVC')) return true;
      if (selectedMaterialFilter === 'SOUMELLE' && (m.code.includes('SOUM') || m.type === 'TPR')) return true;
      return false;
    });
  }, [machines, selectedMaterialFilter]);

  // Keep selectedMachineId synchronized if filtered out
  React.useEffect(() => {
    if (filteredMachines.length > 0 && !filteredMachines.some((m) => m.id === selectedMachineId)) {
      setSelectedMachineId(filteredMachines[0].id);
    }
  }, [filteredMachines, selectedMachineId]);

  const activeMachine = machines.find((m) => m.id === selectedMachineId) || machines[0];

  // Filter entries
  const filteredEntries = useMemo(() => {
    return productionEntries.filter((entry) => {
      if (selectedMaterialFilter !== 'all' && entry.material !== selectedMaterialFilter) {
        return false;
      }
      if (entry.machineId !== selectedMachineId) return false;
      if (filterShift !== 'all' && entry.shift !== filterShift) return false;
      return true;
    });
  }, [productionEntries, selectedMaterialFilter, selectedMachineId, filterShift]);

  // Production KPIs
  const kpis = useMemo(() => {
    const list = selectedMaterialFilter === 'all'
      ? productionEntries
      : productionEntries.filter((p) => p.material === selectedMaterialFilter);

    const totalRaw = list.reduce((sum, e) => sum + (e.qtyProduced || 0), 0);
    const totalConforming = list.reduce((sum, e) => sum + (e.qtyConforming || 0), 0);
    const totalScrap = list.reduce((sum, e) => sum + (e.qtyRejected || 0), 0);
    const scrapPct = totalRaw > 0 ? ((totalScrap / totalRaw) * 100).toFixed(1) : '0.0';
    const totalCartons = packagingCartons.reduce((sum, c) => sum + c.cartonsCount, 0);
    const totalSoumellePairs = stockSoumelle.reduce((sum, s) => sum + s.quantityPairs, 0);

    return { totalRaw, totalConforming, totalScrap, scrapPct, totalCartons, totalSoumellePairs };
  }, [productionEntries, selectedMaterialFilter, packagingCartons, stockSoumelle]);

  const openDailySheet = (mat: ProductionMaterial) => {
    setDailySheetDefaultMaterial(mat);
    setShowDailySheetModal(true);
  };

  return (
    <div className="space-y-6 pb-12" id="production-view-container">
      {/* Top Header & New Production Sheet Action */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200">
              <Cog className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                Production Industrielle Multi-Matières
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono font-normal border border-slate-200">
                  CTP SMART
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Workflows autonomes &amp; règles découplées pour <strong>EVA</strong>, <strong>SOUMELLE</strong> et <strong>PVC</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Primary Action Button */}
        <div className="flex flex-wrap items-center gap-2">
          {hasPermission('production') && (
            <>
              <button
                id="btn-open-fiche-ocr"
                onClick={() => setAppTab('fiche_ocr')}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-md transition-all border border-slate-700"
              >
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>Analyse Fiche IA (OCR)</span>
              </button>
              <button
                id="btn-open-daily-production-sheet"
                onClick={() => openDailySheet(selectedMaterialFilter === 'all' ? 'PVC' : selectedMaterialFilter)}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-xs font-bold rounded-xl shadow-md hover:shadow-lg transition-all"
              >
                <FileText className="w-4 h-4" />
                <span>Nouvelle Saisie Manuelle</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Material Workflows Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap gap-1.5 text-xs font-semibold">
          <button
            id="tab-prod-overview"
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Vue d'Ensemble &amp; Lots
          </button>

          <button
            id="tab-prod-pvc"
            onClick={() => setActiveTab('pvc')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'pvc'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-blue-700 bg-blue-50/70 hover:bg-blue-100 border border-blue-200'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            Workflow Cartons PVC
          </button>

          <button
            id="tab-prod-soumelle"
            onClick={() => setActiveTab('soumelle')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'soumelle'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-amber-700 bg-amber-50/70 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            Workflow SOUMELLE (18-45)
          </button>

          <button
            id="tab-prod-eva"
            onClick={() => setActiveTab('eva')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'eva'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-700 bg-emerald-50/70 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Architecture EVA Découplée
          </button>
        </div>

        {/* Material Quick-Filter Pill (for Overview tab) */}
        {activeTab === 'overview' && (
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
            <span className="text-[11px] text-slate-500 px-2">Filtrer Matière :</span>
            {(['all', 'EVA', 'SOUMELLE', 'PVC'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setSelectedMaterialFilter(m)}
                className={`px-3 py-1 rounded-lg transition-all ${
                  selectedMaterialFilter === m
                    ? m === 'PVC'
                      ? 'bg-blue-600 text-white font-bold shadow-xs'
                      : m === 'SOUMELLE'
                      ? 'bg-amber-600 text-white font-bold shadow-xs'
                      : m === 'EVA'
                      ? 'bg-emerald-600 text-white font-bold shadow-xs'
                      : 'bg-white text-slate-900 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {m === 'all' ? 'Toutes' : m}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* RENDER DEDICATED WORKFLOW TABS */}
      {activeTab === 'pvc' && <PVCWorkflowTab />}
      {activeTab === 'soumelle' && <SoumelleWorkflowTab />}
      {activeTab === 'eva' && <EVAWorkflowTab />}

      {/* OVERVIEW TAB CONTENT */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-medium">Production Conforme</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900 font-mono">
                  {kpis.totalConforming.toLocaleString()}
                </span>
                <span className="text-xs text-emerald-600 font-semibold">paires</span>
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Brut : {kpis.totalRaw.toLocaleString()} paires
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-medium">Taux de Rebut</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-rose-600 font-mono">
                  {kpis.scrapPct}%
                </span>
                <span className="text-xs text-rose-600 font-semibold font-mono">
                  ({kpis.totalScrap} paires)
                </span>
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Seuil cible max : &lt; 3.0%
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 shadow-xs">
              <span className="text-xs text-blue-700 font-semibold flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-blue-600" />
                Conditionnement PVC
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-blue-900 font-mono">
                  {kpis.totalCartons}
                </span>
                <span className="text-xs text-blue-700 font-semibold">cartons générés</span>
              </div>
              <span className="text-[11px] text-blue-600 mt-1 block">
                Calculé selon paires/carton modèle
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 shadow-xs">
              <span className="text-xs text-amber-800 font-semibold flex items-center gap-1.5">
                <Boxes className="w-3.5 h-3.5 text-amber-600" />
                Stock Soumelle (18 à 45)
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-amber-950 font-mono">
                  {kpis.totalSoumellePairs.toLocaleString()}
                </span>
                <span className="text-xs text-amber-800 font-semibold">paires en bacs</span>
              </div>
              <span className="text-[11px] text-amber-700 mt-1 block">
                Traçabilité pointure sans carton
              </span>
            </div>
          </div>

          {/* Machine Selector Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 uppercase">Sélection Machine :</span>
              <div className="flex flex-wrap gap-1.5">
                {filteredMachines.map((mach) => (
                  <button
                    key={mach.id}
                    onClick={() => setSelectedMachineId(mach.id)}
                    className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all ${
                      selectedMachineId === mach.id
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {mach.code}
                    <span className="text-[10px] ml-1.5 font-sans font-normal opacity-80">
                      ({mach.material || 'Multi'})
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={filterShift}
                onChange={(e) => setFilterShift(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-xs text-slate-700 font-medium rounded-lg px-2.5 py-1.5 focus:outline-hidden"
              >
                <option value="all">Tous les postes</option>
                <option value="matin">Poste Matin</option>
                <option value="soir">Poste Soir</option>
                <option value="nuit">Poste Nuit</option>
              </select>
            </div>
          </div>

          {/* Grille Interactive des 12 Plateformes / Empreintes */}
          <Interactive12PlatformsGrid machine={activeMachine} />

          {/* Production History & Batches Table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  Lots &amp; Fiches de Production — {activeMachine.code}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Traçabilité exhaustive par matière, règles de calcul appliquées et statut de conditionnement.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase text-[10px] font-semibold tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Date / Heure</th>
                    <th className="px-4 py-3">Matière</th>
                    <th className="px-4 py-3">Poste</th>
                    <th className="px-4 py-3">Modèle &amp; Configuration</th>
                    <th className="px-4 py-3">Pointure</th>
                    <th className="px-4 py-3 text-right">Produit</th>
                    <th className="px-4 py-3 text-right">Conforme</th>
                    <th className="px-4 py-3 text-right">Rebuts</th>
                    <th className="px-4 py-3">Destination Workflow</th>
                    <th className="px-4 py-3 text-center">Visé Chef</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredEntries.map((entry) => {
                    const scrapRate =
                      entry.qtyProduced > 0
                        ? ((entry.qtyRejected / entry.qtyProduced) * 100).toFixed(1)
                        : '0';

                    return (
                      <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-mono text-slate-500">
                          {entry.date}{' '}
                          <span className="text-slate-400 text-[11px]">{entry.time}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              entry.material === 'PVC'
                                ? 'bg-blue-100 text-blue-900 border border-blue-200'
                                : entry.material === 'SOUMELLE'
                                ? 'bg-amber-100 text-amber-950 border border-amber-200'
                                : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                            }`}
                          >
                            {entry.material || 'EVA'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold capitalize ${
                              entry.shift === 'matin'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : entry.shift === 'soir'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            }`}
                          >
                            {entry.shift}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">{entry.modelName}</div>
                          {entry.isBicolor ? (
                            <div className="flex items-center gap-1 text-[10px] text-indigo-700 font-medium mt-0.5">
                              <Split className="w-3 h-3" />
                              <span>Bicolor : {entry.moldId} (1 Paire)</span>
                            </div>
                          ) : (
                            <div className="text-[10px] text-slate-500">
                              Moule: {entry.moldId} • Couleur: {entry.color1}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono">
                          {entry.material === 'SOUMELLE' && entry.sizeQuantities ? (
                            <span
                              className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold text-[11px]"
                              title={JSON.stringify(entry.sizeQuantities)}
                            >
                              Détail 18-45
                            </span>
                          ) : (
                            <span className="font-bold text-slate-800 text-xs">
                              T{entry.size}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                          {entry.qtyProduced}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-black text-emerald-600">
                          {entry.qtyConforming}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-rose-600">
                          {entry.qtyRejected > 0 ? (
                            <span title={entry.rejectReason}>
                              {entry.qtyRejected} ({scrapRate}%)
                            </span>
                          ) : (
                            '0'
                          )}
                        </td>
                        <td className="px-4 py-3 text-[11px]">
                          {entry.material === 'PVC' ? (
                            <div className="text-blue-700 font-semibold flex items-center gap-1">
                              <Package className="w-3.5 h-3.5" />
                              <span>
                                {entry.packagingCartonsCount ||
                                  Math.floor((entry.qtyConforming || 0) / (entry.pairsPerCarton || 24))}{' '}
                                cartons
                              </span>
                            </div>
                          ) : entry.material === 'SOUMELLE' ? (
                            <div className="text-amber-700 font-semibold flex items-center gap-1">
                              <Boxes className="w-3.5 h-3.5" />
                              <span>Stock Soumelle unitaire</span>
                            </div>
                          ) : (
                            <div className="text-emerald-700 font-medium">
                              Archivé EVA
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => toggleVerifyEntry(entry.id)}
                            className={`p-1 rounded transition ${
                              entry.verifiedByChef
                                ? 'text-emerald-600 hover:bg-emerald-50'
                                : 'text-slate-300 hover:text-slate-500'
                            }`}
                            title={entry.verifiedByChef ? 'Visé par le chef' : 'Cliquer pour viser'}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => deleteProductionEntry(entry.id)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Supprimer la saisie"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredEntries.length === 0 && (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Aucune saisie de production pour cette machine et ces filtres. Utilisez le bouton "Nouvelle Fiche Journalière" pour enregistrer un lot.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Daily Production Sheet Modal */}
      <DailyProductionSheetModal
        isOpen={showDailySheetModal}
        onClose={() => setShowDailySheetModal(false)}
        defaultMaterial={dailySheetDefaultMaterial}
      />
    </div>
  );
};
