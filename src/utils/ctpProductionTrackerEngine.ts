// =========================================================================
// CTP SMART Production Tracker - Core Logic Engine
// Implémente strictement la logique industrielle demandée :
// - defauts_equipe = SUM(defauts_detail.values())
// - taux_equipe = (defauts_equipe / ttl_paires) * 100
// - total_production_machine = SUM(fin - debut pour chaque équipe)
// - confort_machine = SUM(ttl_paires)
// - defauts_total_machine = total_production_machine - confort_machine
// - taux_machine = (defauts_total_machine / total_production_machine) * 100
// Règle d'or : Production Totale - Confort = Nombre Total Défauts
// =========================================================================

import {
  TrackerMachineCode,
  TrackerEquipeCode,
  ProductionTrackerEntry,
  DailyTrackerSummary,
  FactoryTrackerOverview,
  TRACKER_MACHINE_DEFAULTS,
} from '../types/ctpProductionTracker';

export const TRACKER_MACHINES: TrackerMachineCode[] = ['EVA1', 'EVA2', 'EVA3', 'EVA4'];
export const TRACKER_EQUIPES: TrackerEquipeCode[] = ['A', 'B', 'C'];

// Clé de stockage localStorage
export const STORAGE_KEY_ENTRIES = 'ctp_smart_production_tracker_entries_v2';
export const STORAGE_KEY_SUMMARIES = 'ctp_smart_production_tracker_summaries_v2';

/**
 * Calcul des métriques d'une entrée équipe
 */
export function calculateEntryMetrics(
  entry: Omit<ProductionTrackerEntry, 'cycles_machine' | 'defauts_equipe' | 'taux_equipe' | 'compteur_alert' | 'compteur_alert_message'>
): ProductionTrackerEntry {
  const cycles = Math.max(0, (entry.fin_compteur || 0) - (entry.debut_compteur || 0));
  
  // Somme des défauts du détail
  const defautsDetail = entry.defauts_detail || {};
  const defauts_equipe = Object.values(defautsDetail).reduce((sum, val) => sum + (Number(val) || 0), 0);
  
  const ttl_paires = Math.max(0, entry.ttl_paires || 0);
  const taux_equipe = ttl_paires > 0 ? (defauts_equipe / ttl_paires) * 100 : 0;
  
  // Validation automatique du compteur: si FIN - DEBUT > TTL + 100
  const ecartCompteur = cycles - ttl_paires;
  const compteur_alert = ecartCompteur > 100;
  const compteur_alert_message = compteur_alert
    ? `⚠️ Vérifier compteur ${entry.fin_compteur} corrigé : écart compteur vs paires = ${ecartCompteur} (> 100)`
    : undefined;

  return {
    ...entry,
    confort: entry.confort || ttl_paires,
    cycles_machine: cycles,
    defauts_equipe,
    taux_equipe: Number(taux_equipe.toFixed(2)),
    compteur_alert,
    compteur_alert_message,
  };
}

/**
 * Calcul du résumé quotidien pour une machine à une date donnée
 */
export function computeDailySummary(
  date: string,
  machine: TrackerMachineCode,
  entries: ProductionTrackerEntry[],
  existingSummary?: Partial<DailyTrackerSummary>
): DailyTrackerSummary {
  // Filtrer les entrées de cette machine et de cette date
  const machineEntries = entries.filter((e) => e.date === date && e.machine === machine);
  
  const entriesMap: Partial<Record<TrackerEquipeCode, ProductionTrackerEntry>> = {};
  for (const eq of TRACKER_EQUIPES) {
    const found = machineEntries.find((e) => e.equipe === eq);
    if (found) {
      entriesMap[eq] = found;
    }
  }

  // Production Totale = SUM(fin - debut pour chaque equipe)
  let total_production = 0;
  let confort_total = 0;

  for (const eq of TRACKER_EQUIPES) {
    const e = entriesMap[eq];
    if (e) {
      const cycles = Math.max(0, (e.fin_compteur || 0) - (e.debut_compteur || 0));
      total_production += cycles;
      confort_total += (e.ttl_paires || 0);
    }
  }

  // 2ème choix et Rebut (entré par le superviseur ou conservé)
  const deuxieme_choix = existingSummary?.deuxieme_choix ?? 0;
  const rebut = existingSummary?.rebut ?? 0;

  // Règle d'or : defauts_total = total_production - confort_total
  // Si le superviseur a entré 2eme + rebut, cela correspond à defauts_total
  const defauts_total = Math.max(0, total_production - confort_total);
  const taux_defaut = total_production > 0 ? (defauts_total / total_production) * 100 : 0;

  // Calcul meilleure équipe
  let meilleure_equipe_production: TrackerEquipeCode | undefined;
  let maxPaires = -1;
  let meilleure_equipe_qualite: TrackerEquipeCode | undefined;
  let minDefauts = Infinity;
  const scores_equipes: Record<TrackerEquipeCode, number> = { A: 0, B: 0, C: 0 };

  for (const eq of TRACKER_EQUIPES) {
    const e = entriesMap[eq];
    if (e) {
      const paires = e.ttl_paires || 0;
      const defauts = e.defauts_equipe || 0;
      scores_equipes[eq] = paires - (defauts * 10);

      if (paires > maxPaires) {
        maxPaires = paires;
        meilleure_equipe_production = eq;
      }
      if (defauts < minDefauts && paires > 0) {
        minDefauts = defauts;
        meilleure_equipe_qualite = eq;
      }
    }
  }

  return {
    date,
    machine,
    total_production,
    confort_total,
    deuxieme_choix,
    rebut,
    defauts_total,
    taux_defaut: Number(taux_defaut.toFixed(2)),
    is_validated: existingSummary?.is_validated || false,
    validated_by: existingSummary?.validated_by,
    validated_at: existingSummary?.validated_at,
    validation_comment: existingSummary?.validation_comment,
    entries: entriesMap,
    meilleure_equipe_production,
    meilleure_equipe_qualite,
    scores_equipes,
  };
}

/**
 * Calcul du tableau de bord global de l'usine pour une date donnée
 */
export function computeFactoryOverview(
  date: string,
  allEntries: ProductionTrackerEntry[],
  summaries: DailyTrackerSummary[]
): FactoryTrackerOverview {
  const machinesRecord: Record<TrackerMachineCode, DailyTrackerSummary> = {
    EVA1: computeDailySummary(date, 'EVA1', allEntries, summaries.find((s) => s.date === date && s.machine === 'EVA1')),
    EVA2: computeDailySummary(date, 'EVA2', allEntries, summaries.find((s) => s.date === date && s.machine === 'EVA2')),
    EVA3: computeDailySummary(date, 'EVA3', allEntries, summaries.find((s) => s.date === date && s.machine === 'EVA3')),
    EVA4: computeDailySummary(date, 'EVA4', allEntries, summaries.find((s) => s.date === date && s.machine === 'EVA4')),
  };

  let total_production_usine = 0;
  let confort_total_usine = 0;
  let total_rebut_usine = 0;
  let total_deuxieme_choix_usine = 0;

  let bestProdMachine: TrackerMachineCode | undefined;
  let maxMachProd = -1;
  let bestQualMachine: TrackerMachineCode | undefined;
  let minMachTaux = Infinity;
  let worstMach: TrackerMachineCode | undefined;
  let minMachProd = Infinity;

  const rankingToutesEquipes: FactoryTrackerOverview['ranking_toutes_equipes'] = [];

  for (const mCode of TRACKER_MACHINES) {
    const sum = machinesRecord[mCode];
    total_production_usine += sum.total_production;
    confort_total_usine += sum.confort_total;
    total_rebut_usine += sum.rebut;
    total_deuxieme_choix_usine += sum.deuxieme_choix;

    if (sum.total_production > maxMachProd) {
      maxMachProd = sum.total_production;
      bestProdMachine = mCode;
    }
    if (sum.total_production > 0 && sum.total_production < minMachProd) {
      minMachProd = sum.total_production;
      worstMach = mCode;
    }
    if (sum.total_production > 0 && sum.taux_defaut < minMachTaux) {
      minMachTaux = sum.taux_defaut;
      bestQualMachine = mCode;
    }

    // Équipes
    for (const eq of TRACKER_EQUIPES) {
      const e = sum.entries[eq];
      if (e && e.ttl_paires > 0) {
        const score = e.ttl_paires - (e.defauts_equipe * 10);
        rankingToutesEquipes.push({
          machine: mCode,
          equipe: eq,
          paires: e.ttl_paires,
          defauts: e.defauts_equipe,
          taux_equipe: e.taux_equipe,
          score_global: score,
          rang: 0,
        });
      }
    }
  }

  // Trier les équipes par Score Global décroissant
  rankingToutesEquipes.sort((a, b) => b.score_global - a.score_global);
  rankingToutesEquipes.forEach((item, idx) => {
    item.rang = idx + 1;
  });

  const defauts_total_usine = Math.max(0, total_production_usine - confort_total_usine);
  const taux_defaut_usine = total_production_usine > 0
    ? Number(((defauts_total_usine / total_production_usine) * 100).toFixed(2))
    : 0;

  // Meilleure équipe production globale
  const bestEquipeProd = [...rankingToutesEquipes].sort((a, b) => b.paires - a.paires)[0];
  // Meilleure équipe qualité globale
  const bestEquipeQual = [...rankingToutesEquipes].sort((a, b) => a.defauts - b.defauts)[0];

  return {
    date,
    total_production_usine,
    confort_total_usine,
    defauts_total_usine,
    taux_defaut_usine,
    total_rebut_usine,
    total_deuxieme_choix_usine,
    machines: machinesRecord,
    meilleure_machine_production: bestProdMachine,
    meilleure_machine_qualite: bestQualMachine,
    pire_machine: worstMach,
    meilleure_equipe_usine: bestEquipeProd
      ? { machine: bestEquipeProd.machine, equipe: bestEquipeProd.equipe, paires: bestEquipeProd.paires }
      : undefined,
    meilleure_qualite_usine: bestEquipeQual
      ? {
          machine: bestEquipeQual.machine,
          equipe: bestEquipeQual.equipe,
          defauts: bestEquipeQual.defauts,
          taux: bestEquipeQual.taux_equipe,
        }
      : undefined,
    ranking_toutes_equipes: rankingToutesEquipes,
  };
}

// =========================================================================
// DONNÉES INITIALES RÉELLES (conforme aux données fournies par l'utilisateur)
// Exemple : EVA2 = 752+626+716 = 2094, Confort = 656+460+676 = 1792,
// 2ème choix = 165, Rebut = 137, Défauts = 302, Taux = 14.42%
// =========================================================================

export const SEED_TRACKER_ENTRIES: ProductionTrackerEntry[] = [
  // EVA2 - Données exactes fournies par l'utilisateur
  calculateEntryMetrics({
    id: 'ent-eva2-a-2026-09-20',
    date: '2026-09-20',
    machine: 'EVA2',
    equipe: 'A',
    user_id: 'user-op1',
    user_name: 'Ahmed Zerrouki (Équipe A)',
    debut_compteur: 0,
    fin_compteur: 752,
    ttl_paires: 656,
    confort: 656,
    matiere_gramme: 285,
    defauts_detail: {
      'NM/28': 9,
      'NM/36': 6,
      'NM/40': 11,
    },
    status: 'valide',
    created_at: '2026-09-20T06:15:00Z',
    updated_at: '2026-09-20T14:00:00Z',
    notes: 'Excellente cadence de début de poste.',
  }),
  calculateEntryMetrics({
    id: 'ent-eva2-b-2026-09-20',
    date: '2026-09-20',
    machine: 'EVA2',
    equipe: 'B',
    user_id: 'user-op2',
    user_name: 'Karim Mansour (Équipe B)',
    debut_compteur: 752,
    fin_compteur: 1378,
    ttl_paires: 460,
    confort: 460,
    matiere_gramme: 290,
    defauts_detail: {
      'NM/28': 14,
      'NM/36': 12,
      'NM/40': 9,
    },
    status: 'valide',
    created_at: '2026-09-20T14:10:00Z',
    updated_at: '2026-09-20T22:00:00Z',
    notes: 'Changement de moule en cours de poste.',
  }),
  calculateEntryMetrics({
    id: 'ent-eva2-c-2026-09-20',
    date: '2026-09-20',
    machine: 'EVA2',
    equipe: 'C',
    user_id: 'user-op3',
    user_name: 'Farid Belhadj (Équipe C)',
    debut_compteur: 1378,
    fin_compteur: 2094,
    ttl_paires: 676,
    confort: 676,
    matiere_gramme: 280,
    defauts_detail: {
      'NM/28': 8,
      'NM/36': 6,
      'NM/40': 5,
    },
    status: 'valide',
    created_at: '2026-09-20T22:05:00Z',
    updated_at: '2026-09-21T06:00:00Z',
    notes: 'Meilleure production de la journée sur EVA 2.',
  }),

  // EVA1 - Données d'exemple
  calculateEntryMetrics({
    id: 'ent-eva1-a-2026-09-20',
    date: '2026-09-20',
    machine: 'EVA1',
    equipe: 'A',
    user_id: 'user-op1',
    user_name: 'Ahmed Zerrouki',
    debut_compteur: 0,
    fin_compteur: 680,
    ttl_paires: 620,
    confort: 620,
    matiere_gramme: 260,
    defauts_detail: {
      'SML': 10,
      'SB23/23-28': 5,
      'SB23/28-35': 7,
    },
    status: 'valide',
    created_at: '2026-09-20T06:00:00Z',
    updated_at: '2026-09-20T14:00:00Z',
  }),
  calculateEntryMetrics({
    id: 'ent-eva1-b-2026-09-20',
    date: '2026-09-20',
    machine: 'EVA1',
    equipe: 'B',
    user_id: 'user-op2',
    user_name: 'Karim Mansour',
    debut_compteur: 680,
    fin_compteur: 1390,
    ttl_paires: 640,
    confort: 640,
    matiere_gramme: 262,
    defauts_detail: {
      'SML': 12,
      'SB23/23-28': 8,
      'SB23/28-35': 6,
    },
    status: 'valide',
    created_at: '2026-09-20T14:00:00Z',
    updated_at: '2026-09-20T22:00:00Z',
  }),
  calculateEntryMetrics({
    id: 'ent-eva1-c-2026-09-20',
    date: '2026-09-20',
    machine: 'EVA1',
    equipe: 'C',
    user_id: 'user-op3',
    user_name: 'Farid Belhadj',
    debut_compteur: 1390,
    fin_compteur: 2050,
    ttl_paires: 590,
    confort: 590,
    matiere_gramme: 265,
    defauts_detail: {
      'SML': 7,
      'SB23/23-28': 4,
      'SB23/28-35': 5,
    },
    status: 'valide',
    created_at: '2026-09-20T22:00:00Z',
    updated_at: '2026-09-21T06:00:00Z',
  }),

  // EVA3 - Données d'exemple
  calculateEntryMetrics({
    id: 'ent-eva3-a-2026-09-20',
    date: '2026-09-20',
    machine: 'EVA3',
    equipe: 'A',
    user_id: 'user-op1',
    user_name: 'Ahmed Zerrouki',
    debut_compteur: 0,
    fin_compteur: 730,
    ttl_paires: 670,
    confort: 670,
    matiere_gramme: 310,
    defauts_detail: {
      'SH318/28': 12,
      'SH318/36': 9,
      'SH316/36': 8,
    },
    status: 'valide',
    created_at: '2026-09-20T06:00:00Z',
    updated_at: '2026-09-20T14:00:00Z',
  }),
  calculateEntryMetrics({
    id: 'ent-eva3-b-2026-09-20',
    date: '2026-09-20',
    machine: 'EVA3',
    equipe: 'B',
    user_id: 'user-op2',
    user_name: 'Karim Mansour',
    debut_compteur: 730,
    fin_compteur: 1420,
    ttl_paires: 610,
    confort: 610,
    matiere_gramme: 315,
    defauts_detail: {
      'SH318/28': 15,
      'SH318/36': 11,
      'SH316/36': 13,
    },
    status: 'valide',
    created_at: '2026-09-20T14:00:00Z',
    updated_at: '2026-09-20T22:00:00Z',
  }),
  calculateEntryMetrics({
    id: 'ent-eva3-c-2026-09-20',
    date: '2026-09-20',
    machine: 'EVA3',
    equipe: 'C',
    user_id: 'user-op3',
    user_name: 'Farid Belhadj',
    debut_compteur: 1420,
    fin_compteur: 2130,
    ttl_paires: 650,
    confort: 650,
    matiere_gramme: 308,
    defauts_detail: {
      'SH318/28': 6,
      'SH318/36': 5,
      'SH316/36': 4,
    },
    status: 'valide',
    created_at: '2026-09-20T22:00:00Z',
    updated_at: '2026-09-21T06:00:00Z',
  }),

  // EVA4 (Unité 2)
  calculateEntryMetrics({
    id: 'ent-eva4-a-2026-09-20',
    date: '2026-09-20',
    machine: 'EVA4',
    equipe: 'A',
    user_id: 'user-chef-eva4-m',
    user_name: 'Yacine Brahimi (Équipe A)',
    debut_compteur: 0,
    fin_compteur: 710,
    ttl_paires: 630,
    confort: 630,
    matiere_gramme: 290,
    defauts_detail: {
      'NM/28': 8,
      'NM/36': 7,
      'NM/40': 5,
    },
    status: 'valide',
    created_at: '2026-09-20T06:00:00Z',
    updated_at: '2026-09-20T14:00:00Z',
  }),
  calculateEntryMetrics({
    id: 'ent-eva4-b-2026-09-20',
    date: '2026-09-20',
    machine: 'EVA4',
    equipe: 'B',
    user_id: 'user-chef-eva4-s',
    user_name: 'Walid Larbi (Équipe B)',
    debut_compteur: 710,
    fin_compteur: 1400,
    ttl_paires: 620,
    confort: 620,
    matiere_gramme: 292,
    defauts_detail: {
      'NM/28': 10,
      'NM/36': 8,
      'NM/40': 6,
    },
    status: 'valide',
    created_at: '2026-09-20T14:00:00Z',
    updated_at: '2026-09-20T22:00:00Z',
  }),
  calculateEntryMetrics({
    id: 'ent-eva4-c-2026-09-20',
    date: '2026-09-20',
    machine: 'EVA4',
    equipe: 'C',
    user_id: 'user-chef-eva4-n',
    user_name: 'Salim Guendouz (Équipe C)',
    debut_compteur: 1400,
    fin_compteur: 2080,
    ttl_paires: 610,
    confort: 610,
    matiere_gramme: 288,
    defauts_detail: {
      'NM/28': 6,
      'NM/36': 4,
      'NM/50': 5,
    },
    status: 'valide',
    created_at: '2026-09-20T22:00:00Z',
    updated_at: '2026-09-21T06:00:00Z',
  }),
];

export const SEED_TRACKER_SUMMARIES: DailyTrackerSummary[] = [
  {
    date: '2026-09-20',
    machine: 'EVA2',
    total_production: 2094, // 752 + 626 + 716
    confort_total: 1792, // 656 + 460 + 676
    deuxieme_choix: 165,
    rebut: 137,
    defauts_total: 302, // 2094 - 1792 = 302 (165 + 137)
    taux_defaut: 14.42, // (302 / 2094) * 100
    is_validated: true,
    validated_by: 'Amina Saidi (Qualité)',
    validated_at: '2026-09-21T07:30:00Z',
    validation_comment: 'Compteurs validés conformément aux relevés d’atelier. 2ème choix et rebut conformes.',
    entries: {},
    meilleure_equipe_production: 'C',
    meilleure_equipe_qualite: 'C',
    scores_equipes: { A: 406, B: 110, C: 486 },
  },
  {
    date: '2026-09-20',
    machine: 'EVA1',
    total_production: 2050, // 680 + 710 + 660
    confort_total: 1850, // 620 + 640 + 590
    deuxieme_choix: 110,
    rebut: 90,
    defauts_total: 200, // 2050 - 1850
    taux_defaut: 9.76,
    is_validated: true,
    validated_by: 'Amina Saidi (Qualité)',
    validated_at: '2026-09-21T07:35:00Z',
    validation_comment: 'Bonne régularité générale.',
    entries: {},
    meilleure_equipe_production: 'B',
    meilleure_equipe_qualite: 'C',
    scores_equipes: { A: 400, B: 380, C: 430 },
  },
  {
    date: '2026-09-20',
    machine: 'EVA3',
    total_production: 2130, // 730 + 690 + 710
    confort_total: 1930, // 670 + 610 + 650
    deuxieme_choix: 115,
    rebut: 85,
    defauts_total: 200, // 2130 - 1930
    taux_defaut: 9.39,
    is_validated: true,
    validated_by: 'Amina Saidi (Qualité)',
    validated_at: '2026-09-21T07:40:00Z',
    validation_comment: 'Cadence soutenue sur SH318/SH316.',
    entries: {},
    meilleure_equipe_production: 'A',
    meilleure_equipe_qualite: 'C',
    scores_equipes: { A: 380, B: 220, C: 500 },
  },
  {
    date: '2026-09-20',
    machine: 'EVA4',
    total_production: 2080,
    confort_total: 1860,
    deuxieme_choix: 120,
    rebut: 100,
    defauts_total: 220,
    taux_defaut: 10.58,
    is_validated: true,
    validated_by: 'Khaled Meftah (Gérant U2)',
    validated_at: '2026-09-21T07:45:00Z',
    validation_comment: 'Production conforme Unité 2 EVA4.',
    entries: {},
    meilleure_equipe_production: 'A',
    meilleure_equipe_qualite: 'C',
    scores_equipes: { A: 430, B: 380, C: 460 },
  },
];
