import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Gauge,
  Box,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Layers,
  Sparkles,
  RefreshCw,
  QrCode,
  ShieldAlert,
  ShieldCheck,
  ArrowRight,
  Printer,
  ChevronDown,
  ChevronUp,
  PlusCircle,
  Play,
  Check,
  Tag,
  Users,
  Info,
} from 'lucide-react';
import {
  EVA3_JOUR15_SUMMARY,
  EVA3_JOUR15_RECORDS,
  formatCartonMultiColorSummary,
} from '../../data/ctpFactoryErpData';
import { getCartonQrCodeDataUrl } from '../../utils/ctpQrHelper';
import { CtpCarton } from '../../types';

interface CtpEva3Jour15PanelProps {
  compact?: boolean;
}

export const CtpEva3Jour15Panel: React.FC<CtpEva3Jour15PanelProps> = ({ compact = false }) => {
  const {
    importEva3Jour15Data,
    setActiveTab,
    ctpCartons,
    ctpProductionJournal,
    addCouleurToCarton,
    closeCarton,
    stockCartonsRemplisCount,
    stockCartonsFermesCount,
    createNewCarton,
  } = useApp();

  const [selectedTeamFilter, setSelectedTeamFilter] = useState<'ALL' | 'A' | 'B' | 'C'>('ALL');
  const [notification, setNotification] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<boolean>(!compact);
  const [activeSubTab, setActiveSubTab] = useState<'multi_couleur' | 'tableau_floor' | 'fiches_equipes' | 'journal_actions'>('multi_couleur');

  // Terminal Multi-Couleurs
  const [selectedCartonId, setSelectedCartonId] = useState<string>('NM-28-35-101');
  const [selectedPointure, setSelectedPointure] = useState<string>('28-35');
  const [inputEquipe, setInputEquipe] = useState<'A' | 'B' | 'C'>('A');
  const [inputCouleur, setInputCouleur] = useState<string>('GRIS ROSE');
  const [inputQte, setInputQte] = useState<number>(4);
  const [customColor, setCustomColor] = useState<string>('');
  const [useCustomColor, setUseCustomColor] = useState<boolean>(false);

  // Modal confirmation إغلاق نهائي؟
  const [cartonToConfirmClose, setCartonToConfirmClose] = useState<string | null>(null);

  // Cartons EVA 3 en mémoire
  const eva3CartonsList = useMemo(() => {
    const list = ctpCartons.filter((c) => c.machine_origine === 'EVA 3' || c.id_carton.includes('101') || c.id_carton.includes('EVA3'));
    const seen = new Set<string>();
    return list.filter((c) => {
      if (!c.id_carton || seen.has(c.id_carton)) return false;
      seen.add(c.id_carton);
      return true;
    });
  }, [ctpCartons]);

  // Cartons OUVERTS disponibles pour ajout
  const openCartons = useMemo(() => {
    const list = ctpCartons.filter((c) => c.statut === 'OUVERT');
    const seen = new Set<string>();
    return list.filter((c) => {
      if (!c.id_carton || seen.has(c.id_carton)) return false;
      seen.add(c.id_carton);
      return true;
    });
  }, [ctpCartons]);

  // Carton actif sélectionné
  const currentCarton = useMemo(() => {
    return ctpCartons.find((c) => c.id_carton === selectedCartonId) || ctpCartons[0];
  }, [ctpCartons, selectedCartonId]);

  const handleImport = () => {
    const res = importEva3Jour15Data();
    if (res.success) {
      setNotification(res.message);
      setTimeout(() => setNotification(null), 6000);
    }
  };

  const filteredRecords = EVA3_JOUR15_RECORDS.filter((r) => {
    if (selectedTeamFilter === 'ALL') return true;
    return r.equipe === selectedTeamFilter;
  });

  // Action d'ajout couleur
  const handleAddColor = () => {
    const couleurFinale = useCustomColor ? customColor.trim().toUpperCase() : inputCouleur;
    if (!couleurFinale) {
      setNotification('Veuillez spécifier une couleur.');
      return;
    }
    if (inputQte <= 0) {
      setNotification('La quantité doit être supérieure à 0.');
      return;
    }

    // Si le carton n'existe pas encore, on le crée d'abord
    const existing = ctpCartons.find((c) => c.id_carton === selectedCartonId);
    if (!existing) {
      createNewCarton({
        id_carton: selectedCartonId,
        modele_id: 'NM',
        pointure_text: selectedPointure,
        machine_origine: 'EVA 3',
        paires_par_carton: 12,
      });
    }

    const res = addCouleurToCarton({
      cartonId: selectedCartonId,
      equipe: inputEquipe,
      couleur: couleurFinale,
      qte: inputQte,
      machine: 'EVA 3',
    });

    setNotification(res.message);
    setTimeout(() => setNotification(null), 6000);
  };

  // Fermeture confirmée
  const handleConfirmClose = (cartonId: string) => {
    const res = closeCarton(cartonId, 'C');
    if (res.success) {
      setNotification(`Carton ${cartonId} scellé avec succès : statut FERMÉ (تم غلقها). Transféré au stock commercial vendable !`);
    } else {
      setNotification(res.message);
    }
    setCartonToConfirmClose(null);
    setTimeout(() => setNotification(null), 6000);
  };

  // Démonstration en 1-clic de l'exemple carton #101
  const handleRunExample101 = () => {
    const cartonId = 'NM-28-35-101';
    setSelectedCartonId(cartonId);

    // 1. Initialiser le carton si pas déjà fait
    const existing = ctpCartons.find((c) => c.id_carton === cartonId);
    if (!existing) {
      createNewCarton({
        id_carton: cartonId,
        modele_id: 'NM',
        pointure_text: '28-35',
        machine_origine: 'EVA 3',
        paires_par_carton: 12,
      });
    }

    // Équipe A: 4x GRIS ROSE
    addCouleurToCarton({
      cartonId,
      equipe: 'A',
      couleur: 'GRIS ROSE',
      qte: 4,
      machine: 'EVA 3',
    });

    // Équipe B: 4x NOIR
    setTimeout(() => {
      addCouleurToCarton({
        cartonId,
        equipe: 'B',
        couleur: 'NOIR',
        qte: 4,
        machine: 'EVA 3',
      });
    }, 150);

    // Équipe C: 4x VERT
    setTimeout(() => {
      addCouleurToCarton({
        cartonId,
        equipe: 'C',
        couleur: 'VERT',
        qte: 4,
        machine: 'EVA 3',
      });
      setNotification('Exemple Carton #101 complété avec succès (4 GRIS ROSE A + 4 NOIR B + 4 VERT C = 12/12). Prêt pour fermeture par Équipe C !');
    }, 300);
  };

  const availableColors = ['GRIS ROSE', 'NOIR', 'VERT', 'BEIGE', 'BLEU', 'ROUGE', 'BLANC', 'MARRON', 'ORANGE', 'KAKI'];

  return (
    <div className="bg-white rounded-2xl border-2 border-slate-900/10 shadow-lg overflow-hidden">
      {/* Header Bar */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white p-5 sm:p-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 text-xs font-black tracking-wide uppercase flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                Scénario Officiel EVA 3 • Jour 15/09/2026
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-xs font-semibold">
                Logique 3 Couleurs Max par Carton
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-semibold">
                Équipe C seule habilitée à fermer
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
              <span>Machine EVA 3 — Logique 3 Couleurs & Double Compteur</span>
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-3xl">
              1 carton (12 paires) peut contenir 1, 2 ou 3 couleurs (même pointure). Gestion en temps réel de la distinction entre{' '}
              <strong className="text-indigo-300 font-bold">"تم ملؤها"</strong> (carton entamé &gt;0) et{' '}
              <strong className="text-emerald-300 font-bold">"تم غلقها"</strong> (carton complet 12 et scellé pour le stock vendable).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleRunExample101}
              className="px-3.5 py-2 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center gap-1.5"
              title="Exécute l'exemple #101 : 4x Gris Rose (A) + 4x Noir (B) + 4x Vert (C) = 12 Fermé"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Simuler Carton #101</span>
            </button>
            <button
              onClick={handleImport}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold rounded-xl text-xs transition-all border border-amber-400/30 flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Réinitialiser Scénario 15</span>
            </button>
            <button
              onClick={() => setExpandedSection(!expandedSection)}
              className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-xl transition-all"
              title={expandedSection ? 'Réduire' : 'Développer'}
            >
              {expandedSection ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Feedback Toast Notification */}
        {notification && (
          <div className="mt-4 p-3 bg-emerald-500/20 border border-emerald-400/40 rounded-xl text-emerald-200 text-xs flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{notification}</span>
          </div>
        )}
      </div>

      {/* BANDEAU DISTINCTION DES 2 COMPTEURS CTP RÉELS */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-b border-indigo-900/50">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Compteur 1 : تم ملؤها */}
          <div className="p-4 rounded-xl bg-white/5 border border-indigo-400/30 backdrop-blur-sm flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-indigo-500/30 text-indigo-300 text-[10px] font-black uppercase">
                  Compteur Atelier & Organisation
                </span>
              </div>
              <div className="text-lg font-black text-white flex items-center gap-2">
                <span className="text-2xl sm:text-3xl text-indigo-400 font-mono">
                  {stockCartonsRemplisCount}
                </span>
                <span className="text-base sm:text-lg">تم ملؤها</span>
                <span className="text-xs text-slate-400 font-sans font-normal">(Cartons entamés &gt;0 p.)</span>
              </div>
              <p className="text-[11px] text-indigo-200">
                Cartons ayant commencé à être remplis par l'Équipe A ou B. Réservé au Chef de Production pour l'organisation de l'atelier.
              </p>
            </div>
            <div className="p-3 bg-indigo-500/20 text-indigo-300 rounded-xl shrink-0">
              <Box className="w-6 h-6" />
            </div>
          </div>

          {/* Compteur 2 : تم غلقها */}
          <div className="p-4 rounded-xl bg-white/5 border border-emerald-400/30 backdrop-blur-sm flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-emerald-500/30 text-emerald-300 text-[10px] font-black uppercase">
                  Compteur Commercial & Stock Fini
                </span>
              </div>
              <div className="text-lg font-black text-white flex items-center gap-2">
                <span className="text-2xl sm:text-3xl text-emerald-400 font-mono">
                  {stockCartonsFermesCount}
                </span>
                <span className="text-base sm:text-lg">تم غلقها</span>
                <span className="text-xs text-slate-400 font-sans font-normal">(Cartons fermés 12/12)</span>
              </div>
              <p className="text-[11px] text-emerald-200">
                Cartons scellés à 12 paires fermés par l'Équipe C. Seul stock reconnu pour la facturation et les expéditions clients.
              </p>
            </div>
            <div className="p-3 bg-emerald-500/20 text-emerald-300 rounded-xl shrink-0">
              <Lock className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* 4 KPIS MAJEURS COMPTEURS MACHINE & REBUTS */}
      <div className="p-5 sm:p-6 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 : Total Compteur 1862 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Compteur Machine
            </span>
            <span className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Gauge className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-950 mt-1">
            {EVA3_JOUR15_SUMMARY.totalCompteur.toLocaleString('fr-FR')}{' '}
            <span className="text-xs font-bold text-blue-600">paires (1=1)</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between text-[11px] text-slate-600 font-mono">
            <span>A: {EVA3_JOUR15_SUMMARY.teams[0]?.totalCompteur ?? 604}</span>
            <span>B: {EVA3_JOUR15_SUMMARY.teams[1]?.totalCompteur ?? 644}</span>
            <span>C: {EVA3_JOUR15_SUMMARY.teams[2]?.totalCompteur ?? 614}</span>
          </div>
        </div>

        {/* KPI 2 : Total Fermé 144 Cartons (1728 Paires) */}
        <div className="bg-white p-4 rounded-xl border-2 border-emerald-500/40 bg-emerald-50/20 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800">
              Stock Vendable (Cartons Fermés)
            </span>
            <span className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
              <Lock className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1">
            {EVA3_JOUR15_SUMMARY.totalCartonsFermes}{' '}
            <span className="text-xs font-bold text-emerald-800">cartons</span>
          </div>
          <div className="mt-2 pt-2 border-t border-emerald-100 flex items-center justify-between text-[11px] text-emerald-800 font-bold">
            <span>{EVA3_JOUR15_SUMMARY.totalPairesFermees.toLocaleString('fr-FR')} paires vendables</span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-900 text-[10px]">100% Fermé Équipe C</span>
          </div>
        </div>

        {/* KPI 3 : WIP Restant 32 Paires */}
        <div className="bg-white p-4 rounded-xl border-2 border-amber-500/30 bg-amber-50/20 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-amber-800">
              WIP Restant (Cartons Ouverts)
            </span>
            <span className="p-2 rounded-lg bg-amber-100 text-amber-700">
              <Box className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-700 mt-1">
            {EVA3_JOUR15_SUMMARY.totalWipPaires}{' '}
            <span className="text-xs font-bold text-amber-800">paires en cours</span>
          </div>
          <div className="mt-2 pt-2 border-t border-amber-100 flex items-center justify-between text-[11px] text-amber-800 font-medium">
            <span>Non vendable (en atelier)</span>
            <span className="px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 text-[10px] font-bold">Reste paires % 12</span>
          </div>
        </div>

        {/* KPI 4 : Alertes Écart Compteur vs Saisi 44 / 44 / 14 */}
        <div className="bg-white p-4 rounded-xl border-2 border-rose-500/30 bg-rose-50/20 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-rose-800">
              Alertes Rebuts Compteur
            </span>
            <span className="p-2 rounded-lg bg-rose-100 text-rose-700">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-600 mt-1">
            44 / 44 / 14
          </div>
          <div className="mt-2 pt-2 border-t border-rose-100 flex items-center justify-between text-[11px] text-rose-800 font-medium">
            <span>Équipe A : 44 • B : 44 • C : 14</span>
            <span className="px-1.5 py-0.5 rounded bg-rose-200 text-rose-900 text-[10px] font-bold">102 Rebuts</span>
          </div>
        </div>
      </div>

      {/* DETAILS ET WORKSPACES (Affiché si développé) */}
      {expandedSection && (
        <div className="p-5 sm:p-6 space-y-6">
          {/* Sub-Navigation Tabs */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
            <button
              onClick={() => setActiveSubTab('multi_couleur')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                activeSubTab === 'multi_couleur'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Logique 3 Couleurs / Carton & Remplissage</span>
            </button>
            <button
              onClick={() => setActiveSubTab('fiches_equipes')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                activeSubTab === 'fiches_equipes'
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Fiches Équipes A / B / C (Règles Remplissage/Fermeture)</span>
            </button>
            <button
              onClick={() => setActiveSubTab('tableau_floor')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                activeSubTab === 'tableau_floor'
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Rapport Décomposition FLOOR(/12) & Rebuts</span>
            </button>
            <button
              onClick={() => setActiveSubTab('journal_actions')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                activeSubTab === 'journal_actions'
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>Journal des Actions (ملؤها / غلقها)</span>
            </button>
          </div>

          {/* SUB-TAB 1 : LOGIQUE 3 COULEURS PAR CARTON & TERMINAL D'INJECTION */}
          {activeSubTab === 'multi_couleur' && (
            <div className="space-y-6">
              {/* Règle Métier Réelle CTP Banner */}
              <div className="p-4 bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-emerald-500/10 border-2 border-indigo-200 rounded-2xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-black uppercase text-indigo-900">
                      <ShieldCheck className="w-4 h-4 text-indigo-600" />
                      <span>RÈGLE MÉTIER RÉELLE CTP (TRÈS IMPORTANT)</span>
                    </div>
                    <p className="text-xs text-slate-800 font-semibold">
                      • <strong>1 carton = 12 paires</strong> = peut contenir <strong>1, 2 ou 3 couleurs maximum</strong> (même pointure).
                    </p>
                    <p className="text-xs text-slate-700 font-mono">
                      • Exemple carton #101 - 28/35 : <span className="text-rose-700 font-bold">4x GRIS ROSE (Équipe A)</span> +{' '}
                      <span className="text-slate-900 font-bold">4x NOIR (Équipe B)</span> +{' '}
                      <span className="text-emerald-700 font-bold">4x VERT (Équipe C)</span> = <strong className="text-emerald-900">12 FERMÉ</strong>
                    </p>
                  </div>

                  <button
                    onClick={handleRunExample101}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow transition flex items-center justify-center gap-2 shrink-0"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Exécuter l'Exemple Carton #101</span>
                  </button>
                </div>
              </div>

              {/* Terminal Interactif d'Ajout Couleur au Carton */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Formulaire Opérateur Gauche (5 colonnes) */}
                <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <PlusCircle className="w-4 h-4 text-indigo-600" />
                      <span>Poste Remplissage Équipe</span>
                    </h3>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold">
                      1 à 3 Couleurs
                    </span>
                  </div>

                  {/* Choix ou Saisie Carton */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Numéro ou Identifiant Carton :
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={selectedCartonId}
                        onChange={(e) => setSelectedCartonId(e.target.value)}
                        placeholder="ex: NM-28-35-101"
                        className="flex-1 px-3 py-2 text-xs font-mono font-bold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                      <select
                        onChange={(e) => setSelectedCartonId(e.target.value)}
                        value={selectedCartonId}
                        className="px-2 py-2 text-xs bg-white border border-slate-300 rounded-xl font-bold"
                      >
                        <option value="NM-28-35-101">#101 (Exemple 28/35)</option>
                        {openCartons.map((c) => (
                          <option key={c.id_carton} value={c.id_carton}>
                            {c.id_carton} ({c.total_paires || c.paires_actuelles}/12)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Pointure */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Pointure (même pointure par carton) :</label>
                    <select
                      value={selectedPointure}
                      onChange={(e) => setSelectedPointure(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-xl"
                    >
                      <option value="28-35">28-35 (Modèle Enfant NM)</option>
                      <option value="36-39">36-39 (Modèle Junior NM)</option>
                      <option value="40-44">40-44 (Modèle Adulte NM)</option>
                    </select>
                  </div>

                  {/* Choix de l'Équipe */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Équipe en cours :</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['A', 'B', 'C'] as const).map((eq) => (
                        <button
                          key={eq}
                          type="button"
                          onClick={() => setInputEquipe(eq)}
                          className={`py-2 text-xs font-black rounded-xl border transition-all ${
                            inputEquipe === eq
                              ? 'bg-slate-950 text-white border-slate-950 shadow-sm'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          Équipe {eq}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Choix de la Couleur */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700">Couleur ajoutée :</label>
                      <button
                        type="button"
                        onClick={() => setUseCustomColor(!useCustomColor)}
                        className="text-[10px] text-indigo-600 font-bold hover:underline"
                      >
                        {useCustomColor ? 'Liste prédéfinie' : 'Couleur personnalisée'}
                      </button>
                    </div>

                    {useCustomColor ? (
                      <input
                        type="text"
                        value={customColor}
                        onChange={(e) => setCustomColor(e.target.value)}
                        placeholder="ex: BLEU MARINE, JAUNE..."
                        className="w-full px-3 py-2 text-xs uppercase font-bold bg-white border border-slate-300 rounded-xl"
                      />
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        {availableColors.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setInputCouleur(color)}
                            className={`px-2 py-1.5 text-[11px] font-bold rounded-lg border text-left truncate transition ${
                              inputCouleur === color
                                ? 'bg-indigo-600 text-white border-indigo-600'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {color}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Quantité de Paires */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Quantité de paires à ajouter (Ex: 4) :
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="12"
                        value={inputQte}
                        onChange={(e) => setInputQte(Math.max(1, Math.min(12, parseInt(e.target.value) || 1)))}
                        className="w-24 px-3 py-2 text-center text-sm font-black bg-white border border-slate-300 rounded-xl font-mono"
                      />
                      <div className="flex gap-1">
                        {[2, 4, 6, 8].map((q) => (
                          <button
                            key={q}
                            type="button"
                            onClick={() => setInputQte(q)}
                            className="px-2.5 py-1 text-xs font-bold bg-white border border-slate-200 rounded-lg hover:bg-slate-100"
                          >
                            +{q}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Bouton d'ajout */}
                  <button
                    onClick={handleAddColor}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-xs shadow-md transition flex items-center justify-center gap-2"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Ajouter {inputQte}x {useCustomColor ? customColor : inputCouleur} (Équipe {inputEquipe})</span>
                  </button>
                </div>

                {/* État Visuel du Carton Actif (7 colonnes) */}
                <div className="lg:col-span-7 bg-white border-2 border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-lg text-slate-900">
                            {currentCarton ? currentCarton.id_carton : selectedCartonId}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-black rounded-full uppercase ${
                              (currentCarton?.statut || 'OUVERT') === 'FERME'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {currentCarton?.statut || 'OUVERT'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium">
                          Pointure: <strong>{currentCarton?.pointure_text || selectedPointure}</strong> • Machine: {currentCarton?.machine_origine || 'EVA 3'}
                        </p>
                      </div>

                      <div className="text-right">
                        <div className="text-2xl font-black font-mono text-slate-900">
                          {currentCarton ? (currentCarton.total_paires ?? currentCarton.paires_actuelles ?? 0) : 0}/12
                        </div>
                        <div className="text-[10px] text-slate-500 font-semibold">PAIRES SCELLÉES</div>
                      </div>
                    </div>

                    {/* Jauge Visuelle 12 Segments */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-600 mb-1.5">
                        <span>Progression Remplissage (12 Paires) :</span>
                        <span>
                          Reste: {Math.max(0, 12 - (currentCarton ? (currentCarton.total_paires ?? currentCarton.paires_actuelles ?? 0) : 0))} paires
                        </span>
                      </div>
                      <div className="grid grid-cols-12 gap-1.5 h-6 bg-slate-100 p-1 rounded-xl border border-slate-200">
                        {Array.from({ length: 12 }).map((_, idx) => {
                          const c1Qty = currentCarton?.qte_c1 || 0;
                          const c2Qty = currentCarton?.qte_c2 || 0;
                          const c3Qty = currentCarton?.qte_c3 || 0;

                          let bgClass = 'bg-slate-200';
                          let label = '';
                          if (idx < c1Qty) {
                            bgClass = 'bg-rose-500 text-white';
                            label = 'C1';
                          } else if (idx < c1Qty + c2Qty) {
                            bgClass = 'bg-slate-900 text-white';
                            label = 'C2';
                          } else if (idx < c1Qty + c2Qty + c3Qty) {
                            bgClass = 'bg-emerald-500 text-white';
                            label = 'C3';
                          }

                          return (
                            <div
                              key={idx}
                              className={`h-full rounded-md flex items-center justify-center text-[9px] font-bold transition-all ${bgClass}`}
                              title={`Paire #${idx + 1}`}
                            >
                              {label}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Décomposition des 3 Couleurs dans le Carton */}
                    <div className="mt-4 grid grid-cols-3 gap-3">
                      {/* Couleur 1 */}
                      <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl">
                        <div className="text-[10px] font-bold text-rose-800 uppercase flex justify-between">
                          <span>Couleur 1</span>
                          <span className="font-mono">Équipe {currentCarton?.equipe_c1 || '-'}</span>
                        </div>
                        <div className="font-black text-xs text-rose-950 truncate mt-1">
                          {currentCarton?.couleur_1 || 'Vide'}
                        </div>
                        <div className="text-sm font-black text-rose-700 mt-1">
                          {currentCarton?.qte_c1 ? `${currentCarton.qte_c1} paires` : '0 p.'}
                        </div>
                      </div>

                      {/* Couleur 2 */}
                      <div className="p-3 bg-slate-100 border border-slate-300 rounded-xl">
                        <div className="text-[10px] font-bold text-slate-700 uppercase flex justify-between">
                          <span>Couleur 2</span>
                          <span className="font-mono">Équipe {currentCarton?.equipe_c2 || '-'}</span>
                        </div>
                        <div className="font-black text-xs text-slate-900 truncate mt-1">
                          {currentCarton?.couleur_2 || 'Non entamée'}
                        </div>
                        <div className="text-sm font-black text-slate-800 mt-1">
                          {currentCarton?.qte_c2 ? `${currentCarton.qte_c2} paires` : '0 p.'}
                        </div>
                      </div>

                      {/* Couleur 3 */}
                      <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                        <div className="text-[10px] font-bold text-emerald-800 uppercase flex justify-between">
                          <span>Couleur 3</span>
                          <span className="font-mono">Équipe {currentCarton?.equipe_c3 || '-'}</span>
                        </div>
                        <div className="font-black text-xs text-emerald-950 truncate mt-1">
                          {currentCarton?.couleur_3 || 'Non entamée'}
                        </div>
                        <div className="text-sm font-black text-emerald-700 mt-1">
                          {currentCarton?.qte_c3 ? `${currentCarton.qte_c3} paires` : '0 p.'}
                        </div>
                      </div>
                    </div>

                    {/* QR Code String Format Spécifié */}
                    <div className="mt-4 p-3 bg-slate-900 text-white rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                          <QrCode className="w-3.5 h-3.5" />
                          Contenu de l'étiquette QR Code Carton
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {currentCarton?.nb_couleurs || 0}/3 Couleurs
                        </span>
                      </div>
                      <div className="text-xs font-mono font-bold text-amber-200 break-all bg-black/40 p-2 rounded-lg border border-white/10">
                        {currentCarton
                          ? formatCartonMultiColorSummary(currentCarton)
                          : `Carton 101: GRIS ROSE 4 (A) + NOIR 4 (B) = 8/12 - Reste 4 - Couleurs: 2/3`}
                      </div>
                    </div>
                  </div>

                  {/* Zone de Fermeture Définitive (Bouton إغلاق نهائي) */}
                  <div className="mt-4 pt-3 border-t border-slate-200">
                    {currentCarton && (currentCarton.total_paires ?? currentCarton.paires_actuelles ?? 0) === 12 && currentCarton.statut === 'OUVERT' ? (
                      <div className="space-y-2">
                        <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-900 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>
                            <strong>Carton complet (12/12 paires) :</strong> Seule l'<strong>Équipe C</strong> est habilitée à sceller et fermer définitivement ce carton.
                          </span>
                        </div>
                        <button
                          onClick={() => setCartonToConfirmClose(currentCarton.id_carton)}
                          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-sm shadow-md transition flex items-center justify-center gap-2"
                        >
                          <Lock className="w-4 h-4" />
                          <span>إغلاق الكرتونة (Fermer Carton - Équipe C)</span>
                        </button>
                      </div>
                    ) : currentCarton?.statut === 'FERME' ? (
                      <div className="p-3 bg-emerald-100 border border-emerald-300 rounded-xl text-xs text-emerald-950 font-bold flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-emerald-700" />
                          Carton scellé et fermé définitivement (Statut FERMÉ • تم غلقها)
                        </span>
                        <span className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[10px]">Stock Vendable</span>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 italic text-center py-2 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        Carton en cours de remplissage ({currentCarton ? (currentCarton.total_paires ?? currentCarton.paires_actuelles ?? 0) : 0}/12). Le bouton de fermeture apparaîtra lorsque le carton aura atteint 12 paires.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Tableau Récapitulatif des Cartons Multi-Couleurs Réels */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="bg-slate-100 p-3.5 border-b border-slate-200 flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
                    <Box className="w-4 h-4 text-indigo-600" />
                    <span>Table Cartons Multi-Couleurs EVA 3 (En Mémoire)</span>
                  </h4>
                  <span className="text-xs font-bold text-slate-600">
                    Total: {eva3CartonsList.length} cartons
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 text-slate-800 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">id_carton</th>
                        <th className="py-2.5 px-3">Pointure</th>
                        <th className="py-2.5 px-3">Couleur 1</th>
                        <th className="py-2.5 px-3">Couleur 2</th>
                        <th className="py-2.5 px-3">Couleur 3</th>
                        <th className="py-2.5 px-3 text-center">Total Paires</th>
                        <th className="py-2.5 px-3 text-center">Couleurs</th>
                        <th className="py-2.5 px-3 text-center">Statut</th>
                        <th className="py-2.5 px-3 text-center">Équipes Touchées</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {eva3CartonsList.slice(0, 10).map((carton) => {
                        const total = carton.total_paires ?? carton.paires_actuelles ?? 0;
                        const isFull = total === (carton.paires_par_carton || 12);

                        return (
                          <tr
                            key={carton.id_carton}
                            className={`hover:bg-indigo-50/40 cursor-pointer ${
                              carton.id_carton === selectedCartonId ? 'bg-indigo-50/60 font-bold' : ''
                            }`}
                            onClick={() => setSelectedCartonId(carton.id_carton)}
                          >
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                              {carton.id_carton}
                            </td>
                            <td className="py-2.5 px-3 font-semibold">{carton.pointure_text}</td>
                            <td className="py-2.5 px-3">
                              {carton.couleur_1 ? (
                                <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200 text-[11px]">
                                  {carton.qte_c1}x {carton.couleur_1} ({carton.equipe_c1})
                                </span>
                              ) : (
                                '-'
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              {carton.couleur_2 ? (
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-300 text-[11px]">
                                  {carton.qte_c2}x {carton.couleur_2} ({carton.equipe_c2})
                                </span>
                              ) : (
                                '-'
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              {carton.couleur_3 ? (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px]">
                                  {carton.qte_c3}x {carton.couleur_3} ({carton.equipe_c3})
                                </span>
                              ) : (
                                '-'
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold">
                              <span className={total === 12 ? 'text-emerald-700' : 'text-amber-700'}>
                                {total}/12
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 text-[10px] font-bold">
                                {carton.nb_couleurs || 1}/3
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                  carton.statut === 'FERME'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {carton.statut}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold">
                              {carton.nb_equipes_touchees || 1}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              {isFull && carton.statut === 'OUVERT' ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCartonToConfirmClose(carton.id_carton);
                                  }}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold"
                                >
                                  Fermer (C)
                                </button>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedCartonId(carton.id_carton);
                                  }}
                                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold"
                                >
                                  Sélectionner
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SUB-TAB 2 : FICHES ÉQUIPES A / B / C */}
          {activeSubTab === 'fiches_equipes' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Équipe A Card */}
                <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <span className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-600" />
                      <span>Fiche Équipe A</span>
                    </span>
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-xs font-black font-mono">
                      POSTE 1
                    </span>
                  </div>
                  <div className="space-y-2 text-xs text-slate-700">
                    <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl space-y-1">
                      <p className="font-bold text-blue-900">
                        • Règle : Peut remplir 40 cartons vides SANS FERMER.
                      </p>
                      <p className="text-blue-800">
                        Il note sur sa fiche de fin de poste : <strong className="font-bold">"40 تم ملؤها"</strong>.
                      </p>
                      <p className="text-blue-800">
                        S'il trouve des cartons avec 1 couleur déjà présente, il ajoute la 2ème couleur sans fermer.
                      </p>
                    </div>
                    <ul className="list-disc pl-4 space-y-1 text-slate-600 text-[11px]">
                      <li>Incrémente le compteur de début de remplissage.</li>
                      <li>Statut des cartons reste strictement <strong>OUVERT</strong>.</li>
                      <li>Action journal enregistrée : <code>ملؤها</code>.</li>
                    </ul>
                  </div>
                </div>

                {/* Équipe B Card */}
                <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <span className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <Users className="w-4 h-4 text-amber-600" />
                      <span>Fiche Équipe B</span>
                    </span>
                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-xs font-black font-mono">
                      POSTE 2
                    </span>
                  </div>
                  <div className="space-y-2 text-xs text-slate-700">
                    <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl space-y-1">
                      <p className="font-bold text-amber-900">
                        • Règle : Trouve 40 cartons avec 1 couleur.
                      </p>
                      <p className="text-amber-800">
                        Il ajoute la 2ème couleur (ex: 4x NOIR) <strong>SANS FERMER</strong>.
                      </p>
                      <p className="text-amber-800">
                        Le carton atteint 8/12 paires avec 2 couleurs distinctes.
                      </p>
                    </div>
                    <ul className="list-disc pl-4 space-y-1 text-slate-600 text-[11px]">
                      <li>Ne ferme aucun carton même si complet.</li>
                      <li>Action journal enregistrée : <code>ملؤها - لون 2</code>.</li>
                      <li>Reste en attente de la 3ème couleur par l'Équipe C.</li>
                    </ul>
                  </div>
                </div>

                {/* Équipe C Card */}
                <div className="bg-white border-2 border-emerald-400 rounded-2xl p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
                    <span className="text-sm font-black text-emerald-950 flex items-center gap-2">
                      <Lock className="w-4 h-4 text-emerald-600" />
                      <span>Fiche Équipe C</span>
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-xs font-black font-mono">
                      CLÔTURE SEULE
                    </span>
                  </div>
                  <div className="space-y-2 text-xs text-slate-700">
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                      <p className="font-bold text-emerald-900">
                        • Règle : Trouve cartons avec 2 couleurs, ajoute 3ème couleur et FERME.
                      </p>
                      <p className="text-emerald-800">
                        Il note sur sa fiche officielle : <strong className="font-bold">"X تم غلقها"</strong>.
                      </p>
                      <p className="text-emerald-800 font-semibold">
                        Seule équipe habilitée à apposer le scotch de garantie et fermer définitivement.
                      </p>
                    </div>
                    <ul className="list-disc pl-4 space-y-1 text-slate-600 text-[11px]">
                      <li>Exige confirmation : <em>"إغلاق نهائي؟"</em>.</li>
                      <li>Transfère les cartons au Stock Vendable Commercial.</li>
                      <li>Action journal enregistrée : <code>غلقها</code>.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SUB-TAB 3 : TABLEAU DÉCOMPOSITION FLOOR & REBUTS */}
          {activeSubTab === 'tableau_floor' && (
            <div className="space-y-6">
              {/* Table Data */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-sm">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-100 text-slate-800 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Équipe</th>
                      <th className="py-3 px-4">Compteur (Début → Fin)</th>
                      <th className="py-3 px-4">Delta Compteur</th>
                      <th className="py-3 px-4">Modèle & Pointure</th>
                      <th className="py-3 px-4 text-right">Paires Saisies</th>
                      <th className="py-3 px-4 text-center">Formule FLOOR(/12)</th>
                      <th className="py-3 px-4 text-center">Cartons Fermés</th>
                      <th className="py-3 px-4 text-center">WIP (Reste % 12)</th>
                      <th className="py-3 px-4 text-center">Écart Rebut</th>
                      <th className="py-3 px-4 text-center">Alerte</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-medium">
                    {filteredRecords.map((r, index) => {
                      const deltaCompteur = r.total_compteur;
                      const hasRebutAlert = r.ecart_compteur_equipe > 0;
                      const pairesFermees = r.cartons_fermes * 12;

                      return (
                        <tr
                          key={index}
                          className={`hover:bg-slate-50 transition-colors ${
                            hasRebutAlert ? 'bg-rose-50/30' : ''
                          }`}
                        >
                          <td className="py-3 px-4 font-bold text-slate-900">
                            <span
                              className={`inline-block w-6 h-6 rounded-full text-center leading-6 text-xs font-black mr-2 ${
                                r.equipe === 'A'
                                  ? 'bg-blue-100 text-blue-800'
                                  : r.equipe === 'B'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {r.equipe}
                            </span>
                            Équipe {r.equipe}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-600">
                            {r.compteur_debut.toLocaleString('fr-FR')} → {r.compteur_fin.toLocaleString('fr-FR')}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">
                            {deltaCompteur} p.
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-900">{r.modele}</span> • Pt {r.pointure}
                          </td>
                          <td className="py-3 px-4 text-right font-black text-slate-900">
                            {r.paires_saisies} p.
                          </td>
                          <td className="py-3 px-4 text-center text-slate-500 font-mono text-[11px]">
                            FLOOR({r.paires_saisies}/12)
                          </td>
                          <td className="py-3 px-4 text-center font-black text-emerald-700 bg-emerald-50/50">
                            {r.cartons_fermes} ctns ({pairesFermees} p.)
                          </td>
                          <td className="py-3 px-4 text-center font-black text-amber-700 bg-amber-50/50">
                            {r.wip_reste_paires} p.
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-rose-600">
                            {hasRebutAlert ? `-${r.ecart_compteur_equipe} p.` : '0'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {hasRebutAlert ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800">
                                <AlertTriangle className="w-3 h-3 text-rose-600" />
                                {r.equipe === 'A' ? 'Alerte 44' : r.equipe === 'B' ? 'Alerte 44' : 'Alerte 14'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                Conforme
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-900 text-white font-bold text-xs">
                    <tr>
                      <td className="py-3 px-4 uppercase tracking-wider" colSpan={2}>
                        TOTAL JOURNÉE (A + B + C)
                      </td>
                      <td className="py-3 px-4 font-mono font-black text-blue-300">
                        1 862 p.
                      </td>
                      <td className="py-3 px-4">
                        3 Références NM
                      </td>
                      <td className="py-3 px-4 text-right font-black text-amber-300">
                        1 760 p.
                      </td>
                      <td className="py-3 px-4 text-center text-slate-400">
                        FLOOR
                      </td>
                      <td className="py-3 px-4 text-center font-black text-emerald-300 bg-emerald-950/40">
                        144 Cartons (1 728 p.)
                      </td>
                      <td className="py-3 px-4 text-center font-black text-amber-300 bg-amber-950/40">
                        32 p. WIP
                      </td>
                      <td className="py-3 px-4 text-center font-black text-rose-300">
                        102 p.
                      </td>
                      <td className="py-3 px-4 text-center text-rose-300">
                        44 / 44 / 14
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* SUB-TAB 4 : JOURNAL DES ACTIONS ENREGISTRÉES */}
          {activeSubTab === 'journal_actions' && (
            <div className="space-y-4">
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="bg-slate-100 p-3.5 border-b border-slate-200 flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                    Historique de la Table production_journal
                  </h4>
                  <span className="text-xs text-slate-500 font-semibold">
                    Actions: ملؤها / ملؤها - لون 2 / غلقها
                  </span>
                </div>

                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 text-slate-800 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Équipe</th>
                        <th className="py-2.5 px-3">id_carton</th>
                        <th className="py-2.5 px-3">Couleur du Jour</th>
                        <th className="py-2.5 px-3 text-center">Quantité Ajoutée</th>
                        <th className="py-2.5 px-3 text-center">Action Métier</th>
                        <th className="py-2.5 px-3">Observations</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {ctpProductionJournal.slice(0, 20).map((pj) => (
                        <tr key={pj.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-mono text-slate-500">{pj.date}</td>
                          <td className="py-2.5 px-3 font-bold">Équipe {pj.equipe}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{pj.id_carton || '-'}</td>
                          <td className="py-2.5 px-3 font-semibold">{pj.couleur_du_jour || '-'}</td>
                          <td className="py-2.5 px-3 text-center font-bold text-slate-900">
                            +{pj.paires_ajoutees || pj.qte_ajoutee || 0} p.
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                pj.action === 'غلقها' || pj.action === 'FERMETURE'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : pj.action === 'ملؤها - لون 2'
                                  ? 'bg-indigo-100 text-indigo-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {pj.action}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 text-[11px] truncate max-w-xs">
                            {pj.observations || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Règle d'or & Explication métier */}
          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-900">
                <ShieldAlert className="w-4 h-4 text-blue-600" />
                <span>Règle d'or de Clôture Usine : Stock Vendable vs WIP Atelier</span>
              </div>
              <p className="text-xs text-blue-800 leading-relaxed max-w-4xl">
                Sur les <strong>1 760 paires</strong> saisies, l'Équipe C a clôturé officiellement{' '}
                <strong>144 cartons pleins (1 728 paires)</strong> qui constituent le seul stock reconnu par le module Commercial et le Stock Vendable.
                Les <strong>32 paires restantes</strong> demeurent réparties dans les cartons ouverts dans l'atelier (WIP) et ne peuvent pas être vendues tant qu'elles ne sont pas complétées à 12/12.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                onClick={() => setActiveTab('ctp_fermeture')}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
              >
                <span>Fermeture Équipe C</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setActiveTab('ctp_stock')}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
              >
                <span>Stock Vendable (144 ctns)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmation Clôture Finale "إغلاق نهائي؟" */}
      {cartonToConfirmClose && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <span>إغلاق نهائي؟</span>
                  <span className="text-xs font-bold text-slate-500 font-sans">(Fermeture Définitive)</span>
                </h3>
                <p className="text-xs text-slate-500">Carton #{cartonToConfirmClose}</p>
              </div>
            </div>

            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-2">
              <p className="font-semibold text-sm">
                هل أنت متأكد من الإغلاق النهائي وتشميع الكرتونة؟
              </p>
              <p className="text-amber-800 leading-relaxed">
                Ce carton de 12 paires sera scellé définitivement par l'<strong>Équipe C</strong>.
                Il passera immédiatement au statut <strong>FERMÉ (تم غلقها)</strong> et sera incrémenté dans le stock commercial vendable.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => handleConfirmClose(cartonToConfirmClose)}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md flex items-center justify-center gap-2 transition"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>نعم، إغلاق نهائي (Confirmer Clôture)</span>
              </button>
              <button
                onClick={() => setCartonToConfirmClose(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                إلغاء (Annuler)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
