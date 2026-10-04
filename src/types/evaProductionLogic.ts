// Logique industrielle spécifique aux machines d'injection rotative EVA
// Machine EVA = 6 stations, chaque station contient 2 moules et 2 injecteurs matière.
// Capacité théorique max = 6 stations × 2 moules × 2 paires = 24 paires par cycle.

export type EvaStationMode = '1_couleur' | 'bicolor' | 'inactif';

export type EvaMachineOverallMode = '1_couleur' | 'bicolor' | 'mixte' | 'arretee';

export interface EvaStationConfig {
  stationNumber: number; // 1 à 6
  active: boolean; // État ON/OFF indépendant
  productionMode: EvaStationMode; // 1 couleur | Bicolor | Inactif
  mould1Active: boolean; // Moule A actif (standard = 2 paires base)
  mould2Active: boolean; // Moule B actif (standard = 2 paires base)
  injector1Color: string; // Injecteur Matière 1 (ex: Noir, Bleu, etc.)
  injector2Color: string; // Injecteur Matière 2 (ex: Blanc pour semelle/coque)
  modelId: string; // Ex: NM, CTP-SPORT
  mouldReference: string; // Ex: M-NM-40/44-S1
  pointure: string; // Ex: 40-44, 36-41
  pairsPerCycle: number; // Paires finales calculées pour cette station par cycle
  notes?: string;
}

export interface EvaMachineCalculation {
  theoreticalCapacityPerCycle: number; // Toujours 24 paires/cycle (12 moules × 2)
  engagedCapacityPerCycle: number; // Somme des paires/cycle des stations actives
  utilizationRatePercent: number; // (engagedCapacity / 24) * 100
  activeStationsCount: number; // 0 à 6
  activeMouldsCount: number; // 0 à 12
  overallMode: EvaMachineOverallMode; // 1_couleur, bicolor, mixte, arretee
  cycles: number; // Compteur fin - Compteur début
  expectedProductionPairs: number; // cycles * engagedCapacityPerCycle
  actualProductionPairs: number; // Paires déclarées / réalisées
  variance: number; // actual - expected
  variancePercent: number;
  isConsistent: boolean; // Écart conforme aux tolérances
  explanation: string;
}
