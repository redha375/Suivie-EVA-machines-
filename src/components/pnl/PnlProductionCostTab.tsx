import React, { useState } from 'react';
import {
  Layers,
  Zap,
  Users,
  Package,
  Wrench,
  HelpCircle,
  TrendingDown,
  Cpu,
  BarChart3,
  Calendar,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PnlPeriodFilter } from '../../types';
import { isDateInPeriod } from './pnlCalculations';

interface PnlProductionCostTabProps {
  period: PnlPeriodFilter;
  customStart?: string;
  customEnd?: string;
}

export const PnlProductionCostTab: React.FC<PnlProductionCostTabProps> = ({
  period,
  customStart,
  customEnd,
}) => {
  const { productionEntries, stockItems, purchases } = useApp();

  // Unit cost parameters (can be tuned dynamically)
  const [avgMaterialPriceKg, setAvgMaterialPriceKg] = useState<number>(280);
  const [laborCostPerPair, setLaborCostPerPair] = useState<number>(75);
  const [packagingCostPerPair, setPackagingCostPerPair] = useState<number>(18);
  const [energyCostPerPair, setEnergyCostPerPair] = useState<number>(32);
  const [maintenanceCostPerPair, setMaintenanceCostPerPair] = useState<number>(16);
  const [otherCostPerPair, setOtherCostPerPair] = useState<number>(10);

  // Filter production entries by period
  const filteredProd = productionEntries.filter((p) =>
    isDateInPeriod(p.date, period, '2026-09-06', customStart, customEnd)
  );

  // Aggregate production
  const totalGrossPairs = filteredProd.reduce((acc, p) => acc + (p.pairsProduced || p.cyclesCount * 2 || 0), 0);
  const totalNetPairs = filteredProd.reduce((acc, p) => acc + (p.qtyConforming !== undefined ? p.qtyConforming : (p.pairsProduced || 0)), 0);
  const totalScrapPairs = filteredProd.reduce((acc, p) => acc + (p.qtyRejected || 0), 0);
  const totalMaterialKg = filteredProd.reduce((acc, p) => acc + (p.materialConsumedKg || 0), 0);

  // Total calculated cost components
  const totalMaterialCost = totalMaterialKg > 0 ? totalMaterialKg * avgMaterialPriceKg : totalNetPairs * 55;
  const totalLaborCost = totalNetPairs * laborCostPerPair;
  const totalPackagingCost = totalNetPairs * packagingCostPerPair;
  const totalEnergyCost = totalNetPairs * energyCostPerPair;
  const totalMaintenanceCost = totalNetPairs * maintenanceCostPerPair;
  const totalOtherCost = totalNetPairs * otherCostPerPair;

  const totalProductionCost =
    totalMaterialCost +
    totalLaborCost +
    totalPackagingCost +
    totalEnergyCost +
    totalMaintenanceCost +
    totalOtherCost;

  const costPerPair = totalNetPairs > 0 ? totalProductionCost / totalNetPairs : 0;

  // Breakdown by Machine (EVA 1, EVA 2, EVA 3...)
  const machineBreakdown: Record<
    string,
    { pairsNet: number; materialKg: number; count: number }
  > = {};

  filteredProd.forEach((p) => {
    const m = p.machine || 'EVA 1';
    if (!machineBreakdown[m]) {
      machineBreakdown[m] = { pairsNet: 0, materialKg: 0, count: 0 };
    }
    machineBreakdown[m].pairsNet += p.qtyConforming !== undefined ? p.qtyConforming : (p.pairsProduced || 0);
    machineBreakdown[m].materialKg += p.materialConsumedKg || 0;
    machineBreakdown[m].count += 1;
  });

  return (
    <div className="space-y-6">
      {/* Header formula explanation */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-5 rounded-xl shadow-md">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/30 text-blue-200 border border-blue-400/30">
            Formule Industrielle CTP
          </span>
          <span className="text-xs text-blue-200">Injection Directe EVA & PVC</span>
        </div>
        <h2 className="text-xl font-bold mt-1">Calcul Réel du Coût de Production & Matières</h2>
        <p className="text-xs text-blue-100/80 mt-1 max-w-3xl leading-relaxed">
          <strong>Coût Production</strong> = Matière Première (kg consommés × Prix moyen) + Main-d'œuvre + Emballage + Énergie (électricité compresseurs) + Maintenance + Autres coûts d'atelier.
        </p>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-blue-950/50 p-3 rounded-lg border border-blue-400/20">
            <div className="text-[11px] text-blue-200">Production Nette</div>
            <div className="text-xl font-bold text-white mt-0.5">{totalNetPairs.toLocaleString()} paires</div>
          </div>
          <div className="bg-blue-950/50 p-3 rounded-lg border border-blue-400/20">
            <div className="text-[11px] text-blue-200">Matière Consommée</div>
            <div className="text-xl font-bold text-white mt-0.5">{totalMaterialKg.toLocaleString()} kg</div>
          </div>
          <div className="bg-blue-950/50 p-3 rounded-lg border border-blue-400/20">
            <div className="text-[11px] text-blue-200">Coût Global Production</div>
            <div className="text-xl font-bold text-emerald-300 mt-0.5">{totalProductionCost.toLocaleString()} DA</div>
          </div>
          <div className="bg-blue-950/50 p-3 rounded-lg border border-blue-400/20">
            <div className="text-[11px] text-blue-200">Coût Moyen / Paire</div>
            <div className="text-xl font-bold text-amber-300 mt-0.5">{costPerPair.toFixed(1)} DA / paire</div>
          </div>
        </div>
      </div>

      {/* Cost Decomposition Grid (6 components) */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <h3 className="font-bold text-slate-900 text-sm mb-4 flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-600" />
          Décomposition Analytique du Coût de Production
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 1. Matière Première */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase">1. Matière Première</span>
              <Package className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-xl font-bold text-slate-900">{totalMaterialCost.toLocaleString()} DA</div>
            <div className="text-xs text-slate-500">
              {totalMaterialKg.toLocaleString()} kg consommés × {avgMaterialPriceKg} DA/kg
            </div>
            <div className="pt-2 border-t flex items-center justify-between text-xs">
              <span className="text-slate-500">Prix unitaire kg :</span>
              <input
                type="number"
                value={avgMaterialPriceKg}
                onChange={(e) => setAvgMaterialPriceKg(Number(e.target.value))}
                className="w-20 px-1.5 py-0.5 text-right border border-slate-300 rounded text-xs"
              />
            </div>
          </div>

          {/* 2. Main d'œuvre directe */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase">2. Main-d'œuvre Directe</span>
              <Users className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-xl font-bold text-slate-900">{totalLaborCost.toLocaleString()} DA</div>
            <div className="text-xs text-slate-500">
              Opérateurs presses, chefs d'équipe, ébavurage
            </div>
            <div className="pt-2 border-t flex items-center justify-between text-xs">
              <span className="text-slate-500">Taux / paire :</span>
              <input
                type="number"
                value={laborCostPerPair}
                onChange={(e) => setLaborCostPerPair(Number(e.target.value))}
                className="w-20 px-1.5 py-0.5 text-right border border-slate-300 rounded text-xs"
              />
            </div>
          </div>

          {/* 3. Emballage & Cartons */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase">3. Emballage & Conditionnement</span>
              <Package className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl font-bold text-slate-900">{totalPackagingCost.toLocaleString()} DA</div>
            <div className="text-xs text-slate-500">
              Cartons maîtres, sachets individuels, étiquettes
            </div>
            <div className="pt-2 border-t flex items-center justify-between text-xs">
              <span className="text-slate-500">Taux / paire :</span>
              <input
                type="number"
                value={packagingCostPerPair}
                onChange={(e) => setPackagingCostPerPair(Number(e.target.value))}
                className="w-20 px-1.5 py-0.5 text-right border border-slate-300 rounded text-xs"
              />
            </div>
          </div>

          {/* 4. Énergie (Électricité & Chauffage moules) */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase">4. Énergie & Fluides</span>
              <Zap className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-xl font-bold text-slate-900">{totalEnergyCost.toLocaleString()} DA</div>
            <div className="text-xs text-slate-500">
              Résistances moules, compresseurs, moteurs injection
            </div>
            <div className="pt-2 border-t flex items-center justify-between text-xs">
              <span className="text-slate-500">Taux / paire :</span>
              <input
                type="number"
                value={energyCostPerPair}
                onChange={(e) => setEnergyCostPerPair(Number(e.target.value))}
                className="w-20 px-1.5 py-0.5 text-right border border-slate-300 rounded text-xs"
              />
            </div>
          </div>

          {/* 5. Maintenance & Usure */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase">5. Maintenance Atelier</span>
              <Wrench className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-xl font-bold text-slate-900">{totalMaintenanceCost.toLocaleString()} DA</div>
            <div className="text-xs text-slate-500">
              Démoulant silicone, joints téflon, vérins, graisses
            </div>
            <div className="pt-2 border-t flex items-center justify-between text-xs">
              <span className="text-slate-500">Taux / paire :</span>
              <input
                type="number"
                value={maintenanceCostPerPair}
                onChange={(e) => setMaintenanceCostPerPair(Number(e.target.value))}
                className="w-20 px-1.5 py-0.5 text-right border border-slate-300 rounded text-xs"
              />
            </div>
          </div>

          {/* 6. Autres Coûts */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase">6. Autres Coûts Directs</span>
              <HelpCircle className="w-4 h-4 text-purple-500" />
            </div>
            <div className="text-xl font-bold text-slate-900">{totalOtherCost.toLocaleString()} DA</div>
            <div className="text-xs text-slate-500">
              Consommables divers, outillage d'ébavurage
            </div>
            <div className="pt-2 border-t flex items-center justify-between text-xs">
              <span className="text-slate-500">Taux / paire :</span>
              <input
                type="number"
                value={otherCostPerPair}
                onChange={(e) => setOtherCostPerPair(Number(e.target.value))}
                className="w-20 px-1.5 py-0.5 text-right border border-slate-300 rounded text-xs"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Breakdown per Machine (EVA 1 / EVA 2 / EVA 3) */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <h3 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-slate-600" />
          Répartition des Coûts par Presse & Machine (Atelier)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Object.entries(machineBreakdown).map(([machineName, stats]) => {
            const machineCost = stats.pairsNet * costPerPair;
            return (
              <div key={machineName} className="p-4 rounded-xl border border-slate-200 bg-slate-50/70">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">{machineName}</span>
                  <span className="text-xs font-medium text-slate-500">{stats.count} shift(s)</span>
                </div>
                <div className="mt-2 space-y-1 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Paires conformes :</span>
                    <strong className="text-slate-900">{stats.pairsNet.toLocaleString()} paires</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Matière consommée :</span>
                    <strong className="text-slate-900">{stats.materialKg.toLocaleString()} kg</strong>
                  </div>
                  <div className="flex justify-between pt-1 border-t text-slate-800">
                    <span className="font-semibold">Coût de revient machine :</span>
                    <strong className="text-blue-700 font-bold">{machineCost.toLocaleString()} DA</strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
