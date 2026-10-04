import React, { useState, useMemo } from 'react';
import {
  Boxes,
  Layers,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Search,
  Filter,
  CheckCircle2,
  Info,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { SOUMELLE_SIZES } from '../../utils/productionCalculations';

export const SoumelleWorkflowTab: React.FC = () => {
  const { stockSoumelle, productionEntries, updateStockSoumelleQuantity } = useApp();
  const [selectedSizeFilter, setSelectedSizeFilter] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingQty, setEditingQty] = useState<number>(0);

  const soumelleEntries = productionEntries.filter((p) => p.material === 'SOUMELLE');

  // Compute aggregated quantities for each size (18 to 45)
  const sizeAggregation = useMemo(() => {
    const map: Record<number, { totalPairs: number; modelsCount: number; alertCount: number }> = {};
    SOUMELLE_SIZES.forEach((sz) => {
      map[sz] = { totalPairs: 0, modelsCount: 0, alertCount: 0 };
    });

    stockSoumelle.forEach((item) => {
      if (map[item.size]) {
        map[item.size].totalPairs += item.quantityPairs;
        map[item.size].modelsCount += 1;
        if (item.quantityPairs < item.minThreshold) {
          map[item.size].alertCount += 1;
        }
      }
    });

    return map;
  }, [stockSoumelle]);

  const totalSoumellePairs = stockSoumelle.reduce((acc, s) => acc + s.quantityPairs, 0);

  const filteredItems = stockSoumelle.filter((item) => {
    const matchesSize = selectedSizeFilter === null || item.size === selectedSizeFilter;
    const matchesSearch =
      item.modelName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.color.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.machineCode && item.machineCode.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSize && matchesSearch;
  });

  const handleStartEdit = (id: string, currentQty: number) => {
    setEditingItemId(id);
    setEditingQty(currentQty);
  };

  const handleSaveEdit = (id: string) => {
    updateStockSoumelleQuantity(id, editingQty);
    setEditingItemId(null);
  };

  return (
    <div className="space-y-6" id="soumelle-workflow-container">
      {/* Visual Workflow Steps & Strict Rules Notice */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Workflow SOUMELLE • Stockage par Pointure Unique (18 à 45)
              </h3>
              <p className="text-xs text-slate-500">
                Règle impérative : Ne jamais fusionner les différentes pointures dans le détail. Ne pas envoyer en cartons.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
            Traçabilité Pointure par Pointure
          </span>
        </div>

        {/* 3 Pipeline Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block mb-1">
              Étape 1 • Injection Soumelle
            </span>
            <h4 className="text-sm font-bold text-slate-900">Presses &amp; Moules TPR/Soumelle</h4>
            <p className="text-xs text-slate-600 mt-1">
              Saisie détaillée par pointure (de 18 à 45). Support Bicolor mono/bi-matière.
            </p>
            <div className="mt-2 text-xs font-mono font-semibold text-amber-900">
              {soumelleEntries.length} lots Soumelle produits
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Étape 2 • Contrôle &amp; Tri
            </span>
            <h4 className="text-sm font-bold text-slate-900">Contrôle Dimensionnel</h4>
            <p className="text-xs text-slate-600 mt-1">
              Vérification des retraits matière et tri unitaire par pointure identifiée.
            </p>
            <div className="mt-2 text-xs font-mono font-semibold text-emerald-700">
              Contrôle 100% sans mélange
            </div>
          </div>

          <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200">
            <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider block mb-1">
              Étape 3 • Stockage Direct
            </span>
            <h4 className="text-sm font-bold text-slate-900">Stock Soumelle (Bacs T18-T45)</h4>
            <p className="text-xs text-slate-600 mt-1">
              Alimentation directe des bacs et rayonnages d'assemblage. <strong>Jamais de cartons</strong>.
            </p>
            <div className="mt-2 text-xs font-mono font-black text-indigo-900">
              {totalSoumellePairs.toLocaleString()} paires en stock
            </div>
          </div>
        </div>
      </div>

      {/* Pointure Matrix (18 to 45) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Boxes className="w-4 h-4 text-amber-600" />
              Matrice Complète des Stocks Soumelle par Pointure (18 à 45)
            </h4>
            <p className="text-xs text-slate-500">
              Cliquez sur une pointure pour filtrer les références exactes ci-dessous
            </p>
          </div>
          {selectedSizeFilter !== null && (
            <button
              onClick={() => setSelectedSizeFilter(null)}
              className="px-2.5 py-1 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors font-medium"
            >
              Afficher toutes les pointures
            </button>
          )}
        </div>

        {/* 28 pointures (18 to 45) in interactive chips */}
        <div className="grid grid-cols-4 sm:grid-cols-7 md:grid-cols-10 lg:grid-cols-14 gap-2">
          {SOUMELLE_SIZES.map((sz) => {
            const data = sizeAggregation[sz] || { totalPairs: 0, modelsCount: 0, alertCount: 0 };
            const isSelected = selectedSizeFilter === sz;
            const isAlert = data.alertCount > 0 && data.totalPairs > 0;
            const isEmpty = data.totalPairs === 0;

            return (
              <button
                key={sz}
                onClick={() => setSelectedSizeFilter(isSelected ? null : sz)}
                className={`p-2 rounded-xl text-center border transition-all ${
                  isSelected
                    ? 'border-amber-600 bg-amber-500 text-white shadow-sm ring-2 ring-amber-300'
                    : isEmpty
                    ? 'border-slate-200 bg-slate-50 text-slate-400 hover:border-slate-300'
                    : isAlert
                    ? 'border-red-300 bg-red-50 text-red-900 hover:border-red-400'
                    : 'border-amber-200 bg-amber-50/60 text-slate-800 hover:border-amber-400'
                }`}
              >
                <span className={`block text-xs font-black ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                  T{sz}
                </span>
                <span
                  className={`block text-[11px] font-mono font-semibold mt-0.5 ${
                    isSelected ? 'text-white' : isEmpty ? 'text-slate-400' : 'text-amber-900'
                  }`}
                >
                  {data.totalPairs} p
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Detailed Stock Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              Détail des Emplacements &amp; Références Stock Soumelle
              {selectedSizeFilter && (
                <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-xs font-mono font-bold">
                  Filtré sur Pointure T{selectedSizeFilter}
                </span>
              )}
            </h4>
            <p className="text-xs text-slate-500">
              Traçabilité unitaire de chaque modèle/pointure avec emplacement dans l'atelier
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher modèle, couleur..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Pointure</th>
                <th className="px-4 py-3">Modèle Soumelle</th>
                <th className="px-4 py-3">Couleur(s)</th>
                <th className="px-4 py-3">Machine Origine</th>
                <th className="px-4 py-3">Emplacement Stock</th>
                <th className="px-4 py-3 text-right">Quantité (Paires)</th>
                <th className="px-4 py-3 text-right">Seuil Min</th>
                <th className="px-4 py-3 text-center">Statut</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                    Aucune semelle en stock pour les critères sélectionnés.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isLow = item.quantityPairs < item.minThreshold;
                  const isEditing = editingItemId === item.id;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3">
                        <span className="inline-block px-2.5 py-1 font-mono font-black text-xs rounded-lg bg-amber-100 text-amber-900 border border-amber-200">
                          T{item.size}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {item.modelName}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{item.color}</td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                        {item.machineCode || 'MACH-SOUM-01'}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-600">
                        {item.location || `Bac T${item.size}`}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1">
                            <input
                              type="number"
                              value={editingQty}
                              onChange={(e) => setEditingQty(parseInt(e.target.value) || 0)}
                              className="w-20 px-2 py-1 text-xs border rounded-md font-mono text-right"
                            />
                            <button
                              onClick={() => handleSaveEdit(item.id)}
                              className="px-2 py-1 text-[11px] font-bold bg-amber-600 text-white rounded-md"
                            >
                              OK
                            </button>
                          </div>
                        ) : (
                          <span className="font-mono font-black text-slate-900 text-sm">
                            {item.quantityPairs} paires
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-400">
                        {item.minThreshold} p
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isLow ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
                            <AlertTriangle className="w-3 h-3" />
                            Stock Faible
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            Normal
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!isEditing && (
                          <button
                            onClick={() => handleStartEdit(item.id, item.quantityPairs)}
                            className="px-2.5 py-1 text-[11px] text-amber-700 hover:bg-amber-50 border border-amber-300 rounded-md font-semibold transition-colors"
                          >
                            Ajuster
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
