import { ProductionMaterial, ShoeModelItem, Machine } from '../types';

export interface ProductionCalculationInput {
  material: ProductionMaterial;
  model?: ShoeModelItem;
  machine?: Machine;
  moldsPerPlatform?: 1 | 2 | 4;
  pairsPerCycle?: number;
  isBicolor?: boolean;
  cycles?: number;
  rawProductionPairs?: number;
  rejectedPairs: number;
  targetPairs?: number;
  weightPerPairGrams?: number;
  startTime?: string; // 'HH:mm'
  endTime?: string; // 'HH:mm'
  downtimeMinutes?: number;
  pairsPerCarton?: number;
}

export interface ProductionCalculationResult {
  rawProduction: number; // Production brute en paires
  conforming: number; // Conforme en paires
  rejected: number; // Rejets en paires
  scrapRatePct: number; // Rejet % = Rejets / Production brute * 100
  conformanceRatePct: number; // Conformité % = Conforme / Production brute * 100
  variance: number; // Écart = Conforme - Objectif
  yieldPct: number; // Rendement % = Conforme / Objectif * 100
  materialConsumedKg: number; // Matière en kg
  bags25kgConsumed: number; // Sac matière = 25 kg
  durationMinutes: number; // Temps en minutes
  durationFormatted: string; // Temps en h/min (ex: "2h 30m")
  productivityPairsPerHour: number; // Productivité : paires/h
  // Conditionnement PVC
  cartonsCount: number; // Nombre de cartons pleins
  remainderPairs: number; // Paires restantes (carton partiel)
  totalCartonsNeeded: number; // Total cartons
}

/**
 * Calcul de la durée en minutes entre deux heures 'HH:mm'
 */
export function calculateDurationMinutes(startTime?: string, endTime?: string): number {
  if (!startTime || !endTime) return 120; // 2h par défaut
  const [h1, m1] = startTime.split(':').map(Number);
  const [h2, m2] = endTime.split(':').map(Number);
  if (isNaN(h1) || isNaN(m1) || isNaN(h2) || isNaN(m2)) return 120;

  let startTotal = h1 * 60 + m1;
  let endTotal = h2 * 60 + m2;
  if (endTotal < startTotal) {
    // Cas de chevauchement de minuit (ex: 22:00 -> 06:00)
    endTotal += 24 * 60;
  }
  return Math.max(1, endTotal - startTotal);
}

/**
 * Formatage de la durée en h et min
 */
export function formatDurationHoursMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m} min`;
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}

/**
 * Calcul dynamique selon Matière + Modèle + Machine + Configuration des moules
 * Règles strictes :
 * - Bicolor : Moule A + Couleur A + Moule B + Couleur B = 1 seule paire Bicolor.
 *   Ne jamais compter chaque moule comme une paire indépendante !
 * - PVC : Conforme -> Cartons calculés selon paires/carton.
 * - SOUMELLE : Stockage par pointure (18 à 45), pas de cartons.
 * - EVA : Architecture découplée, prête pour injection de règles futures.
 */
export function computeProductionMetrics(input: ProductionCalculationInput): ProductionCalculationResult {
  const {
    material,
    model,
    machine,
    isBicolor = false,
    rejectedPairs = 0,
    targetPairs = 120,
    weightPerPairGrams = model?.weightPerPairGrams || 300,
    startTime = '08:00',
    endTime = '10:00',
    downtimeMinutes = 0,
  } = input;

  // 1. Détermination du nombre de paires par cycle
  // Si Bicolor : l'association de 2 moules (ex: Moule A + Moule B) produit 1 seule paire !
  // Si Règle Compteur '1 = 1 pair' (Modèle NM, etc.) : 1 incrément machine = 1 paire
  let pairsPerCycle = input.pairsPerCycle;
  if (pairsPerCycle === undefined) {
    if (model?.counterRule === '1 = 1 pair' || model?.code?.toUpperCase() === 'NM') {
      pairsPerCycle = 1;
    } else if (model?.pairsPerCycle) {
      pairsPerCycle = model.pairsPerCycle;
    } else {
      const moldsPerPlat = input.moldsPerPlatform || model?.moldsPerPlatform || machine?.moldsPerPlatform || 2;
      if (isBicolor || model?.modelType === 'bicolor') {
        // En bicolor, 2 moules forment 1 paire
        pairsPerCycle = Math.max(1, Math.floor(moldsPerPlat / 2));
      } else {
        pairsPerCycle = moldsPerPlat * 2; // 2 paires par moule en moyenne
      }
    }
  }

  // 2. Production brute en paires
  let rawProduction = input.rawProductionPairs ?? 0;
  if (input.cycles !== undefined && input.cycles > 0) {
    // Calcul selon le nombre de cycles machine
    rawProduction = input.cycles * pairsPerCycle;
  }
  rawProduction = Math.max(0, Math.round(rawProduction));

  // 3. Conforme = Production brute − Rejets
  const safeRejects = Math.max(0, Math.min(rejectedPairs, rawProduction));
  const conforming = Math.max(0, rawProduction - safeRejects);

  // 4. Rejet % = Rejets / Production brute × 100
  const scrapRatePct = rawProduction > 0 ? Number(((safeRejects / rawProduction) * 100).toFixed(2)) : 0;

  // 5. Conformité % = Conforme / Production brute × 100
  const conformanceRatePct = rawProduction > 0 ? Number(((conforming / rawProduction) * 100).toFixed(2)) : 100;

  // 6. Écart = Conforme − Objectif
  const safeTarget = Math.max(1, targetPairs);
  const variance = conforming - safeTarget;

  // 7. Rendement % = Conforme / Objectif × 100
  const yieldPct = Number(((conforming / safeTarget) * 100).toFixed(1));

  // 8. Matière : kg et Sacs de 25 kg
  const materialConsumedKg = Number(((rawProduction * weightPerPairGrams) / 1000).toFixed(2));
  const bags25kgConsumed = Number((materialConsumedKg / 25).toFixed(2));

  // 9. Temps : h/min et Productivité : paires/h
  const totalDurationMin = calculateDurationMinutes(startTime, endTime);
  const netOperatingMinutes = Math.max(1, totalDurationMin - downtimeMinutes);
  const productivityPairsPerHour = Number(((conforming / (netOperatingMinutes / 60))).toFixed(1));
  const durationFormatted = formatDurationHoursMinutes(totalDurationMin);

  // 10. Conditionnement / Cartons (NM : 12 paires par carton pour toutes les pointures, carton_count = total_pairs / 12)
  const isNM = model?.code?.toUpperCase() === 'NM' || model?.name?.toUpperCase().startsWith('NM');
  const pPerCarton = input.pairsPerCarton || model?.pairsPerCarton || (isNM ? 12 : 24);
  const cartonsCount = Math.floor(conforming / pPerCarton);
  const remainderPairs = conforming % pPerCarton;
  const totalCartonsNeeded = remainderPairs > 0 ? cartonsCount + 1 : cartonsCount;

  return {
    rawProduction,
    conforming,
    rejected: safeRejects,
    scrapRatePct,
    conformanceRatePct,
    variance,
    yieldPct,
    materialConsumedKg,
    bags25kgConsumed,
    durationMinutes: totalDurationMin,
    durationFormatted,
    productivityPairsPerHour,
    cartonsCount,
    remainderPairs,
    totalCartonsNeeded,
  };
}

/**
 * Pointures disponibles standard pour la semelle (18 à 45)
 */
export const SOUMELLE_SIZES = Array.from({ length: 28 }, (_, i) => 18 + i); // 18, 19, 20, ..., 45

/**
 * Génère une répartition par pointure pour le modèle Soumelle
 */
export function createDefaultSoumelleSizeBreakdown(): Record<number, number> {
  const breakdown: Record<number, number> = {};
  for (const s of SOUMELLE_SIZES) {
    breakdown[s] = 0;
  }
  return breakdown;
}
