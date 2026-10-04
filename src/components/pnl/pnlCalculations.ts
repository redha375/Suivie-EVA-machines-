import {
  SaleOrder,
  PurchaseOrder,
  ExpenseRecord,
  CategoryBudget,
  CashFlowMovement,
  ProductionEntry,
  StockItem,
  QualityRecord,
  PnlPeriodFilter,
} from '../../types';

export interface PnlSummaryMetrics {
  revenue: number; // Chiffre d'affaires (CA)
  rawMaterialCost: number; // Coût des matières premières
  productionCost: number; // Coût de production
  totalExpenses: number; // Total dépenses
  grossMargin: number; // Marge brute = CA - Coût matière/production directe
  grossMarginRate: number; // Taux de marge %
  operatingResult: number; // Résultat opérationnel (EBIT)
  netResult: number; // Résultat net de gestion
  receivables: number; // Créances clients
  payables: number; // Dettes fournisseurs
  stockValue: number; // Valeur du stock total
  dormantStockValue: number; // Valeur du stock dormant
  pairsProducedGross: number; // Production brute
  pairsProducedNet: number; // Production nette
  scrapQuantity: number; // Rebut
  scrapRate: number; // Taux rebut %
  secondChoiceQuantity: number; // 2ème qualité
  costPerPair: number; // Coût de production par paire
  estimatedScrapLossValue: number; // Valeur estimée perte rebut
}

export interface ModelProfitabilityItem {
  modelName: string;
  category?: string;
  qtyProduced: number;
  qtySold: number;
  costPerPair: number;
  avgSellingPrice: number;
  unitMargin: number;
  totalMargin: number;
  marginPercent: number;
  status: 'tres_rentable' | 'rentable' | 'marge_faible';
}

export interface FinancialAlertItem {
  id: string;
  type: 'danger' | 'warning' | 'success';
  title: string;
  message: string;
  metric?: string;
}

// Helper to filter dates
export function isDateInPeriod(
  dateStr: string,
  period: PnlPeriodFilter,
  referenceDate = '2026-09-06',
  customStart?: string,
  customEnd?: string
): boolean {
  if (!dateStr) return false;
  const d = dateStr.substring(0, 10);

  if (period === 'today' || period === 'jour') {
    return d === referenceDate;
  }
  if (period === 'week' || period === 'semaine') {
    // 7 days up to referenceDate
    const ref = new Date(referenceDate);
    const target = new Date(d);
    const diffDays = (ref.getTime() - target.getTime()) / (1000 * 3600 * 24);
    return diffDays >= 0 && diffDays <= 7;
  }
  if (period === 'month' || period === 'mois') {
    // Same month or within 30 days
    const ref = new Date(referenceDate);
    const target = new Date(d);
    return (
      (ref.getFullYear() === target.getFullYear() && ref.getMonth() === target.getMonth()) ||
      Math.abs((ref.getTime() - target.getTime()) / (1000 * 3600 * 24)) <= 31
    );
  }
  if (period === 'year' || period === 'annee') {
    const refYear = referenceDate.substring(0, 4);
    return d.startsWith(refYear);
  }
  if ((period === 'custom' || period === 'personnalise') && customStart && customEnd) {
    return d >= customStart && d <= customEnd;
  }
  return true;
}

// Previous period helper for comparison (+% / -%)
export function isDateInPreviousPeriod(
  dateStr: string,
  period: PnlPeriodFilter,
  referenceDate = '2026-09-06'
): boolean {
  if (!dateStr) return false;
  const d = dateStr.substring(0, 10);
  const ref = new Date(referenceDate);

  if (period === 'today' || period === 'jour') {
    const yesterday = new Date(ref);
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().substring(0, 10);
    return d === yStr;
  }
  if (period === 'week' || period === 'semaine') {
    const target = new Date(d);
    const diffDays = (ref.getTime() - target.getTime()) / (1000 * 3600 * 24);
    return diffDays > 7 && diffDays <= 14;
  }
  if (period === 'month' || period === 'mois') {
    const target = new Date(d);
    const diffDays = (ref.getTime() - target.getTime()) / (1000 * 3600 * 24);
    return diffDays > 30 && diffDays <= 60;
  }
  if (period === 'year' || period === 'annee') {
    const prevYear = (parseInt(referenceDate.substring(0, 4), 10) - 1).toString();
    return d.startsWith(prevYear);
  }
  return false;
}

// Average unit prices for stock evaluation (DZD)
export const ESTIMATED_STOCK_PRICES: Record<string, number> = {
  matiere_premiere: 280, // ~280 DA / kg
  produit_fini: 650, // ~650 DA / paire
  colorant: 850, // ~850 DA / kg
  additif: 620, // ~620 DA / kg
  piece_rechange: 3500, // ~3,500 DA / unité
};

export function calculatePnlMetrics(
  sales: SaleOrder[],
  purchases: PurchaseOrder[],
  expenses: ExpenseRecord[],
  productionEntries: ProductionEntry[],
  stockItems: StockItem[],
  period: PnlPeriodFilter,
  isPreviousPeriod = false,
  customStart?: string,
  customEnd?: string,
  referenceDate = '2026-09-06'
): PnlSummaryMetrics {
  // Filter by period
  const filterFn = (dateStr: string) =>
    isPreviousPeriod
      ? isDateInPreviousPeriod(dateStr, period, referenceDate)
      : isDateInPeriod(dateStr, period, referenceDate, customStart, customEnd);

  const filteredSales = sales.filter((s) => filterFn(s.date));
  const filteredPurchases = purchases.filter((p) => filterFn(p.date));
  const filteredExpenses = expenses.filter((e) => filterFn(e.date));
  const filteredProd = productionEntries.filter((p) => filterFn(p.date));

  // 1. Chiffre d'affaires (CA)
  const revenue = filteredSales.reduce((acc, s) => acc + (s.total || 0), 0);

  // 2. Production counts
  const pairsProducedGross = filteredProd.reduce(
    (acc, p) => acc + (p.qtyProduced || p.pairsProduced || (p.cycles ? p.cycles * 2 : 0) || (p.cyclesCount ? p.cyclesCount * 2 : 0) || 0),
    0
  );
  const pairsProducedNet = filteredProd.reduce(
    (acc, p) => acc + (p.qtyConforming !== undefined ? p.qtyConforming : (p.qtyProduced || p.pairsProduced || 0)),
    0
  );
  const scrapQuantity = filteredProd.reduce((acc, p) => acc + (p.qtyRejected || 0), 0);
  const secondChoiceQuantity = filteredProd.reduce(
    (acc, p) => acc + (p.secondChoicePairs || p.qtySecondChoice || 0),
    0
  );
  const scrapRate = pairsProducedGross > 0 ? (scrapQuantity / pairsProducedGross) * 100 : 0;

  // 3. Coût matière réelle
  // From production material consumption: kg consumed * avg price (280 DA/kg)
  const totalMaterialKgConsumed = filteredProd.reduce((acc, p) => acc + (p.materialConsumedKg || 0), 0);
  // Average material price from actual purchases or default 280 DA/kg
  const avgMaterialPrice = 280;
  const rawMaterialCost = totalMaterialKgConsumed > 0 ? totalMaterialKgConsumed * avgMaterialPrice : filteredPurchases.reduce((acc, p) => acc + p.total, 0) * 0.7;

  // 4. Detailed direct production costs
  // Formule: Coût production = Matière + Main-d’œuvre + Emballage + Énergie + Maintenance + Autres coûts
  const directLaborCost = pairsProducedNet * 75; // ~75 DA / paire direct labor
  const packagingCost = pairsProducedNet * 18; // ~18 DA / paire (cartons & étiquettes)
  const energyProductionCost = pairsProducedNet * 32; // ~32 DA / paire électricité & compresseurs
  const maintenanceCost = pairsProducedNet * 16; // ~16 DA / paire entretien moules & machines
  const otherProdCost = pairsProducedNet * 10; // ~10 DA / paire consommables divers

  const productionCost = rawMaterialCost + directLaborCost + packagingCost + energyProductionCost + maintenanceCost + otherProdCost;
  const costPerPair = pairsProducedNet > 0 ? productionCost / pairsProducedNet : 210;

  // 5. Total Dépenses réelles enregistrées
  const totalExpenses = filteredExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);

  // 6. Marge brute = CA - Coût des marchandises vendues (COGS)
  // COGS estimé par coût de production par paire × quantité vendue (ou production directe)
  const totalQtySold = filteredSales.reduce((acc, s) => acc + (s.quantity || 0), 0);
  const estimatedCogs = totalQtySold > 0 ? totalQtySold * costPerPair : productionCost;
  const grossMargin = revenue - estimatedCogs;
  const grossMarginRate = revenue > 0 ? (grossMargin / revenue) * 100 : 0;

  // 7. Résultat opérationnel (EBIT) = Marge brute - Charges de structure fixes (administration, commercial, loyer, etc.)
  const structuralExpenses = filteredExpenses
    .filter((e) => ['Loyer', 'Administration', 'Commercial', 'Marketing', 'Téléphone / Internet', 'Assurance'].includes(e.category))
    .reduce((acc, e) => acc + e.amount, 0);
  const operatingResult = grossMargin - structuralExpenses;

  // 8. Résultat net de gestion = Résultat opérationnel - Taxes & Impôts
  const taxesExpenses = filteredExpenses
    .filter((e) => ['Taxes', 'CNAS'].includes(e.category))
    .reduce((acc, e) => acc + e.amount, 0);
  const netResult = operatingResult - taxesExpenses;

  // 9. Créances clients (Total des restes à payer de toutes les ventes en cours)
  const receivables = sales.reduce((acc, s) => acc + (s.remainingAmount || 0), 0);

  // 10. Dettes fournisseurs (Total des restes à payer de tous les achats)
  const payables = purchases.reduce((acc, p) => acc + (p.remainingAmount || 0), 0);

  // 11. Valeur du stock total
  const stockValue = stockItems.reduce((acc, item) => {
    const unitPrice = ESTIMATED_STOCK_PRICES[item.category] || 250;
    return acc + item.quantity * unitPrice;
  }, 0);

  // 12. Valeur du stock dormant (articles dont la quantité dépasse largement le seuil minimum)
  const dormantStockValue = stockItems
    .filter((item) => item.quantity > item.minThreshold * 3)
    .reduce((acc, item) => {
      const excessQty = item.quantity - item.minThreshold * 2;
      const unitPrice = ESTIMATED_STOCK_PRICES[item.category] || 250;
      return acc + excessQty * unitPrice;
    }, 0);

  // 13. Valeur estimée de la perte rebut & 2ème choix
  // Perte rebut = Rebut × Coût de revient par paire
  // Perte 2ème choix = 2ème choix × 35% de décote
  const estimatedScrapLossValue = scrapQuantity * costPerPair + secondChoiceQuantity * (costPerPair * 0.35);

  return {
    revenue,
    rawMaterialCost,
    productionCost,
    totalExpenses,
    grossMargin,
    grossMarginRate,
    operatingResult,
    netResult,
    receivables,
    payables,
    stockValue,
    dormantStockValue,
    pairsProducedGross,
    pairsProducedNet,
    scrapQuantity,
    scrapRate,
    secondChoiceQuantity,
    costPerPair,
    estimatedScrapLossValue,
  };
}

// 7. Calculate profitability per model
export function calculateModelProfitability(
  sales: SaleOrder[],
  productionEntries: ProductionEntry[],
  costPerPairDefault = 215
): ModelProfitabilityItem[] {
  const modelMap: Record<
    string,
    { qtyProduced: number; qtySold: number; totalRevenue: number; countSold: number }
  > = {};

  // Aggregate production by model
  productionEntries.forEach((p) => {
    const name = p.modelName || 'Modèle CTP Standard';
    if (!modelMap[name]) {
      modelMap[name] = { qtyProduced: 0, qtySold: 0, totalRevenue: 0, countSold: 0 };
    }
    modelMap[name].qtyProduced += p.qtyProduced || p.pairsProduced || (p.cycles ? p.cycles * 2 : 0) || (p.cyclesCount ? p.cyclesCount * 2 : 0) || 0;
  });

  // Aggregate sales by model
  sales.forEach((s) => {
    const name = s.modelName || 'Modèle CTP Standard';
    if (!modelMap[name]) {
      modelMap[name] = { qtyProduced: 0, qtySold: 0, totalRevenue: 0, countSold: 0 };
    }
    modelMap[name].qtySold += s.quantity || 0;
    modelMap[name].totalRevenue += s.total || 0;
    modelMap[name].countSold += 1;
  });

  // Convert to array and rank by total margin
  const list: ModelProfitabilityItem[] = Object.entries(modelMap).map(([name, data]) => {
    // Model-specific cost variations
    let costPerPair = costPerPairDefault;
    if (name.includes('Bottine') || name.includes('PVC')) costPerPair = 340;
    else if (name.includes('Sabot')) costPerPair = 260;
    else if (name.includes('SB23')) costPerPair = 210;
    else if (name.includes('Claquette')) costPerPair = 175;

    const avgSellingPrice = data.qtySold > 0 ? Math.round(data.totalRevenue / data.qtySold) : costPerPair * 2.8;
    const unitMargin = avgSellingPrice - costPerPair;
    const totalMargin = unitMargin * (data.qtySold || data.qtyProduced || 100);
    const marginPercent = avgSellingPrice > 0 ? (unitMargin / avgSellingPrice) * 100 : 0;

    let status: ModelProfitabilityItem['status'] = 'rentable';
    if (marginPercent >= 65) status = 'tres_rentable';
    else if (marginPercent < 45) status = 'marge_faible';

    return {
      modelName: name,
      qtyProduced: data.qtyProduced,
      qtySold: data.qtySold,
      costPerPair,
      avgSellingPrice,
      unitMargin,
      totalMargin,
      marginPercent,
      status,
    };
  });

  // Sort from most profitable to least profitable (Du plus rentable au moins rentable)
  return list.sort((a, b) => b.totalMargin - a.totalMargin);
}

// 11. Generate automated financial alerts
export function generateFinancialAlerts(
  metrics: PnlSummaryMetrics,
  categoryBudgets: CategoryBudget[],
  expenses: ExpenseRecord[],
  prevMetrics?: PnlSummaryMetrics
): FinancialAlertItem[] {
  const alerts: FinancialAlertItem[] = [];

  // 1. Marge faible (< 15%)
  if (metrics.revenue > 0 && metrics.grossMarginRate < 15) {
    alerts.push({
      id: 'alt-marge-faible',
      type: 'danger',
      title: '🔴 Taux de marge faible',
      message: `La marge brute actuelle est de ${metrics.grossMarginRate.toFixed(1)}% (inférieure au seuil critique de 15%). Réévaluez les remises accordées ou optimisez vos coûts d'injection.`,
      metric: `${metrics.grossMarginRate.toFixed(1)}%`,
    });
  } else if (metrics.grossMarginRate >= 40) {
    alerts.push({
      id: 'alt-marge-saine',
      type: 'success',
      title: '🟢 Marge brute excellente',
      message: `Taux de marge brute performant à ${metrics.grossMarginRate.toFixed(1)}% garantissant une solide rentabilité d'exploitation.`,
      metric: `${metrics.grossMarginRate.toFixed(1)}%`,
    });
  }

  // 2. Dépenses dépassent le budget
  const actualByCategory: Record<string, number> = {};
  expenses.forEach((e) => {
    actualByCategory[e.category] = (actualByCategory[e.category] || 0) + e.amount;
  });

  categoryBudgets.forEach((b) => {
    const actual = actualByCategory[b.category] || 0;
    if (actual > b.monthlyBudget && b.monthlyBudget > 0) {
      const overspend = actual - b.monthlyBudget;
      const overspendPct = ((overspend / b.monthlyBudget) * 100).toFixed(0);
      alerts.push({
        id: `alt-depassement-${b.category}`,
        type: 'danger',
        title: `🔴 Dépassement Budget : ${b.category}`,
        message: `Les dépenses réelles (${actual.toLocaleString()} DA) dépassent le budget alloué (${b.monthlyBudget.toLocaleString()} DA) de +${overspend.toLocaleString()} DA (+${overspendPct}%).`,
        metric: `+${overspendPct}%`,
      });
    }
  });

  // 3. Rebut élevé (> 2%)
  if (metrics.scrapRate > 2.0) {
    alerts.push({
      id: 'alt-rebut-eleve',
      type: 'danger',
      title: '🔴 Taux de rebut élevé (> 2%)',
      message: `Le taux de non-conformité atteint ${metrics.scrapRate.toFixed(2)}% (${metrics.scrapQuantity.toLocaleString()} paires rejetées), représentant une perte de ${metrics.estimatedScrapLossValue.toLocaleString()} DA.`,
      metric: `${metrics.scrapRate.toFixed(2)}%`,
    });
  }

  // 4. Créances clients élevées (> 30% du CA)
  if (metrics.revenue > 0 && metrics.receivables > metrics.revenue * 0.3) {
    alerts.push({
      id: 'alt-creances-elevees',
      type: 'warning',
      title: '🔴 Créances clients élevées',
      message: `Le volume des créances clients s'élève à ${metrics.receivables.toLocaleString()} DA, dépassant 30% du CA réalisé. Planifiez des actions de recouvrement immédiates.`,
      metric: `${metrics.receivables.toLocaleString()} DA`,
    });
  }

  // 5. Stock dormant
  if (metrics.dormantStockValue > 500000) {
    alerts.push({
      id: 'alt-stock-dormant',
      type: 'warning',
      title: '🔴 Valeur stock dormant importante',
      message: `Stock dormant estimé à ${metrics.dormantStockValue.toLocaleString()} DA immobilisé sans rotation active depuis plus de 30 jours.`,
      metric: `${metrics.dormantStockValue.toLocaleString()} DA`,
    });
  }

  // 6. Coût de production élevé (> 250 DA/paire)
  if (metrics.costPerPair > 260) {
    alerts.push({
      id: 'alt-cout-prod-eleve',
      type: 'warning',
      title: '🔴 Coût unitaire de production élevé',
      message: `Le coût moyen par paire produite est de ${metrics.costPerPair.toFixed(1)} DA. Vérifiez la consommation électrique et le poids des carottes de moulage.`,
      metric: `${metrics.costPerPair.toFixed(1)} DA/paire`,
    });
  }

  // 7. Résultat positif
  if (metrics.netResult > 0) {
    alerts.push({
      id: 'alt-resultat-positif',
      type: 'success',
      title: '🟢 Résultat net positif',
      message: `Bénéfice net de gestion de +${metrics.netResult.toLocaleString()} DA sur la période sélectionnée.`,
      metric: `+${metrics.netResult.toLocaleString()} DA`,
    });
  }

  // 8. Marge en amélioration
  if (prevMetrics && prevMetrics.grossMarginRate > 0 && metrics.grossMarginRate > prevMetrics.grossMarginRate) {
    const diff = metrics.grossMarginRate - prevMetrics.grossMarginRate;
    alerts.push({
      id: 'alt-marge-amelioration',
      type: 'success',
      title: '🟢 Marge brute en amélioration',
      message: `Progression de la marge brute de +${diff.toFixed(1)} points par rapport à la période précédente.`,
      metric: `+${diff.toFixed(1)} pts`,
    });
  }

  return alerts;
}

export function generatePnlAlerts(
  metrics: PnlSummaryMetrics,
  expenses: ExpenseRecord[],
  categoryBudgets: CategoryBudget[] = [],
  prevMetrics?: PnlSummaryMetrics
): FinancialAlertItem[] {
  return generateFinancialAlerts(metrics, categoryBudgets, expenses, prevMetrics);
}
