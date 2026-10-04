import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Layers,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Boxes,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
  Wallet,
  Coins,
  Percent,
} from 'lucide-react';
import { PnlSummaryMetrics, FinancialAlertItem } from './pnlCalculations';
import { PnlPeriodFilter } from '../../types';

interface PnlDashboardTabProps {
  currentMetrics: PnlSummaryMetrics;
  previousMetrics: PnlSummaryMetrics;
  period: PnlPeriodFilter;
  alerts: FinancialAlertItem[];
  onNavigateTab: (tabId: string) => void;
}

export const PnlDashboardTab: React.FC<PnlDashboardTabProps> = ({
  currentMetrics,
  previousMetrics,
  period,
  alerts,
  onNavigateTab,
}) => {
  // Helpers to calculate percentage change
  const calcDiffPct = (curr: number, prev: number): { pct: number; isUp: boolean; isNeutral: boolean } => {
    if (!prev || prev === 0) return { pct: 0, isUp: true, isNeutral: true };
    const diff = ((curr - prev) / Math.abs(prev)) * 100;
    return {
      pct: Math.abs(Math.round(diff)),
      isUp: diff >= 0,
      isNeutral: Math.abs(diff) < 0.5,
    };
  };

  const caDiff = calcDiffPct(currentMetrics.revenue, previousMetrics.revenue);
  const marginDiff = calcDiffPct(currentMetrics.grossMargin, previousMetrics.grossMargin);
  const prodCostDiff = calcDiffPct(currentMetrics.productionCost, previousMetrics.productionCost);
  const netDiff = calcDiffPct(currentMetrics.netResult, previousMetrics.netResult);

  const getPeriodLabel = () => {
    switch (period) {
      case 'today':
        return "Aujourd'hui vs Hier";
      case 'week':
        return 'Cette semaine vs Semaine préc.';
      case 'month':
        return 'Ce mois vs Mois précédent';
      case 'year':
        return 'Cette année vs Année préc.';
      case 'custom':
        return 'Période sélectionnée';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Quick Summary & Period comparison badge */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 rounded-xl p-5 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/30 text-emerald-200 border border-emerald-400/30">
              {getPeriodLabel()}
            </span>
            <span className="text-xs text-emerald-200">Devise : Dinar Algérien (DZD)</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold mt-1 tracking-tight">
            Performance Financière & Rentabilité d'Exploitation
          </h2>
          <p className="text-sm text-emerald-100/80 mt-0.5">
            Consolidation en temps réel : Ventes, Achats matières, Salaires, Dépenses et Coûts d'injection CTP SMART
          </p>
        </div>

        <div className="flex items-center gap-4 bg-emerald-950/40 p-3 rounded-lg border border-emerald-500/20">
          <div className="text-right">
            <div className="text-xs text-emerald-200">Résultat Net P&L</div>
            <div className={`text-xl font-bold ${currentMetrics.netResult >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
              {currentMetrics.netResult >= 0 ? '+' : ''}
              {currentMetrics.netResult.toLocaleString()} DA
            </div>
          </div>
          <div className="h-9 w-px bg-emerald-700/50" />
          <div className="text-right">
            <div className="text-xs text-emerald-200">Taux de Marge Brute</div>
            <div className="text-xl font-bold text-amber-300">
              {currentMetrics.grossMarginRate.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* 1. Primary KPIs Grid (8 key metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Chiffre d'affaires */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Chiffre d'affaires (CA)</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div className="text-2xl font-bold text-slate-900">{currentMetrics.revenue.toLocaleString()} <span className="text-xs font-normal text-slate-500">DA</span></div>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            {caDiff.isNeutral ? (
              <span className="text-slate-500 font-medium">Stable</span>
            ) : caDiff.isUp ? (
              <span className="text-emerald-700 font-semibold flex items-center">
                <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> +{caDiff.pct}%
              </span>
            ) : (
              <span className="text-rose-600 font-semibold flex items-center">
                <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" /> -{caDiff.pct}%
              </span>
            )}
            <span className="text-slate-500">vs période préc.</span>
          </div>
        </div>

        {/* Coût des Matières Premières */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Matières Premières</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-slate-900">{currentMetrics.rawMaterialCost.toLocaleString()} <span className="text-xs font-normal text-slate-500">DA</span></div>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
            <span>Part du CA : {currentMetrics.revenue > 0 ? ((currentMetrics.rawMaterialCost / currentMetrics.revenue) * 100).toFixed(1) : '0'}%</span>
            <button onClick={() => onNavigateTab('purchases')} className="text-indigo-600 hover:underline font-medium">Détails</button>
          </div>
        </div>

        {/* Coût de Production Total */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Coût Production Réel</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-slate-900">{currentMetrics.productionCost.toLocaleString()} <span className="text-xs font-normal text-slate-500">DA</span></div>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
              {currentMetrics.costPerPair.toFixed(1)} DA / paire
            </span>
            <button onClick={() => onNavigateTab('production_cost')} className="text-indigo-600 hover:underline font-medium">Ateliers</button>
          </div>
        </div>

        {/* Total Dépenses d'Exploitation */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Dépenses</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-slate-900">{currentMetrics.totalExpenses.toLocaleString()} <span className="text-xs font-normal text-slate-500">DA</span></div>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
            <span>Salaires, loyer, énergie...</span>
            <button onClick={() => onNavigateTab('expenses')} className="text-indigo-600 hover:underline font-medium">19 Catégories</button>
          </div>
        </div>

        {/* Marge Brute */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Marge Brute</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className={`text-2xl font-bold ${currentMetrics.grossMargin >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
              {currentMetrics.grossMargin.toLocaleString()} <span className="text-xs font-normal text-slate-500">DA</span>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
              Taux : {currentMetrics.grossMarginRate.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Résultat Opérationnel (EBIT) */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Résultat Opérationnel</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className={`text-2xl font-bold ${currentMetrics.operatingResult >= 0 ? 'text-teal-700' : 'text-rose-600'}`}>
              {currentMetrics.operatingResult.toLocaleString()} <span className="text-xs font-normal text-slate-500">DA</span>
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Après déduction charges structure
          </div>
        </div>

        {/* Créances Clients */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Créances Clients</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-indigo-900">{currentMetrics.receivables.toLocaleString()} <span className="text-xs font-normal text-slate-500">DA</span></div>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
            <span className="text-amber-700 font-medium">À recouvrer</span>
            <button onClick={() => onNavigateTab('sales')} className="text-indigo-600 hover:underline font-medium">Factures</button>
          </div>
        </div>

        {/* Dettes Fournisseurs */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Dettes Fournisseurs</span>
            <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-orange-900">{currentMetrics.payables.toLocaleString()} <span className="text-xs font-normal text-slate-500">DA</span></div>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
            <span className="text-orange-700 font-medium">À régler</span>
            <button onClick={() => onNavigateTab('purchases')} className="text-indigo-600 hover:underline font-medium">Échéances</button>
          </div>
        </div>
      </div>

      {/* 2. Stock & Quality Financial Impact Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Valeur du Stock Total */}
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <Boxes className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Valeur Globale du Stock</div>
            <div className="text-xl font-bold text-slate-900">{currentMetrics.stockValue.toLocaleString()} DA</div>
            <div className="text-xs text-slate-500">Matières premières, semelles & finis</div>
          </div>
        </div>

        {/* Stock Dormant */}
        <div className="bg-amber-50/60 rounded-xl border border-amber-200 p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-amber-700 font-medium">Valeur Stock Dormant</div>
            <div className="text-xl font-bold text-amber-900">{currentMetrics.dormantStockValue.toLocaleString()} DA</div>
            <div className="text-xs text-amber-700">Immobilisation financière sans rotation</div>
          </div>
        </div>

        {/* Impact Financier Rebut & 2ème Choix */}
        <div className="bg-rose-50/60 rounded-xl border border-rose-200 p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="text-xs text-rose-700 font-medium">Perte Estimée Rebut & Qualité</div>
            <div className="text-xl font-bold text-rose-900">{currentMetrics.estimatedScrapLossValue.toLocaleString()} DA</div>
            <div className="text-xs text-rose-700">Taux rejet : {currentMetrics.scrapRate.toFixed(2)}% ({currentMetrics.scrapQuantity} paires)</div>
          </div>
        </div>
      </div>

      {/* 3. Section Alertes Financières Automatisées (11. Alertes) */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-slate-800 text-base">Alertes Financières & Détecteur d'Anomalies P&L</h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">{alerts.length} surveillance(s) active(s)</span>
        </div>

        {alerts.length === 0 ? (
          <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Tous les indicateurs financiers sont au vert : marge supérieure à 15%, aucun dépassement budgétaire critique détecté.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {alerts.map((al) => (
              <div
                key={al.id}
                className={`p-3.5 rounded-lg border text-sm flex items-start gap-3 ${
                  al.type === 'danger'
                    ? 'bg-rose-50/70 border-rose-200 text-rose-900'
                    : al.type === 'warning'
                    ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                    : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                }`}
              >
                {al.type === 'danger' ? (
                  <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                ) : al.type === 'warning' ? (
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="font-bold text-xs uppercase tracking-wide flex items-center justify-between">
                    <span>{al.title}</span>
                    {al.metric && (
                      <span className="font-bold text-xs px-1.5 py-0.5 rounded bg-white/70 shadow-2xs border border-current">
                        {al.metric}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed opacity-90">{al.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Quick Action Shortcuts to sub-tabs */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
          Accès Rapide aux Modules Financiers
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <button
            onClick={() => onNavigateTab('sales')}
            className="p-3 bg-white rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/30 text-left transition-all group"
          >
            <div className="text-xs font-bold text-slate-800 group-hover:text-emerald-700">Factures Ventes</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Créances & Encaissements</div>
          </button>
          <button
            onClick={() => onNavigateTab('purchases')}
            className="p-3 bg-white rounded-lg border border-slate-200 hover:border-blue-500 hover:bg-blue-50/30 text-left transition-all group"
          >
            <div className="text-xs font-bold text-slate-800 group-hover:text-blue-700">Achats & Matières</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Fournisseurs & Stock</div>
          </button>
          <button
            onClick={() => onNavigateTab('expenses')}
            className="p-3 bg-white rounded-lg border border-slate-200 hover:border-rose-500 hover:bg-rose-50/30 text-left transition-all group"
          >
            <div className="text-xs font-bold text-slate-800 group-hover:text-rose-700">Dépenses Opérationnelles</div>
            <div className="text-[11px] text-slate-500 mt-0.5">19 Catégories de charges</div>
          </button>
          <button
            onClick={() => onNavigateTab('model_profitability')}
            className="p-3 bg-white rounded-lg border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/30 text-left transition-all group"
          >
            <div className="text-xs font-bold text-slate-800 group-hover:text-indigo-700">Rentabilité / Modèle</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Classement des marges</div>
          </button>
          <button
            onClick={() => onNavigateTab('budget_vs_actual')}
            className="p-3 bg-white rounded-lg border border-slate-200 hover:border-amber-500 hover:bg-amber-50/30 text-left transition-all group"
          >
            <div className="text-xs font-bold text-slate-800 group-hover:text-amber-700">Budget vs Réel</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Contrôle des écarts</div>
          </button>
          <button
            onClick={() => onNavigateTab('cash_flow')}
            className="p-3 bg-white rounded-lg border border-slate-200 hover:border-teal-500 hover:bg-teal-50/30 text-left transition-all group"
          >
            <div className="text-xs font-bold text-slate-800 group-hover:text-teal-700">Trésorerie / Cash Flow</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Solde des liquidités</div>
          </button>
        </div>
      </div>
    </div>
  );
};
