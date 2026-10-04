import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Factory,
  Plus,
  Calendar,
  Gauge,
  Users,
  Box,
  Layers,
  ArrowUpDown,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Trash2,
  Info,
  RotateCcw,
  Check,
  Clock,
  ShieldCheck,
  FileText,
  Sparkles,
  Palette,
  Eye,
  Sliders,
  Power,
  Zap,
  Target,
} from 'lucide-react';
import { getPairsPerCarton } from '../../data/ctpFactoryErpData';
import { CtpEva3Jour15Panel } from './CtpEva3Jour15Panel';
import { EvaMachineStationManager } from './EvaMachineStationManager';
import { EvaStationConfig, EvaStationMode } from '../../types/evaProductionLogic';
import {
  createDefaultEvaStationsConfig,
  calculateStationPairsPerCycle,
  calculateEvaMachineKpis,
  THEORETICAL_MAX_PAIRS_PER_CYCLE,
} from '../../utils/evaStationEngine';

const STANDARD_COLORS = ['Noir', 'Blanc', 'Bleu Marine', 'Rouge', 'Gris', 'Beige', 'Marron', 'Bicolor Bleu/Blanc'];

const getColorPreviewHex = (colorName?: string): string => {
  if (!colorName) return '#3b82f6';
  const c = colorName.toLowerCase();
  if (c.includes('noir') || c.includes('black')) return '#1e293b';
  if (c.includes('blanc') || c.includes('white')) return '#f8fafc';
  if (c.includes('bleu') || c.includes('navy')) return '#2563eb';
  if (c.includes('rouge') || c.includes('red')) return '#dc2626';
  if (c.includes('gris') || c.includes('grey') || c.includes('gray')) return '#64748b';
  if (c.includes('beige')) return '#d4b996';
  if (c.includes('vert') || c.includes('green')) return '#16a34a';
  if (c.includes('marron') || c.includes('brown')) return '#854d0e';
  if (c.includes('bicolor') || c.includes('bi-couleur')) return '#9333ea';
  return '#3b82f6';
};

export const CtpProductionView: React.FC = () => {
  const {
    ctpProduction,
    addCtpProductionEntry,
    deleteCtpProductionEntry,
    productionEntries,
    toggleVerifyEntry,
    deleteProductionEntry,
    restoreDefaultErpData,
    ctpCatalogue,
    setActiveTab: setGlobalActiveTab,
  } = useApp();

  // Navigation tab: 'journal' | 'fiches' | 'eva3' | 'eva_stations' (architecture 6 stations • 12 moules • 2 injecteurs)
  const [activeTab, setActiveTab] = useState<'journal' | 'fiches' | 'eva3' | 'eva_stations'>('journal');
  const [showStationManagerInline, setShowStationManagerInline] = useState<boolean>(false);

  // Search & filter states for fiches détaillées
  const [searchFiches, setSearchFiches] = useState<string>('');
  const [filterShiftFiches, setFilterShiftFiches] = useState<string>('all');
  const [filterMachineFiches, setFilterMachineFiches] = useState<string>('all');

  // Form states
  const todayStr = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState<string>(todayStr);
  const [machine, setMachine] = useState<'EVA 1' | 'EVA 2' | 'EVA 3'>('EVA 1');
  const [stationNumber, setStationNumber] = useState<number>(1);

  // Configuration des 6 stations pour la machine sélectionnée
  const [evaStations, setEvaStations] = useState<EvaStationConfig[]>(() => {
    try {
      const saved = localStorage.getItem(`ctp_eva_stations_${machine}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 6) return parsed;
      }
    } catch (e) {}
    return createDefaultEvaStationsConfig(machine);
  });

  // Recharger les 6 stations si la machine change
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(`ctp_eva_stations_${machine}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 6) {
          setEvaStations(parsed);
          return;
        }
      }
    } catch (e) {}
    setEvaStations(createDefaultEvaStationsConfig(machine));
  }, [machine]);

  const handleStationsChange = (updated: EvaStationConfig[]) => {
    setEvaStations(updated);
    try {
      localStorage.setItem(`ctp_eva_stations_${machine}`, JSON.stringify(updated));
    } catch (e) {}
  };

  const currentStationConfig = useMemo(() => {
    return evaStations.find((s) => s.stationNumber === stationNumber) || evaStations[0];
  }, [evaStations, stationNumber]);
  const [equipe, setEquipe] = useState<'A' | 'B' | 'C'>('A');
  const [modele, setModele] = useState<string>('NM');
  const [pointure, setPointure] = useState<string>('40-44');
  const [referenceMoule, setReferenceMoule] = useState<string>('M-NM-40/44');
  const [customModele, setCustomModele] = useState<string>('');
  const [useCustomModele, setUseCustomModele] = useState<boolean>(false);

  // Color selection
  const [selectedColor, setSelectedColor] = useState<string>('Noir');
  const [customColor, setCustomColor] = useState<string>('');
  const [isCustomColor, setIsCustomColor] = useState<boolean>(false);
  const activeColor = isCustomColor ? (customColor.trim() || 'Personnalisé') : selectedColor;

  // Machine counters (1 = 1 pair rule)
  // Ex: 818500 -> 819104 = 604 pairs
  const [compteurDebut, setCompteurDebut] = useState<number>(818500);
  const [compteurFin, setCompteurFin] = useState<number>(819104);
  const [manualPaires, setManualPaires] = useState<string>(''); // If operator wants to override
  const [cartonsOuverts, setCartonsOuverts] = useState<number>(0);
  const [observations, setObservations] = useState<string>('');

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Table filtering and sorting
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [filterMachine, setFilterMachine] = useState<string>('all');
  const [filterEquipe, setFilterEquipe] = useState<string>('all');
  const [filterModele, setFilterModele] = useState<string>('all');
  const [filterStation, setFilterStation] = useState<string>('all');

  type SortKey = 'date' | 'machine' | 'equipe' | 'modele' | 'pointure' | 'compteur_debut' | 'compteur_fin' | 'paires' | 'cartons_pleins' | 'ecart_compteur';
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Resolved active model name
  const activeModele = useCustomModele ? customModele.trim().toUpperCase() : modele;
  const isNM = activeModele === 'NM' || activeModele.startsWith('NM ') || activeModele.includes('NM');

  // Auto calculated values
  const deltaCompteur = Math.max(0, compteurFin - compteurDebut);
  const pairesCalculees = manualPaires !== '' && !isNaN(Number(manualPaires)) ? Number(manualPaires) : deltaCompteur;
  
  // Rule: TOUS les modèles NM se calculent à 12 paires par carton. Si NM non trouvé dans ancien catalogue, autorise quand même avec 12.
  const pairesParCarton = isNM ? 12 : getPairsPerCarton(activeModele, pointure);
  const cartonsPleinsCalcules = Math.floor(pairesCalculees / pairesParCarton);
  const restePairesOuvertes = pairesCalculees % pairesParCarton;
  const ecartCompteur = deltaCompteur - pairesCalculees;

  // Calculs dynamiques de l'architecture EVA (6 stations • 12 moules • 2 injecteurs)
  const machineKpis = useMemo(() => {
    return calculateEvaMachineKpis(evaStations, deltaCompteur, pairesCalculees);
  }, [evaStations, deltaCompteur, pairesCalculees]);

  // Handle Form Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!activeModele) {
      setNotification({ type: 'error', message: 'Veuillez sélectionner ou saisir un modèle.' });
      return;
    }

    if (compteurFin < compteurDebut) {
      setNotification({ type: 'error', message: 'Le compteur fin ne peut pas être inférieur au compteur début.' });
      return;
    }

    const modeLabel = currentStationConfig.productionMode === 'bicolor' ? 'Bicolor (Semelle+Coque)' : '1 Couleur';
    const moulesLabel = `${(currentStationConfig.mould1Active ? 1 : 0) + (currentStationConfig.mould2Active ? 1 : 0)}/2 moules`;
    const stationSpecs = `St. ${stationNumber} [${modeLabel} • ${moulesLabel} • ${currentStationConfig.pairsPerCycle} p/c] • Machine engagée: ${machineKpis.engagedCapacityPerCycle}/24 p/c (${machineKpis.utilizationRatePercent}%)`;

    const res = addCtpProductionEntry({
      date,
      machine,
      equipe,
      modele: activeModele,
      pointure,
      station_number: stationNumber,
      couleur: activeColor,
      compteur_debut: compteurDebut,
      compteur_fin: compteurFin,
      paires: pairesCalculees,
      cartons_ouverts: cartonsOuverts !== 0 ? cartonsOuverts : restePairesOuvertes,
      observations: observations
        ? `${observations} | Moule: ${referenceMoule} | ${stationSpecs}`
        : `Moule: ${referenceMoule} | ${stationSpecs}`,
    });

    if (res.success) {
      setNotification({
        type: 'success',
        message: `${res.message} — [${machine} • St. ${stationNumber} • Équipe ${equipe} • ${activeModele} • ${pointure} • ${activeColor}]`,
      });
      // Prep next shift counter
      setCompteurDebut(compteurFin);
      setCompteurFin(compteurFin + 600);
      setManualPaires('');
      setObservations('');
      setCartonsOuverts(0);
      setTimeout(() => setNotification(null), 5000);
    }
  };

  // Quick select pointures for current model
  const availablePointures = useMemo(() => {
    if (isNM) {
      return ['28-35', '36-41', '36-39', '40-44'];
    }
    const catVariants = ctpCatalogue.filter((c) => c.code.toUpperCase() === activeModele.toUpperCase());
    if (catVariants.length > 0) {
      return catVariants.map((c) => c.pointure);
    }
    return ['28-35', '36-41', '36-39', '40-44', '23-28', '39-44'];
  }, [activeModele, isNM, ctpCatalogue]);

  // Filtered & Sorted Table data
  const filteredRecords = useMemo(() => {
    return ctpProduction.filter((rec) => {
      const matchSearch =
        rec.modele.toLowerCase().includes(searchFilter.toLowerCase()) ||
        rec.pointure.toLowerCase().includes(searchFilter.toLowerCase()) ||
        rec.machine.toLowerCase().includes(searchFilter.toLowerCase()) ||
        (rec.couleur || '').toLowerCase().includes(searchFilter.toLowerCase()) ||
        (rec.observations || '').toLowerCase().includes(searchFilter.toLowerCase());

      const matchMachine = filterMachine === 'all' || rec.machine === filterMachine;
      const matchEquipe = filterEquipe === 'all' || rec.equipe === filterEquipe;
      const matchModele = filterModele === 'all' || rec.modele.toUpperCase().includes(filterModele.toUpperCase());
      const matchStation = filterStation === 'all' || String(rec.station_number || 1) === filterStation;

      return matchSearch && matchMachine && matchEquipe && matchModele && matchStation;
    });
  }, [ctpProduction, searchFilter, filterMachine, filterEquipe, filterModele, filterStation]);

  const sortedRecords = useMemo(() => {
    return [...filteredRecords].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }
      const strA = String(valA || '');
      const strB = String(valB || '');
      return sortDirection === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
  }, [filteredRecords, sortKey, sortDirection]);

  // Filtered detailed production sheets (productionEntries)
  const filteredFiches = useMemo(() => {
    return productionEntries.filter((p) => {
      if (filterShiftFiches !== 'all' && p.shift !== filterShiftFiches) return false;
      if (filterMachineFiches !== 'all' && p.machineId !== filterMachineFiches) return false;
      if (searchFiches.trim()) {
        const q = searchFiches.toLowerCase();
        return (
          p.modelName.toLowerCase().includes(q) ||
          p.machineId.toLowerCase().includes(q) ||
          (p.color1 && p.color1.toLowerCase().includes(q)) ||
          (p.operatorName && p.operatorName.toLowerCase().includes(q)) ||
          (p.notes && p.notes.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [productionEntries, filterShiftFiches, filterMachineFiches, searchFiches]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Date', 'Machine', 'Station', 'Équipe', 'Modèle', 'Pointure', 'Couleur', 'Compteur Début', 'Compteur Fin', 'Paires Produites', 'Cartons Pleins', 'Cartons Ouverts', 'Écart Compteur', 'Observations'];
    const rows = sortedRecords.map((r) => [
      r.date,
      r.machine,
      `Station ${r.station_number || 1}`,
      r.equipe,
      r.modele,
      r.pointure,
      r.couleur || 'Non spécifié',
      r.compteur_debut,
      r.compteur_fin,
      r.paires,
      r.cartons_pleins || Math.floor(r.paires / 12),
      r.cartons_ouverts,
      r.ecart_compteur || 0,
      `"${(r.observations || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CTP_Production_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-slate-800">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 bg-blue-500/20 text-blue-300 text-xs font-semibold rounded border border-blue-400/30 uppercase tracking-wider">
                Module 1 • Atelier Injection EVA
              </span>
              <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 text-xs font-semibold rounded border border-emerald-400/30">
                Machines EVA 1 / EVA 2 / EVA 3
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Interface Production (Saisie Atelier)
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              Enregistrement des sorties machine au poste. Règle stricte CTP : <strong>Compteur 1 = 1 paire</strong>, et{' '}
              <strong className="text-amber-300">tous les modèles NM se calculent à 12 paires par carton</strong>.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <button
              onClick={() => setGlobalActiveTab('machine_eva')}
              className="flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-md ring-2 ring-indigo-400/40"
              title="Accès au Système de Pilotage Industriel EVA 12 Stations"
            >
              <Factory className="w-4 h-4 text-amber-300" />
              <span>Pilotage Machine EVA (12 Stations)</span>
            </button>

            <button
              onClick={() => setGlobalActiveTab('ctp_tracker')}
              className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-black transition shadow-sm active:scale-95"
              title="Accès au CTP SMART Production Tracker - Saisie & Calculs Équipes/Machines"
            >
              <Target className="w-4 h-4" />
              <span>🎯 Production Tracker</span>
            </button>

            <button
              onClick={() => setGlobalActiveTab('fiche_suivi')}
              className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-sm"
              title="Accès complet à la Fiche de Suivi de Production"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Fiche de Suivi Officielle</span>
            </button>

            <button
              onClick={() => setGlobalActiveTab('model_master')}
              className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-sm"
              title="Consulter le Référentiel des Modèles Produits"
            >
              <Box className="w-4 h-4" />
              <span>Modèles Produits</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-medium border border-slate-700 transition-colors shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span className="text-sm font-medium">{notification.message}</span>
        </div>
      )}

      {/* SUB-TABS & SYNCHRO BUTTON */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('journal')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'journal'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Factory className="w-4 h-4" />
            <span>Journal Quotidien EVA ({ctpProduction.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('fiches')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'fiches'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Fiches Détaillées Postes ({productionEntries.length})</span>
          </button>

          <button
            onClick={() => setGlobalActiveTab('ctp_flow')}
            className="px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm hover:from-purple-700 hover:to-indigo-700 active:scale-95"
            title="Calcul dynamique des cartons basé sur le flux physique réel (3 étapes / couleurs)"
          >
            <Layers className="w-4 h-4 text-purple-200" />
            <span>Flux Réel (3 Étapes) &rarr;</span>
          </button>

          <button
            onClick={() => setActiveTab('eva_stations')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'eva_stations'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
            }`}
            title="Configuration précise des 6 stations, 12 moules et 2 injecteurs"
          >
            <Sliders className="w-4 h-4 text-indigo-500" />
            <span>Architecture 6 Stations ({machineKpis.engagedCapacityPerCycle}/24 p/c)</span>
          </button>

          <button
            onClick={() => setActiveTab('eva3')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'eva3'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Simulation Jour 15 • EVA 3</span>
          </button>

          <button
            onClick={() => setGlobalActiveTab('team_evaluation')}
            className="px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 shadow-sm"
            title="Consulter les 4 indicateurs et le comparatif dynamique des équipes A, B et C"
          >
            <Users className="w-4 h-4 text-indigo-600" />
            <span>Évaluation Équipes A/B/C &rarr;</span>
          </button>
        </div>

        <button
          onClick={() => restoreDefaultErpData()}
          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
          title="Restaurer et synchroniser les fiches de base Production CTP"
        >
          <RotateCcw className="w-4 h-4 text-slate-500" />
          <span>Synchro Fiches Production</span>
        </button>
      </div>

      {activeTab === 'journal' && (
        <>
          {/* FORMULAIRE DE SAISIE */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Factory className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">
              Formulaire de Saisie Quotidienne Production
            </h2>
          </div>
          <div className="text-xs text-slate-500 font-medium hidden sm:block">
            Formule active : <span className="font-mono font-bold text-blue-600">Cartons = Paires / {pairesParCarton}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Chaîne d'identification de production CTP */}
          <div className="bg-slate-900 text-white p-3.5 sm:p-4 rounded-xl flex flex-wrap items-center gap-2 text-xs font-medium border border-slate-800 shadow-sm">
            <span className="text-slate-400 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Traçabilité Machine &rarr; Couleur :
            </span>
            <span className="px-2 py-0.5 bg-blue-600/40 text-blue-300 rounded font-bold">{machine}</span>
            <span className="text-slate-600">&rarr;</span>
            <span className="px-2 py-0.5 bg-indigo-600/40 text-indigo-300 rounded font-bold">Station {stationNumber}</span>
            <span className="text-slate-600">&rarr;</span>
            <span className="px-2 py-0.5 bg-emerald-600/40 text-emerald-300 rounded font-bold">Équipe {equipe}</span>
            <span className="text-slate-600">&rarr;</span>
            <span className="px-2 py-0.5 bg-amber-600/40 text-amber-300 rounded font-bold">{activeModele}</span>
            <span className="text-slate-600">&rarr;</span>
            <span className="px-2 py-0.5 bg-purple-600/40 text-purple-300 rounded font-bold">{referenceMoule || 'Moule std'}</span>
            <span className="text-slate-600">&rarr;</span>
            <span className="px-2 py-0.5 bg-cyan-600/40 text-cyan-300 rounded font-bold">{pointure}</span>
            <span className="text-slate-600">&rarr;</span>
            <span className="px-2 py-0.5 bg-rose-600/40 text-rose-300 rounded font-bold flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: getColorPreviewHex(activeColor) }} />
              {activeColor}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* 1. Date */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-slate-400" />
                Date de production
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            {/* 2. Machine */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
                <Gauge className="w-4 h-4 text-slate-400" />
                Machine EVA (6 Stations • 12 Moules)
              </label>
              <select
                value={machine}
                onChange={(e) => setMachine(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="EVA 1">Machine EVA 1 (6 Stations • 12 Moules • 24 p/c max)</option>
                <option value="EVA 2">Machine EVA 2 (6 Stations • 12 Moules • 24 p/c max)</option>
                <option value="EVA 3">Machine EVA 3 (6 Stations • 12 Moules • 24 p/c max)</option>
              </select>
            </div>

            {/* 3. Équipe */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-slate-400" />
                Équipe
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['A', 'B', 'C'] as const).map((eq) => (
                  <button
                    key={eq}
                    type="button"
                    onClick={() => setEquipe(eq)}
                    className={`py-2 text-sm font-bold rounded-xl border transition-all ${
                      equipe === eq
                        ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Équipe {eq}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Modèle (NM, BC07, SB101, etc.) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Box className="w-4 h-4 text-slate-400" />
                  Modèle
                </label>
                <button
                  type="button"
                  onClick={() => setUseCustomModele(!useCustomModele)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold underline"
                >
                  {useCustomModele ? 'Choisir dans liste' : 'Saisie libre'}
                </button>
              </div>

              {useCustomModele ? (
                <input
                  type="text"
                  placeholder="Ex: NM, BC07, SB101..."
                  value={customModele}
                  onChange={(e) => {
                    setCustomModele(e.target.value);
                    if (e.target.value) setReferenceMoule(`M-${e.target.value.toUpperCase()}-${pointure}`);
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 uppercase focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              ) : (
                <select
                  value={modele}
                  onChange={(e) => {
                    setModele(e.target.value);
                    setReferenceMoule(`M-${e.target.value}-${pointure}`);
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="NM">⭐ NOUVEAU MODÈLE NM (12 paires/carton)</option>
                  <option value="BC07">BC07 (16 paires/carton)</option>
                  <option value="SB101">SB101 (24 paires/carton)</option>
                  <option value="SB23">SB23 (24 paires/carton)</option>
                  <option value="003">003 MOCASSIN (14 paires/carton)</option>
                </select>
              )}
            </div>
          </div>

          {/* SECTION ARCHITECTURE MACHINE EVA (6 STATIONS • 12 MOULES • 2 INJECTEURS) */}
          <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Gauge className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <span>Architecture 6 Stations — {machine}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                      Capacité réelle engagée : {machineKpis.engagedCapacityPerCycle} / 24 p/cycle
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    2 moules & 2 injecteurs par station • 1 couleur = 2 p/moule (max 4 p/c) • Bicolor = semelle+coque (2 p/c)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-2.5 py-1 bg-slate-800 text-amber-400 rounded-lg border border-slate-700">
                  Utilisation : {machineKpis.utilizationRatePercent}%
                </span>
                <button
                  type="button"
                  onClick={() => setShowStationManagerInline(!showStationManagerInline)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>{showStationManagerInline ? 'Masquer Réglages Ligne' : 'Ajuster les 6 Stations'}</span>
                </button>
              </div>
            </div>

            {/* Panneau dépliable du Station Manager Complet */}
            {showStationManagerInline && (
              <div className="pt-2">
                <EvaMachineStationManager
                  machineCode={machine}
                  stations={evaStations}
                  onStationsChange={handleStationsChange}
                  compteurDebut={compteurDebut}
                  compteurFin={compteurFin}
                  productionReelle={pairesCalculees}
                />
              </div>
            )}

            {/* SÉLECTEUR RAPIDE DES 6 STATIONS */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-indigo-400" />
                  Sélection du Poste de Travail (Stations 1 à 6)
                </label>
                <span className="text-xs font-bold text-indigo-300 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800">
                  Station {stationNumber} active : {currentStationConfig.pairsPerCycle} paires/cycle
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {evaStations.map((st) => {
                  const isSelected = stationNumber === st.stationNumber;
                  const isStActive = st.active && st.productionMode !== 'inactif';
                  const isBicolor = st.productionMode === 'bicolor';

                  return (
                    <button
                      key={st.stationNumber}
                      type="button"
                      onClick={() => {
                        setStationNumber(st.stationNumber);
                        if (st.pointure && isNM) setPointure(st.pointure);
                      }}
                      className={`p-2.5 rounded-xl border text-left transition-all relative ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-400 ring-2 ring-indigo-300 shadow-md'
                          : isStActive
                          ? isBicolor
                            ? 'bg-slate-800/90 border-purple-500/50 text-slate-200 hover:bg-slate-800'
                            : 'bg-slate-800/90 border-blue-500/50 text-slate-200 hover:bg-slate-800'
                          : 'bg-slate-800/40 border-slate-700/60 text-slate-500 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono font-bold text-xs">
                          Station {st.stationNumber}
                        </span>
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isStActive ? (isBicolor ? 'bg-purple-400' : 'bg-emerald-400') : 'bg-slate-600'
                          }`}
                        />
                      </div>
                      <div className="text-[10px] font-semibold opacity-90 truncate">
                        {!isStActive
                          ? 'Arrêtée (OFF)'
                          : isBicolor
                          ? 'Bicolor (Semelle+Coq)'
                          : '1 Couleur (2 moules)'}
                      </div>
                      <div className="text-[11px] font-mono font-black mt-1">
                        {st.pairsPerCycle} p/cycle
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* RÉGLAGES RAPIDES DE LA STATION SÉLECTIONNÉE */}
            <div className="p-3 bg-slate-800/70 border border-slate-700 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Power className="w-3.5 h-3.5 text-indigo-400" />
                  Station {stationNumber} :
                </span>
                {/* Switch ON/OFF */}
                <button
                  type="button"
                  onClick={() => {
                    const updated = evaStations.map((s) => {
                      if (s.stationNumber !== stationNumber) return s;
                      const nextActive = !s.active;
                      const next = {
                        ...s,
                        active: nextActive,
                        productionMode: nextActive
                          ? s.productionMode === 'inactif'
                            ? ('1_couleur' as EvaStationMode)
                            : s.productionMode
                          : ('inactif' as EvaStationMode),
                        mould1Active: nextActive,
                        mould2Active: nextActive,
                      };
                      next.pairsPerCycle = calculateStationPairsPerCycle(next);
                      return next;
                    });
                    handleStationsChange(updated);
                  }}
                  className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
                    currentStationConfig.active
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  <Power className="w-3 h-3" />
                  {currentStationConfig.active ? 'Active (ON)' : 'Arrêtée (OFF)'}
                </button>

                {/* Mode Selector */}
                <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-700">
                  <button
                    type="button"
                    onClick={() => {
                      const updated = evaStations.map((s) => {
                        if (s.stationNumber !== stationNumber) return s;
                        const next = { ...s, productionMode: '1_couleur' as EvaStationMode, active: true };
                        next.pairsPerCycle = calculateStationPairsPerCycle(next);
                        return next;
                      });
                      handleStationsChange(updated);
                    }}
                    className={`px-2 py-0.5 rounded font-bold text-[11px] transition ${
                      currentStationConfig.productionMode === '1_couleur' && currentStationConfig.active
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    1 Couleur
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = evaStations.map((s) => {
                        if (s.stationNumber !== stationNumber) return s;
                        const next = { ...s, productionMode: 'bicolor' as EvaStationMode, active: true };
                        next.pairsPerCycle = calculateStationPairsPerCycle(next);
                        return next;
                      });
                      handleStationsChange(updated);
                    }}
                    className={`px-2 py-0.5 rounded font-bold text-[11px] transition ${
                      currentStationConfig.productionMode === 'bicolor' && currentStationConfig.active
                        ? 'bg-purple-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Bicolor
                  </button>
                </div>
              </div>

              {/* Moules & Injecteurs */}
              <div className="flex items-center gap-3 text-slate-300">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={currentStationConfig.mould1Active && currentStationConfig.active}
                    onChange={() => {
                      const updated = evaStations.map((s) => {
                        if (s.stationNumber !== stationNumber) return s;
                        const next = { ...s, mould1Active: !s.mould1Active };
                        next.pairsPerCycle = calculateStationPairsPerCycle(next);
                        return next;
                      });
                      handleStationsChange(updated);
                    }}
                    className="w-3.5 h-3.5 text-indigo-600 rounded bg-slate-900 border-slate-600"
                  />
                  <span>Moule 1 (A)</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={currentStationConfig.mould2Active && currentStationConfig.active}
                    onChange={() => {
                      const updated = evaStations.map((s) => {
                        if (s.stationNumber !== stationNumber) return s;
                        const next = { ...s, mould2Active: !s.mould2Active };
                        next.pairsPerCycle = calculateStationPairsPerCycle(next);
                        return next;
                      });
                      handleStationsChange(updated);
                    }}
                    className="w-3.5 h-3.5 text-indigo-600 rounded bg-slate-900 border-slate-600"
                  />
                  <span>Moule 2 (B)</span>
                </label>

                <span className="font-mono font-bold text-amber-400">
                  &rarr; {currentStationConfig.pairsPerCycle} paires / cycle
                </span>
              </div>
            </div>
          </div>

          {/* SÉLECTEUR DE COULEUR & RÉFÉRENCE MOULE */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-4 bg-slate-50 rounded-xl border border-slate-200">
            {/* Couleur */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
                <Palette className="w-4 h-4 text-rose-500" />
                Couleur de la paire
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2.5">
                {STANDARD_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setSelectedColor(c);
                      setIsCustomColor(false);
                    }}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 ${
                      !isCustomColor && selectedColor === c
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block border border-black/10 shrink-0"
                      style={{ backgroundColor: getColorPreviewHex(c) }}
                    />
                    <span>{c}</span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setIsCustomColor(true)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all ${
                    isCustomColor
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Autre / Personnalisé
                </button>
              </div>

              {isCustomColor && (
                <input
                  type="text"
                  placeholder="Ex: Beige Sable, Bleu Ciel, Bicolore Noir/Rouge..."
                  value={customColor}
                  onChange={(e) => setCustomColor(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                  autoFocus
                />
              )}
            </div>

            {/* Référence Moule */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-purple-600" />
                Référence Moule
              </label>
              <input
                type="text"
                value={referenceMoule}
                onChange={(e) => setReferenceMoule(e.target.value)}
                placeholder="Ex: M-NM-40/44, MOULE-EVA-01..."
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Liaison directe avec l'outillage monté sur la station {stationNumber}.
              </p>
            </div>
          </div>

          {/* Pointure & Spécification */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 pt-2 border-t border-slate-100">
            {/* Pointure */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-slate-400" />
                Pointure / Variante
              </label>
              <select
                value={pointure}
                onChange={(e) => setPointure(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {availablePointures.map((pt) => (
                  <option key={pt} value={pt}>
                    Pointure {pt} {isNM ? '(12 paires/ctn)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Compteur Début */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Compteur Début (1 = 1 paire)
              </label>
              <input
                type="number"
                value={compteurDebut}
                onChange={(e) => setCompteurDebut(Number(e.target.value))}
                min={0}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Compteur Fin */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Compteur Fin (1 = 1 paire)
              </label>
              <input
                type="number"
                value={compteurFin}
                onChange={(e) => setCompteurFin(Number(e.target.value))}
                min={0}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Paires produites (avec calcul auto delta) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Paires Réelles Produites
                </label>
                <span className="text-xs text-slate-400 font-mono">Delta : {deltaCompteur}</span>
              </div>
              <input
                type="number"
                placeholder={`Auto : ${deltaCompteur}`}
                value={manualPaires}
                onChange={(e) => setManualPaires(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-blue-50/50 border border-blue-200 rounded-xl text-sm font-bold text-blue-900 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* KPI Calculateur Automatique (Cartons / Écart) */}
          <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-center">
            <div>
              <span className="text-xs uppercase text-slate-400 font-semibold block">Total Paires Produites</span>
              <span className="text-2xl font-black text-white">{pairesCalculees.toLocaleString('fr-FR')} p.</span>
            </div>

            <div>
              <span className="text-xs uppercase text-slate-400 font-semibold block">
                Cartons Pleins (Base {pairesParCarton})
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-amber-400">{cartonsPleinsCalcules}</span>
                <span className="text-xs text-slate-400">cartons scellés</span>
              </div>
            </div>

            <div>
              <span className="text-xs uppercase text-slate-400 font-semibold block">Cartons Ouverts / Reliquat</span>
              <span className="text-xl font-bold text-blue-300">
                {restePairesOuvertes} paires en cours
              </span>
            </div>

            <div>
              <span className="text-xs uppercase text-slate-400 font-semibold block">Écart Compteur vs Saisi</span>
              <span
                className={`text-xl font-bold flex items-center gap-1 ${
                  ecartCompteur === 0
                    ? 'text-emerald-400'
                    : ecartCompteur > 0
                    ? 'text-rose-400'
                    : 'text-amber-400'
                }`}
              >
                {ecartCompteur === 0 ? '0 (Conforme)' : `${ecartCompteur > 0 ? '+' : ''}${ecartCompteur} paires`}
              </span>
            </div>
          </div>

          {/* Observations & Submit button */}
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Observations atelier / équipe / qualité (optionnel)
              </label>
              <input
                type="text"
                placeholder="Ex : Changement de moule à 11h, 4 rebuts évacués, cadence nominale..."
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full sm:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 shrink-0"
            >
              <Plus className="w-5 h-5" />
              <span>Enregistrer la Production</span>
            </button>
          </div>
        </form>
      </div>

      {/* TABLEAU HISTORIQUE DE LA PRODUCTION */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Controls */}
        <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Historique des Saisies de Production</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {filteredRecords.length} enregistrements filtrés • Cliquez sur les colonnes pour trier
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Recherche modèle, machine..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="pl-9 pr-3.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-48 sm:w-56"
              />
            </div>

            {/* Filter Machine */}
            <select
              value={filterMachine}
              onChange={(e) => setFilterMachine(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-700 font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="all">Toutes machines</option>
              <option value="EVA 1">EVA 1</option>
              <option value="EVA 2">EVA 2</option>
              <option value="EVA 3">EVA 3</option>
            </select>

            {/* Filter Equipe */}
            <select
              value={filterEquipe}
              onChange={(e) => setFilterEquipe(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-700 font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="all">Toutes équipes</option>
              <option value="A">Équipe A</option>
              <option value="B">Équipe B</option>
              <option value="C">Équipe C</option>
            </select>

            {/* Filter Modele */}
            <select
              value={filterModele}
              onChange={(e) => setFilterModele(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-700 font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="all">Tous modèles</option>
              <option value="NM">Modèle NM</option>
              <option value="BC07">Modèle BC07</option>
              <option value="SB101">Modèle SB101</option>
            </select>

            {/* Filter Station */}
            <select
              value={filterStation}
              onChange={(e) => setFilterStation(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-700 font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="all">Toutes stations (1 à 6)</option>
              {Array.from({ length: 6 }, (_, i) => i + 1).map((s) => (
                <option key={s} value={String(s)}>Station {s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* The Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider select-none">
                <th
                  onClick={() => handleSort('date')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Date</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('machine')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Machine & Station</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('equipe')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors text-center"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Éq.</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('modele')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Modèle</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('pointure')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Pointure</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3">
                  <div className="flex items-center gap-1">
                    <span>Couleur</span>
                  </div>
                </th>
                <th
                  onClick={() => handleSort('compteur_debut')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors font-mono text-right"
                >
                  <span>Cpt Début</span>
                </th>
                <th
                  onClick={() => handleSort('compteur_fin')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors font-mono text-right"
                >
                  <span>Cpt Fin</span>
                </th>
                <th
                  onClick={() => handleSort('paires')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Paires</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('cartons_pleins')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Cartons</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3 text-center">Ctns Ouverts</th>
                <th
                  onClick={() => handleSort('ecart_compteur')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors text-center"
                >
                  <span>Écart</span>
                </th>
                <th className="py-3 px-4">Observations</th>
                <th className="py-3 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {sortedRecords.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-8 text-center text-slate-400">
                    Aucune entrée de production trouvée pour ces critères.
                  </td>
                </tr>
              ) : (
                sortedRecords.map((r) => {
                  const rIsNM = r.modele.toUpperCase().includes('NM') || r.modele.toUpperCase() === 'NM';
                  const baseCarton = rIsNM ? 12 : getPairsPerCarton(r.modele, r.pointure);
                  const cartons = r.cartons_pleins || Math.floor(r.paires / baseCarton);
                  const delta = r.ecart_compteur || 0;

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-900">
                        {r.date}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
                            {r.machine}
                          </span>
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            St. {r.station_number || 1}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="w-6 h-6 inline-flex items-center justify-center rounded-full bg-blue-100 text-blue-800 text-xs font-bold">
                          {r.equipe}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span>{r.modele}</span>
                          {rIsNM && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                              12 p/ctn
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap font-semibold text-slate-700">
                        {r.pointure}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">
                          <span
                            className="w-2 h-2 rounded-full inline-block border border-black/10 shrink-0"
                            style={{ backgroundColor: getColorPreviewHex(r.couleur) }}
                          />
                          <span>{r.couleur || 'Non spécifié'}</span>
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-xs text-slate-600">
                        {r.compteur_debut.toLocaleString('fr-FR')}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-xs text-slate-600">
                        {r.compteur_fin.toLocaleString('fr-FR')}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-slate-900">
                        {r.paires.toLocaleString('fr-FR')}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-blue-700">
                        {cartons} ctn
                      </td>
                      <td className="py-3 px-3 text-center text-xs text-slate-500">
                        {r.cartons_ouverts > 0 ? (
                          <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-medium">
                            {r.cartons_ouverts} p.
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-3 px-3 text-center text-xs">
                        {delta === 0 ? (
                          <span className="text-emerald-600 font-bold">0</span>
                        ) : delta > 0 ? (
                          <span className="text-rose-600 font-bold">+{delta}</span>
                        ) : (
                          <span className="text-amber-600 font-bold">{delta}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500 max-w-xs truncate" title={r.observations}>
                        {r.observations || '-'}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => deleteCtpProductionEntry(r.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                          title="Supprimer cette ligne"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )}

  {activeTab === 'fiches' && (
    <div className="space-y-6">
      {/* KPI Fiches Détaillées */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Conformes</span>
          <div className="text-2xl font-black text-slate-950 mt-1">
            {productionEntries.reduce((acc, p) => acc + (p.conformingQty || 0), 0).toLocaleString('fr-FR')} <span className="text-xs font-bold text-slate-500">paires</span>
          </div>
          <span className="text-[11px] text-emerald-600 font-medium">Production validée atelier</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Rebuts</span>
          <div className="text-2xl font-black text-rose-600 mt-1">
            {productionEntries.reduce((acc, p) => acc + (p.qtyRejected || 0), 0).toLocaleString('fr-FR')} <span className="text-xs font-bold text-slate-500">paires</span>
          </div>
          <span className="text-[11px] text-slate-500">
            {(() => {
              const total = productionEntries.reduce((acc, p) => acc + (p.qtyConforming || 0) + (p.qtyRejected || 0), 0);
              const scraps = productionEntries.reduce((acc, p) => acc + (p.qtyRejected || 0), 0);
              return total > 0 ? `Taux global : ${((scraps / total) * 100).toFixed(2)}%` : 'Taux : 0%';
            })()}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Arrêts Postes</span>
          <div className="text-2xl font-black text-amber-600 mt-1">
            {productionEntries.reduce((acc, p) => acc + (p.downtimeMinutes || 0), 0)} <span className="text-xs font-bold text-slate-500">min</span>
          </div>
          <span className="text-[11px] text-slate-500">Temps cumulé d'indisponibilité</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Fiches Enregistrées</span>
          <div className="text-2xl font-black text-blue-600 mt-1">
            {productionEntries.length}
          </div>
          <span className="text-[11px] text-slate-500">
            {productionEntries.filter((p) => p.verifiedByChef).length} vérifiées par responsable
          </span>
        </div>
      </div>

      {/* Table Fiches */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Fiches Détaillées de Fabrication (Postes & Équipes)</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {filteredFiches.length} fiches affichées sur {productionEntries.length} enregistrées
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Recherche modèle, opérateur..."
                value={searchFiches}
                onChange={(e) => setSearchFiches(e.target.value)}
                className="pl-9 pr-3.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-48 sm:w-56"
              />
            </div>

            <select
              value={filterShiftFiches}
              onChange={(e) => setFilterShiftFiches(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-700 font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="all">Tous shifts</option>
              <option value="matin">Matin</option>
              <option value="soir">Soir</option>
              <option value="nuit">Nuit</option>
            </select>

            <select
              value={filterMachineFiches}
              onChange={(e) => setFilterMachineFiches(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-700 font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="all">Toutes machines</option>
              <option value="EVA-01">EVA-01</option>
              <option value="EVA-02">EVA-02</option>
              <option value="EVA-03">EVA-03</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">Date & Shift</th>
                <th className="py-3 px-3">Machine</th>
                <th className="py-3 px-3">Opérateur</th>
                <th className="py-3 px-4">Modèle & Teinte</th>
                <th className="py-3 px-3 text-right">Prévu</th>
                <th className="py-3 px-3 text-right">Conforme</th>
                <th className="py-3 px-3 text-right">Rebuts</th>
                <th className="py-3 px-3 text-center">Taux Rebut</th>
                <th className="py-3 px-3 text-center">Arrêt (min)</th>
                <th className="py-3 px-3 text-center">Validation</th>
                <th className="py-3 px-4">Notes</th>
                <th className="py-3 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredFiches.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-8 text-center text-slate-400">
                    Aucune fiche de production trouvée. Cliquez sur "Synchro Fiches Production" pour charger les fiches d'atelier.
                  </td>
                </tr>
              ) : (
                filteredFiches.map((f) => {
                  const totalProd = (f.qtyConforming || 0) + (f.qtyRejected || 0);
                  const scrapPercent = totalProd > 0 ? (((f.qtyRejected || 0) / totalProd) * 100).toFixed(1) : '0.0';

                  return (
                    <tr key={f.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-900">{f.date}</div>
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                          {f.shift}
                        </span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap font-mono text-xs font-bold text-slate-800">
                        {f.machineId}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap text-xs text-slate-600 font-medium">
                        {f.operatorName || f.operatorId}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-bold text-slate-900">
                        <div>{f.modelName}</div>
                        <span className="text-xs font-normal text-slate-500">{f.color1 || f.color2 || '-'}</span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-xs text-slate-500">
                        {f.qtyProduced?.toLocaleString('fr-FR') || '-'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-xs font-black text-emerald-700">
                        {f.qtyConforming?.toLocaleString('fr-FR')}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-xs font-bold text-rose-600">
                        {f.qtyRejected}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                          Number(scrapPercent) > 2 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {scrapPercent}%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center text-xs">
                        {(f.downtimeMinutes || 0) > 0 ? (
                          <span className="font-bold text-amber-700" title={f.downtimeReason}>
                            {f.downtimeMinutes}m
                          </span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => toggleVerifyEntry(f.id)}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold transition-colors ${
                            f.verifiedByChef
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                          }`}
                          title="Cliquer pour basculer le statut de vérification"
                        >
                          {f.verifiedByChef ? (
                            <>
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Vérifié</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              <span>En attente</span>
                            </>
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500 max-w-xs truncate" title={f.observations || f.notes}>
                        {f.observations || f.notes || '-'}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => deleteProductionEntry(f.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                          title="Supprimer cette fiche"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )}

  {activeTab === 'eva_stations' && (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
              Module Paramétrage Machine EVA
            </span>
            <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
              6 Stations • 12 Moules • 2 Injecteurs
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <Sliders className="w-6 h-6 text-indigo-600" />
            <span>Architecture & Capacité Réelle Machine ({machine})</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Configuration indépendante des 6 stations. Règle absolue CTP : ne jamais calculer avec un multiplicateur fixe &quot;stations × 4&quot;. Chaque station est configurée en 1 Couleur (normale), Bicolor (semelle+coque) ou Mixte.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-200">
          <label className="text-xs font-bold text-slate-700 uppercase">Machine :</label>
          <select
            value={machine}
            onChange={(e) => setMachine(e.target.value as any)}
            className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="EVA 1">EVA 1 (6 Stations)</option>
            <option value="EVA 2">EVA 2 (6 Stations)</option>
            <option value="EVA 3">EVA 3 (6 Stations)</option>
          </select>
        </div>
      </div>

      <EvaMachineStationManager
        machineCode={machine}
        stations={evaStations}
        onStationsChange={handleStationsChange}
        compteurDebut={compteurDebut}
        compteurFin={compteurFin}
        productionReelle={pairesCalculees}
      />
    </div>
  )}

  {activeTab === 'eva3' && (
    <div className="space-y-6">
      <CtpEva3Jour15Panel />
    </div>
  )}
</div>
);
};
