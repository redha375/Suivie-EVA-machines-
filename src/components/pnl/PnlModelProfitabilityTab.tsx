import React, { useState } from 'react';
import {
  TrendingUp,
  Search,
  Filter,
  Layers,
  Award,
  AlertCircle,
  ArrowUpDown,
  DollarSign,
  Percent,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { calculateModelProfitability, ModelProfitabilityItem } from './pnlCalculations';

export const PnlModelProfitabilityTab: React.FC = () => {
  const { sales, productionEntries } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'margin_total' | 'margin_pct' | 'qty_sold'>('margin_total');

  const modelsList = calculateModelProfitability(sales, productionEntries);

  const filteredModels = modelsList.filter((m) => {
    const matchSearch = m.modelName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === 'all' || m.status === filterStatus;
    return matchSearch && matchStatus;
  });

  // Sort
  filteredModels.sort((a, b) => {
    if (sortBy === 'margin_total') return b.totalMargin - a.totalMargin;
    if (sortBy === 'margin_pct') return b.marginPercent - a.marginPercent;
    return b.qtySold - a.qtySold;
  });

  const totalCalculatedMargin = filteredModels.reduce((acc, m) => acc + m.totalMargin, 0);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-800 to-indigo-900 text-white p-5 rounded-xl shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/30 text-emerald-200 border border-emerald-400/30">
              Analyse de Marge Commerciale & Coûts
            </span>
          </div>
          <h2 className="text-xl font-bold mt-1">Rentabilité par Modèle (Du plus au moins rentable)</h2>
          <p className="text-xs text-emerald-100/80 mt-1 max-w-2xl">
            Calcul unitaire précis : Marge unitaire = Prix de vente - Coût de revient par paire. Classement automatique pour guider la planification des moules et les arbitrages commerciaux.
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-xs p-3.5 rounded-lg border border-white/20 text-right">
          <div className="text-xs text-emerald-200">Marge Cumulée sur Modèles</div>
          <div className="text-2xl font-bold text-white mt-0.5">{totalCalculatedMargin.toLocaleString()} DA</div>
          <div className="text-xs text-emerald-300 mt-0.5">{filteredModels.length} références analysées</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher un modèle de chaussure..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500">Niveau de rentabilité :</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">Tous niveaux ({modelsList.length})</option>
              <option value="tres_rentable">⭐ Très rentable (Marge ≥ 65%)</option>
              <option value="rentable">✅ Rentable (45% - 64%)</option>
              <option value="marge_faible">⚠️ Marge faible (&lt; 45%)</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500">Trier par :</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="margin_total">Marge totale dégagée (DA)</option>
              <option value="margin_pct">Taux de marge unitaire (%)</option>
              <option value="qty_sold">Volumes vendus (Paires)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Model Profitability Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[11px]">
              <tr>
                <th className="py-3 px-3 text-center">Rang</th>
                <th className="py-3 px-3">Modèle</th>
                <th className="py-3 px-3 text-right">Qté Produite</th>
                <th className="py-3 px-3 text-right">Qté Vendue</th>
                <th className="py-3 px-3 text-right">Coût / Paire (DA)</th>
                <th className="py-3 px-3 text-right">Prix Vente (DA)</th>
                <th className="py-3 px-3 text-right">Marge Unitaire</th>
                <th className="py-3 px-3 text-right">Marge %</th>
                <th className="py-3 px-3 text-right">Marge Totale (DA)</th>
                <th className="py-3 px-3 text-center">Diagnostic</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredModels.map((item, index) => (
                <tr key={item.modelName} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-3 text-center font-bold text-slate-400">
                    {index === 0 ? (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-800 font-bold text-xs">
                        1
                      </span>
                    ) : index === 1 ? (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold text-xs">
                        2
                      </span>
                    ) : index === 2 ? (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-50 text-amber-700 font-bold text-xs">
                        3
                      </span>
                    ) : (
                      index + 1
                    )}
                  </td>
                  <td className="py-3 px-3 font-semibold text-slate-900">
                    {item.modelName}
                  </td>
                  <td className="py-3 px-3 text-right font-medium text-slate-600">
                    {item.qtyProduced.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right font-medium text-slate-900">
                    {item.qtySold.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-600">
                    {item.costPerPair.toFixed(0)} DA
                  </td>
                  <td className="py-3 px-3 text-right font-medium text-slate-900">
                    {item.avgSellingPrice.toLocaleString()} DA
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-emerald-700">
                    +{item.unitMargin.toLocaleString()} DA
                  </td>
                  <td className="py-3 px-3 text-right font-bold">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] ${
                        item.marginPercent >= 65
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.marginPercent >= 45
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {item.marginPercent.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-extrabold text-slate-900 text-sm">
                    {item.totalMargin.toLocaleString()} DA
                  </td>
                  <td className="py-3 px-3 text-center">
                    {item.status === 'tres_rentable' ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 flex items-center justify-center gap-1 mx-auto w-fit">
                        <Award className="w-3 h-3" />
                        Très rentable
                      </span>
                    ) : item.status === 'rentable' ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800 flex items-center justify-center gap-1 mx-auto w-fit">
                        Rentable
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800 flex items-center justify-center gap-1 mx-auto w-fit">
                        Marge faible
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
