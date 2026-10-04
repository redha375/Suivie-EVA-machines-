// =========================================================================
// TYPES POUR LE SYSTÈME DE PILOTAGE INDUSTRIEL « MACHINE EVA » (12 STATIONS)
// Gère EVA 1, EVA 2, EVA 3, EVA 4 avec 12 stations indépendantes
// =========================================================================

export type EvaMachineCode = 'EVA 1' | 'EVA 2' | 'EVA 3' | 'EVA 4';

export type EvaStationStatus = 'ACTIVE' | 'ARRETEE' | 'VIDE' | 'MAINTENANCE';

export type MoldPairsConfig = 1 | 2 | 4; // 1, 2 ou 4 paires / cycle

export type ShiftTeam = 'Équipe A' | 'Équipe B' | 'Équipe C';

export interface EvaStationRecord {
  stationNumber: number; // 1 à 12
  status: EvaStationStatus;
  modele: string; // ex: 'NM', 'BC07', 'SB101'
  designation: string; // ex: 'Homme', 'Femme', 'Kadet', 'Enfant'
  referenceMoule: string; // ex: 'M-EVA-01'
  pointure: string; // ex: '40-44', '36-41', '28-35'
  couleur1: string; // Couleur principale (ex: 'Noir Mat')
  couleur2?: string; // Couleur secondaire si bicolor (ex: 'Blanc Pur')
  isBicolor: boolean;
  pairsPerCycle: MoldPairsConfig; // 1, 2 ou 4 paires par cycle
  compteurDebut: number;
  compteurFin: number;
  // Calculs auto
  cycles: number; // Math.max(0, compteurFin - compteurDebut)
  pairesBrutes: number; // cycles * pairsPerCycle
  rebutPaires: number;
  pairesNettes: number; // pairesBrutes - rebutPaires
  pairesParCarton: number; // Base conditionnement (ex: 12 ou 16)
  cartonsPleins: number; // Math.floor(pairesNettes / pairesParCarton)
  reliquatPaires: number; // pairesNettes % pairesParCarton
  // Arrêt & Maintenance
  arretMinutes: number;
  arretCause?: string;
  arretResponsable?: string;
  // Anomalies
  anomalies: string[];
}

export interface EvaMachineSessionState {
  machineCode: EvaMachineCode;
  date: string;
  heure: string;
  equipe: ShiftTeam;
  operateur: string;
  compteurGlobalDebut: number;
  compteurGlobalFin: number;
  objectifPaires: number; // Objectif de poste (ex: 1800 paires)
  poidsMoyenPaireGrammes: number; // ex: 280g
  stations: EvaStationRecord[];
  // Synthèse calculée
  totalStationsActives: number;
  totalStationsArretees: number;
  totalStationsVides: number;
  totalStationsMaintenance: number;
  capaciteEngageePairesParCycle: number; // Somme des pairsPerCycle des stations ACTIVE
  cyclesMachine: number;
  productionBruteTotale: number;
  rebutTotal: number;
  tauxRebutPct: number;
  productionNetteTotale: number;
  tauxConformitePct: number;
  totalCartonsPleins: number;
  totalPairesOuvertes: number;
  matiereConsommeeKg: number;
  sacs25kgConsommes: number;
  rendementMatierePct: number;
  tempsProductifMinutes: number;
  tempsArretTotalMinutes: number;
  tauxEfficiencePct: number; // (Production réelle / Objectif) * 100
  anomaliesDetectees: string[];
}

export interface EvaArretRecord {
  id: string;
  machineCode: EvaMachineCode;
  stationNumber?: number | 'Toutes';
  date: string;
  heureDebut: string;
  dureeMinutes: number;
  cause: 'Moule' | 'Mécanique' | 'Matière' | 'Électrique' | 'Opérateur' | 'Changement Série' | 'Pause' | 'Autre';
  responsable: string;
  description: string;
  resolu: boolean;
}

export interface EvaQualityCheck {
  id: string;
  machineCode: EvaMachineCode;
  stationNumber: number;
  modele: string;
  pointure: string;
  date: string;
  heure: string;
  inspecteur: string;
  defautsDetectes: {
    bavures: number;
    retassures: number;
    bulles: number;
    nonConformeCouleur: number;
    erreurPointure: number;
  };
  totalControle: number;
  conforme: boolean;
  actionCorrective?: string;
}

export interface EvaAuditLogEntry {
  id: string;
  date: string;
  heure: string;
  utilisateur: string;
  machineCode: EvaMachineCode;
  action: string;
  stationNumber?: number;
  champModifie: string;
  ancienneValeur: any;
  nouvelleValeur: any;
  details: string;
}

// =========================================================================
// TYPES POUR LE FORMULAIRE DE SAISIE JOURNALIÈRE & CLASSEMENT (CTP SMART)
// Formule : Score Global = Paires - (Défauts * 10)
// =========================================================================

export interface TeamProductionData {
  paires: number;
  defauts: number;
  scoreGlobal?: number;
  rang?: number;
}

export interface EvaDailyProductionRecord {
  id: string;
  date: string; // YYYY-MM-DD
  machine: EvaMachineCode; // 'EVA 1' | 'EVA 2' | 'EVA 3' | 'EVA 4'
  equipes: {
    'Équipe A': TeamProductionData;
    'Équipe B': TeamProductionData;
    'Équipe C': TeamProductionData;
  };
  totalPaires: number;
  rebut: number;
  deuxiemeChoix: number;
  tauxNonConformitePct: number; // ((rebut + 2eme) / total) * 100
  note?: string;
  updatedAt: string;
  enregistrePar?: string;
}

