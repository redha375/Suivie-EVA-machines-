import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  Zap,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Minus,
  RotateCcw,
  Wifi,
  WifiOff,
  Layers,
  Cpu,
  Package,
  Clock,
  FlaskConical,
  Award,
  ChevronRight,
  Sparkles,
  TrendingUp,
  FileSpreadsheet,
  Check,
  ShieldCheck,
  Wrench,
  Hash,
  Boxes,
  SlidersHorizontal,
} from 'lucide-react';
import { ShiftType, PlatformState, PlatformConfigItem } from '../types';
import { OneClickProductionDashboard } from './production/OneClickProductionDashboard';

export const FastEntryView: React.FC = () => {
  const {
    t,
    machines,
    currentUser,
    users,
    shoeModels,
    modelMaster,
    addProductionEntry,
    addQualityRecord,
    addMaintenanceTicket,
    isOnline,
    pendingSyncCount,
    productionEntries,
    toggleVerifyEntry,
  } = useApp();

  // Top Tabs: Saisie 1-Clic vs Dashboard Rapide vs Historique
  const [activeTabMode, setActiveTabMode] = useState<'entry' | 'dashboard' | 'history'>('entry');

  // Time & Shift Auto-detection
  const now = new Date();
  const currentHour = now.getHours();
  const autoShift: ShiftType =
    currentHour >= 6 && currentHour < 14 ? 'matin' : currentHour >= 14 && currentHour < 22 ? 'soir' : 'nuit';

  // Section 1: Équipe, Groupe, Opérateur, Machine
  const [shift, setShift] = useState<ShiftType>(autoShift);
  const [groupName, setGroupName] = useState<string>('Groupe A');
  const [operatorId, setOperatorId] = useState<string>(currentUser.id);
  const [operatorName, setOperatorName] = useState<string>(currentUser.name);

  // Machine selection: Defaults to EVA 1, EVA 2, EVA 3
  const [machineId, setMachineId] = useState<string>(() => {
    const eva1 = machines.find((m) => m.code === 'EVA 1');
    return eva1?.id || machines[0]?.id || 'mach-eva-1';
  });

  const selectedMachine = useMemo(() => {
    return machines.find((m) => m.id === machineId) || machines[0];
  }, [machines, machineId]);

  // Section 2: Modèle, Référence, Pointure, Référence Moule
  const availableModels = useMemo(() => {
    return shoeModels.filter((m) => m.material === 'EVA' || m.defaultMaterial === 'EVA');
  }, [shoeModels]);

  const [selectedModelId, setSelectedModelId] = useState<string>(() => availableModels[0]?.id || 'mod-sb23');
  const selectedModel = useMemo(() => {
    return (
      shoeModels.find((m) => m.id === selectedModelId) ||
      availableModels[0] ||
      shoeModels[0]
    );
  }, [shoeModels, selectedModelId, availableModels]);

  // Reference Moule
  const [mouldRef, setMouldRef] = useState<string>(() => {
    return selectedModel?.associatedMolds?.[0] || `M-${selectedModel?.code || 'SB23'}-01`;
  });

  // Keep mouldRef synced with selected model
  useEffect(() => {
    if (selectedModel) {
      const defaultMould = selectedModel.associatedMolds?.[0] || `M-${selectedModel.code || selectedModel.name.substring(0, 4)}-01`;
      setMouldRef(defaultMould);
    }
  }, [selectedModel]);

  // Pointure (Simple ou Double combo ex: 18-19, 36-37, 43-44)
  const [pointureStr, setPointureStr] = useState<string>('36-37');

  // Section 3: Couleurs (Couleur 1 & Couleur 2)
  const [color1, setColor1] = useState<string>('Blanc Pur');
  const [color2, setColor2] = useState<string>('Noir Mat');

  // Section 4: 12 Plateformes (États Active/Vide/Défaut, Pointures simples ou combo)
  const [platformNumber, setPlatformNumber] = useState<number>(1);
  const [platformsConfig, setPlatformsConfig] = useState<PlatformConfigItem[]>(() => {
    const defaultDualSizes = ['18-19', '20-21', '22-23', '24-25', '26-27', '28-29', '36-37', '38-39', '40-41', '42-43', '44-45', '40-41'];
    return Array.from({ length: 12 }).map((_, i) => ({
      id: i + 1,
      number: i + 1,
      name: `Plateforme ${i + 1 < 10 ? `0${i + 1}` : i + 1}`,
      state: 'Active' as PlatformState,
      pointure: defaultDualSizes[i] || '36-37',
      pairsCount: 2, // Maximum 2 pairs strictly
    }));
  });

  // Calculate active platforms and theoretical capacity
  const activePlatformsCount = useMemo(() => {
    return platformsConfig.filter((p) => p.state === 'Active').length;
  }, [platformsConfig]);

  // Toggle platform state
  const handleTogglePlatformState = (pNum: number) => {
    setPlatformsConfig((prev) =>
      prev.map((p) => {
        if (p.number !== pNum) return p;
        let nextState: PlatformState = 'Active';
        if (p.state === 'Active') nextState = 'Vide';
        else if (p.state === 'Vide') nextState = 'Défaut';
        else nextState = 'Active';
        return {
          ...p,
          state: nextState,
          pairsCount: nextState === 'Active' ? 2 : 0,
        };
      })
    );
  };

  const handleUpdatePlatformPointure = (pNum: number, newPt: string) => {
    setPlatformsConfig((prev) =>
      prev.map((p) => (p.number === pNum ? { ...p, pointure: newPt } : p))
    );
  };

  // Section 5: Compteurs Entrée / Sortie & Cycles
  // Initial counter start from machine lastCounterValue
  const [counterStart, setCounterStart] = useState<number>(() => selectedMachine?.lastCounterValue || 14820);
  const [counterEnd, setCounterEnd] = useState<number>(() => (selectedMachine?.lastCounterValue || 14820) + 20);

  // When machine changes, update start counter
  useEffect(() => {
    if (selectedMachine) {
      setCounterStart(selectedMachine.lastCounterValue || 14820);
      setCounterEnd((selectedMachine.lastCounterValue || 14820) + 20);
    }
  }, [selectedMachine]);

  // Automatic Calculation: Cycles = Compteur sortie - Compteur entrée
  const cycles = useMemo(() => {
    return Math.max(0, counterEnd - counterStart);
  }, [counterEnd, counterStart]);

  // Automatic Calculation: Paires = Cycles × 2
  // (Formule demandée: Cycles = Compteur sortie − Compteur entrée, Paires = Cycles × 2)
  const defaultCalculatedPairs = useMemo(() => {
    return cycles * 2;
  }, [cycles]);

  const [qtyProduced, setQtyProduced] = useState<number>(defaultCalculatedPairs);

  // Sync qtyProduced when cycles change
  useEffect(() => {
    setQtyProduced(cycles * 2);
  }, [cycles]);

  // Section 6: Paires/Carton & Cartons
  const [pairsPerCarton, setPairsPerCarton] = useState<number>(() => selectedModel?.pairsPerCarton || 24);

  useEffect(() => {
    if (selectedModel?.pairsPerCarton) {
      setPairsPerCarton(selectedModel.pairsPerCarton);
    }
  }, [selectedModel]);

  // Section 7: Rebut & 2ème Qualité
  const [qtyRejected, setQtyRejected] = useState<number>(0);
  const [secondChoicePairs, setSecondChoicePairs] = useState<number>(0);
  const [rejectReason, setRejectReason] = useState<string>('Bavures d’injection');

  // Automatic Conforming calculation: Conformes = Produites - Rebuts - 2ème qualité
  const qtyConforming = useMemo(() => {
    return Math.max(0, qtyProduced - qtyRejected - secondChoicePairs);
  }, [qtyProduced, qtyRejected, secondChoicePairs]);

  // Cartons calculés automatiquement: Cartons = Math.floor(qtyConforming / pairsPerCarton)
  const cartonsCount = useMemo(() => {
    if (pairsPerCarton <= 0) return 0;
    return Math.floor(qtyConforming / pairsPerCarton);
  }, [qtyConforming, pairsPerCarton]);

  const remainderPairs = useMemo(() => {
    if (pairsPerCarton <= 0) return 0;
    return qtyConforming % pairsPerCarton;
  }, [qtyConforming, pairsPerCarton]);

  // Section 8: Quantité de Matière Consommée par Matière et Couleur
  const [rawMaterialType, setRawMaterialType] = useState<string>('EVA');
  const [rawMaterialColor, setRawMaterialColor] = useState<string>('Blanc Pur');

  // Calcul automatique du poids consommé: (qtyProduced * poidsUnitaire) / 1000 = kg
  const defaultMaterialKg = useMemo(() => {
    const weightGrams = selectedModel?.weightPerPairGrams || 210;
    return Number(((qtyProduced * weightGrams) / 1000).toFixed(1));
  }, [qtyProduced, selectedModel]);

  const [materialConsumedKg, setMaterialConsumedKg] = useState<number>(defaultMaterialKg);

  useEffect(() => {
    setMaterialConsumedKg(defaultMaterialKg);
  }, [defaultMaterialKg]);

  const bags25kg = useMemo(() => {
    return Number((materialConsumedKg / 25).toFixed(2));
  }, [materialConsumedKg]);

  // Section 9: Pannes & Temps d’arrêt
  const [hasDowntime, setHasDowntime] = useState<boolean>(false);
  const [downtimeMinutes, setDowntimeMinutes] = useState<number>(0);
  const [downtimeReason, setDowntimeReason] = useState<string>('Buse d’injection bouchée / Nettoyage');

  // Section 10: Notes & Validation Qualité
  const [qualityValidationStatus, setQualityValidationStatus] = useState<'approved' | 'reserve' | 'rejected'>('approved');
  const [qualityNotes, setQualityNotes] = useState<string>('Contrôle dimensionnel et aspect visuel conformes.');

  // Notification and feedback state
  const [successNotice, setSuccessNotice] = useState<{ show: boolean; msg: string; lotId: string }>({
    show: false,
    msg: '',
    lotId: '',
  });

  // Direct Submission Pipeline:
  // Modèle → Moule → Plateforme → Production → Qualité → Matière → Stock
  const handleOneClickSubmit = () => {
    const todayStr = new Date().toISOString().substring(0, 10);
    const timeStr = new Date().toTimeString().substring(0, 5);

    const targetSizeNumber = Number(pointureStr.split('-')[0]) || 36;

    // 1. Enregistrement Production centralisé
    addProductionEntry({
      tenantId: 'tenant-1',
      date: todayStr,
      time: timeStr,
      shift,
      groupName,
      machineId: selectedMachine.id,
      machineCode: selectedMachine.code,
      platformNumber,
      platformPointure: pointureStr,
      operatorId,
      operatorName,
      material: 'EVA',
      rawMaterialType: 'EVA',
      modelId: selectedModel.id,
      modelName: selectedModel.name,
      moldId: mouldRef,
      moldsUsed: [mouldRef],
      size: targetSizeNumber,
      sizeInterval: pointureStr,
      color1,
      color2,
      counterStart,
      counterEnd,
      cycles,
      qtyProduced,
      qtyConforming,
      qtyRejected,
      secondChoicePairs,
      rejectReason: qtyRejected > 0 ? rejectReason : undefined,
      cartonsCount,
      pairsPerCarton,
      materialConsumedKg,
      bags25kgConsumed: bags25kg,
      startTime: timeStr,
      endTime: timeStr,
      downtimeMinutes: hasDowntime ? downtimeMinutes : 0,
      downtimeReason: hasDowntime ? downtimeReason : undefined,
      qualityValidationStatus,
      qualityNotes,
      verifiedByChef: qualityValidationStatus === 'approved',
    });

    // 2. Direct Quality Integration if rejects or 2nd choice occur
    if (qtyRejected > 0 || secondChoicePairs > 0) {
      addQualityRecord({
        date: todayStr,
        time: timeStr,
        machineId: selectedMachine.id,
        shift,
        modelName: selectedModel.name,
        operatorId,
        inspectedQty: qtyProduced,
        conformingQty: qtyConforming,
        rejectedQty: qtyRejected + secondChoicePairs,
        defectReason: rejectReason,
        severity: qtyRejected > 3 ? 'majeur' : 'mineur',
        correctiveAction: 'Tri systématique et vérification pression buse.',
        status: 'ouvert',
        auditorName: currentUser.name,
      });
    }

    // 3. Direct Maintenance Integration if downtime occurs
    if (hasDowntime && downtimeMinutes > 0) {
      addMaintenanceTicket({
        machineId: selectedMachine.id,
        type: 'corrective',
        priority: downtimeMinutes > 30 ? 'haute' : 'moyenne',
        status: 'en_cours',
        title: `Arrêt ${selectedMachine.code} - ${downtimeReason}`,
        description: `Signalement 1Click Production par ${operatorName} : arrêt de ${downtimeMinutes} min.`,
        reportedBy: operatorName,
        assignedTo: 'Équipe Maintenance Poste',
        reportedAt: `${todayStr} ${timeStr}`,
        estimatedDurationMinutes: downtimeMinutes,
      });
    }

    // Feedback
    const generatedRef = `LOT-1CLIC-${todayStr.replace(/-/g, '')}-${selectedMachine.code.replace(/\s+/g, '')}`;
    setSuccessNotice({
      show: true,
      msg: `Lot ${selectedModel.name} enregistré avec succès !`,
      lotId: generatedRef,
    });

    // Auto advance counters for next rotation
    setCounterStart(counterEnd);
    setCounterEnd(counterEnd + 20);

    // Reset temporary variables
    setQtyRejected(0);
    setSecondChoicePairs(0);
    setHasDowntime(false);
    setDowntimeMinutes(0);

    setTimeout(() => {
      setSuccessNotice({ show: false, msg: '', lotId: '' });
    }, 4500);
  };

  // Recent 1Click lots
  const recentEntries = useMemo(() => {
    return productionEntries.slice(0, 10);
  }, [productionEntries]);

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-28">
      {/* HEADER BANNER WITH REAL-TIME NETWORK STATUS & MODE SWITCHER */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm shrink-0">
              <Zap className="w-6 h-6 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  1Click – Production
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 uppercase tracking-wider">
                  Mobile First
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Saisie ultra-rapide atelier et traçabilité directe : Modèle → Moule → Plateformes → Qualité → Stock
              </p>
            </div>
          </div>

          {/* Sync status badge */}
          <div className="flex items-center gap-2 self-start sm:self-center">
            {isOnline ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                <Wifi className="w-3.5 h-3.5 text-emerald-600" /> Connecté &amp; Synchronisé
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
                <WifiOff className="w-3.5 h-3.5 text-amber-600" /> Mode Hors-ligne ({pendingSyncCount} en attente)
              </span>
            )}
          </div>
        </div>

        {/* TOP SEGMENT NAVIGATION TABS */}
        <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-slate-100 overflow-x-auto">
          <button
            onClick={() => setActiveTabMode('entry')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTabMode === 'entry'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Saisie 1-Clic
          </button>
          <button
            onClick={() => setActiveTabMode('dashboard')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTabMode === 'dashboard'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Dashboard Rapide (KPI)
          </button>
          <button
            onClick={() => setActiveTabMode('history')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTabMode === 'history'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Lots Récents ({recentEntries.length})
          </button>
        </div>
      </div>

      {/* SUCCESS POPUP NOTIFICATION */}
      {successNotice.show && (
        <div className="p-4 rounded-xl bg-emerald-600 text-white text-sm font-bold flex items-center justify-between shadow-lg animate-fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 shrink-0" />
            <div>
              <p className="font-black tracking-wide">{successNotice.msg}</p>
              <p className="text-xs text-emerald-100 font-mono mt-0.5">
                Référence Lot : {successNotice.lotId} — Stocks &amp; Compteurs mis à jour.
              </p>
            </div>
          </div>
          <span className="text-xs bg-emerald-700/80 px-2.5 py-1 rounded-lg">Synchronisé ✓</span>
        </div>
      )}

      {/* VIEW 1: DASHBOARD RAPIDE */}
      {activeTabMode === 'dashboard' && <OneClickProductionDashboard />}

      {/* VIEW 2: HISTORIQUE DES LOTS */}
      {activeTabMode === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900">Derniers Lots Enregistrés</h2>
            </div>
            <span className="text-xs text-slate-500 font-mono">
              Total base : {productionEntries.length} lots
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-2.5">Date / Heure</th>
                  <th className="p-2.5">Équipe</th>
                  <th className="p-2.5">Machine</th>
                  <th className="p-2.5">Modèle &amp; Moule</th>
                  <th className="p-2.5">Plat. &amp; Pointure</th>
                  <th className="p-2.5 text-right">Paires</th>
                  <th className="p-2.5 text-right">1er Choix</th>
                  <th className="p-2.5 text-right">Rebut / 2e</th>
                  <th className="p-2.5 text-right">Cartons</th>
                  <th className="p-2.5 text-center">Validation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {recentEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/70">
                    <td className="p-2.5 text-slate-800">
                      {entry.date} <span className="text-slate-400">{entry.time}</span>
                    </td>
                    <td className="p-2.5 uppercase font-sans font-bold text-amber-700">
                      {entry.shift}
                    </td>
                    <td className="p-2.5 font-bold text-blue-700">
                      {entry.machineCode || entry.machineId}
                    </td>
                    <td className="p-2.5 font-sans">
                      <span className="font-bold text-slate-900 block">{entry.modelName}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{entry.moldId}</span>
                    </td>
                    <td className="p-2.5">
                      P{entry.platformNumber} <span className="text-slate-500">({entry.platformPointure || entry.size})</span>
                    </td>
                    <td className="p-2.5 text-right font-black text-slate-900">
                      {entry.qtyProduced}
                    </td>
                    <td className="p-2.5 text-right font-black text-emerald-600">
                      {entry.qtyConforming}
                    </td>
                    <td className="p-2.5 text-right">
                      {entry.qtyRejected > 0 ? (
                        <span className="text-rose-600 font-bold">-{entry.qtyRejected}</span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                      {entry.secondChoicePairs ? (
                        <span className="text-amber-600 text-[10px] block">+{entry.secondChoicePairs} 2e</span>
                      ) : null}
                    </td>
                    <td className="p-2.5 text-right font-bold text-indigo-700">
                      {entry.cartonsCount || 0} ctn
                    </td>
                    <td className="p-2.5 text-center font-sans">
                      <button
                        onClick={() => toggleVerifyEntry(entry.id)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                          entry.verifiedByChef
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800 hover:bg-emerald-100'
                        }`}
                      >
                        {entry.verifiedByChef ? 'Validé ✓' : 'En attente'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: FORMULAIRE DE SAISIE ULTRA-RAPIDE 1-CLIC */}
      {activeTabMode === 'entry' && (
        <div className="space-y-4">
          {/* 1. ÉQUIPE, GROUPE, OPÉRATEUR & MACHINE (EVA 1/2/3) */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-blue-600" />
                1. Équipe, Groupe &amp; Machine Injection
              </span>
              <span className="text-[11px] font-medium text-slate-400">
                Opérateur : <strong className="text-slate-700">{operatorName}</strong>
              </span>
            </div>

            {/* Machine Fast Selectors (EVA 1, EVA 2, EVA 3) */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Machine Injection Assignée
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['EVA 1', 'EVA 2', 'EVA 3'].map((code) => {
                  const mObj = machines.find((m) => m.code === code);
                  const isSelected = selectedMachine.code === code;

                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => {
                        if (mObj) setMachineId(mObj.id);
                      }}
                      className={`py-3 px-3 rounded-xl font-mono font-black text-sm transition border flex flex-col items-center justify-center gap-1 active:scale-98 ${
                        isSelected
                          ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>{code}</span>
                      <span className={`text-[10px] font-sans font-semibold ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                        12 Plateformes
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Shift & Group Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Shift */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Équipe (Shift)
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'matin', label: 'Matin', time: '06h-14h' },
                    { id: 'soir', label: 'Soir', time: '14h-22h' },
                    { id: 'nuit', label: 'Nuit', time: '22h-06h' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setShift(s.id as ShiftType)}
                      className={`py-2 px-1 rounded-lg text-center transition border ${
                        shift === s.id
                          ? 'bg-amber-500 border-amber-500 text-white font-bold shadow-2xs'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="text-xs block font-bold">{s.label}</span>
                      <span className={`text-[9px] block ${shift === s.id ? 'text-amber-100' : 'text-slate-400'}`}>
                        {s.time}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Groupe & Opérateur */}
              <div className="space-y-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Groupe / Équipe
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {['Groupe A', 'Groupe B', 'Groupe C'].map((grp) => (
                      <button
                        key={grp}
                        type="button"
                        onClick={() => setGroupName(grp)}
                        className={`py-2 rounded-lg text-xs font-bold transition border ${
                          groupName === grp
                            ? 'bg-slate-900 border-slate-900 text-white shadow-2xs'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {grp}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. MODÈLE, RÉFÉRENCE, POINTURE & RÉFÉRENCE MOULE */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-indigo-600" />
                2. Modèle, Pointure &amp; Référence Moule
              </span>
              <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                {selectedModel.category || 'EVA'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Modèle */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Modèle d'article
                </label>
                <select
                  value={selectedModelId}
                  onChange={(e) => setSelectedModelId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-600"
                >
                  {shoeModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.code || 'CTP'}) — {m.category || m.defaultMaterial}
                    </option>
                  ))}
                </select>
              </div>

              {/* Référence Moule */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Référence Moule (Fiche Journalière)
                </label>
                <input
                  type="text"
                  value={mouldRef}
                  onChange={(e) => setMouldRef(e.target.value)}
                  placeholder="Ex: M-SB23-01 ou M-EVA1-P01"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:border-blue-600"
                />
              </div>
            </div>

            {/* Pointure Selector (Combo & Simples) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-800">
                  Pointure sélectionnée pour ce lot
                </label>
                <span className="text-xs font-mono font-black text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                  Pointure : {pointureStr}
                </span>
              </div>

              {/* Quick Dual Size Chips */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  '18-19',
                  '20-21',
                  '22-23',
                  '24-25',
                  '26-27',
                  '28-29',
                  '30-31',
                  '32-33',
                  '34-35',
                  '36-37',
                  '38-39',
                  '40-41',
                  '42-43',
                  '44-45',
                ].map((pt) => (
                  <button
                    key={pt}
                    type="button"
                    onClick={() => setPointureStr(pt)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition border active:scale-95 ${
                      pointureStr === pt
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {pt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 3. COULEUR 1 & COULEUR 2 */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <FlaskConical className="w-4 h-4 text-emerald-600" />
              3. Couleurs Injectées (Couleur 1 / Couleur 2)
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Couleur 1 (Empeigne / Principal)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={color1}
                    onChange={(e) => setColor1(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-900 focus:bg-white"
                  />
                  <div className="flex gap-1">
                    {['Blanc Pur', 'Noir Mat', 'Bleu Azur', 'Rouge Sport'].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor1(c)}
                        title={c}
                        className={`w-8 h-8 rounded-lg border text-[9px] font-bold flex items-center justify-center ${
                          color1 === c ? 'border-slate-900 ring-2 ring-slate-900' : 'border-slate-300'
                        }`}
                        style={{
                          backgroundColor:
                            c === 'Blanc Pur'
                              ? '#ffffff'
                              : c === 'Noir Mat'
                              ? '#0f172a'
                              : c === 'Bleu Azur'
                              ? '#0284c7'
                              : '#dc2626',
                          color: c === 'Blanc Pur' ? '#000000' : '#ffffff',
                        }}
                      >
                        {c[0]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Couleur 2 (Semelle / Bicolor)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={color2}
                    onChange={(e) => setColor2(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-900 focus:bg-white"
                  />
                  <div className="flex gap-1">
                    {['Noir Mat', 'Blanc Pur', 'Jaune Vif', 'Gris'].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor2(c)}
                        title={c}
                        className={`w-8 h-8 rounded-lg border text-[9px] font-bold flex items-center justify-center ${
                          color2 === c ? 'border-slate-900 ring-2 ring-slate-900' : 'border-slate-300'
                        }`}
                        style={{
                          backgroundColor:
                            c === 'Blanc Pur'
                              ? '#ffffff'
                              : c === 'Noir Mat'
                              ? '#0f172a'
                              : c === 'Jaune Vif'
                              ? '#eab308'
                              : '#64748b',
                          color: c === 'Blanc Pur' || c === 'Jaune Vif' ? '#000000' : '#ffffff',
                        }}
                      >
                        {c[0]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 4. LES 12 PLATEFORMES (P01 À P12) */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  4. Les 12 Plateformes (P01 à P12)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  {activePlatformsCount} Actives
                </span>
                <span className="text-[11px] font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                  Capacité : {activePlatformsCount * 2} paires/cycle
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500">
              Touchez une plateforme pour changer son état (Active / Vide / Défaut) ou spécifier sa pointure (ex: 18-19, 36-37, 43-44). Max 2 paires par poste.
            </p>

            {/* 12 Platform Interactive Tiles */}
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
              {platformsConfig.map((plat) => {
                const isSelected = platformNumber === plat.number;
                const stateColor =
                  plat.state === 'Active'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                    : plat.state === 'Vide'
                    ? 'bg-slate-100 border-slate-200 text-slate-500'
                    : 'bg-rose-50 border-rose-300 text-rose-900';

                return (
                  <div
                    key={plat.number}
                    className={`p-2.5 rounded-xl border transition flex flex-col justify-between ${stateColor} ${
                      isSelected ? 'ring-2 ring-blue-600' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-black text-xs">
                        P{plat.number < 10 ? `0${plat.number}` : plat.number}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleTogglePlatformState(plat.number)}
                        className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase transition ${
                          plat.state === 'Active'
                            ? 'bg-emerald-600 text-white'
                            : plat.state === 'Vide'
                            ? 'bg-slate-400 text-white'
                            : 'bg-rose-600 text-white'
                        }`}
                      >
                        {plat.state}
                      </button>
                    </div>

                    <input
                      type="text"
                      value={plat.pointure}
                      onChange={(e) => handleUpdatePlatformPointure(plat.number, e.target.value)}
                      placeholder="Pt."
                      className="mt-1.5 w-full bg-white/90 border border-slate-200 rounded p-1 text-center font-mono font-bold text-xs text-slate-800"
                    />

                    <div className="mt-2 flex items-center justify-between text-[10px]">
                      <span className="text-slate-500">Capacité :</span>
                      <strong className="font-mono">{plat.pairsCount} p.</strong>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setPlatformNumber(plat.number);
                        setPointureStr(plat.pointure);
                      }}
                      className={`mt-1.5 py-1 text-[10px] font-bold rounded text-center transition ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {isSelected ? 'Sélectionnée' : 'Choisir P' + plat.number}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 5. COMPTEURS ENTRÉE / SORTIE, CYCLES & PAIRES PRODUITES */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Hash className="w-4 h-4 text-blue-600" />
                5. Compteurs Machine, Cycles &amp; Production
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                Formule : Cycles = Sortie - Entrée | Paires = Cycles × 2
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Compteur Entrée */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <label className="block text-xs font-bold text-slate-600">
                  Compteur Entrée (Début)
                </label>
                <input
                  type="number"
                  value={counterStart}
                  onChange={(e) => setCounterStart(Number(e.target.value) || 0)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-base font-mono font-bold text-slate-900"
                />
                <span className="text-[10px] text-slate-400 block">Dernier relevé machine</span>
              </div>

              {/* Compteur Sortie */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-600">
                    Compteur Sortie (Fin)
                  </label>
                  <div className="flex gap-1">
                    {[10, 20, 40].map((inc) => (
                      <button
                        key={inc}
                        type="button"
                        onClick={() => setCounterEnd(counterStart + inc)}
                        className="text-[10px] font-mono font-bold bg-white border border-slate-200 px-1.5 py-0.5 rounded text-blue-600 hover:bg-blue-50"
                      >
                        +{inc}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="number"
                  value={counterEnd}
                  onChange={(e) => setCounterEnd(Number(e.target.value) || 0)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-base font-mono font-bold text-blue-700"
                />
                <span className="text-[10px] text-slate-400 block">Relevé actuel du compteur</span>
              </div>

              {/* Calculated Cycles & Pairs */}
              <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-900">Cycles Calculés</span>
                  <span className="text-base font-black font-mono text-blue-700">{cycles}</span>
                </div>
                <div className="pt-2 border-t border-blue-200/60 flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-950">Paires Produites</span>
                  <span className="text-2xl font-black font-mono text-blue-800">{qtyProduced}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 6. CONDITIONNEMENT EN CARTONS */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Boxes className="w-4 h-4 text-indigo-600" />
                6. Conditionnement &amp; Cartons (Automatique)
              </span>
              <span className="text-[11px] font-mono font-bold text-indigo-700">
                Cartons = {cartonsCount} pleins {remainderPairs > 0 && `+ ${remainderPairs} p. reliquat`}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Paires par Carton
                </label>
                <div className="flex items-center gap-1.5">
                  {[12, 14, 20, 24].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPairsPerCarton(p)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold transition border ${
                        pairsPerCarton === p
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      {p}P
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <span className="text-[10px] text-slate-400 block uppercase font-medium">Cartons Complets</span>
                <span className="text-xl font-black font-mono text-indigo-900">{cartonsCount}</span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center col-span-2 sm:col-span-1">
                <span className="text-[10px] text-slate-400 block uppercase font-medium">Reste Paires</span>
                <span className="text-xl font-black font-mono text-slate-700">{remainderPairs}</span>
              </div>
            </div>
          </div>

          {/* 7. CONTRÔLE QUALITÉ : REBUTS & 2ÈME QUALITÉ */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                7. Qualité : Conformes, Rebuts &amp; 2ème Qualité
              </span>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                1er Choix Conforme : {qtyConforming} paires
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Rebuts */}
              <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200 space-y-2">
                <label className="block text-xs font-bold text-rose-900">
                  Rebuts (Paires Jetées)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQtyRejected((q) => Math.max(0, q - 1))}
                    className="w-8 h-8 rounded-lg bg-white border border-rose-300 text-rose-700 font-bold flex items-center justify-center active:scale-95"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={qtyRejected}
                    onChange={(e) => setQtyRejected(Math.max(0, Number(e.target.value) || 0))}
                    className="flex-1 bg-white border border-rose-300 rounded-lg p-1.5 text-center font-mono font-bold text-sm text-rose-900"
                  />
                  <button
                    type="button"
                    onClick={() => setQtyRejected((q) => q + 1)}
                    className="w-8 h-8 rounded-lg bg-white border border-rose-300 text-rose-700 font-bold flex items-center justify-center active:scale-95"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* 2ème Qualité */}
              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2">
                <label className="block text-xs font-bold text-amber-900">
                  2ème Qualité (Déclassé)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSecondChoicePairs((q) => Math.max(0, q - 1))}
                    className="w-8 h-8 rounded-lg bg-white border border-amber-300 text-amber-700 font-bold flex items-center justify-center active:scale-95"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={secondChoicePairs}
                    onChange={(e) => setSecondChoicePairs(Math.max(0, Number(e.target.value) || 0))}
                    className="flex-1 bg-white border border-amber-300 rounded-lg p-1.5 text-center font-mono font-bold text-sm text-amber-900"
                  />
                  <button
                    type="button"
                    onClick={() => setSecondChoicePairs((q) => q + 1)}
                    className="w-8 h-8 rounded-lg bg-white border border-amber-300 text-amber-700 font-bold flex items-center justify-center active:scale-95"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Motif de Rebut */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  Motif de Rebut / Défaut
                </label>
                <select
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-medium text-slate-800"
                >
                  <option value="Bavures d’injection">Bavures d’injection</option>
                  <option value="Bulle d’air / porosité">Bulle d’air / porosité</option>
                  <option value="Manque matière (incomplet)">Manque matière (incomplet)</option>
                  <option value="Déformation thermique">Déformation thermique</option>
                  <option value="Décoloration / taches">Décoloration / taches</option>
                  <option value="Semelle fendue">Semelle fendue</option>
                </select>
              </div>
            </div>
          </div>

          {/* 8. MATIÈRE CONSOMMÉE PAR MATIÈRE ET COULEUR */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <FlaskConical className="w-4 h-4 text-emerald-600" />
                8. Matière Consommée par Matière &amp; Couleur
              </span>
              <span className="text-xs font-mono font-bold text-emerald-700">
                {bags25kg} sacs de 25kg
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Matière</label>
                <input
                  type="text"
                  value={rawMaterialType}
                  onChange={(e) => setRawMaterialType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Couleur Matière</label>
                <input
                  type="text"
                  value={rawMaterialColor}
                  onChange={(e) => setRawMaterialColor(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Quantité (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={materialConsumedKg}
                  onChange={(e) => setMaterialConsumedKg(Number(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono font-bold text-emerald-800"
                />
              </div>
            </div>
          </div>

          {/* 9. PANNES & TEMPS D’ARRÊT */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Wrench className="w-4 h-4 text-rose-600" />
                9. Pannes &amp; Temps d'Arrêt Machine
              </span>
              <button
                type="button"
                onClick={() => setHasDowntime(!hasDowntime)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  hasDowntime
                    ? 'bg-rose-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {hasDowntime ? 'Arrêt Signalé (Actif)' : '+ Déclarer un Arrêt'}
              </button>
            </div>

            {hasDowntime && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 animate-fade-in">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Type de Panne / Motif
                  </label>
                  <select
                    value={downtimeReason}
                    onChange={(e) => setDowntimeReason(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-medium text-slate-800"
                  >
                    <option value="Buse d’injection bouchée / Nettoyage">Buse bouchée / Nettoyage</option>
                    <option value="Panne mécanique / Piston">Panne mécanique / Piston</option>
                    <option value="Panne électrique / Capteur">Panne électrique / Capteur</option>
                    <option value="Chauffage moule / Régulateur">Chauffage moule / Régulateur</option>
                    <option value="Changement de moule / Réglage">Changement de moule / Réglage</option>
                    <option value="Manque de matière première">Manque de matière première</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Temps d'Arrêt (Minutes)
                  </label>
                  <input
                    type="number"
                    value={downtimeMinutes}
                    onChange={(e) => setDowntimeMinutes(Number(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono font-bold text-rose-700"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 10. NOTES & VALIDATION QUALITÉ */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              10. Notes &amp; Validation Qualité
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Statut de Validation Qualité
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'approved', label: 'Conforme', color: 'bg-emerald-600' },
                    { id: 'reserve', label: 'Sous Réserve', color: 'bg-amber-600' },
                    { id: 'rejected', label: 'Refusé', color: 'bg-rose-600' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setQualityValidationStatus(s.id as any)}
                      className={`py-2 rounded-lg text-xs font-bold transition border ${
                        qualityValidationStatus === s.id
                          ? `${s.color} text-white border-transparent shadow-2xs`
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Notes / Observations Atelier
                </label>
                <input
                  type="text"
                  value={qualityNotes}
                  onChange={(e) => setQualityNotes(e.target.value)}
                  placeholder="Observations sur le lot..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-medium text-slate-800"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING MOBILE-FIRST STICKY ACTION BAR */}
      {activeTabMode === 'entry' && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 sm:p-4 shadow-xl">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Real-time Summary Counters */}
            <div className="flex items-center justify-between sm:justify-start gap-3 text-xs">
              <div className="flex items-center gap-1">
                <span className="text-slate-400">Paires :</span>
                <strong className="font-mono font-black text-slate-900 text-sm sm:text-base">
                  {qtyProduced}
                </strong>
              </div>
              <div className="h-4 w-px bg-slate-200" />
              <div className="flex items-center gap-1">
                <span className="text-slate-400">1er Choix :</span>
                <strong className="font-mono font-black text-emerald-600 text-sm sm:text-base">
                  {qtyConforming}
                </strong>
              </div>
              <div className="h-4 w-px bg-slate-200" />
              <div className="flex items-center gap-1">
                <span className="text-slate-400">Cartons :</span>
                <strong className="font-mono font-bold text-indigo-700">
                  {cartonsCount}
                </strong>
              </div>
              <div className="h-4 w-px bg-slate-200" />
              <div className="flex items-center gap-1">
                <span className="text-slate-400">Cycles :</span>
                <strong className="font-mono font-bold text-blue-700">
                  {cycles}
                </strong>
              </div>
            </div>

            {/* Big 1-Click Submit Button */}
            <button
              type="button"
              onClick={handleOneClickSubmit}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-sm uppercase tracking-wider shadow-lg active:scale-98 transition flex items-center justify-center gap-2"
            >
              <Zap className="w-5 h-5 fill-white" />
              <span>⚡ Enregistrer 1-Clic</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
