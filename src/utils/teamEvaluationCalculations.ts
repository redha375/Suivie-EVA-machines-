import { ProductionEntry } from '../types';

export interface TeamProductionMetrics {
  team: 'A' | 'B' | 'C';
  teamName: string;
  shiftLabel: string;
  leaderName: string;
  fichesCount: number;

  // 1. PRODUCTION
  cycles: number;
  pairesBrutes: number;
  pairesConformes: number;
  cartonsPleins: number;
  cartonsOuverts: number;
  productionParModele: {
    modele: string;
    paires: number;
    pourcentage: number;
  }[];
  productionParPointure: {
    pointure: string;
    paires: number;
    pourcentage: number;
  }[];
  productionParCouleur: {
    couleur: string;
    paires: number;
    pourcentage: number;
  }[];
  productionBicolor: {
    pairesBicolor: number;
    pairesMonochrome: number;
    pourcentageBicolor: number;
  };

  // 2. QUALITÉ
  secondChoix: number;
  troisiemeChoix: number;
  rebutRecuperable: number;
  rebutNonRecuperable: number;
  totalDefauts: number;
  tauxConformite: number; // in %
  tauxDefaut: number; // in %

  // 3. CONSOMMATION MATIÈRE
  matiereDetails: {
    matiere: 'EVA' | 'PVC' | 'Soumelle' | 'TPR';
    couleur: string;
    modele: string;
    pointure: string;
    poidsConsommeKg: number;
    pairesProduites: number;
    consoParPaireKg: number;
    consoParPaireGrammes: number;
    consoStandardKg: number;
    ecartMatiereKg: number;
    ecartMatierePourcentage: number;
    isOverThreshold: boolean;
  }[];
  poidsTotalConsommeKg: number;
  consoMoyenneKgParPaire: number;
  consoMoyenneGrammesParPaire: number;
  ecartGlobalKg: number;
  ecartGlobalPourcentage: number;
  hasOverConsumptionAlert: boolean;
  alertDetails: string[];

  // 4. RENDEMENT
  tempsProductionMinutes: number;
  tempsProductionHeures: number;
  tempsArretMinutes: number;
  tempsArretHeures: number;
  tempsChangementModeleMinutes: number;
  tempsMaintenanceMinutes: number;
  rendementHoraire: number; // Paires conformes / heure
  productionTheorique: number;
  efficaciteMachine: number; // %
}

export interface EvaluationFilterOptions {
  periodType: 'day' | 'week' | 'month' | 'all' | 'custom';
  selectedDate?: string; // YYYY-MM-DD
  startDate?: string;
  endDate?: string;
  selectedModel?: string; // ALL or specific
  selectedMachine?: string; // ALL or specific
  selectedMaterial?: string; // ALL or specific
  validatedOnly: boolean; // Default true (strictly fiches validées)
  overConsumptionThresholdPct: number; // Default 5.0%
}

// Standards matières par défaut (kg/paire) selon modèle et matière
export const STANDARD_WEIGHT_KG: Record<string, number> = {
  // Par modèle
  'SB23': 0.210, // 210g
  'SB23 Femme': 0.210,
  '003': 0.280, // 280g
  'CTP Sabot Médical Pro Light': 0.280,
  'Sabot Médical': 0.280,
  'Claquette': 0.240,
  'CTP Claquette Sport Wave 2-Tone': 0.240,
  'Sandale': 0.220,
  'CTP Sandale Plage Bicolore': 0.220,
  'Mule': 0.350,
  'CTP Mule Relax TPR Antidérapante': 0.350,
  'Bottine': 0.420,
  'CTP Chaussure Travail Souple PVC': 0.420,
  'Soumelle': 0.350,
  'CLICK 1': 0.260,
  'TANGO': 0.290,
  // Par matière générique (fallback)
  'EVA': 0.250,
  'PVC': 0.420,
  'SOUMELLE': 0.350,
  'TPR': 0.350,
};

/**
 * Identifier l'équipe (A, B ou C) d'une fiche de production
 */
export function getTeamFromEntry(entry: ProductionEntry): 'A' | 'B' | 'C' {
  if (entry.team) {
    const t = String(entry.team).trim().toUpperCase();
    if (t.includes('A')) return 'A';
    if (t.includes('B')) return 'B';
    if (t.includes('C')) return 'C';
  }
  if (entry.groupName) {
    const gn = entry.groupName.toUpperCase();
    if (gn.includes('A')) return 'A';
    if (gn.includes('B')) return 'B';
    if (gn.includes('C')) return 'C';
  }
  if (entry.shift === 'matin') return 'A';
  if (entry.shift === 'soir') return 'B';
  if (entry.shift === 'nuit') return 'C';
  return 'A';
}

/**
 * Récupérer le poids standard théorique en kg pour un modèle/matière
 */
export function getStandardWeight(modelName: string, material?: string): number {
  if (!modelName && !material) return 0.250;
  for (const [key, val] of Object.entries(STANDARD_WEIGHT_KG)) {
    if (modelName && modelName.toLowerCase().includes(key.toLowerCase())) {
      return val;
    }
  }
  const matUpper = (material || 'EVA').toUpperCase();
  return STANDARD_WEIGHT_KG[matUpper] || 0.250;
}

/**
 * Filtrer les fiches de production selon les critères
 */
export function filterProductionEntries(
  entries: ProductionEntry[],
  filters: EvaluationFilterOptions
): ProductionEntry[] {
  return entries.filter((entry) => {
    // 1. Règle fondamentale : fiches validées par le chef d'atelier
    if (filters.validatedOnly && !entry.verifiedByChef) {
      return false;
    }

    // 2. Filtre de modèle
    if (filters.selectedModel && filters.selectedModel !== 'ALL') {
      const entryModel = (entry.modelName || entry.modelId || '').toLowerCase();
      if (!entryModel.includes(filters.selectedModel.toLowerCase())) {
        return false;
      }
    }

    // 3. Filtre de machine
    if (filters.selectedMachine && filters.selectedMachine !== 'ALL') {
      if (entry.machineId !== filters.selectedMachine && entry.machineCode !== filters.selectedMachine) {
        return false;
      }
    }

    // 4. Filtre de matière
    if (filters.selectedMaterial && filters.selectedMaterial !== 'ALL') {
      const entryMat = (entry.rawMaterialType || entry.material || '').toString().toUpperCase();
      if (!entryMat.includes(filters.selectedMaterial.toUpperCase())) {
        return false;
      }
    }

    // 5. Filtre de date / période
    const entryDate = entry.date;
    if (!entryDate) return true;

    if (filters.periodType === 'day') {
      const targetDay = filters.selectedDate || new Date().toISOString().substring(0, 10);
      return entryDate === targetDay;
    }

    if (filters.periodType === 'custom') {
      if (filters.startDate && entryDate < filters.startDate) return false;
      if (filters.endDate && entryDate > filters.endDate) return false;
      return true;
    }

    if (filters.periodType === 'week') {
      // 7 derniers jours par défaut ou semaine courante
      const refDate = filters.selectedDate ? new Date(filters.selectedDate) : new Date();
      const oneWeekAgo = new Date(refDate);
      oneWeekAgo.setDate(refDate.getDate() - 7);
      const minDateStr = oneWeekAgo.toISOString().substring(0, 10);
      const maxDateStr = refDate.toISOString().substring(0, 10);
      return entryDate >= minDateStr && entryDate <= maxDateStr;
    }

    if (filters.periodType === 'month') {
      // Mois de la date sélectionnée (YYYY-MM)
      const targetMonth = (filters.selectedDate || new Date().toISOString().substring(0, 10)).substring(0, 7);
      return entryDate.startsWith(targetMonth);
    }

    return true; // 'all'
  });
}

/**
 * Calculer l'évaluation complète pour une équipe spécifique
 */
export function calculateTeamMetrics(
  team: 'A' | 'B' | 'C',
  entries: ProductionEntry[],
  thresholdPct: number = 5.0
): TeamProductionMetrics {
  const teamEntries = entries.filter((e) => getTeamFromEntry(e) === team);

  const teamName = team === 'A' ? 'Équipe A' : team === 'B' ? 'Équipe B' : 'Équipe C';
  const shiftLabel = team === 'A' ? 'Poste Matin (06h - 14h)' : team === 'B' ? 'Poste Soir (14h - 22h)' : 'Poste Nuit (22h - 06h)';
  const leaderName = team === 'A' ? 'Youcef Belkacem' : team === 'B' ? 'Farid Kaci' : 'Malik Bouzid';

  // 1. PRODUCTION ACCUMULATORS
  let totalCycles = 0;
  let totalPairesBrutes = 0;
  let totalSecondChoix = 0;
  let totalTroisiemeChoix = 0;
  let totalRebutRecuperable = 0;
  let totalRebutNonRecuperable = 0;
  let totalCartonsPleins = 0;
  let totalCartonsOuverts = 0;

  const modelMap: Record<string, number> = {};
  const sizeMap: Record<string, number> = {};
  const colorMap: Record<string, number> = {};
  let pairesBicolor = 0;
  let pairesMonochrome = 0;

  // 3. MATIÈRE ACCUMULATORS
  const matiereDetailsList: TeamProductionMetrics['matiereDetails'] = [];
  let totalMatiereKg = 0;
  let totalStandardWeightKg = 0;
  const alertDetails: string[] = [];

  // 4. RENDEMENT ACCUMULATORS
  let totalProdMinutes = 0;
  let totalArretMinutes = 0;
  let totalChgModeleMinutes = 0;
  let totalMaintenanceMinutes = 0;
  let totalCapaciteTheorique = 0;

  teamEntries.forEach((entry) => {
    // Calcul Cycles = Compteur sortie - Compteur entrée
    let entryCycles = 0;
    if (entry.counterEnd !== undefined && entry.counterStart !== undefined && entry.counterEnd >= entry.counterStart) {
      entryCycles = entry.counterEnd - entry.counterStart;
    } else if (entry.cycles !== undefined && entry.cycles > 0) {
      entryCycles = entry.cycles;
    } else if (entry.cyclesCount !== undefined && entry.cyclesCount > 0) {
      entryCycles = entry.cyclesCount;
    } else {
      entryCycles = Math.round(entry.qtyProduced / (entry.pairsPerCycle || 1));
    }
    totalCycles += entryCycles;

    // Paires brutes = Cycles × Paires par cycle (ou qtyProduced)
    const pairsPerCycle = entry.pairsPerCycle || (entry.qtyProduced && entryCycles > 0 ? Math.round(entry.qtyProduced / entryCycles) : 1) || 1;
    const pairesBrutes = entry.qtyProduced > 0 ? entry.qtyProduced : entryCycles * pairsPerCycle;
    totalPairesBrutes += pairesBrutes;

    // Décomposition des défauts
    const secondChoice = entry.secondChoicePairs || entry.qtySecondChoice || 0;
    const thirdChoice = entry.thirdChoicePairs || entry.qtyThirdChoice || 0;

    // Rebut non récupérable (rebut définitif)
    const nonRecup = entry.rebutNonRecuperable !== undefined
      ? entry.rebutNonRecuperable
      : Math.max(0, (entry.qtyRejected || 0) - (entry.rebutRecuperable || 0));

    // Rebut récupérable (broyable / réinjectable - suivi sans double décompte)
    const recup = entry.rebutRecuperable !== undefined
      ? entry.rebutRecuperable
      : (entry.qtyRejected && entry.qtyRejected > nonRecup ? entry.qtyRejected - nonRecup : 0);

    totalSecondChoix += secondChoice;
    totalTroisiemeChoix += thirdChoice;
    totalRebutNonRecuperable += nonRecup;
    totalRebutRecuperable += recup;

    // Paires conformes de cette fiche = Paires brutes - 2ème choix - 3ème choix - Rebut non récupérable
    const pairesConformesEntry = Math.max(0, pairesBrutes - secondChoice - thirdChoice - nonRecup);

    // Cartons pleins & cartons ouverts
    const pairesParCarton = entry.pairsPerCarton || 12;
    const ctnPleins = entry.cartonsCount !== undefined
      ? entry.cartonsCount
      : (entry.packagingCartonsCount || Math.floor(pairesConformesEntry / pairesParCarton));
    const ctnOuverts = entry.loosePairs !== undefined
      ? entry.loosePairs
      : (entry.openCartonsCount !== undefined ? entry.openCartonsCount : pairesConformesEntry % pairesParCarton);

    totalCartonsPleins += ctnPleins;
    totalCartonsOuverts += ctnOuverts;

    // Modèle
    const modelName = entry.modelName || 'Modèle CTP Standard';
    modelMap[modelName] = (modelMap[modelName] || 0) + pairesConformesEntry;

    // Pointure
    const pointureStr = entry.pointure || (entry.size ? String(entry.size) : '39/44');
    sizeMap[pointureStr] = (sizeMap[pointureStr] || 0) + pairesConformesEntry;

    // Couleur
    const colorStr = entry.color1 || entry.color || 'Standard';
    colorMap[colorStr] = (colorMap[colorStr] || 0) + pairesConformesEntry;

    // Bicolor
    const isBicolor = entry.isBicolor || (entry.color2 && entry.color2.trim() !== '' && entry.color2 !== entry.color1);
    if (isBicolor) {
      pairesBicolor += pairesConformesEntry;
    } else {
      pairesMonochrome += pairesConformesEntry;
    }

    // Matière
    const rawMat = (entry.rawMaterialType || entry.material || 'EVA') as 'EVA' | 'PVC' | 'Soumelle' | 'TPR';
    const weightKg = entry.materialConsumedKg || (entry.bags25kgConsumed ? entry.bags25kgConsumed * 25 : 0) || (pairesBrutes * 0.25);
    totalMatiereKg += weightKg;

    const stdKgPerPair = entry.standardWeightKgPerPair || getStandardWeight(modelName, rawMat);
    const standardTotalForEntry = pairesBrutes * stdKgPerPair;
    totalStandardWeightKg += standardTotalForEntry;

    const entryConsoParPaireKg = pairesBrutes > 0 ? weightKg / pairesBrutes : stdKgPerPair;
    const ecartKgEntry = weightKg - standardTotalForEntry;
    const ecartPctEntry = standardTotalForEntry > 0 ? (ecartKgEntry / standardTotalForEntry) * 100 : 0;
    const isOver = ecartPctEntry > thresholdPct;

    if (isOver) {
      alertDetails.push(
        `${entry.date} - ${modelName} (${pointureStr}) : +${ecartKgEntry.toFixed(1)} kg (+${ecartPctEntry.toFixed(1)}% vs standard)`
      );
    }

    matiereDetailsList.push({
      matiere: rawMat,
      couleur: colorStr,
      modele: modelName,
      pointure: pointureStr,
      poidsConsommeKg: Number(weightKg.toFixed(2)),
      pairesProduites: pairesBrutes,
      consoParPaireKg: Number(entryConsoParPaireKg.toFixed(4)),
      consoParPaireGrammes: Math.round(entryConsoParPaireKg * 1000),
      consoStandardKg: Number(stdKgPerPair.toFixed(4)),
      ecartMatiereKg: Number(ecartKgEntry.toFixed(2)),
      ecartMatierePourcentage: Number(ecartPctEntry.toFixed(1)),
      isOverThreshold: isOver,
    });

    // Temps & Rendement
    let durationMin = entry.durationMinutes;
    if (!durationMin && entry.prodHours) {
      durationMin = Math.round(entry.prodHours * 60);
    } else if (!durationMin && entry.startTime && entry.endTime) {
      try {
        const [sh, sm] = entry.startTime.split(':').map(Number);
        const [eh, em] = entry.endTime.split(':').map(Number);
        let diff = (eh * 60 + em) - (sh * 60 + sm);
        if (diff < 0) diff += 24 * 60; // nuit
        durationMin = diff;
      } catch {
        durationMin = 420; // 7h
      }
    }
    durationMin = durationMin || 420; // default poste 7h net
    totalProdMinutes += durationMin;

    const arretMin = entry.downtimeMinutes || 0;
    totalArretMinutes += arretMin;

    const chgModMin = entry.downtimeChangeModelMinutes || (entry.downtimeReason?.toLowerCase().includes('moule') ? arretMin : 0);
    const maintMin = entry.downtimeMaintenanceMinutes || (entry.downtimeReason?.toLowerCase().includes('nettoyage') || entry.downtimeReason?.toLowerCase().includes('purge') || entry.downtimeReason?.toLowerCase().includes('défaut') ? arretMin : 0);
    totalChgModeleMinutes += chgModMin;
    totalMaintenanceMinutes += maintMin;

    // Capacité théorique (nominale: ~60 paires / heure standard atelier)
    const nominalHourly = entry.theoreticalHourlyCapacity || 65;
    totalCapaciteTheorique += Math.round((durationMin / 60) * nominalHourly);
  });

  // Calcul Paires conformes globales = Paires brutes - 2ème choix - 3ème choix - Rebut non récupérable
  const pairesConformes = Math.max(0, totalPairesBrutes - totalSecondChoix - totalTroisiemeChoix - totalRebutNonRecuperable);

  // Qualité Taux
  const totalDefauts = totalSecondChoix + totalTroisiemeChoix + totalRebutNonRecuperable;
  const tauxConformite = totalPairesBrutes > 0 ? (pairesConformes / totalPairesBrutes) * 100 : 100;
  const tauxDefaut = totalPairesBrutes > 0 ? (totalDefauts / totalPairesBrutes) * 100 : 0;

  // Matière globales
  const consoMoyenneKgParPaire = totalPairesBrutes > 0 ? totalMatiereKg / totalPairesBrutes : 0;
  const ecartGlobalKg = totalMatiereKg - totalStandardWeightKg;
  const ecartGlobalPourcentage = totalStandardWeightKg > 0 ? (ecartGlobalKg / totalStandardWeightKg) * 100 : 0;
  const hasOverConsumptionAlert = ecartGlobalPourcentage > thresholdPct;

  // Rendement global
  const tempsProductionHeures = Number((totalProdMinutes / 60).toFixed(2));
  const tempsArretHeures = Number((totalArretMinutes / 60).toFixed(2));
  const rendementHoraire = tempsProductionHeures > 0 ? Number((pairesConformes / tempsProductionHeures).toFixed(1)) : 0;
  const efficaciteMachine = totalCapaciteTheorique > 0 ? Number(((pairesConformes / totalCapaciteTheorique) * 100).toFixed(1)) : 0;

  // Formattage listes de distribution
  const productionParModele = Object.entries(modelMap)
    .map(([modele, paires]) => ({
      modele,
      paires,
      pourcentage: pairesConformes > 0 ? Number(((paires / pairesConformes) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.paires - a.paires);

  const productionParPointure = Object.entries(sizeMap)
    .map(([pointure, paires]) => ({
      pointure,
      paires,
      pourcentage: pairesConformes > 0 ? Number(((paires / pairesConformes) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.paires - a.paires);

  const productionParCouleur = Object.entries(colorMap)
    .map(([couleur, paires]) => ({
      couleur,
      paires,
      pourcentage: pairesConformes > 0 ? Number(((paires / pairesConformes) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.paires - a.paires);

  const totalBicolorCompare = pairesBicolor + pairesMonochrome;
  const pourcentageBicolor = totalBicolorCompare > 0 ? Number(((pairesBicolor / totalBicolorCompare) * 100).toFixed(1)) : 0;

  return {
    team,
    teamName,
    shiftLabel,
    leaderName,
    fichesCount: teamEntries.length,

    // 1. PRODUCTION
    cycles: totalCycles,
    pairesBrutes: totalPairesBrutes,
    pairesConformes,
    cartonsPleins: totalCartonsPleins,
    cartonsOuverts: totalCartonsOuverts,
    productionParModele,
    productionParPointure,
    productionParCouleur,
    productionBicolor: {
      pairesBicolor,
      pairesMonochrome,
      pourcentageBicolor,
    },

    // 2. QUALITÉ
    secondChoix: totalSecondChoix,
    troisiemeChoix: totalTroisiemeChoix,
    rebutRecuperable: totalRebutRecuperable,
    rebutNonRecuperable: totalRebutNonRecuperable,
    totalDefauts,
    tauxConformite: Number(tauxConformite.toFixed(2)),
    tauxDefaut: Number(tauxDefaut.toFixed(2)),

    // 3. CONSOMMATION MATIÈRE
    matiereDetails: matiereDetailsList,
    poidsTotalConsommeKg: Number(totalMatiereKg.toFixed(2)),
    consoMoyenneKgParPaire: Number(consoMoyenneKgParPaire.toFixed(4)),
    consoMoyenneGrammesParPaire: Math.round(consoMoyenneKgParPaire * 1000),
    ecartGlobalKg: Number(ecartGlobalKg.toFixed(2)),
    ecartGlobalPourcentage: Number(ecartGlobalPourcentage.toFixed(1)),
    hasOverConsumptionAlert,
    alertDetails,

    // 4. RENDEMENT
    tempsProductionMinutes: totalProdMinutes,
    tempsProductionHeures,
    tempsArretMinutes: totalArretMinutes,
    tempsArretHeures,
    tempsChangementModeleMinutes: totalChgModeleMinutes,
    tempsMaintenanceMinutes: totalMaintenanceMinutes,
    rendementHoraire,
    productionTheorique: totalCapaciteTheorique,
    efficaciteMachine,
  };
}

/**
 * Calculer l'évaluation pour l'ensemble des équipes A, B et C
 */
export function calculateAllTeamsEvaluation(
  entries: ProductionEntry[],
  filters: EvaluationFilterOptions
): {
  filteredEntries: ProductionEntry[];
  totalValidatedCount: number;
  totalUnvalidatedCount: number;
  teamA: TeamProductionMetrics;
  teamB: TeamProductionMetrics;
  teamC: TeamProductionMetrics;
  usineTotal: {
    cycles: number;
    pairesBrutes: number;
    pairesConformes: number;
    cartonsPleins: number;
    cartonsOuverts: number;
    tauxConformiteMoyen: number;
    tauxDefautMoyen: number;
    matiereTotalKg: number;
    consoMoyenneKgParPaire: number;
    rendementHoraireMoyen: number;
    tempsArretTotalMinutes: number;
  };
} {
  const totalValidatedCount = entries.filter((e) => e.verifiedByChef).length;
  const totalUnvalidatedCount = entries.length - totalValidatedCount;

  const filteredEntries = filterProductionEntries(entries, filters);

  const teamA = calculateTeamMetrics('A', filteredEntries, filters.overConsumptionThresholdPct);
  const teamB = calculateTeamMetrics('B', filteredEntries, filters.overConsumptionThresholdPct);
  const teamC = calculateTeamMetrics('C', filteredEntries, filters.overConsumptionThresholdPct);

  const totalCycles = teamA.cycles + teamB.cycles + teamC.cycles;
  const totalPairesBrutes = teamA.pairesBrutes + teamB.pairesBrutes + teamC.pairesBrutes;
  const totalPairesConformes = teamA.pairesConformes + teamB.pairesConformes + teamC.pairesConformes;
  const totalCartonsPleins = teamA.cartonsPleins + teamB.cartonsPleins + teamC.cartonsPleins;
  const totalCartonsOuverts = teamA.cartonsOuverts + teamB.cartonsOuverts + teamC.cartonsOuverts;
  const totalMatiereKg = teamA.poidsTotalConsommeKg + teamB.poidsTotalConsommeKg + teamC.poidsTotalConsommeKg;
  const totalProdHeures = teamA.tempsProductionHeures + teamB.tempsProductionHeures + teamC.tempsProductionHeures;

  const totalDefauts = (teamA.pairesBrutes - teamA.pairesConformes) +
    (teamB.pairesBrutes - teamB.pairesConformes) +
    (teamC.pairesBrutes - teamC.pairesConformes);

  const tauxConformiteMoyen = totalPairesBrutes > 0 ? Number(((totalPairesConformes / totalPairesBrutes) * 100).toFixed(2)) : 100;
  const tauxDefautMoyen = totalPairesBrutes > 0 ? Number(((totalDefauts / totalPairesBrutes) * 100).toFixed(2)) : 0;
  const consoMoyenneKgParPaire = totalPairesBrutes > 0 ? Number((totalMatiereKg / totalPairesBrutes).toFixed(4)) : 0;
  const rendementHoraireMoyen = totalProdHeures > 0 ? Number((totalPairesConformes / totalProdHeures).toFixed(1)) : 0;
  const tempsArretTotalMinutes = teamA.tempsArretMinutes + teamB.tempsArretMinutes + teamC.tempsArretMinutes;

  return {
    filteredEntries,
    totalValidatedCount,
    totalUnvalidatedCount,
    teamA,
    teamB,
    teamC,
    usineTotal: {
      cycles: totalCycles,
      pairesBrutes: totalPairesBrutes,
      pairesConformes: totalPairesConformes,
      cartonsPleins: totalCartonsPleins,
      cartonsOuverts: totalCartonsOuverts,
      tauxConformiteMoyen,
      tauxDefautMoyen,
      matiereTotalKg: Number(totalMatiereKg.toFixed(2)),
      consoMoyenneKgParPaire,
      rendementHoraireMoyen,
      tempsArretTotalMinutes,
    },
  };
}
