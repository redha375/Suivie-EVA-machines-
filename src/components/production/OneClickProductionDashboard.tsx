import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  TrendingUp,
  Layers,
  Boxes,
  AlertTriangle,
  Award,
  FlaskConical,
  Clock,
  RotateCw,
  Filter,
  CheckCircle2,
  Calendar,
  Users,
  Cpu,
  Package,
} from 'lucide-react';
import { ShiftType } from '../../types';

export const OneClickProductionDashboard: React.FC = () => {
  const { productionEntries, machines, shoeModels, modelMaster } = useApp();

  // Filter States
  const todayStr = new Date().toISOString().substring(0, 10);
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().substring(0, 10);

  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'week' | 'all'>('today');
  const [shiftFilter, setShiftFilter] = useState<string>('all');
  const [machineFilter, setMachineFilter] = useState<string>('all');
  const [modelFilter, setModelFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');

  // Filtered Production Entries
  const filteredEntries = useMemo(() => {
    return productionEntries.filter((entry) => {
      // Date filter
      if (dateFilter === 'today' && entry.date !== todayStr) return false;
      if (dateFilter === 'yesterday' && entry.date !== yesterdayStr) return false;
      if (dateFilter === 'week') {
        const entryDate = new Date(entry.date).getTime();
        const sevenDaysAgo = Date.now() - 7 * 86400000;
        if (entryDate < sevenDaysAgo) return false;
      }

      // Shift filter
      if (shiftFilter !== 'all' && entry.shift !== shiftFilter) return false;

      // Machine filter
      if (machineFilter !== 'all') {
        const mach = machines.find((m) => m.id === entry.machineId);
        if (entry.machineId !== machineFilter && mach?.code !== machineFilter && entry.machineCode !== machineFilter) {
          return false;
        }
      }

      // Model filter
      if (modelFilter !== 'all' && entry.modelName !== modelFilter) return false;

      // Platform filter
      if (platformFilter !== 'all' && String(entry.platformNumber) !== platformFilter) return false;

      return true;
    });
  }, [productionEntries, dateFilter, shiftFilter, machineFilter, modelFilter, platformFilter, todayStr, yesterdayStr, machines]);

  // Aggregated KPIs
  const stats = useMemo(() => {
    let totalProduced = 0;
    let totalConforming = 0;
    let totalRejected = 0;
    let totalSecondChoice = 0;
    let totalCartons = 0;
    let totalMaterialKg = 0;
    let totalBags = 0;
    let totalDowntimeMinutes = 0;
    let downtimeIncidents = 0;
    let totalCycles = 0;

    const machineMap: Record<string, { produced: number; conforming: number; rejected: number; name: string }> = {};
    const shiftMap: Record<string, number> = { matin: 0, soir: 0, nuit: 0 };
    const platformMap: Record<number, number> = {};
    const materialColorMap: Record<string, number> = {};

    filteredEntries.forEach((entry) => {
      totalProduced += entry.qtyProduced || 0;
      totalConforming += entry.qtyConforming || 0;
      totalRejected += entry.qtyRejected || 0;
      totalSecondChoice += entry.secondChoicePairs || 0;
      totalCartons += entry.cartonsCount || entry.packagingCartonsCount || entry.completeCartons || 0;
      totalMaterialKg += entry.materialConsumedKg || 0;
      totalBags += entry.bags25kgConsumed || 0;
      totalCycles += entry.cycles || 0;

      if (entry.downtimeMinutes && entry.downtimeMinutes > 0) {
        totalDowntimeMinutes += entry.downtimeMinutes;
        downtimeIncidents += 1;
      }

      // Machine breakdown
      const mCode = entry.machineCode || machines.find((m) => m.id === entry.machineId)?.code || entry.machineId;
      if (!machineMap[mCode]) {
        machineMap[mCode] = { produced: 0, conforming: 0, rejected: 0, name: mCode };
      }
      machineMap[mCode].produced += entry.qtyProduced || 0;
      machineMap[mCode].conforming += entry.qtyConforming || 0;
      machineMap[mCode].rejected += entry.qtyRejected || 0;

      // Shift breakdown
      if (entry.shift) {
        shiftMap[entry.shift] = (shiftMap[entry.shift] || 0) + (entry.qtyProduced || 0);
      }

      // Platform breakdown
      if (entry.platformNumber) {
        platformMap[entry.platformNumber] = (platformMap[entry.platformNumber] || 0) + (entry.qtyProduced || 0);
      }

      // Material & color breakdown
      const matKey = `${entry.material || entry.rawMaterialType || 'EVA'} - ${entry.color1 || 'Standard'}`;
      materialColorMap[matKey] = (materialColorMap[matKey] || 0) + (entry.materialConsumedKg || 0);
    });

    const scrapRate = totalProduced > 0 ? (totalRejected / totalProduced) * 100 : 0;
    const secondChoiceRate = totalProduced > 0 ? (totalSecondChoice / totalProduced) * 100 : 0;
    const conformingRate = totalProduced > 0 ? (totalConforming / totalProduced) * 100 : 0;

    return {
      totalProduced,
      totalConforming,
      totalRejected,
      totalSecondChoice,
      totalCartons,
      totalMaterialKg: Number(totalMaterialKg.toFixed(1)),
      totalBags: Number(totalBags.toFixed(2)),
      totalDowntimeMinutes,
      downtimeIncidents,
      totalCycles,
      scrapRate: Number(scrapRate.toFixed(1)),
      secondChoiceRate: Number(secondChoiceRate.toFixed(1)),
      conformingRate: Number(conformingRate.toFixed(1)),
      machineMap,
      shiftMap,
      platformMap,
      materialColorMap,
    };
  }, [filteredEntries, machines]);

  // Unique model names from ModelMaster or shoeModels
  const modelOptions = useMemo(() => {
    const set = new Set<string>();
    shoeModels.forEach((m) => set.add(m.name));
    modelMaster.forEach((m) => set.add(m.model_name));
    return Array.from(set).sort();
  }, [shoeModels, modelMaster]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* FILTER BAR - Mobile First responsive layout */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5 text-blue-600" />
            <span>Filtres de Production en Temps Réel</span>
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            {filteredEntries.length} lot(s) trouvé(s)
          </span>
        </div>

        {/* Quick Date Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-slate-400" /> Période :
          </span>
          {[
            { id: 'today', label: "Aujourd'hui" },
            { id: 'yesterday', label: 'Hier' },
            { id: 'week', label: '7 derniers jours' },
            { id: 'all', label: 'Tout' },
          ].map((d) => (
            <button
              key={d.id}
              onClick={() => setDateFilter(d.id as any)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                dateFilter === d.id
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>

        {/* Dropdown Selectors Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          {/* Équipe */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
              Équipe (Shift)
            </label>
            <select
              value={shiftFilter}
              onChange={(e) => setShiftFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-medium text-slate-800 focus:bg-white focus:border-blue-500"
            >
              <option value="all">Toutes les équipes</option>
              <option value="matin">Matin (06h - 14h)</option>
              <option value="soir">Soir (14h - 22h)</option>
              <option value="nuit">Nuit (22h - 06h)</option>
            </select>
          </div>

          {/* Machine */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
              Machine (EVA 1/2/3)
            </label>
            <select
              value={machineFilter}
              onChange={(e) => setMachineFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-medium text-slate-800 focus:bg-white focus:border-blue-500"
            >
              <option value="all">Toutes les machines</option>
              <option value="EVA 1">EVA 1</option>
              <option value="EVA 2">EVA 2</option>
              <option value="EVA 3">EVA 3</option>
              {machines
                .filter((m) => !['EVA 1', 'EVA 2', 'EVA 3'].includes(m.code))
                .map((m) => (
                  <option key={m.id} value={m.code}>
                    {m.code}
                  </option>
                ))}
            </select>
          </div>

          {/* Modèle */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
              Modèle
            </label>
            <select
              value={modelFilter}
              onChange={(e) => setModelFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-medium text-slate-800 focus:bg-white focus:border-blue-500"
            >
              <option value="all">Tous les modèles</option>
              {modelOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Plateforme */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
              Plateforme (P1 - P12)
            </label>
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-medium text-slate-800 focus:bg-white focus:border-blue-500"
            >
              <option value="all">Toutes (1 à 12)</option>
              {Array.from({ length: 12 }).map((_, i) => (
                <option key={i + 1} value={String(i + 1)}>
                  Plateforme {i + 1} (P{i + 1})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* CORE KPI SUMMARY TILES */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Produced */}
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-slate-500">Production Totale</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono tracking-tight">
            {stats.totalProduced.toLocaleString()}
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100">
            <span>Conformes : <strong className="text-emerald-700">{stats.totalConforming}</strong></span>
            <span className="font-semibold text-emerald-600">{stats.conformingRate}%</span>
          </div>
        </div>

        {/* Cartons conditionnés */}
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-slate-500">Cartons Conditionnés</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-indigo-950 font-mono tracking-tight">
            {stats.totalCartons.toLocaleString()}
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100">
            <span>Cycles injectés :</span>
            <strong className="font-mono text-slate-800">{stats.totalCycles}</strong>
          </div>
        </div>

        {/* Rebuts & 2ème qualité */}
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-slate-500">Rebuts &amp; 2ème Qualité</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black text-rose-600 font-mono">
              {stats.totalRejected}
            </span>
            <span className="text-xs font-semibold text-amber-700">
              + {stats.totalSecondChoice} (2e Q)
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100">
            <span>Taux rebut : <strong className="text-rose-600">{stats.scrapRate}%</strong></span>
            <span>2e Q : <strong className="text-amber-700">{stats.secondChoiceRate}%</strong></span>
          </div>
        </div>

        {/* Matière Consommée & Pannes */}
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-slate-500">Matière &amp; Arrêts</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FlaskConical className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900 font-mono">
            {stats.totalMaterialKg} kg
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100">
            <span>{stats.totalBags} sacs (25kg)</span>
            <span className="text-rose-600 font-semibold">
              <Clock className="w-3 h-3 inline mr-0.5" />
              {stats.totalDowntimeMinutes} min arrêts
            </span>
          </div>
        </div>
      </div>

      {/* DETAILED PRODUCTION GRIDS: Machine / Équipe / Plateforme */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Par Machine */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-blue-600" />
              Production par Machine
            </span>
            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
              EVA 1/2/3
            </span>
          </div>
          <div className="space-y-2.5">
            {['EVA 1', 'EVA 2', 'EVA 3'].map((code) => {
              const data = stats.machineMap[code] || { produced: 0, conforming: 0, rejected: 0, name: code };
              const allProduced = Object.values(stats.machineMap).map((m) => (m as { produced: number }).produced);
              const maxProduced = Math.max(1, ...allProduced, 100);
              const pct = Math.min(100, Math.round((data.produced / maxProduced) * 100));

              return (
                <div key={code} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 font-mono">{code}</span>
                    <span className="font-mono text-slate-900 font-semibold">
                      {data.produced} paires
                      {data.rejected > 0 && (
                        <span className="text-rose-600 text-[10px] ml-1">(-{data.rejected})</span>
                      )}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Par Équipe */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-600" />
              Répartition par Équipe
            </span>
            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
              3 Postes
            </span>
          </div>
          <div className="space-y-2.5">
            {[
              { key: 'matin', label: 'Équipe Matin (06h - 14h)', color: 'bg-amber-500' },
              { key: 'soir', label: 'Équipe Soir (14h - 22h)', color: 'bg-blue-600' },
              { key: 'nuit', label: 'Équipe Nuit (22h - 06h)', color: 'bg-indigo-600' },
            ].map((shift) => {
              const count = stats.shiftMap[shift.key] || 0;
              const pct = stats.totalProduced > 0 ? Math.round((count / stats.totalProduced) * 100) : 0;

              return (
                <div key={shift.key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700">{shift.label}</span>
                    <span className="font-mono font-bold text-slate-900">
                      {count} p. <span className="text-slate-400 font-normal">({pct}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`${shift.color} h-full rounded-full transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Consommation Matières & Pannes */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <FlaskConical className="w-3.5 h-3.5 text-emerald-600" />
              Matières &amp; Incidents
            </span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
              Conso. Réelle
            </span>
          </div>
          <div className="space-y-2 text-xs">
            {Object.keys(stats.materialColorMap).length === 0 ? (
              <p className="text-slate-400 italic py-2 text-center text-[11px]">
                Aucune consommation sur cette période.
              </p>
            ) : (
              (Object.entries(stats.materialColorMap) as [string, number][]).map(([key, kg]) => (
                <div key={key} className="flex items-center justify-between p-1.5 rounded bg-slate-50">
                  <span className="font-medium text-slate-700 truncate max-w-[170px]">{key}</span>
                  <span className="font-mono font-bold text-slate-900">
                    {kg.toFixed(1)} kg <span className="text-slate-400 text-[10px]">({(kg / 25).toFixed(1)} sacs)</span>
                  </span>
                </div>
              ))
            )}

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Arrêts déclarés :</span>
              <span className="font-mono font-bold text-rose-600">
                {stats.downtimeIncidents} arrêt(s) — {stats.totalDowntimeMinutes} min
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 12 PLATFORMS ACTIVITY HEATMAP */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-slate-900">
              Activité des 12 Plateformes (P01 à P12)
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            Règle : Max 2 paires / cycle par plateforme
          </span>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-2">
          {Array.from({ length: 12 }).map((_, i) => {
            const pNum = i + 1;
            const count = stats.platformMap[pNum] || 0;
            const hasActivity = count > 0;

            return (
              <div
                key={pNum}
                className={`p-2.5 rounded-xl border text-center transition ${
                  hasActivity
                    ? 'bg-blue-50/70 border-blue-200 text-blue-900 shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}
              >
                <div className="text-[11px] font-bold font-mono">
                  P{pNum < 10 ? `0${pNum}` : pNum}
                </div>
                <div className="text-sm font-black font-mono mt-1">
                  {count}
                </div>
                <div className="text-[9px] font-medium text-slate-500">
                  {count > 0 ? `${count} p.` : 'Inactif'}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
