import React, { useState } from 'react';
import {
  Target,
  Edit2,
  Check,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  X,
  PieChart,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { EXPENSE_CATEGORIES_LIST } from './PnlExpensesTab';
import { ExpenseCategory } from '../../types';

interface PnlBudgetVsActualTabProps {
  canEdit: boolean;
}

export const PnlBudgetVsActualTab: React.FC<PnlBudgetVsActualTabProps> = ({ canEdit }) => {
  const { categoryBudgets, updateCategoryBudget, expenses } = useApp();

  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [newBudgetVal, setNewBudgetVal] = useState<number>(0);

  // Compute actual expenses by category
  const actualByCategory: Record<string, number> = {};
  expenses.forEach((e) => {
    actualByCategory[e.category] = (actualByCategory[e.category] || 0) + e.amount;
  });

  // Build full comparison table for all 19 categories
  const comparisonData = EXPENSE_CATEGORIES_LIST.map((category) => {
    const budgetObj = categoryBudgets.find((b) => b.category === category);
    const budget = budgetObj ? budgetObj.monthlyBudget : 0;
    const actual = actualByCategory[category] || 0;
    const variance = actual - budget;
    const variancePct = budget > 0 ? (variance / budget) * 100 : 0;
    const consumptionRate = budget > 0 ? (actual / budget) * 100 : 0;

    let status: 'ok' | 'warning' | 'over' = 'ok';
    if (actual > budget && budget > 0) {
      status = 'over';
    } else if (consumptionRate >= 90) {
      status = 'warning';
    }

    return {
      category,
      budget,
      actual,
      variance,
      variancePct,
      consumptionRate,
      status,
    };
  });

  const totalBudget = comparisonData.reduce((acc, c) => acc + c.budget, 0);
  const totalActual = comparisonData.reduce((acc, c) => acc + c.actual, 0);
  const totalVariance = totalActual - totalBudget;
  const overspendCount = comparisonData.filter((c) => c.status === 'over').length;

  const handleOpenEdit = (category: ExpenseCategory, currentBudget: number) => {
    setEditingCategory(category);
    setNewBudgetVal(currentBudget);
  };

  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    updateCategoryBudget(editingCategory, Number(newBudgetVal));
    setEditingCategory(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">Budget Mensuel Global Alloué</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{totalBudget.toLocaleString()} DA</div>
          <div className="text-xs text-slate-500 mt-0.5">Plafond cible prévisionnel</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">Dépenses Réelles Consommées</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{totalActual.toLocaleString()} DA</div>
          <div className="text-xs text-slate-500 mt-0.5">Total engagé à ce jour</div>
        </div>

        <div
          className={`p-4 rounded-xl border ${
            totalVariance <= 0
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
              : 'bg-rose-50/70 border-rose-200 text-rose-900'
          }`}
        >
          <div className="text-xs font-medium">Écart Global Réel vs Budget</div>
          <div className="text-2xl font-bold mt-1">
            {totalVariance > 0 ? `+${totalVariance.toLocaleString()}` : totalVariance.toLocaleString()} DA
          </div>
          <div className="text-xs mt-0.5">
            {totalVariance <= 0 ? '🟢 Économie réalisée sous le budget' : '🔴 Dépassement global du budget'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-medium">Postes en Dépassement</div>
            <div className={`text-2xl font-bold mt-1 ${overspendCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {overspendCount} <span className="text-xs font-normal text-slate-500">/ 19 catégories</span>
            </div>
            <div className="text-xs text-slate-500 mt-0.5">Surveillance active</div>
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${overspendCount > 0 ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
            <Target className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Contrôle Budgétaire & Écarts par Catégorie de Charges
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Code couleur : 🟢 Sous budget (&lt;90%) • 🟡 Proche limite (90-100%) • 🔴 Dépassement (&gt;100%)
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[11px]">
              <tr>
                <th className="py-3 px-3">Poste de Dépense</th>
                <th className="py-3 px-3 text-right">Budget Alloué (DA)</th>
                <th className="py-3 px-3 text-right">Dépenses Réelles (DA)</th>
                <th className="py-3 px-3 text-right">Écart Net (DA)</th>
                <th className="py-3 px-3 text-right">Taux Consommation</th>
                <th className="py-3 px-3">Jauge</th>
                <th className="py-3 px-3 text-center">Statut</th>
                {canEdit && <th className="py-3 px-3 text-center">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {comparisonData.map((row) => (
                <tr key={row.category} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-3 font-semibold text-slate-900">
                    {row.category}
                  </td>
                  <td className="py-3 px-3 text-right font-medium text-slate-700">
                    {row.budget.toLocaleString()} DA
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-slate-900">
                    {row.actual.toLocaleString()} DA
                  </td>
                  <td className="py-3 px-3 text-right font-semibold">
                    {row.variance > 0 ? (
                      <span className="text-rose-600">+{row.variance.toLocaleString()} DA</span>
                    ) : (
                      <span className="text-emerald-700">{row.variance.toLocaleString()} DA</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right font-bold">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[11px] ${
                        row.status === 'over'
                          ? 'bg-rose-100 text-rose-800'
                          : row.status === 'warning'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {row.consumptionRate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-3 px-3 w-40">
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          row.status === 'over'
                            ? 'bg-rose-600'
                            : row.status === 'warning'
                            ? 'bg-amber-500'
                            : 'bg-emerald-600'
                        }`}
                        style={{ width: `${Math.min(100, row.consumptionRate)}%` }}
                      />
                    </div>
                  </td>
                  <td className="py-3 px-3 text-center">
                    {row.status === 'over' ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 flex items-center justify-center gap-1 mx-auto w-fit">
                        <AlertTriangle className="w-3 h-3" />
                        Dépassement
                      </span>
                    ) : row.status === 'warning' ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 flex items-center justify-center gap-1 mx-auto w-fit">
                        Alerte limite
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center justify-center gap-1 mx-auto w-fit">
                        <CheckCircle2 className="w-3 h-3" />
                        Sous budget
                      </span>
                    )}
                  </td>
                  {canEdit && (
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => handleOpenEdit(row.category, row.budget)}
                        className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                        title="Modifier le budget cible"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Edit Budget */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Target className="w-4 h-4 text-indigo-600" />
                Fixer Budget Mensuel : {editingCategory}
              </h3>
              <button
                onClick={() => setEditingCategory(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBudget} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Budget Cible Mensuel Alloué (DA)
                </label>
                <input
                  type="number"
                  min={0}
                  step={5000}
                  value={newBudgetVal}
                  onChange={(e) => setNewBudgetVal(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 text-sm font-bold"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-700"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
