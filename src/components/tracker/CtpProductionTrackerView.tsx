import React, { useState, useMemo, useEffect } from 'react';
import {
  Factory,
  Trophy,
  Award,
  CheckCircle2,
  AlertTriangle,
  Save,
  RotateCcw,
  Sparkles,
  Layers,
  Calendar,
  FileSpreadsheet,
  TrendingUp,
  ShieldCheck,
  ShieldAlert,
  Percent,
  Check,
  BarChart3,
  Info,
  Crown,
  Lock,
  Unlock,
  Printer,
  FileDown,
  UserCheck,
  ArrowRight,
  Boxes,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  canUserAccessMachine,
  canUserAccessShift,
  canUserValidateOrRejectFiche,
  canUserEnterRawMaterial,
} from '../../utils/rbacEngine';
import {
  TrackerMachineCode,
  TrackerEquipeCode,
  TrackerUserRole,
  ProductionTrackerEntry,
  DailyTrackerSummary,
  TRACKER_MACHINE_DEFAULTS,
} from '../../types/ctpProductionTracker';
import {
  TRACKER_MACHINES,
  TRACKER_EQUIPES,
  calculateEntryMetrics,
  computeDailySummary,
  computeFactoryOverview,
  SEED_TRACKER_ENTRIES,
  SEED_TRACKER_SUMMARIES,
  STORAGE_KEY_ENTRIES,
  STORAGE_KEY_SUMMARIES,
} from '../../utils/ctpProductionTrackerEngine';

export const CtpProductionTrackerView: React.FC = () => {
  const {
    currentUser,
    logAudit,
    isRtl,
    confirmFicheByGerant,
    rejectFicheByGerant,
    recordRawMaterialEntryByGerant,
  } = useApp();

  // 1. RÔLE ACTIF POUR LA NAVIGATION WORKFLOW
  const [activeRole, setActiveRole] = useState<TrackerUserRole>('OPERATEUR');

  // 2. DATE ACTIVE (Par défaut aujourd'hui ou 2026-09-20 pour les données de test)
  const [selectedDate, setSelectedDate] = useState<string>('2026-09-20');

  // 3. PERSISTANCE DES ENTRÉES ET DES RÉSUMÉS
  const [entries, setEntries] = useState<ProductionTrackerEntry[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY_ENTRIES);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('Erreur chargement entrées tracker', e);
      }
    }
    return SEED_TRACKER_ENTRIES;
  });

  const [summaries, setSummaries] = useState<DailyTrackerSummary[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY_SUMMARIES);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('Erreur chargement résumés tracker', e);
      }
    }
    return SEED_TRACKER_SUMMARIES;
  });

  // Sauvegarde automatique dans localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_ENTRIES, JSON.stringify(entries));
  }, [entries]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SUMMARIES, JSON.stringify(summaries));
  }, [summaries]);

  // Notifications temporaires
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: 'success' | 'warning' | 'info';
    message: string;
  } | null>(null);

  const showBanner = (type: 'success' | 'warning' | 'info', message: string) => {
    setFeedbackBanner({ type, message });
    setTimeout(() => {
      setFeedbackBanner(null);
    }, 4500);
  };

  // Synchronisation stricte de la Machine & du Shift selon l'organigramme usine
  const cleanUserMachine = useMemo<TrackerMachineCode | null>(() => {
    if (!currentUser?.assignedMachine || currentUser.assignedMachine === 'Toutes') return null;
    const clean = currentUser.assignedMachine.replace(/\s+/g, '') as TrackerMachineCode;
    return TRACKER_MACHINES.includes(clean) ? clean : null;
  }, [currentUser]);

  // =========================================================================
  // ÉTAT DU FORMULAIRE OPÉRATEUR
  // =========================================================================
  const [opMachine, setOpMachine] = useState<TrackerMachineCode>('EVA1');
  const [opEquipe, setOpEquipe] = useState<TrackerEquipeCode>('A');
  const [opDebutCompteur, setOpDebutCompteur] = useState<number | string>(0);
  const [opFinCompteur, setOpFinCompteur] = useState<number | string>(752);
  const [opTtlPaires, setOpTtlPaires] = useState<number | string>(656);
  const [opMatiereGramme, setOpMatiereGramme] = useState<number | string>(285);
  const [opNotes, setOpNotes] = useState<string>('');

  // Synchronisation automatique selon le profil connecté
  useEffect(() => {
    if (currentUser.role === 'chef_equipe') {
      setActiveRole('OPERATEUR');
      if (cleanUserMachine) setOpMachine(cleanUserMachine);
      if (
        currentUser.assignedEquipe &&
        (currentUser.assignedEquipe === 'A' ||
          currentUser.assignedEquipe === 'B' ||
          currentUser.assignedEquipe === 'C')
      ) {
        setOpEquipe(currentUser.assignedEquipe);
      }
    } else if (currentUser.role === 'gerant') {
      setActiveRole('SUPERVISEUR');
      if (cleanUserMachine) setSupMachine(cleanUserMachine);
    } else if (currentUser.role === 'resp_qualite') {
      setActiveRole('SUPERVISEUR');
    }
  }, [currentUser, cleanUserMachine]);

  // États pour la modale de rejet Gérant
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectingEquipe, setRejectingEquipe] = useState<TrackerEquipeCode | null>(null);
  const [rejectionReasonText, setRejectionReasonText] = useState('');

  // États pour l'entrée matière première par le Gérant
  const [rawMatName, setRawMatName] = useState('Compound EVA Vierge Blanc');
  const [rawMatKg, setRawMatKg] = useState<number | string>(500);
  const [rawMatBags, setRawMatBags] = useState<number | string>(20);
  const [rawMatBatch, setRawMatBatch] = useState('');
  const [rawMatSupplier, setRawMatSupplier] = useState('Fournisseur Agréé CTP');

  // Détail défauts dynamique selon la machine choisie
  const availableDefectTypes = useMemo(() => {
    return TRACKER_MACHINE_DEFAULTS[opMachine] || [];
  }, [opMachine]);

  const [opDefautsDetail, setOpDefautsDetail] = useState<Record<string, number | string>>({
    'NM/28': 9,
    'NM/36': 6,
    'NM/40': 11,
  });

  // Mettre à jour les défauts si la machine change
  useEffect(() => {
    const defaultTypes = TRACKER_MACHINE_DEFAULTS[opMachine] || [];
    const match = entries.find(
      (e) => e.date === selectedDate && e.machine === opMachine && e.equipe === opEquipe
    );

    if (match) {
      setOpDebutCompteur(match.debut_compteur);
      setOpFinCompteur(match.fin_compteur);
      setOpTtlPaires(match.ttl_paires);
      setOpMatiereGramme(match.matiere_gramme);
      setOpNotes(match.notes || '');
      const detail: Record<string, number | string> = {};
      defaultTypes.forEach((t, i) => {
        detail[t] = match.defauts_detail?.[t] ?? 0;
      });
      setOpDefautsDetail(detail);
    } else {
      // Nouvelle saisie vierge
      const detail: Record<string, number | string> = {};
      defaultTypes.forEach((t) => {
        detail[t] = 0;
      });
      setOpDefautsDetail(detail);
      setOpDebutCompteur(0);
      setOpFinCompteur(0);
      setOpTtlPaires(0);
      setOpMatiereGramme(280);
      setOpNotes('');
    }
  }, [opMachine, opEquipe, selectedDate, entries]);

  // Calculs en temps réel pour la saisie opérateur
  const opCycles = Math.max(0, Number(opFinCompteur) - Number(opDebutCompteur));
  const opDefautsSomme: number = Object.values(opDefautsDetail).reduce<number>(
    (sum, val) => sum + (Number(val) || 0),
    0
  );
  const opTtlNum = Number(opTtlPaires) || 0;
  const opTauxEquipe = opTtlNum > 0 ? (opDefautsSomme / opTtlNum) * 100 : 0;
  const opEcartCompteur = opCycles - opTtlNum;
  const opHasCompteurAlert = opEcartCompteur > 100;

  // Enregistrer saisie opérateur (Brouillon ou Soumission au Gérant)
  const handleSaveOpEntry = (e: React.FormEvent, isSubmitToGerant = true) => {
    e.preventDefault();

    const cleanDetail: Record<string, number> = {};
    availableDefectTypes.forEach((t) => {
      cleanDetail[t] = Number(opDefautsDetail[t]) || 0;
    });

    const entryStatus = isSubmitToGerant ? 'soumis' : 'brouillon';
    const entryId = `ent-${opMachine.toLowerCase()}-${opEquipe.toLowerCase()}-${selectedDate}`;

    const newEntry = calculateEntryMetrics({
      id: entryId,
      date: selectedDate,
      machine: opMachine,
      equipe: opEquipe,
      user_id: currentUser?.id || 'op-direct',
      user_name: currentUser?.name ? `${currentUser.name} (Chef Équipe ${opEquipe})` : `Chef Équipe ${opEquipe}`,
      debut_compteur: Number(opDebutCompteur) || 0,
      fin_compteur: Number(opFinCompteur) || 0,
      ttl_paires: opTtlNum,
      confort: opTtlNum,
      matiere_gramme: Number(opMatiereGramme) || 280,
      defauts_detail: cleanDetail,
      status: entryStatus,
      submitted_by: isSubmitToGerant ? currentUser?.name : undefined,
      submitted_at: isSubmitToGerant ? new Date().toISOString() : undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      notes: opNotes,
    });

    setEntries((prev) => {
      const filtered = prev.filter(
        (item) => !(item.date === selectedDate && item.machine === opMachine && item.equipe === opEquipe)
      );
      return [...filtered, newEntry];
    });

    const actionType = isSubmitToGerant ? 'SOUMISSION' : 'CREATION';
    const actionLabel = isSubmitToGerant
      ? `Fiche transmise au Gérant pour validation (${opMachine} • Équipe ${opEquipe})`
      : `Brouillon de fiche enregistré (${opMachine} • Équipe ${opEquipe})`;

    logAudit?.(
      actionType,
      'Workflow Production',
      `${actionLabel} : Début=${opDebutCompteur}, Fin=${opFinCompteur}, Paires=${opTtlNum}, Défauts=${opDefautsSomme}`,
      { targetId: entryId, targetName: opMachine, newValue: entryStatus }
    );

    showBanner(
      'success',
      isSubmitToGerant
        ? `✅ Fiche envoyée avec succès au Gérant de la machine ${opMachine} ! En attente de validation.`
        : `Brouillon sauvegardé pour ${opMachine} - Équipe ${opEquipe}.`
    );
  };

  // Actions Gérant sur les fiches d'équipes
  const handleConfirmShiftEntry = (equipe: TrackerEquipeCode) => {
    const entryId = `ent-${supMachine.toLowerCase()}-${equipe.toLowerCase()}-${selectedDate}`;
    setEntries((prev) =>
      prev.map((item) =>
        item.date === selectedDate && item.machine === supMachine && item.equipe === equipe
          ? {
              ...item,
              status: 'valide',
              validated_by: currentUser?.name || 'Gérant',
              validated_at: new Date().toISOString(),
            }
          : item
      )
    );
    confirmFicheByGerant(entryId);
    showBanner('success', `✅ Fiche ${supMachine} - Équipe ${equipe} VALIDÉE par le Gérant avec succès !`);
  };

  const handleOpenRejectModal = (equipe: TrackerEquipeCode) => {
    setRejectingEquipe(equipe);
    setRejectionReasonText('');
    setRejectModalOpen(true);
  };

  const handleConfirmReject = () => {
    if (!rejectionReasonText.trim()) {
      alert('Veuillez obligatoirement renseigner le motif du rejet.');
      return;
    }
    if (!rejectingEquipe) return;

    const entryId = `ent-${supMachine.toLowerCase()}-${rejectingEquipe.toLowerCase()}-${selectedDate}`;
    setEntries((prev) =>
      prev.map((item) =>
        item.date === selectedDate && item.machine === supMachine && item.equipe === rejectingEquipe
          ? {
              ...item,
              status: 'rejete',
              rejected_by: currentUser?.name || 'Gérant',
              rejected_at: new Date().toISOString(),
              rejection_reason: rejectionReasonText.trim(),
            }
          : item
      )
    );
    rejectFicheByGerant(entryId, rejectionReasonText.trim());
    setRejectModalOpen(false);
    showBanner(
      'warning',
      `⚠️ Fiche ${supMachine} - Équipe ${rejectingEquipe} REJETÉE. Le Chef d'équipe a été notifié pour correction.`
    );
  };

  // Enregistrement d'entrée matière première par le Gérant
  const handleSaveRawMaterialStock = (e: React.FormEvent) => {
    e.preventDefault();
    const kg = Number(rawMatKg) || 0;
    const bags = Number(rawMatBags) || Math.ceil(kg / 25);
    recordRawMaterialEntryByGerant({
      machine: supMachine,
      materialName: rawMatName,
      quantityKg: kg,
      bagsCount: bags,
      batchNumber: rawMatBatch,
      supplier: rawMatSupplier,
    });
    showBanner(
      'success',
      `📦 Entrée de stock matière première validée : ${kg} kg (${bags} sacs) pour la machine ${supMachine}.`
    );
    setRawMatBatch('');
  };

  // =========================================================================
  // ÉTAT SUPERVISEUR / QUALITÉ
  // =========================================================================
  const [supMachine, setSupMachine] = useState<TrackerMachineCode>('EVA1');
  const [supDeuxiemeChoix, setSupDeuxiemeChoix] = useState<number | string>(165);
  const [supRebut, setSupRebut] = useState<number | string>(137);
  const [supComment, setSupComment] = useState<string>('Compteurs et flux vérifiés');

  // Synchroniser les entrées superviseur avec la machine choisie
  useEffect(() => {
    const existing = summaries.find((s) => s.date === selectedDate && s.machine === supMachine);
    if (existing) {
      setSupDeuxiemeChoix(existing.deuxieme_choix ?? 0);
      setSupRebut(existing.rebut ?? 0);
      setSupComment(existing.validation_comment || '');
    } else {
      setSupDeuxiemeChoix(0);
      setSupRebut(0);
      setSupComment('');
    }
  }, [supMachine, selectedDate, summaries]);

  // Calcul du résumé courant pour le superviseur
  const currentSupSummary = useMemo(() => {
    const existing = summaries.find((s) => s.date === selectedDate && s.machine === supMachine);
    return computeDailySummary(selectedDate, supMachine, entries, {
      ...existing,
      deuxieme_choix: Number(supDeuxiemeChoix) || 0,
      rebut: Number(supRebut) || 0,
    });
  }, [selectedDate, supMachine, entries, summaries, supDeuxiemeChoix, supRebut]);

  const handleValidateMachineSummary = () => {
    const totalProd = currentSupSummary.total_production;
    const confort = currentSupSummary.confort_total;
    const defauts = currentSupSummary.defauts_total;
    const deuxieme = Number(supDeuxiemeChoix) || 0;
    const rebutVal = Number(supRebut) || 0;

    const updatedSummary: DailyTrackerSummary = {
      ...currentSupSummary,
      deuxieme_choix: deuxieme,
      rebut: rebutVal,
      is_validated: true,
      validated_by: currentUser?.name || 'Superviseur Qualité',
      validated_at: new Date().toISOString(),
      validation_comment: supComment,
    };

    setSummaries((prev) => {
      const filtered = prev.filter((s) => !(s.date === selectedDate && s.machine === supMachine));
      return [...filtered, updatedSummary];
    });

    logAudit?.({
      action: 'VALIDATION_TRACKER_MACHINE',
      utilisateur: currentUser?.name || 'Superviseur Qualité',
      details: `Validation clôture ${supMachine} pour le ${selectedDate} : Prod=${totalProd}, Confort=${confort}, Défauts=${defauts}, 2ème=${deuxieme}, Rebut=${rebutVal}`,
    });

    showBanner(
      'success',
      `Machine ${supMachine} validée et clôturée avec succès pour le ${selectedDate} !`
    );
  };

  // =========================================================================
  // VUE DIRECTION & ADMIN (FACTORY OVERVIEW)
  // =========================================================================
  const factoryOverview = useMemo(() => {
    return computeFactoryOverview(selectedDate, entries, summaries);
  }, [selectedDate, entries, summaries]);

  return (
    <div className="space-y-6 pb-16">
      {/* 1. EN-TÊTE PRINCIPAL & BANDEAU RÈGLE D'OR */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded-lg text-xs font-black tracking-wider uppercase flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                CTP SMART • ERP 2026
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Workflow Multi-Rôles (Opérateur • Superviseur • Direction)
              </span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1.5 flex items-center gap-2">
              <Factory className="w-7 h-7 text-indigo-400" />
              <span>CTP SMART Production Tracker</span>
              <span className="text-base text-amber-400 font-normal">نظام تتبع الإنتاج والجودة</span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl">
              Chaque équipe (A/B/C) saisit ses compteurs et ses défauts spécifiques par machine (EVA1, EVA2, EVA3). 
              Le superviseur valide et entre les 2ème choix et rebut. La direction visualise le palmarès et le taux de défaut global.
            </p>
          </div>

          {/* SÉLECTEUR DE DATE RAPIDE */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-800/80 p-2 rounded-xl border border-slate-700/80">
            <Calendar className="w-4 h-4 text-indigo-400 ml-1" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={() => setSelectedDate(new Date().toISOString().substring(0, 10))}
              className="px-2.5 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-medium transition"
              title="Aujourd'hui"
            >
              Aujourd'hui
            </button>
            <button
              onClick={() => setSelectedDate('2026-09-20')}
              className="px-2.5 py-1.5 text-xs bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-lg font-bold hover:bg-amber-500/30 transition"
              title="Charger l'exemple réel de référence (EVA2 = 2094, Confort = 1792)"
            >
              20/09 (Exemple Réel)
            </button>
          </div>
        </div>

        {/* BANDEAU RÈGLE D'OR MATHEMATIQUE */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="flex items-center gap-2.5 bg-indigo-900/40 border border-indigo-500/30 rounded-xl p-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-300 font-bold shrink-0">
              📐
            </div>
            <div>
              <span className="font-bold text-indigo-300">Règle d'or de Conformité :</span>
              <div className="font-mono text-amber-300 font-bold text-xs mt-0.5">
                Production Totale − Confort = Nombre Total Défauts (2ème Choix + Rebut)
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 bg-emerald-900/30 border border-emerald-500/30 rounded-xl p-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-300 font-bold shrink-0">
              %
            </div>
            <div>
              <span className="font-bold text-emerald-300">Formule Taux de Défauts Machine :</span>
              <div className="font-mono text-emerald-300 font-bold text-xs mt-0.5">
                % Défauts = (Nombre Total Défauts / Production Totale) × 100
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FEEDBACK BANNER */}
      {feedbackBanner && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-sm font-semibold transition-all ${
            feedbackBanner.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
              : feedbackBanner.type === 'warning'
              ? 'bg-amber-50 text-amber-900 border border-amber-300'
              : 'bg-blue-50 text-blue-900 border border-blue-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackBanner.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
            {feedbackBanner.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-600" />}
            {feedbackBanner.type === 'info' && <Info className="w-5 h-5 text-blue-600" />}
            <span>{feedbackBanner.message}</span>
          </div>
          <button
            onClick={() => setFeedbackBanner(null)}
            className="text-xs underline text-slate-500 hover:text-slate-800"
          >
            Fermer
          </button>
        </div>
      )}

      {/* 2. SÉLECTEUR DE RÔLE (WORKFLOW CTP AVEC CONTRÔLE D'ACCÈS RBAC) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          <span className="text-xs font-bold text-slate-500 uppercase px-2">Espace Actif :</span>

          {currentUser.role !== 'gerant' && (
            <button
              onClick={() => setActiveRole('OPERATEUR')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                activeRole === 'OPERATEUR'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Factory className="w-4 h-4" />
              <span>1. Saisie Poste (Chef d'équipe)</span>
            </button>
          )}

          {currentUser.role !== 'chef_equipe' && (
            <button
              onClick={() => setActiveRole('SUPERVISEUR')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                activeRole === 'SUPERVISEUR'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>2. Revue & Validation (Gérant de Machine)</span>
            </button>
          )}

          {(currentUser.role === 'admin_general' ||
            currentUser.role === 'direction' ||
            currentUser.role === 'resp_production' ||
            currentUser.role === 'resp_qualite' ||
            currentUser.role === 'rh') && (
            <button
              onClick={() => setActiveRole('ADMIN')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                activeRole === 'ADMIN'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Trophy className="w-4 h-4" />
              <span>3. Dashboard & Palmarès Usine (Direction)</span>
            </button>
          )}
        </div>

        <div className="text-xs text-slate-500 px-3 flex flex-wrap items-center gap-2">
          <span>Connecté : <strong className="text-slate-800">{currentUser?.name}</strong></span>
          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono text-[10px] font-bold">
            [{currentUser?.role}]
          </span>
          {currentUser?.assignedMachine && currentUser.assignedMachine !== 'Toutes' && (
            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-[10px]">
              {currentUser.assignedMachine}
            </span>
          )}
          {currentUser?.assignedShift && (
            <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-bold text-[10px] uppercase">
              Shift {currentUser.assignedShift}
            </span>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. ESPACE OPÉRATEUR (TEAM A / B / C) */}
      {/* ========================================================================= */}
      {activeRole === 'OPERATEUR' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulaire de saisie Opérateur */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-black">
                    1
                  </span>
                  <span>Saisie de Poste Équipe (Chef d'équipe)</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Remplissez le relevé de production en fin de poste (8h) et transmettez-le au Gérant pour validation.
                </p>
              </div>

              {/* Badges statut */}
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-semibold">
                  Date : {selectedDate}
                </span>
              </div>
            </div>

            {/* BANNIÈRE DE STATUT DE LA FICHE DU POSTE */}
            {(() => {
              const currentMatch = entries.find(
                (e) => e.date === selectedDate && e.machine === opMachine && e.equipe === opEquipe
              );
              if (currentMatch?.status === 'valide') {
                return (
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-bold text-sm">✅ Fiche VALIDÉE et Clôturée par le Gérant</strong>
                      <p className="text-xs text-emerald-800 mt-0.5">
                        Cette fiche a été validée et scellée par <strong>{currentMatch.validated_by || 'le Gérant'}</strong> le {currentMatch.validated_at?.slice(0, 16)}. Les compteurs et données sont verrouillés et immuables.
                      </p>
                    </div>
                  </div>
                );
              }
              if (currentMatch?.status === 'soumis') {
                return (
                  <div className="p-4 rounded-xl bg-blue-50 border border-blue-300 text-blue-900 flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-bold text-sm">⏳ Fiche Transmise au Gérant pour Validation</strong>
                      <p className="text-xs text-blue-800 mt-0.5">
                        Transmise par {currentMatch.submitted_by || 'le Chef d\'équipe'} le {currentMatch.submitted_at?.slice(0, 16)}. En attente de vérification par le Gérant de la machine {opMachine}.
                      </p>
                    </div>
                  </div>
                );
              }
              if (currentMatch?.status === 'rejete') {
                return (
                  <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-bold text-sm">⚠️ Fiche REJETÉE par le Gérant ({currentMatch.rejected_by || 'Gérant'})</strong>
                      <div className="mt-1 p-2.5 rounded-lg bg-white/90 border border-rose-200 text-rose-950 text-xs font-semibold">
                        <strong>Motif obligatoire du rejet :</strong> « {currentMatch.rejection_reason} »
                      </div>
                      <p className="text-[11px] text-rose-800 mt-1">
                        Veuillez rectifier les compteurs ou les défauts ci-dessous, puis renvoyer la fiche au Gérant.
                      </p>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            <form onSubmit={handleSaveOpEntry} className="space-y-6">
              {/* Choix Machine & Équipe avec Verrouillage RBAC */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase">
                      Machine d'Injection :
                    </label>
                    {cleanUserMachine && currentUser.role === 'chef_equipe' && (
                      <span className="text-[10px] text-blue-600 font-semibold flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Machine assignée
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {TRACKER_MACHINES.map((m) => {
                      const isAllowed =
                        !cleanUserMachine ||
                        cleanUserMachine === m ||
                        currentUser.role === 'admin_general' ||
                        currentUser.role === 'direction' ||
                        currentUser.role === 'resp_production';

                      return (
                        <button
                          type="button"
                          key={m}
                          disabled={!isAllowed}
                          onClick={() => setOpMachine(m)}
                          className={`py-2 px-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 ${
                            opMachine === m
                              ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-300'
                              : isAllowed
                              ? 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 cursor-pointer'
                              : 'bg-slate-100 text-slate-400 border border-slate-200 opacity-60 cursor-not-allowed'
                          }`}
                          title={!isAllowed ? `Accès limité à votre machine (${cleanUserMachine})` : undefined}
                        >
                          {!isAllowed && <Lock className="w-3 h-3 text-slate-400" />}
                          {isAllowed && <Factory className="w-3 h-3" />}
                          <span>{m}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase">
                      Équipe & Shift (8h) :
                    </label>
                    {currentUser.assignedEquipe && currentUser.role === 'chef_equipe' && (
                      <span className="text-[10px] text-amber-700 font-semibold flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Votre poste
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {TRACKER_EQUIPES.map((eq) => {
                      const isAllowed =
                        !currentUser.assignedEquipe ||
                        currentUser.assignedEquipe === eq ||
                        currentUser.role === 'admin_general' ||
                        currentUser.role === 'direction' ||
                        currentUser.role === 'resp_production';

                      return (
                        <button
                          type="button"
                          key={eq}
                          disabled={!isAllowed}
                          onClick={() => setOpEquipe(eq)}
                          className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                            opEquipe === eq
                              ? 'bg-amber-500 text-slate-950 shadow-sm ring-2 ring-amber-300 font-black'
                              : isAllowed
                              ? 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 cursor-pointer'
                              : 'bg-slate-100 text-slate-400 border border-slate-200 opacity-60 cursor-not-allowed'
                          }`}
                          title={!isAllowed ? `Poste réservé à l'équipe ${currentUser.assignedEquipe}` : undefined}
                        >
                          {!isAllowed && <Lock className="w-3 h-3 text-slate-400" />}
                          <span>Équipe {eq}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Compteurs Début & Fin + Contrôle Auto */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <span>Relevé des Compteurs & Production Nette (Confort)</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs text-slate-600 font-medium mb-1">
                      Compteur DÉBUT :
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={opDebutCompteur}
                      onChange={(e) => setOpDebutCompteur(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-600 font-medium mb-1">
                      Compteur FIN :
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={opFinCompteur}
                      onChange={(e) => setOpFinCompteur(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-600 font-medium mb-1">
                      TTL PAIRES (Confort) :
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={opTtlPaires}
                      onChange={(e) => setOpTtlPaires(e.target.value)}
                      className="w-full px-3 py-2 bg-emerald-50 border border-emerald-300 rounded-lg text-sm font-mono font-black text-emerald-800 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-600 font-medium mb-1">
                      Matière (g/paire) :
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={opMatiereGramme}
                      onChange={(e) => setOpMatiereGramme(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* ALERTE AUTOMATIQUE COMPTEUR : si FIN - DEBUT > TTL + 100 */}
                {opHasCompteurAlert ? (
                  <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-xl flex items-start gap-3 text-rose-800 text-xs">
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-bold text-rose-900">
                        ⚠️ Alerte Vérification Compteur :
                      </strong>
                      <p className="mt-0.5">
                        L'écart entre le compteur (<strong>{opCycles}</strong> cycles) et la production déclarée (<strong>{opTtlNum}</strong> paires) est de <strong>+{opEcartCompteur}</strong> (&gt; 100).
                        Veuillez vérifier et corriger le compteur FIN ({opFinCompteur}) ou justifier les pertes anormales.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs text-slate-600 font-medium">
                    <span>
                      Cycles calculés (FIN − DÉBUT) : <strong className="text-slate-900 font-mono">{opCycles}</strong>
                    </span>
                    <span>
                      Écart Compteur vs Paires : <strong className={`font-mono ${opEcartCompteur >= 0 ? 'text-blue-700' : 'text-amber-600'}`}>{opEcartCompteur}</strong>
                    </span>
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Compteur Valide
                    </span>
                  </div>
                )}
              </div>

              {/* DÉTAIL DÉFAUTS DYNAMIQUE SELON LA MACHINE */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-500" />
                    <span>Détail Défauts Spécifique ({opMachine})</span>
                  </h3>
                  <span className="text-xs text-slate-500">
                    Types configurés pour {opMachine} : {availableDefectTypes.join(', ')}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {availableDefectTypes.map((typeKey) => (
                    <div key={typeKey} className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Type: <span className="text-indigo-600 font-mono">{typeKey}</span>
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={opDefautsDetail[typeKey] ?? 0}
                        onChange={(e) =>
                          setOpDefautsDetail((prev) => ({
                            ...prev,
                            [typeKey]: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  ))}
                </div>

                {/* Synthèse des défauts équipe */}
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-900 font-medium">
                  <div>
                    <span>Total Défauts Équipe : </span>
                    <strong className="font-mono text-sm font-black text-amber-950">
                      {opDefautsSomme} paires
                    </strong>
                  </div>
                  <div>
                    <span>Taux Défauts Équipe : </span>
                    <strong className="font-mono text-sm font-black text-amber-950">
                      {opTauxEquipe.toFixed(2)} %
                    </strong>
                    <span className="text-slate-500 text-[11px] ml-1">
                      ({opDefautsSomme} / {opTtlNum || 1} × 100)
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes éventuelles */}
              <div>
                <label className="block text-xs text-slate-600 font-medium mb-1">
                  Observations / Remarques du poste :
                </label>
                <input
                  type="text"
                  value={opNotes}
                  onChange={(e) => setOpNotes(e.target.value)}
                  placeholder="Ex: Changement de moule station 3, cadence normale..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white"
                />
              </div>

              {/* Boutons d'enregistrement & soumission au Gérant */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    const defaultTypes = TRACKER_MACHINE_DEFAULTS[opMachine] || [];
                    const detail: Record<string, number> = {};
                    defaultTypes.forEach((t) => (detail[t] = 0));
                    setOpDefautsDetail(detail);
                    setOpDebutCompteur(0);
                    setOpFinCompteur(0);
                    setOpTtlPaires(0);
                  }}
                  className="w-full sm:w-auto px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Réinitialiser</span>
                </button>

                {(() => {
                  const currentMatch = entries.find(
                    (e) => e.date === selectedDate && e.machine === opMachine && e.equipe === opEquipe
                  );
                  const isValide = currentMatch?.status === 'valide';
                  const isRejete = currentMatch?.status === 'rejete';

                  if (isValide) {
                    return (
                      <div className="text-xs font-bold text-emerald-700 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-200 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Fiche validée par le Gérant (Immuable)</span>
                      </div>
                    );
                  }

                  return (
                    <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={(e) => handleSaveOpEntry(e, false)}
                        className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5 text-slate-500" />
                        <span>Enregistrer Brouillon</span>
                      </button>

                      <button
                        type="submit"
                        className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                        <span>
                          {isRejete
                            ? `Corriger & Renvoyer au Gérant (${opMachine} • Équipe ${opEquipe})`
                            : `Transmettre au Gérant pour Validation (${opMachine} • Équipe ${opEquipe})`}
                        </span>
                      </button>
                    </div>
                  );
                })()}
              </div>
            </form>
          </div>

          {/* Carte récapitulative & Tableau de bord du poste pour l'opérateur */}
          <div className="space-y-4">
            <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-md space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs uppercase tracking-wider text-slate-400 font-bold">
                  Aperçu en Direct du Poste
                </span>
                <span className="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 text-xs font-mono font-bold rounded-md">
                  {opMachine} • Éq. {opEquipe}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                  <span className="text-[11px] text-slate-400 block">Production Confort</span>
                  <span className="text-2xl font-black text-emerald-400 font-mono">
                    {opTtlNum}
                  </span>
                  <span className="text-[10px] text-slate-500 block">paires nettes</span>
                </div>

                <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                  <span className="text-[11px] text-slate-400 block">Total Défauts</span>
                  <span className="text-2xl font-black text-amber-400 font-mono">
                    {opDefautsSomme}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    {opTauxEquipe.toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-xs text-slate-300 pt-2 border-t border-slate-800">
                <div className="flex justify-between">
                  <span className="text-slate-400">Compteur Début :</span>
                  <span className="font-mono font-bold">{opDebutCompteur}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Compteur Fin :</span>
                  <span className="font-mono font-bold">{opFinCompteur}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Cycles Bruts :</span>
                  <span className="font-mono font-bold text-indigo-300">{opCycles}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Poids matière déclaré :</span>
                  <span className="font-mono font-bold">{opMatiereGramme} g</span>
                </div>
              </div>

              <div className="p-3 bg-indigo-950/60 border border-indigo-500/30 rounded-xl text-xs text-indigo-200">
                <div className="flex items-center gap-1.5 font-bold text-indigo-300 mb-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Score Performance Équipe :</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span>Paires − (Défauts × 10) :</span>
                  <strong className="text-lg font-mono font-black text-white">
                    {opTtlNum - opDefautsSomme * 10} pts
                  </strong>
                </div>
              </div>
            </div>

            {/* Historique des 3 équipes de la machine aujourd'hui */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                État des Équipes sur {opMachine} ({selectedDate})
              </h4>

              <div className="space-y-2">
                {TRACKER_EQUIPES.map((eq) => {
                  const match = entries.find(
                    (e) => e.date === selectedDate && e.machine === opMachine && e.equipe === eq
                  );
                  return (
                    <div
                      key={eq}
                      className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                        match
                          ? 'bg-slate-50 border-slate-200'
                          : 'bg-slate-50/50 border-dashed border-slate-200 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-[11px] ${
                            match ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {eq}
                        </span>
                        <div>
                          <strong className="text-slate-800">Équipe {eq}</strong>
                          <span className="text-[10px] text-slate-400 block">
                            {match ? match.user_name : 'Pas encore saisie'}
                          </span>
                        </div>
                      </div>

                      {match ? (
                        <div className="text-right">
                          <span className="font-mono font-black text-slate-900 block">
                            {match.ttl_paires} paires
                          </span>
                          <span className="text-[10px] text-amber-600 font-mono">
                            {match.defauts_equipe} déf. ({match.taux_equipe}%)
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] italic text-slate-400">En attente</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. ESPACE SUPERVISEUR / QUALITÉ (VALIDATION & 2ÈME CHOIX / REBUT) */}
      {/* ========================================================================= */}
      {activeRole === 'SUPERVISEUR' && (
        <div className="space-y-6">
          {/* Sélection Machine Superviseur / Gérant */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-600 uppercase">Machine supervisée :</span>
              <div className="flex items-center gap-2">
                {TRACKER_MACHINES.map((m) => {
                  const isAllowed =
                    !cleanUserMachine ||
                    currentUser.role !== 'gerant' ||
                    cleanUserMachine === m;

                  return (
                    <button
                      key={m}
                      type="button"
                      disabled={!isAllowed}
                      onClick={() => setSupMachine(m)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                        supMachine === m
                          ? 'bg-amber-500 text-slate-950 font-black shadow-md ring-2 ring-amber-300'
                          : isAllowed
                          ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer'
                          : 'bg-slate-50 text-slate-400 border border-slate-200 opacity-60 cursor-not-allowed'
                      }`}
                      title={!isAllowed ? `Accès limité à votre machine gérée (${cleanUserMachine})` : undefined}
                    >
                      {!isAllowed && <Lock className="w-3.5 h-3.5 text-slate-400" />}
                      {isAllowed && <Factory className="w-3.5 h-3.5" />}
                      <span>{m}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Statut clôture :</span>
              {currentSupSummary.is_validated ? (
                <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-full text-xs flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Validée par {currentSupSummary.validated_by}
                </span>
              ) : (
                <span className="px-3 py-1 bg-amber-100 text-amber-800 font-bold rounded-full text-xs flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  En attente de validation
                </span>
              )}
            </div>
          </div>

          {/* Tableau des 3 équipes pour la machine */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <span>Fiches & Relevés d'Atelier pour {supMachine} ({selectedDate})</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Contrôle des fiches remises par les Chefs d'équipe. Le Gérant peut Confirmer ou Rejeter chaque fiche.
                </p>
              </div>

              <div className="text-xs text-slate-600 font-semibold bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                Gérant Responsable : <strong className="text-blue-700">{currentUser?.name}</strong>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 border-b border-slate-200 font-bold uppercase text-[11px]">
                    <th className="py-3 px-4">Équipe</th>
                    <th className="py-3 px-3">Compteur Début</th>
                    <th className="py-3 px-3">Compteur Fin</th>
                    <th className="py-3 px-3 text-indigo-700">Cycles (Fin−Début)</th>
                    <th className="py-3 px-3 text-emerald-700">TTL Paires (Confort)</th>
                    <th className="py-3 px-4 text-amber-800">Détail Défauts</th>
                    <th className="py-3 px-3 text-amber-800">Total Défauts</th>
                    <th className="py-3 px-3">Taux Équipe</th>
                    <th className="py-3 px-3">Alerte Compteur</th>
                    <th className="py-3 px-3">Statut Fiche</th>
                    <th className="py-3 px-3 text-center">Action Gérant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {TRACKER_EQUIPES.map((eq) => {
                    const e = currentSupSummary.entries[eq];
                    if (!e) {
                      return (
                        <tr key={eq} className="hover:bg-slate-50/50">
                          <td className="py-3 px-4 font-bold text-slate-700">
                            <span className="w-6 h-6 rounded-full bg-slate-200 inline-flex items-center justify-center mr-2 text-[10px]">
                              {eq}
                            </span>
                            Équipe {eq}
                          </td>
                          <td colSpan={10} className="py-3 px-3 text-slate-400 italic">
                            Non renseignée pour le {selectedDate}
                          </td>
                        </tr>
                      );
                    }

                    const defautsDetailEntries = Object.entries(e.defauts_detail || {});

                    return (
                      <tr key={eq} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-4 font-bold text-slate-900">
                          <span className="w-6 h-6 rounded-full bg-blue-600 text-white inline-flex items-center justify-center mr-2 text-[10px] shadow-xs">
                            {eq}
                          </span>
                          Équipe {eq}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-700">{e.debut_compteur}</td>
                        <td className="py-3 px-3 font-mono text-slate-700">{e.fin_compteur}</td>
                        <td className="py-3 px-3 font-mono font-black text-indigo-700 bg-indigo-50/50">
                          {e.cycles_machine}
                        </td>
                        <td className="py-3 px-3 font-mono font-black text-emerald-700 bg-emerald-50/50">
                          {e.ttl_paires}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {defautsDetailEntries.map(([t, count]) => (
                              <span
                                key={t}
                                className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] font-mono text-slate-700"
                              >
                                {t}: <strong>{count}</strong>
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-amber-700">
                          {e.defauts_equipe}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-700">
                          {e.taux_equipe.toFixed(2)} %
                        </td>
                        <td className="py-3 px-3">
                          {e.compteur_alert ? (
                            <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-bold text-[10px] inline-flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-rose-600" />
                              Écart &gt; 100
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-medium text-[10px]">
                              OK
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {e.status === 'valide' && (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px] inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Validée
                            </span>
                          )}
                          {e.status === 'soumis' && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full font-bold text-[10px] inline-flex items-center gap-1 animate-pulse">
                              <Sparkles className="w-3 h-3 text-blue-600" /> Soumise
                            </span>
                          )}
                          {e.status === 'rejete' && (
                            <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded-full font-bold text-[10px] inline-flex items-center gap-1" title={e.rejection_reason}>
                              <AlertTriangle className="w-3 h-3 text-rose-600" /> Rejetée
                            </span>
                          )}
                          {(!e.status || e.status === 'brouillon') && (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-medium text-[10px]">
                              Brouillon
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {canUserValidateOrRejectFiche(currentUser, supMachine) && (
                            <div className="flex items-center justify-center gap-1.5">
                              {e.status !== 'valide' && (
                                <button
                                  type="button"
                                  onClick={() => handleConfirmShiftEntry(eq)}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[10px] shadow-xs transition flex items-center gap-1 cursor-pointer"
                                  title="Confirmer la fiche de cette équipe"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>Confirmer</span>
                                </button>
                              )}
                              {e.status !== 'rejete' && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenRejectModal(eq)}
                                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-[10px] shadow-xs transition flex items-center gap-1 cursor-pointer"
                                  title="Rejeter avec motif obligatoire"
                                >
                                  <X className="w-3 h-3" />
                                  <span>Rejeter</span>
                                </button>
                              )}
                              {e.status === 'valide' && (
                                <span className="text-[10px] text-emerald-700 font-semibold block">
                                  Validée
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-900 text-white font-bold border-t-2 border-slate-700 text-xs">
                    <td className="py-3 px-4 uppercase tracking-wider">
                      TOTAL MACHINE ({supMachine})
                    </td>
                    <td colSpan={2} className="py-3 px-3 text-slate-400 text-[10px] italic">
                      Somme des compteurs
                    </td>
                    <td className="py-3 px-3 font-mono text-amber-400 font-black text-sm">
                      {currentSupSummary.total_production}
                    </td>
                    <td className="py-3 px-3 font-mono text-emerald-400 font-black text-sm">
                      {currentSupSummary.confort_total}
                    </td>
                    <td colSpan={2} className="py-3 px-4 text-right text-slate-300">
                      Défauts Totaux (Prod − Confort) :
                    </td>
                    <td className="py-3 px-3 font-mono text-amber-300 font-black text-sm">
                      {currentSupSummary.defauts_total}
                    </td>
                    <td colSpan={3} className="py-3 px-3 font-mono text-emerald-300 font-black text-sm text-center">
                      Taux = {currentSupSummary.taux_defaut}%
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* SECTION ENTRÉE MATIÈRE PREMIÈRE PAR LE GÉRANT */}
          {canUserEnterRawMaterial(currentUser) && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Boxes className="w-4 h-4 text-blue-600" />
                    <span>Enregistrement d'Entrée Matière Première (Atelier {supMachine})</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Le Gérant de machine est responsable d'enregistrer les quantités de matière première à leur arrivée dans l'atelier.
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold shrink-0">
                  Gérant Habilité : {currentUser?.name}
                </span>
              </div>

              <form onSubmit={handleSaveRawMaterialStock} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Matière Première</label>
                  <input
                    type="text"
                    value={rawMatName}
                    onChange={(e) => setRawMatName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Quantité (Kg)</label>
                  <input
                    type="number"
                    min={1}
                    value={rawMatKg}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setRawMatKg(val);
                      setRawMatBags(Math.ceil(val / 25));
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Nombre de Sacs (25 kg)</label>
                  <input
                    type="number"
                    min={1}
                    value={rawMatBags}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setRawMatBags(val);
                      setRawMatKg(val * 25);
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">N° de Lot / Fournisseur</label>
                  <input
                    type="text"
                    value={rawMatBatch}
                    onChange={(e) => setRawMatBatch(e.target.value)}
                    placeholder="LOT-2026-X"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                  />
                </div>
                <div>
                  <button
                    type="submit"
                    className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Valider Entrée Stock</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Saisie Superviseur 2ème choix et Rebut + Calcul Clôture */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                <span>Contrôle Qualité Superviseur (2ème Choix & Rebut)</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Paires 2ÈME CHOIX (Saisi Superviseur) :
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={supDeuxiemeChoix}
                    onChange={(e) => setSupDeuxiemeChoix(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Paires présentant de légers défauts vendues à prix dégradé
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Paires REBUT / SCRAP (Saisi Superviseur) :
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={supRebut}
                    onChange={(e) => setSupRebut(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Paires non conformes envoyées au broyeur / recyclage
                  </span>
                </div>
              </div>

              {/* Rapprochement avec la règle d'or */}
              {(() => {
                const totalSaisi = (Number(supDeuxiemeChoix) || 0) + (Number(supRebut) || 0);
                const attendu = currentSupSummary.defauts_total;
                const isMatch = totalSaisi === attendu;

                return (
                  <div
                    className={`p-4 rounded-xl border flex items-start gap-3 text-xs ${
                      isMatch
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                        : 'bg-amber-50 border-amber-300 text-amber-900'
                    }`}
                  >
                    {isMatch ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <strong className="font-bold">
                        {isMatch
                          ? '✅ Concordance Parfaite de Clôture :'
                          : '⚠️ Écart de réconciliation qualité :'}
                      </strong>
                      <p className="mt-0.5">
                        2ème Choix ({supDeuxiemeChoix}) + Rebut ({supRebut}) ={' '}
                        <strong>{totalSaisi}</strong> paires.
                        <br />
                        Production Totale ({currentSupSummary.total_production}) − Confort ({currentSupSummary.confort_total}) ={' '}
                        <strong>{attendu}</strong> paires de défauts.
                        {isMatch && (
                          <span className="block text-emerald-700 font-semibold mt-1">
                            La règle d'or est strictement vérifiée (302 = 165 + 137).
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                );
              })()}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Commentaire / Justification de clôture :
                </label>
                <input
                  type="text"
                  value={supComment}
                  onChange={(e) => setSupComment(e.target.value)}
                  placeholder="Ex: Compteurs validés conformément aux fiches d'atelier..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleValidateMachineSummary}
                  className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Valider et Clôturer la Machine {supMachine}</span>
                </button>
              </div>
            </div>

            {/* Synthèse finale pour la machine */}
            <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-md space-y-4">
              <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-slate-400 font-bold">
                  Bilan Clôture Machine
                </span>
                <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 rounded font-mono text-xs font-bold">
                  {supMachine}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Total Production (Cycles) :</span>
                  <span className="font-mono text-base font-black text-white">
                    {currentSupSummary.total_production}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Confort Total (Paires Nettes) :</span>
                  <span className="font-mono text-base font-black text-emerald-400">
                    {currentSupSummary.confort_total}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Total Défauts Détectés :</span>
                  <span className="font-mono text-base font-black text-amber-400">
                    {currentSupSummary.defauts_total}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-800">
                  <span className="text-slate-300 font-bold">% Taux Défaut Machine :</span>
                  <span className="font-mono text-xl font-black text-amber-400">
                    {currentSupSummary.taux_defaut} %
                  </span>
                </div>
              </div>

              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 text-xs space-y-1.5">
                <div className="flex justify-between text-slate-300">
                  <span>Meilleure Équipe Production :</span>
                  <strong className="text-emerald-400">
                    Équipe {currentSupSummary.meilleure_equipe_production || '-'}
                  </strong>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Meilleure Équipe Qualité :</span>
                  <strong className="text-indigo-400">
                    Équipe {currentSupSummary.meilleure_equipe_qualite || '-'}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. ESPACE DIRECTION & ADMIN (DASHBOARD GLOBAL & PALMARÈS) */}
      {/* ========================================================================= */}
      {activeRole === 'ADMIN' && (
        <div className="space-y-6">
          {/* Cartes KPI Direction Usine */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2 text-xs font-bold uppercase tracking-wider">
                <span>Production Totale Usine</span>
                <Factory className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-3xl font-black text-slate-900 font-mono">
                {factoryOverview.total_production_usine}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Somme des cycles EVA1 + EVA2 + EVA3
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2 text-xs font-bold uppercase tracking-wider">
                <span>Confort Total Usine</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-3xl font-black text-emerald-600 font-mono">
                {factoryOverview.confort_total_usine}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Paires 1er Choix disponibles
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2 text-xs font-bold uppercase tracking-wider">
                <span>Défauts Totaux (Rebut + 2ème)</span>
                <ShieldAlert className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-3xl font-black text-amber-600 font-mono">
                {factoryOverview.defauts_total_usine}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {factoryOverview.total_deuxieme_choix_usine} (2ème) + {factoryOverview.total_rebut_usine} (Rebut)
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2 text-xs font-bold uppercase tracking-wider">
                <span>Taux Défauts Global Usine</span>
                <Percent className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-3xl font-black text-indigo-600 font-mono">
                {factoryOverview.taux_defaut_usine} %
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Moyenne pondérée des 3 machines
              </p>
            </div>
          </div>

          {/* PALMARÈS : MEILLEURE ÉQUIPE PAR MACHINE */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  <span>Palmarès & Meilleure Équipe par Machine ({selectedDate})</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Détermination automatique : Best Production (Max TTL Paires) et Best Qualité (Min Défauts)
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimer Palmarès</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {TRACKER_MACHINES.map((mCode) => {
                const summary = factoryOverview.machines[mCode];
                const bestProdEq = summary.meilleure_equipe_production;
                const bestQualEq = summary.meilleure_equipe_qualite;
                const bestProdData = bestProdEq ? summary.entries[bestProdEq] : undefined;
                const bestQualData = bestQualEq ? summary.entries[bestQualEq] : undefined;

                return (
                  <div
                    key={mCode}
                    className="bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-4 hover:shadow-md transition"
                  >
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <span className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                        <Factory className="w-4 h-4 text-indigo-600" />
                        {mCode}
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-600">
                        Total : {summary.total_production} paires
                      </span>
                    </div>

                    {/* Best Production */}
                    <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-emerald-700 font-bold flex items-center gap-1">
                          <Crown className="w-3.5 h-3.5 text-amber-500" />
                          Best Production :
                        </span>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-black text-[11px]">
                          Équipe {bestProdEq || '-'}
                        </span>
                      </div>
                      <div className="flex justify-between items-baseline text-xs text-slate-600 font-medium">
                        <span>Paires nettes :</span>
                        <strong className="font-mono text-emerald-800 text-sm">
                          {bestProdData?.ttl_paires ?? 0}
                        </strong>
                      </div>
                    </div>

                    {/* Best Qualité */}
                    <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-indigo-700 font-bold flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                          Best Qualité :
                        </span>
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded font-black text-[11px]">
                          Équipe {bestQualEq || '-'}
                        </span>
                      </div>
                      <div className="flex justify-between items-baseline text-xs text-slate-600 font-medium">
                        <span>Défauts constatés :</span>
                        <strong className="font-mono text-indigo-800 text-sm">
                          {bestQualData?.defauts_equipe ?? 0} ({bestQualData?.taux_equipe ?? 0}%)
                        </strong>
                      </div>
                    </div>

                    {/* Score Global Équipes */}
                    <div className="text-xs space-y-1 pt-1 text-slate-600">
                      <span className="font-bold text-[11px] uppercase tracking-wider block text-slate-400">
                        Scores Globaux (Paires − Déf×10) :
                      </span>
                      {TRACKER_EQUIPES.map((eq) => {
                        const s = summary.scores_equipes?.[eq] ?? 0;
                        const isBest = eq === bestProdEq;
                        return (
                          <div key={eq} className="flex justify-between items-center py-0.5">
                            <span className={isBest ? 'font-bold text-slate-900' : 'text-slate-600'}>
                              Équipe {eq} :
                            </span>
                            <span className="font-mono font-bold">{s} pts</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* TABLEAU COMPARATIF INTER-MACHINES */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                <span>Comparatif Synthétique des 3 Machines d'Injection</span>
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 uppercase text-[11px] font-bold border-b border-slate-200">
                    <th className="py-3 px-4">Machine</th>
                    <th className="py-3 px-3">Production Totale</th>
                    <th className="py-3 px-3 text-emerald-700">Confort Total</th>
                    <th className="py-3 px-3 text-amber-700">2ème Choix</th>
                    <th className="py-3 px-3 text-rose-700">Rebut</th>
                    <th className="py-3 px-3 text-amber-800">Défauts Totaux</th>
                    <th className="py-3 px-3 font-black">Taux Défauts (%)</th>
                    <th className="py-3 px-3">Meilleure Équipe</th>
                    <th className="py-3 px-3">Statut Clôture</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {TRACKER_MACHINES.map((mCode) => {
                    const sum = factoryOverview.machines[mCode];
                    return (
                      <tr key={mCode} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-4 font-black text-slate-900 flex items-center gap-2">
                          <Factory className="w-3.5 h-3.5 text-blue-600" />
                          <span>{mCode}</span>
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-800">
                          {sum.total_production}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-emerald-700 bg-emerald-50/30">
                          {sum.confort_total}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-amber-700">
                          {sum.deuxieme_choix}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-rose-700">
                          {sum.rebut}
                        </td>
                        <td className="py-3 px-3 font-mono font-black text-amber-800 bg-amber-50/40">
                          {sum.defauts_total}
                        </td>
                        <td className="py-3 px-3 font-mono font-black text-slate-900">
                          <span
                            className={`px-2 py-0.5 rounded ${
                              sum.taux_defaut < 10
                                ? 'bg-emerald-100 text-emerald-800'
                                : sum.taux_defaut < 15
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {sum.taux_defaut} %
                          </span>
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-700">
                          Équipe {sum.meilleure_equipe_production || '-'}
                        </td>
                        <td className="py-3 px-3">
                          {sum.is_validated ? (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-semibold text-[10px]">
                              Validée
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-semibold text-[10px]">
                              En cours
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* CLASSEMENT GÉNÉRAL DES 9 ÉQUIPES DE L'USINE */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-500" />
                  <span>Classement Général Usine des Équipes (Toutes Machines Confondues)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Trié par Score Global = Paires − (Défauts × 10)
                </p>
              </div>

              <span className="text-xs font-mono font-bold text-slate-500">
                {factoryOverview.ranking_toutes_equipes.length} Équipes actives
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 uppercase text-[11px] font-bold border-b border-slate-200">
                    <th className="py-3 px-4 text-center">Rang</th>
                    <th className="py-3 px-4">Équipe</th>
                    <th className="py-3 px-4">Machine</th>
                    <th className="py-3 px-3 text-emerald-700">Production (Paires)</th>
                    <th className="py-3 px-3 text-amber-700">Défauts</th>
                    <th className="py-3 px-3">Taux (%)</th>
                    <th className="py-3 px-4 text-right">Score Global</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {factoryOverview.ranking_toutes_equipes.map((item) => {
                    const isPodium = item.rang <= 3;
                    return (
                      <tr
                        key={`${item.machine}-${item.equipe}`}
                        className={`hover:bg-slate-50 transition ${
                          item.rang === 1 ? 'bg-amber-50/40 font-bold' : ''
                        }`}
                      >
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`w-6 h-6 rounded-full inline-flex items-center justify-center font-black text-xs ${
                              item.rang === 1
                                ? 'bg-amber-400 text-slate-950 shadow-xs'
                                : item.rang === 2
                                ? 'bg-slate-300 text-slate-900'
                                : item.rang === 3
                                ? 'bg-amber-700 text-white'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {item.rang}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          Équipe {item.equipe}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                          {item.machine}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-emerald-700">
                          {item.paires}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-amber-700">
                          {item.defauts}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-700">
                          {item.taux_equipe.toFixed(2)} %
                        </td>
                        <td className="py-3 px-4 font-mono font-black text-right text-slate-900 text-sm">
                          {item.score_global} pts
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

      {/* MODALE DE REJET GÉRANT (AVEC MOTIF OBLIGATOIRE) */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Rejeter la Fiche ({supMachine} - Équipe {rejectingEquipe})
                </h3>
                <span className="text-[11px] text-slate-500">Gérant : {currentUser?.name}</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Conformément au règlement de l'usine, le motif de rejet est <strong>strictement obligatoire</strong>. Il sera consigné dans le Journal d'Audit et transmis immédiatement au Chef d'équipe pour correction.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Motif du rejet (Obligatoire) * :
              </label>
              <textarea
                rows={3}
                value={rejectionReasonText}
                onChange={(e) => setRejectionReasonText(e.target.value)}
                placeholder="Ex: Écart anormal entre compteur début/fin et paires déclarées, revoir comptage cartons..."
                className="w-full p-3 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRejectModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={!rejectionReasonText.trim()}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white shadow-md shadow-rose-600/20 transition flex items-center gap-1.5 cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span>Confirmer le Rejet de la Fiche</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
