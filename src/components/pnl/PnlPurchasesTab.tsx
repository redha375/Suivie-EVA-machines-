import React, { useState } from 'react';
import {
  Plus,
  Search,
  Filter,
  Boxes,
  Package,
  Trash2,
  X,
  CreditCard,
  Building2,
  CheckCircle,
  Truck,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PurchaseOrder, PurchaseType } from '../../types';

interface PnlPurchasesTabProps {
  canEdit: boolean;
}

export const PnlPurchasesTab: React.FC<PnlPurchasesTabProps> = ({ canEdit }) => {
  const { purchases, addPurchase, updatePurchase, deletePurchase, stockItems } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPaymentPurchase, setEditingPaymentPurchase] = useState<PurchaseOrder | null>(null);

  // Form state
  const [newDate, setNewDate] = useState(new Date().toISOString().substring(0, 10));
  const [newSupplier, setNewSupplier] = useState('');
  const [newType, setNewType] = useState<PurchaseType>('Matière première');
  const [newArticle, setNewArticle] = useState('');
  const [newStockItemId, setNewStockItemId] = useState<string>('');
  const [newQuantity, setNewQuantity] = useState<number>(1000);
  const [newUnit, setNewUnit] = useState('kg');
  const [newUnitPrice, setNewUnitPrice] = useState<number>(280);
  const [newAmountPaid, setNewAmountPaid] = useState<number>(0);
  const [newPaymentMode, setNewPaymentMode] = useState<PurchaseOrder['paymentMode']>('Virement');
  const [newReceiptStatus, setNewReceiptStatus] = useState<PurchaseOrder['receiptStatus']>('Reçu');
  const [newInvoiceRef, setNewInvoiceRef] = useState(`FAC-FOURN-${Math.floor(1000 + Math.random() * 9000)}`);
  const [newNotes, setNewNotes] = useState('');

  // When stock item selected, fill name & default unit
  const handleSelectStockItem = (id: string) => {
    setNewStockItemId(id);
    const item = stockItems.find((s) => s.id === id);
    if (item) {
      setNewArticle(item.name);
      setNewUnit(item.unit || 'kg');
      if (item.category === 'matiere_premiere') setNewType('Matière première');
      else if (item.category === 'piece_rechange') setNewType('Pièce de rechange');
    }
  };

  const calculatedTotal = newQuantity * newUnitPrice;
  const calculatedRemaining = Math.max(0, calculatedTotal - newAmountPaid);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplier.trim() || !newArticle.trim() || newQuantity <= 0 || newUnitPrice <= 0) {
      alert('Veuillez renseigner un fournisseur, un article, une quantité et un prix valides.');
      return;
    }

    addPurchase({
      date: newDate,
      supplier: newSupplier.trim(),
      type: newType,
      article: newArticle.trim(),
      stockItemId: newStockItemId || undefined,
      quantity: newQuantity,
      unit: newUnit,
      unitPrice: newUnitPrice,
      total: calculatedTotal,
      amountPaid: newAmountPaid,
      remainingAmount: calculatedRemaining,
      paymentMode: newPaymentMode,
      paymentStatus: calculatedRemaining <= 0 ? 'paye' : newAmountPaid > 0 ? 'partiel' : 'non_paye',
      receiptStatus: newReceiptStatus,
      invoiceRef: newInvoiceRef.trim(),
      notes: newNotes.trim(),
    });

    setShowAddModal(false);
    setNewSupplier('');
    setNewArticle('');
    setNewStockItemId('');
    setNewQuantity(1000);
    setNewAmountPaid(0);
    setNewNotes('');
    setNewInvoiceRef(`FAC-FOURN-${Math.floor(1000 + Math.random() * 9000)}`);
  };

  const handleQuickPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPaymentPurchase) return;
    const additionalPaid = Number((e.target as any).additionalAmount.value) || 0;
    const totalPaid = Math.min(editingPaymentPurchase.total, (editingPaymentPurchase.amountPaid || 0) + additionalPaid);
    updatePurchase(editingPaymentPurchase.id, {
      amountPaid: totalPaid,
    });
    setEditingPaymentPurchase(null);
  };

  const filteredPurchases = purchases.filter((p) => {
    const matchSearch =
      p.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.article.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.invoiceRef.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = typeFilter === 'all' || p.type === typeFilter;
    const matchStatus = statusFilter === 'all' || p.paymentStatus === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  const totalPurchasesAmount = filteredPurchases.reduce((acc, p) => acc + p.total, 0);
  const totalPaidToSuppliers = filteredPurchases.reduce((acc, p) => acc + p.amountPaid, 0);
  const totalPayablesDettes = filteredPurchases.reduce((acc, p) => acc + p.remainingAmount, 0);

  return (
    <div className="space-y-6">
      {/* Top Banner Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">Total Factures Achats</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{totalPurchasesAmount.toLocaleString()} DA</div>
          <div className="text-xs text-slate-500 mt-0.5">{filteredPurchases.length} commandes enregistrées</div>
        </div>

        <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-200">
          <div className="text-xs text-emerald-700 font-medium">Montant Déjà Réglé</div>
          <div className="text-2xl font-bold text-emerald-900 mt-1">{totalPaidToSuppliers.toLocaleString()} DA</div>
          <div className="text-xs text-emerald-700 mt-0.5">Décaissements fournisseurs</div>
        </div>

        <div className="bg-rose-50/70 p-4 rounded-xl border border-rose-200">
          <div className="text-xs text-rose-700 font-medium">Dettes Fournisseurs (Reste à payer)</div>
          <div className="text-2xl font-bold text-rose-900 mt-1">{totalPayablesDettes.toLocaleString()} DA</div>
          <div className="text-xs text-rose-700 mt-0.5">Engagements financiers à honorer</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-medium">Liaison Stock</div>
            <div className="text-base font-bold text-slate-900 mt-1">Directe & Automatique</div>
            <div className="text-xs text-emerald-600 font-medium mt-0.5">Incrémentation stocks immédiate</div>
          </div>
          {canEdit && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Nouvel Achat</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher fournisseur, article, facture..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500">Type :</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tous types</option>
              <option value="Matière première">Matière première</option>
              <option value="Pièce de rechange">Pièce de rechange</option>
              <option value="Emballage">Emballage</option>
              <option value="Consommable">Consommable</option>
              <option value="Autre">Autre</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500">Paiement :</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tous statuts</option>
              <option value="paye">Payé</option>
              <option value="partiel">Partiel</option>
              <option value="non_paye">Non payé</option>
            </select>
          </div>
        </div>
      </div>

      {/* Purchases Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[11px]">
              <tr>
                <th className="py-3 px-3">Date / Réf.</th>
                <th className="py-3 px-3">Fournisseur</th>
                <th className="py-3 px-3">Type & Article</th>
                <th className="py-3 px-3 text-right">Quantité</th>
                <th className="py-3 px-3 text-right">P.U (DA)</th>
                <th className="py-3 px-3 text-right">Total (DA)</th>
                <th className="py-3 px-3 text-right">Réglé (DA)</th>
                <th className="py-3 px-3 text-right">Dette Due (DA)</th>
                <th className="py-3 px-3">Paiement</th>
                <th className="py-3 px-3">Réception</th>
                {canEdit && <th className="py-3 px-3 text-center">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-400">
                    Aucun achat enregistré correspondant aux critères.
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((pur) => (
                  <tr key={pur.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="font-semibold text-slate-900">{pur.date}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{pur.invoiceRef}</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900">{pur.supplier}</div>
                      <div className="text-[11px] text-slate-500">{pur.paymentMode}</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-medium text-slate-900">{pur.article}</div>
                      <div className="text-[11px] text-blue-600 font-medium">{pur.type}</div>
                    </td>
                    <td className="py-3 px-3 text-right font-medium">
                      {pur.quantity.toLocaleString()} {pur.unit}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {pur.unitPrice.toLocaleString()} DA/{pur.unit}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900">
                      {pur.total.toLocaleString()} DA
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-emerald-700">
                      {pur.amountPaid.toLocaleString()} DA
                    </td>
                    <td className="py-3 px-3 text-right font-bold">
                      {pur.remainingAmount > 0 ? (
                        <span className="text-rose-700">{pur.remainingAmount.toLocaleString()} DA</span>
                      ) : (
                        <span className="text-emerald-700 font-semibold text-[11px]">0 DA (Réglé)</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {pur.paymentStatus === 'paye' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                          Payé
                        </span>
                      ) : pur.paymentStatus === 'partiel' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">
                          Partiel
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800">
                          Non payé
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1 w-fit">
                        <Truck className="w-3 h-3 text-slate-400" />
                        {pur.receiptStatus || 'Reçu'}
                      </span>
                    </td>
                    {canEdit && (
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {pur.remainingAmount > 0 && (
                            <button
                              onClick={() => setEditingPaymentPurchase(pur)}
                              title="Enregistrer un règlement fournisseur"
                              className="p-1 text-emerald-700 hover:bg-emerald-50 rounded"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              if (confirm(`Confirmer la suppression de l'achat ${pur.invoiceRef} ?`)) {
                                deletePurchase(pur.id);
                              }
                            }}
                            title="Supprimer"
                            className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: New Purchase */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-2xl w-full p-5 space-y-4 my-8">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Boxes className="w-5 h-5 text-blue-600" />
                Nouvelle Facture d'Achat (Matière & Approvisionnements)
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Date Facture</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Réf. Facture Fournisseur</label>
                  <input
                    type="text"
                    value={newInvoiceRef}
                    onChange={(e) => setNewInvoiceRef(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Fournisseur</label>
                  <input
                    type="text"
                    placeholder="Ex: SARL Plastiques Maghreb"
                    value={newSupplier}
                    onChange={(e) => setNewSupplier(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Stock item selection for direct linking */}
              <div className="bg-blue-50/60 p-3 rounded-lg border border-blue-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-blue-900 flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-blue-600" />
                    Lier directement à un article de Stock (Optionnel mais recommandé)
                  </span>
                  <span className="text-[11px] text-blue-700">Mise à jour immédiate du stock</span>
                </div>
                <select
                  value={newStockItemId}
                  onChange={(e) => handleSelectStockItem(e.target.value)}
                  className="w-full border border-blue-300 bg-white rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Sélectionner un article de l'inventaire --</option>
                  {stockItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} (Stock actuel: {item.quantity} {item.unit}) - Catégorie: {item.category}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Type d'achat</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Matière première">Matière première (EVA, PVC...)</option>
                    <option value="Pièce de rechange">Pièce de rechange machine</option>
                    <option value="Emballage">Emballage (Cartons, ruban...)</option>
                    <option value="Consommable">Consommable atelier</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Désignation de l'article</label>
                  <input
                    type="text"
                    placeholder="Ex: EVA Granulés Blanc Vierge"
                    value={newArticle}
                    onChange={(e) => setNewArticle(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Unité</label>
                  <select
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="kg">kg</option>
                    <option value="pièce">pièce</option>
                    <option value="carton">carton</option>
                    <option value="litre">litre</option>
                    <option value="rouleau">rouleau</option>
                  </select>
                </div>
              </div>

              {/* Price & Calculations */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Quantité achetée</label>
                    <input
                      type="number"
                      min={1}
                      value={newQuantity}
                      onChange={(e) => setNewQuantity(Number(e.target.value))}
                      className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Prix Unitaire (DA / {newUnit})</label>
                    <input
                      type="number"
                      min={1}
                      value={newUnitPrice}
                      onChange={(e) => setNewUnitPrice(Number(e.target.value))}
                      className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t text-slate-800">
                  <span className="font-semibold">Total Achat (Calcul automatique) :</span>
                  <span className="font-bold text-base text-blue-700">{calculatedTotal.toLocaleString()} DA</span>
                </div>
              </div>

              {/* Payment Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Montant Réglé au Fournisseur (DA)</label>
                  <input
                    type="number"
                    min={0}
                    max={calculatedTotal}
                    value={newAmountPaid}
                    onChange={(e) => setNewAmountPaid(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Mode de Paiement</label>
                  <select
                    value={newPaymentMode}
                    onChange={(e) => setNewPaymentMode(e.target.value as any)}
                    className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Virement">Virement bancaire</option>
                    <option value="Chèque">Chèque</option>
                    <option value="Espèces">Espèces</option>
                    <option value="Traite">Traite / Effet</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Statut Réception</label>
                  <select
                    value={newReceiptStatus}
                    onChange={(e) => setNewReceiptStatus(e.target.value as any)}
                    className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Reçu">Reçu en magasin</option>
                    <option value="En cours">En cours de transport</option>
                    <option value="En commande">En commande fournisseur</option>
                  </select>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-between text-xs">
                <span className="text-rose-800 font-medium">Dette Fournisseur (Reste à payer calculé) :</span>
                <span className="font-bold text-rose-900">{calculatedRemaining.toLocaleString()} DA</span>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Notes / Échéance de paiement</label>
                <input
                  type="text"
                  placeholder="Échéance à 30 jours, bon de livraison, n° lot fournisseur..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm"
                >
                  Enregistrer l'achat & Mettre à jour Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Quick Payment to Supplier */}
      {editingPaymentPurchase && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-blue-600" />
                Régler Dette Fournisseur
              </h3>
              <button
                onClick={() => setEditingPaymentPurchase(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickPaymentSubmit} className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                <div><span className="text-slate-500">Facture :</span> <strong className="text-slate-800">{editingPaymentPurchase.invoiceRef}</strong></div>
                <div><span className="text-slate-500">Fournisseur :</span> <strong className="text-slate-800">{editingPaymentPurchase.supplier}</strong></div>
                <div><span className="text-slate-500">Total achat :</span> {editingPaymentPurchase.total.toLocaleString()} DA</div>
                <div><span className="text-slate-500">Déjà réglé :</span> {editingPaymentPurchase.amountPaid.toLocaleString()} DA</div>
                <div className="pt-1 border-t text-rose-800 font-bold">
                  Dette restante : {editingPaymentPurchase.remainingAmount.toLocaleString()} DA
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Montant à régler (DA)</label>
                <input
                  type="number"
                  name="additionalAmount"
                  min={1}
                  max={editingPaymentPurchase.remainingAmount}
                  defaultValue={editingPaymentPurchase.remainingAmount}
                  className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingPaymentPurchase(null)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-700"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm"
                >
                  Valider le paiement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
