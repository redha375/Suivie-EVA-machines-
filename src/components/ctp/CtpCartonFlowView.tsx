import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Box,
  Layers,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  Info,
  Clock,
  UserCheck,
  Plus,
  Search,
  Filter,
  Palette,
  Gauge,
  Printer,
  ChevronRight,
  Lock,
} from 'lucide-react';
import { CtpCarton, CtpCartonFlowOperation } from '../../types';
import { evaluateCartonClosure } from '../../utils/ctpCartonFlowEngine';
import { getCartonQrCodeDataUrl } from '../../utils/ctpQrHelper';

export const CtpCartonFlowView: React.FC = () => {
  const {
    ctpCartons,
    ctpCartonFlowOperations,
    executeCartonFlowOperation,
    validateQualityCheck,
    closeCtpCartonStrict,
    loadUserExampleFlowScenario,
    currentUser,
  } = useApp();

  // Form State for new operation
  const [date, setDate] = useState<string>(() => new Date().toISOString().substring(0, 10));
  const [equipe, setEquipe] = useState<string>('B');
  const [machine, setMachine] = useState<string>('EVA 2');
  const [stationNumber, setStationNumber] = useState<number>(3);
  const [modele, setModele] = useState<string>('NM');
  const [pointure, setPointure] = useState<string>('40-44');
  const [etapeNumero, setEtapeNumero] = useState<1 | 2 | 3>(2);
  const [couleurNom, setCouleurNom] = useState<string>('Insert Rouge');
  const [cartonsADeclarer, setCartonsADeclarer] = useState<number>(36);
  const [observations, setObservations] = useState<string>('');
  const [operateur, setOperateur] = useState<string>(currentUser?.name || 'Opérateur CTP');

  // Inspector & Modal State
  const [selectedCarton, setSelectedCarton] = useState<CtpCarton | null>(null);
  const [activeTab, setActiveTab] = useState<'pipeline' | 'operations' | 'cartons' | 'closure'>('pipeline');
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'warning' | 'info'; message: string } | null>(null);
  const [closingCartonId, setClosingCartonId] = useState<string | null>(null);
  const [authorizedSigner, setAuthorizedSigner] = useState<string>(currentUser?.name || 'Chef d\'Équipe C');

  // Search in cartons
  const [cartonSearch, setCartonSearch] = useState<string>('');
  const [cartonStatusFilter, setCartonStatusFilter] = useState<'all' | 'OUVERT' | 'FERME'>('all');
  const [cartonStepFilter, setCartonStepFilter] = useState<'all' | '1' | '2' | '3'>('all');

  // Stock ouvert précédent disponible pour le modèle/pointure sélectionné
  const availableOpenPreviousCartons = useMemo(() => {
    const modClean = modele.trim().toUpperCase();
    return ctpCartons.filter((c) => {
      if (c.statut !== 'OUVERT') return false;
      if (c.modele_id.toUpperCase() !== modClean) return false;
      if (c.pointure_text !== pointure) return false;

      if (etapeNumero === 1) return (c.etape_actuelle || 0) < 1;
      if (etapeNumero === 2) return (c.etape_actuelle || 1) === 1;
      if (etapeNumero === 3) return (c.etape_actuelle || 1) === 2;
      return false;
    });
  }, [ctpCartons, modele, pointure, etapeNumero]);

  // Calcul dynamique prévisionnel en direct
  const previewCalculation = useMemo(() => {
    const declared = Math.max(0, Number(cartonsADeclarer) || 0);
    const available = availableOpenPreviousCartons.length;

    if (etapeNumero === 1) {
      const recup = Math.min(declared, available);
      const nouveaux = Math.max(0, declared - available);
      return {
        recuperes: recup,
        nouveaux: nouveaux,
        completes: declared,
        restantOuverts: declared,
      };
    } else {
      const recup = Math.min(declared, available);
      const nouveaux = Math.max(0, declared - available);
      const leftoverPrev = Math.max(0, available - declared);
      return {
        recuperes: recup,
        nouveaux: nouveaux,
        completes: recup,
        restantOuverts: leftoverPrev + nouveaux,
      };
    }
  }, [cartonsADeclarer, availableOpenPreviousCartons, etapeNumero]);

  // Breakdown statistics across the 3 steps
  const stats = useMemo(() => {
    const openCartons = ctpCartons.filter((c) => c.statut === 'OUVERT');
    const c1 = openCartons.filter((c) => (c.etape_actuelle || 1) === 1);
    const c2 = openCartons.filter((c) => c.etape_actuelle === 2);
    const c3 = openCartons.filter((c) => c.etape_actuelle === 3);
    const closed = ctpCartons.filter((c) => c.statut === 'FERME');

    // Cartons 3 couleurs qui ont 12/12 mais restent OUVERTS car non validés / clôturés
    const readyForEvaluation = c3.filter((c) => (c.total_paires ?? c.paires_actuelles ?? 0) >= (c.paires_par_carton || 12));

    return {
      step1OpenCount: c1.length,
      step2OpenCount: c2.length,
      step3OpenCount: c3.length,
      closedCount: closed.length,
      readyForEvaluationCount: readyForEvaluation.length,
      totalOpenCount: openCartons.length,
    };
  }, [ctpCartons]);

  // Handle operation submit
  const handleExecuteOperation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cartonsADeclarer || cartonsADeclarer <= 0) {
      setNotification({ type: 'error', message: 'Veuillez saisir un nombre de cartons supérieur à 0.' });
      return;
    }

    const res = executeCartonFlowOperation({
      modele,
      pointure,
      etapeNumero,
      couleurNom,
      cartonsADeclarer: Number(cartonsADeclarer),
      equipe,
      machine,
      stationNumber,
      date,
      operateur,
      observations,
    });

    if (res.success) {
      setNotification({
        type: 'success',
        message: `${res.message} — [${machine} • St. ${stationNumber} • Équipe ${equipe}]`,
      });
      setObservations('');
      setTimeout(() => setNotification(null), 6000);
    }
  };

  // Load official scenario
  const handleLoadOfficialExample = () => {
    const res = loadUserExampleFlowScenario();
    setNotification({ type: 'info', message: res.message });
    setTimeout(() => setNotification(null), 7000);
  };

  // Validate QC
  const handleValidateQC = (cartonId: string) => {
    const res = validateQualityCheck(cartonId, operateur);
    if (res.success) {
      setNotification({ type: 'success', message: res.message });
    }
  };

  // Close carton strictly
  const handleCloseCarton = (cartonId: string) => {
    const res = closeCtpCartonStrict(cartonId, authorizedSigner);
    if (res.success) {
      setNotification({ type: 'success', message: res.message });
      setClosingCartonId(null);
    } else {
      setNotification({ type: 'error', message: res.message });
    }
  };

  // Filtered cartons for table
  const filteredCartons = useMemo(() => {
    const list = ctpCartons.filter((c) => {
      const matchesSearch =
        c.id_carton.toLowerCase().includes(cartonSearch.toLowerCase()) ||
        c.modele_id.toLowerCase().includes(cartonSearch.toLowerCase()) ||
        c.pointure_text.toLowerCase().includes(cartonSearch.toLowerCase()) ||
        (c.couleur_1 || '').toLowerCase().includes(cartonSearch.toLowerCase()) ||
        (c.couleur_2 || '').toLowerCase().includes(cartonSearch.toLowerCase()) ||
        (c.couleur_3 || '').toLowerCase().includes(cartonSearch.toLowerCase());

      const matchesStatus = cartonStatusFilter === 'all' || c.statut === cartonStatusFilter;
      const matchesStep = cartonStepFilter === 'all' || String(c.etape_actuelle || 1) === cartonStepFilter;

      return matchesSearch && matchesStatus && matchesStep;
    });

    const seen = new Set<string>();
    return list.filter((c) => {
      if (!c.id_carton || seen.has(c.id_carton)) return false;
      seen.add(c.id_carton);
      return true;
    });
  }, [ctpCartons, cartonSearch, cartonStatusFilter, cartonStepFilter]);

  return (
    <div className="space-y-6">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white p-6 rounded-2xl shadow-md border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wide flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                CTP SMART • Flux Physique Réel
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Non-double comptage garanti
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <Layers className="w-6 h-6 text-blue-400" />
              Calcul Dynamique des Cartons (3 Étapes / Couleurs)
            </h1>
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              Un même carton conserve son état d’une étape à l’autre et n’est <strong className="text-amber-300">jamais compté comme un nouveau carton</strong> à chaque passage.
              Les cartons fermés ne sont <strong className="text-amber-300">jamais calculés automatiquement</strong> à partir des paires produites : seules les déclarations physiques d'atelier et la validation des 5 conditions scellent un carton.
            </p>
          </div>

          {/* Bouton de chargement du scénario exemple */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleLoadOfficialExample}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-2 border border-amber-400/40 active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
              Charger l'Exemple Officiel (30 C1 &rarr; 36 C2 &rarr; 40 S)
            </button>
          </div>
        </div>

        {/* NOTIFICATION ALERT */}
        {notification && (
          <div
            className={`mt-4 p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 border transition-all ${
              notification.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200'
                : notification.type === 'error'
                ? 'bg-rose-950/80 border-rose-500/40 text-rose-200'
                : notification.type === 'warning'
                ? 'bg-amber-950/80 border-amber-500/40 text-amber-200'
                : 'bg-blue-950/80 border-blue-500/40 text-blue-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {notification.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              )}
              <span>{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-slate-400 hover:text-white text-xs px-2 py-0.5 rounded"
            >
              &times;
            </button>
          </div>
        )}
      </div>

      {/* PIPELINE DES 3 ÉTAPES / COULEURS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Étape 1 : Couleur 1 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
            <span className="flex items-center gap-1 text-blue-700 font-extrabold uppercase">
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              Étape 1 • Couleur 1
            </span>
            <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[11px]">Équipe A</span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {stats.step1OpenCount} <span className="text-xs font-semibold text-slate-500">cartons ouverts</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Cartons initialisés avec C1, en attente de Couleur 2.
          </p>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
            <span>Statut :</span>
            <span className="font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">OUVERT (1/3)</span>
          </div>
        </div>

        {/* Étape 2 : Couleur 2 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
            <span className="flex items-center gap-1 text-indigo-700 font-extrabold uppercase">
              <span className="w-2 h-2 rounded-full bg-indigo-600" />
              Étape 2 • Couleur 2
            </span>
            <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[11px]">Équipe B / S</span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {stats.step2OpenCount} <span className="text-xs font-semibold text-slate-500">cartons ouverts</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Cartons ayant C1 + C2, en attente de Couleur 3.
          </p>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
            <span>Statut :</span>
            <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">OUVERT (2/3)</span>
          </div>
        </div>

        {/* Étape 3 : Couleur 3 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
            <span className="flex items-center gap-1 text-purple-700 font-extrabold uppercase">
              <span className="w-2 h-2 rounded-full bg-purple-600" />
              Étape 3 • Couleur 3
            </span>
            <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded text-[11px]">Équipe C</span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {stats.step3OpenCount} <span className="text-xs font-semibold text-slate-500">cartons traités</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            3 couleurs réalisées, restent <span className="font-bold text-slate-800">OUVERTS</span> tant que non contrôlés.
          </p>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
            <span>Statut :</span>
            <span className="font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded">OUVERT (3/3)</span>
          </div>
        </div>

        {/* Étape 4 : Contrôle & Validation */}
        <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/20 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-bold text-amber-700 mb-1">
            <span className="flex items-center gap-1 font-extrabold uppercase">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
              Contrôle & Clôture
            </span>
            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded text-[11px]">5 Critères</span>
          </div>
          <div className="text-2xl font-black text-amber-900 mt-1">
            {stats.readyForEvaluationCount} <span className="text-xs font-semibold text-amber-700">prêts à clôturer</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Complets à 12 paires, en attente de visa opérateur habilité.
          </p>
          <div className="mt-3 pt-2.5 border-t border-amber-200/60 flex items-center justify-between text-[11px] text-slate-600">
            <span>Condition :</span>
            <span className="font-bold text-amber-700">Contrôle requis</span>
          </div>
        </div>

        {/* Étape 5 : Cartons FERMÉS (Stock Vendable) */}
        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-700 mb-1">
            <span className="flex items-center gap-1 font-extrabold uppercase">
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              Cartons Scellés
            </span>
            <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[11px]">Vendables</span>
          </div>
          <div className="text-2xl font-black text-emerald-900 mt-1">
            {stats.closedCount} <span className="text-xs font-semibold text-emerald-700">cartons FERMÉS</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Scellés officiellement, disponibles pour livraison commerciale.
          </p>
          <div className="mt-3 pt-2.5 border-t border-emerald-200/60 flex items-center justify-between text-[11px] text-slate-600">
            <span>Statut :</span>
            <span className="font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">FERMÉ</span>
          </div>
        </div>
      </div>

      {/* RÈGLE D'OR & EXPLICATION DU FLUX INDUSTRIEL */}
      <div className="bg-slate-900 text-slate-200 p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30 shrink-0">
            <Info className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <div className="font-bold text-white uppercase tracking-wider text-[11px]">
              Principe Métier : Traçabilité Physique & Règle des 4 Métriques
            </div>
            <p className="text-slate-300 leading-relaxed">
              Pour chaque opération déclarée en atelier, le système calcule et enregistre rigoureusement :
              <strong className="text-blue-300"> Cartons Récupérés</strong> +
              <strong className="text-indigo-300"> Nouveaux Cartons</strong> =
              <strong className="text-emerald-300"> Cartons Complétés</strong> |
              <strong className="text-amber-300"> Cartons Restant Ouverts</strong>.
              Tout carton incomplet reste <strong className="text-rose-400">OUVERT</strong> tant que les 5 conditions ne sont pas formellement réunies.
            </p>
          </div>
        </div>

        <div className="bg-slate-800/80 px-3.5 py-2 rounded-lg border border-slate-700 shrink-0 text-right">
          <div className="text-[10px] text-slate-400 uppercase font-bold">Total Stock Ouvert WIP</div>
          <div className="text-base font-extrabold text-amber-400">
            {stats.totalOpenCount} cartons en cours
          </div>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('pipeline')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
            activeTab === 'pipeline'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Déclarer une Opération de Flux
        </button>

        <button
          onClick={() => setActiveTab('operations')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
            activeTab === 'operations'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          Historique des Opérations ({ctpCartonFlowOperations.length})
        </button>

        <button
          onClick={() => setActiveTab('cartons')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
            activeTab === 'cartons'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Box className="w-3.5 h-3.5" />
          Inventaire Individuel des Cartons ({ctpCartons.length})
        </button>

        <button
          onClick={() => setActiveTab('closure')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
            activeTab === 'closure'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          Clôture Sécurisée (5 Conditions)
          {stats.readyForEvaluationCount > 0 && (
            <span className="px-1.5 py-0.2 bg-amber-400 text-slate-900 rounded-full font-black text-[10px]">
              {stats.readyForEvaluationCount}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: FORMULAIRE DE TRAITEMENT D'OPÉRATION DE FLUX */}
      {activeTab === 'pipeline' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulaire de Saisie */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-blue-600" />
                  Saisie d'Atelier : Passage d'Équipe & Flux Réel
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Indiquez le nombre de cartons traités. Le système identifie automatiquement les cartons récupérés et les nouveaux cartons.
                </p>
              </div>
              <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg border border-blue-200">
                Étape {etapeNumero} / 3
              </span>
            </div>

            <form onSubmit={handleExecuteOperation} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Date */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Date de production
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>

                {/* Équipe */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Équipe au poste
                  </label>
                  <select
                    value={equipe}
                    onChange={(e) => setEquipe(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="A">Équipe A (Matin)</option>
                    <option value="B">Équipe B (Après-midi)</option>
                    <option value="C">Équipe C (Nuit / Clôture)</option>
                    <option value="S">Équipe S (Relève Spéciale)</option>
                  </select>
                </div>

                {/* Machine */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Machine EVA
                  </label>
                  <select
                    value={machine}
                    onChange={(e) => setMachine(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="EVA 1">Machine EVA 1 (12 Stations)</option>
                    <option value="EVA 2">Machine EVA 2 (12 Stations)</option>
                    <option value="EVA 3">Machine EVA 3 (Haute cadence)</option>
                  </select>
                </div>

                {/* Station */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Station ({machine})
                  </label>
                  <select
                    value={stationNumber}
                    onChange={(e) => setStationNumber(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((st) => (
                      <option key={st} value={st}>
                        Station {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Modèle, Pointure, Étape, Couleur */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-3 border-t border-slate-100">
                {/* Modèle */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Modèle
                  </label>
                  <select
                    value={modele}
                    onChange={(e) => setModele(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="NM">Modèle NM (12 paires/carton)</option>
                    <option value="BC07">Modèle BC07</option>
                    <option value="SB101">Modèle SB101</option>
                    <option value="SML">Modèle SML</option>
                    <option value="SH">Modèle SH</option>
                  </select>
                </div>

                {/* Pointure */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Pointure
                  </label>
                  <select
                    value={pointure}
                    onChange={(e) => setPointure(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="40-44">40-44 (Homme)</option>
                    <option value="28-35">28-35 (Fillette/Garçon)</option>
                    <option value="36-41">36-41 (Femme)</option>
                    <option value="20-27">20-27 (Bébé)</option>
                  </select>
                </div>

                {/* Étape */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Étape du Process
                  </label>
                  <select
                    value={etapeNumero}
                    onChange={(e) => setEtapeNumero(Number(e.target.value) as 1 | 2 | 3)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value={1}>Étape 1 • Couleur 1 (Base)</option>
                    <option value={2}>Étape 2 • Couleur 2 (Insert)</option>
                    <option value={3}>Étape 3 • Couleur 3 (Finition)</option>
                  </select>
                </div>

                {/* Couleur Nom */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1">
                    <Palette className="w-3.5 h-3.5 text-rose-500" />
                    Couleur Réalisée
                  </label>
                  <input
                    type="text"
                    value={couleurNom}
                    onChange={(e) => setCouleurNom(e.target.value)}
                    placeholder="Ex: Noir Base, Insert Rouge..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>
              </div>

              {/* Nombre de Cartons déclarés */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                  <div>
                    <label className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <Box className="w-4 h-4 text-blue-600" />
                      Nombre de Cartons Traités au Poste
                    </label>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Déclaration physique réelle des cartons passés sur la machine par l'équipe.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-600">Stock disponible étape précédente :</span>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-black text-xs">
                      {availableOpenPreviousCartons.length} cartons
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    value={cartonsADeclarer}
                    onChange={(e) => setCartonsADeclarer(Math.max(1, Number(e.target.value)))}
                    className="w-40 px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-base font-black text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {[10, 20, 30, 36, 40, 50, 60].map((quick) => (
                      <button
                        key={quick}
                        type="button"
                        onClick={() => setCartonsADeclarer(quick)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                          cartonsADeclarer === quick
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {quick} ct.
                      </button>
                    ))}
                  </div>
                </div>

                {/* BANDEAU DE CALCUL DYNAMIQUE PRÉVISIONNEL */}
                <div className="mt-4 p-3.5 bg-blue-900 text-white rounded-xl text-xs">
                  <div className="font-bold uppercase text-[10px] text-blue-300 tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Décomposition Dynamique en Direct (Règle Anti-Double Comptage) :
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                    <div className="bg-blue-950/70 p-2 rounded-lg border border-blue-800">
                      <div className="text-[10px] text-slate-400">Cartons Récupérés</div>
                      <div className="text-base font-black text-blue-300">
                        {previewCalculation.recuperes}
                      </div>
                      <div className="text-[10px] text-slate-400">du stock existant</div>
                    </div>

                    <div className="bg-blue-950/70 p-2 rounded-lg border border-blue-800">
                      <div className="text-[10px] text-slate-400">Nouveaux Cartons</div>
                      <div className="text-base font-black text-indigo-300">
                        {previewCalculation.nouveaux}
                      </div>
                      <div className="text-[10px] text-slate-400">introduits</div>
                    </div>

                    <div className="bg-blue-950/70 p-2 rounded-lg border border-blue-800">
                      <div className="text-[10px] text-slate-400">Cartons Complétés</div>
                      <div className="text-base font-black text-emerald-300">
                        {previewCalculation.completes}
                      </div>
                      <div className="text-[10px] text-slate-400">pour cette étape</div>
                    </div>

                    <div className="bg-blue-950/70 p-2 rounded-lg border border-blue-800">
                      <div className="text-[10px] text-slate-400">Restant Ouverts</div>
                      <div className="text-base font-black text-amber-300">
                        {previewCalculation.restantOuverts}
                      </div>
                      <div className="text-[10px] text-slate-400">en cours</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Opérateur & Observations */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Opérateur / Chef d'équipe
                  </label>
                  <input
                    type="text"
                    value={operateur}
                    onChange={(e) => setOperateur(e.target.value)}
                    placeholder="Nom du chef de poste"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Observations / Réf. Lot
                  </label>
                  <input
                    type="text"
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                    placeholder="Ex: Lot semelles bicolores, changement matière..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Bouton de Soumission */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl shadow-md transition-all flex items-center gap-2 active:scale-95"
                >
                  <CheckCircle className="w-4 h-4" />
                  Valider l'Opération de Flux ({cartonsADeclarer} cartons)
                </button>
              </div>
            </form>
          </div>

          {/* GUIDE ET EXEMPLE INDUSTRIEL DÉTAILLÉ */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3.5">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Exemple Concret du Flux CTP SMART
              </h4>

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200/60 space-y-1">
                  <div className="font-black text-blue-900 flex items-center justify-between">
                    <span>1. Équipe A (30 cartons C1)</span>
                    <span className="text-[11px] px-1.5 py-0.2 bg-blue-200/70 rounded">Départ</span>
                  </div>
                  <p className="text-slate-700 text-[11px]">
                    30 nouveaux cartons introduits avec Couleur 1.
                    <br />
                    <span className="font-bold text-blue-800">&rarr; 30 cartons ouverts C1.</span>
                  </p>
                </div>

                <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-200/60 space-y-1">
                  <div className="font-black text-indigo-900 flex items-center justify-between">
                    <span>2. Étape suivante (36 cartons C2)</span>
                    <span className="text-[11px] px-1.5 py-0.2 bg-indigo-200/70 rounded">+ Couleur 2</span>
                  </div>
                  <p className="text-slate-700 text-[11px]">
                    Prend les 30 cartons existants et leur ajoute C2. Injecte 6 nouveaux cartons.
                    <br />
                    <span className="font-bold text-indigo-800">
                      &rarr; 30 complétés C2 + 6 ouverts C1.
                    </span>
                  </p>
                </div>

                <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-200/60 space-y-1">
                  <div className="font-black text-purple-900 flex items-center justify-between">
                    <span>3. Équipe S (40 cartons C2/C3)</span>
                    <span className="text-[11px] px-1.5 py-0.2 bg-purple-200/70 rounded">Relève S</span>
                  </div>
                  <p className="text-slate-700 text-[11px]">
                    Utilise les 6 cartons ouverts existants + 34 nouveaux cartons.
                    <br />
                    <span className="font-bold text-purple-800">
                      &rarr; 6 complétés + 34 nouveaux ouverts.
                    </span>
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleLoadOfficialExample}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                  Réinitialiser sur ce Scénario
                </button>
              </div>
            </div>

            {/* Checklist Conditions de Clôture */}
            <div className="bg-amber-50/50 rounded-2xl border border-amber-200 p-5 space-y-2.5">
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-900 flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-600" />
                5 Conditions de Clôture
              </h4>
              <ul className="text-[11px] text-amber-950 space-y-1.5 list-disc list-inside">
                <li>Toutes les couleurs/étapes prévues réalisées (3/3)</li>
                <li>Quantité requise complète (12/12 paires)</li>
                <li>Configuration modèle & pointure respectée</li>
                <li>Contrôle qualité requis validé</li>
                <li>Signature de l'opérateur autorisé</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: HISTORIQUE DES OPÉRATIONS */}
      {activeTab === 'operations' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                Journal des Opérations de Flux Physique ({ctpCartonFlowOperations.length})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Chaque enregistrement consigne les 4 métriques fondamentales sans double comptage.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-3">Date & Heure</th>
                  <th className="py-3 px-3">Équipe</th>
                  <th className="py-3 px-3">Machine / St.</th>
                  <th className="py-3 px-3">Modèle / Pt.</th>
                  <th className="py-3 px-3">Étape / Couleur</th>
                  <th className="py-3 px-3 text-right bg-blue-50/60 text-blue-900">Récupérés</th>
                  <th className="py-3 px-3 text-right bg-indigo-50/60 text-indigo-900">Nouveaux</th>
                  <th className="py-3 px-3 text-right bg-emerald-50/60 text-emerald-900">Complétés</th>
                  <th className="py-3 px-3 text-right bg-amber-50/60 text-amber-900">Restant Ouverts</th>
                  <th className="py-3 px-3 text-right">Paires</th>
                  <th className="py-3 px-3">Opérateur</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {ctpCartonFlowOperations.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-8 text-center text-slate-400">
                      Aucune opération de flux enregistrée.
                    </td>
                  </tr>
                ) : (
                  ctpCartonFlowOperations.map((op) => (
                    <tr key={op.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3 whitespace-nowrap font-medium text-slate-600">
                        {op.date} {op.heure && <span className="text-[10px] text-slate-400">({op.heure})</span>}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                          Équipe {op.equipe}
                        </span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-semibold text-slate-700">{op.machine}</span>
                        {op.stationNumber && (
                          <span className="ml-1 text-[11px] font-bold text-slate-500">St.{op.stationNumber}</span>
                        )}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap font-bold text-slate-900">
                        {op.modele} <span className="text-slate-500 font-normal">({op.pointure})</span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200">
                            Étape {op.etapeNumero}
                          </span>
                          <span className="font-semibold text-slate-800">{op.couleurNom}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-black text-blue-700 bg-blue-50/30">
                        {op.cartonsRecuperes}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-indigo-700 bg-indigo-50/30">
                        {op.nouveauxCartons}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-emerald-700 bg-emerald-50/30">
                        {op.cartonsCompletes}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-amber-700 bg-amber-50/30">
                        {op.cartonsRestantOuverts}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-700">
                        {op.pairesTotalesTraitees}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap text-slate-600">
                        {op.operateur}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: INVENTAIRE INDIVIDUEL DES CARTONS */}
      {activeTab === 'cartons' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Box className="w-4 h-4 text-blue-600" />
                Traçabilité des Cartons Physiques ({filteredCartons.length}/{ctpCartons.length})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Chaque boîte conserve son identifiant unique tout au long des 3 étapes.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher carton, couleur..."
                  value={cartonSearch}
                  onChange={(e) => setCartonSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Status Filter */}
              <select
                value={cartonStatusFilter}
                onChange={(e) => setCartonStatusFilter(e.target.value as any)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium outline-none"
              >
                <option value="all">Tous statuts</option>
                <option value="OUVERT">OUVERT (En cours)</option>
                <option value="FERME">FERMÉ (Scellé)</option>
              </select>

              {/* Step Filter */}
              <select
                value={cartonStepFilter}
                onChange={(e) => setCartonStepFilter(e.target.value as any)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium outline-none"
              >
                <option value="all">Toutes étapes (1-3)</option>
                <option value="1">Étape 1 (C1)</option>
                <option value="2">Étape 2 (C2)</option>
                <option value="3">Étape 3 (C3)</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-3">ID Carton</th>
                  <th className="py-2.5 px-3">Modèle</th>
                  <th className="py-2.5 px-3">Pointure</th>
                  <th className="py-2.5 px-3 text-center">Étape</th>
                  <th className="py-2.5 px-3">Couleurs Réalisées</th>
                  <th className="py-2.5 px-3 text-right">Paires</th>
                  <th className="py-2.5 px-3 text-center">Contrôle</th>
                  <th className="py-2.5 px-3 text-center">Statut</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {filteredCartons.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      Aucun carton trouvé pour ces critères.
                    </td>
                  </tr>
                ) : (
                  filteredCartons.map((c, idx) => {
                    const validation = evaluateCartonClosure(c, { authorizedOperator: operateur });
                    return (
                      <tr key={`${c.id_carton}-${c.statut}-${idx}`} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-3 whitespace-nowrap font-mono font-bold text-blue-700">
                          {c.id_carton}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">{c.modele_id}</td>
                        <td className="py-2.5 px-3">{c.pointure_text}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-2 py-0.5 rounded text-[11px] font-extrabold bg-blue-100 text-blue-800">
                            Étape {c.etape_actuelle || 1}/3
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex flex-wrap gap-1">
                            {c.couleur_1 && (
                              <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-semibold border border-slate-200">
                                C1: {c.couleur_1}
                              </span>
                            )}
                            {c.couleur_2 && (
                              <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[10px] font-semibold border border-indigo-200">
                                C2: {c.couleur_2}
                              </span>
                            )}
                            {c.couleur_3 && (
                              <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded text-[10px] font-semibold border border-purple-200">
                                C3: {c.couleur_3}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                          {c.total_paires ?? c.paires_actuelles ?? 0}/{c.paires_par_carton || 12}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {c.controle_qualite_valide ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              <ShieldCheck className="w-3 h-3" />
                              Validé
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              En attente
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                              c.statut === 'FERME'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {c.statut}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedCarton(c)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors"
                          >
                            Inspecter
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

      {/* TAB 4: CLÔTURE SÉCURISÉE (5 CONDITIONS) */}
      {activeTab === 'closure' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Lock className="w-5 h-5 text-amber-600" />
                Module de Clôture Sécurisée (Respect Strict des 5 Conditions)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Un carton incomplet reste <strong className="text-slate-800">OUVERT</strong>. Seuls les cartons vérifiés et validés par l'opérateur habilité deviennent <strong className="text-emerald-700">FERMÉS</strong>.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Signataire autorisé :</span>
              <input
                type="text"
                value={authorizedSigner}
                onChange={(e) => setAuthorizedSigner(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Grille des cartons en attente de clôture */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Box className="w-4 h-4 text-blue-600" />
              Cartons Arrivés à l'Étape 3 (Couleurs Réalisées)
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ctpCartons
                .filter((c) => c.statut === 'OUVERT' && (c.etape_actuelle === 3 || c.couleur_3))
                .map((carton) => {
                  const val = evaluateCartonClosure(carton, { authorizedOperator: authorizedSigner });
                  return (
                    <div
                      key={carton.id_carton}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3 shadow-sm hover:border-blue-300 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-xs text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {carton.id_carton}
                        </span>
                        <span className="text-xs font-black text-slate-900">
                          {carton.modele_id} ({carton.pointure_text})
                        </span>
                      </div>

                      {/* Checklist des 5 critères */}
                      <div className="space-y-1.5 text-[11px]">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600">1. Toutes couleurs réalisées :</span>
                          <span className={`font-bold ${val.allStepsCompleted ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {val.allStepsCompleted ? '3/3' : 'Incomplet'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600">2. Quantité complète (12/12) :</span>
                          <span className={`font-bold ${val.requiredPairsComplete ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {carton.total_paires ?? carton.paires_actuelles ?? 0}/{carton.paires_par_carton || 12} p.
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600">3. Config modèle/pointure :</span>
                          <span className="font-bold text-emerald-600">Conforme</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600">4. Contrôle qualité :</span>
                          {carton.controle_qualite_valide ? (
                            <span className="font-bold text-emerald-600 flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3" /> Approuvé
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleValidateQC(carton.id_carton)}
                              className="px-2 py-0.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded text-[10px] transition-colors"
                            >
                              Valider Contrôle
                            </button>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600">5. Signataire :</span>
                          <span className="font-bold text-slate-800">{authorizedSigner}</span>
                        </div>
                      </div>

                      {/* Bouton Clôture Définitive */}
                      <div className="pt-2 border-t border-slate-200">
                        {val.canClose ? (
                          <button
                            type="button"
                            onClick={() => handleCloseCarton(carton.id_carton)}
                            className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            Clôturer & Sceller Carton
                          </button>
                        ) : (
                          <div className="p-2 bg-amber-50 rounded-lg text-[10px] text-amber-800 font-semibold border border-amber-200">
                            Carton OUVERT : {val.blockReasons[0]}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* MODAL INSPECTION CARTON */}
      {selectedCarton && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Box className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-black text-slate-900">{selectedCarton.id_carton}</h3>
              </div>
              <button
                onClick={() => setSelectedCarton(null)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            {/* QR Code & Détails */}
            <div className="flex items-start gap-4">
              <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl shrink-0">
                <img
                  src={selectedCarton.QR_code || getCartonQrCodeDataUrl(selectedCarton.id_carton)}
                  alt="QR Code"
                  className="w-24 h-24 object-contain"
                />
              </div>
              <div className="space-y-1 text-xs">
                <div>
                  <span className="text-slate-500">Modèle :</span>{' '}
                  <strong className="text-slate-900">{selectedCarton.modele_id}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Pointure :</span>{' '}
                  <strong className="text-slate-900">{selectedCarton.pointure_text}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Capacité :</span>{' '}
                  <strong className="text-slate-900">
                    {selectedCarton.total_paires ?? selectedCarton.paires_actuelles ?? 0}/{selectedCarton.paires_par_carton || 12} paires
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500">Statut :</span>{' '}
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      selectedCarton.statut === 'FERME'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {selectedCarton.statut}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Étape actuelle :</span>{' '}
                  <strong className="text-blue-700">Étape {selectedCarton.etape_actuelle || 1}/3</strong>
                </div>
              </div>
            </div>

            {/* Historique des Étapes */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="text-[11px] font-bold uppercase text-slate-600">Historique des 3 Couleurs / Étapes :</div>
              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between p-1.5 bg-white rounded border border-slate-100">
                  <span className="font-semibold text-slate-700">Étape 1 (C1) :</span>
                  <span className="text-slate-900 font-bold">
                    {selectedCarton.couleur_1 ? `${selectedCarton.couleur_1} (${selectedCarton.equipe_c1 || 'A'})` : 'En attente'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-1.5 bg-white rounded border border-slate-100">
                  <span className="font-semibold text-slate-700">Étape 2 (C2) :</span>
                  <span className="text-slate-900 font-bold">
                    {selectedCarton.couleur_2 ? `${selectedCarton.couleur_2} (${selectedCarton.equipe_c2 || 'B'})` : 'En attente'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-1.5 bg-white rounded border border-slate-100">
                  <span className="font-semibold text-slate-700">Étape 3 (C3) :</span>
                  <span className="text-slate-900 font-bold">
                    {selectedCarton.couleur_3 ? `${selectedCarton.couleur_3} (${selectedCarton.equipe_c3 || 'C'})` : 'En attente'}
                  </span>
                </div>
              </div>
            </div>

            {/* Boutons d'action */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedCarton(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
