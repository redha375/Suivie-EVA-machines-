import React from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  TrendingDown,
  Layers,
  FileCheck,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PnlSummaryMetrics } from './pnlCalculations';

interface PnlScrapQualityTabProps {
  metrics: PnlSummaryMetrics;
}

export const PnlScrapQualityTab: React.FC<PnlScrapQualityTabProps> = ({ metrics }) => {
  const { qualityRecords, productionEntries } = useApp();

  // Financial calculations
  // Formule: Coût du rebut = Nombre de paires × Coût par paire
  const scrapTotalCost = metrics.scrapQuantity * metrics.costPerPair;
  // 2ème choix décote: on vend avec une décote d'environ 35%
  const secondChoiceDiscountLoss = metrics.secondChoiceQuantity * (metrics.costPerPair * 0.35);
  const totalQualityLoss = scrapTotalCost + secondChoiceDiscountLoss;

  // Breakdown by defect type from qualityRecords
  const defectBreakdown: Record<string, { count: number; qty: number }> = {};
  qualityRecords.forEach((q) => {
    const d = q.defectType || 'Défaut géométrie / bulle';
    if (!defectBreakdown[d]) {
      defectBreakdown[d] = { count: 0, qty: 0 };
    }
    defectBreakdown[d].count += 1;
    defectBreakdown[d].qty += q.rejectedQty || 1;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner with Formulas & Totals */}
      <div className="bg-gradient-to-r from-rose-900 to-amber-900 text-white p-5 rounded-xl shadow-md">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/30 text-rose-200 border border-rose-400/30">
            Impact Qualité sur le P&L
          </span>
          <span className="text-xs text-rose-200">Non-conformités & Pertes matière</span>
        </div>
        <h2 className="text-xl font-bold mt-1">Coût Financier du Rebut & 2ème Choix</h2>
        <p className="text-xs text-rose-100/80 mt-1 max-w-3xl leading-relaxed">
          <strong>Perte financière totale</strong> = (Nombre de paires rejetées × Coût de production par paire) + Décote commerciale subie sur le 2ème choix.
        </p>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="bg-rose-950/50 p-3 rounded-lg border border-rose-400/20">
            <div className="text-[11px] text-rose-200">Volume Total Rebut</div>
            <div className="text-xl font-bold text-white mt-0.5">{metrics.scrapQuantity.toLocaleString()} paires</div>
            <div className="text-[10px] text-rose-300">Taux rejet: {metrics.scrapRate.toFixed(2)}%</div>
          </div>

          <div className="bg-rose-950/50 p-3 rounded-lg border border-rose-400/20">
            <div className="text-[11px] text-rose-200">Volume 2ème Choix</div>
            <div className="text-xl font-bold text-white mt-0.5">{metrics.secondChoiceQuantity.toLocaleString()} paires</div>
            <div className="text-[10px] text-rose-300">Vendu déclassé (-35%)</div>
          </div>

          <div className="bg-rose-950/50 p-3 rounded-lg border border-rose-400/20">
            <div className="text-[11px] text-rose-200">Coût de Revient / Paire</div>
            <div className="text-xl font-bold text-amber-300 mt-0.5">{metrics.costPerPair.toFixed(1)} DA</div>
            <div className="text-[10px] text-rose-300">Base de valorisation</div>
          </div>

          <div className="bg-rose-950/60 p-3 rounded-lg border border-rose-400/30">
            <div className="text-[11px] text-rose-200">Perte Financière Estimée</div>
            <div className="text-xl font-extrabold text-rose-300 mt-0.5">-{totalQualityLoss.toLocaleString()} DA</div>
            <div className="text-[10px] text-rose-200">Directement déduit de la marge</div>
          </div>
        </div>
      </div>

      {/* Breakdown by Quality Non-Conformity Defect */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <h3 className="font-bold text-slate-900 text-sm mb-4 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-600" />
          Pertes Financières par Type de Non-Conformité
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Object.entries(defectBreakdown).map(([defectName, stats]) => {
            const financialLoss = stats.qty * metrics.costPerPair;
            return (
              <div key={defectName} className="p-4 rounded-xl border border-rose-100 bg-rose-50/40">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900 text-xs">{defectName}</span>
                  <span className="text-[11px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                    {stats.qty} paires
                  </span>
                </div>
                <div className="mt-2 text-xs text-slate-600 space-y-1">
                  <div className="flex justify-between">
                    <span>Incidents qualité :</span>
                    <strong>{stats.count} fiches</strong>
                  </div>
                  <div className="flex justify-between pt-1 border-t text-slate-900">
                    <span className="font-medium text-rose-800">Impact marge :</span>
                    <strong className="text-rose-700">-{financialLoss.toLocaleString()} DA</strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quality recommendations to save margin */}
      <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900">
          <strong className="block font-bold">Plan d'action Qualité & Récupération de Marge :</strong>
          <span className="opacity-90">
            Une réduction de 0.5% du taux de rebut sur l'atelier EVA permettrait d'économiser environ{' '}
            <strong>{(metrics.pairsProducedNet * 0.005 * metrics.costPerPair).toLocaleString()} DA</strong> sur la période, augmentant directement le résultat net d'exploitation.
          </span>
        </div>
      </div>
    </div>
  );
};
