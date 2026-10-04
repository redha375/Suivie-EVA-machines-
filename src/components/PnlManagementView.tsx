import React, { useState } from 'react';
import {
  TrendingUp,
  LayoutDashboard,
  ShoppingCart,
  Boxes,
  Receipt,
  Layers,
  Award,
  FileSpreadsheet,
  ShieldAlert,
  Target,
  Wallet,
  Calendar,
  Lock,
  Download,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PnlPeriodFilter } from '../types';
import { calculatePnlMetrics, generatePnlAlerts } from './pnl/pnlCalculations';
import { PnlDashboardTab } from './pnl/PnlDashboardTab';
import { PnlSalesTab } from './pnl/PnlSalesTab';
import { PnlPurchasesTab } from './pnl/PnlPurchasesTab';
import { PnlExpensesTab } from './pnl/PnlExpensesTab';
import { PnlProductionCostTab } from './pnl/PnlProductionCostTab';
import { PnlModelProfitabilityTab } from './pnl/PnlModelProfitabilityTab';
import { PnlFinancialStatementsTab } from './pnl/PnlFinancialStatementsTab';
import { PnlScrapQualityTab } from './pnl/PnlScrapQualityTab';
import { PnlBudgetVsActualTab } from './pnl/PnlBudgetVsActualTab';
import { PnlCashFlowTab } from './pnl/PnlCashFlowTab';

export const PnlManagementView: React.FC = () => {
  const {
    sales,
    purchases,
    expenses,
    productionEntries,
    stockItems,
    can,
    currentUser,
  } = useApp();

  const [activeTab, setActiveTab] = useState<
    | 'dashboard'
    | 'sales'
    | 'purchases'
    | 'expenses'
    | 'production_cost'
    | 'model_profitability'
    | 'financial_statements'
    | 'scrap_quality'
    | 'budget_vs_actual'
    | 'cash_flow'
  >('dashboard');

  const [period, setPeriod] = useState<PnlPeriodFilter>('mois');
  const [customStart, setCustomStart] = useState<string>('2026-09-01');
  const [customEnd, setCustomEnd] = useState<string>('2026-09-30');

  const canRead = can('pnl', 'read');
  const canEdit = can('pnl', 'create') || can('pnl', 'update');

  if (!canRead) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center bg-white rounded-2xl border border-slate-200">
        <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 mb-4">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Accès Restreint</h2>
        <p className="text-sm text-slate-500 mt-2 max-w-md">
          Votre rôle actuel (<strong>{currentUser.role}</strong>) n'a pas les habilitations nécessaires pour consulter le module <strong>P&L MANAGEMENT – PROFIT & LOSS</strong>.
        </p>
        <span className="text-xs text-slate-400 mt-4">Veuillez contacter le Directeur Général ou l'Administrateur Système.</span>
      </div>
    );
  }

  // Calculate current and previous metrics
  const currentMetrics = calculatePnlMetrics(
    sales,
    purchases,
    expenses,
    productionEntries,
    stockItems,
    period,
    false,
    customStart,
    customEnd
  );

  const prevMetrics = calculatePnlMetrics(
    sales,
    purchases,
    expenses,
    productionEntries,
    stockItems,
    period,
    true,
    customStart,
    customEnd
  );

  const alerts = generatePnlAlerts(currentMetrics, expenses);

  const tabsConfig = [
    { id: 'dashboard', label: '1. Dashboard P&L', icon: LayoutDashboard },
    { id: 'sales', label: '2. Ventes / Revenus', icon: ShoppingCart },
    { id: 'purchases', label: '3. Achats & Stock', icon: Boxes },
    { id: 'expenses', label: '4. Dépenses (19 postes)', icon: Receipt },
    { id: 'production_cost', label: '5. Coûts Production', icon: Layers },
    { id: 'model_profitability', label: '6. Rentabilité Modèles', icon: Award },
    { id: 'financial_statements', label: '7. P&L Final (Cascade)', icon: FileSpreadsheet },
    { id: 'scrap_quality', label: '8. Rebut & 2ème Choix', icon: ShieldAlert },
    { id: 'budget_vs_actual', label: '9. Budget vs Réel', icon: Target },
    { id: 'cash_flow', label: '10. Trésorerie & Cash', icon: Wallet },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Top Main Navigation Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
              Module Financier Consolidé
            </span>
            <span className="text-xs text-slate-400">• CTP SMART Suite 2026</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1 flex items-center gap-2.5">
            <TrendingUp className="w-7 h-7 text-emerald-600" />
            P&L MANAGEMENT – PROFIT & LOSS
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Marge brute, rentabilité unitaire, coût de production par paire, flux de trésorerie et suivi budgétaire en temps réel.
          </p>
        </div>

        {/* Global Period Filter Selector */}
        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
          <Calendar className="w-4 h-4 text-slate-400 ml-1" />
          <span className="text-xs text-slate-500 font-medium mr-1 hidden sm:inline">Période :</span>
          {(['jour', 'semaine', 'mois', 'annee', 'personnalise'] as PnlPeriodFilter[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all ${
                period === p
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              {p === 'jour'
                ? "Aujourd'hui"
                : p === 'semaine'
                ? 'Cette semaine'
                : p === 'mois'
                ? 'Ce mois'
                : p === 'annee'
                ? 'Cette année'
                : 'Personnalisé'}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Date Pickers if 'personnalise' selected */}
      {period === 'personnalise' && (
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 text-xs">
          <span className="font-semibold text-slate-700">Du :</span>
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="border border-slate-300 rounded-lg p-1.5"
          />
          <span className="font-semibold text-slate-700">Au :</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="border border-slate-300 rounded-lg p-1.5"
          />
        </div>
      )}

      {/* Horizontal Sub-Tabs Bar */}
      <div className="bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm overflow-x-auto flex items-center gap-1">
        {tabsConfig.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Sub-Tab Contents */}
      {activeTab === 'dashboard' && (
        <PnlDashboardTab
          current={currentMetrics}
          previous={prevMetrics}
          alerts={alerts}
          period={period}
          onNavigateTab={(tab) => setActiveTab(tab as any)}
        />
      )}

      {activeTab === 'sales' && <PnlSalesTab canEdit={canEdit} />}

      {activeTab === 'purchases' && <PnlPurchasesTab canEdit={canEdit} />}

      {activeTab === 'expenses' && <PnlExpensesTab canEdit={canEdit} />}

      {activeTab === 'production_cost' && (
        <PnlProductionCostTab
          period={period}
          customStart={customStart}
          customEnd={customEnd}
        />
      )}

      {activeTab === 'model_profitability' && <PnlModelProfitabilityTab />}

      {activeTab === 'financial_statements' && (
        <PnlFinancialStatementsTab metrics={currentMetrics} period={period} />
      )}

      {activeTab === 'scrap_quality' && <PnlScrapQualityTab metrics={currentMetrics} />}

      {activeTab === 'budget_vs_actual' && <PnlBudgetVsActualTab canEdit={canEdit} />}

      {activeTab === 'cash_flow' && <PnlCashFlowTab canEdit={canEdit} />}
    </div>
  );
};
