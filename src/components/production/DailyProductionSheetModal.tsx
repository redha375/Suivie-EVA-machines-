import React, { useState, useMemo } from 'react';
import {
  X,
  Layers,
  Sparkles,
  Camera,
  CheckCircle2,
  AlertTriangle,
  Package,
  Calculator,
  Clock,
  Flame,
  FileText,
  ShieldCheck,
  Split,
  ChevronRight,
  Info,
  Boxes,
  Grid,
  Sliders,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  ProductionMaterial,
  ProductionEntry,
  ShoeModelItem,
  Machine,
} from '../../types';
import {
  computeProductionMetrics,
  SOUMELLE_SIZES,
  createDefaultSoumelleSizeBreakdown,
} from '../../utils/productionCalculations';
import { Interactive12PlatformsGrid } from './Interactive12PlatformsGrid';
import { EvaMachineStationManager } from '../ctp/EvaMachineStationManager';
import { EvaStationConfig } from '../../types/evaProductionLogic';
import {
  createDefaultEvaStationsConfig,
  calculateEvaMachineKpis,
} from '../../utils/evaStationEngine';

interface DailyProductionSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMaterial?: ProductionMaterial;
}

export const DailyProductionSheetModal: React.FC<DailyProductionSheetModalProps> = ({
  isOpen,
  onClose,
  defaultMaterial = 'PVC',
}) => {
  const {
    machines,
    shoeModels,
    industrialMolds,
    shoeColors,
    currentUser,
    addProductionEntry,
    analyzeCounterImage,
    logAudit,
    setActiveTab,
    t,
  } = useApp();

  // 1. Matière de production (OBLIGATOIRE : EVA, SOUMELLE, PVC)
  const [material, setMaterial] = useState<ProductionMaterial>(defaultMaterial);

  // 2. Fiche Journalière Header Fields
  const [date, setDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [time, setTime] = useState<string>(
    new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  );
  const [shift, setShift] = useState<'matin' | 'soir' | 'nuit'>('matin');
  const [groupName, setGroupName] = useState<string>('Groupe A (Équipe Principale)');
  const [operatorName, setOperatorName] = useState<string>(currentUser.name);

  // Filter machines compatible with the selected material
  const compatibleMachines = useMemo(() => {
    return machines.filter((m) => {
      if (m.material === material) return true;
      if (m.supportedMaterials?.includes(material)) return true;
      // Fallback matching
      if (material === 'EVA' && m.code.includes('EVA')) return true;
      if (material === 'PVC' && m.code.includes('PVC')) return true;
      if (material === 'SOUMELLE' && (m.code.includes('SOUM') || m.type === 'TPR')) return true;
      return false;
    });
  }, [machines, material]);

  const [machineId, setMachineId] = useState<string>(() => {
    return compatibleMachines[0]?.id || machines[0]?.id || '';
  });

  // Keep machine selection synchronized when material changes
  React.useEffect(() => {
    if (compatibleMachines.length > 0 && !compatibleMachines.some((m) => m.id === machineId)) {
      setMachineId(compatibleMachines[0].id);
    }
  }, [material, compatibleMachines, machineId]);

  const selectedMachine = useMemo(() => {
    return machines.find((m) => m.id === machineId) || compatibleMachines[0];
  }, [machines, machineId, compatibleMachines]);

  // 3. Modèles filtrés par matière
  const compatibleModels = useMemo(() => {
    const list = shoeModels.filter((m) => m.material === material || m.defaultMaterial === material);
    return list.length > 0 ? list : shoeModels;
  }, [shoeModels, material]);

  const [modelId, setModelId] = useState<string>(() => compatibleModels[0]?.id || '');

  React.useEffect(() => {
    if (compatibleModels.length > 0 && !compatibleModels.some((m) => m.id === modelId)) {
      setModelId(compatibleModels[0].id);
    }
  }, [material, compatibleModels, modelId]);

  const selectedModel = useMemo(() => {
    return shoeModels.find((m) => m.id === modelId) || compatibleModels[0];
  }, [shoeModels, modelId, compatibleModels]);

  // 4. Bicolor / Be-color configuration
  const [isBicolor, setIsBicolor] = useState<boolean>(() => {
    return selectedModel?.modelType === 'bicolor';
  });

  React.useEffect(() => {
    if (selectedModel) {
      setIsBicolor(selectedModel.modelType === 'bicolor');
    }
  }, [selectedModel]);

  const [moldA, setMoldA] = useState<string>(selectedModel?.bicolorConfig?.moldA || 'M-TIGE-01');
  const [colorA, setColorA] = useState<string>(selectedModel?.bicolorConfig?.colorA || 'Noir Mat');
  const [moldB, setMoldB] = useState<string>(selectedModel?.bicolorConfig?.moldB || 'M-SEM-02');
  const [colorB, setColorB] = useState<string>(selectedModel?.bicolorConfig?.colorB || 'Blanc Pur');

  // Single color / mold if normal
  const [singleMoldId, setSingleMoldId] = useState<string>(industrialMolds[0]?.code || 'M-STD-01');
  const [singleColor, setSingleColor] = useState<string>('Noir Mat');

  // Configuration des plateformes / stations EVA
  const isEvaMachine = material === 'EVA' || selectedMachine?.material === 'EVA' || selectedMachine?.code?.includes('EVA');
  const [showPlatformsGrid, setShowPlatformsGrid] = useState<boolean>(false);
  const [platformsCapacityPerCycle, setPlatformsCapacityPerCycle] = useState<number>(24);

  // Configuration des 6 stations pour les machines EVA
  const [evaStations, setEvaStations] = useState<EvaStationConfig[]>(() => {
    return createDefaultEvaStationsConfig(selectedMachine?.code || 'EVA 1');
  });

  React.useEffect(() => {
    if (isEvaMachine) {
      setEvaStations(createDefaultEvaStationsConfig(selectedMachine?.code || 'EVA 1'));
    }
  }, [selectedMachine?.code, isEvaMachine]);

  // 5. Pointure(s)
  // For PVC / EVA: single or main size (e.g. 40)
  const [size, setSize] = useState<number>(40);

  // For SOUMELLE: distinct separate registration by pointure (18 à 45) - NEVER merged!
  const [soumelleQuantities, setSoumelleQuantities] = useState<Record<number, number>>(
    createDefaultSoumelleSizeBreakdown
  );

  // For models with size intervals (e.g. SB23 Femme with 36-37, 38-39, 39-40, 40-41):
  const [intervalQuantities, setIntervalQuantities] = useState<Record<string, number>>(() => {
    return { '36-37': 67, '38-39': 65, '39-40': 66, '40-41': 70 };
  });

  // Keep interval quantities synchronized when selectedModel changes
  React.useEffect(() => {
    if (selectedModel?.sizeIntervals && selectedModel.sizeIntervals.length > 0) {
      setIntervalQuantities((prev) => {
        const next: Record<string, number> = {};
        selectedModel.sizeIntervals!.forEach((interval) => {
          if (selectedModel.code === 'SB23' && prev[interval] === undefined) {
            const defaults: Record<string, number> = { '36-37': 67, '38-39': 65, '39-40': 66, '40-41': 70 };
            next[interval] = defaults[interval] ?? 0;
          } else {
            next[interval] = prev[interval] !== undefined ? prev[interval] : 0;
          }
        });
        return next;
      });
    }
  }, [selectedModel]);

  const hasSizeIntervals = Boolean(
    material !== 'SOUMELLE' && selectedModel?.sizeIntervals && selectedModel.sizeIntervals.length > 0
  );

  const totalIntervalPairs = useMemo(() => {
    if (!hasSizeIntervals) return 0;
    return Object.values(intervalQuantities).reduce((acc: number, q: number) => acc + (Number(q) || 0), 0);
  }, [hasSizeIntervals, intervalQuantities]);

  const handleIntervalQtyChange = (interval: string, val: number) => {
    setIntervalQuantities((prev) => ({
      ...prev,
      [interval]: Math.max(0, val),
    }));
  };

  // 6. Production counters & Cycles
  const [counterStart, setCounterStart] = useState<number>(selectedMachine?.lastCounterValue || 10000);
  const [counterEnd, setCounterEnd] = useState<number>(
    (selectedMachine?.lastCounterValue || 10000) + 120
  );
  const [cycles, setCycles] = useState<number>(60);
  const [rawPairsInput, setRawPairsInput] = useState<number>(120);
  const [rejectedPairs, setRejectedPairs] = useState<number>(0);
  const [rejectReason, setRejectReason] = useState<string>('Bavures légères');
  const [targetPairs, setTargetPairs] = useState<number>(120);

  // EVA Machine KPI calculation
  const evaMachineKpis = useMemo(() => {
    if (!isEvaMachine) return null;
    return calculateEvaMachineKpis(evaStations, cycles, rawPairsInput);
  }, [isEvaMachine, evaStations, cycles, rawPairsInput]);

  // Times & Downtime
  const [startTime, setStartTime] = useState<string>('08:00');
  const [endTime, setEndTime] = useState<string>('10:00');
  const [downtimeMinutes, setDowntimeMinutes] = useState<number>(0);
  const [downtimeReason, setDowntimeReason] = useState<string>('');
  const [observations, setObservations] = useState<string>('');

  // OCR AI Counter Capture
  const [counterPhotoUrl, setCounterPhotoUrl] = useState<string | null>(null);
  const [isAnalyzingOcr, setIsAnalyzingOcr] = useState<boolean>(false);
  const [ocrDetectedValue, setOcrDetectedValue] = useState<number | null>(null);
  const [ocrAnomaly, setOcrAnomaly] = useState<string | null>(null);

  // For SOUMELLE: compute total raw pairs from the pointures breakdown table
  const totalSoumellePairs = useMemo(() => {
    return (Object.values(soumelleQuantities) as number[]).reduce((acc: number, q: number) => acc + (Number(q) || 0), 0);
  }, [soumelleQuantities]);

  // Synchronize raw input when in Soumelle mode or Interval mode
  React.useEffect(() => {
    if (material === 'SOUMELLE' && totalSoumellePairs > 0) {
      setRawPairsInput(totalSoumellePairs);
    } else if (hasSizeIntervals && totalIntervalPairs > 0) {
      setRawPairsInput(totalIntervalPairs);
    }
  }, [material, totalSoumellePairs, hasSizeIntervals, totalIntervalPairs]);

  const effectiveRawPairs = material === 'SOUMELLE'
    ? totalSoumellePairs
    : hasSizeIntervals && totalIntervalPairs > 0
    ? totalIntervalPairs
    : rawPairsInput;

  // Dynamic packaging calculations (Strict rule: No hardcoding)
  const currentPairsPerCarton = selectedModel?.pairsPerCarton || (material === 'PVC' ? 24 : 12);
  const currentCartonType = selectedModel?.cartonType || (material === 'EVA' ? 'D5' : 'D1');

  // Dynamic Real-time Calculations according to Matière + Modèle + Machine + Molds config
  const calcResults = useMemo(() => {
    return computeProductionMetrics({
      material,
      model: selectedModel,
      machine: selectedMachine,
      isBicolor,
      cycles: material === 'EVA' || material === 'PVC' ? cycles : undefined,
      rawProductionPairs: effectiveRawPairs,
      rejectedPairs,
      targetPairs,
      startTime,
      endTime,
      downtimeMinutes,
      pairsPerCarton: currentPairsPerCarton,
    });
  }, [
    material,
    selectedModel,
    selectedMachine,
    isBicolor,
    cycles,
    effectiveRawPairs,
    rejectedPairs,
    targetPairs,
    startTime,
    endTime,
    downtimeMinutes,
    currentPairsPerCarton,
  ]);

  // Carton packaging results based on conforming pairs
  const completeCartons = currentPairsPerCarton > 0 ? Math.floor(calcResults.conforming / currentPairsPerCarton) : 0;
  const remainderPairs = currentPairsPerCarton > 0 ? calcResults.conforming % currentPairsPerCarton : 0;

  // AI Counter Image Capture / Upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzingOcr(true);
    setOcrAnomaly(null);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      setCounterPhotoUrl(base64Data);

      try {
        const ocrResult = await analyzeCounterImage(
          base64Data,
          selectedMachine?.id || machineId,
          counterStart
        );
        if (ocrResult?.detectedValue) {
          setOcrDetectedValue(ocrResult.detectedValue);
          setCounterEnd(ocrResult.detectedValue);
          if (ocrResult.detectedValue < counterStart) {
            setOcrAnomaly(
              `Anomalie détectée : Le compteur lu (${ocrResult.detectedValue}) est inférieur au compteur de début (${counterStart}).`
            );
          } else {
            const calculatedDelta = ocrResult.detectedValue - counterStart;
            setRawPairsInput(calculatedDelta);
          }
        }
      } catch (err) {
        console.error('OCR Error:', err);
      } finally {
        setIsAnalyzingOcr(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSoumelleQtyChange = (sz: number, val: number) => {
    setSoumelleQuantities((prev) => ({
      ...prev,
      [sz]: Math.max(0, val || 0),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newEntryPayload: Omit<ProductionEntry, 'id' | 'createdAt' | 'syncStatus'> = {
      tenantId: 'tenant-1',
      date,
      time,
      shift,
      groupName,
      machineId: selectedMachine?.id || machineId,
      machineCode: selectedMachine?.code || 'MACH-01',
      platformNumber: 1,
      operatorId: currentUser.id,
      operatorName,
      material,
      rawMaterialType: material === 'PVC' ? 'PVC' : material === 'SOUMELLE' ? 'TPR' : 'EVA',
      modelId: selectedModel?.id,
      modelName: selectedModel?.name || 'Modèle CTP Standard',
      moldId: isBicolor ? `${moldA} + ${moldB}` : singleMoldId,
      moldsUsed: isBicolor ? [moldA, moldB] : [singleMoldId],
      isBicolor,
      bicolorDetails: isBicolor
        ? { moldA, colorA, moldB, colorB }
        : undefined,
      size,
      sizeQuantities: material === 'SOUMELLE' ? soumelleQuantities : undefined,
      sizeBreakdown: hasSizeIntervals ? intervalQuantities : undefined,
      color1: isBicolor ? colorA : singleColor,
      color2: isBicolor ? colorB : '',
      counterStart,
      counterEnd,
      cycles,
      qtyProduced: calcResults.rawProduction,
      qtyConforming: calcResults.conforming,
      qtyRejected: calcResults.rejected,
      rejectReason: calcResults.rejected > 0 ? rejectReason : undefined,
      targetPairs,
      variancePairs: calcResults.variance,
      scrapRatePct: calcResults.scrapRatePct,
      conformanceRatePct: calcResults.conformanceRatePct,
      yieldPct: calcResults.yieldPct,
      materialConsumedKg: calcResults.materialConsumedKg,
      bags25kgConsumed: calcResults.bags25kgConsumed,
      startTime,
      endTime,
      durationMinutes: calcResults.durationMinutes,
      productivityPairsPerHour: calcResults.productivityPairsPerHour,
      downtimeMinutes,
      downtimeReason: downtimeMinutes > 0 ? downtimeReason : undefined,
      counterPhotoUrl: counterPhotoUrl || undefined,
      ocrDetectedValue: ocrDetectedValue || undefined,
      counterScanAnomaly: !!ocrAnomaly,
      anomalyReason: ocrAnomaly || undefined,
      workflowStage:
        material === 'PVC'
          ? 'cartons'
          : material === 'SOUMELLE'
          ? 'stock_soumelle'
          : 'en_attente_eva',
      packagingCartonsCount: completeCartons,
      completeCartons,
      remainderPairs,
      cartonType: currentCartonType,
      pairsPerCarton: currentPairsPerCarton,
      notes: observations,
      observations,
      verifiedByChef: false,
    };

    addProductionEntry(newEntryPayload);

    logAudit(
      'FICHE_JOURNALIERE_CREEE',
      'Production Fiche Journalière',
      `Fiche créée pour matière ${material}, modèle ${selectedModel?.name} (${calcResults.conforming} paires conformes).`,
      {
        targetId: selectedModel?.id,
        targetName: selectedModel?.name,
        oldValue: 'Nouveau lot',
        newValue: JSON.stringify(newEntryPayload),
      }
    );

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      id="modal-daily-production-sheet"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-xs overflow-y-auto"
    >
      <div className="relative w-full max-w-5xl my-auto bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Fiche Journalière de Production
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-400/20 text-indigo-200 font-mono font-normal border border-indigo-400/30">
                  CTP SMART v2.0
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Architecture Multi-Matières • Workflow dédié PVC, SOUMELLE &amp; EVA
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                setActiveTab('fiche_ocr');
              }}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Scanner Fiche Papier (IA OCR)
            </button>
            <button
              id="btn-close-daily-sheet"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
          {/* SECTION 1 : MATIÈRE DE PRODUCTION (CHAMP OBLIGATOIRE - 3 CHOIX) */}
          <div className="p-4 rounded-xl bg-slate-50 border-2 border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wide">
                <Layers className="w-4 h-4 text-indigo-600" />
                Matière de Production <span className="text-red-500 font-black">* (Obligatoire)</span>
              </label>
              <span className="text-xs text-slate-500 italic">
                Chaque matière possède son propre workflow, ses règles de calcul et son conditionnement
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {/* Option 1: EVA */}
              <button
                type="button"
                id="btn-material-eva"
                onClick={() => setMaterial('EVA')}
                className={`flex flex-col items-center justify-center p-3.5 rounded-xl border-2 transition-all text-left ${
                  material === 'EVA'
                    ? 'border-emerald-600 bg-emerald-50/80 text-emerald-950 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="font-extrabold text-base tracking-tight">1. EVA</span>
                  {material === 'EVA' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                </div>
                <span className="text-xs text-slate-500 w-full">
                  Éthylène-acétate de vinyle • Sabots &amp; Claquettes légères
                </span>
                <span className="mt-1 text-[11px] font-medium text-emerald-700 w-full">
                  Architecture évolutive découplée
                </span>
              </button>

              {/* Option 2: SOUMELLE */}
              <button
                type="button"
                id="btn-material-soumelle"
                onClick={() => setMaterial('SOUMELLE')}
                className={`flex flex-col items-center justify-center p-3.5 rounded-xl border-2 transition-all text-left ${
                  material === 'SOUMELLE'
                    ? 'border-amber-600 bg-amber-50/80 text-amber-950 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="font-extrabold text-base tracking-tight">2. SOUMELLE</span>
                  {material === 'SOUMELLE' && <CheckCircle2 className="w-5 h-5 text-amber-600" />}
                </div>
                <span className="text-xs text-slate-500 w-full">
                  Semelles injectées • Détail par pointure (18 à 45)
                </span>
                <span className="mt-1 text-[11px] font-medium text-amber-700 w-full">
                  Pas de cartons • Stock Soumelle direct
                </span>
              </button>

              {/* Option 3: PVC */}
              <button
                type="button"
                id="btn-material-pvc"
                onClick={() => setMaterial('PVC')}
                className={`flex flex-col items-center justify-center p-3.5 rounded-xl border-2 transition-all text-left ${
                  material === 'PVC'
                    ? 'border-blue-600 bg-blue-50/80 text-blue-950 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="font-extrabold text-base tracking-tight">3. PVC</span>
                  {material === 'PVC' && <CheckCircle2 className="w-5 h-5 text-blue-600" />}
                </div>
                <span className="text-xs text-slate-500 w-full">
                  Polychlorure de vinyle • Bottines, sandales &amp; chaussures
                </span>
                <span className="mt-1 text-[11px] font-medium text-blue-700 w-full">
                  Conditionnement en cartons calculé
                </span>
              </button>
            </div>

            {/* Banner specific to EVA decoupled architecture */}
            {material === 'EVA' && (
              <div className="mt-3 p-3 rounded-lg bg-emerald-100/70 border border-emerald-300 text-emerald-900 text-xs flex items-start gap-2.5">
                <Info className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold">Architecture découplée EVA active :</strong> Les règles de PVC ou Soumelle ne sont pas appliquées à l'EVA. Les champs obligatoires sont préparés et les règles spécifiques seront injectées ultérieurement sans perturber le PVC ou la Soumelle.
                </div>
              </div>
            )}

            {/* Banner specific to SOUMELLE workflow */}
            {material === 'SOUMELLE' && (
              <div className="mt-3 p-3 rounded-lg bg-amber-100/70 border border-amber-300 text-amber-900 text-xs flex items-start gap-2.5">
                <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold">Règle de gestion Soumelle :</strong> La production est enregistrée séparément par pointure (de 18 à 45). Les pointures ne sont JAMAIS fusionnées dans le détail. La production n'est PAS envoyée en cartons mais directement dans le Stock Soumelle par pointure.
                </div>
              </div>
            )}

            {/* Banner specific to PVC workflow */}
            {material === 'PVC' && (
              <div className="mt-3 p-3 rounded-lg bg-blue-100/70 border border-blue-300 text-blue-900 text-xs flex items-start gap-2.5">
                <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold">Workflow PVC Conforme :</strong> La production conforme est automatiquement calculée et envoyée vers le module <strong>Conditionnement / Cartons</strong> selon le nombre de paires/carton défini pour le modèle.
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2 : EN-TÊTE DE FICHE JOURNALIÈRE */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Date &amp; Heure</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-2/3 px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  required
                />
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-1/3 px-2 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Poste (Équipe)</label>
              <select
                value={shift}
                onChange={(e) => setShift(e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden bg-white"
              >
                <option value="matin">Poste Matin (06:00 - 14:00)</option>
                <option value="soir">Poste Soir (14:00 - 22:00)</option>
                <option value="nuit">Poste Nuit (22:00 - 06:00)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Groupe d'opérateurs</label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Ex: Groupe A, Ligne 1"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Opérateur Responsable</label>
              <input
                type="text"
                value={operatorName}
                onChange={(e) => setOperatorName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden bg-slate-50 font-medium"
                required
              />
            </div>
          </div>

          {/* SECTION 3 : MACHINE & MODÈLE (CONFIGURATION DYNAMIQUE) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50/70 border border-slate-200">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Machine Associée ({material})
              </label>
              <select
                value={machineId}
                onChange={(e) => setMachineId(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden bg-white font-medium text-slate-900"
              >
                {compatibleMachines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.code} — {m.name} ({m.platformsCount} plateformes, {m.moldsPerPlatform} moules/plat.)
                  </option>
                ))}
              </select>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Dernier relevé compteur : {selectedMachine?.lastCounterValue || 0} paires
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Modèle de Production ({material})
              </label>
              <select
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden bg-white font-medium text-slate-900"
              >
                {compatibleModels.map((mod) => (
                  <option key={mod.id} value={mod.id}>
                    {mod.code} — {mod.name} [{mod.modelType === 'bicolor' ? 'Bicolor' : 'Standard'}]
                  </option>
                ))}
              </select>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Poids : {selectedModel?.weightPerPairGrams || 300} g/paire • Paires/cycle : {selectedModel?.pairsPerCycle || 4}
              </span>
            </div>
          </div>

          {/* SECTION 4 : BICOLOR / BE-COLOR ET ASSOCIATION DE MOULES & COULEURS */}
          <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Split className="w-5 h-5 text-indigo-600" />
                <span className="text-sm font-bold text-slate-900">
                  Configuration Bicolor / Bebicolor
                </span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-indigo-900">
                <input
                  type="checkbox"
                  checked={isBicolor}
                  onChange={(e) => setIsBicolor(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded-sm border-slate-300 focus:ring-indigo-500"
                />
                Activer Production Bicolor (2 Moules = 1 Paire)
              </label>
            </div>

            {isBicolor ? (
              <div className="space-y-3">
                <div className="p-3 bg-indigo-100/70 border border-indigo-300 rounded-lg text-xs text-indigo-950 flex items-start gap-2">
                  <Info className="w-4 h-4 text-indigo-700 shrink-0 mt-0.5" />
                  <div>
                    <strong>Règle de comptabilisation stricte Bicolor :</strong> Moule A ({colorA}) + Moule B ({colorB}) = <strong>1 seule paire Bicolor</strong>. Ne jamais compter chaque moule comme une paire indépendante.
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Moule A & Couleur A */}
                  <div className="p-3 rounded-lg bg-white border border-slate-200">
                    <span className="text-xs font-bold text-slate-800 block mb-2">Composant A (ex: Empeigne / Tige)</span>
                    <div className="space-y-2">
                      <div>
                        <label className="text-[11px] text-slate-500">Moule A</label>
                        <input
                          type="text"
                          value={moldA}
                          onChange={(e) => setMoldA(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs rounded-md border border-slate-300"
                          placeholder="Moule A code"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-500">Couleur A</label>
                        <select
                          value={colorA}
                          onChange={(e) => setColorA(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs rounded-md border border-slate-300 bg-white"
                        >
                          {shoeColors.map((c) => (
                            <option key={c.id} value={c.name}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Moule B & Couleur B */}
                  <div className="p-3 rounded-lg bg-white border border-slate-200">
                    <span className="text-xs font-bold text-slate-800 block mb-2">Composant B (ex: Semelle / Patin)</span>
                    <div className="space-y-2">
                      <div>
                        <label className="text-[11px] text-slate-500">Moule B</label>
                        <input
                          type="text"
                          value={moldB}
                          onChange={(e) => setMoldB(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs rounded-md border border-slate-300"
                          placeholder="Moule B code"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-500">Couleur B</label>
                        <select
                          value={colorB}
                          onChange={(e) => setColorB(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs rounded-md border border-slate-300 bg-white"
                        >
                          {shoeColors.map((c) => (
                            <option key={c.id} value={c.name}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Moule Mono</label>
                  <select
                    value={singleMoldId}
                    onChange={(e) => setSingleMoldId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                  >
                    {industrialMolds.map((m) => (
                      <option key={m.id} value={m.code}>
                        {m.code} — {m.name} (T{m.size})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Couleur</label>
                  <select
                    value={singleColor}
                    onChange={(e) => setSingleColor(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                  >
                    {shoeColors.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 5 : POINTURES — SPÉCIFIQUE SOUMELLE (18 À 45) VS PVC / EVA */}
          {material === 'SOUMELLE' ? (
            <div className="p-4 rounded-xl border-2 border-amber-300 bg-amber-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-amber-950 flex items-center gap-2">
                    <Boxes className="w-4 h-4 text-amber-600" />
                    Production Soumelle par Pointure (18 à 45)
                  </h3>
                  <p className="text-xs text-amber-800">
                    Saisie séparée par taille. Ne jamais fusionner les différentes pointures dans le détail.
                  </p>
                </div>
                <span className="text-xs font-mono font-bold px-3 py-1 bg-amber-200/70 text-amber-900 rounded-full">
                  Total : {totalSoumellePairs} paires
                </span>
              </div>

              {/* Grid 18 to 45 */}
              <div className="grid grid-cols-4 sm:grid-cols-7 md:grid-cols-10 gap-2">
                {SOUMELLE_SIZES.map((sz) => {
                  const qty = soumelleQuantities[sz] || 0;
                  return (
                    <div
                      key={sz}
                      className={`p-2 rounded-lg border text-center transition-colors ${
                        qty > 0 ? 'bg-amber-100 border-amber-400' : 'bg-white border-slate-200'
                      }`}
                    >
                      <label className="block text-[11px] font-bold text-slate-700">T{sz}</label>
                      <input
                        type="number"
                        min="0"
                        value={qty === 0 ? '' : qty}
                        placeholder="0"
                        onChange={(e) => handleSoumelleQtyChange(sz, parseInt(e.target.value) || 0)}
                        className="w-full mt-1 text-center font-mono font-semibold text-xs py-1 px-1 rounded-sm border border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-amber-500 bg-white"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ) : hasSizeIntervals ? (
            <div className="p-4 rounded-xl border-2 border-indigo-200 bg-indigo-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-indigo-950 flex items-center gap-2">
                    <Grid className="w-4 h-4 text-indigo-600" />
                    Détail de Production par Pointure — {selectedModel?.name}
                  </h3>
                  <p className="text-xs text-indigo-800">
                    Plage de pointures : {selectedModel?.sizeRange || '36-41'} • Le détail par pointure est toujours conservé.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold px-3 py-1 bg-indigo-200/80 text-indigo-950 rounded-full border border-indigo-300">
                    Total : {totalIntervalPairs} paires
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(selectedModel?.sizeIntervals || []).map((interval) => {
                  const qty = intervalQuantities[interval] || 0;
                  return (
                    <div
                      key={interval}
                      className={`p-3 rounded-xl border transition-all ${
                        qty > 0 ? 'bg-white border-indigo-400 shadow-xs' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold font-mono text-indigo-950">
                          T{interval}
                        </label>
                        <span className="text-[10px] text-slate-500 font-medium">Pointures</span>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          value={qty === 0 ? '' : qty}
                          placeholder="0"
                          onChange={(e) => handleIntervalQtyChange(interval, parseInt(e.target.value) || 0)}
                          className="w-full text-center font-mono font-bold text-sm py-1.5 px-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900"
                        />
                        <span className="absolute right-2 top-2 text-[10px] font-mono text-slate-400 pointer-events-none">
                          p
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Pointure Principale ({material})
              </label>
              <div className="flex flex-wrap gap-2">
                {(selectedModel?.sizes || [36, 37, 38, 39, 40, 41, 42, 43, 44, 45]).map((s) => (
                  <button
                    type="button"
                    key={s}
                    onClick={() => setSize(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      size === s
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    T{s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 5.5 : ARCHITECTURE POSTES / STATIONS */}
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl">
              <div className="flex items-center gap-2">
                {isEvaMachine ? (
                  <Sliders className="w-4 h-4 text-indigo-600" />
                ) : (
                  <Layers className="w-4 h-4 text-indigo-600" />
                )}
                <span className="text-xs font-bold text-indigo-950">
                  {isEvaMachine
                    ? `Architecture Machine EVA (6 Stations • 12 Moules • 2 Injecteurs) — ${selectedMachine.code}`
                    : `Configuration des 12 Plateformes — ${selectedMachine.code}`}
                </span>
                <span className="text-[10px] bg-indigo-600 text-white font-mono px-2 py-0.5 rounded-full font-bold">
                  {isEvaMachine
                    ? `${evaMachineKpis?.engagedCapacityPerCycle || 24} / 24 p/cycle (${evaMachineKpis?.utilizationRatePercent || 100}%)`
                    : `${platformsCapacityPerCycle} paires/cycle`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowPlatformsGrid(!showPlatformsGrid)}
                className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 bg-white px-3 py-1 rounded-lg border border-indigo-200 shadow-2xs transition"
              >
                {showPlatformsGrid
                  ? 'Masquer la Configuration'
                  : isEvaMachine
                  ? 'Afficher / Ajuster les 6 Stations'
                  : 'Afficher / Ajuster les 12 Plateformes'}
              </button>
            </div>

            {showPlatformsGrid && (
              <div className="pt-1">
                {isEvaMachine ? (
                  <EvaMachineStationManager
                    machineCode={selectedMachine.code}
                    stations={evaStations}
                    onStationsChange={(newSts) => {
                      setEvaStations(newSts);
                      const kpis = calculateEvaMachineKpis(newSts, cycles, rawPairsInput);
                      setPlatformsCapacityPerCycle(kpis.engagedCapacityPerCycle);
                    }}
                    compteurDebut={counterStart}
                    compteurFin={counterEnd}
                    productionReelle={rawPairsInput}
                  />
                ) : (
                  <Interactive12PlatformsGrid
                    machine={selectedMachine}
                    onPlatformsChange={(_plats, cap) => {
                      setPlatformsCapacityPerCycle(cap);
                    }}
                  />
                )}
              </div>
            )}
          </div>

          {/* SECTION 6 : COMPTEUR, CYCLES & IA OCR SCANNER */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Camera className="w-4 h-4 text-indigo-600" />
                Compteurs Machine &amp; Cycles (Certification IA Optionnelle)
              </h3>
              <label className="flex items-center gap-1.5 px-3 py-1 bg-white border border-indigo-300 hover:border-indigo-400 text-indigo-700 rounded-lg text-xs font-semibold cursor-pointer shadow-2xs">
                <Camera className="w-3.5 h-3.5" />
                {isAnalyzingOcr ? 'Analyse OCR en cours...' : 'Photo / Relevé IA'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  disabled={isAnalyzingOcr}
                  className="hidden"
                />
              </label>
            </div>

            {ocrAnomaly && (
              <div className="p-3 bg-red-50 border border-red-300 rounded-lg text-xs text-red-700 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{ocrAnomaly}</span>
              </div>
            )}

            {counterPhotoUrl && (
              <div className="flex items-center gap-3 p-2 bg-white rounded-lg border border-slate-200">
                <img
                  src={counterPhotoUrl}
                  alt="Preuve compteur"
                  className="w-16 h-12 object-cover rounded-md border"
                  referrerPolicy="no-referrer"
                />
                <div className="text-xs text-slate-600">
                  <p className="font-semibold text-slate-800">Photo compteur archivée comme preuve</p>
                  {ocrDetectedValue && (
                    <p className="text-emerald-600 font-mono">Valeur détectée par IA : {ocrDetectedValue}</p>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-slate-600 mb-1">Compteur Début</label>
                <input
                  type="number"
                  value={counterStart}
                  onChange={(e) => setCounterStart(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Compteur Fin</label>
                <input
                  type="number"
                  value={counterEnd}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    setCounterEnd(val);
                    if (val >= counterStart && material !== 'SOUMELLE') {
                      setRawPairsInput(val - counterStart);
                    }
                  }}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Nombre de Cycles</label>
                <input
                  type="number"
                  value={cycles}
                  onChange={(e) => {
                    const c = parseInt(e.target.value) || 0;
                    setCycles(c);
                    if (material !== 'SOUMELLE') {
                      const pCycle = selectedModel?.pairsPerCycle || 4;
                      setRawPairsInput(c * pCycle);
                    }
                  }}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Rebuts / Rejets (Paires)</label>
                <input
                  type="number"
                  min="0"
                  value={rejectedPairs}
                  onChange={(e) => setRejectedPairs(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-red-300 font-mono text-red-600"
                />
              </div>
            </div>

            {rejectedPairs > 0 && (
              <div>
                <label className="block text-xs text-slate-600 mb-1">Motif du Rejet</label>
                <input
                  type="text"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Ex: Bavures, bulles d'air, déformation..."
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300"
                />
              </div>
            )}
          </div>

          {/* SECTION 7 : TEMPS, ARRÊTS & PRODUCTIVITÉ */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-600 mb-1">Heure Début - Fin</label>
              <div className="flex gap-2">
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-1/2 px-2 py-1.5 text-xs rounded-lg border border-slate-300"
                />
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-1/2 px-2 py-1.5 text-xs rounded-lg border border-slate-300"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">Arrêts (Minutes)</label>
              <input
                type="number"
                min="0"
                value={downtimeMinutes}
                onChange={(e) => setDowntimeMinutes(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">Objectif de Production (Paires)</label>
              <input
                type="number"
                min="1"
                value={targetPairs}
                onChange={(e) => setTargetPairs(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 font-mono"
              />
            </div>
          </div>

          {/* SECTION 8 : PANNEAU DES CALCULS AUTOMATIQUES EN TEMPS RÉEL */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white shadow-md">
            <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                <Calculator className="w-4 h-4" />
                Résultats et Ratios Calculés en Temps Réel
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                Règle {material} • Formules Industrielles CTP SMART
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div className="p-2.5 rounded-lg bg-white/5 border border-white/10">
                <span className="block text-[11px] text-slate-400">Production Brute</span>
                <span className="text-xl font-black text-white font-mono">
                  {calcResults.rawProduction} <span className="text-xs font-normal">paires</span>
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <span className="block text-[11px] text-emerald-300">Conforme (Brut - Rejets)</span>
                <span className="text-xl font-black text-emerald-400 font-mono">
                  {calcResults.conforming} <span className="text-xs font-normal">paires</span>
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-white/5 border border-white/10">
                <span className="block text-[11px] text-slate-400">Conformité %</span>
                <span className="text-xl font-black text-white font-mono">
                  {calcResults.conformanceRatePct}%
                </span>
                <span className="text-[10px] text-slate-400 block">Rejet : {calcResults.scrapRatePct}%</span>
              </div>

              <div className="p-2.5 rounded-lg bg-white/5 border border-white/10">
                <span className="block text-[11px] text-slate-400">Écart vs Objectif</span>
                <span
                  className={`text-xl font-black font-mono ${
                    calcResults.variance >= 0 ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {calcResults.variance > 0 ? `+${calcResults.variance}` : calcResults.variance}{' '}
                  <span className="text-xs font-normal">paires</span>
                </span>
                <span className="text-[10px] text-slate-400 block">Rendement : {calcResults.yieldPct}%</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3 pt-3 border-t border-white/10 text-xs">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                <div>
                  <span className="text-slate-400 block text-[11px]">Matière consommée :</span>
                  <strong className="font-mono text-white">
                    {calcResults.materialConsumedKg} kg ({calcResults.bags25kgConsumed} sacs 25kg)
                  </strong>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                <div>
                  <span className="text-slate-400 block text-[11px]">Temps &amp; Productivité :</span>
                  <strong className="font-mono text-white">
                    {calcResults.durationFormatted} • {calcResults.productivityPairsPerHour} p/h
                  </strong>
                </div>
              </div>

              {/* Conditionnement Cartons pour PVC & EVA (Calcul dynamique paramétrable) */}
              {material !== 'SOUMELLE' && (
                <div className="flex items-center gap-2 bg-indigo-500/20 px-3 py-2 rounded-lg border border-indigo-400/30">
                  <Package className="w-5 h-5 text-indigo-300 shrink-0" />
                  <div>
                    <span className="text-indigo-200 block text-[11px] font-medium">
                      Conditionnement Cartons ({currentCartonType}) :
                    </span>
                    <strong className="font-mono text-white text-xs">
                      {completeCartons} cartons complets ({completeCartons * currentPairsPerCarton} p.)
                      {remainderPairs > 0 && ` + ${remainderPairs} p. restantes`}
                    </strong>
                    <span className="block text-[10px] text-indigo-300/80">
                      Règle : {selectedModel?.packagingRule || `${currentPairsPerCarton} paires/carton ${currentCartonType}`}
                    </span>
                  </div>
                </div>
              )}

              {/* Destination Stock Soumelle */}
              {material === 'SOUMELLE' && (
                <div className="flex items-center gap-2 bg-amber-500/20 px-2.5 py-1.5 rounded-lg border border-amber-400/30">
                  <Boxes className="w-4 h-4 text-amber-300" />
                  <div>
                    <span className="text-amber-200 block text-[11px]">Stockage Soumelle :</span>
                    <strong className="font-mono text-white">
                      Direct en Stock Soumelle (18 à 45)
                    </strong>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Observations */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Observations &amp; Paramètres Spécifiques
            </label>
            <textarea
              rows={2}
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Remarques particulières sur le lot, pressions, températures ou cadence..."
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-sm font-semibold transition-colors"
            >
              Annuler
            </button>

            <button
              type="submit"
              id="btn-submit-daily-sheet"
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              Enregistrer Fiche Journalière ({material})
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
