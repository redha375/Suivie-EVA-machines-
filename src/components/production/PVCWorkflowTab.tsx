import React, { useState } from 'react';
import {
  Package,
  Layers,
  CheckCircle2,
  Boxes,
  ArrowRight,
  TrendingUp,
  Clock,
  Printer,
  ShieldCheck,
  Search,
  Filter,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const PVCWorkflowTab: React.FC = () => {
  const { packagingCartons, updatePackagingCartonStatus, productionEntries } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const pvcEntries = productionEntries.filter((p) => p.material === 'PVC');

  const filteredCartons = packagingCartons.filter((c) => {
    const matchesSearch =
      c.modelName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.batchNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalCartons = packagingCartons.reduce((sum, c) => sum + c.cartonsCount, 0);
  const totalConformingPairs = packagingCartons.reduce((sum, c) => sum + c.totalConformingPairs, 0);

  return (
    <div className="space-y-6" id="pvc-workflow-container">
      {/* Visual Workflow Steps */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Workflow de Production PVC &amp; Conditionnement Cartons
              </h3>
              <p className="text-xs text-slate-500">
                Règle : Production exprimée en paires → Calcul automatique du nombre de cartons selon la configuration du modèle
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            Pipeline Automatisé
          </span>
        </div>

        {/* 4 Pipeline Steps */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2">
          <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 relative">
            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block mb-1">
              Étape 1 • Injection
            </span>
            <h4 className="text-sm font-bold text-slate-900">Presses &amp; Moules PVC</h4>
            <p className="text-xs text-slate-600 mt-1">
              Modèle, couleurs, pointure et moule(s). Comptage en paires conformes.
            </p>
            <div className="mt-2 text-xs font-mono font-semibold text-blue-900">
              {pvcEntries.length} lots PVC enregistrés
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 relative">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Étape 2 • Contrôle
            </span>
            <h4 className="text-sm font-bold text-slate-900">Validation Conforme</h4>
            <p className="text-xs text-slate-600 mt-1">
              Élimination des rebuts. Seules les paires conformes entrent au conditionnement.
            </p>
            <div className="mt-2 text-xs font-mono font-semibold text-emerald-700">
              {totalConformingPairs.toLocaleString()} paires validées
            </div>
          </div>

          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 relative">
            <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider block mb-1">
              Étape 3 • Cartons
            </span>
            <h4 className="text-sm font-bold text-slate-900">Module Conditionnement</h4>
            <p className="text-xs text-slate-600 mt-1">
              Calcul automatique : Paires conformes ÷ Paires/carton (20 ou 24).
            </p>
            <div className="mt-2 text-xs font-mono font-semibold text-amber-900">
              {totalCartons} cartons préparés
            </div>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 relative">
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block mb-1">
              Étape 4 • Expédition
            </span>
            <h4 className="text-sm font-bold text-slate-900">Stock Produits Finis</h4>
            <p className="text-xs text-slate-600 mt-1">
              Mise en stock automatique par palette avec étiquettes codes-barres.
            </p>
            <div className="mt-2 text-xs font-mono font-semibold text-emerald-800">
              Prêt pour logistique
            </div>
          </div>
        </div>
      </div>

      {/* Cartons Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-600" />
              Registre des Cartons Conditionnés PVC
            </h4>
            <p className="text-xs text-slate-500">
              Chaque lot conforme PVC génère son lot de cartons avec reliquat éventuel
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filtrer par modèle, lot..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
            >
              <option value="all">Tous statuts</option>
              <option value="conditionne">Conditionné</option>
              <option value="en_cours">En cours</option>
              <option value="pret_expedition">Prêt expédition</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Numéro de Lot</th>
                <th className="px-4 py-3">Modèle &amp; Couleur</th>
                <th className="px-4 py-3 text-center">Pointure</th>
                <th className="px-4 py-3 text-right">Paires Conformes</th>
                <th className="px-4 py-3 text-right">Règle Carton</th>
                <th className="px-4 py-3 text-right font-bold text-blue-900">Nombre Cartons</th>
                <th className="px-4 py-3 text-right">Paires Restantes</th>
                <th className="px-4 py-3 text-center">Statut</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredCartons.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                    Aucun enregistrement de conditionnement PVC pour l'instant.
                  </td>
                </tr>
              ) : (
                filteredCartons.map((carton) => (
                  <tr key={carton.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-slate-900">
                      {carton.batchNumber}
                      <span className="block text-[10px] text-slate-400 font-normal">{carton.date}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{carton.modelName}</div>
                      <div className="text-[11px] text-slate-500">{carton.color}</div>
                    </td>
                    <td className="px-4 py-3 text-center font-mono">
                      {carton.size ? `T${carton.size}` : 'Assorti'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">
                      {carton.totalConformingPairs} paires
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {carton.pairsPerCarton} paires/carton
                      <span className="block text-[10px] text-slate-400">{carton.cartonType}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-black text-blue-700 text-sm">
                      {carton.cartonsCount} cartons
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-amber-700">
                      {carton.remainderPairs > 0 ? `+${carton.remainderPairs} p` : '0 p'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          carton.status === 'pret_expedition'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : carton.status === 'conditionne'
                            ? 'bg-blue-100 text-blue-800 border border-blue-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}
                      >
                        {carton.status === 'pret_expedition'
                          ? 'Prêt expédition'
                          : carton.status === 'conditionne'
                          ? 'Conditionné'
                          : 'En cours'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {carton.status === 'conditionne' ? (
                        <button
                          onClick={() => updatePackagingCartonStatus(carton.id, 'pret_expedition')}
                          className="px-2.5 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-50 border border-blue-300 rounded-md transition-colors"
                        >
                          Expédier Stock
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400">Archivé</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
