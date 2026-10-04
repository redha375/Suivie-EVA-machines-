import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Printer,
  Download,
  Filter,
  Layers,
  Boxes,
  Cpu,
  User,
  Calendar,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  RotateCcw,
  Eye,
  Camera,
  Check,
  X,
  Hash,
  PackageCheck,
  FileCheck,
  Users,
  Palette,
  ArrowRight
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ShiftType, ModelMasterItem, ProductionEntry } from '../../types';

const getColorPreviewHex = (c?: string) => {
  if (!c) return '#64748b';
  const lower = c.toLowerCase();
  if (lower.includes('noir')) return '#0f172a';
  if (lower.includes('blanc')) return '#f8fafc';
  if (lower.includes('bleu')) return '#1d4ed8';
  if (lower.includes('rouge')) return '#dc2626';
  if (lower.includes('gris')) return '#64748b';
  if (lower.includes('beige')) return '#d4b996';
  if (lower.includes('marron')) return '#78350f';
  if (lower.includes('kaki') || lower.includes('vert')) return '#15803d';
  if (lower.includes('bicolor')) return '#6366f1';
  return '#3b82f6';
};

export const FicheSuiviProductionView: React.FC = () => {
  const {
    modelMaster,
    addModelMaster,
    machines,
    currentUser,
    productionEntries,
    addProductionEntry,
    toggleVerifyEntry,
    deleteProductionEntry,
    can,
    t,
    setActiveTab,
  } = useApp();

  // Navigation tab inside Fiche de Suivi
  const [activeSubTab, setActiveSubTab] = useState<'fill' | 'history'>('fill');

  // New Model Modal
  const [isNewModelModalOpen, setIsNewModelModalOpen] = useState(false);
  const [newModelForm, setNewModelForm] = useState({
    model_name: '',
    article: '',
    designation: '',
    reference_moule: '',
    pointure: '36/41',
    paires_par_carton: 12,
    category: 'Femme',
    material: 'EVA' as const,
    photo: '',
  });
  const [newModelError, setNewModelError] = useState<string | null>(null);

  // Form State for Filling the Fiche
  const todayStr = new Date().toISOString().substring(0, 10);
  const [date, setDate] = useState<string>(todayStr);
  const [shift, setShift] = useState<ShiftType>('matin');
  const [teamGroup, setTeamGroup] = useState<string>('Équipe A');
  const [operatorName, setOperatorName] = useState<string>(currentUser?.name || 'Opérateur CTP');
  
  // Machine Selection (EVA1, EVA2, EVA3)
  const [machineId, setMachineId] = useState<string>(() => {
    const eva1 = machines.find((m) => m.code === 'EVA1' || m.code === 'EVA 1');
    return eva1?.id || machines[0]?.id || 'mach-eva-1';
  });

  const selectedMachine = useMemo(() => {
    return machines.find((m) => m.id === machineId) || machines[0];
  }, [machines, machineId]);

  // Station (Station 1 à Station 12 pour les machines EVA)
  const [stationNumber, setStationNumber] = useState<number>(1);

  // Couleurs de production (Palette standard et teinte libre)
  const STANDARD_COLORS = [
    'Noir',
    'Blanc',
    'Bleu Marine',
    'Rouge',
    'Bicolor (Noir/Blanc)',
    'Bicolor (Bleu/Blanc)',
    'Gris',
    'Beige',
    'Marron',
    'Kaki',
  ];
  const [selectedColor, setSelectedColor] = useState<string>('Noir');
  const [isCustomColor, setIsCustomColor] = useState<boolean>(false);
  const [customColor, setCustomColor] = useState<string>('');

  const activeColor = isCustomColor && customColor.trim() ? customColor.trim() : selectedColor;

  // Modal inspection fiche détaillée
  const [inspectedEntry, setInspectedEntry] = useState<ProductionEntry | null>(null);

  // Model Selection & Search
  const [modelSearch, setModelSearch] = useState<string>('');
  const [selectedModelId, setSelectedModelId] = useState<string>(() => {
    return modelMaster[0]?.id || '';
  });

  // Selected Model Master Item
  const selectedModel = useMemo(() => {
    return modelMaster.find((m) => m.id === selectedModelId) || modelMaster[0];
  }, [modelMaster, selectedModelId]);

  // Model automatic details (with possibility to adjust if needed)
  const [referenceMoule, setReferenceMoule] = useState<string>(() => {
    return selectedModel?.reference_moule || (selectedModel ? `M-${selectedModel.article || selectedModel.model_name}` : 'M-001');
  });
  const [pointure, setPointure] = useState<string>(() => selectedModel?.pointure || '36/41');
  const [pairesParCarton, setPairesParCarton] = useState<number>(() => selectedModel?.paires_par_carton || 12);
  const [category, setCategory] = useState<string>(() => selectedModel?.category || 'Femme');
  const [material, setMaterial] = useState<string>(() => selectedModel?.material || 'EVA');

  // Whenever user selects a new model, automatically retrieve and sync all model information!
  const handleSelectModel = (model: ModelMasterItem) => {
    setSelectedModelId(model.id);
    setReferenceMoule(model.reference_moule || `M-${model.article || model.model_name}`);
    setPointure(model.pointure || '36/41');
    setPairesParCarton(model.paires_par_carton || 12);
    setCategory(model.category || 'Femme');
    setMaterial(model.material || 'EVA');
  };

  // Counters & Quantities
  const [counterStart, setCounterStart] = useState<number>(1000);
  const [counterEnd, setCounterEnd] = useState<number>(1360);
  const [qtyProducedGross, setQtyProducedGross] = useState<number>(360);
  const [qtyRejected, setQtyRejected] = useState<number>(6);
  const [rejectionReason, setRejectionReason] = useState<string>('Bavures de démoulage légères');
  const [secondChoiceQty, setSecondChoiceQty] = useState<number>(4);
  const [observations, setObservations] = useState<string>('Cadence conforme. Pression d\'injection stabilisée.');

  // Form submission feedback
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Auto calculate Gross Produced from Counter End - Counter Start
  const handleCounterChange = (start: number, end: number) => {
    setCounterStart(start);
    setCounterEnd(end);
    const diff = Math.max(0, end - start);
    setQtyProducedGross(diff);
  };

  // Conforming pairs calculation
  const conformingPairs = Math.max(0, qtyProducedGross - qtyRejected - secondChoiceQty);

  // Automatic Cartons calculation (Base conditionnement du modèle)
  const cartonsFull = pairesParCarton > 0 ? Math.floor(conformingPairs / pairesParCarton) : 0;
  const remainderPairs = pairesParCarton > 0 ? conformingPairs % pairesParCarton : 0;

  // History Filter State
  const [historySearch, setHistorySearch] = useState<string>('');
  const [historyShiftFilter, setHistoryShiftFilter] = useState<string>('ALL');
  const [historyMachineFilter, setHistoryMachineFilter] = useState<string>('ALL');
  const [historyStationFilter, setHistoryStationFilter] = useState<string>('ALL');

  const filteredHistory = useMemo(() => {
    return productionEntries.filter((entry) => {
      const matchSearch =
        entry.modelName.toLowerCase().includes(historySearch.toLowerCase()) ||
        entry.operatorName.toLowerCase().includes(historySearch.toLowerCase()) ||
        (entry.color && entry.color.toLowerCase().includes(historySearch.toLowerCase())) ||
        (entry.mouldRef && entry.mouldRef.toLowerCase().includes(historySearch.toLowerCase())) ||
        (entry.batchNumber && entry.batchNumber.toLowerCase().includes(historySearch.toLowerCase()));
      const matchShift = historyShiftFilter === 'ALL' || entry.shift === historyShiftFilter;
      const matchMachine =
        historyMachineFilter === 'ALL' ||
        entry.machineId === historyMachineFilter ||
        (entry.machineCode && entry.machineCode.replace(/\s+/g, '') === historyMachineFilter.replace(/\s+/g, ''));
      const entryStation = entry.stationNumber || entry.platformNumber;
      const matchStation = historyStationFilter === 'ALL' || String(entryStation) === historyStationFilter;
      return matchSearch && matchShift && matchMachine && matchStation;
    });
  }, [productionEntries, historySearch, historyShiftFilter, historyMachineFilter, historyStationFilter]);

  // Handle Save Fiche
  const handleSaveFiche = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModel) {
      alert('Veuillez sélectionner un modèle');
      return;
    }

    const machineCode = selectedMachine?.code || 'EVA1';
    const batchNumber = `LOT-${date.replace(/-/g, '')}-${machineCode.replace(/\s+/g, '')}-ST${stationNumber}-${Math.floor(100 + Math.random() * 900)}`;

    addProductionEntry({
      batchNumber,
      date,
      time: new Date().toLocaleTimeString().substring(0, 5),
      shift,
      team: (teamGroup.includes('A') ? 'A' : teamGroup.includes('B') ? 'B' : 'C') as 'A' | 'B' | 'C',
      groupName: teamGroup,
      machineId,
      machineCode,
      platformNumber: stationNumber,
      stationNumber,
      modelId: selectedModel.id,
      modelName: selectedModel.model_name || selectedModel.article,
      material: material as any,
      rawMaterialType: material as any,
      color: activeColor,
      color1: activeColor,
      color2: activeColor.toLowerCase().includes('bicolor') ? 'Blanc' : undefined,
      pointure,
      operatorName,
      cycles: Math.max(0, counterEnd - counterStart),
      pairsPerCycle: 1,
      qtyProduced: qtyProducedGross,
      qtyConforming: conformingPairs,
      qtyRejected,
      secondChoicePairs: secondChoiceQty,
      thirdChoicePairs: 0,
      rebutNonRecuperable: qtyRejected,
      rebutRecuperable: 0,
      materialConsumedKg: Number((qtyProducedGross * 0.25).toFixed(2)),
      standardWeightKgPerPair: 0.25,
      prodHours: 7.0,
      downtimeMinutes: 0,
      rejectionReason: qtyRejected > 0 ? rejectionReason : undefined,
      counterStart,
      counterEnd,
      mouldRef: referenceMoule,
      verifiedByChef: false,
      tenantId: 'ctp-factory',
      moldId: referenceMoule,
      size: pointure,
      quantityGood: conformingPairs,
      cartonsCount: cartonsFull,
      loosePairs: remainderPairs,
      notes: observations,
    });

    setSubmitSuccess(
      `Fiche enregistrée : ${machineCode} → Station ${stationNumber} → ${teamGroup} → ${selectedModel.model_name || selectedModel.article} → ${referenceMoule} → ${pointure} → ${activeColor} (${cartonsFull} ctns, ${remainderPairs} vrac)`
    );
    setTimeout(() => setSubmitSuccess(null), 8000);
  };

  // Handle Quick Add New Model
  const handleAddNewModelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setNewModelError(null);

    const artName = newModelForm.model_name.trim() || newModelForm.article.trim();
    if (!artName) {
      setNewModelError('Le nom du modèle ou code article est obligatoire.');
      return;
    }
    if (!newModelForm.pointure.trim()) {
      setNewModelError('La pointure est obligatoire (ex: 36/41).');
      return;
    }
    if (newModelForm.paires_par_carton <= 0) {
      setNewModelError('Le nombre de paires par carton doit être supérieur à 0.');
      return;
    }

    const res = addModelMaster({
      article: newModelForm.article.trim() || artName,
      model_name: artName,
      designation: newModelForm.designation.trim() || `${artName} ${newModelForm.category} ${newModelForm.pointure}`,
      reference_moule: newModelForm.reference_moule.trim() || `M-${artName}-${newModelForm.pointure.replace(/[^0-9]/g, '')}`,
      pointure: newModelForm.pointure.trim(),
      paires_par_carton: Number(newModelForm.paires_par_carton),
      condt: `${newModelForm.paires_par_carton} PAIRES`,
      category: newModelForm.category,
      material: newModelForm.material,
      photo: newModelForm.photo || '',
      verified: true,
      source: 'MANUAL_ENTRY',
    });

    if (!res.success) {
      setNewModelError(res.message);
      return;
    }

    // Auto-select this newly created model
    if (res.item) {
      handleSelectModel(res.item);
    }

    setIsNewModelModalOpen(false);
    setNewModelForm({
      model_name: '',
      article: '',
      designation: '',
      reference_moule: '',
      pointure: '36/41',
      paires_par_carton: 12,
      category: 'Femme',
      material: 'EVA',
      photo: '',
    });
  };

  // Models filtered for dropdown search
  const filteredModelList = useMemo(() => {
    if (!modelSearch.trim()) return modelMaster.slice(0, 35);
    const q = modelSearch.toLowerCase();
    return modelMaster.filter(
      (m) =>
        m.model_name.toLowerCase().includes(q) ||
        m.article.toLowerCase().includes(q) ||
        m.pointure.toLowerCase().includes(q) ||
        m.designation.toLowerCase().includes(q)
    ).slice(0, 35);
  }, [modelMaster, modelSearch]);

  return (
    <div className="space-y-6">
      {/* Top Banner with Direct Access & High Visibility */}
      <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-950 border border-blue-800/40 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-60 h-60 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 shadow-sm">
                <FileSpreadsheet className="w-3.5 h-3.5" />
                CTP SMART — Fiche Officielle d'Atelier
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <ShieldCheck className="w-3.5 h-3.5" />
                Synchronisation Référentiel Active
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              Fiche de Suivi de Production
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              Saisie, enregistrement et consultation des fiches journalières de production par machine et par équipe.
              Récupération automatique des paramètres modèles (référence moule, pointure, paires/carton) et calcul des cartons.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => setIsNewModelModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-600/30 transition transform hover:-translate-y-0.5 active:translate-y-0"
              id="btn-quick-add-model"
            >
              <Plus className="w-4 h-4" />
              Ajouter un Nouveau Modèle
            </button>

            <button
              onClick={() => setActiveSubTab(activeSubTab === 'fill' ? 'history' : 'fill')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-sm font-semibold transition"
            >
              {activeSubTab === 'fill' ? (
                <>
                  <FileCheck className="w-4 h-4 text-emerald-400" />
                  Consulter les Fiches ({productionEntries.length})
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4 text-blue-400" />
                  Remplir une Fiche
                </>
              )}
            </button>

            <button
              onClick={() => setActiveTab('team_evaluation')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 rounded-xl text-sm font-semibold transition shadow-sm"
              title="Accéder au tableau comparatif et indicateurs des Équipes A, B et C"
            >
              <Users className="w-4 h-4 text-indigo-400" />
              <span>Évaluation Équipes A/B/C &rarr;</span>
            </button>
          </div>
        </div>

        {/* Sub Navigation Bar */}
        <div className="flex items-center gap-3 mt-6 pt-4 border-t border-slate-800/80">
          <button
            onClick={() => setActiveSubTab('fill')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition ${
              activeSubTab === 'fill'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-800/60 text-slate-400 hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            1. Remplir et Enregistrer une Fiche
          </button>
          <button
            onClick={() => setActiveSubTab('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition ${
              activeSubTab === 'history'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-800/60 text-slate-400 hover:text-white'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            2. Consulter l'Historique des Fiches ({productionEntries.length})
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {submitSuccess && (
        <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-xl shadow-sm flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
          <div className="flex-1 text-sm text-emerald-900 font-medium">
            {submitSuccess}
          </div>
          <button onClick={() => setSubmitSuccess(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* SUB-VIEW 1: REMPLIR UNE FICHE */}
      {activeSubTab === 'fill' && (
        <form onSubmit={handleSaveFiche} className="space-y-6">
          {/* BANDEAU CHAÎNE D'IDENTIFICATION COMPLÈTE */}
          <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white rounded-2xl p-5 shadow-lg border border-blue-900/60">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white shadow-sm">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-wide">
                    Chaîne d'Identification de Production
                  </h3>
                  <p className="text-[11px] text-blue-300">
                    Traçabilité usine requise : Machine → Station (1 à 12) → Équipe → Modèle → Moule → Pointure → Couleur
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/30 self-start sm:self-auto">
                Norme CTP EVA 12 Stations
              </span>
            </div>

            {/* Interactive Breadcrumb Steps */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {/* 1. Machine */}
              <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">
                <span className="text-[10px] text-blue-300 font-bold uppercase">1. Machine</span>
                <span className="font-black text-white font-mono text-sm">{selectedMachine?.code || 'EVA1'}</span>
              </div>

              <span className="text-blue-400 font-black">→</span>

              {/* 2. Station */}
              <div className="flex items-center gap-1.5 bg-amber-500/20 px-3 py-1.5 rounded-xl border border-amber-400/40">
                <span className="text-[10px] text-amber-300 font-bold uppercase">2. Station</span>
                <span className="font-black text-amber-300 font-mono text-sm">Station {stationNumber}</span>
              </div>

              <span className="text-blue-400 font-black">→</span>

              {/* 3. Équipe */}
              <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">
                <span className="text-[10px] text-blue-300 font-bold uppercase">3. Équipe</span>
                <span className="font-bold text-white text-sm">{teamGroup}</span>
              </div>

              <span className="text-blue-400 font-black">→</span>

              {/* 4. Modèle */}
              <div className="flex items-center gap-1.5 bg-emerald-500/20 px-3 py-1.5 rounded-xl border border-emerald-400/40">
                <span className="text-[10px] text-emerald-300 font-bold uppercase">4. Modèle</span>
                <span className="font-bold text-emerald-300 text-sm">{selectedModel?.model_name || selectedModel?.article || 'N/A'}</span>
              </div>

              <span className="text-blue-400 font-black">→</span>

              {/* 5. Moule */}
              <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">
                <span className="text-[10px] text-blue-300 font-bold uppercase">5. Moule</span>
                <span className="font-bold text-white font-mono text-sm">{referenceMoule}</span>
              </div>

              <span className="text-blue-400 font-black">→</span>

              {/* 6. Pointure */}
              <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">
                <span className="text-[10px] text-blue-300 font-bold uppercase">6. Pointure</span>
                <span className="font-bold text-white text-sm">{pointure}</span>
              </div>

              <span className="text-blue-400 font-black">→</span>

              {/* 7. Couleur */}
              <div className="flex items-center gap-1.5 bg-purple-500/20 px-3 py-1.5 rounded-xl border border-purple-400/40">
                <span className="text-[10px] text-purple-300 font-bold uppercase">7. Couleur</span>
                <span
                  className="w-2.5 h-2.5 rounded-full border border-white/40 shadow-sm shrink-0"
                  style={{ backgroundColor: getColorPreviewHex(activeColor) }}
                />
                <span className="font-bold text-purple-200 text-sm">{activeColor}</span>
              </div>
            </div>
          </div>

          {/* Section 1: Entête Atelier & Équipe */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-black flex items-center justify-center">1</span>
                Machine d'Injection EVA & Station (1 à 12)
              </h2>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 self-start sm:self-auto">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                EVA1, EVA2, EVA3 enregistrées (12 stations chacune)
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* 1.1 Machine Selection with EVA1, EVA2, EVA3 Buttons */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  1. Machine EVA
                </label>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {['EVA1', 'EVA2', 'EVA3'].map((code) => {
                    const mach = machines.find((m) => m.code === code || m.code === code.replace('EVA', 'EVA '));
                    const isSelected = selectedMachine?.code === code || selectedMachine?.code === code.replace('EVA', 'EVA ');
                    return (
                      <button
                        key={code}
                        type="button"
                        onClick={() => {
                          if (mach) setMachineId(mach.id);
                        }}
                        className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center ${
                          isSelected
                            ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20 ring-2 ring-blue-400'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                        }`}
                      >
                        <span className="text-base font-black tracking-tight">{code}</span>
                        <span className={`text-[10px] font-bold ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                          12 Stations
                        </span>
                      </button>
                    );
                  })}
                </div>
                <select
                  value={machineId}
                  onChange={(e) => setMachineId(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-700"
                >
                  {machines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.code} — {m.name} ({m.platformsCount || 12} stations)
                    </option>
                  ))}
                </select>
              </div>

              {/* 1.2 Station 1 à 12 Interactive Grid */}
              <div className="lg:col-span-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <span>2. Station de Travail (1 à 12)</span>
                    <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                      {selectedMachine?.code || 'EVA1'}
                    </span>
                  </label>
                  <span className="text-xs font-black text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-200">
                    Station {stationNumber} sélectionnée
                  </span>
                </div>

                <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((st) => {
                    const isSelected = stationNumber === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setStationNumber(st)}
                        className={`py-2 px-1 rounded-lg text-center transition flex flex-col items-center justify-center ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/30 ring-2 ring-amber-400 scale-105'
                            : 'bg-white text-slate-700 hover:bg-blue-50 hover:text-blue-700 border border-slate-200'
                        }`}
                      >
                        <span className="text-[8px] uppercase tracking-tighter opacity-70">St.</span>
                        <span className="text-sm font-black leading-none">{st}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Chaque machine EVA possède 12 stations de moulage. Sélectionnez la station correspondant à ce lot de production.
                </p>
              </div>
            </div>

            {/* Équipe & Date & Opérateur */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-100">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">3. Équipe & Shift</label>
                <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl">
                  {(['matin', 'soir', 'nuit'] as ShiftType[]).map((s) => {
                    const teamLabel = s === 'matin' ? 'Équipe A' : s === 'soir' ? 'Équipe B' : 'Équipe C';
                    const isSelected = shift === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          setShift(s);
                          setTeamGroup(teamLabel);
                        }}
                        className={`py-1.5 text-xs font-bold rounded-lg transition ${
                          isSelected ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {teamLabel}
                      </button>
                    );
                  })}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  {shift === 'matin' ? '06h00 - 14h00 (Équipe A)' : shift === 'soir' ? '14h00 - 22h00 (Équipe B)' : '22h00 - 06h00 (Équipe C)'}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Date de Production</label>
                <div className="relative">
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Opérateur / Chef d'Équipe</label>
                <div className="relative">
                  <input
                    type="text"
                    value={operatorName}
                    onChange={(e) => setOperatorName(e.target.value)}
                    placeholder="Nom de l'opérateur"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Sélection du Modèle, Moule, Pointure & Couleur */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-black flex items-center justify-center">2</span>
                  Modèle, Moule, Pointure & Couleur
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  La sélection du modèle pré-remplit instantanément le moule, la pointure, le conditionnement par carton et la catégorie.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsNewModelModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition self-start"
              >
                <Plus className="w-3.5 h-3.5" />
                Créer un nouveau modèle
              </button>
            </div>

            {/* Quick Model Search Box */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Rechercher parmi les {modelMaster.length} modèles disponibles</label>
              <div className="relative">
                <input
                  type="text"
                  value={modelSearch}
                  onChange={(e) => setModelSearch(e.target.value)}
                  placeholder="Tapez le nom, code article ou pointure (ex: 003, SB23, CLICK 1, TANGO, 36/41)..."
                  className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            {/* Quick selection chips */}
            <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200 mb-6">
              {filteredModelList.map((m) => {
                const isSelected = selectedModel?.id === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleSelectModel(m)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition text-left flex items-center gap-2 ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm font-bold'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50/50'
                    }`}
                  >
                    <span>{m.model_name || m.article}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${isSelected ? 'bg-blue-700 text-blue-100' : 'bg-slate-100 text-slate-500'}`}>
                      {m.pointure}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${isSelected ? 'bg-blue-700 text-blue-100' : 'bg-slate-100 text-slate-500'}`}>
                      {m.paires_par_carton}p
                    </span>
                  </button>
                );
              })}
            </div>

            {/* AUTO-FILLED RECOVERED PARAMETERS (Displayed in Clean Responsive Grid) */}
            <div className="bg-gradient-to-br from-blue-50/70 via-indigo-50/40 to-slate-50 rounded-2xl border border-blue-100 p-5">
              <div className="flex items-center gap-2 mb-3 text-xs font-bold text-blue-900 uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-blue-600" />
                Données Récupérées Automatiquement du Modèle
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Référence Moule */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Référence Moule
                    <span className="text-[10px] text-blue-600 ml-1 font-bold">(Auto)</span>
                  </label>
                  <input
                    type="text"
                    value={referenceMoule}
                    onChange={(e) => setReferenceMoule(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono font-bold bg-white border border-blue-200 rounded-xl text-blue-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                </div>

                {/* Pointure */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Pointure / Intervalle
                    <span className="text-[10px] text-blue-600 ml-1 font-bold">(Auto)</span>
                  </label>
                  <input
                    type="text"
                    value={pointure}
                    onChange={(e) => setPointure(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-bold bg-white border border-blue-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                </div>

                {/* Nombre de Paires / Carton */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Paires par Carton
                    <span className="text-[10px] text-blue-600 ml-1 font-bold">(Auto)</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={pairesParCarton}
                    onChange={(e) => setPairesParCarton(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm font-bold bg-white border border-blue-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                </div>

                {/* Catégorie & Matière */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Catégorie & Matière
                    <span className="text-[10px] text-blue-600 ml-1 font-bold">(Auto)</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-1/2 px-2.5 py-2 text-xs font-semibold bg-white border border-blue-200 rounded-xl text-slate-800"
                    />
                    <select
                      value={material}
                      onChange={(e) => setMaterial(e.target.value)}
                      className="w-1/2 px-2.5 py-2 text-xs font-bold bg-white border border-blue-200 rounded-xl text-slate-800"
                    >
                      <option value="EVA">EVA</option>
                      <option value="PVC">PVC</option>
                      <option value="TPR">TPR</option>
                      <option value="SOUMELLE">SOUMELLE</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 7. COULEUR DE PRODUCTION */}
              <div className="mt-4 pt-4 border-t border-blue-100">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Palette className="w-4 h-4 text-purple-600" />
                    Couleur de Production
                  </label>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-200">
                    Couleur active : {activeColor}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 mb-2">
                  {STANDARD_COLORS.map((col) => {
                    const isSelected = !isCustomColor && selectedColor === col;
                    return (
                      <button
                        key={col}
                        type="button"
                        onClick={() => {
                          setSelectedColor(col);
                          setIsCustomColor(false);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-purple-600 text-white border-purple-600 shadow-sm font-bold ring-2 ring-purple-300'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-purple-300 hover:bg-purple-50/40'
                        }`}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-slate-300 shadow-sm shrink-0"
                          style={{ backgroundColor: getColorPreviewHex(col) }}
                        />
                        <span>{col}</span>
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => setIsCustomColor(!isCustomColor)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                      isCustomColor
                        ? 'bg-purple-600 text-white border-purple-600 font-bold'
                        : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    + Autre teinte...
                  </button>
                </div>

                {isCustomColor && (
                  <div className="mt-2">
                    <input
                      type="text"
                      value={customColor}
                      onChange={(e) => setCustomColor(e.target.value)}
                      placeholder="Saisissez la teinte personnalisée (ex: Vert Olive, Jaune Fluo, Bicolor Bleu/Blanc...)"
                      className="w-full px-3 py-2 text-xs border border-purple-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none bg-purple-50/30 font-medium"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Compteurs Machine & Calcul Production */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-black flex items-center justify-center">3</span>
              Compteurs Machine & Quantités Produites
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Index Compteur Début</label>
                <div className="relative">
                  <input
                    type="number"
                    value={counterStart}
                    onChange={(e) => handleCounterChange(Number(e.target.value), counterEnd)}
                    className="w-full pl-9 pr-3 py-2 text-sm font-mono font-semibold border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                  <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Index Compteur Fin</label>
                <div className="relative">
                  <input
                    type="number"
                    value={counterEnd}
                    onChange={(e) => handleCounterChange(counterStart, Number(e.target.value))}
                    className="w-full pl-9 pr-3 py-2 text-sm font-mono font-semibold border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                  <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Quantité Brute Détectée</label>
                <div className="px-4 py-2 bg-slate-100 rounded-xl border border-slate-200 font-mono font-black text-slate-900 text-base">
                  {qtyProducedGross} paires
                </div>
              </div>
            </div>

            {/* Rebuts et Conformes */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <label className="block text-xs font-semibold text-red-700 mb-1">Paires Rebut / Déchets</label>
                <input
                  type="number"
                  min="0"
                  value={qtyRejected}
                  onChange={(e) => setQtyRejected(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-bold text-red-600 bg-white border border-red-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-amber-700 mb-1">Paires 2ème Choix</label>
                <input
                  type="number"
                  min="0"
                  value={secondChoiceQty}
                  onChange={(e) => setSecondChoiceQty(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-bold text-amber-600 bg-white border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-emerald-700 mb-1">Paires Conformes (1er Choix)</label>
                <div className="px-3 py-2 text-sm font-mono font-black text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl">
                  {conformingPairs} paires
                </div>
              </div>
            </div>

            {qtyRejected > 0 && (
              <div className="mt-3">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Motif du Rebut / Défaut</label>
                <input
                  type="text"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Ex: Bavure importante, bulle d'air, déformation au démoulage..."
                />
              </div>
            )}
          </div>

          {/* Section 4: Calcul Automatique du Conditionnement Cartons */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-black flex items-center justify-center">4</span>
              Calcul Automatique du Conditionnement (Cartons Pleins & Vrac)
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shrink-0">
                  <Boxes className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-medium text-blue-700">Cartons Pleins ({pairesParCarton}p/ctn)</div>
                  <div className="text-2xl font-black text-blue-950 font-mono">{cartonsFull} cartons</div>
                </div>
              </div>

              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-medium text-amber-700">Paires en Vrac / Carton Ouvert</div>
                  <div className="text-2xl font-black text-amber-950 font-mono">{remainderPairs} paires</div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-700 text-white flex items-center justify-center font-bold shrink-0">
                  <PackageCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-600">Total Validé Conforme</div>
                  <div className="text-2xl font-black text-slate-900 font-mono">{conformingPairs} paires</div>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Observations d'Atelier</label>
              <textarea
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Remarques éventuelles sur la matière, outillage ou réglages machine..."
              />
            </div>
          </div>

          {/* Action Submit Button */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-base font-black shadow-lg shadow-emerald-600/30 transition transform hover:-translate-y-0.5 active:translate-y-0"
              id="btn-save-fiche-production"
            >
              <CheckCircle2 className="w-5 h-5" />
              Enregistrer et Valider la Fiche de Production
            </button>
          </div>
        </form>
      )}

      {/* SUB-VIEW 2: CONSULTER L'HISTORIQUE DES FICHES */}
      {activeSubTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Registre des Fiches de Suivi Enregistrées</h2>
              <p className="text-xs text-slate-500">
                Consultez, filtrez et validez les fiches de production issues des équipes A, B et C.
              </p>
            </div>

            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition self-start"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimer le Registre
            </button>
          </div>

          {/* Search & Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Rechercher par lot, modèle, opérateur, couleur..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>

            <select
              value={historyShiftFilter}
              onChange={(e) => setHistoryShiftFilter(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="ALL">Tous les Shifts (A, B, C)</option>
              <option value="matin">Matin (Équipe A)</option>
              <option value="soir">Soir (Équipe B)</option>
              <option value="nuit">Nuit (Équipe C)</option>
            </select>

            <select
              value={historyMachineFilter}
              onChange={(e) => setHistoryMachineFilter(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="ALL">Toutes les Machines</option>
              {machines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.code}
                </option>
              ))}
            </select>

            <select
              value={historyStationFilter}
              onChange={(e) => setHistoryStationFilter(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="ALL">Toutes les Stations (1 à 12)</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((st) => (
                <option key={st} value={String(st)}>
                  Station {st}
                </option>
              ))}
            </select>
          </div>

          {/* Table of Recorded Fiches with Machine → Station → Équipe → Modèle → Moule → Pointure → Couleur */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Date & Lot</th>
                  <th className="py-2.5 px-3">Machine & Station</th>
                  <th className="py-2.5 px-3">Équipe</th>
                  <th className="py-2.5 px-3">Modèle & Moule</th>
                  <th className="py-2.5 px-3">Pt. & Couleur</th>
                  <th className="py-2.5 px-3 text-right">Brut</th>
                  <th className="py-2.5 px-3 text-right">Rebut</th>
                  <th className="py-2.5 px-3 text-right">Conformes</th>
                  <th className="py-2.5 px-3 text-right">Cartons</th>
                  <th className="py-2.5 px-3 text-center">Validation</th>
                  <th className="py-2.5 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-8 text-center text-slate-400">
                      Aucune fiche de suivi enregistrée ne correspond aux critères.
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((entry) => {
                    const mach = machines.find((m) => m.id === entry.machineId);
                    const machCode = entry.machineCode || mach?.code || 'EVA1';
                    const stNum = entry.stationNumber || entry.platformNumber || 1;
                    const entryColor = entry.color || entry.color1 || 'Standard CTP';

                    return (
                      <tr key={entry.id} className="hover:bg-slate-50 transition">
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-900">{entry.date}</div>
                          <div className="font-mono text-[10px] text-slate-500">{entry.batchNumber || 'N/A'}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-blue-50 text-blue-900 font-bold border border-blue-200">
                            <span className="font-black text-blue-700">{machCode}</span>
                            <span className="text-slate-400">•</span>
                            <span className="text-amber-700 font-extrabold">St. {stNum}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-800">
                            {entry.team ? `Équipe ${entry.team}` : (entry.shift === 'matin' ? 'Équipe A' : entry.shift === 'soir' ? 'Équipe B' : 'Équipe C')}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900">{entry.modelName}</div>
                          <div className="font-mono text-[10px] text-blue-600 font-semibold">{entry.mouldRef || entry.moldId || '-'}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-800">{entry.pointure || entry.size || '-'}</div>
                          <div className="flex items-center gap-1 text-[10px] text-slate-600 font-medium">
                            <span
                              className="w-2 h-2 rounded-full border border-slate-300 shrink-0"
                              style={{ backgroundColor: getColorPreviewHex(entryColor) }}
                            />
                            <span>{entryColor}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-600">
                          {entry.qtyProduced}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-red-600">
                          {entry.qtyRejected || 0}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-700">
                          {entry.quantityGood ?? (entry.qtyProduced - (entry.qtyRejected || 0))}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            {entry.cartonsCount || Math.floor((entry.quantityGood || entry.qtyProduced) / 12)} ctn
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => toggleVerifyEntry(entry.id)}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition ${
                              entry.verifiedByChef
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            {entry.verifiedByChef ? 'Validé' : 'En attente'}
                          </button>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => setInspectedEntry(entry)}
                              className="text-slate-500 hover:text-blue-600 p-1 rounded hover:bg-blue-50 transition"
                              title="Inspecter la fiche de suivi complète"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm('Supprimer cette fiche de suivi ?')) {
                                  deleteProductionEntry(entry.id);
                                }
                              }}
                              className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition"
                              title="Supprimer la fiche"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: INSPECTION DE LA FICHE COMPLÈTE */}
      {inspectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-100 text-blue-800 uppercase tracking-wider">
                    Fiche de Suivi CTP
                  </span>
                  <span className="font-mono text-xs text-slate-500">{inspectedEntry.batchNumber}</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mt-1">
                  Traçabilité Usine — Lot {inspectedEntry.batchNumber}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectedEntry(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Complete Identification Chain Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white rounded-xl p-4 space-y-2">
              <div className="text-[10px] text-blue-300 font-bold uppercase tracking-wider">
                Chaîne d'identification enregistrée
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="px-2 py-1 rounded bg-white/10 font-bold">
                  Machine: {inspectedEntry.machineCode || 'EVA1'}
                </span>
                <span className="text-blue-400 font-bold">&rarr;</span>
                <span className="px-2 py-1 rounded bg-amber-500/20 text-amber-300 font-bold">
                  Station {inspectedEntry.stationNumber || inspectedEntry.platformNumber || 1}
                </span>
                <span className="text-blue-400 font-bold">&rarr;</span>
                <span className="px-2 py-1 rounded bg-white/10 font-bold">
                  {inspectedEntry.groupName || (inspectedEntry.team ? `Équipe ${inspectedEntry.team}` : inspectedEntry.shift)}
                </span>
                <span className="text-blue-400 font-bold">&rarr;</span>
                <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                  {inspectedEntry.modelName}
                </span>
                <span className="text-blue-400 font-bold">&rarr;</span>
                <span className="px-2 py-1 rounded bg-white/10 font-bold">
                  Moule: {inspectedEntry.mouldRef || inspectedEntry.moldId || '-'}
                </span>
                <span className="text-blue-400 font-bold">&rarr;</span>
                <span className="px-2 py-1 rounded bg-white/10 font-bold">
                  Pt: {inspectedEntry.pointure || inspectedEntry.size || '-'}
                </span>
                <span className="text-blue-400 font-bold">&rarr;</span>
                <span className="px-2 py-1 rounded bg-purple-500/20 text-purple-300 font-bold flex items-center gap-1">
                  <span
                    className="w-2 h-2 rounded-full border border-white/50"
                    style={{ backgroundColor: getColorPreviewHex(inspectedEntry.color || inspectedEntry.color1) }}
                  />
                  {inspectedEntry.color || inspectedEntry.color1 || 'Standard CTP'}
                </span>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-slate-500 text-[10px] uppercase font-bold">Date & Heure</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">{inspectedEntry.date}</div>
                <div className="text-[10px] text-slate-500">{inspectedEntry.time || '10:00'}</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-slate-500 text-[10px] uppercase font-bold">Opérateur</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">{inspectedEntry.operatorName}</div>
                <div className="text-[10px] text-slate-500">Poste CTP</div>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                <div className="text-blue-600 text-[10px] uppercase font-bold">Compteurs Début / Fin</div>
                <div className="text-sm font-mono font-bold text-blue-950 mt-0.5">
                  {inspectedEntry.counterStart ?? 0} &rarr; {inspectedEntry.counterEnd ?? 0}
                </div>
                <div className="text-[10px] text-blue-700 font-semibold">{inspectedEntry.cycles || 0} cycles</div>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <div className="text-emerald-700 text-[10px] uppercase font-bold">Conditionnement</div>
                <div className="text-sm font-bold text-emerald-950 mt-0.5">
                  {inspectedEntry.cartonsCount || Math.floor(inspectedEntry.qtyConforming / 12)} Cartons
                </div>
                <div className="text-[10px] text-emerald-700 font-semibold">
                  + {inspectedEntry.loosePairs || 0} paires vrac
                </div>
              </div>
            </div>

            {/* Quantities Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold">
                  <tr>
                    <th className="py-2 px-3">Production Brute</th>
                    <th className="py-2 px-3 text-right">2ème Choix</th>
                    <th className="py-2 px-3 text-right">3ème Choix</th>
                    <th className="py-2 px-3 text-right">Rebuts</th>
                    <th className="py-2 px-3 text-right">Paires Conformes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="font-mono">
                    <td className="py-2.5 px-3 font-bold text-slate-900">{inspectedEntry.qtyProduced} paires</td>
                    <td className="py-2.5 px-3 text-right text-amber-700 font-bold">{inspectedEntry.secondChoicePairs || 0}</td>
                    <td className="py-2.5 px-3 text-right text-amber-900 font-bold">{inspectedEntry.thirdChoicePairs || 0}</td>
                    <td className="py-2.5 px-3 text-right text-red-600 font-bold">{inspectedEntry.qtyRejected || 0}</td>
                    <td className="py-2.5 px-3 text-right text-emerald-700 font-black text-sm">
                      {inspectedEntry.quantityGood ?? (inspectedEntry.qtyProduced - (inspectedEntry.qtyRejected || 0))} paires
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {inspectedEntry.notes && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <span className="font-bold text-slate-700">Observations : </span>
                <span className="text-slate-600">{inspectedEntry.notes}</span>
              </div>
            )}

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => toggleVerifyEntry(inspectedEntry.id)}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition ${
                  inspectedEntry.verifiedByChef
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                {inspectedEntry.verifiedByChef ? 'Fiche Validée par Chef' : 'Marquer comme Validée'}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Imprimer
                </button>
                <button
                  type="button"
                  onClick={() => setInspectedEntry(null)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: AJOUTER UN NOUVEAU MODÈLE */}
      {isNewModelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-lg">
                <Plus className="w-5 h-5 text-blue-600" />
                Ajouter un Nouveau Modèle
              </div>
              <button
                type="button"
                onClick={() => setIsNewModelModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {newModelError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 font-medium">
                {newModelError}
              </div>
            )}

            <form onSubmit={handleAddNewModelSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Code Article / Réf</label>
                  <input
                    type="text"
                    placeholder="Ex: 021C, SB99, CLICK-1"
                    value={newModelForm.article}
                    onChange={(e) => setNewModelForm({ ...newModelForm, article: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nom du Modèle</label>
                  <input
                    type="text"
                    placeholder="Ex: Sabot Presto Femme"
                    value={newModelForm.model_name}
                    onChange={(e) => setNewModelForm({ ...newModelForm, model_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Désignation Complète</label>
                <input
                  type="text"
                  placeholder="Ex: SABOT PRESTO FEMME 36/41 NOIR"
                  value={newModelForm.designation}
                  onChange={(e) => setNewModelForm({ ...newModelForm, designation: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Référence Moule</label>
                  <input
                    type="text"
                    placeholder="Ex: M-SB99-01"
                    value={newModelForm.reference_moule}
                    onChange={(e) => setNewModelForm({ ...newModelForm, reference_moule: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Pointure / Plage</label>
                  <input
                    type="text"
                    placeholder="Ex: 36/41, 39/44"
                    value={newModelForm.pointure}
                    onChange={(e) => setNewModelForm({ ...newModelForm, pointure: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Paires / Carton</label>
                  <input
                    type="number"
                    min="1"
                    value={newModelForm.paires_par_carton}
                    onChange={(e) => setNewModelForm({ ...newModelForm, paires_par_carton: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Catégorie</label>
                  <select
                    value={newModelForm.category}
                    onChange={(e) => setNewModelForm({ ...newModelForm, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="Femme">Femme</option>
                    <option value="Homme">Homme</option>
                    <option value="Fillette">Fillette</option>
                    <option value="Garçon">Garçon</option>
                    <option value="Enfant">Enfant</option>
                    <option value="Bébé">Bébé</option>
                    <option value="Kadet">Kadet</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Matière</label>
                  <select
                    value={newModelForm.material}
                    onChange={(e) => setNewModelForm({ ...newModelForm, material: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="EVA">EVA</option>
                    <option value="PVC">PVC</option>
                    <option value="TPR">TPR</option>
                    <option value="SOUMELLE">SOUMELLE</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Photo du Modèle (Optionnelle)</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setNewModelForm({ ...newModelForm, photo: reader.result as string });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {newModelForm.photo && (
                    <span className="text-emerald-600 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Photo chargée
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewModelModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-md shadow-blue-600/30"
                >
                  Enregistrer le Modèle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
