import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ReferenceLine,
} from 'recharts';
import { useApp } from '../../context/AppContext';
import { ProductionEntry } from '../../types';
import {
  BarChart3,
  PieChart as PieIcon,
  Users,
  Layers,
  Sparkles,
  TrendingUp,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Boxes,
  Zap,
} from 'lucide-react';

interface ProductionChartsWidgetProps {
  timeframe: 'today' | 'week' | 'month';
}

// Sophisticated industrial color palette (WCAG compliant, high contrast)
const MODEL_COLORS = [
  '#2563EB', // Blue 600 - Sabot Médical
  '#0284C7', // Sky 600 - Claquette Wave
  '#059669', // Emerald 600 - Sandale Plage
  '#D97706', // Amber 600 - Mule Relax
  '#6366F1', // Indigo 500 - Chaussure Travail PVC
  '#7C3AED', // Violet 600 - Autres
];

const TEAM_COLORS = {
  'team-matin-a': '#2563EB', // Blue
  'team-matin-b': '#0284C7', // Sky
  'team-soir': '#D97706',    // Amber
  'team-nuit': '#4F46E5',    // Indigo
};

export const ProductionChartsWidget: React.FC<ProductionChartsWidgetProps> = ({ timeframe }) => {
  const { productionEntries, machines, teams, shoeModels } = useApp();

  const [selectedMachineFilter, setSelectedMachineFilter] = useState<string>('all');
  const [modelViewType, setModelViewType] = useState<'bars' | 'distribution'>('bars');

  // Filter entries based on timeframe & machine
  const activeEntries = useMemo(() => {
    return productionEntries.filter((entry) => {
      // Timeframe filter
      if (timeframe === 'today' && entry.date !== '2026-09-06') {
        return false;
      }
      // Machine filter
      if (selectedMachineFilter !== 'all' && entry.machineId !== selectedMachineFilter) {
        return false;
      }
      return true;
    });
  }, [productionEntries, timeframe, selectedMachineFilter]);

  // Helper to map an entry to a specific industrial team
  const getEntryTeam = (entry: ProductionEntry) => {
    if (entry.shift === 'soir') return 'team-soir';
    if (entry.shift === 'nuit') return 'team-nuit';
    // Shift 'matin'
    if (entry.machineId === 'mach-eva-3') return 'team-matin-b';
    return 'team-matin-a';
  };

  // -------------------------------------------------------------
  // 1. DATA AGGREGATION: VOLUME BY SHOE MODEL
  // -------------------------------------------------------------
  const modelChartData = useMemo(() => {
    const map: Record<
      string,
      {
        modelName: string;
        shortName: string;
        totalProduced: number;
        conforming: number;
        rejected: number;
        material: string;
        entriesCount: number;
      }
    > = {};

    activeEntries.forEach((entry) => {
      const name = entry.modelName || 'Modèle standard';
      if (!map[name]) {
        // Short label for chart readability
        const shortName = name
          .replace('CTP ', '')
          .replace('Pro Light', '')
          .replace('2-Tone', '')
          .trim();

        map[name] = {
          modelName: name,
          shortName,
          totalProduced: 0,
          conforming: 0,
          rejected: 0,
          material: entry.rawMaterialType || 'EVA',
          entriesCount: 0,
        };
      }
      map[name].totalProduced += entry.qtyProduced;
      map[name].conforming += entry.qtyConforming;
      map[name].rejected += entry.qtyRejected;
      map[name].entriesCount += 1;
    });

    const list = Object.values(map).sort((a, b) => b.totalProduced - a.totalProduced);
    const totalAll = list.reduce((sum, item) => sum + item.totalProduced, 0);

    return list.map((item, index) => ({
      ...item,
      percentage: totalAll > 0 ? Number(((item.totalProduced / totalAll) * 100).toFixed(1)) : 0,
      scrapRate: item.totalProduced > 0 ? Number(((item.rejected / item.totalProduced) * 100).toFixed(2)) : 0,
      yieldRate: item.totalProduced > 0 ? Number(((item.conforming / item.totalProduced) * 100).toFixed(1)) : 100,
      color: MODEL_COLORS[index % MODEL_COLORS.length],
    }));
  }, [activeEntries]);

  // -------------------------------------------------------------
  // 2. DATA AGGREGATION: VOLUME BY INDUSTRIAL TEAM
  // -------------------------------------------------------------
  const teamChartData = useMemo(() => {
    const teamConfigs = [
      {
        id: 'team-matin-a',
        code: 'EQ-MAT-A',
        name: 'Équipe A (Matin)',
        shiftLabel: 'Matin (06h - 14h)',
        machines: 'EVA 1 & EVA 2',
        leader: 'Youcef Belkacem',
        members: 8,
        color: '#2563EB',
      },
      {
        id: 'team-matin-b',
        code: 'EQ-MAT-B',
        name: 'Équipe B (Matin)',
        shiftLabel: 'Matin (06h - 14h)',
        machines: 'EVA 3 & TPR',
        leader: 'Nabil Mansour',
        members: 6,
        color: '#0284C7',
      },
      {
        id: 'team-soir',
        code: 'EQ-SOIR-1',
        name: 'Équipe Soir',
        shiftLabel: 'Soir (14h - 22h)',
        machines: 'Toutes Lignes',
        leader: 'Farid Kaci',
        members: 7,
        color: '#D97706',
      },
      {
        id: 'team-nuit',
        code: 'EQ-NUIT-1',
        name: 'Équipe Nuit',
        shiftLabel: 'Nuit (22h - 06h)',
        machines: 'Cadence Continue',
        leader: 'Malik Bouzid',
        members: 5,
        color: '#4F46E5',
      },
    ];

    const totalAll = activeEntries.reduce((s, e) => s + e.qtyProduced, 0);

    return teamConfigs.map((team) => {
      const entries = activeEntries.filter((e) => getEntryTeam(e) === team.id);
      const totalProduced = entries.reduce((s, e) => s + e.qtyProduced, 0);
      const conforming = entries.reduce((s, e) => s + e.qtyConforming, 0);
      const rejected = entries.reduce((s, e) => s + e.qtyRejected, 0);
      const scrapRate = totalProduced > 0 ? Number(((rejected / totalProduced) * 100).toFixed(2)) : 0;
      const yieldRate = totalProduced > 0 ? Number(((conforming / totalProduced) * 100).toFixed(1)) : 100;
      const pctOfTotal = totalAll > 0 ? Number(((totalProduced / totalAll) * 100).toFixed(1)) : 0;
      // Estimated output rate: 8 hours per shift
      const cadencePerHour = Math.round(totalProduced / 8);

      return {
        ...team,
        totalProduced,
        conforming,
        rejected,
        scrapRate,
        yieldRate,
        pctOfTotal,
        cadencePerHour,
        lotsCount: entries.length,
      };
    });
  }, [activeEntries]);

  // -------------------------------------------------------------
  // 3. CROSS-AGGREGATION: MODELS PRODUCED BY TEAM (Stacked BarChart)
  // -------------------------------------------------------------
  const crossChartData = useMemo(() => {
    // Unique models in the filtered entries
    const distinctModelNames: string[] = Array.from(
      new Set(activeEntries.map((e) => e.modelName))
    ).filter((m): m is string => Boolean(m));

    const teamRows = [
      { teamId: 'team-matin-a', teamName: 'Équipe A (Matin)' },
      { teamId: 'team-matin-b', teamName: 'Équipe B (Matin)' },
      { teamId: 'team-soir', teamName: 'Équipe Soir' },
      { teamId: 'team-nuit', teamName: 'Équipe Nuit' },
    ];

    return teamRows.map((row) => {
      const teamEntries = activeEntries.filter((e) => getEntryTeam(e) === row.teamId);
      const rowData: Record<string, any> = {
        name: row.teamName,
        teamId: row.teamId,
      };

      let sum = 0;
      distinctModelNames.forEach((model) => {
        const modelQty = teamEntries
          .filter((e) => e.modelName === model)
          .reduce((s, e) => s + e.qtyProduced, 0);
        rowData[model] = modelQty;
        sum += modelQty;
      });

      rowData._total = sum;
      return rowData;
    });
  }, [activeEntries]);

  // Quick summary insights
  const totalVolume = activeEntries.reduce((s, e) => s + e.qtyProduced, 0);
  const totalConforming = activeEntries.reduce((s, e) => s + e.qtyConforming, 0);
  const totalRejected = activeEntries.reduce((s, e) => s + e.qtyRejected, 0);
  const topModel = modelChartData[0] || null;
  const topTeam = [...teamChartData].sort((a, b) => b.totalProduced - a.totalProduced)[0] || null;
  const globalYield = totalVolume > 0 ? ((totalConforming / totalVolume) * 100).toFixed(1) : '100.0';

  // Custom Tooltip for Model BarChart
  const CustomModelTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-md text-xs space-y-1.5 min-w-[200px]">
          <div className="flex items-center justify-between border-b border-slate-100 pb-1">
            <span className="font-bold text-slate-900">{data.modelName}</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-100 text-slate-700">
              {data.material}
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Production totale :</span>
              <span className="font-bold font-mono text-slate-900">{data.totalProduced.toLocaleString()} paires</span>
            </div>
            <div className="flex justify-between items-center text-emerald-600">
              <span>Paires conformes :</span>
              <span className="font-semibold font-mono">{data.conforming.toLocaleString()} ({data.yieldRate}%)</span>
            </div>
            <div className="flex justify-between items-center text-rose-600">
              <span>Rebuts injectés :</span>
              <span className="font-semibold font-mono">{data.rejected.toLocaleString()} ({data.scrapRate}%)</span>
            </div>
            <div className="flex justify-between items-center text-blue-600 pt-1 border-t border-slate-100">
              <span>Part de l'atelier :</span>
              <span className="font-bold font-mono">{data.percentage}%</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Tooltip for Team BarChart
  const CustomTeamTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-md text-xs space-y-1.5 min-w-[210px]">
          <div className="flex items-center justify-between border-b border-slate-100 pb-1">
            <span className="font-bold text-slate-900">{data.name}</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-100">
              {data.code}
            </span>
          </div>
          <div className="space-y-1">
            <div className="text-[11px] text-slate-500">
              Chef : <span className="font-medium text-slate-700">{data.leader}</span> ({data.members} op.)
            </div>
            <div className="text-[11px] text-slate-500">
              Poste : <span className="font-medium text-slate-700">{data.shiftLabel}</span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-slate-100">
              <span className="text-slate-600 font-medium">Volume produit :</span>
              <span className="font-bold font-mono text-slate-900">{data.totalProduced.toLocaleString()} paires</span>
            </div>
            <div className="flex justify-between items-center text-emerald-600">
              <span>Paires conformes :</span>
              <span className="font-semibold font-mono">{data.conforming.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-rose-600">
              <span>Taux de rebuts :</span>
              <span className="font-semibold font-mono">{data.scrapRate}%</span>
            </div>
            <div className="flex justify-between items-center text-blue-600">
              <span>Cadence moyenne :</span>
              <span className="font-bold font-mono">~{data.cadencePerHour} paires/h</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Real-time Widget Section Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Visualisation des Volumes de Production en Temps Réel
              </h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Direct Atelier (Recharts)
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Analytique graphique dynamique synchronisée avec chaque saisie de lot, scan IA et déclaration d'équipe.
            </p>
          </div>

          {/* Machine Filter & Realtime Indicator */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px] font-medium text-slate-500">Machine :</span>
              <select
                value={selectedMachineFilter}
                onChange={(e) => setSelectedMachineFilter(e.target.value)}
                className="bg-transparent font-semibold text-slate-800 focus:outline-hidden cursor-pointer"
              >
                <option value="all">Toutes les Presses (EVA 1-3)</option>
                {machines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.code} - {m.name.split('#')[0].trim()}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Real-time Flash Highlights */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">
              Volume Période
            </span>
            <div className="text-lg font-bold text-slate-900 font-mono mt-0.5">
              {totalVolume.toLocaleString()} <span className="text-xs font-normal text-slate-500">paires</span>
            </div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              {activeEntries.length} lots enregistrés
            </span>
          </div>

          <div className="p-3 rounded-lg bg-blue-50/60 border border-blue-100">
            <span className="text-[10px] font-medium text-blue-700 uppercase tracking-wider block flex items-center justify-between">
              <span>Top Modèle</span>
              <Sparkles className="w-3 h-3 text-blue-600" />
            </span>
            <div className="text-sm font-bold text-blue-900 truncate mt-0.5" title={topModel?.modelName}>
              {topModel?.shortName || 'Aucun'}
            </div>
            <span className="text-[11px] text-blue-700 font-mono mt-0.5 block">
              {topModel ? `${topModel.totalProduced.toLocaleString()} paires (${topModel.percentage}%)` : '-'}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-indigo-50/60 border border-indigo-100">
            <span className="text-[10px] font-medium text-indigo-700 uppercase tracking-wider block flex items-center justify-between">
              <span>Équipe Leader</span>
              <Users className="w-3 h-3 text-indigo-600" />
            </span>
            <div className="text-sm font-bold text-indigo-900 truncate mt-0.5">
              {topTeam?.name || 'Aucune'}
            </div>
            <span className="text-[11px] text-indigo-700 font-mono mt-0.5 block">
              {topTeam ? `${topTeam.totalProduced.toLocaleString()} paires (${topTeam.yieldRate}% conf.)` : '-'}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-emerald-50/60 border border-emerald-100">
            <span className="text-[10px] font-medium text-emerald-700 uppercase tracking-wider block flex items-center justify-between">
              <span>Rendement Global</span>
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            </span>
            <div className="text-lg font-bold text-emerald-700 font-mono mt-0.5">
              {globalYield}%
            </div>
            <span className="text-[11px] text-emerald-800 mt-0.5 block">
              {totalConforming.toLocaleString()} conformes / {totalRejected} rebuts
            </span>
          </div>
        </div>
      </div>

      {/* Main Dual Grid: Widget 1 (Modèle) & Widget 2 (Équipe) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ======================================================= */}
        {/* WIDGET 1: PRODUCTION VOLUME BY SHOE MODEL               */}
        {/* ======================================================= */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Volume de Production par Modèle de Chaussure
                </h3>
              </div>

              {/* View Toggle */}
              <div className="bg-slate-100 p-0.5 rounded-lg border border-slate-200 flex text-[11px]">
                <button
                  onClick={() => setModelViewType('bars')}
                  className={`px-2 py-1 rounded transition font-medium ${
                    modelViewType === 'bars'
                      ? 'bg-white text-blue-600 shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Histogramme comparatif conformes vs rebuts"
                >
                  Barres
                </button>
                <button
                  onClick={() => setModelViewType('distribution')}
                  className={`px-2 py-1 rounded transition font-medium ${
                    modelViewType === 'distribution'
                      ? 'bg-white text-blue-600 shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Répartition circulaire en pourcentage"
                >
                  Parts %
                </button>
              </div>
            </div>

            {/* Recharts Chart Area */}
            {modelChartData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-xs text-slate-400">
                Aucune donnée de production pour les filtres actifs.
              </div>
            ) : modelViewType === 'bars' ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={modelChartData}
                    margin={{ top: 10, right: 10, left: -15, bottom: 25 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis
                      dataKey="shortName"
                      tick={{ fontSize: 11, fill: '#64748B' }}
                      angle={-15}
                      textAnchor="end"
                      interval={0}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#64748B' }}
                      tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v)}
                    />
                    <Tooltip content={<CustomModelTooltip />} />
                    <Legend
                      wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                      iconSize={10}
                    />
                    <Bar
                      dataKey="conforming"
                      name="Paires Conformes"
                      fill="#2563EB"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="rejected"
                      name="Rebuts"
                      fill="#F43F5E"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip
                      formatter={(val: any, name: any, item: any) => [
                        `${Number(val).toLocaleString()} paires (${item.payload.percentage}%)`,
                        item.payload.modelName,
                      ]}
                    />
                    <Pie
                      data={modelChartData}
                      dataKey="totalProduced"
                      nameKey="shortName"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={2}
                      label={({ shortName, percentage }) => `${shortName}: ${percentage}%`}
                      labelLine={{ stroke: '#94A3B8', strokeWidth: 1 }}
                    >
                      {modelChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Model Breakdown Compact Legend / Table */}
          <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {modelChartData.slice(0, 4).map((m, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100"
              >
                <div className="flex items-center gap-2 truncate">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: m.color }}
                  />
                  <span className="font-medium text-slate-800 truncate" title={m.modelName}>
                    {m.shortName}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 font-mono">
                  <span className="font-bold text-slate-900">{m.totalProduced.toLocaleString()}</span>
                  <span className="text-[10px] text-slate-400">({m.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ======================================================= */}
        {/* WIDGET 2: PRODUCTION VOLUME BY TEAM                     */}
        {/* ======================================================= */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Volume de Production par Équipe Industrielle
                </h3>
              </div>
              <span className="text-xs text-slate-500 font-mono font-medium">
                4 Équipes Postées
              </span>
            </div>

            {/* Recharts BarChart for Teams */}
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={teamChartData}
                  margin={{ top: 10, right: 10, left: -15, bottom: 25 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    interval={0}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v)}
                  />
                  <Tooltip content={<CustomTeamTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                    iconSize={10}
                  />
                  <Bar
                    dataKey="conforming"
                    name="Paires Conformes"
                    fill="#059669"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="rejected"
                    name="Rebuts Déclarés"
                    fill="#F43F5E"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Teams Status Cards */}
          <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
            {teamChartData.map((team) => (
              <div
                key={team.id}
                className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">{team.name}</span>
                  <span className="font-mono text-[10px] text-blue-700 bg-blue-50 px-1 rounded">
                    {team.shiftLabel.split('(')[0].trim()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Chef : {team.leader.split(' ')[0]}</span>
                  <span className="font-mono font-bold text-slate-800">
                    {team.totalProduced.toLocaleString()} p
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-1.5 rounded-full"
                    style={{
                      width: `${totalVolume > 0 ? (team.totalProduced / totalVolume) * 100 : 0}%`,
                      backgroundColor: team.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ======================================================= */}
      {/* WIDGET 3: CROSS-ANALYSIS: MODELS PRODUCED BY TEAM       */}
      {/* ======================================================= */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Boxes className="w-4 h-4 text-blue-600" />
              Matrice Croisée : Répartition des Modèles par Équipe (Empilée)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Identification instantanée des séries fabriquées par chaque équipe durant la période.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
            <span>Total : <strong>{totalVolume.toLocaleString()}</strong> paires</span>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={crossChartData}
              margin={{ top: 15, right: 20, left: -10, bottom: 15 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#64748B' }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#64748B' }}
                tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v)}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const totalRow = payload.reduce((s: number, p: any) => s + (Number(p.value) || 0), 0);
                    return (
                      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-md text-xs space-y-1.5 min-w-[220px]">
                        <div className="font-bold text-slate-900 border-b border-slate-100 pb-1">
                          {label} • {totalRow.toLocaleString()} paires au total
                        </div>
                        <div className="space-y-1">
                          {payload.map((entry: any, i: number) => {
                            if (!entry.value) return null;
                            return (
                              <div key={i} className="flex justify-between items-center">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: entry.color }}
                                  />
                                  <span className="text-slate-600 truncate max-w-[140px]" title={entry.name}>
                                    {entry.name.replace('CTP ', '')}
                                  </span>
                                </div>
                                <span className="font-mono font-semibold text-slate-900">
                                  {Number(entry.value).toLocaleString()} p
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                formatter={(val) => (typeof val === 'string' ? val.replace('CTP ', '') : val)}
                iconSize={10}
              />
              {modelChartData.map((m, idx) => (
                <Bar
                  key={m.modelName}
                  dataKey={m.modelName}
                  name={m.modelName}
                  stackId="a"
                  fill={m.color}
                  radius={idx === modelChartData.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
