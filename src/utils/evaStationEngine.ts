import {
  EvaStationConfig,
  EvaStationMode,
  EvaMachineCalculation,
  EvaMachineOverallMode,
} from '../types/evaProductionLogic';

// STANDARD ARCHITECTURE EVA ROTATIVE :
// 6 stations par machine, 2 moules par station = 12 moules au total.
// 2 injecteurs matière par station (Injecteur A et Injecteur B).
// 1 moule standard = 2 paires par cycle.
// Capacité machine complète = 12 moules × 2 = 24 paires par cycle.
export const THEORETICAL_MAX_PAIRS_PER_CYCLE = 24;
export const TOTAL_STATIONS = 6;
export const MOULDS_PER_STATION = 2;
export const INJECTORS_PER_STATION = 2;
export const PAIRS_PER_MOULD_STANDARD = 2;

/**
 * Calcule dynamiquement les paires finales produites par une station donnée par cycle.
 * RÈGLES STRICTES :
 * - Si la station est OFF ou inactive : 0 paire.
 * - Ne JAMAIS faire "stations × 4" aveuglément !
 * - Mode 1 COULEUR :
 *     Chaque moule actif produit 2 paires complètes finies.
 *     1 moule actif = 2 paires/cycle.
 *     2 moules actifs = 4 paires/cycle.
 * - Mode BICOLOR :
 *     Production nécessitant semelle + coque/support avec les 2 injecteurs.
 *     Les 2 moules opèrent en synchronisation (moule semelle + moule coque/support)
 *     pour délivrer des paires bicolores complètes.
 *     2 moules actifs = 2 paires finales/cycle (et non 4, car 2 composants requis par paire).
 *     1 moule actif seul = 1 paire finale/cycle.
 */
export function calculateStationPairsPerCycle(
  station: Pick<EvaStationConfig, 'active' | 'productionMode' | 'mould1Active' | 'mould2Active'>
): number {
  if (!station.active || station.productionMode === 'inactif') {
    return 0;
  }

  const activeMoulds = (station.mould1Active ? 1 : 0) + (station.mould2Active ? 1 : 0);
  if (activeMoulds === 0) {
    return 0;
  }

  if (station.productionMode === '1_couleur') {
    // 1 Couleur : 2 paires par moule actif
    return activeMoulds * PAIRS_PER_MOULD_STANDARD;
  }

  if (station.productionMode === 'bicolor') {
    // Bicolor : assemblage semelle + coque/support via 2 injecteurs
    // 2 moules engagés = 2 paires finales finies par cycle (1 paire par ensemble semelle+coque)
    return activeMoulds === 2 ? 2 : 1;
  }

  return 0;
}

/**
 * Crée une configuration par défaut pour les 6 stations d'une machine EVA
 */
export function createDefaultEvaStationsConfig(machineCode = 'EVA 1'): EvaStationConfig[] {
  const defaultSizes = ['40-44', '40-44', '36-41', '36-41', '28-35', '28-35'];

  return Array.from({ length: TOTAL_STATIONS }, (_, i) => {
    const stationNum = i + 1;
    const baseConfig: EvaStationConfig = {
      stationNumber: stationNum,
      active: true, // ON par défaut
      productionMode: '1_couleur',
      mould1Active: true,
      mould2Active: true,
      injector1Color: 'Noir',
      injector2Color: 'Noir',
      modelId: 'NM',
      mouldReference: `M-NM-${defaultSizes[i]}-S${stationNum}`,
      pointure: defaultSizes[i],
      pairsPerCycle: 4, // 1 couleur avec 2 moules = 4 p/cycle
      notes: `Station ${stationNum} configurée pour ${machineCode}`,
    };
    baseConfig.pairsPerCycle = calculateStationPairsPerCycle(baseConfig);
    return baseConfig;
  });
}

/**
 * Calcule tous les indicateurs clés (KPIs), la capacité engagée et la cohérence compteur
 */
export function calculateEvaMachineKpis(
  stations: EvaStationConfig[],
  cycles = 0,
  actualProduction = 0
): EvaMachineCalculation {
  const activeStations = stations.filter((s) => s.active && s.productionMode !== 'inactif');
  const activeStationsCount = activeStations.length;

  let activeMouldsCount = 0;
  let engagedCapacityPerCycle = 0;
  let count1Couleur = 0;
  let countBicolor = 0;

  stations.forEach((s) => {
    if (s.active && s.productionMode !== 'inactif') {
      const mouldsInStation = (s.mould1Active ? 1 : 0) + (s.mould2Active ? 1 : 0);
      activeMouldsCount += mouldsInStation;
      const stationPairs = calculateStationPairsPerCycle(s);
      engagedCapacityPerCycle += stationPairs;

      if (s.productionMode === '1_couleur') count1Couleur++;
      if (s.productionMode === 'bicolor') countBicolor++;
    }
  });

  // Détermination du mode global de la machine
  let overallMode: EvaMachineOverallMode = 'arretee';
  if (activeStationsCount === 0) {
    overallMode = 'arretee';
  } else if (count1Couleur > 0 && countBicolor > 0) {
    overallMode = 'mixte';
  } else if (countBicolor > 0) {
    overallMode = 'bicolor';
  } else if (count1Couleur > 0) {
    overallMode = '1_couleur';
  }

  // Capacité théorique max de la machine = 24 paires/cycle
  const theoreticalCapacityPerCycle = THEORETICAL_MAX_PAIRS_PER_CYCLE;

  // Taux d'utilisation de la machine (%)
  const utilizationRatePercent = Math.min(
    100,
    Math.round((engagedCapacityPerCycle / theoreticalCapacityPerCycle) * 1000) / 10
  );

  // Production attendue = cycles × capacité engagée
  const expectedProductionPairs = Math.max(0, cycles) * engagedCapacityPerCycle;

  // Écart de production
  const variance = actualProduction > 0 ? actualProduction - expectedProductionPairs : 0;
  const variancePercent =
    expectedProductionPairs > 0
      ? Math.round((variance / expectedProductionPairs) * 1000) / 10
      : 0;

  // Cohérence compteur : tolérance industrielle de 5% pour purges/démarrages
  const tolerance = Math.max(12, Math.round(expectedProductionPairs * 0.05));
  const isConsistent = actualProduction === 0 || Math.abs(variance) <= tolerance;

  // Explication textuelle de l'analyse
  let explanation = '';
  if (activeStationsCount === 0) {
    explanation = 'Machine arrêtée : aucune station active (0 p/cycle).';
  } else if (overallMode === '1_couleur') {
    explanation = `Mode 1 Couleur complet : ${activeStationsCount}/6 stations actives (${activeMouldsCount}/12 moules) &rarr; ${engagedCapacityPerCycle} paires/cycle.`;
  } else if (overallMode === 'bicolor') {
    explanation = `Mode Bicolor complet : ${activeStationsCount}/6 stations actives avec 2 injecteurs (semelle + coque) &rarr; ${engagedCapacityPerCycle} paires finales/cycle.`;
  } else if (overallMode === 'mixte') {
    explanation = `Mode Mixte : ${count1Couleur} st. en 1-couleur + ${countBicolor} st. en Bicolor (${stations.length - activeStationsCount} st. arrêtées) &rarr; ${engagedCapacityPerCycle} paires engagées/cycle.`;
  }

  return {
    theoreticalCapacityPerCycle,
    engagedCapacityPerCycle,
    utilizationRatePercent,
    activeStationsCount,
    activeMouldsCount,
    overallMode,
    cycles,
    expectedProductionPairs,
    actualProductionPairs: actualProduction,
    variance,
    variancePercent,
    isConsistent,
    explanation,
  };
}

// PRÉRÉGLAGES INDUSTRIELS POUR LES OPÉRATEURS CTP
export interface EvaPreset {
  id: string;
  name: string;
  description: string;
  badge: string;
  color: string;
  apply: (baseStations: EvaStationConfig[]) => EvaStationConfig[];
}

export const EVA_PRESETS: EvaPreset[] = [
  {
    id: 'full-1-color',
    name: 'Plein Rendement 1-Couleur',
    description: '6 stations ON en 1 couleur, 12 moules actifs. 24 paires/cycle (100% capacité).',
    badge: '100% Débit (24 p/c)',
    color: 'bg-blue-600',
    apply: (stations) =>
      stations.map((s) => {
        const next: EvaStationConfig = {
          ...s,
          active: true,
          productionMode: '1_couleur',
          mould1Active: true,
          mould2Active: true,
          pairsPerCycle: 4,
          injector1Color: s.injector1Color || 'Noir',
          injector2Color: s.injector1Color || 'Noir',
        };
        next.pairsPerCycle = calculateStationPairsPerCycle(next);
        return next;
      }),
  },
  {
    id: 'full-bicolor',
    name: 'Ligne 100% Bicolor',
    description: '6 stations ON en Bicolor (semelle + coque/support). 12 paires finales/cycle (50% capacité brute).',
    badge: 'Bicolor Intégral (12 p/c)',
    color: 'bg-purple-600',
    apply: (stations) =>
      stations.map((s) => {
        const next: EvaStationConfig = {
          ...s,
          active: true,
          productionMode: 'bicolor',
          mould1Active: true,
          mould2Active: true,
          injector1Color: s.injector1Color || 'Noir',
          injector2Color: 'Blanc',
          pairsPerCycle: 2,
        };
        next.pairsPerCycle = calculateStationPairsPerCycle(next);
        return next;
      }),
  },
  {
    id: 'mixte-ctp',
    name: 'Configuration Mixte CTP',
    description: 'Stations 1 à 3 en 1 couleur (12 p/c), Stations 4 & 5 en Bicolor (4 p/c), Station 6 OFF. 16 paires/cycle (66.7%).',
    badge: 'Mixte Agile (16 p/c)',
    color: 'bg-amber-600',
    apply: (stations) =>
      stations.map((s) => {
        let next: EvaStationConfig;
        if (s.stationNumber <= 3) {
          // 1 Couleur : 3 st × 4 = 12 p/c
          next = {
            ...s,
            active: true,
            productionMode: '1_couleur',
            mould1Active: true,
            mould2Active: true,
            injector1Color: 'Noir',
            injector2Color: 'Noir',
          };
        } else if (s.stationNumber <= 5) {
          // Bicolor : 2 st × 2 = 4 p/c
          next = {
            ...s,
            active: true,
            productionMode: 'bicolor',
            mould1Active: true,
            mould2Active: true,
            injector1Color: 'Bleu Marine',
            injector2Color: 'Blanc',
          };
        } else {
          // Station 6 OFF
          next = {
            ...s,
            active: false,
            productionMode: 'inactif',
            mould1Active: false,
            mould2Active: false,
          };
        }
        next.pairsPerCycle = calculateStationPairsPerCycle(next);
        return next;
      }),
  },
  {
    id: 'maintenance-reduite',
    name: 'Allure Réduite / Maintenance',
    description: '2 stations ON en 1 couleur (St 1-2 = 8 p/c), Stations 3 à 6 arrêtées pour outillage. 33.3% capacité.',
    badge: 'Allure 8 p/c',
    color: 'bg-slate-700',
    apply: (stations) =>
      stations.map((s) => {
        const isRunning = s.stationNumber <= 2;
        const next: EvaStationConfig = {
          ...s,
          active: isRunning,
          productionMode: isRunning ? '1_couleur' : 'inactif',
          mould1Active: isRunning,
          mould2Active: isRunning,
        };
        next.pairsPerCycle = calculateStationPairsPerCycle(next);
        return next;
      }),
  },
];
