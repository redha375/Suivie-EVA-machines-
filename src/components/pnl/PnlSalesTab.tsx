import React, { useState } from 'react';
import {
  Plus,
  Search,
  Filter,
  DollarSign,
  FileCheck,
  Clock,
  AlertCircle,
  Download,
  Trash2,
  Edit2,
  CheckCircle,
  X,
  CreditCard,
  User,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { SaleOrder, PaymentStatus } from '../../types';

interface PnlSalesTabProps {
  canEdit: boolean;
}

export const PnlSalesTab: React.FC<PnlSalesTabProps> = ({ canEdit }) => {
  const { sales, addSale, updateSale, deleteSale, referentialModels } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPaymentSale, setEditingPaymentSale] = useState<SaleOrder | null>(null);

  // Form state for new sale
  const [newDate, setNewDate] = useState(new Date().toISOString().substring(0, 10));
  const [newClient, setNewClient] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newCategory, setNewCategory] = useState('Homme');
  const [newSize, setNewSize] = useState('42');
  const [newQuantity, setNewQuantity] = useState<number>(100);
  const [newUnitPrice, setNewUnitPrice] = useState<number>(650);
  const [newDiscount, setNewDiscount] = useState<number>(0);
  const [newAmountPaid, setNewAmountPaid] = useState<number>(0);
  const [newPaymentMode, setNewPaymentMode] = useState<SaleOrder['paymentMode']>('Virement');
  const [newDeliveryStatus, setNewDeliveryStatus] = useState<SaleOrder['deliveryStatus']>('Livré');
  const [newInvoiceRef, setNewInvoiceRef] = useState(`FA-2026-${Math.floor(1000 + Math.random() * 9000)}`);
  const [newNotes, setNewNotes] = useState('');

  // Auto-calculated fields
  const calculatedTotal = Math.max(0, newQuantity * newUnitPrice - newDiscount);
  const calculatedRemaining = Math.max(0, calculatedTotal - newAmountPaid);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.trim() || newQuantity <= 0 || newUnitPrice <= 0) {
      alert('Veuillez renseigner un client, une quantité et un prix unitaire valides.');
      return;
    }

    addSale({
      date: newDate,
      client: newClient.trim(),
      modelName: newModel.trim() || 'Modèle CTP Standard',
      category: newCategory,
      size: newSize,
      quantity: newQuantity,
      unitPrice: newUnitPrice,
      discount: newDiscount,
      total: calculatedTotal,
      amountPaid: newAmountPaid,
      remainingAmount: calculatedRemaining,
      paymentMode: newPaymentMode,
      paymentStatus: calculatedRemaining <= 0 ? 'paye' : newAmountPaid > 0 ? 'partiel' : 'non_paye',
      deliveryStatus: newDeliveryStatus,
      invoiceRef: newInvoiceRef.trim(),
      notes: newNotes.trim(),
    });

    // Reset
    setShowAddModal(false);
    setNewClient('');
    setNewQuantity(100);
    setNewDiscount(0);
    setNewAmountPaid(0);
    setNewNotes('');
    setNewInvoiceRef(`FA-2026-${Math.floor(1000 + Math.random() * 9000)}`);
  };

  // Quick payment update
  const handleQuickPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPaymentSale) return;
    const additionalPaid = Number((e.target as any).additionalAmount.value) || 0;
    const totalPaid = Math.min(editingPaymentSale.total, (editingPaymentSale.amountPaid || 0) + additionalPaid);
    updateSale(editingPaymentSale.id, {
      amountPaid: totalPaid,
    });
    setEditingPaymentSale(null);
  };

  // Filtered sales
  const filteredSales = sales.filter((s) => {
    const matchSearch =
      s.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.invoiceRef.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.modelName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'all' || s.paymentStatus === statusFilter;
    return matchSearch && matchStatus;
  });

  // Summary figures
  const totalSalesRevenue = filteredSales.reduce((acc, s) => acc + s.total, 0);
  const totalReceived = filteredSales.reduce((acc, s) => acc + s.amountPaid, 0);
  const totalReceivables = filteredSales.reduce((acc, s) => acc + s.remainingAmount, 0);
  const totalPairsSold = filteredSales.reduce((acc, s) => acc + s.quantity, 0);

  return (
    <div className="space-y-6">
      {/* Top Banner Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">Total Facturé (Ventes)</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{totalSalesRevenue.toLocaleString()} DA</div>
          <div className="text-xs text-slate-500 mt-0.5">{totalPairsSold.toLocaleString()} paires expédiées</div>
        </div>

        <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-200">
          <div className="text-xs text-emerald-700 font-medium">Total Encaissé</div>
          <div className="text-2xl font-bold text-emerald-900 mt-1">{totalReceived.toLocaleString()} DA</div>
          <div className="text-xs text-emerald-700 mt-0.5">Liquidités perçues</div>
        </div>

        <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200">
          <div className="text-xs text-amber-700 font-medium">Créances Clients (Restes à payer)</div>
          <div className="text-2xl font-bold text-amber-900 mt-1">{totalReceivables.toLocaleString()} DA</div>
          <div className="text-xs text-amber-700 mt-0.5">En attente de règlement</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-medium">Factures émises</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{filteredSales.length}</div>
            <div className="text-xs text-slate-500 mt-0.5">Pièces commerciales</div>
          </div>
          {canEdit && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-lg flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Nouvelle Vente</span>
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
            placeholder="Rechercher client, modèle, facture..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs text-slate-500">Statut règlement :</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">Tous ({sales.length})</option>
            <option value="paye">Payé (Soldé)</option>
            <option value="partiel">Partiellement payé</option>
            <option value="non_paye">Non payé (En souffrance)</option>
          </select>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[11px]">
              <tr>
                <th className="py-3 px-3">Date / Facture</th>
                <th className="py-3 px-3">Client</th>
                <th className="py-3 px-3">Article / Modèle</th>
                <th className="py-3 px-3 text-right">Quantité</th>
                <th className="py-3 px-3 text-right">P.U (DA)</th>
                <th className="py-3 px-3 text-right">Total Net (DA)</th>
                <th className="py-3 px-3 text-right">Encaissé (DA)</th>
                <th className="py-3 px-3 text-right">Reste Dû (DA)</th>
                <th className="py-3 px-3">Règlement</th>
                <th className="py-3 px-3">Livraison</th>
                {canEdit && <th className="py-3 px-3 text-center">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-400">
                    Aucune vente ou facture enregistrée correspondant aux critères.
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="font-semibold text-slate-900">{sale.date}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{sale.invoiceRef}</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900">{sale.client}</div>
                      <div className="text-[11px] text-slate-500">{sale.paymentMode}</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-medium text-slate-900">{sale.modelName}</div>
                      <div className="text-[11px] text-slate-500">
                        {sale.category} • Pt. {sale.size || 'Mix'}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-medium">
                      {sale.quantity.toLocaleString()} paires
                    </td>
                    <td className="py-3 px-3 text-right">
                      {sale.unitPrice.toLocaleString()} DA
                      {sale.discount > 0 && (
                        <div className="text-[10px] text-rose-500">-{(sale.discount).toLocaleString()} DA</div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900">
                      {sale.total.toLocaleString()} DA
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-emerald-700">
                      {sale.amountPaid.toLocaleString()} DA
                    </td>
                    <td className="py-3 px-3 text-right font-bold">
                      {sale.remainingAmount > 0 ? (
                        <span className="text-amber-700">{sale.remainingAmount.toLocaleString()} DA</span>
                      ) : (
                        <span className="text-emerald-700 font-semibold text-[11px]">0 DA (Soldé)</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {sale.paymentStatus === 'paye' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                          Payé
                        </span>
                      ) : sale.paymentStatus === 'partiel' ? (
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
                      <span className="text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        {sale.deliveryStatus || 'Livré'}
                      </span>
                    </td>
                    {canEdit && (
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {sale.remainingAmount > 0 && (
                            <button
                              onClick={() => setEditingPaymentSale(sale)}
                              title="Enregistrer un encaissement"
                              className="p-1 text-emerald-700 hover:bg-emerald-50 rounded"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              if (confirm(`Confirmer la suppression de la vente ${sale.invoiceRef} ?`)) {
                                deleteSale(sale.id);
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

      {/* Modal: New Sale */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-2xl w-full p-5 space-y-4 my-8">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                Nouvelle Facture de Vente (Revenu Commercial)
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
                    className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Réf. Facture / Bon</label>
                  <input
                    type="text"
                    value={newInvoiceRef}
                    onChange={(e) => setNewInvoiceRef(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Nom du Client</label>
                  <input
                    type="text"
                    placeholder="Ex: Établissements Benali & Frères"
                    value={newClient}
                    onChange={(e) => setNewClient(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Modèle d'Article</label>
                  <input
                    type="text"
                    placeholder="Ex: Claquette EVA SB23"
                    value={newModel}
                    onChange={(e) => setNewModel(e.target.value)}
                    list="available-models"
                    className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                  <datalist id="available-models">
                    {referentialModels?.map((m) => (
                      <option key={m.id} value={m.name} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Catégorie</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Homme">Homme</option>
                    <option value="Femme">Femme</option>
                    <option value="Garçon">Garçon</option>
                    <option value="Fillette">Fillette</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Pointure</label>
                  <input
                    type="text"
                    value={newSize}
                    onChange={(e) => setNewSize(e.target.value)}
                    placeholder="Ex: 40-45"
                    className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Price and Calculation details */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Quantité (paires)</label>
                    <input
                      type="number"
                      min={1}
                      value={newQuantity}
                      onChange={(e) => setNewQuantity(Number(e.target.value))}
                      className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Prix Unitaire (DA)</label>
                    <input
                      type="number"
                      min={1}
                      value={newUnitPrice}
                      onChange={(e) => setNewUnitPrice(Number(e.target.value))}
                      className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Remise commerciale (DA)</label>
                    <input
                      type="number"
                      min={0}
                      value={newDiscount}
                      onChange={(e) => setNewDiscount(Number(e.target.value))}
                      className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t text-slate-800">
                  <span className="font-semibold">Montant Total Facturé (Calcul automatique) :</span>
                  <span className="font-bold text-base text-emerald-700">{calculatedTotal.toLocaleString()} DA</span>
                </div>
              </div>

              {/* Payment Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Montant Payé / Encaissé (DA)</label>
                  <input
                    type="number"
                    min={0}
                    max={calculatedTotal}
                    value={newAmountPaid}
                    onChange={(e) => setNewAmountPaid(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Mode de Paiement</label>
                  <select
                    value={newPaymentMode}
                    onChange={(e) => setNewPaymentMode(e.target.value as any)}
                    className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Virement">Virement bancaire</option>
                    <option value="Chèque">Chèque</option>
                    <option value="Espèces">Espèces</option>
                    <option value="Traite">Traite / Effet</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Statut Livraison</label>
                  <select
                    value={newDeliveryStatus}
                    onChange={(e) => setNewDeliveryStatus(e.target.value as any)}
                    className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Livré">Livré</option>
                    <option value="Expédié">Expédié</option>
                    <option value="En attente">En attente d'expédition</option>
                  </select>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
                <span className="text-emerald-800 font-medium">Reste à payer (Créance client calculée) :</span>
                <span className="font-bold text-amber-800">{calculatedRemaining.toLocaleString()} DA</span>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Notes / Conditions</label>
                <input
                  type="text"
                  placeholder="Échéance de paiement, bon de commande, transporteur..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500"
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
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg shadow-sm"
                >
                  Enregistrer la vente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Quick Payment Collection */}
      {editingPaymentSale && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                Encaisser Règlement Client
              </h3>
              <button
                onClick={() => setEditingPaymentSale(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickPaymentSubmit} className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                <div><span className="text-slate-500">Facture :</span> <strong className="text-slate-800">{editingPaymentSale.invoiceRef}</strong></div>
                <div><span className="text-slate-500">Client :</span> <strong className="text-slate-800">{editingPaymentSale.client}</strong></div>
                <div><span className="text-slate-500">Total facture :</span> {editingPaymentSale.total.toLocaleString()} DA</div>
                <div><span className="text-slate-500">Déjà payé :</span> {editingPaymentSale.amountPaid.toLocaleString()} DA</div>
                <div className="pt-1 border-t text-amber-800 font-bold">
                  Reste dû : {editingPaymentSale.remainingAmount.toLocaleString()} DA
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Montant encaissé supplémentaire (DA)</label>
                <input
                  type="number"
                  name="additionalAmount"
                  min={1}
                  max={editingPaymentSale.remainingAmount}
                  defaultValue={editingPaymentSale.remainingAmount}
                  className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingPaymentSale(null)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-700"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg shadow-sm"
                >
                  Confirmer l'encaissement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
