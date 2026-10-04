import React from 'react';
import {
  FileSpreadsheet,
  Download,
  Printer,
  TrendingUp,
  CheckCircle2,
  DollarSign,
  Layers,
  FileText,
  Target,
} from 'lucide-react';
import { PnlSummaryMetrics } from './pnlCalculations';
import { PnlPeriodFilter } from '../../types';

interface PnlFinancialStatementsTabProps {
  metrics: PnlSummaryMetrics;
  period: PnlPeriodFilter;
}

export const PnlFinancialStatementsTab: React.FC<PnlFinancialStatementsTabProps> = ({
  metrics,
  period,
}) => {
  // Financial ratios
  const netMarginPct = metrics.revenue > 0 ? (metrics.netResult / metrics.revenue) * 100 : 0;
  const operatingMarginPct = metrics.revenue > 0 ? (metrics.operatingResult / metrics.revenue) * 100 : 0;

  // Break-even point (Seuil de rentabilité / Point mort)
  // Formule: Charges fixes / Taux de marge sur coûts variables
  const fixedExpenses = Math.max(1, metrics.totalExpenses * 0.45); // ~45% charges fixes
  const variableMarginRate = metrics.grossMarginRate > 0 ? metrics.grossMarginRate / 100 : 0.4;
  const breakEvenRevenue = variableMarginRate > 0 ? fixedExpenses / variableMarginRate : 0;
  const breakEvenPairs = metrics.costPerPair > 0 ? Math.round(breakEvenRevenue / 650) : 0;

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    const rows = [
      ['POSTE COMPTABLE P&L', 'MONTANT (DZD)', '% DU CHIFFRE D AFFAIRES'],
      ['Chiffre d affaires (CA Ventes)', metrics.revenue, '100.0%'],
      ['Coût des matières premières', -metrics.rawMaterialCost, `${((metrics.rawMaterialCost / (metrics.revenue || 1)) * 100).toFixed(1)}%`],
      ['Coût direct de production (Main d oeuvre & Atelier)', -(metrics.productionCost - metrics.rawMaterialCost), `${(((metrics.productionCost - metrics.rawMaterialCost) / (metrics.revenue || 1)) * 100).toFixed(1)}%`],
      ['= MARGE BRUTE INDUSTRIELLE', metrics.grossMargin, `${metrics.grossMarginRate.toFixed(1)}%`],
      ['Total Charges d Exploitation & Structure', -metrics.totalExpenses, `${((metrics.totalExpenses / (metrics.revenue || 1)) * 100).toFixed(1)}%`],
      ['= RÉSULTAT OPÉRATIONNEL (EBIT)', metrics.operatingResult, `${operatingMarginPct.toFixed(1)}%`],
      ['Taxes, Impôts & CNAS', -(metrics.operatingResult - metrics.netResult), `${(((metrics.operatingResult - metrics.netResult) / (metrics.revenue || 1)) * 100).toFixed(1)}%`],
      ['= RÉSULTAT NET DE GESTION', metrics.netResult, `${netMarginPct.toFixed(1)}%`],
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(';')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CTP_SMART_P_AND_L_${period}_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Action Buttons */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            Compte de Résultat Simplifié (P&L Final CTP SMART)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Présentation normalisée en cascade : Marge brute, Résultat opérationnel et Résultat net de gestion
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exporter CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimer / PDF</span>
          </button>
        </div>
      </div>

      {/* Accounting Waterfall Statement */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Cascade Comptable d'Exploitation
          </span>
          <span className="text-xs font-medium text-slate-500">Devise : Dinar Algérien (DZD)</span>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {/* 1. Chiffre d'affaires */}
          <div className="p-4 flex items-center justify-between bg-emerald-50/40 font-semibold">
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 rounded bg-emerald-200 text-emerald-800 flex items-center justify-center font-bold text-xs">
                +
              </span>
              <div>
                <div className="text-sm text-slate-900 font-bold">Chiffre d'affaires (Ventes nettes de remises)</div>
                <div className="text-[11px] text-slate-500 font-normal">Factures clients validées</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-base font-bold text-slate-900">{metrics.revenue.toLocaleString()} DA</div>
              <div className="text-[11px] text-slate-500">100.0%</div>
            </div>
          </div>

          {/* 2. Coût des marchandises vendues / Coût direct */}
          <div className="p-4 pl-12 flex items-center justify-between text-slate-700">
            <div>
              <div className="font-medium text-slate-900">- Coût des Matières Premières</div>
              <div className="text-[11px] text-slate-500">Consommation résines EVA, PVC, pigments</div>
            </div>
            <div className="text-right">
              <div className="font-semibold text-rose-600">-{metrics.rawMaterialCost.toLocaleString()} DA</div>
              <div className="text-[11px] text-slate-500">
                {metrics.revenue > 0 ? ((metrics.rawMaterialCost / metrics.revenue) * 100).toFixed(1) : 0}%
              </div>
            </div>
          </div>

          <div className="p-4 pl-12 flex items-center justify-between text-slate-700">
            <div>
              <div className="font-medium text-slate-900">- Coûts Directs Atelier & Production</div>
              <div className="text-[11px] text-slate-500">Main-d'œuvre directe, cartons d'emballage, énergie presses</div>
            </div>
            <div className="text-right">
              <div className="font-semibold text-rose-600">
                -{(metrics.productionCost - metrics.rawMaterialCost).toLocaleString()} DA
              </div>
              <div className="text-[11px] text-slate-500">
                {metrics.revenue > 0 ? (((metrics.productionCost - metrics.rawMaterialCost) / metrics.revenue) * 100).toFixed(1) : 0}%
              </div>
            </div>
          </div>

          {/* 3. Marge Brute */}
          <div className="p-4 flex items-center justify-between bg-blue-50/50 border-t-2 border-b border-blue-200">
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 rounded bg-blue-200 text-blue-800 flex items-center justify-center font-bold text-xs">
                =
              </span>
              <div>
                <div className="text-sm font-bold text-blue-900">MARGE BRUTE INDUSTRIELLE</div>
                <div className="text-[11px] text-blue-700 font-normal">Chiffre d'affaires - Coûts directs de production</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-base font-extrabold text-blue-900">{metrics.grossMargin.toLocaleString()} DA</div>
              <div className="text-xs font-bold text-blue-700">Taux : {metrics.grossMarginRate.toFixed(1)}%</div>
            </div>
          </div>

          {/* 4. Charges d'exploitation de structure */}
          <div className="p-4 pl-12 flex items-center justify-between text-slate-700">
            <div>
              <div className="font-medium text-slate-900">- Charges d'Exploitation & Structure (19 Catégories)</div>
              <div className="text-[11px] text-slate-500">Salaires administratifs, loyers, entretien, transport, télécom</div>
            </div>
            <div className="text-right">
              <div className="font-semibold text-rose-600">-{metrics.totalExpenses.toLocaleString()} DA</div>
              <div className="text-[11px] text-slate-500">
                {metrics.revenue > 0 ? ((metrics.totalExpenses / metrics.revenue) * 100).toFixed(1) : 0}%
              </div>
            </div>
          </div>

          {/* 5. Résultat Opérationnel */}
          <div className="p-4 flex items-center justify-between bg-teal-50/50 border-t-2 border-b border-teal-200">
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 rounded bg-teal-200 text-teal-800 flex items-center justify-center font-bold text-xs">
                =
              </span>
              <div>
                <div className="text-sm font-bold text-teal-900">RÉSULTAT OPÉRATIONNEL (EBIT)</div>
                <div className="text-[11px] text-teal-700 font-normal">Marge brute après déduction de l'ensemble des charges de structure</div>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-base font-extrabold ${metrics.operatingResult >= 0 ? 'text-teal-900' : 'text-rose-600'}`}>
                {metrics.operatingResult.toLocaleString()} DA
              </div>
              <div className="text-xs font-bold text-teal-700">Taux : {operatingMarginPct.toFixed(1)}%</div>
            </div>
          </div>

          {/* 6. Taxes et charges fiscales */}
          <div className="p-4 pl-12 flex items-center justify-between text-slate-700">
            <div>
              <div className="font-medium text-slate-900">- Impôts, Taxes & Cotisations Légales</div>
              <div className="text-[11px] text-slate-500">Taxes professionnelles et cotisations sociales patronales</div>
            </div>
            <div className="text-right">
              <div className="font-semibold text-rose-600">
                -{(metrics.operatingResult - metrics.netResult).toLocaleString()} DA
              </div>
              <div className="text-[11px] text-slate-500">Réglementaire</div>
            </div>
          </div>

          {/* 7. Résultat Net Final */}
          <div className="p-5 flex items-center justify-between bg-slate-900 text-white rounded-b-xl">
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded bg-emerald-500 text-white flex items-center justify-center font-bold text-sm">
                ★
              </span>
              <div>
                <div className="text-base font-extrabold tracking-tight">RÉSULTAT NET DE GESTION (BÉNÉFICE / PERTE)</div>
                <div className="text-xs text-slate-300 font-normal">Bénéfice net consolidé de l'exercice pour CTP SMART</div>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-2xl font-black ${metrics.netResult >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {metrics.netResult >= 0 ? '+' : ''}{metrics.netResult.toLocaleString()} DA
              </div>
              <div className="text-xs font-semibold text-slate-300">Marge Nette : {netMarginPct.toFixed(1)}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Break-even point (Seuil de rentabilité / Point mort) */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-5 h-5 text-indigo-600" />
          <h3 className="font-bold text-slate-900 text-sm">Analyse du Seuil de Rentabilité (Point Mort)</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
            <div className="text-xs text-slate-500 font-medium">Chiffre d'Affaires Critique</div>
            <div className="text-xl font-bold text-slate-900 mt-1">{Math.round(breakEvenRevenue).toLocaleString()} DA</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Niveau de ventes pour couvrir 100% des charges</div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
            <div className="text-xs text-slate-500 font-medium">Volume de Production Requis</div>
            <div className="text-xl font-bold text-indigo-700 mt-1">{breakEvenPairs.toLocaleString()} paires</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Nombre de paires vendues au prix moyen de 650 DA</div>
          </div>

          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60">
            <div className="text-xs text-emerald-800 font-medium">Marge de Sécurité</div>
            <div className="text-xl font-bold text-emerald-900 mt-1">
              {metrics.revenue > breakEvenRevenue ? `+${Math.round(metrics.revenue - breakEvenRevenue).toLocaleString()} DA` : '0 DA'}
            </div>
            <div className="text-[11px] text-emerald-700 mt-0.5">
              {metrics.revenue > breakEvenRevenue
                ? `Zone de profit sécurisée (+${(((metrics.revenue - breakEvenRevenue) / metrics.revenue) * 100).toFixed(1)}%)`
                : 'Sous le seuil de rentabilité'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
