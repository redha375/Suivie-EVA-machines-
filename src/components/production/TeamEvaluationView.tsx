import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Users,
  Award,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Clock,
  Gauge,
  Layers,
  Boxes,
  Percent,
  Search,
  SlidersHorizontal,
  ChevronRight,
  ShieldCheck,
  Eye,
  Info,
  Calendar,
  Sparkles,
  Zap,
  Printer,
  Download,
  Flame,
  Scale,
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  calculateAllTeamsEvaluation,
  EvaluationFilterOptions,
  TeamProductionMetrics,
} from '../../utils/teamEvaluationCalculations';

export const TeamEvaluationView: React.FC = () => {
  const { productionEntries, machines, setActiveTab, toggleVerifyEntry } = useApp();

  // Active sub-tab in evaluation view
  const [activeSubTab, setActiveSubTab] = useState<'comparison' | 'production' | 'quality' | 'material' | 'yield' | 'fiches_list'>('comparison');

  // Selected Team for detailed inspection in single-team subviews
  const [selectedTeamTab, setSelectedTeamTab] = useState<'A' | 'B' | 'C'>('A');

  // Filters State
  const [periodType, setPeriodType] = useState<EvaluationFilterOptions['periodType']>('all');
  const [selectedDate, setSelectedDate] = useState<string>('2026-09-06');
  const [startDate, setStartDate] = useState<string>('2026-09-01');
  const [endDate, setEndDate] = useState<string>('2026-09-10');
  const [selectedModel, setSelectedModel] = useState<string>('ALL');
  const [selectedMachine, setSelectedMachine] = useState<string>('ALL');
  const [selectedMaterial, setSelectedMaterial] = useState<string>('ALL');
  const [validatedOnly, setValidatedOnly] = useState<boolean>(true); // Strictly validated fiches by default
  const [overConsumptionThresholdPct, setOverConsumptionThresholdPct] = useState<number>(5.0);

  // Search in fiches registry
  const [fichesSearchQuery, setFichesSearchQuery] = useState<string>('');

  // Collect available unique models from entries for dropdown
  const availableModels = useMemo(() => {
    const set = new Set<string>();
    productionEntries.forEach((e) => {
      if (e.modelName) set.add(e.modelName);
    });
    return Array.from(set).sort();
  }, [productionEntries]);

  // Compute all metrics using the calculation engine
  const filterOptions: EvaluationFilterOptions = useMemo(() => {
    return {
      periodType,
      selectedDate,
      startDate,
      endDate,
      selectedModel,
      selectedMachine,
      selectedMaterial,
      validatedOnly,
      overConsumptionThresholdPct,
    };
  }, [
    periodType,
    selectedDate,
    startDate,
    endDate,
    selectedModel,
    selectedMachine,
    selectedMaterial,
    validatedOnly,
    overConsumptionThresholdPct,
  ]);

  const evaluationResults = useMemo(() => {
    return calculateAllTeamsEvaluation(productionEntries, filterOptions);
  }, [productionEntries, filterOptions]);

  const { teamA, teamB, teamC, usineTotal, filteredEntries, totalValidatedCount, totalUnvalidatedCount } = evaluationResults;

  // Selected team metrics object
  const currentTeamMetrics: TeamProductionMetrics = useMemo(() => {
    if (selectedTeamTab === 'A') return teamA;
    if (selectedTeamTab === 'B') return teamB;
    return teamC;
  }, [selectedTeamTab, teamA, teamB, teamC]);

  // Determine top ranking teams for the podium
  const bestProductionTeam = useMemo(() => {
    const list = [teamA, teamB, teamC];
    return [...list].sort((a, b) => b.pairesConformes - a.pairesConformes)[0];
  }, [teamA, teamB, teamC]);

  const bestQualityTeam = useMemo(() => {
    const list = [teamA, teamB, teamC].filter((t) => t.pairesBrutes > 0);
    if (list.length === 0) return teamA;
    return [...list].sort((a, b) => b.tauxConformite - a.tauxConformite)[0];
  }, [teamA, teamB, teamC]);

  const bestMaterialTeam = useMemo(() => {
    const list = [teamA, teamB, teamC].filter((t) => t.pairesBrutes > 0 && t.consoMoyenneKgParPaire > 0);
    if (list.length === 0) return teamA;
    return [...list].sort((a, b) => a.consoMoyenneKgParPaire - b.consoMoyenneKgParPaire)[0];
  }, [teamA, teamB, teamC]);

  const bestYieldTeam = useMemo(() => {
    const list = [teamA, teamB, teamC].filter((t) => t.rendementHoraire > 0);
    if (list.length === 0) return teamA;
    return [...list].sort((a, b) => b.rendementHoraire - a.rendementHoraire)[0];
  }, [teamA, teamB, teamC]);

  // Comparison Bar Chart Data
  const comparisonChartData = useMemo(() => {
    return [
      {
        name: 'Équipe A',
        pairesBrutes: teamA.pairesBrutes,
        pairesConformes: teamA.pairesConformes,
        tauxConformite: teamA.tauxConformite,
        rendement: teamA.rendementHoraire,
        matiereKg: teamA.poidsTotalConsommeKg,
        consoKgPaire: teamA.consoMoyenneKgParPaire,
        arretMinutes: teamA.tempsArretMinutes,
      },
      {
        name: 'Équipe B',
        pairesBrutes: teamB.pairesBrutes,
        pairesConformes: teamB.pairesConformes,
        tauxConformite: teamB.tauxConformite,
        rendement: teamB.rendementHoraire,
        matiereKg: teamB.poidsTotalConsommeKg,
        consoKgPaire: teamB.consoMoyenneKgParPaire,
        arretMinutes: teamB.tempsArretMinutes,
      },
      {
        name: 'Équipe C',
        pairesBrutes: teamC.pairesBrutes,
        pairesConformes: teamC.pairesConformes,
        tauxConformite: teamC.tauxConformite,
        rendement: teamC.rendementHoraire,
        matiereKg: teamC.poidsTotalConsommeKg,
        consoKgPaire: teamC.consoMoyenneKgParPaire,
        arretMinutes: teamC.tempsArretMinutes,
      },
    ];
  }, [teamA, teamB, teamC]);

  // Quality Defect Breakdown Pie Data for Selected Team
  const defectPieData = useMemo(() => {
    const data = [
      { name: '1er Choix (Conforme)', value: currentTeamMetrics.pairesConformes, color: '#10b981' },
      { name: '2ème Choix', value: currentTeamMetrics.secondChoix, color: '#f59e0b' },
      { name: '3ème Choix', value: currentTeamMetrics.troisiemeChoix, color: '#fb923c' },
      { name: 'Rebut Non Récupérable', value: currentTeamMetrics.rebutNonRecuperable, color: '#ef4444' },
    ];
    return data.filter((d) => d.value > 0);
  }, [currentTeamMetrics]);

  // Export to CSV Function
  const handleExportCSV = () => {
    const rows = [
      ['ÉQUIPE', 'PAIRES BRUTES', 'PAIRES CONFORMES', 'CONFORMITÉ %', 'DÉFAUTS %', 'MATIÈRE TOTALE KG', 'KG/PAIRE', 'G/PAIRE', 'RENDEMENT (PAIRES/H)', 'ARRÊTS (MIN)', 'FICHES VALIDÉES'],
      ['Équipe A', teamA.pairesBrutes, teamA.pairesConformes, `${teamA.tauxConformite}%`, `${teamA.tauxDefaut}%`, teamA.poidsTotalConsommeKg, teamA.consoMoyenneKgParPaire, `${teamA.consoMoyenneGrammesParPaire}g`, teamA.rendementHoraire, teamA.tempsArretMinutes, teamA.fichesCount],
      ['Équipe B', teamB.pairesBrutes, teamB.pairesConformes, `${teamB.tauxConformite}%`, `${teamB.tauxDefaut}%`, teamB.poidsTotalConsommeKg, teamB.consoMoyenneKgParPaire, `${teamB.consoMoyenneGrammesParPaire}g`, teamB.rendementHoraire, teamB.tempsArretMinutes, teamB.fichesCount],
      ['Équipe C', teamC.pairesBrutes, teamC.pairesConformes, `${teamC.tauxConformite}%`, `${teamC.tauxDefaut}%`, teamC.poidsTotalConsommeKg, teamC.consoMoyenneKgParPaire, `${teamC.consoMoyenneGrammesParPaire}g`, teamC.rendementHoraire, teamC.tempsArretMinutes, teamC.fichesCount],
      ['TOTAL USINE', usineTotal.pairesBrutes, usineTotal.pairesConformes, `${usineTotal.tauxConformiteMoyen}%`, `${usineTotal.tauxDefautMoyen}%`, usineTotal.matiereTotalKg, usineTotal.consoMoyenneKgParPaire, '-', usineTotal.rendementHoraireMoyen, usineTotal.tempsArretTotalMinutes, filteredEntries.length],
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(';')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Evaluation_Equipes_ABC_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER BANNER (Prestigious, Industrial & Purposeful) */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 border border-slate-800 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                <Users className="w-3.5 h-3.5" />
                CTP SMART — Évaluation Officielle A / B / C
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <ShieldCheck className="w-3.5 h-3.5" />
                {validatedOnly ? 'Fiches Validées Exclusivement' : 'Fiches Atelier Globales'}
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-mono bg-slate-800/80 text-slate-300 border border-slate-700">
                {filteredEntries.length} fiches analysées
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              Évaluation des Équipes A / B / C
            </h1>

            <p className="text-slate-300 text-xs sm:text-sm max-w-3xl leading-relaxed">
              Mesure automatique et séparée des 4 piliers de performance industrielle : <strong className="text-white">Production</strong>, <strong className="text-white">Qualité</strong>, <strong className="text-white">Consommation Matière</strong> et <strong className="text-white">Rendement</strong>.
              Calculs rigoureux basés exclusivement sur les fiches de fabrication validées.
            </p>
          </div>

          {/* Quick Actions Header */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => setActiveTab('fiche_suivi')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-emerald-600/30 transition transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Fiche de Suivi Production</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs sm:text-sm font-semibold transition"
              title="Exporter les données au format Excel / CSV"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-3 py-2.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs sm:text-sm font-semibold transition"
              title="Imprimer le rapport officiel"
            >
              <Printer className="w-4 h-4 text-blue-400" />
              <span>Imprimer</span>
            </button>
          </div>
        </div>

        {/* Global Factory Quick KPI Ticker */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800">
          <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/60">
            <div className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Total Conformes</div>
            <div className="text-xl sm:text-2xl font-black text-white font-mono mt-0.5">
              {usineTotal.pairesConformes.toLocaleString('fr-FR')} <span className="text-xs text-slate-400 font-sans">paires</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              sur {usineTotal.pairesBrutes.toLocaleString('fr-FR')} brutes
            </div>
          </div>

          <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/60">
            <div className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Conformité Usine</div>
            <div className={`text-xl sm:text-2xl font-black font-mono mt-0.5 ${
              usineTotal.tauxConformiteMoyen >= 97 ? 'text-emerald-400' : usineTotal.tauxConformiteMoyen >= 93 ? 'text-amber-400' : 'text-rose-400'
            }`}>
              {usineTotal.tauxConformiteMoyen}%
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Défauts : {usineTotal.tauxDefautMoyen}%
            </div>
          </div>

          <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/60">
            <div className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Matière Totale</div>
            <div className="text-xl sm:text-2xl font-black text-white font-mono mt-0.5">
              {usineTotal.matiereTotalKg.toLocaleString('fr-FR')} <span className="text-xs text-slate-400 font-sans">kg</span>
            </div>
            <div className="text-[10px] text-blue-300 font-mono mt-0.5">
              {(usineTotal.consoMoyenneKgParPaire * 1000).toFixed(0)} g / paire moyenne
            </div>
          </div>

          <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/60">
            <div className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Rendement Moyen</div>
            <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono mt-0.5">
              {usineTotal.rendementHoraireMoyen} <span className="text-xs text-slate-400 font-sans">paires/h</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Arrêts totaux : {Math.round(usineTotal.tempsArretTotalMinutes / 60)}h {usineTotal.tempsArretTotalMinutes % 60}m
            </div>
          </div>
        </div>

        {/* Sub-Tabs Navigation (Modules 1 to 5) */}
        <div className="flex flex-wrap items-center gap-2 mt-5 pt-4 border-t border-slate-800">
          <button
            onClick={() => setActiveSubTab('comparison')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
              activeSubTab === 'comparison'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/40'
                : 'bg-slate-800/70 text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Award className="w-4 h-4 text-amber-400" />
            <span>5. Comparaison Dynamique A / B / C</span>
          </button>

          <button
            onClick={() => setActiveSubTab('production')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
              activeSubTab === 'production'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/40'
                : 'bg-slate-800/70 text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Boxes className="w-4 h-4 text-blue-400" />
            <span>1. Production</span>
          </button>

          <button
            onClick={() => setActiveSubTab('quality')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
              activeSubTab === 'quality'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/40'
                : 'bg-slate-800/70 text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>2. Qualité</span>
          </button>

          <button
            onClick={() => setActiveSubTab('material')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
              activeSubTab === 'material'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/40'
                : 'bg-slate-800/70 text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Scale className="w-4 h-4 text-amber-400" />
            <span>3. Consommation Matière</span>
          </button>

          <button
            onClick={() => setActiveSubTab('yield')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
              activeSubTab === 'yield'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/40'
                : 'bg-slate-800/70 text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Gauge className="w-4 h-4 text-cyan-400" />
            <span>4. Rendement</span>
          </button>

          <button
            onClick={() => setActiveSubTab('fiches_list')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition ml-auto ${
              activeSubTab === 'fiches_list'
                ? 'bg-emerald-700 text-white shadow-md shadow-emerald-700/40'
                : 'bg-slate-800/70 text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Fiches Validées ({filteredEntries.length})</span>
          </button>
        </div>
      </div>

      {/* 2. DYNAMIC FILTERS BAR (Jour / Semaine / Mois / Modèle / Machine / Seuil) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-bold text-slate-900">Filtres de Traçabilité & Période d'Évaluation</span>
          </div>

          {/* Validation Rule Notice */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={validatedOnly}
                onChange={(e) => setValidatedOnly(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
              />
              <span>Fiches validées par le Chef uniquement</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                validatedOnly ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {validatedOnly ? `${totalValidatedCount} Validées` : `${productionEntries.length} Totales`}
              </span>
            </label>

            {totalUnvalidatedCount > 0 && !validatedOnly && (
              <span className="text-[11px] text-amber-600 flex items-center gap-1 font-medium">
                <AlertTriangle className="w-3.5 h-3.5" />
                {totalUnvalidatedCount} non validée(s)
              </span>
            )}
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Période Selector Buttons */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Période d'Analyse</label>
            <div className="grid grid-cols-4 gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setPeriodType('day')}
                className={`py-1.5 text-xs font-bold rounded-lg transition ${
                  periodType === 'day' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Filtrer par jour spécifique"
              >
                Jour
              </button>
              <button
                type="button"
                onClick={() => setPeriodType('week')}
                className={`py-1.5 text-xs font-bold rounded-lg transition ${
                  periodType === 'week' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Filtrer sur les 7 derniers jours"
              >
                Semaine
              </button>
              <button
                type="button"
                onClick={() => setPeriodType('month')}
                className={`py-1.5 text-xs font-bold rounded-lg transition ${
                  periodType === 'month' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Filtrer par mois"
              >
                Mois
              </button>
              <button
                type="button"
                onClick={() => setPeriodType('all')}
                className={`py-1.5 text-xs font-bold rounded-lg transition ${
                  periodType === 'all' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Tout l'historique"
              >
                Tout
              </button>
            </div>
          </div>

          {/* Date Picker (Visible if day, week or month) */}
          {periodType !== 'all' && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                {periodType === 'day' ? 'Date du Jour' : periodType === 'week' ? 'Semaine de référence' : 'Mois sélectionné'}
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>
          )}

          {/* Model Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Modèle Produit</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none truncate"
            >
              <option value="ALL">Tous les modèles ({availableModels.length})</option>
              {availableModels.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Machine Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Machine d'Injection</label>
            <select
              value={selectedMachine}
              onChange={(e) => setSelectedMachine(e.target.value)}
              className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="ALL">Toutes les machines ({machines.length})</option>
              {machines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.code} ({m.type})
                </option>
              ))}
            </select>
          </div>

          {/* Matière Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Matière</label>
            <select
              value={selectedMaterial}
              onChange={(e) => setSelectedMaterial(e.target.value)}
              className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="ALL">Toutes matières (EVA / PVC / Soumelle)</option>
              <option value="EVA">EVA</option>
              <option value="PVC">PVC</option>
              <option value="SOUMELLE">SOUMELLE</option>
              <option value="TPR">TPR</option>
            </select>
          </div>
        </div>

        {/* Alert threshold setting & active filter feedback */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-slate-500 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Seuil Alerte Surconsommation Matière :</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="1"
                max="25"
                step="0.5"
                value={overConsumptionThresholdPct}
                onChange={(e) => setOverConsumptionThresholdPct(Number(e.target.value))}
                className="w-16 px-2 py-1 text-xs font-bold text-center border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500"
              />
              <span className="font-bold text-slate-700">%</span>
            </div>
            <span className="text-[11px] text-slate-400">
              (Alerte automatique si l'écart matière dépasse +{overConsumptionThresholdPct}%)
            </span>
          </div>

          <div className="text-[11px] text-slate-500 flex items-center gap-2">
            <span>Fiches actives : <strong className="text-slate-800 font-mono">{filteredEntries.length}</strong></span>
            <span>•</span>
            <span>Équipe A : <strong className="text-blue-700 font-mono">{teamA.fichesCount}</strong></span>
            <span>•</span>
            <span>Équipe B : <strong className="text-amber-700 font-mono">{teamB.fichesCount}</strong></span>
            <span>•</span>
            <span>Équipe C : <strong className="text-purple-700 font-mono">{teamC.fichesCount}</strong></span>
          </div>
        </div>
      </div>

      {/* OVERCONSUMPTION ALERT BANNER (If any team triggered an alert) */}
      {(teamA.hasOverConsumptionAlert || teamB.hasOverConsumptionAlert || teamC.hasOverConsumptionAlert) && (
        <div className="bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-amber-500/15 border-l-4 border-rose-500 p-4 rounded-2xl shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-rose-900 font-black text-sm">
            <AlertTriangle className="w-5 h-5 text-rose-600 animate-pulse" />
            <span>ALERTE SURCONSOMMATION MATIÈRE DÉTECTÉE (Dépassement du seuil de +{overConsumptionThresholdPct}%)</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
            {teamA.hasOverConsumptionAlert && (
              <div className="p-2.5 bg-white/80 rounded-xl border border-rose-200">
                <span className="font-bold text-rose-800">Équipe A : </span>
                <span className="text-slate-700">Surconsommation globale de +{teamA.ecartGlobalPourcentage}% (+{teamA.ecartGlobalKg} kg vs standard).</span>
              </div>
            )}
            {teamB.hasOverConsumptionAlert && (
              <div className="p-2.5 bg-white/80 rounded-xl border border-rose-200">
                <span className="font-bold text-rose-800">Équipe B : </span>
                <span className="text-slate-700">Surconsommation globale de +{teamB.ecartGlobalPourcentage}% (+{teamB.ecartGlobalKg} kg vs standard).</span>
              </div>
            )}
            {teamC.hasOverConsumptionAlert && (
              <div className="p-2.5 bg-white/80 rounded-xl border border-rose-200">
                <span className="font-bold text-rose-800">Équipe C : </span>
                <span className="text-slate-700">Surconsommation globale de +{teamC.ecartGlobalPourcentage}% (+{teamC.ecartGlobalKg} kg vs standard).</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 5: COMPARAISON DYNAMIQUE A / B / C (TABLEAU PRINCIPAL & PODIUM) */}
      {/* ========================================================================= */}
      {activeSubTab === 'comparison' && (
        <div className="space-y-6">
          {/* PODIUM DE PERFORMANCE */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Trophée 1: Production */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Top Production</span>
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <Award className="w-4 h-4 text-blue-600" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900">
                {bestProductionTeam.teamName}
              </div>
              <div className="text-xs font-semibold text-blue-700 mt-1">
                {bestProductionTeam.pairesConformes.toLocaleString('fr-FR')} paires conformes
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                {bestProductionTeam.cartonsPleins} cartons scellés
              </div>
            </div>

            {/* Trophée 2: Qualité */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Top Qualité</span>
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900">
                {bestQualityTeam.teamName}
              </div>
              <div className="text-xs font-semibold text-emerald-700 mt-1">
                {bestQualityTeam.tauxConformite}% de conformité
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Seulement {bestQualityTeam.totalDefauts} défaut(s) ({bestQualityTeam.tauxDefaut}%)
              </div>
            </div>

            {/* Trophée 3: Sobriété Matière */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Économie Matière</span>
                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <Scale className="w-4 h-4 text-amber-600" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900">
                {bestMaterialTeam.teamName}
              </div>
              <div className="text-xs font-semibold text-amber-700 mt-1">
                {bestMaterialTeam.consoMoyenneGrammesParPaire} g / paire
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Écart standard : {bestMaterialTeam.ecartGlobalPourcentage > 0 ? `+${bestMaterialTeam.ecartGlobalPourcentage}%` : `${bestMaterialTeam.ecartGlobalPourcentage}%`}
              </div>
            </div>

            {/* Trophée 4: Rendement Horaire */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Top Cadence</span>
                <div className="w-8 h-8 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center font-bold">
                  <Zap className="w-4 h-4 text-cyan-600" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900">
                {bestYieldTeam.teamName}
              </div>
              <div className="text-xs font-semibold text-cyan-700 mt-1">
                {bestYieldTeam.rendementHoraire} paires / heure
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Arrêts minimes : {bestYieldTeam.tempsArretMinutes} min
              </div>
            </div>
          </div>

          {/* TABLEAU COMPARATIF DYNAMIQUE REQUIS (EXIGENCES PROMPT ITEM 5) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Award className="w-5 h-5 text-blue-600" />
                  Tableau Comparatif Dynamique des Équipes A / B / C
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Comparaison en temps réel des fiches validées : paires brutes, conformes, ratios qualité, matière et cadence horaire.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Légende :</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">Vert ≥ 97%</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">Orange 93-97%</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">Rouge &lt; 93%</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200">
                    <th className="py-3 px-4">Équipe</th>
                    <th className="py-3 px-4 text-right">Paires brutes</th>
                    <th className="py-3 px-4 text-right">Paires conformes</th>
                    <th className="py-3 px-4 text-right">Conformité %</th>
                    <th className="py-3 px-4 text-right">Défauts %</th>
                    <th className="py-3 px-4 text-right">Matière kg</th>
                    <th className="py-3 px-4 text-right">kg / paire</th>
                    <th className="py-3 px-4 text-right">Paires conf. / h</th>
                    <th className="py-3 px-4 text-right">Temps d'arrêt</th>
                    <th className="py-3 px-4 text-center">Fiches</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {/* Ligne Équipe A */}
                  <tr className="hover:bg-blue-50/40 transition">
                    <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center">A</span>
                      <div>
                        <div>Équipe A</div>
                        <div className="text-[10px] text-slate-400 font-normal">Matin (06h - 14h) • {teamA.leaderName}</div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-800">
                      {teamA.pairesBrutes.toLocaleString('fr-FR')}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700">
                      {teamA.pairesConformes.toLocaleString('fr-FR')}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-black">
                      <span className={`px-2 py-0.5 rounded-full ${
                        teamA.tauxConformite >= 97 ? 'bg-emerald-100 text-emerald-800' : teamA.tauxConformite >= 93 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {teamA.tauxConformite}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-rose-600">
                      {teamA.tauxDefaut}%
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-700">
                      {teamA.poidsTotalConsommeKg.toLocaleString('fr-FR')} kg
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-800">
                      {teamA.consoMoyenneKgParPaire.toFixed(3)} kg <span className="text-[10px] text-slate-400 font-sans">({teamA.consoMoyenneGrammesParPaire}g)</span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-black text-cyan-800">
                      {teamA.rendementHoraire} p/h
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                      {Math.floor(teamA.tempsArretMinutes / 60)}h {teamA.tempsArretMinutes % 60}m
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-600 font-mono font-bold">
                        {teamA.fichesCount}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => {
                          setSelectedTeamTab('A');
                          setActiveSubTab('production');
                        }}
                        className="px-2.5 py-1 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      >
                        Détails &rarr;
                      </button>
                    </td>
                  </tr>

                  {/* Ligne Équipe B */}
                  <tr className="hover:bg-amber-50/40 transition">
                    <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-amber-600 text-white font-black text-xs flex items-center justify-center">B</span>
                      <div>
                        <div>Équipe B</div>
                        <div className="text-[10px] text-slate-400 font-normal">Soir (14h - 22h) • {teamB.leaderName}</div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-800">
                      {teamB.pairesBrutes.toLocaleString('fr-FR')}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700">
                      {teamB.pairesConformes.toLocaleString('fr-FR')}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-black">
                      <span className={`px-2 py-0.5 rounded-full ${
                        teamB.tauxConformite >= 97 ? 'bg-emerald-100 text-emerald-800' : teamB.tauxConformite >= 93 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {teamB.tauxConformite}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-rose-600">
                      {teamB.tauxDefaut}%
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-700">
                      {teamB.poidsTotalConsommeKg.toLocaleString('fr-FR')} kg
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-800">
                      {teamB.consoMoyenneKgParPaire.toFixed(3)} kg <span className="text-[10px] text-slate-400 font-sans">({teamB.consoMoyenneGrammesParPaire}g)</span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-black text-cyan-800">
                      {teamB.rendementHoraire} p/h
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                      {Math.floor(teamB.tempsArretMinutes / 60)}h {teamB.tempsArretMinutes % 60}m
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-600 font-mono font-bold">
                        {teamB.fichesCount}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => {
                          setSelectedTeamTab('B');
                          setActiveSubTab('production');
                        }}
                        className="px-2.5 py-1 text-xs font-bold text-amber-600 hover:bg-amber-50 rounded-lg transition"
                      >
                        Détails &rarr;
                      </button>
                    </td>
                  </tr>

                  {/* Ligne Équipe C */}
                  <tr className="hover:bg-purple-50/40 transition">
                    <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-purple-600 text-white font-black text-xs flex items-center justify-center">C</span>
                      <div>
                        <div>Équipe C</div>
                        <div className="text-[10px] text-slate-400 font-normal">Nuit (22h - 06h) • {teamC.leaderName}</div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-800">
                      {teamC.pairesBrutes.toLocaleString('fr-FR')}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700">
                      {teamC.pairesConformes.toLocaleString('fr-FR')}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-black">
                      <span className={`px-2 py-0.5 rounded-full ${
                        teamC.tauxConformite >= 97 ? 'bg-emerald-100 text-emerald-800' : teamC.tauxConformite >= 93 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {teamC.tauxConformite}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-rose-600">
                      {teamC.tauxDefaut}%
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-700">
                      {teamC.poidsTotalConsommeKg.toLocaleString('fr-FR')} kg
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-800">
                      {teamC.consoMoyenneKgParPaire.toFixed(3)} kg <span className="text-[10px] text-slate-400 font-sans">({teamC.consoMoyenneGrammesParPaire}g)</span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-black text-cyan-800">
                      {teamC.rendementHoraire} p/h
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                      {Math.floor(teamC.tempsArretMinutes / 60)}h {teamC.tempsArretMinutes % 60}m
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-600 font-mono font-bold">
                        {teamC.fichesCount}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => {
                          setSelectedTeamTab('C');
                          setActiveSubTab('production');
                        }}
                        className="px-2.5 py-1 text-xs font-bold text-purple-600 hover:bg-purple-50 rounded-lg transition"
                      >
                        Détails &rarr;
                      </button>
                    </td>
                  </tr>

                  {/* LIGNE TOTAL USINE */}
                  <tr className="bg-slate-50/90 font-black text-slate-900 border-t-2 border-slate-300">
                    <td className="py-4 px-4 uppercase tracking-wider text-xs">
                      TOTAL USINE / MOYENNE
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-sm text-slate-950">
                      {usineTotal.pairesBrutes.toLocaleString('fr-FR')}
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-sm text-emerald-800">
                      {usineTotal.pairesConformes.toLocaleString('fr-FR')}
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-sm text-emerald-700">
                      {usineTotal.tauxConformiteMoyen}%
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-sm text-rose-700">
                      {usineTotal.tauxDefautMoyen}%
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-sm text-slate-900">
                      {usineTotal.matiereTotalKg.toLocaleString('fr-FR')} kg
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-sm text-slate-900">
                      {usineTotal.consoMoyenneKgParPaire.toFixed(3)} kg
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-sm text-cyan-800">
                      {usineTotal.rendementHoraireMoyen} p/h
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-sm text-slate-800">
                      {Math.floor(usineTotal.tempsArretTotalMinutes / 60)}h {usineTotal.tempsArretTotalMinutes % 60}m
                    </td>
                    <td className="py-4 px-4 text-center font-mono">
                      {filteredEntries.length}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="text-[10px] text-slate-400 font-sans">Global</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* VISUAL RECHARTS COMPARISON CARDS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Production Conforme vs Brute */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Boxes className="w-4 h-4 text-blue-600" />
                Comparaison Production Brute vs Conforme (Paires)
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: 'bold' }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="pairesBrutes" name="Paires Brutes" fill="#94a3b8" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="pairesConformes" name="Paires Conformes" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Taux de Conformité & Rendement Horaire */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Zap className="w-4 h-4 text-cyan-600" />
                Rendement Horaire (Paires / Heure)
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: 'bold' }} />
                    <YAxis tick={{ fontSize: 11 }} unit=" p/h" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="rendement" name="Paires Conformes / Heure" fill="#06b6d4" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 1: INDICATEUR PRODUCTION (EXIGENCES PROMPT ITEM 1) */}
      {/* ========================================================================= */}
      {activeSubTab === 'production' && (
        <div className="space-y-6">
          {/* Team Switcher Pills */}
          <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl w-fit">
            <button
              onClick={() => setSelectedTeamTab('A')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
                selectedTeamTab === 'A' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Équipe A (Matin)</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] ${selectedTeamTab === 'A' ? 'bg-blue-700 text-blue-100' : 'bg-slate-200'}`}>
                {teamA.pairesConformes} p
              </span>
            </button>

            <button
              onClick={() => setSelectedTeamTab('B')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
                selectedTeamTab === 'B' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Équipe B (Soir)</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] ${selectedTeamTab === 'B' ? 'bg-amber-700 text-amber-100' : 'bg-slate-200'}`}>
                {teamB.pairesConformes} p
              </span>
            </button>

            <button
              onClick={() => setSelectedTeamTab('C')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
                selectedTeamTab === 'C' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Équipe C (Nuit)</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] ${selectedTeamTab === 'C' ? 'bg-purple-700 text-purple-100' : 'bg-slate-200'}`}>
                {teamC.pairesConformes} p
              </span>
            </button>
          </div>

          {/* Formules et Métriques Clés Recommandées */}
          <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-md">
            <div className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" />
              Formules appliquées pour {currentTeamMetrics.teamName} :
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-300 font-mono">
              <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700">
                <span className="text-slate-400">Cycles =</span> Compteur sortie - Compteur entrée <br />
                <strong className="text-white text-sm">{currentTeamMetrics.cycles.toLocaleString('fr-FR')} cycles</strong>
              </div>
              <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700">
                <span className="text-slate-400">Paires brutes =</span> Cycles × Paires par cycle <br />
                <strong className="text-white text-sm">{currentTeamMetrics.pairesBrutes.toLocaleString('fr-FR')} paires</strong>
              </div>
              <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700">
                <span className="text-slate-400">Paires conformes =</span> Brutes - 2ème - 3ème - Rebut non récup. <br />
                <strong className="text-emerald-400 text-sm">{currentTeamMetrics.pairesConformes.toLocaleString('fr-FR')} paires</strong>
              </div>
            </div>
          </div>

          {/* Cartes Métriques Clés */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-xs text-slate-500 font-bold uppercase">Cycles Machine</div>
              <div className="text-2xl font-black text-slate-900 font-mono mt-1">
                {currentTeamMetrics.cycles.toLocaleString('fr-FR')}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Sur l'ensemble des fiches validées</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-xs text-slate-500 font-bold uppercase">Paires Brutes</div>
              <div className="text-2xl font-black text-slate-900 font-mono mt-1">
                {currentTeamMetrics.pairesBrutes.toLocaleString('fr-FR')}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Cycles × paires par moule</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-xs text-emerald-700 font-bold uppercase">Paires Conformes</div>
              <div className="text-2xl font-black text-emerald-700 font-mono mt-1">
                {currentTeamMetrics.pairesConformes.toLocaleString('fr-FR')}
              </div>
              <div className="text-[10px] text-emerald-600 mt-0.5">1er choix prêt expédition</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-xs text-blue-700 font-bold uppercase">Cartons Pleins / Vrac</div>
              <div className="text-2xl font-black text-blue-900 font-mono mt-1">
                {currentTeamMetrics.cartonsPleins} <span className="text-xs font-sans text-slate-500">ctns</span>
              </div>
              <div className="text-[11px] text-amber-700 font-semibold mt-0.5">
                + {currentTeamMetrics.cartonsOuverts} paires en vrac (ouvert)
              </div>
            </div>
          </div>

          {/* DÉTAIL DES VENTILATIONS (Modèle, Pointure, Couleur, Bicolor) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Ventilation par Modèle */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-blue-600" />
                  Production par Modèle
                </span>
                <span className="text-xs text-slate-400 font-mono">{currentTeamMetrics.productionParModele.length} modèle(s)</span>
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {currentTeamMetrics.productionParModele.map((item) => (
                  <div key={item.modele} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-800">{item.modele}</div>
                      <div className="w-40 bg-slate-200 h-1.5 rounded-full mt-1.5 overflow-hidden">
                        <div className="bg-blue-600 h-full rounded-full" style={{ width: `${item.pourcentage}%` }} />
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <div className="font-bold text-slate-900">{item.paires.toLocaleString('fr-FR')} p</div>
                      <div className="text-[10px] text-blue-600">{item.pourcentage}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Ventilation par Pointure */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-600" />
                  Production par Pointure
                </span>
                <span className="text-xs text-slate-400 font-mono">{currentTeamMetrics.productionParPointure.length} pointure(s)</span>
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {currentTeamMetrics.productionParPointure.map((item) => (
                  <div key={item.pointure} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-800">Pointure {item.pointure}</div>
                      <div className="w-40 bg-slate-200 h-1.5 rounded-full mt-1.5 overflow-hidden">
                        <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${item.pourcentage}%` }} />
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <div className="font-bold text-slate-900">{item.paires.toLocaleString('fr-FR')} p</div>
                      <div className="text-[10px] text-emerald-600">{item.pourcentage}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Ventilation par Couleur */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-purple-600" />
                  Production par Couleur
                </span>
                <span className="text-xs text-slate-400 font-mono">{currentTeamMetrics.productionParCouleur.length} coloris</span>
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {currentTeamMetrics.productionParCouleur.map((item) => (
                  <div key={item.couleur} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-800">{item.couleur}</div>
                      <div className="w-40 bg-slate-200 h-1.5 rounded-full mt-1.5 overflow-hidden">
                        <div className="bg-purple-600 h-full rounded-full" style={{ width: `${item.pourcentage}%` }} />
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <div className="font-bold text-slate-900">{item.paires.toLocaleString('fr-FR')} p</div>
                      <div className="text-[10px] text-purple-600">{item.pourcentage}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Production Bicolor */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Production Bicolor (Bi-densité / 2 Couleurs)
              </h3>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center">
                  <div className="text-xs font-bold text-amber-800">Paires Bicolor</div>
                  <div className="text-xl font-black text-amber-950 font-mono mt-1">
                    {currentTeamMetrics.productionBicolor.pairesBicolor.toLocaleString('fr-FR')}
                  </div>
                  <div className="text-[10px] text-amber-700 font-bold mt-1">
                    {currentTeamMetrics.productionBicolor.pourcentageBicolor}% du volume
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                  <div className="text-xs font-bold text-slate-700">Paires Monochrome</div>
                  <div className="text-xl font-black text-slate-900 font-mono mt-1">
                    {currentTeamMetrics.productionBicolor.pairesMonochrome.toLocaleString('fr-FR')}
                  </div>
                  <div className="text-[10px] text-slate-500 font-bold mt-1">
                    {(100 - currentTeamMetrics.productionBicolor.pourcentageBicolor).toFixed(1)}% du volume
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 pt-1">
                Le procédé bicolore nécessite une synchronisation d'injection matière A (corps) et matière B (semelle/logo) sans bavure aux interfaces.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 2: INDICATEUR QUALITÉ (EXIGENCES PROMPT ITEM 2) */}
      {/* ========================================================================= */}
      {activeSubTab === 'quality' && (
        <div className="space-y-6">
          {/* Team Switcher */}
          <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl w-fit">
            {(['A', 'B', 'C'] as const).map((tCode) => (
              <button
                key={tCode}
                onClick={() => setSelectedTeamTab(tCode)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
                  selectedTeamTab === tCode ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Équipe {tCode}
              </button>
            ))}
          </div>

          {/* Formules Qualité Normalisées */}
          <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-md">
            <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              Formules Qualité Automatiques ({currentTeamMetrics.teamName}) :
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-300 font-mono">
              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700">
                <span className="text-slate-400">Taux de conformité =</span> (Paires conformes ÷ Paires brutes) × 100 <br />
                <strong className="text-emerald-400 text-lg font-black">{currentTeamMetrics.tauxConformite}%</strong>
              </div>
              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700">
                <span className="text-slate-400">Taux de défaut =</span> ((2ème + 3ème + Rebut non récup.) ÷ Paires brutes) × 100 <br />
                <strong className="text-rose-400 text-lg font-black">{currentTeamMetrics.tauxDefaut}%</strong>
              </div>
            </div>
            <div className="mt-2 text-[11px] text-emerald-300 font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Règle stricte respectée : Aucune paire n'est comptabilisée en double (partition exacte des paires brutes).
            </div>
          </div>

          {/* 5 Cartes de Décomposition Séparée (Exigence Prompt Item 2) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* 1. Taux de Conformité */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-[11px] text-emerald-700 font-bold uppercase tracking-wider">Taux de Conformité</div>
              <div className="text-2xl font-black text-emerald-700 font-mono mt-1">
                {currentTeamMetrics.tauxConformite}%
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                {currentTeamMetrics.pairesConformes.toLocaleString('fr-FR')} paires 1er choix
              </div>
            </div>

            {/* 2. 2ème Choix */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-[11px] text-amber-700 font-bold uppercase tracking-wider">2ème Choix</div>
              <div className="text-2xl font-black text-amber-700 font-mono mt-1">
                {currentTeamMetrics.secondChoix} <span className="text-xs font-sans font-bold text-slate-400">paires</span>
              </div>
              <div className="text-[10px] text-amber-600 mt-1">
                {currentTeamMetrics.pairesBrutes > 0 ? ((currentTeamMetrics.secondChoix / currentTeamMetrics.pairesBrutes) * 100).toFixed(2) : 0}% des brutes
              </div>
            </div>

            {/* 3. 3ème Choix */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-[11px] text-orange-700 font-bold uppercase tracking-wider">3ème Choix</div>
              <div className="text-2xl font-black text-orange-700 font-mono mt-1">
                {currentTeamMetrics.troisiemeChoix} <span className="text-xs font-sans font-bold text-slate-400">paires</span>
              </div>
              <div className="text-[10px] text-orange-600 mt-1">
                {currentTeamMetrics.pairesBrutes > 0 ? ((currentTeamMetrics.troisiemeChoix / currentTeamMetrics.pairesBrutes) * 100).toFixed(2) : 0}% des brutes
              </div>
            </div>

            {/* 4. Rebut Récupérable */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-[11px] text-blue-700 font-bold uppercase tracking-wider">Rebut Récupérable</div>
              <div className="text-2xl font-black text-blue-800 font-mono mt-1">
                {currentTeamMetrics.rebutRecuperable} <span className="text-xs font-sans font-bold text-slate-400">paires</span>
              </div>
              <div className="text-[10px] text-blue-600 mt-1">
                Broyable & réinjectable semelle
              </div>
            </div>

            {/* 5. Rebut Non Récupérable */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-[11px] text-rose-700 font-bold uppercase tracking-wider">Rebut Non Récupérable</div>
              <div className="text-2xl font-black text-rose-700 font-mono mt-1">
                {currentTeamMetrics.rebutNonRecuperable} <span className="text-xs font-sans font-bold text-slate-400">paires</span>
              </div>
              <div className="text-[10px] text-rose-600 mt-1">
                Déchet définitif (brûlé/souillé)
              </div>
            </div>
          </div>

          {/* Répartition Visuelle Qualité (PieChart & Table) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-900">
                Répartition des Choix & Rebuts ({currentTeamMetrics.teamName})
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={defectPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(1)}%)`}
                    >
                      {defectPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Comparatif Qualité 3 Équipes */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-900">
                Taux de Conformité & Défauts (A vs B vs C)
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: 'bold' }} />
                    <YAxis tick={{ fontSize: 11 }} unit="%" domain={[85, 100]} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="tauxConformite" name="Conformité %" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 3: CONSOMMATION MATIÈRE (EXIGENCES PROMPT ITEM 3) */}
      {/* ========================================================================= */}
      {activeSubTab === 'material' && (
        <div className="space-y-6">
          {/* Team Switcher */}
          <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl w-fit">
            {(['A', 'B', 'C'] as const).map((tCode) => (
              <button
                key={tCode}
                onClick={() => setSelectedTeamTab(tCode)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
                  selectedTeamTab === tCode ? 'bg-amber-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Équipe {tCode}
              </button>
            ))}
          </div>

          {/* Formules et Alertes Consommation Matière */}
          <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-md">
            <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Scale className="w-4 h-4" />
              Calculs Matière ({currentTeamMetrics.teamName}) :
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-300 font-mono">
              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700">
                <span className="text-slate-400">Consommation par paire =</span> Poids consommé ÷ Paires produites <br />
                <strong className="text-white text-base">
                  {currentTeamMetrics.consoMoyenneKgParPaire.toFixed(4)} kg <span className="text-xs text-amber-300">({currentTeamMetrics.consoMoyenneGrammesParPaire} g)</span>
                </strong>
              </div>
              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700">
                <span className="text-slate-400">Écart Matière =</span> Consommation réelle - Standard théorique <br />
                <strong className={`text-base ${currentTeamMetrics.ecartGlobalKg > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {currentTeamMetrics.ecartGlobalKg > 0 ? `+${currentTeamMetrics.ecartGlobalKg} kg` : `${currentTeamMetrics.ecartGlobalKg} kg`}
                  {' '}({currentTeamMetrics.ecartGlobalPourcentage > 0 ? `+${currentTeamMetrics.ecartGlobalPourcentage}%` : `${currentTeamMetrics.ecartGlobalPourcentage}%`})
                </strong>
              </div>
              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700">
                <span className="text-slate-400">Statut Seuil (+{overConsumptionThresholdPct}%) :</span> <br />
                {currentTeamMetrics.hasOverConsumptionAlert ? (
                  <span className="text-rose-400 font-bold flex items-center gap-1 text-sm">
                    <AlertTriangle className="w-4 h-4" /> DÉPASSEMENT SEUIL
                  </span>
                ) : (
                  <span className="text-emerald-400 font-bold flex items-center gap-1 text-sm">
                    <CheckCircle2 className="w-4 h-4" /> CONFORME AU STANDARD
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Tableau Détaillé par Modèle, Pointure, Couleur & Matière (Exigence Prompt Item 3) */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Détail Consommation par Lot, Matière & Modèle ({currentTeamMetrics.teamName})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Analyse précise du poids consommé, calcul du ratio kg/paire et détection des écarts au standard.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-mono bg-slate-100 text-slate-700 font-bold">
                {currentTeamMetrics.matiereDetails.length} fiches
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200">
                    <th className="py-3 px-4">Modèle</th>
                    <th className="py-3 px-4">Matière</th>
                    <th className="py-3 px-4">Couleur</th>
                    <th className="py-3 px-4">Pointure</th>
                    <th className="py-3 px-4 text-right">Paires produites</th>
                    <th className="py-3 px-4 text-right">Poids consommé</th>
                    <th className="py-3 px-4 text-right">Conso / Paire (Réelle)</th>
                    <th className="py-3 px-4 text-right">Standard théorique</th>
                    <th className="py-3 px-4 text-right">Écart kg</th>
                    <th className="py-3 px-4 text-right">Écart %</th>
                    <th className="py-3 px-4 text-center">Alerte</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {currentTeamMetrics.matiereDetails.map((lot, idx) => (
                    <tr key={idx} className={lot.isOverThreshold ? 'bg-rose-50/50 hover:bg-rose-50' : 'hover:bg-slate-50'}>
                      <td className="py-3 px-4 font-sans font-bold text-slate-900">
                        {lot.modele}
                      </td>
                      <td className="py-3 px-4 font-sans">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                          {lot.matiere}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-sans text-slate-600">
                        {lot.couleur}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">
                        {lot.pointure}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        {lot.pairesProduites}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-800">
                        {lot.poidsConsommeKg} kg
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-blue-700">
                        {lot.consoParPaireKg.toFixed(3)} kg ({lot.consoParPaireGrammes}g)
                      </td>
                      <td className="py-3 px-4 text-right text-slate-500">
                        {lot.consoStandardKg.toFixed(3)} kg
                      </td>
                      <td className={`py-3 px-4 text-right font-bold ${lot.ecartMatiereKg > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {lot.ecartMatiereKg > 0 ? `+${lot.ecartMatiereKg}` : lot.ecartMatiereKg} kg
                      </td>
                      <td className={`py-3 px-4 text-right font-bold ${lot.ecartMatierePourcentage > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {lot.ecartMatierePourcentage > 0 ? `+${lot.ecartMatierePourcentage}%` : `${lot.ecartMatierePourcentage}%`}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {lot.isOverThreshold ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 flex items-center justify-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Alerte
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            OK
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 4: RENDEMENT & EFFICACITÉ (EXIGENCES PROMPT ITEM 4) */}
      {/* ========================================================================= */}
      {activeSubTab === 'yield' && (
        <div className="space-y-6">
          {/* Team Switcher */}
          <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl w-fit">
            {(['A', 'B', 'C'] as const).map((tCode) => (
              <button
                key={tCode}
                onClick={() => setSelectedTeamTab(tCode)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
                  selectedTeamTab === tCode ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Équipe {tCode}
              </button>
            ))}
          </div>

          {/* Formules Rendement et Efficacité Machine */}
          <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-md">
            <div className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Gauge className="w-4 h-4" />
              Calculs Rendement & Productivité ({currentTeamMetrics.teamName}) :
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-300 font-mono">
              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700">
                <span className="text-slate-400">Rendement horaire =</span> Paires conformes ÷ Heures réelles de production <br />
                <strong className="text-cyan-400 text-lg font-black">{currentTeamMetrics.rendementHoraire} paires / heure</strong>
              </div>
              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700">
                <span className="text-slate-400">Efficacité machine =</span> (Production réelle ÷ Capacité théorique) × 100 <br />
                <strong className="text-emerald-400 text-lg font-black">{currentTeamMetrics.efficaciteMachine}%</strong>
              </div>
            </div>
          </div>

          {/* Cartes Données de Temps (Exigence Prompt Item 4) */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-[11px] text-slate-500 font-bold uppercase">Temps de Production</div>
              <div className="text-xl font-black text-slate-900 font-mono mt-1">
                {currentTeamMetrics.tempsProductionHeures} h
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {currentTeamMetrics.tempsProductionMinutes} minutes actives
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-[11px] text-amber-700 font-bold uppercase">Temps d'Arrêt Total</div>
              <div className="text-xl font-black text-amber-700 font-mono mt-1">
                {currentTeamMetrics.tempsArretMinutes} min
              </div>
              <div className="text-[10px] text-amber-600 mt-0.5">
                {currentTeamMetrics.tempsArretHeures} heures d'arrêt
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-[11px] text-blue-700 font-bold uppercase">Changement Modèle</div>
              <div className="text-xl font-black text-blue-800 font-mono mt-1">
                {currentTeamMetrics.tempsChangementModeleMinutes} min
              </div>
              <div className="text-[10px] text-blue-600 mt-0.5">
                Montage/démontage moules
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-[11px] text-rose-700 font-bold uppercase">Temps Maintenance</div>
              <div className="text-xl font-black text-rose-700 font-mono mt-1">
                {currentTeamMetrics.tempsMaintenanceMinutes} min
              </div>
              <div className="text-[10px] text-rose-600 mt-0.5">
                Purges, pannes, buses
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-[11px] text-cyan-700 font-bold uppercase">Paires Conformes/h</div>
              <div className="text-xl font-black text-cyan-700 font-mono mt-1">
                {currentTeamMetrics.rendementHoraire}
              </div>
              <div className="text-[10px] text-cyan-600 mt-0.5">
                Efficacité : {currentTeamMetrics.efficaciteMachine}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 6: REGISTRE DES FICHES VALIDÉES EXCLUSIVEMENT PRISES EN COMPTE   */}
      {/* ========================================================================= */}
      {activeSubTab === 'fiches_list' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                Registre des Fiches de Production Traitées
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Toutes les évaluations sont calculées à 100% sur ces enregistrements réels vérifiés par le chef d'atelier.
              </p>
            </div>

            <div className="relative">
              <input
                type="text"
                value={fichesSearchQuery}
                onChange={(e) => setFichesSearchQuery(e.target.value)}
                placeholder="Rechercher lot, modèle, opérateur..."
                className="pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none w-64"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200">
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Équipe</th>
                  <th className="py-3 px-3">Machine</th>
                  <th className="py-3 px-3">Modèle</th>
                  <th className="py-3 px-3">Opérateur</th>
                  <th className="py-3 px-3 text-right">Cycles</th>
                  <th className="py-3 px-3 text-right">Paires brutes</th>
                  <th className="py-3 px-3 text-right">Conformes</th>
                  <th className="py-3 px-3 text-right">2ème choix</th>
                  <th className="py-3 px-3 text-right">Rebuts</th>
                  <th className="py-3 px-3 text-center">Validation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {filteredEntries
                  .filter((entry) => {
                    if (!fichesSearchQuery.trim()) return true;
                    const q = fichesSearchQuery.toLowerCase();
                    return (
                      entry.modelName.toLowerCase().includes(q) ||
                      entry.operatorName.toLowerCase().includes(q) ||
                      (entry.batchNumber && entry.batchNumber.toLowerCase().includes(q))
                    );
                  })
                  .map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{entry.date}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          entry.shift === 'matin' ? 'bg-blue-100 text-blue-800' : entry.shift === 'soir' ? 'bg-amber-100 text-amber-800' : 'bg-purple-100 text-purple-800'
                        }`}>
                          {entry.shift === 'matin' ? 'Équipe A' : entry.shift === 'soir' ? 'Équipe B' : 'Équipe C'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-sans text-slate-700">{entry.machineCode || entry.machineId}</td>
                      <td className="py-2.5 px-3 font-sans font-bold text-slate-900">{entry.modelName}</td>
                      <td className="py-2.5 px-3 font-sans text-slate-600">{entry.operatorName}</td>
                      <td className="py-2.5 px-3 text-right font-bold">{entry.cycles || entry.qtyProduced}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">{entry.qtyProduced}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-700">{entry.qtyConforming}</td>
                      <td className="py-2.5 px-3 text-right text-amber-600">{entry.secondChoicePairs || entry.qtySecondChoice || 0}</td>
                      <td className="py-2.5 px-3 text-right text-rose-600">{entry.qtyRejected || 0}</td>
                      <td className="py-2.5 px-3 text-center">
                        {entry.verifiedByChef ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 font-sans">
                            <CheckCircle2 className="w-3 h-3" /> Validée
                          </span>
                        ) : (
                          <button
                            onClick={() => toggleVerifyEntry(entry.id)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-800 font-sans transition"
                          >
                            Valider
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
