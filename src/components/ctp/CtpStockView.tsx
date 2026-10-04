import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Package,
  AlertTriangle,
  RefreshCw,
  Search,
  ArrowUpDown,
  CheckCircle2,
  Box,
  FileSpreadsheet,
  Layers,
  Sparkles,
  Truck,
  PlusCircle,
  X,
  Lock,
  Clock,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';

export const CtpStockView: React.FC = () => {
  const {
    ctpStockAuto,
    ctpCartons,
    ctpStock,
    recalculateStockWithBase12,
    updateCtpStockOutput,
    restoreDefaultErpData,
    wipOpenCount,
    wipOpenAlert,
    setActiveTab,
  } = useApp();

  // Active Tab state: 'vendable' (Onglet 1) vs 'wip' (Onglet 2)
  const [activeStockTab, setActiveStockTab] = useState<'vendable' | 'wip'>('vendable');

  const [searchFilter, setSearchFilter] = useState<string>('');
  const [onlyAlerts, setOnlyAlerts] = useState<boolean>(false);
  const [modelFilter, setModelFilter] = useState<string>('all');
  const [feedback, setFeedback] = useState<string | null>(null);

  // Outgoing modal state
  const [selectedStockId, setSelectedStockId] = useState<string | null>(null);
  const [sortieQtyPaires, setSortieQtyPaires] = useState<number>(120);

  // Sorting for Vendable
  type SortKey = 'modele' | 'pointure' | 'stock_ferme_cartons' | 'stock_ferme_paires';
  const [sortKey, setSortKey] = useState<SortKey>('stock_ferme_cartons');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Recalculate with base 12
  const handleRecalculateBase12 = () => {
    const res = recalculateStockWithBase12();
    setFeedback(`✅ Recalcul dynamique actif selon la règle 12 paires/carton.`);
    setTimeout(() => setFeedback(null), 5000);
  };

  // Submit sortie
  const handleConfirmSortie = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStockId || sortieQtyPaires <= 0) return;

    updateCtpStockOutput(selectedStockId, Number(sortieQtyPaires));
    setSelectedStockId(null);
    setFeedback(`✅ Sortie de stock de ${sortieQtyPaires} paires enregistrée.`);
    setTimeout(() => setFeedback(null), 4000);
  };

  // Filtered & Sorted Stock Vendable (Onglet 1)
  const filteredVendableStock = useMemo(() => {
    return ctpStockAuto.filter((item) => {
      const matchSearch =
        item.modele.toLowerCase().includes(searchFilter.toLowerCase()) ||
        item.pointure.toLowerCase().includes(searchFilter.toLowerCase());

      const matchModel = modelFilter === 'all' || item.modele.toUpperCase().includes(modelFilter.toUpperCase());
      const matchAlert = onlyAlerts ? item.isAlert : true;

      return matchSearch && matchModel && matchAlert;
    });
  }, [ctpStockAuto, searchFilter, modelFilter, onlyAlerts]);

  const sortedVendableStock = useMemo(() => {
    return [...filteredVendableStock].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }
      const strA = String(valA || '');
      const strB = String(valB || '');
      return sortDirection === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
  }, [filteredVendableStock, sortKey, sortDirection]);

  // Open Cartons (Onglet 2 WIP)
  const openCartonsList = useMemo(() => {
    const list = ctpCartons
      .filter((c) => c.statut === 'OUVERT')
      .filter((c) => {
        const matchesSearch =
          c.id_carton.toLowerCase().includes(searchFilter.toLowerCase()) ||
          c.modele_id.toLowerCase().includes(searchFilter.toLowerCase()) ||
          c.pointure_text.includes(searchFilter);
        const matchesModel = modelFilter === 'all' || c.modele_id.toUpperCase().includes(modelFilter.toUpperCase());
        return matchesSearch && matchesModel;
      });
    const seen = new Set<string>();
    return list.filter((c) => {
      if (!c.id_carton || seen.has(c.id_carton)) return false;
      seen.add(c.id_carton);
      return true;
    });
  }, [ctpCartons, searchFilter, modelFilter]);

  // KPIs
  const totalStockFermeCartons = ctpStockAuto.reduce((acc, s) => acc + s.stock_ferme_cartons, 0);
  const totalStockFermePaires = ctpStockAuto.reduce((acc, s) => acc + s.stock_ferme_paires, 0);
  const totalWipPaires = ctpStockAuto.reduce((acc, s) => acc + s.wip_ouvert_paires, 0);
  const totalWipCartonsTheorique = Number((totalWipPaires / 12).toFixed(1));
  const alertCount = ctpStockAuto.filter((s) => s.isAlert).length;

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Modèle', 'Pointure', 'Cartons Fermés (Vendables)', 'Paires Vendables (x12)', 'Paires WIP En-cours', 'Statut'];
    const rows = sortedVendableStock.map((s) => [
      s.modele,
      s.pointure,
      s.stock_ferme_cartons,
      s.stock_ferme_paires,
      s.wip_ouvert_paires,
      s.isAlert ? 'STOCK FAIBLE (<10)' : 'CONFORME',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CTP_Stock_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="ctp-stock-view" className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-slate-800">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 bg-blue-500/20 text-blue-300 text-xs font-semibold rounded border border-blue-400/30 uppercase tracking-wider">
                Module 3 • Vue Stock Automatique
              </span>
              <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 text-xs font-semibold rounded border border-amber-400/30">
                Calcul Automatique par Cartons (Pas de saisie manuelle)
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Gestion & Suivi du Stock CTP 2026
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              Le stock vendable est calculé directement à partir des cartons <strong className="text-emerald-400">FERMÉS</strong> par l'Équipe C. Les cartons ouverts restent en <strong className="text-amber-400">WIP atelier</strong>.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5 items-center">
            <button
              onClick={() => {
                restoreDefaultErpData();
                setFeedback('Synchronisation effectuée : Toutes les fiches de stock et cartons sont restaurées.');
                setTimeout(() => setFeedback(null), 4000);
              }}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
              title="Restaurer et synchroniser les données de stock et cartons CTP"
            >
              <RotateCcw className="w-4 h-4 text-slate-400" />
              <span>Synchro Fiches Stock</span>
            </button>

            <button
              onClick={handleRecalculateBase12}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-sm font-bold transition-all shadow-md shadow-amber-500/20"
              title="Vérifier la cohérence base 12 (NM)"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Base 12 / Carton</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-medium border border-slate-700 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Exporter CSV</span>
            </button>
          </div>
        </div>

        {/* WIP Alert if > 20 cartons */}
        {wipOpenAlert && (
          <div className="mt-4 p-3.5 bg-rose-950/80 border border-rose-500/50 rounded-xl text-rose-200 text-sm flex items-center justify-between gap-3 animate-pulse">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>
                <strong>ALERTE ATELIER :</strong> {wipOpenCount} cartons ouverts en cours (&gt; 20 cartons). L'Équipe C doit procéder à la fermeture !
              </span>
            </div>
            <button
              onClick={() => setActiveTab('ctp_fermeture')}
              className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold shrink-0 transition"
            >
              Aller à la Fermeture Équipe C →
            </button>
          </div>
        )}
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* KPIs Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stock Vendable Cartons */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Cartons Fermés (Vendables)</span>
            <div className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1">
              {totalStockFermeCartons.toLocaleString('fr-FR')} <span className="text-sm font-normal text-slate-500">ctns</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Visibles par le commercial</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Lock className="w-6 h-6" />
          </div>
        </div>

        {/* Paires Vendables */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Paires Vendables</span>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
              {totalStockFermePaires.toLocaleString('fr-FR')} <span className="text-sm font-normal text-slate-500">paires</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Cartons fermés x 12 (NM)</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Package className="w-6 h-6" />
          </div>
        </div>

        {/* WIP En-cours Paires */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">WIP En-cours (Ouverts)</span>
            <div className="text-2xl sm:text-3xl font-black text-amber-600 mt-1">
              {totalWipPaires} <span className="text-sm font-normal text-slate-500">paires</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{openCartonsList.length} cartons ouverts (≈ {totalWipCartonsTheorique} ctns)</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Alertes Stock < 10 cartons */}
        <div
          onClick={() => setOnlyAlerts(!onlyAlerts)}
          className={`p-5 rounded-2xl border transition-all cursor-pointer shadow-sm flex items-center justify-between ${
            alertCount > 0
              ? 'bg-rose-50 border-rose-200 text-rose-900 hover:bg-rose-100/80'
              : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-rose-600">
              Alertes Stock &lt; 10 Cartons
            </span>
            <div className="text-2xl sm:text-3xl font-black text-rose-600 mt-1">
              {alertCount} <span className="text-sm font-normal text-rose-500">références</span>
            </div>
            <p className="text-xs text-rose-600 mt-0.5">
              {onlyAlerts ? 'Filtre actif • Tout voir' : 'Cliquer pour filtrer'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 animate-pulse" />
          </div>
        </div>
      </div>

      {/* TWO TABS SELECTOR (MANDATORY REQUIREMENT) */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-2xl p-2 gap-2 shadow-sm">
        <button
          onClick={() => setActiveStockTab('vendable')}
          className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 ${
            activeStockTab === 'vendable'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>Onglet 1 : Stock VENDABLE (Cartons FERMÉS uniquement)</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-mono ${activeStockTab === 'vendable' ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
            {totalStockFermeCartons} ctns
          </span>
        </button>

        <button
          onClick={() => setActiveStockTab('wip')}
          className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 ${
            activeStockTab === 'wip'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Onglet 2 : En-cours / WIP (Cartons OUVERTS)</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-mono ${activeStockTab === 'wip' ? 'bg-amber-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
            {openCartonsList.length} cartons
          </span>
        </button>
      </div>

      {/* TAB 1: STOCK VENDABLE (CARTONS FERMÉS) */}
      {activeStockTab === 'vendable' && (
        <div className="bg-white rounded-b-2xl border-x border-b border-slate-200 shadow-sm overflow-hidden">
          {/* Information Notice */}
          <div className="p-4 bg-emerald-50/70 border-b border-emerald-100 flex items-center justify-between text-xs text-emerald-900">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Stock Commercial Garanti :</strong> Ce tableau affiche uniquement les cartons validés et scellés par l'Équipe C. Formule : <code className="bg-emerald-100 px-1 py-0.5 rounded text-emerald-950 font-mono">Stock Paires = Cartons Fermés × 12 (NM)</code>.
              </span>
            </div>
          </div>

          {/* Table Filters */}
          <div className="p-4 sm:p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filtrer modèle, pointure..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="pl-9 pr-3.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none w-48 sm:w-56"
                />
              </div>

              <select
                value={modelFilter}
                onChange={(e) => setModelFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-700 font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="all">Tous les modèles</option>
                <option value="NM">Modèle NM (Standard 12)</option>
                <option value="BC07">Modèle BC07 (Standard 16)</option>
                <option value="SB101">Modèle SB101</option>
              </select>
            </div>

            <button
              onClick={() => setOnlyAlerts(!onlyAlerts)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1.5 ${
                onlyAlerts
                  ? 'bg-rose-600 text-white border-rose-600'
                  : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Alerte &lt; 10 cartons ({alertCount})</span>
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider select-none">
                  <th className="py-3.5 px-4">Modèle</th>
                  <th className="py-3.5 px-4">Pointure</th>
                  <th className="py-3.5 px-4 text-center">Conditionnement</th>
                  <th className="py-3.5 px-4 text-right">Cartons Fermés (Vendables)</th>
                  <th className="py-3.5 px-4 text-right">Paires Vendables (Stock Net)</th>
                  <th className="py-3.5 px-4 text-center">Statut Seuil</th>
                  <th className="py-3.5 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedVendableStock.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 text-sm">
                      Aucune référence trouvée avec les filtres sélectionnés.
                    </td>
                  </tr>
                ) : (
                  sortedVendableStock.map((item, idx) => {
                    const isCritical = item.stock_ferme_cartons < 10;
                    return (
                      <tr key={`v-${item.modele}-${item.pointure}-${idx}`} className="hover:bg-slate-50 transition">
                        <td className="py-3.5 px-4 font-bold text-slate-900">{item.modele}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-700">{item.pointure}</td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-mono text-xs font-bold">
                            {item.paires_par_carton} p/ctn
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-base text-emerald-700">
                          {item.stock_ferme_cartons} ctns
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-black text-base text-slate-900">
                          {item.stock_ferme_paires.toLocaleString('fr-FR')} paires
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {isCritical ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-rose-600 text-white shadow-sm animate-pulse">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>STOCK FAIBLE (&lt;10)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Normal</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => {
                              setSelectedStockId(`stk-${item.modele}-${item.pointure}`);
                              setSortieQtyPaires(item.paires_par_carton * 2);
                            }}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-lg text-xs font-semibold transition inline-flex items-center gap-1"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            <span>Expédition</span>
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
      )}

      {/* TAB 2: EN-COURS / WIP (CARTONS OUVERTS) */}
      {activeStockTab === 'wip' && (
        <div className="bg-white rounded-b-2xl border-x border-b border-slate-200 shadow-sm overflow-hidden space-y-4">
          {/* Information Notice */}
          <div className="p-4 bg-amber-50/80 border-b border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Suivi En-cours (WIP) :</strong> Cartons ouverts en cours de remplissage par les Équipes A et B. Ces cartons ne sont <strong>pas encore comptés dans le stock vendable</strong>.
              </span>
            </div>
            <button
              onClick={() => setActiveTab('ctp_fermeture')}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold flex items-center gap-1 shrink-0 shadow-sm transition"
            >
              <span>Valider & Fermer les Cartons (Équipe C)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Open Cartons Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3.5 px-4">ID Carton</th>
                  <th className="py-3.5 px-4">Modèle</th>
                  <th className="py-3.5 px-4">Pointure</th>
                  <th className="py-3.5 px-4 text-center">Paires Dedans</th>
                  <th className="py-3.5 px-4 text-center">Paires Manquantes</th>
                  <th className="py-3.5 px-4">Équipe / Machine</th>
                  <th className="py-3.5 px-4 text-center">Statut WIP</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {openCartonsList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 text-sm">
                      Aucun carton ouvert en WIP pour le moment. Tout est fermé et stocké !
                    </td>
                  </tr>
                ) : (
                  openCartonsList.map((carton) => {
                    const manquantes = carton.paires_par_carton - carton.paires_actuelles;
                    const isReady = manquantes === 0;

                    return (
                      <tr key={carton.id_carton} className="hover:bg-slate-50 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{carton.id_carton}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-800">{carton.modele_id}</td>
                        <td className="py-3.5 px-4 text-slate-700">{carton.pointure_text}</td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                            {carton.paires_actuelles} / {carton.paires_par_carton} p.
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {isReady ? (
                            <span className="font-semibold text-emerald-700 text-xs">0 (Plein)</span>
                          ) : (
                            <span className="font-semibold text-amber-700 text-xs">Reste {manquantes} paires</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-600">
                          Équipe {carton.equipe_remplissage || 'A'} • {carton.machine_origine || 'EVA 1'}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {isReady ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              PRÊT POUR CLÔTURE
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                              EN REMPLISSAGE
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setActiveTab('ctp_fermeture')}
                            className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-200"
                          >
                            Voir dans Fermeture
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
      )}

      {/* MODAL EXPÉDITION / SORTIE */}
      {selectedStockId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900">Enregistrer une Sortie de Stock</h3>
              </div>
              <button onClick={() => setSelectedStockId(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmSortie} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Quantité de paires à sortir
                </label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={sortieQtyPaires}
                  onChange={(e) => setSortieQtyPaires(Number(e.target.value))}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800">
                Équivalent : <strong>{Math.floor(sortieQtyPaires / 12)} cartons</strong> (base 12) + {sortieQtyPaires % 12} paires.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedStockId(null)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md transition-colors"
                >
                  Confirmer la Sortie
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
