import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ProductionChartsWidget } from './dashboard/ProductionChartsWidget';
import {
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Boxes,
  Zap,
  Camera,
  Wrench,
  ShieldAlert,
  ArrowUpRight,
  Activity,
  Gauge,
  Thermometer,
  Layers,
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const {
    t,
    productionEntries,
    machines,
    dailyTargetPairs,
    setActiveTab,
    packagingCartons,
    stockSoumelle,
  } = useApp();

  const [timeframe, setTimeframe] = useState<'today' | 'week' | 'month'>('today');

  // Filter entries based on timeframe
  const filteredEntries = productionEntries.filter((entry) => {
    if (timeframe === 'today') return entry.date === '2026-09-06';
    return true; // includes all simulated recent entries
  });

  // Calculate Aggregated Metrics
  const totalProduced = filteredEntries.reduce((sum, e) => sum + e.qtyProduced, 0);
  const totalConforming = filteredEntries.reduce((sum, e) => sum + e.qtyConforming, 0);
  const totalRejected = filteredEntries.reduce((sum, e) => sum + e.qtyRejected, 0);
  const totalDowntimeMin = filteredEntries.reduce((sum, e) => sum + e.downtimeMinutes, 0);
  const totalBags = filteredEntries.reduce((sum, e) => sum + e.bags25kgConsumed, 0);
  const totalKg = filteredEntries.reduce((sum, e) => sum + e.materialConsumedKg, 0);

  const scrapRate = totalProduced > 0 ? ((totalRejected / totalProduced) * 100).toFixed(2) : '0.00';
  const yieldRate = totalProduced > 0 ? ((totalConforming / totalProduced) * 100).toFixed(1) : '100.0';
  const targetProgress = Math.min(100, Math.round((totalProduced / dailyTargetPairs) * 100));

  // Shift breakdown
  const shiftMatinPairs = filteredEntries.filter((e) => e.shift === 'matin').reduce((s, e) => s + e.qtyProduced, 0);
  const shiftSoirPairs = filteredEntries.filter((e) => e.shift === 'soir').reduce((s, e) => s + e.qtyProduced, 0);
  const shiftNuitPairs = filteredEntries.filter((e) => e.shift === 'nuit').reduce((s, e) => s + e.qtyProduced, 0);

  // Machine breakdown
  const machinePairs: Record<string, number> = {};
  filteredEntries.forEach((e) => {
    machinePairs[e.machineId] = (machinePairs[e.machineId] || 0) + e.qtyProduced;
  });

  // Multi-material breakdown
  const evaPairs = filteredEntries.filter((e) => e.material === 'EVA' || !e.material).reduce((s, e) => s + e.qtyProduced, 0);
  const soumellePairs = filteredEntries.filter((e) => e.material === 'SOUMELLE').reduce((s, e) => s + e.qtyProduced, 0);
  const pvcPairs = filteredEntries.filter((e) => e.material === 'PVC').reduce((s, e) => s + e.qtyProduced, 0);
  const totalCartons = packagingCartons.reduce((s, c) => s + c.cartonsCount, 0);
  const totalSoumelleStock = stockSoumelle.reduce((s, it) => s + it.quantityPairs, 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner with Quick Actions & Timeframe selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Activity className="w-6 h-6 text-blue-600" />
            {t('navDashboard')}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Supervision temps réel des ateliers d'injection EVA 1, EVA 2 & EVA 3.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="bg-slate-100 p-1 rounded-lg border border-slate-200 flex text-xs">
            <button
              onClick={() => setTimeframe('today')}
              className={`px-3 py-1.5 rounded-md transition font-medium ${
                timeframe === 'today' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Aujourd'hui
            </button>
            <button
              onClick={() => setTimeframe('week')}
              className={`px-3 py-1.5 rounded-md transition font-medium ${
                timeframe === 'week' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semaine
            </button>
            <button
              onClick={() => setTimeframe('month')}
              className={`px-3 py-1.5 rounded-md transition font-medium ${
                timeframe === 'month' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mois
            </button>
          </div>

          <button
            onClick={() => setActiveTab('fast_entry')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
          >
            <Zap className="w-4 h-4 text-amber-300" />
            <span>Saisie Rapide</span>
          </button>

          <button
            onClick={() => setActiveTab('counter_scanner')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg border border-slate-200 transition"
          >
            <Camera className="w-4 h-4 text-blue-600" />
            <span>Scan IA</span>
          </button>
        </div>
      </div>

      {/* Target Progress Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5">
            <Gauge className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-semibold text-slate-800">Progression de l'objectif de production</span>
            <span className="text-xs text-slate-500 font-mono">
              ({totalProduced.toLocaleString()} / {dailyTargetPairs.toLocaleString()} paires)
            </span>
          </div>
          <span className="text-sm font-extrabold text-blue-600 font-mono">{targetProgress}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${Math.min(100, targetProgress)}%` }}
          />
        </div>
      </div>

      {/* Core KPI Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Produced */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Production Totale</span>
            <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 font-mono mt-2">
            {totalProduced.toLocaleString()}
          </div>
          <div className="text-xs text-emerald-600 mt-1 flex items-center gap-0.5 font-medium">
            <ArrowUpRight className="w-3 h-3" /> +12% <span className="text-slate-400 ml-0.5">vs hier</span>
          </div>
        </div>

        {/* Conforming Pairs */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>{t('conforming')}</span>
            <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-emerald-600 font-mono mt-2">
            {totalConforming.toLocaleString()}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Rendement: <span className="text-slate-800 font-semibold">{yieldRate}%</span>
          </div>
        </div>

        {/* Rejection / Scrap */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>{t('rejected')} (Rebuts)</span>
            <span className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-rose-600 font-mono mt-2">
            {totalRejected.toLocaleString()}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Taux:{' '}
            <span className={`font-semibold ${Number(scrapRate) > 2.5 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {scrapRate}%
            </span>
          </div>
        </div>

        {/* Downtime */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Arrêts Machine</span>
            <span className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-amber-600 font-mono mt-2">
            {totalDowntimeMin} <span className="text-xs font-normal text-slate-400">min</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Disponibilité: <span className="text-slate-800 font-semibold">96.2%</span>
          </div>
        </div>

        {/* Bags of 25kg Consumed */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Sacs de 25 kg</span>
            <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <Boxes className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-indigo-600 font-mono mt-2">
            {totalBags.toFixed(1)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Total: <span className="text-slate-800 font-semibold">{totalKg.toFixed(0)} kg</span>
          </div>
        </div>

        {/* Specific Consumption */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Ratio Matière</span>
            <span className="p-1.5 bg-cyan-50 text-cyan-600 rounded-lg">
              <Layers className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-cyan-600 font-mono mt-2">
            {totalProduced > 0 ? ((totalKg / totalProduced) * 1000).toFixed(0) : '280'}{' '}
            <span className="text-xs font-normal text-slate-400">g/paire</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Toléré: <span className="text-slate-800 font-semibold">270-300g</span>
          </div>
        </div>
      </div>

      {/* Multi-Material Production Architecture Status Widget */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              Pilotage Multi-Matières • Statut des Workflows (EVA • SOUMELLE • PVC)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Règles et circuits de conditionnement paramétrables et strictement autonomes
            </p>
          </div>
          <button
            onClick={() => setActiveTab('production')}
            className="text-xs text-indigo-600 font-semibold hover:underline flex items-center gap-1 self-start sm:self-auto"
          >
            <span>Accéder aux Workflows Dédiés</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* PVC Card */}
          <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-300">
                  PVC
                </span>
                <span className="text-[11px] text-blue-700 font-semibold">Conditionnement Cartons</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 mt-2">Injection PVC &amp; Cartons</h3>
              <p className="text-xs text-slate-600 mt-1">
                Calcul automatique selon la configuration modèle (paires/carton) et traçabilité des lots conformes.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-blue-200 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-500 block text-[10px]">Produit :</span>
                <span className="font-mono font-bold text-blue-900">{pvcPairs} paires</span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block text-[10px]">Conditionné :</span>
                <span className="font-mono font-black text-blue-700">{totalCartons} cartons</span>
              </div>
            </div>
          </div>

          {/* Soumelle Card */}
          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                  SOUMELLE
                </span>
                <span className="text-[11px] text-amber-800 font-semibold">Pointures 18 à 45</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 mt-2">Semelles Directes</h3>
              <p className="text-xs text-slate-600 mt-1">
                Enregistrement par pointure individuelle sans mise en carton. Alimentation directe des bacs.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-amber-200 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-500 block text-[10px]">Produit :</span>
                <span className="font-mono font-bold text-amber-950">{soumellePairs} paires</span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block text-[10px]">Stock Actuel :</span>
                <span className="font-mono font-black text-amber-800">{totalSoumelleStock.toLocaleString()} paires</span>
              </div>
            </div>
          </div>

          {/* EVA Card */}
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                  EVA
                </span>
                <span className="text-[11px] text-emerald-800 font-semibold">Découplé &amp; Autonome</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 mt-2">Presses Rotatives EVA</h3>
              <p className="text-xs text-slate-600 mt-1">
                Machines dédiées EVA 1-3. Logique isolée prête pour injection de paramètres spécifiques.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-emerald-200 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-500 block text-[10px]">Produit :</span>
                <span className="font-mono font-bold text-emerald-950">{evaPairs} paires</span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block text-[10px]">Parc Machine :</span>
                <span className="font-mono font-black text-emerald-700">3 rotatives</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recharts Data Visualization: Production Volume by Model & Team */}
      <ProductionChartsWidget timeframe={timeframe} />

      {/* Machine Status Cards (EVA 1, EVA 2, EVA 3) */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-blue-600" />
            Statut & Télémétrie des Presses à Injecter
          </h2>
          <button
            onClick={() => setActiveTab('production')}
            className="text-xs text-blue-600 font-semibold hover:underline"
          >
            Voir détails plateforme (1 à 10) →
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {machines.map((machine) => {
            const pairsForThisMachine = machinePairs[machine.id] || 0;
            const statusConfig = {
              running: {
                label: 'En Production',
                color: 'bg-green-100 text-green-700 border-green-200',
                dot: 'bg-green-600',
              },
              idle: {
                label: 'En Attente',
                color: 'bg-amber-100 text-amber-700 border-amber-200',
                dot: 'bg-amber-600',
              },
              maintenance: {
                label: 'Maintenance / Arrêt',
                color: 'bg-rose-100 text-rose-700 border-rose-200',
                dot: 'bg-rose-600',
              },
              breakdown: {
                label: 'Panne Déclarée',
                color: 'bg-red-600 text-white border-red-600',
                dot: 'bg-white',
              },
            }[machine.status];

            return (
              <div
                key={machine.id}
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center font-bold text-blue-700 text-xs font-mono">
                      {machine.code}
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{machine.name}</h3>
                      <p className="text-[11px] text-slate-500">
                        {machine.platformsCount} plateformes • 2 moules • 4 paires
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1.5 ${statusConfig.color}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot} animate-pulse`} />
                    {statusConfig.label}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 py-3 border-t border-b border-slate-100 my-3 text-center">
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-medium">Buse Chauffe</span>
                    <span className="text-xs font-bold text-slate-800 font-mono">
                      {machine.temperatureNozzle || 175}°C
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-medium">Moule</span>
                    <span className="text-xs font-bold text-slate-800 font-mono">
                      {machine.temperatureMold || 168}°C
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-medium">Pression</span>
                    <span className="text-xs font-bold text-slate-800 font-mono">
                      {machine.hydraulicPressure || 140} Bar
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs mt-3">
                  <span className="text-slate-500 font-medium">Compteur machine:</span>
                  <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-100">
                    {machine.lastCounterValue.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs mt-2 text-slate-500">
                  <span>Produit aujourd'hui:</span>
                  <span className="font-semibold text-slate-900">{pairsForThisMachine} paires</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Production by Shift and Quality Diagnostics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Shifts Comparison */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            Répartition par Équipe / Poste
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1.5 font-medium">
                <span className="text-slate-700">Équipe Matin (06h - 14h)</span>
                <span className="font-mono font-bold text-amber-600">{shiftMatinPairs} paires</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-amber-500 h-2.5 rounded-full"
                  style={{ width: `${totalProduced > 0 ? (shiftMatinPairs / totalProduced) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5 font-medium">
                <span className="text-slate-700">Équipe Soir (14h - 22h)</span>
                <span className="font-mono font-bold text-blue-600">{shiftSoirPairs} paires</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-blue-600 h-2.5 rounded-full"
                  style={{ width: `${totalProduced > 0 ? (shiftSoirPairs / totalProduced) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5 font-medium">
                <span className="text-slate-700">Équipe Nuit (22h - 06h)</span>
                <span className="font-mono font-bold text-indigo-600">{shiftNuitPairs} paires</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-indigo-600 h-2.5 rounded-full"
                  style={{ width: `${totalProduced > 0 ? (shiftNuitPairs / totalProduced) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Quality Defect Breakdown */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              Motifs Principaux des Rebuts
            </h3>
            <button
              onClick={() => setActiveTab('quality')}
              className="text-xs text-blue-600 font-semibold hover:underline"
            >
              Auditer →
            </button>
          </div>

          <div className="space-y-3">
            {[
              { reason: "Bavures d'injection (serrage/moule)", count: 7, pct: 50 },
              { reason: "Bulles d'air / porosité matière", count: 4, pct: 28 },
              { reason: 'Manque matière / remplissage', count: 2, pct: 14 },
              { reason: 'Déformation thermique', count: 1, pct: 8 },
            ].map((def, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-xs bg-slate-50 p-3 rounded-lg border border-slate-100"
              >
                <span className="text-slate-700 font-medium">{def.reason}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-rose-600">{def.count} paires</span>
                  <span className="text-[10px] text-slate-400">({def.pct}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
