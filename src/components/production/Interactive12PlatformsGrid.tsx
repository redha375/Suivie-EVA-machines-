import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sliders,
  Sparkles,
  Info,
  Edit3,
  Check,
  X,
  Calculator,
  ShieldAlert,
  HelpCircle,
  Hash,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { PlatformConfigItem, PlatformState, Machine } from '../../types';

// Standard 12 platforms initial default generator
export function createDefault12Platforms(machineCode?: string): PlatformConfigItem[] {
  // Common industrial default series (pointures doubles standard CTP)
  const defaultSizes = [
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
  ];

  return Array.from({ length: 12 }, (_, i) => {
    const num = i + 1;
    const formattedNum = num.toString().padStart(2, '0');
    return {
      id: num,
      number: num,
      name: `Plateforme ${formattedNum}`,
      pointure: defaultSizes[i] || '36-37',
      state: 'Active' as PlatformState,
      pairsCount: 2, // Maximum 2 paires par plateforme par défaut si Active
      moldRef: `M-${defaultSizes[i]?.replace('-', '') || '00'}-${formattedNum}`,
      notes: '',
    };
  });
}

// Preset Pointure options commonly used in CTP factory
export const COMMON_POINTURE_PRESETS = [
  // Tailles doubles (pointures combinées)
  '18-19',
  '20-21',
  '20-23',
  '22-23',
  '23-28',
  '24-25',
  '26-27',
  '28-29',
  '28-35',
  '30-31',
  '32-33',
  '34-35',
  '36-37',
  '36-39',
  '36-41',
  '38-39',
  '39-44',
  '40-41',
  '40-44',
  '42-43',
  '43-44',
  '44-45',
  // Tailles simples
  '18',
  '19',
  '20',
  '22',
  '24',
  '26',
  '28',
  '30',
  '32',
  '34',
  '36',
  '37',
  '38',
  '39',
  '40',
  '41',
  '42',
  '43',
  '44',
  '45',
];

interface Interactive12PlatformsGridProps {
  machine?: Machine;
  onPlatformsChange?: (platforms: PlatformConfigItem[], capacityPerCycle: number) => void;
  readOnly?: boolean;
  initialPlatforms?: PlatformConfigItem[];
  compact?: boolean;
}

export const Interactive12PlatformsGrid: React.FC<Interactive12PlatformsGridProps> = ({
  machine,
  onPlatformsChange,
  readOnly = false,
  initialPlatforms,
  compact = false,
}) => {
  const storageKey = `ctp_platforms_config_${machine?.id || 'default'}`;

  // State: 12 platforms list
  const [platforms, setPlatforms] = useState<PlatformConfigItem[]>(() => {
    if (initialPlatforms && initialPlatforms.length === 12) {
      return initialPlatforms;
    }
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 12) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Could not load stored platforms:', e);
    }
    return createDefault12Platforms(machine?.code);
  });

  // Selected platform for rapid quick modal / inline editor
  const [editingPlatform, setEditingPlatform] = useState<PlatformConfigItem | null>(null);
  const [maxPairsAlert, setMaxPairsAlert] = useState<string | null>(null);

  // Cycle simulator & automatic control section state
  const [showSimulator, setShowSimulator] = useState<boolean>(true);
  const [simCompteurDebut, setSimCompteurDebut] = useState<number>(machine?.lastCounterValue || 12400);
  const [simCompteurFin, setSimCompteurFin] = useState<number>((machine?.lastCounterValue || 12400) + 50);
  const [simDeclaredProd, setSimDeclaredProd] = useState<number>(1200);

  // Synchronize when machine changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`ctp_platforms_config_${machine?.id || 'default'}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 12) {
          setPlatforms(parsed);
          return;
        }
      }
    } catch (e) {
      console.warn('Error loading platform config on machine change:', e);
    }
    if (initialPlatforms && initialPlatforms.length === 12) {
      setPlatforms(initialPlatforms);
    } else {
      setPlatforms(createDefault12Platforms(machine?.code));
    }
  }, [machine?.id]);

  // Active platforms count
  const activePlatformsCount = useMemo(() => {
    return platforms.filter((p) => p.state === 'Active').length;
  }, [platforms]);

  const videPlatformsCount = useMemo(() => {
    return platforms.filter((p) => p.state === 'Vide').length;
  }, [platforms]);

  const defautPlatformsCount = useMemo(() => {
    return platforms.filter((p) => p.state === 'Défaut').length;
  }, [platforms]);

  // Capacité Théorique (paires par cycle) = Nombre de plateformes actives × 2
  // Règle formelle CTP : Chaque plateforme active porte exactement ou au max 2 paires.
  const theoreticalCapacityPerCycle = useMemo(() => {
    return platforms.reduce((acc, p) => {
      if (p.state === 'Active') {
        // Strict clamp: max 2 pairs per platform
        const pairs = Math.min(2, Math.max(0, p.pairsCount));
        return acc + pairs;
      }
      return acc;
    }, 0);
  }, [platforms]);

  // Notify parent component
  useEffect(() => {
    if (onPlatformsChange) {
      onPlatformsChange(platforms, theoreticalCapacityPerCycle);
    }
    try {
      localStorage.setItem(storageKey, JSON.stringify(platforms));
    } catch (e) {
      // ignore
    }
  }, [platforms, theoreticalCapacityPerCycle, storageKey, onPlatformsChange]);

  // Simulator calculations
  const simCycles = Math.max(0, simCompteurFin - simCompteurDebut);
  const simTheoreticalPairs = simCycles * theoreticalCapacityPerCycle;
  const simHasDiscrepancy = simDeclaredProd > 0 && simTheoreticalPairs !== simDeclaredProd;
  const simDelta = simDeclaredProd - simTheoreticalPairs;

  // Handler to toggle state: Active -> Vide -> Défaut -> Active
  const handleToggleState = (id: number) => {
    if (readOnly) return;
    setPlatforms((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        let nextState: PlatformState = 'Active';
        let nextPairs = 2;

        if (p.state === 'Active') {
          nextState = 'Vide';
          nextPairs = 0;
        } else if (p.state === 'Vide') {
          nextState = 'Défaut';
          nextPairs = 0;
        } else {
          nextState = 'Active';
          nextPairs = 2; // Maximum 2 paires
        }

        return {
          ...p,
          state: nextState,
          pairsCount: nextPairs,
        };
      })
    );
  };

  // Handler to update pointure directly
  const handlePointureChange = (id: number, val: string) => {
    if (readOnly) return;
    setPlatforms((prev) =>
      prev.map((p) => (p.id === id ? { ...p, pointure: val.trim() } : p))
    );
  };

  // Handler to update pairs count strictly clamped to max 2 paires!
  const handlePairsCountChange = (id: number, inputVal: number) => {
    if (readOnly) return;
    if (inputVal > 2) {
      setMaxPairsAlert(
        `Plateforme ${id} : La règle industrielle stricte CTP interdit de saisir plus de 2 paires par plateforme. Valeur plafonnée à 2.`
      );
      setTimeout(() => setMaxPairsAlert(null), 5000);
    }

    const safePairs = Math.min(2, Math.max(0, inputVal));
    setPlatforms((prev) =>
      prev.map((p) => (p.id === id ? { ...p, pairsCount: safePairs } : p))
    );
  };

  // Presets
  const applyAllActive = () => {
    setPlatforms((prev) =>
      prev.map((p) => ({
        ...p,
        state: 'Active',
        pairsCount: 2, // Strict rule: max 2 paires
      }))
    );
  };

  const applyPresetEnfant = () => {
    const enfantSizes = [
      '18-19',
      '20-21',
      '22-23',
      '24-25',
      '26-27',
      '28-29',
      '18-19',
      '20-21',
      '22-23',
      '24-25',
      '26-27',
      '28-29',
    ];
    setPlatforms((prev) =>
      prev.map((p, idx) => ({
        ...p,
        state: 'Active',
        pointure: enfantSizes[idx] || '20-21',
        pairsCount: 2,
      }))
    );
  };

  const applyPresetCadetFemme = () => {
    const cadetSizes = [
      '30-31',
      '32-33',
      '34-35',
      '36-37',
      '38-39',
      '40-41',
      '30-31',
      '32-33',
      '34-35',
      '36-37',
      '38-39',
      '40-41',
    ];
    setPlatforms((prev) =>
      prev.map((p, idx) => ({
        ...p,
        state: 'Active',
        pointure: cadetSizes[idx] || '36-37',
        pairsCount: 2,
      }))
    );
  };

  const applyPresetHomme = () => {
    const hommeSizes = [
      '39-40',
      '40-41',
      '41-42',
      '42-43',
      '43-44',
      '44-45',
      '39-40',
      '40-41',
      '41-42',
      '42-43',
      '43-44',
      '44-45',
    ];
    setPlatforms((prev) =>
      prev.map((p, idx) => ({
        ...p,
        state: 'Active',
        pointure: hommeSizes[idx] || '41-42',
        pairsCount: 2,
      }))
    );
  };

  const handleReset = () => {
    const def = createDefault12Platforms(machine?.code);
    setPlatforms(def);
  };

  return (
    <div
      className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4"
      id="grid-12-plateformes-container"
    >
      {/* Header & Title */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                Grille des 12 Plateformes / Empreintes
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-mono font-bold">
                  {machine?.code || '12 Stations'}
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Spécification des pointures (ex: &apos;18-19&apos;) et états (Active/Vide/Défaut) •{' '}
                <strong className="text-slate-700">Règle stricte : Maximum 2 paires par plateforme</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Global Summary KPI Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Active count badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              Actives : <strong>{activePlatformsCount}</strong> / 12
            </span>
          </div>

          {/* Vide count badge */}
          {videPlatformsCount > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium">
              <span>Vides : {videPlatformsCount}</span>
            </div>
          )}

          {/* Défaut count badge */}
          {defautPlatformsCount > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              <AlertTriangle className="w-3 h-3 text-rose-500" />
              <span>Défaut : {defautPlatformsCount}</span>
            </div>
          )}

          {/* Capacité Théorique par Cycle */}
          <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-xs">
            <Calculator className="w-3.5 h-3.5 text-indigo-200" />
            <span>Capacité Cycle :</span>
            <span className="font-mono text-sm bg-indigo-700 px-1.5 py-0.2 rounded-md">
              {theoreticalCapacityPerCycle} paires/cycle
            </span>
          </div>
        </div>
      </div>

      {/* Strict Rule Alert Banner if someone tried typing > 2 pairs */}
      {maxPairsAlert && (
        <div className="p-3 bg-amber-50 border-2 border-amber-400 rounded-xl text-xs text-amber-900 flex items-start gap-2.5 animate-bounce shadow-xs">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold">Contrainte Industrielle Respectée :</strong> {maxPairsAlert}
          </div>
        </div>
      )}

      {/* Quick Action & Series Presets Bar */}
      {!readOnly && (
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
          <div className="flex items-center gap-1.5 text-slate-600 font-semibold">
            <Sliders className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[11px] uppercase tracking-wide">Préréglages rapides :</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              id="btn-platforms-all-active"
              onClick={applyAllActive}
              className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-lg font-medium transition-all flex items-center gap-1 shadow-2xs"
            >
              <Check className="w-3 h-3" />
              Toutes Actives (24 p/cycle)
            </button>

            <button
              type="button"
              id="btn-platforms-preset-enfant"
              onClick={applyPresetEnfant}
              className="px-2.5 py-1 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg font-medium transition-all shadow-2xs"
            >
              Série Enfant (18-29)
            </button>

            <button
              type="button"
              id="btn-platforms-preset-femme"
              onClick={applyPresetCadetFemme}
              className="px-2.5 py-1 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg font-medium transition-all shadow-2xs"
            >
              Série Cadet / Femme (30-41)
            </button>

            <button
              type="button"
              id="btn-platforms-preset-homme"
              onClick={applyPresetHomme}
              className="px-2.5 py-1 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg font-medium transition-all shadow-2xs"
            >
              Série Homme (39-45)
            </button>

            <button
              type="button"
              id="btn-platforms-reset"
              onClick={handleReset}
              className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg font-medium transition-all flex items-center gap-1"
              title="Réinitialiser les 12 plateformes"
            >
              <RotateCcw className="w-3 h-3 text-slate-400" />
              Réinitialiser
            </button>
          </div>
        </div>
      )}

      {/* THE 12-PLATFORM INTERACTIVE GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {platforms.map((plat) => {
          const isActive = plat.state === 'Active';
          const isVide = plat.state === 'Vide';
          const isDefaut = plat.state === 'Défaut';

          return (
            <div
              key={plat.id}
              id={`platform-card-${plat.number}`}
              className={`relative rounded-xl p-3 border transition-all flex flex-col justify-between ${
                isActive
                  ? 'bg-gradient-to-b from-white to-emerald-50/40 border-emerald-300 shadow-xs ring-1 ring-emerald-200/50'
                  : isDefaut
                  ? 'bg-gradient-to-b from-white to-rose-50/40 border-rose-300 shadow-xs'
                  : 'bg-slate-50/80 border-slate-200 opacity-90'
              }`}
            >
              {/* Card Top: Number & Quick State Toggle Pill */}
              <div className="flex items-center justify-between gap-1 mb-2">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-6 h-6 rounded-md flex items-center justify-center font-mono font-black text-xs ${
                      isActive
                        ? 'bg-emerald-600 text-white'
                        : isDefaut
                        ? 'bg-rose-600 text-white'
                        : 'bg-slate-300 text-slate-700'
                    }`}
                  >
                    {plat.number.toString().padStart(2, '0')}
                  </span>
                  <span className="text-[11px] font-bold text-slate-800 tracking-tight">
                    P{plat.number}
                  </span>
                </div>

                {/* State Toggle Button (Click to cycle Active -> Vide -> Défaut) */}
                <button
                  type="button"
                  id={`btn-toggle-state-${plat.number}`}
                  onClick={() => handleToggleState(plat.id)}
                  disabled={readOnly}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-all border flex items-center gap-1 ${
                    isActive
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200'
                      : isDefaut
                      ? 'bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-200'
                      : 'bg-slate-200 text-slate-700 border-slate-300 hover:bg-slate-300'
                  }`}
                  title="Cliquer pour changer d'état (Active / Vide / Défaut)"
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isActive
                        ? 'bg-emerald-500'
                        : isDefaut
                        ? 'bg-rose-500'
                        : 'bg-slate-400'
                    }`}
                  />
                  {plat.state}
                </button>
              </div>

              {/* Pointure Input & Selector */}
              <div className="space-y-1 my-1">
                <label className="text-[10px] font-bold text-slate-500 flex items-center justify-between">
                  <span>Pointure(s) :</span>
                  <span className="text-[9px] font-normal text-slate-400">ex: 18-19</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id={`input-pointure-${plat.number}`}
                    value={plat.pointure}
                    disabled={readOnly || isVide}
                    onChange={(e) => handlePointureChange(plat.id, e.target.value)}
                    placeholder="ex: 18-19"
                    className={`w-full text-center font-mono font-bold text-xs py-1 px-1.5 rounded-lg border focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all ${
                      isVide
                        ? 'bg-slate-100 border-slate-200 text-slate-400'
                        : isDefaut
                        ? 'bg-white border-rose-200 text-rose-900'
                        : 'bg-white border-slate-300 text-slate-900 font-extrabold'
                    }`}
                  />
                </div>

                {/* Quick pointure preset buttons dropdown-like */}
                {!readOnly && !isVide && (
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {['18-19', '24-25', '30-31', '36-37', '40-41', '43-44'].map((s) => (
                      <button
                        type="button"
                        key={s}
                        onClick={() => handlePointureChange(plat.id, s)}
                        className={`text-[9px] px-1 py-0.2 rounded font-mono transition-all ${
                          plat.pointure === s
                            ? 'bg-indigo-600 text-white font-bold'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Card Bottom: Nombre de paires (STRICTLY MAXIMUM 2 PAIRES) */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs mt-1">
                <span className="text-[10px] text-slate-500 font-medium">Paires :</span>

                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    id={`input-pairs-${plat.number}`}
                    min={0}
                    max={2}
                    value={isVide || isDefaut ? 0 : plat.pairsCount}
                    disabled={readOnly || isVide || isDefaut}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      handlePairsCountChange(plat.id, isNaN(val) ? 0 : val);
                    }}
                    className={`w-12 text-center font-mono font-bold text-xs py-0.5 rounded-md border text-slate-900 ${
                      plat.pairsCount > 2
                        ? 'border-red-500 bg-red-50'
                        : isVide || isDefaut
                        ? 'bg-slate-100 border-slate-200 text-slate-400'
                        : 'bg-white border-slate-300 focus:ring-1 focus:ring-indigo-500'
                    }`}
                  />
                  <span className="text-[10px] font-mono text-slate-400 font-semibold">
                    / 2 max
                  </span>
                </div>
              </div>

              {/* Edit Full Details Button */}
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => setEditingPlatform(plat)}
                  className="mt-2 w-full py-1 text-[10px] text-slate-500 hover:text-indigo-600 hover:bg-indigo-50/70 rounded-md transition-all flex items-center justify-center gap-1 border border-dashed border-slate-200"
                >
                  <Edit3 className="w-2.5 h-2.5" />
                  <span>Détails &amp; Moule</span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary Formula Callout */}
      <div className="p-3 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-white/10 text-indigo-300">
            <Info className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-white block">
              Formule de Capacité CTP SMART :
            </span>
            <span className="text-slate-300 font-mono text-[11px]">
              Capacité Cycle = {activePlatformsCount} plateformes actives × 2 paires ={' '}
              <strong className="text-emerald-400 font-black">{theoreticalCapacityPerCycle} paires / cycle</strong>.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-indigo-200">
            Paires max/plateforme : <strong className="font-mono text-white">2 paires</strong>
          </span>
          <button
            type="button"
            onClick={() => setShowSimulator(!showSimulator)}
            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition"
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>{showSimulator ? 'Masquer Contrôle' : 'Contrôle Cycles & Production'}</span>
            {showSimulator ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* AUTOMATIC CONTROL & CYCLE PRODUCTION CHECK SECTION */}
      {showSimulator && (
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3" id="cycle-control-section">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                Contrôle Automatique de Production (Cycles vs Capacité Théorique)
              </h3>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              Cycles = Compteur fin − Compteur début • Paires théoriques = Cycles × {theoreticalCapacityPerCycle}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Compteur Début</label>
              <input
                type="number"
                id="sim-compteur-debut"
                value={simCompteurDebut}
                onChange={(e) => setSimCompteurDebut(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-1.5 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Compteur Fin</label>
              <input
                type="number"
                id="sim-compteur-fin"
                value={simCompteurFin}
                onChange={(e) => setSimCompteurFin(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-1.5 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Cycles Réalisés (Fin - Début)
              </label>
              <div className="w-full px-3 py-1.5 text-xs font-mono font-black bg-slate-100 border border-slate-200 rounded-lg text-slate-900">
                {simCycles} cycles
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Production Déclarée (Paires)
              </label>
              <input
                type="number"
                id="sim-declared-prod"
                value={simDeclaredProd}
                onChange={(e) => setSimDeclaredProd(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-1.5 text-xs font-mono font-bold bg-white border border-indigo-300 rounded-lg text-indigo-900"
              />
            </div>
          </div>

          {/* Validation Result Box */}
          <div className="pt-2">
            {simHasDiscrepancy ? (
              <div className="p-3 bg-rose-50 border-2 border-rose-300 rounded-xl text-xs text-rose-900 flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <strong className="font-black text-rose-800 tracking-wide block uppercase">
                    ⚠️ ALERT — INCOHÉRENCE DE PRODUCTION DÉTECTÉE
                  </strong>
                  <p className="text-rose-700">
                    Production déclarée : <span className="font-bold font-mono">{simDeclaredProd} paires</span> vs{' '}
                    Capacité théorique calculée :{' '}
                    <span className="font-bold font-mono">
                      {simCycles} cycles × {theoreticalCapacityPerCycle} paires/cycle = {simTheoreticalPairs} paires
                    </span>
                    .
                  </p>
                  <p className="text-[11px] text-rose-600">
                    Écart constaté : <strong>{simDelta > 0 ? `+${simDelta}` : simDelta} paires</strong>. Conformément aux
                    consignes CTP SMART, les chiffres ne sont pas altérés automatiquement et nécessitent validation du
                    chef d&apos;équipe.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <strong className="font-bold">Cohérence Parfaite :</strong>{' '}
                  <span className="font-mono">
                    {simCycles} cycles × {theoreticalCapacityPerCycle} paires/cycle = {simTheoreticalPairs} paires
                  </span>{' '}
                  (conforme à la production déclarée).
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL / DRAWER FOR EDITING A SPECIFIC PLATFORM */}
      {editingPlatform && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-mono font-black flex items-center justify-center text-sm">
                  P{editingPlatform.number}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {editingPlatform.name} — Paramètres
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Configuration spécifique de l&apos;empreinte machine
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingPlatform(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* État */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">État de la plateforme :</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Active', 'Vide', 'Défaut'] as PlatformState[]).map((st) => (
                    <button
                      type="button"
                      key={st}
                      onClick={() => {
                        const nextPairs = st === 'Active' ? 2 : 0;
                        setEditingPlatform({ ...editingPlatform, state: st, pairsCount: nextPairs });
                      }}
                      className={`py-2 px-2 rounded-xl font-bold border text-center transition-all ${
                        editingPlatform.state === st
                          ? st === 'Active'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : st === 'Défaut'
                            ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                            : 'bg-slate-700 text-white border-slate-700 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pointure(s) */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Pointure(s) de la plateforme (ex: &apos;18-19&apos;, &apos;36-37&apos;, &apos;43-44&apos;) :
                </label>
                <input
                  type="text"
                  value={editingPlatform.pointure}
                  onChange={(e) =>
                    setEditingPlatform({ ...editingPlatform, pointure: e.target.value.trim() })
                  }
                  placeholder="ex: 18-19 ou 36"
                  className="w-full px-3 py-2 text-sm font-mono font-bold rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                />
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {COMMON_POINTURE_PRESETS.slice(0, 10).map((preset) => (
                    <button
                      type="button"
                      key={preset}
                      onClick={() => setEditingPlatform({ ...editingPlatform, pointure: preset })}
                      className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-mono"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nombre de Paires (Maximum 2) */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nombre de paires par cycle (Max 2 paires) :
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={2}
                    value={editingPlatform.pairsCount}
                    onChange={(e) => {
                      const val = Math.min(2, Math.max(0, parseInt(e.target.value) || 0));
                      setEditingPlatform({ ...editingPlatform, pairsCount: val });
                    }}
                    className="w-20 px-3 py-2 text-sm font-mono font-bold rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 text-center"
                  />
                  <span className="text-slate-500 text-xs">
                    (Strictement limité à <strong>2 paires maximum</strong>)
                  </span>
                </div>
              </div>

              {/* Référence Moule */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Référence Moule Associé :
                </label>
                <input
                  type="text"
                  value={editingPlatform.moldRef || ''}
                  onChange={(e) =>
                    setEditingPlatform({ ...editingPlatform, moldRef: e.target.value })
                  }
                  placeholder="ex: M-1819-01"
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes / État technique :</label>
                <input
                  type="text"
                  value={editingPlatform.notes || ''}
                  onChange={(e) =>
                    setEditingPlatform({ ...editingPlatform, notes: e.target.value })
                  }
                  placeholder="ex: Réglage de température, empreinte vérifiée"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingPlatform(null)}
                className="px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-100 font-semibold text-xs"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  setPlatforms((prev) =>
                    prev.map((p) => (p.id === editingPlatform.id ? editingPlatform : p))
                  );
                  setEditingPlatform(null);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-xs"
              >
                Enregistrer la Plateforme
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
