// =========================================================================
// MOTEUR DE CALCULS & LOGIQUE PILOTAGE INDUSTRIEL MACHINE EVA (12 STATIONS)
// Conforme aux règles CTP SMART :
// 1. Gère EVA 1, EVA 2 et EVA 3 avec 12 stations indépendantes
// 2. Statuts : ACTIVE, ARRETEE, VIDE, EN MAINTENANCE
// 3. Ne jamais considérer une station vide ou arrêtée comme une perte de production
// 4. Calculs automatiques : cycles, paires (1, 2 ou 4 p/cycle), cartons, rebuts,
//    consommation matière, rendement %, temps productif et arrêts
// 5. Contrôle automatique des incohérences et anomalies
// =========================================================================

import {
  EvaMachineCode,
  EvaStationRecord,
  EvaMachineSessionState,
  EvaStationStatus,
  ShiftTeam,
  EvaArretRecord,
  EvaQualityCheck,
  EvaAuditLogEntry,
  EvaDailyProductionRecord,
  TeamProductionData,
} from '../types/evaPilotageLogic';

export const EVA_MACHINES_LIST: EvaMachineCode[] = ['EVA 1', 'EVA 2', 'EVA 3', 'EVA 4'];

export const STATION_STATUS_CONFIG: Record<
  EvaStationStatus,
  { label: string; bg: string; text: string; border: string; badge: string; desc: string }
> = {
  ACTIVE: {
    label: 'ACTIVE',
    bg: 'bg-emerald-500/10 hover:bg-emerald-500/20',
    text: 'text-emerald-700 dark:text-emerald-400',
    border: 'border-emerald-500/30',
    badge: 'bg-emerald-500 text-white',
    desc: 'Station en production réelle',
  },
  ARRETEE: {
    label: 'ARRÊTÉE',
    bg: 'bg-rose-500/10 hover:bg-rose-500/20',
    text: 'text-rose-700 dark:text-rose-400',
    border: 'border-rose-500/30',
    badge: 'bg-rose-500 text-white',
    desc: 'Arrêt temporaire (non pénalisé)',
  },
  VIDE: {
    label: 'VIDE',
    bg: 'bg-slate-100 dark:bg-slate-800/40',
    text: 'text-slate-500 dark:text-slate-400',
    border: 'border-slate-300 dark:border-slate-700',
    badge: 'bg-slate-400 text-white',
    desc: 'Emplacement non utilisé (neutre)',
  },
  MAINTENANCE: {
    label: 'MAINTENANCE',
    bg: 'bg-amber-500/10 hover:bg-amber-500/20',
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-500/30',
    badge: 'bg-amber-500 text-white',
    desc: 'Intervention mécanique / moule',
  },
};

/**
 * Génère la configuration initiale des 12 stations d'une machine EVA
 */
export function createDefault12StationsConfig(machine: EvaMachineCode): EvaStationRecord[] {
  // Preset réaliste de l'usine CTP selon la machine
  const baseCounters: Record<EvaMachineCode, { debut: number; delta: number }> = {
    'EVA 1': { debut: 24500, delta: 120 },
    'EVA 2': { debut: 18200, delta: 110 },
    'EVA 3': { debut: 31050, delta: 135 },
    'EVA 4': { debut: 12400, delta: 115 },
  };

  const { debut, delta } = baseCounters[machine] || { debut: 10000, delta: 100 };

  return Array.from({ length: 12 }, (_, i) => {
    const stationNum = i + 1;
    let status: EvaStationStatus = 'ACTIVE';
    let modele = 'NM';
    let designation = 'Homme';
    let pointure = '40-44';
    let referenceMoule = `M-${machine.replace(' ', '')}-ST${String(stationNum).padStart(2, '0')}`;
    let couleur1 = 'Noir Mat';
    let couleur2: string | undefined = undefined;
    let isBicolor = false;
    let pairsPerCycle: 1 | 2 | 4 = 2; // Standard 2 paires / cycle
    let arretMin = 0;
    let arretCause = '';
    let rebut = 1;

    if (stationNum <= 4) {
      modele = 'NM';
      designation = 'Homme';
      pointure = '40-44';
      couleur1 = 'Noir Mat';
      pairsPerCycle = 2;
    } else if (stationNum <= 8) {
      modele = 'NM';
      designation = 'Femme';
      pointure = '36-41';
      couleur1 = 'Blanc Pur';
      pairsPerCycle = 2;
    } else if (stationNum === 9) {
      modele = 'BC07';
      designation = 'Enfant';
      pointure = '28-35';
      couleur1 = 'Bleu Marine';
      couleur2 = 'Blanc';
      isBicolor = true;
      pairsPerCycle = 2;
    } else if (stationNum === 10) {
      status = 'ARRETEE';
      modele = 'BC07';
      designation = 'Bébé';
      pointure = '23-28';
      pairsPerCycle = 2;
      arretMin = 45;
      arretCause = 'Changement de moule pointure 23-28';
    } else if (stationNum === 11) {
      status = 'VIDE';
      modele = 'Non assigné';
      designation = '-';
      pointure = '-';
      referenceMoule = '-';
      pairsPerCycle = 1;
      rebut = 0;
    } else {
      status = 'MAINTENANCE';
      modele = 'En révision';
      designation = '-';
      pointure = '-';
      referenceMoule = '-';
      pairsPerCycle = 1;
      arretMin = 90;
      arretCause = 'Remplacement buse injecteur 2';
      rebut = 0;
    }

    const stDebut = debut;
    const stFin = status === 'ACTIVE' ? debut + delta : debut;
    const cycles = status === 'ACTIVE' ? delta : 0;
    const pairesBrutes = status === 'ACTIVE' ? cycles * pairsPerCycle : 0;
    const pairesNettes = Math.max(0, pairesBrutes - rebut);
    const pairesParCarton = 12;

    const anomalies: string[] = [];
    if (status === 'ACTIVE' && rebut > 5) {
      anomalies.push('Rebut élevé (> 5 paires)');
    }

    return {
      stationNumber: stationNum,
      status,
      modele,
      designation,
      referenceMoule,
      pointure,
      couleur1,
      couleur2,
      isBicolor,
      pairsPerCycle,
      compteurDebut: stDebut,
      compteurFin: stFin,
      cycles,
      pairesBrutes,
      rebutPaires: status === 'ACTIVE' ? rebut : 0,
      pairesNettes,
      pairesParCarton,
      cartonsPleins: Math.floor(pairesNettes / pairesParCarton),
      reliquatPaires: pairesNettes % pairesParCarton,
      arretMinutes: arretMin,
      arretCause: arretCause || undefined,
      arretResponsable: arretMin > 0 ? 'Équipe Maintenance' : undefined,
      anomalies,
    };
  });
}

/**
 * Recalcule une station individuelle avec ses compteurs, cycles et anomalies
 */
export function recalculateStation(st: EvaStationRecord): EvaStationRecord {
  const anomalies: string[] = [];

  // Règle fondamentale CTP : si la station n'est pas ACTIVE, sa production attendue est 0
  if (st.status !== 'ACTIVE') {
    return {
      ...st,
      cycles: 0,
      pairesBrutes: 0,
      rebutPaires: 0,
      pairesNettes: 0,
      cartonsPleins: 0,
      reliquatPaires: 0,
      anomalies: [],
    };
  }

  // Contrôle d'incohérence compteur
  if (st.compteurFin < st.compteurDebut) {
    anomalies.push(`Compteur fin (${st.compteurFin}) inférieur au compteur début (${st.compteurDebut})`);
  }

  const cycles = Math.max(0, st.compteurFin - st.compteurDebut);
  const pairesBrutes = cycles * (st.pairsPerCycle || 2);
  const rebut = Math.max(0, st.rebutPaires || 0);

  if (rebut > pairesBrutes && pairesBrutes > 0) {
    anomalies.push(`Rebut (${rebut}) supérieur à la production brute (${pairesBrutes})`);
  }

  const pairesNettes = Math.max(0, pairesBrutes - rebut);
  const pairesParCarton = st.pairesParCarton > 0 ? st.pairesParCarton : 12;

  // Alertes qualité & fiche
  if (pairesBrutes > 0) {
    const tauxRebut = (rebut / pairesBrutes) * 100;
    if (tauxRebut > 2.0) {
      anomalies.push(`Taux de rebut élevé (${tauxRebut.toFixed(1)}% > seuil 2%)`);
    }
  }

  if (!st.modele || st.modele === 'Non assigné') {
    anomalies.push('Fiche incomplète : modèle manquant sur station active');
  }
  if (!st.referenceMoule || st.referenceMoule === '-') {
    anomalies.push('Fiche incomplète : référence moule manquante');
  }

  return {
    ...st,
    cycles,
    pairesBrutes,
    rebutPaires: rebut,
    pairesNettes,
    cartonsPleins: Math.floor(pairesNettes / pairesParCarton),
    reliquatPaires: pairesNettes % pairesParCarton,
    anomalies,
  };
}

/**
 * Calcule l'état consolidé de la machine EVA et synthétise tous les KPIs
 */
export function calculateEvaMachineSession(
  machineCode: EvaMachineCode,
  stations: EvaStationRecord[],
  options?: {
    equipe?: ShiftTeam;
    operateur?: string;
    objectifPaires?: number;
    poidsMoyenGrammes?: number;
    date?: string;
    heure?: string;
  }
): EvaMachineSessionState {
  const updatedStations = stations.map(recalculateStation);

  const totalStationsActives = updatedStations.filter((s) => s.status === 'ACTIVE').length;
  const totalStationsArretees = updatedStations.filter((s) => s.status === 'ARRETEE').length;
  const totalStationsVides = updatedStations.filter((s) => s.status === 'VIDE').length;
  const totalStationsMaintenance = updatedStations.filter((s) => s.status === 'MAINTENANCE').length;

  // Capacité réellement engagée (somme des paires/cycle des stations ACTIVE uniquement)
  const capaciteEngageePairesParCycle = updatedStations.reduce((sum, s) => {
    return s.status === 'ACTIVE' ? sum + s.pairsPerCycle : sum;
  }, 0);

  // Cycles moyens ou max des stations actives
  const activeStations = updatedStations.filter((s) => s.status === 'ACTIVE');
  const cyclesMachine = activeStations.length > 0
    ? Math.max(...activeStations.map((s) => s.cycles))
    : 0;

  // Min et Max compteurs
  const compteurGlobalDebut = activeStations.length > 0
    ? Math.min(...activeStations.map((s) => s.compteurDebut))
    : 0;
  const compteurGlobalFin = activeStations.length > 0
    ? Math.max(...activeStations.map((s) => s.compteurFin))
    : 0;

  // Totaux production
  const productionBruteTotale = updatedStations.reduce((sum, s) => sum + s.pairesBrutes, 0);
  const rebutTotal = updatedStations.reduce((sum, s) => sum + s.rebutPaires, 0);
  const productionNetteTotale = updatedStations.reduce((sum, s) => sum + s.pairesNettes, 0);

  const tauxRebutPct = productionBruteTotale > 0
    ? Number(((rebutTotal / productionBruteTotale) * 100).toFixed(2))
    : 0;

  const tauxConformitePct = productionBruteTotale > 0
    ? Number(((productionNetteTotale / productionBruteTotale) * 100).toFixed(2))
    : 100;

  const totalCartonsPleins = updatedStations.reduce((sum, s) => sum + s.cartonsPleins, 0);
  const totalPairesOuvertes = updatedStations.reduce((sum, s) => sum + s.reliquatPaires, 0);

  // Consommation matière
  const poidsMoyenPaireGrammes = options?.poidsMoyenGrammes || 280;
  const matiereConsommeeKg = Number(((productionBruteTotale * poidsMoyenPaireGrammes) / 1000).toFixed(2));
  const sacs25kgConsommes = Math.ceil(matiereConsommeeKg / 25);

  const poidsNetConformeKg = (productionNetteTotale * poidsMoyenPaireGrammes) / 1000;
  const rendementMatierePct = matiereConsommeeKg > 0
    ? Number(((poidsNetConformeKg / matiereConsommeeKg) * 100).toFixed(2))
    : 100;

  // Arrêts et temps
  const tempsArretTotalMinutes = updatedStations.reduce((sum, s) => sum + (s.arretMinutes || 0), 0);
  const shiftMinutes = 480; // 8 heures standard = 480 minutes
  const tempsProductifMinutes = Math.max(0, shiftMinutes - Math.min(shiftMinutes, tempsArretTotalMinutes));

  const objectifPaires = options?.objectifPaires || 1800;
  const tauxEfficiencePct = objectifPaires > 0
    ? Number(((productionNetteTotale / objectifPaires) * 100).toFixed(1))
    : 0;

  // Synthèse des anomalies
  const anomaliesDetectees: string[] = [];
  if (tauxRebutPct > 2.0) {
    anomaliesDetectees.push(`Alerte Rebut Usine : Taux global ${tauxRebutPct}% supérieur à la tolérance (2.0%)`);
  }
  if (rendementMatierePct < 95.0 && matiereConsommeeKg > 0) {
    anomaliesDetectees.push(`Alerte Rendement : Rendement matière ${rendementMatierePct}% inférieur à l'objectif (95.0%)`);
  }
  if (tempsArretTotalMinutes > 30) {
    anomaliesDetectees.push(`Alerte Arrêt Prolongé : ${tempsArretTotalMinutes} min d'arrêts cumulés sur la machine`);
  }
  if (totalStationsActives === 0) {
    anomaliesDetectees.push('Avertissement : Aucune station active sur la machine');
  }

  // Collecte des anomalies de chaque station
  updatedStations.forEach((s) => {
    if (s.anomalies.length > 0) {
      anomaliesDetectees.push(`Station ${s.stationNumber} : ${s.anomalies.join(' • ')}`);
    }
  });

  return {
    machineCode,
    date: options?.date || new Date().toISOString().substring(0, 10),
    heure: options?.heure || new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    equipe: options?.equipe || 'Équipe A',
    operateur: options?.operateur || 'Opérateur Ligne EVA',
    compteurGlobalDebut,
    compteurGlobalFin,
    objectifPaires,
    poidsMoyenPaireGrammes,
    stations: updatedStations,
    totalStationsActives,
    totalStationsArretees,
    totalStationsVides,
    totalStationsMaintenance,
    capaciteEngageePairesParCycle,
    cyclesMachine,
    productionBruteTotale,
    rebutTotal,
    tauxRebutPct,
    productionNetteTotale,
    tauxConformitePct,
    totalCartonsPleins,
    totalPairesOuvertes,
    matiereConsommeeKg,
    sacs25kgConsommes,
    rendementMatierePct,
    tempsProductifMinutes,
    tempsArretTotalMinutes,
    tauxEfficiencePct,
    anomaliesDetectees,
  };
}

/**
 * Mode Production Rapide : Distribue les cycles globaux aux stations actives
 */
export function applyFastEntryToStations(
  currentStations: EvaStationRecord[],
  compteurDebutGlobal: number,
  compteurFinGlobal: number,
  rebutTotalGlobal: number
): EvaStationRecord[] {
  const deltaCycles = Math.max(0, compteurFinGlobal - compteurDebutGlobal);
  const activeStations = currentStations.filter((s) => s.status === 'ACTIVE');
  const activeCount = activeStations.length;

  if (activeCount === 0) return currentStations;

  const rebutPerStation = Math.floor(rebutTotalGlobal / activeCount);
  const rebutRemainder = rebutTotalGlobal % activeCount;

  let activeIndex = 0;
  return currentStations.map((st) => {
    if (st.status !== 'ACTIVE') {
      return {
        ...st,
        cycles: 0,
        pairesBrutes: 0,
        rebutPaires: 0,
        pairesNettes: 0,
        cartonsPleins: 0,
        reliquatPaires: 0,
      };
    }

    const stRebut = rebutPerStation + (activeIndex < rebutRemainder ? 1 : 0);
    activeIndex++;

    const updated: EvaStationRecord = {
      ...st,
      compteurDebut: compteurDebutGlobal,
      compteurFin: compteurFinGlobal,
      cycles: deltaCycles,
      rebutPaires: stRebut,
    };

    return recalculateStation(updated);
  });
}

/**
 * Mock Initial Arrêts pour la traçabilité
 */
export const INITIAL_EVA_ARRETS: EvaArretRecord[] = [
  {
    id: 'arr-01',
    machineCode: 'EVA 1',
    stationNumber: 10,
    date: new Date().toISOString().substring(0, 10),
    heureDebut: '09:15',
    dureeMinutes: 45,
    cause: 'Changement Série',
    responsable: 'Karim (Chef Équipe A)',
    description: 'Changement de moule vers BC07 Bébé 23-28',
    resolu: true,
  },
  {
    id: 'arr-02',
    machineCode: 'EVA 2',
    stationNumber: 12,
    date: new Date().toISOString().substring(0, 10),
    heureDebut: '10:30',
    dureeMinutes: 60,
    cause: 'Mécanique',
    responsable: 'Mounir (Mécanicien)',
    description: 'Remplacement buse injecteur n°2 suite obstruction matière',
    resolu: false,
  },
  {
    id: 'arr-03',
    machineCode: 'EVA 3',
    stationNumber: 'Toutes',
    date: new Date().toISOString().substring(0, 10),
    heureDebut: '12:00',
    dureeMinutes: 30,
    cause: 'Pause',
    responsable: 'Opérateurs Ligne',
    description: 'Pause déjeuner réglementaire Équipe B',
    resolu: true,
  },
];

/**
 * Mock Initial Contrôle Qualité par modèle
 */
export const INITIAL_EVA_QUALITY_CHECKS: EvaQualityCheck[] = [
  {
    id: 'qc-01',
    machineCode: 'EVA 1',
    stationNumber: 1,
    modele: 'NM',
    pointure: '40-44',
    date: new Date().toISOString().substring(0, 10),
    heure: '09:00',
    inspecteur: 'Sarah Contrôle Qualité',
    defautsDetectes: {
      bavures: 2,
      retassures: 0,
      bulles: 0,
      nonConformeCouleur: 0,
      erreurPointure: 0,
    },
    totalControle: 50,
    conforme: true,
    actionCorrective: 'Ébavurage manuel conforme',
  },
  {
    id: 'qc-02',
    machineCode: 'EVA 2',
    stationNumber: 5,
    modele: 'NM',
    pointure: '36-41',
    date: new Date().toISOString().substring(0, 10),
    heure: '10:15',
    inspecteur: 'Sarah Contrôle Qualité',
    defautsDetectes: {
      bavures: 4,
      retassures: 1,
      bulles: 1,
      nonConformeCouleur: 0,
      erreurPointure: 0,
    },
    totalControle: 50,
    conforme: false,
    actionCorrective: 'Ajustement température injection buse 1 (-5°C)',
  },
];

// =========================================================================
// MOTEUR DE CALCULS & CLASSEMENT JOURNALIER CTP SMART (FORMULAIRE & RANGS)
// Règles exactes :
// 1. Score Global = Paires - (Défauts * 10)
// 2. Meilleure Prod Machine = MAX(paires)
// 3. Meilleure Qualité Machine = MIN(défauts)
// 4. Classement Machine = 1er, 2ème, 3ème selon Score Global
// 5. Comparatif Inter-Machines :
//    - Meilleure Machine Prod = MAX(total paires)
//    - Meilleure Machine Qualité = MIN( (rebut + 2eme) / total )
//    - Pire Machine = MIN(total paires)
// 6. Comparatif Toutes Équipes Usine :
//    - Meilleure Équipe Usine Prod = MAX(paires)
//    - Meilleure Équipe Usine Qualité = MIN(défauts)
//    - Pire Équipe Usine = MAX(défauts)
// =========================================================================

export function calculateTeamScore(paires: number, defauts: number): number {
  return Number(paires || 0) - Number(defauts || 0) * 10;
}

export interface RankedTeamItem {
  rang: number;
  equipe: ShiftTeam;
  machine?: EvaMachineCode;
  paires: number;
  defauts: number;
  scoreGlobal: number;
}

export interface MachineAnalysisResult {
  machine: EvaMachineCode;
  totalPaires: number;
  rebut: number;
  deuxiemeChoix: number;
  tauxNonConformitePct: number;
  equipesRanked: RankedTeamItem[];
  meilleureProduction: { equipe: ShiftTeam; paires: number };
  meilleureQualite: { equipe: ShiftTeam; defauts: number };
  meilleurScoreGlobal: { equipe: ShiftTeam; score: number };
}

export function analyzeMachineDailyRecord(record: EvaDailyProductionRecord): MachineAnalysisResult {
  const teams: ShiftTeam[] = ['Équipe A', 'Équipe B', 'Équipe C'];
  const teamItems: RankedTeamItem[] = teams.map((teamName) => {
    const data = record.equipes[teamName] || { paires: 0, defauts: 0 };
    const score = calculateTeamScore(data.paires, data.defauts);
    return {
      rang: 1,
      equipe: teamName,
      machine: record.machine,
      paires: Number(data.paires || 0),
      defauts: Number(data.defauts || 0),
      scoreGlobal: score,
    };
  });

  // Trier par Score Global décroissant
  teamItems.sort((a, b) => b.scoreGlobal - a.scoreGlobal);
  teamItems.forEach((item, idx) => {
    item.rang = idx + 1;
  });

  // Max paires
  const sortedByPaires = [...teamItems].sort((a, b) => b.paires - a.paires);
  const meilleureProd = sortedByPaires[0]
    ? { equipe: sortedByPaires[0].equipe, paires: sortedByPaires[0].paires }
    : { equipe: 'Équipe A' as ShiftTeam, paires: 0 };

  // Min defauts
  const sortedByDefauts = [...teamItems].sort((a, b) => a.defauts - b.defauts);
  const meilleureQual = sortedByDefauts[0]
    ? { equipe: sortedByDefauts[0].equipe, defauts: sortedByDefauts[0].defauts }
    : { equipe: 'Équipe A' as ShiftTeam, defauts: 0 };

  // Meilleur score
  const meilleurScore = teamItems[0]
    ? { equipe: teamItems[0].equipe, score: teamItems[0].scoreGlobal }
    : { equipe: 'Équipe A' as ShiftTeam, score: 0 };

  const total = Number(record.totalPaires) || teamItems.reduce((acc, t) => acc + t.paires, 0);
  const rebut = Number(record.rebut || 0);
  const deuxieme = Number(record.deuxiemeChoix || 0);
  const nonConfPct = total > 0 ? Number((((rebut + deuxieme) / total) * 100).toFixed(2)) : 0;

  return {
    machine: record.machine,
    totalPaires: total,
    rebut,
    deuxiemeChoix: deuxieme,
    tauxNonConformitePct: nonConfPct,
    equipesRanked: teamItems,
    meilleureProduction: meilleureProd,
    meilleureQualite: meilleureQual,
    meilleurScoreGlobal: meilleurScore,
  };
}

export interface FactoryDailyAnalysisResult {
  date: string;
  totalPairesUsine: number;
  totalRebutUsine: number;
  totalDeuxiemeChoixUsine: number;
  tauxNonConformiteUsinePct: number;
  // Comparatif machines
  meilleureMachineProd: { machine: EvaMachineCode; totalPaires: number } | null;
  meilleureMachineQualite: { machine: EvaMachineCode; tauxNonConformitePct: number } | null;
  pireMachine: { machine: EvaMachineCode; totalPaires: number } | null;
  machinesAnalysis: MachineAnalysisResult[];
  // Comparatif toutes équipes de l'usine
  meilleureEquipeUsineProd: { machine: EvaMachineCode; equipe: ShiftTeam; paires: number } | null;
  meilleureEquipeUsineQualite: { machine: EvaMachineCode; equipe: ShiftTeam; defauts: number } | null;
  pireEquipeUsine: { machine: EvaMachineCode; equipe: ShiftTeam; defauts: number } | null;
  classementGeneralUsine: RankedTeamItem[];
}

export function analyzeFactoryDailyRecords(
  records: EvaDailyProductionRecord[],
  targetDate: string
): FactoryDailyAnalysisResult {
  const dayRecords = records.filter((r) => r.date === targetDate);
  const machineAnalyses = dayRecords.map((r) => analyzeMachineDailyRecord(r));

  const totalPairesUsine = machineAnalyses.reduce((acc, m) => acc + m.totalPaires, 0);
  const totalRebutUsine = machineAnalyses.reduce((acc, m) => acc + m.rebut, 0);
  const total2emeUsine = machineAnalyses.reduce((acc, m) => acc + m.deuxiemeChoix, 0);
  const tauxNonConfUsine =
    totalPairesUsine > 0 ? Number((((totalRebutUsine + total2emeUsine) / totalPairesUsine) * 100).toFixed(2)) : 0;

  // Comparatif Machines
  let meilleureMachineProd: { machine: EvaMachineCode; totalPaires: number } | null = null;
  let meilleureMachineQualite: { machine: EvaMachineCode; tauxNonConformitePct: number } | null = null;
  let pireMachine: { machine: EvaMachineCode; totalPaires: number } | null = null;

  if (machineAnalyses.length > 0) {
    const sortedByProd = [...machineAnalyses].sort((a, b) => b.totalPaires - a.totalPaires);
    meilleureMachineProd = { machine: sortedByProd[0].machine, totalPaires: sortedByProd[0].totalPaires };
    pireMachine = {
      machine: sortedByProd[sortedByProd.length - 1].machine,
      totalPaires: sortedByProd[sortedByProd.length - 1].totalPaires,
    };

    const sortedByQual = [...machineAnalyses].sort((a, b) => a.tauxNonConformitePct - b.tauxNonConformitePct);
    meilleureMachineQualite = {
      machine: sortedByQual[0].machine,
      tauxNonConformitePct: sortedByQual[0].tauxNonConformitePct,
    };
  }

  // Comparatif toutes équipes de l'usine
  const allTeams: RankedTeamItem[] = [];
  machineAnalyses.forEach((m) => {
    m.equipesRanked.forEach((eq) => {
      allTeams.push({
        ...eq,
        machine: m.machine,
      });
    });
  });

  // Classement général usine par Score Global décroissant
  allTeams.sort((a, b) => b.scoreGlobal - a.scoreGlobal);
  allTeams.forEach((t, idx) => {
    t.rang = idx + 1;
  });

  let meilleureEquipeUsineProd: { machine: EvaMachineCode; equipe: ShiftTeam; paires: number } | null = null;
  let meilleureEquipeUsineQualite: { machine: EvaMachineCode; equipe: ShiftTeam; defauts: number } | null = null;
  let pireEquipeUsine: { machine: EvaMachineCode; equipe: ShiftTeam; defauts: number } | null = null;

  if (allTeams.length > 0) {
    const sortedAllProd = [...allTeams].sort((a, b) => b.paires - a.paires);
    meilleureEquipeUsineProd = {
      machine: sortedAllProd[0].machine || 'EVA 1',
      equipe: sortedAllProd[0].equipe,
      paires: sortedAllProd[0].paires,
    };

    const sortedAllDefauts = [...allTeams].sort((a, b) => a.defauts - b.defauts);
    meilleureEquipeUsineQualite = {
      machine: sortedAllDefauts[0].machine || 'EVA 1',
      equipe: sortedAllDefauts[0].equipe,
      defauts: sortedAllDefauts[0].defauts,
    };

    const sortedAllDefautsWorst = [...allTeams].sort((a, b) => b.defauts - a.defauts);
    pireEquipeUsine = {
      machine: sortedAllDefautsWorst[0].machine || 'EVA 1',
      equipe: sortedAllDefautsWorst[0].equipe,
      defauts: sortedAllDefautsWorst[0].defauts,
    };
  }

  return {
    date: targetDate,
    totalPairesUsine,
    totalRebutUsine,
    totalDeuxiemeChoixUsine: total2emeUsine,
    tauxNonConformiteUsinePct: tauxNonConfUsine,
    meilleureMachineProd,
    meilleureMachineQualite,
    pireMachine,
    machinesAnalysis: machineAnalyses,
    meilleureEquipeUsineProd,
    meilleureEquipeUsineQualite,
    pireEquipeUsine,
    classementGeneralUsine: allTeams,
  };
}

/**
 * Données de base pré-remplies avec les chiffres réels de l'usine (Exemple du 20/09/2026 fourni)
 */
export const INITIAL_EVA_DAILY_RECORDS: EvaDailyProductionRecord[] = [
  {
    id: 'rec-eva1-2026-09-20',
    date: '2026-09-20',
    machine: 'EVA 1',
    equipes: {
      'Équipe A': { paires: 600, defauts: 20 },
      'Équipe B': { paires: 620, defauts: 30 },
      'Équipe C': { paires: 580, defauts: 15 },
    },
    totalPaires: 1800,
    rebut: 80,
    deuxiemeChoix: 90,
    tauxNonConformitePct: 9.44,
    note: 'Cadence régulière, excellent score Equipe C',
    updatedAt: '2026-09-20T22:30:00Z',
    enregistrePar: 'Chef Atelier EVA',
  },
  {
    id: 'rec-eva2-2026-09-20',
    date: '2026-09-20',
    machine: 'EVA 2',
    equipes: {
      'Équipe A': { paires: 588, defauts: 13 },
      'Équipe B': { paires: 604, defauts: 62 },
      'Équipe C': { paires: 644, defauts: 26 },
    },
    totalPaires: 2028,
    rebut: 91,
    deuxiemeChoix: 101,
    tauxNonConformitePct: 9.47,
    note: 'Equipe A meilleure qualité usine (13 defauts). Equipe B anomalie bavures (62 defauts)',
    updatedAt: '2026-09-20T22:35:00Z',
    enregistrePar: 'Chef Atelier EVA',
  },
  {
    id: 'rec-eva3-2026-09-20',
    date: '2026-09-20',
    machine: 'EVA 3',
    equipes: {
      'Équipe A': { paires: 612, defauts: 34 },
      'Équipe B': { paires: 712, defauts: 49 },
      'Équipe C': { paires: 612, defauts: 54 },
    },
    totalPaires: 2228,
    rebut: 155,
    deuxiemeChoix: 137,
    tauxNonConformitePct: 13.11,
    note: 'Equipe B record usine 712 paires. Rebut élevé à surveiller sur moules 9-10',
    updatedAt: '2026-09-20T22:40:00Z',
    enregistrePar: 'Chef Atelier EVA',
  },
  {
    id: 'rec-eva4-2026-09-20',
    date: '2026-09-20',
    machine: 'EVA 4',
    equipes: {
      'Équipe A': { paires: 590, defauts: 18 },
      'Équipe B': { paires: 630, defauts: 25 },
      'Équipe C': { paires: 610, defauts: 22 },
    },
    totalPaires: 1830,
    rebut: 75,
    deuxiemeChoix: 85,
    tauxNonConformitePct: 8.74,
    note: 'Ligne EVA 4 stabilisée avec bon rendement matière',
    updatedAt: '2026-09-20T22:45:00Z',
    enregistrePar: 'Chef Atelier EVA',
  },
];

