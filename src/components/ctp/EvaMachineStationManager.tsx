import React, { useState } from 'react';
import {
  Gauge,
  Layers,
  Power,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Info,
  Palette,
  Sparkles,
  RotateCcw,
  Zap,
} from 'lucide-react';
import {
  EvaStationConfig,
  EvaStationMode,
} from '../../types/evaProductionLogic';
import {
  calculateStationPairsPerCycle,
  calculateEvaMachineKpis,
  EVA_PRESETS,
  THEORETICAL_MAX_PAIRS_PER_CYCLE,
} from '../../utils/evaStationEngine';

interface EvaMachineStationManagerProps {
  machineCode?: string;
  stations: EvaStationConfig[];
  onStationsChange: (newStations: EvaStationConfig[]) => void;
  // Optionnels pour simulation compteur
  compteurDebut?: number;
  compteurFin?: number;
  productionReelle?: number;
  readOnly?: boolean;
}

const COLOR_OPTIONS = [
  'Noir',
  'Blanc',
  'Bleu Marine',
  'Rouge',
  'Gris',
  'Beige',
  'Vert',
  'Marron',
  'Jaune',
];

export const EvaMachineStationManager: React.FC<EvaMachineStationManagerProps> = ({
  machineCode = 'EVA 1',
  stations,
  onStationsChange,
  compteurDebut = 818500,
  compteurFin = 819104,
  productionReelle = 604,
  readOnly = false,
}) => {
  const [activeTab, setActiveTab] = useState<'grid' | 'kpis' | 'presets'>('grid');

  // Cycles
  const cycles = Math.max(0, compteurFin - compteurDebut);
  const kpis = calculateEvaMachineKpis(stations, cycles, productionReelle);

  // Toggle ON/OFF d'une station
  const handleToggleStationActive = (stationNumber: number) => {
    if (readOnly) return;
    const updated = stations.map((s) => {
      if (s.stationNumber !== stationNumber) return s;
      const nextActive = !s.active;
      const next: EvaStationConfig = {
        ...s,
        active: nextActive,
        productionMode: nextActive
          ? s.productionMode === 'inactif'
            ? '1_couleur'
            : s.productionMode
          : 'inactif',
        mould1Active: nextActive ? true : false,
        mould2Active: nextActive ? true : false,
      };
      next.pairsPerCycle = calculateStationPairsPerCycle(next);
      return next;
    });
    onStationsChange(updated);
  };

  // Changement de mode de production de la station (1 couleur / Bicolor / Inactif)
  const handleChangeMode = (stationNumber: number, mode: EvaStationMode) => {
    if (readOnly) return;
    const updated = stations.map((s) => {
      if (s.stationNumber !== stationNumber) return s;
      const isInactive = mode === 'inactif';
      const next: EvaStationConfig = {
        ...s,
        productionMode: mode,
        active: !isInactive,
        mould1Active: !isInactive ? s.mould1Active || true : false,
        mould2Active: !isInactive ? s.mould2Active || true : false,
      };
      next.pairsPerCycle = calculateStationPairsPerCycle(next);
      return next;
    });
    onStationsChange(updated);
  };

  // Toggle Moule 1 ou Moule 2
  const handleToggleMould = (stationNumber: number, mouldKey: 'mould1Active' | 'mould2Active') => {
    if (readOnly) return;
    const updated = stations.map((s) => {
      if (s.stationNumber !== stationNumber) return s;
      const next: EvaStationConfig = {
        ...s,
        [mouldKey]: !s[mouldKey],
      };
      // Si au moins un moule est actif, la station reste active
      const hasActive = next.mould1Active || next.mould2Active;
      if (!hasActive) {
        next.active = false;
        next.productionMode = 'inactif';
      } else if (!next.active) {
        next.active = true;
        if (next.productionMode === 'inactif') next.productionMode = '1_couleur';
      }
      next.pairsPerCycle = calculateStationPairsPerCycle(next);
      return next;
    });
    onStationsChange(updated);
  };

  // Mise à jour d'un champ d'une station (couleurs, pointure, réf moule)
  const handleUpdateField = (stationNumber: number, field: keyof EvaStationConfig, value: any) => {
    if (readOnly) return;
    const updated = stations.map((s) => {
      if (s.stationNumber !== stationNumber) return s;
      const next = { ...s, [field]: value };
      next.pairsPerCycle = calculateStationPairsPerCycle(next);
      return next;
    });
    onStationsChange(updated);
  };

  // Appliquer un préréglage
  const handleApplyPreset = (presetId: string) => {
    if (readOnly) return;
    const preset = EVA_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      const updated = preset.apply(stations);
      onStationsChange(updated);
    }
  };

  // Badge du mode global de la machine
  const getOverallModeBadge = () => {
    switch (kpis.overallMode) {
      case '1_couleur':
        return (
          <span className="px-3 py-1 bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded-full text-xs font-extrabold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            Mode 1 Couleur (Monocolore Standard)
          </span>
        );
      case 'bicolor':
        return (
          <span className="px-3 py-1 bg-purple-500/20 text-purple-300 border border-purple-400/30 rounded-full text-xs font-extrabold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            Mode Bicolor (Semelle + Coque / 2 Injecteurs)
          </span>
        );
      case 'mixte':
        return (
          <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-400/30 rounded-full text-xs font-extrabold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            Mode Mixte (Bicolor + 1 Couleur)
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 bg-slate-700 text-slate-300 border border-slate-600 rounded-full text-xs font-extrabold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            Machine Arrêtée / En Veille
          </span>
        );
    }
  };

  return (
    <div className="bg-slate-900 text-white rounded-2xl p-5 sm:p-6 border border-slate-800 shadow-xl space-y-6">
      {/* Top Title & Machine Architecture Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 text-[11px] font-bold rounded border border-indigo-400/30 uppercase tracking-wider">
              Presse Rotative • {machineCode}
            </span>
            {getOverallModeBadge()}
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <Gauge className="w-6 h-6 text-indigo-400" />
            Architecture 6 Stations • 12 Moules • 2 Injecteurs
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Calcul dynamique strict : <strong>2 paires/moule</strong> en 1 couleur, calcul spécifique{' '}
            <strong className="text-purple-300">semelle + coque</strong> en Bicolor. La formule{' '}
            <span className="line-through text-rose-400">stations × 4</span> est rejetée au profit de
            l'engagement réel des moules actifs.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
          <button
            type="button"
            onClick={() => setActiveTab('grid')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'grid'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Grille 6 Stations
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('presets')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'presets'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Préréglages Ligne
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('kpis')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'kpis'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Gauge className="w-3.5 h-3.5" />
            Compteur &amp; Écart
          </button>
        </div>
      </div>

      {/* KPI DASHBOARD CARDS : 4 Indicateurs Clés Automatiques */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* 1. Capacité Théorique */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
            <span>Capacité Théorique Max</span>
            <Layers className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {THEORETICAL_MAX_PAIRS_PER_CYCLE}{' '}
            <span className="text-xs font-normal text-slate-400">paires/cycle</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            6 st. × 2 moules × 2 paires = 24 p/c
          </div>
        </div>

        {/* 2. Capacité Réellement Engagée */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
            <span>Capacité Réelle Engagée</span>
            <Zap className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            {kpis.engagedCapacityPerCycle}{' '}
            <span className="text-xs font-normal text-slate-400">paires/cycle</span>
          </div>
          <div className="text-[11px] text-emerald-300/80 mt-1">
            {kpis.activeStationsCount} st. ON • {kpis.activeMouldsCount}/12 moules
          </div>
        </div>

        {/* 3. Taux d'Utilisation Machine */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
            <span>Taux d'Utilisation Machine</span>
            <Gauge className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 font-mono">
            {kpis.utilizationRatePercent}%
          </div>
          {/* Progress bar */}
          <div className="w-full bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                kpis.utilizationRatePercent >= 80
                  ? 'bg-emerald-500'
                  : kpis.utilizationRatePercent >= 50
                  ? 'bg-blue-500'
                  : 'bg-amber-500'
              }`}
              style={{ width: `${kpis.utilizationRatePercent}%` }}
            />
          </div>
        </div>

        {/* 4. Production Attendue vs Compteur */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
            <span>Prod. Attendue ({cycles} cyc.)</span>
            <CheckCircle2 className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-purple-300 font-mono">
            {kpis.expectedProductionPairs}{' '}
            <span className="text-xs font-normal text-slate-400">paires</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {kpis.variance !== 0 ? (
              <span className={kpis.variance >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                Écart : {kpis.variance > 0 ? `+${kpis.variance}` : kpis.variance} p.
              </span>
            ) : (
              <span className="text-emerald-400">Compteur 100% aligné</span>
            )}
          </div>
        </div>
      </div>

      {/* TAB 1 : GRILLE DES 6 STATIONS */}
      {activeTab === 'grid' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-400" />
              Configuration Poste par Poste (Stations 1 à 6)
            </h3>
            <span className="text-xs text-slate-400">
              Chaque station possède 2 moules et 2 injecteurs matière dédiés.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stations.map((st) => {
              const isActive = st.active && st.productionMode !== 'inactif';
              const isBicolor = st.productionMode === 'bicolor';

              return (
                <div
                  key={st.stationNumber}
                  className={`rounded-xl p-4 border transition-all ${
                    !isActive
                      ? 'bg-slate-800/40 border-slate-700/60 opacity-80'
                      : isBicolor
                      ? 'bg-slate-800/90 border-purple-500/50 shadow-md ring-1 ring-purple-500/20'
                      : 'bg-slate-800/90 border-blue-500/50 shadow-md ring-1 ring-blue-500/20'
                  }`}
                >
                  {/* Station Card Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-700">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs font-mono ${
                          isActive
                            ? isBicolor
                              ? 'bg-purple-600 text-white'
                              : 'bg-blue-600 text-white'
                            : 'bg-slate-700 text-slate-400'
                        }`}
                      >
                        S{st.stationNumber}
                      </span>
                      <div>
                        <div className="text-xs font-black text-white">
                          Station {st.stationNumber}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {isActive ? (isBicolor ? 'Bicolor' : '1 Couleur') : 'Arrêtée (OFF)'}
                        </div>
                      </div>
                    </div>

                    {/* Toggle ON/OFF */}
                    <button
                      type="button"
                      disabled={readOnly}
                      onClick={() => handleToggleStationActive(st.stationNumber)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                        st.active
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                          : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                      }`}
                      title={st.active ? 'Désactiver cette station' : 'Activer cette station'}
                    >
                      <Power className="w-3.5 h-3.5" />
                      {st.active ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  {/* Mode Selector */}
                  <div className="pt-3 space-y-3">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">
                        Mode de Production
                      </label>
                      <div className="grid grid-cols-3 gap-1 bg-slate-900/90 p-1 rounded-lg border border-slate-700">
                        <button
                          type="button"
                          disabled={readOnly}
                          onClick={() => handleChangeMode(st.stationNumber, '1_couleur')}
                          className={`py-1 text-[11px] font-bold rounded transition ${
                            st.productionMode === '1_couleur' && st.active
                              ? 'bg-blue-600 text-white'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          1 Couleur
                        </button>
                        <button
                          type="button"
                          disabled={readOnly}
                          onClick={() => handleChangeMode(st.stationNumber, 'bicolor')}
                          className={`py-1 text-[11px] font-bold rounded transition ${
                            st.productionMode === 'bicolor' && st.active
                              ? 'bg-purple-600 text-white'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Bicolor
                        </button>
                        <button
                          type="button"
                          disabled={readOnly}
                          onClick={() => handleChangeMode(st.stationNumber, 'inactif')}
                          className={`py-1 text-[11px] font-bold rounded transition ${
                            !st.active || st.productionMode === 'inactif'
                              ? 'bg-slate-700 text-white'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Inactif
                        </button>
                      </div>
                    </div>

                    {/* 2 Moules Toggles */}
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center justify-between">
                        <span>Moules Actifs (2 max / station)</span>
                        <span className="text-slate-300 font-mono">
                          {(st.mould1Active ? 1 : 0) + (st.mould2Active ? 1 : 0)} / 2
                        </span>
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          disabled={readOnly || !st.active}
                          onClick={() => handleToggleMould(st.stationNumber, 'mould1Active')}
                          className={`py-1.5 px-2 rounded-lg border text-xs font-bold transition flex items-center justify-between ${
                            st.mould1Active && st.active
                              ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200'
                              : 'bg-slate-900 border-slate-700 text-slate-500'
                          }`}
                        >
                          <span>Moule 1 (A)</span>
                          <span
                            className={`w-2 h-2 rounded-full ${
                              st.mould1Active && st.active ? 'bg-indigo-400' : 'bg-slate-600'
                            }`}
                          />
                        </button>
                        <button
                          type="button"
                          disabled={readOnly || !st.active}
                          onClick={() => handleToggleMould(st.stationNumber, 'mould2Active')}
                          className={`py-1.5 px-2 rounded-lg border text-xs font-bold transition flex items-center justify-between ${
                            st.mould2Active && st.active
                              ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200'
                              : 'bg-slate-900 border-slate-700 text-slate-500'
                          }`}
                        >
                          <span>Moule 2 (B)</span>
                          <span
                            className={`w-2 h-2 rounded-full ${
                              st.mould2Active && st.active ? 'bg-indigo-400' : 'bg-slate-600'
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {/* 2 Injecteurs Matière */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 mb-0.5 block flex items-center gap-1">
                          <Palette className="w-3 h-3 text-blue-400" />
                          Injecteur 1 (Corps)
                        </label>
                        <select
                          disabled={readOnly || !st.active}
                          value={st.injector1Color}
                          onChange={(e) =>
                            handleUpdateField(st.stationNumber, 'injector1Color', e.target.value)
                          }
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg text-xs py-1 px-2 text-white font-medium focus:ring-1 focus:ring-indigo-500"
                        >
                          {COLOR_OPTIONS.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 mb-0.5 block flex items-center gap-1">
                          <Palette className="w-3 h-3 text-purple-400" />
                          Injecteur 2 ({isBicolor ? 'Semelle' : 'Aux.'})
                        </label>
                        <select
                          disabled={readOnly || !st.active}
                          value={st.injector2Color}
                          onChange={(e) =>
                            handleUpdateField(st.stationNumber, 'injector2Color', e.target.value)
                          }
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg text-xs py-1 px-2 text-white font-medium focus:ring-1 focus:ring-indigo-500"
                        >
                          {COLOR_OPTIONS.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Pointure & Réf Moule */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 mb-0.5 block">
                          Pointure
                        </label>
                        <input
                          type="text"
                          disabled={readOnly || !st.active}
                          value={st.pointure}
                          onChange={(e) =>
                            handleUpdateField(st.stationNumber, 'pointure', e.target.value)
                          }
                          placeholder="Ex: 40-44"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg text-xs py-1 px-2 text-white font-mono focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 mb-0.5 block">
                          Réf. Moule
                        </label>
                        <input
                          type="text"
                          disabled={readOnly || !st.active}
                          value={st.mouldReference}
                          onChange={(e) =>
                            handleUpdateField(st.stationNumber, 'mouldReference', e.target.value)
                          }
                          placeholder="Ex: M-NM-01"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg text-xs py-1 px-2 text-white font-mono focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    {/* Dynamic Station Output Badge */}
                    <div
                      className={`p-2.5 rounded-lg text-xs flex items-center justify-between ${
                        !st.active || st.pairsPerCycle === 0
                          ? 'bg-slate-900/60 text-slate-500'
                          : isBicolor
                          ? 'bg-purple-950/60 border border-purple-800/60 text-purple-200'
                          : 'bg-blue-950/60 border border-blue-800/60 text-blue-200'
                      }`}
                    >
                      <div className="font-mono font-black text-sm">
                        {st.pairsPerCycle} paires / cycle
                      </div>
                      <div className="text-[10px]">
                        {!st.active
                          ? 'Station éteinte'
                          : isBicolor
                          ? 'Semelle + Coque (Bicolor)'
                          : '1 Couleur (2 p/moule)'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2 : PRÉRÉGLAGES INDUSTRIELS RAPIDES */}
      {activeTab === 'presets' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Préréglages d'Usine Disponibles (1 Clic)
            </h3>
            <span className="text-xs text-slate-400">
              Configure automatiquement les 6 stations selon le programme de fabrication.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {EVA_PRESETS.map((preset) => (
              <div
                key={preset.id}
                className="bg-slate-800/90 border border-slate-700 rounded-xl p-4 flex flex-col justify-between space-y-3 hover:border-indigo-500 transition"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <h4 className="text-sm font-black text-white">{preset.name}</h4>
                    <span
                      className={`px-2.5 py-0.5 text-white text-[11px] font-bold rounded-full ${preset.color}`}
                    >
                      {preset.badge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">{preset.description}</p>
                </div>

                <button
                  type="button"
                  disabled={readOnly}
                  onClick={() => handleApplyPreset(preset.id)}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Appliquer cette configuration
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3 : SIMULATEUR COMPTEUR & ANALYSE DE COHÉRENCE */}
      {activeTab === 'kpis' && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-800/90 border border-slate-700 rounded-xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Gauge className="w-4 h-4 text-indigo-400" />
              Analyse de Cohérence Compteur vs Stations Réellement Actives
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                <span className="text-slate-400 block mb-1">Nombre de Cycles Réalisés</span>
                <span className="text-lg font-bold font-mono text-white">
                  {cycles} cycles
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  ({compteurFin} - {compteurDebut})
                </span>
              </div>

              <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                <span className="text-slate-400 block mb-1">Production Attendue (Engagée)</span>
                <span className="text-lg font-bold font-mono text-emerald-400">
                  {kpis.expectedProductionPairs} paires
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  {cycles} cycles × {kpis.engagedCapacityPerCycle} p/c
                </span>
              </div>

              <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                <span className="text-slate-400 block mb-1">Production Réalisée Saisie</span>
                <span className="text-lg font-bold font-mono text-indigo-300">
                  {productionReelle} paires
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Écart : {kpis.variance} paires
                </span>
              </div>
            </div>

            {/* Alerte cohérence */}
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-start gap-3 ${
                kpis.isConsistent
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
              }`}
            >
              {kpis.isConsistent ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <div className="font-bold">
                  {kpis.isConsistent
                    ? 'Compteur Cohérent avec les Stations et Moules Actifs'
                    : 'Alerte de Dérive / Écart de Production Détecté'}
                </div>
                <div className="text-[11px] opacity-90">{kpis.explanation}</div>
                {!kpis.isConsistent && (
                  <div className="text-[11px] font-mono text-rose-300 mt-1">
                    Écart constaté de {Math.abs(kpis.variance)} paires (
                    {kpis.variancePercent > 0 ? `+${kpis.variancePercent}%` : `${kpis.variancePercent}%`}
                    ). Vérifiez les arrêts de station ou purges d'injecteurs non déclarées.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
