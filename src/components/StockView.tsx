import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Boxes,
  Plus,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  History,
  PackageCheck,
  Search,
  Check,
  Package,
  Layers,
} from 'lucide-react';
import { StockItem } from '../types';
import { SoumelleWorkflowTab } from './production/SoumelleWorkflowTab';
import { PVCWorkflowTab } from './production/PVCWorkflowTab';
import { RawMaterialsView } from './stock/RawMaterialsView';

export const StockView: React.FC = () => {
  const {
    t,
    stockItems,
    stockMovements,
    replenishStock,
    hasPermission,
    stockSoumelle,
    packagingCartons,
  } = useApp();

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedItemForReplenish, setSelectedItemForReplenish] = useState<StockItem | null>(null);
  const [replenishQty, setReplenishQty] = useState<number>(40);
  const [replenishReason, setReplenishReason] = useState<string>('Livraison fournisseur CTP');

  const filteredItems = stockItems.filter((item) => {
    if (activeCategory !== 'all' && item.category !== activeCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const lowStockItems = stockItems.filter((it) => it.quantity < it.minThreshold);
  const totalSoumellePairs = stockSoumelle.reduce((acc, s) => acc + s.quantityPairs, 0);
  const totalCartons = packagingCartons.reduce((acc, c) => acc + c.cartonsCount, 0);

  const handleConfirmReplenish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForReplenish) return;

    replenishStock(selectedItemForReplenish.id, replenishQty, replenishReason);
    setSelectedItemForReplenish(null);
  };

  return (
    <div className="space-y-6 pb-12" id="stock-view-container">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Boxes className="w-6 h-6 text-blue-600" />
            {t('stockOverview')}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Matières premières (sacs de 25 kg), Stock Soumelle unitaire par pointure (18 à 45) et Conditionnement Cartons PVC.
          </p>
        </div>

        {/* Low Stock Alert Indicator */}
        {lowStockItems.length > 0 && (
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold animate-pulse">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{lowStockItems.length} article(s) sous le seuil minimum !</span>
          </div>
        )}
      </div>

      {/* Category Pills & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs">
          {[
            { id: 'all', label: 'Tous les stocks' },
            { id: 'raw_materials_intelligent', label: '✨ Matières Premières & Stock (Intelligent)' },
            {
              id: 'stock_soumelle',
              label: `Stock Soumelle 18-45 (${totalSoumellePairs.toLocaleString()} p)`,
              badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
            },
            {
              id: 'conditionnement_cartons',
              label: `Cartons PVC (${totalCartons} cartons)`,
              badgeColor: 'bg-blue-100 text-blue-900 border-blue-300',
            },
            { id: 'matiere_premiere', label: 'Matières Premières (25kg)' },
            { id: 'produit_fini', label: 'Produits Finis (Paires)' },
            { id: 'colorant', label: 'Colorants & Additifs' },
            { id: 'piece_rechange', label: 'Pièces & Maintenance' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                activeCategory === cat.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {activeCategory !== 'stock_soumelle' && activeCategory !== 'conditionnement_cartons' && activeCategory !== 'raw_materials_intelligent' && (
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Rechercher matière, code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 text-slate-900 pl-9 pr-3 py-2 rounded-xl text-xs shadow-xs focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        )}
      </div>

      {/* RENDER RAW MATERIALS INTELLIGENT VIEW */}
      {activeCategory === 'raw_materials_intelligent' && <RawMaterialsView />}

      {/* RENDER SPECIFIC SOUMELLE VIEW */}
      {activeCategory === 'stock_soumelle' && <SoumelleWorkflowTab />}

      {/* RENDER SPECIFIC CARTONS VIEW */}
      {activeCategory === 'conditionnement_cartons' && <PVCWorkflowTab />}

      {/* REGULAR STOCK CARDS GRID (When not Soumelle or Cartons or Raw Materials) */}
      {activeCategory !== 'stock_soumelle' && activeCategory !== 'conditionnement_cartons' && activeCategory !== 'raw_materials_intelligent' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map((item) => {
              const isLow = item.quantity < item.minThreshold;

              return (
                <div
                  key={item.id}
                  className={`p-5 rounded-2xl border transition ${
                    isLow
                      ? 'bg-rose-50/40 border-rose-200 shadow-xs'
                      : 'bg-white border-slate-200 shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="text-[10px] font-mono text-blue-600 uppercase tracking-wider block font-semibold">
                        {item.code} • {item.location}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 mt-1">{item.name}</h3>
                    </div>

                    {isLow ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-rose-600" /> Seuil bas
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Normal
                      </span>
                    )}
                  </div>

                  {/* Quantities */}
                  <div className="flex items-baseline justify-between my-3 py-2.5 border-t border-b border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-medium">Stock Disponible</span>
                      <span className={`text-2xl font-bold font-mono ${isLow ? 'text-rose-600' : 'text-slate-900'}`}>
                        {item.quantity.toLocaleString()}
                      </span>
                      <span className="text-xs text-slate-500 ml-1.5 font-medium">
                        {item.unit === 'sacs_25kg'
                          ? 'sacs (25kg)'
                          : item.unit === 'paires'
                          ? 'paires'
                          : item.unit}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 block uppercase font-medium">Seuil Minimum</span>
                      <span className="text-sm font-bold font-mono text-slate-700">
                        {item.minThreshold.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-slate-400">
                      Mis à jour : {item.lastUpdated}
                    </span>

                    {hasPermission('stock') && (
                      <button
                        onClick={() => setSelectedItemForReplenish(item)}
                        className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1 shadow-xs transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Réapprovisionner</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Stock Movements Log */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <History className="w-4 h-4 text-blue-600" />
                Journal des Entrées / Sorties Récentes
              </h3>
              <span className="text-xs text-slate-500">Traçabilité complète</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase text-[10px] font-semibold tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Date &amp; Heure</th>
                    <th className="px-4 py-3">Article</th>
                    <th className="px-4 py-3">Type Mouvement</th>
                    <th className="px-4 py-3 text-right">Quantité</th>
                    <th className="px-4 py-3">Référence / Motif</th>
                    <th className="px-4 py-3">Opérateur</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {stockMovements.map((mov) => {
                    const isOut = mov.quantity < 0;

                    return (
                      <tr key={mov.id} className="hover:bg-slate-50/70 transition">
                        <td className="px-4 py-3 font-mono text-slate-500">{mov.date}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">{mov.itemName}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            isOut
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                            {isOut ? 'Sortie Production' : 'Entrée Réception'}
                          </span>
                        </td>
                        <td className={`px-4 py-3 text-right font-mono font-bold ${isOut ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {mov.quantity > 0 ? `+${mov.quantity}` : mov.quantity} {mov.unit}
                        </td>
                        <td className="px-4 py-3 text-slate-500">{mov.reference}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{mov.performedBy}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Modal: Replenish Stock */}
      {selectedItemForReplenish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Réapprovisionnement : {selectedItemForReplenish.name}
              </h3>
              <button
                onClick={() => setSelectedItemForReplenish(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmReplenish} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">
                  Quantité à ajouter ({selectedItemForReplenish.unit})
                </label>
                <input
                  type="number"
                  min={1}
                  value={replenishQty}
                  onChange={(e) => setReplenishQty(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 font-mono text-base font-bold focus:bg-white focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Motif / N° Bon de Réception</label>
                <input
                  type="text"
                  value={replenishReason}
                  onChange={(e) => setReplenishReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:bg-white focus:border-blue-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSelectedItemForReplenish(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs transition"
                >
                  Confirmer l'entrée
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
