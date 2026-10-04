import React, { useState } from 'react';
import {
  Plus,
  Search,
  Filter,
  FileText,
  Trash2,
  X,
  CreditCard,
  Building,
  CheckCircle2,
  Clock,
  PieChart,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ExpenseRecord, ExpenseCategory, ExpenseDepartment } from '../../types';

export const EXPENSE_CATEGORIES_LIST: ExpenseCategory[] = [
  'Salaires',
  'Électricité',
  'Gaz',
  'Eau',
  'Loyer',
  'Maintenance',
  'Pièces de rechange',
  'Transport',
  'Carburant',
  'Emballage',
  'Consommables',
  'Restauration',
  'Sécurité',
  'Assurance',
  'Téléphone / Internet',
  'Marketing',
  'Taxes',
  'CNAS',
  'Divers',
];

export const EXPENSE_DEPARTMENTS_LIST: ExpenseDepartment[] = [
  'Production',
  'Maintenance',
  'Qualité',
  'Magasin',
  'Administration',
  'Commercial',
  'Direction',
];

interface PnlExpensesTabProps {
  canEdit: boolean;
}

export const PnlExpensesTab: React.FC<PnlExpensesTabProps> = ({ canEdit }) => {
  const { expenses, addExpense, updateExpense, deleteExpense } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state
  const [newDate, setNewDate] = useState(new Date().toISOString().substring(0, 10));
  const [newCategory, setNewCategory] = useState<ExpenseCategory>('Électricité');
  const [newDepartment, setNewDepartment] = useState<ExpenseDepartment>('Production');
  const [newDescription, setNewDescription] = useState('');
  const [newAmount, setNewAmount] = useState<number>(50000);
  const [newBeneficiary, setNewBeneficiary] = useState('');
  const [newPaymentMode, setNewPaymentMode] = useState<ExpenseRecord['paymentMode']>('Virement');
  const [newStatus, setNewStatus] = useState<ExpenseRecord['status']>('paye');
  const [newReference, setNewReference] = useState(`DEP-2026-${Math.floor(1000 + Math.random() * 9000)}`);
  const [newNotes, setNewNotes] = useState('');

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDescription.trim() || newAmount <= 0) {
      alert('Veuillez renseigner une description et un montant valides.');
      return;
    }

    addExpense({
      date: newDate,
      category: newCategory,
      department: newDepartment,
      description: newDescription.trim(),
      amount: newAmount,
      beneficiary: newBeneficiary.trim() || 'Fournisseur / Prestataire',
      paymentMode: newPaymentMode,
      status: newStatus,
      reference: newReference.trim(),
      notes: newNotes.trim(),
    });

    setShowAddModal(false);
    setNewDescription('');
    setNewBeneficiary('');
    setNewNotes('');
    setNewReference(`DEP-2026-${Math.floor(1000 + Math.random() * 9000)}`);
  };

  const filteredExpenses = expenses.filter((e) => {
    const matchSearch =
      e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.beneficiary.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.reference && e.reference.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchCat = categoryFilter === 'all' || e.category === categoryFilter;
    const matchDept = deptFilter === 'all' || e.department === deptFilter;
    return matchSearch && matchCat && matchDept;
  });

  const totalExpenseSum = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);
  const totalPaidSum = filteredExpenses.filter((e) => e.status === 'paye').reduce((acc, e) => acc + e.amount, 0);
  const totalPendingSum = filteredExpenses.filter((e) => e.status === 'en_attente').reduce((acc, e) => acc + e.amount, 0);

  // Category breakdown top 5
  const catBreakdown: Record<string, number> = {};
  filteredExpenses.forEach((e) => {
    catBreakdown[e.category] = (catBreakdown[e.category] || 0) + e.amount;
  });
  const topCategories = Object.entries(catBreakdown).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Top Banner Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">Total Dépenses Enregistrées</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{totalExpenseSum.toLocaleString()} DA</div>
          <div className="text-xs text-slate-500 mt-0.5">{filteredExpenses.length} justificatifs comptabilisés</div>
        </div>

        <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-200">
          <div className="text-xs text-emerald-700 font-medium">Dépenses Réglées</div>
          <div className="text-2xl font-bold text-emerald-900 mt-1">{totalPaidSum.toLocaleString()} DA</div>
          <div className="text-xs text-emerald-700 mt-0.5">Décaissements effectués</div>
        </div>

        <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200">
          <div className="text-xs text-amber-700 font-medium">Dépenses En Attente</div>
          <div className="text-2xl font-bold text-amber-900 mt-1">{totalPendingSum.toLocaleString()} DA</div>
          <div className="text-xs text-amber-700 mt-0.5">À régler sous peu</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-medium">19 Catégories d'exploitation</div>
            <div className="text-sm font-bold text-slate-900 mt-1">Salaires, Énergie, Loyer...</div>
            <div className="text-xs text-slate-500 mt-0.5">Ventilation analytique</div>
          </div>
          {canEdit && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs rounded-lg flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Nouvelle Dépense</span>
            </button>
          )}
        </div>
      </div>

      {/* Mini Visual Breakdown of Top Categories */}
      {topCategories.length > 0 && (
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
          <div className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
            <PieChart className="w-4 h-4 text-slate-500" />
            Top Postes de Dépenses
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {topCategories.map(([cat, amount]) => (
              <div key={cat} className="bg-white p-2.5 rounded-lg border border-slate-200">
                <div className="text-[11px] font-semibold text-slate-600 truncate">{cat}</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">{amount.toLocaleString()} DA</div>
                <div className="text-[10px] text-slate-400">
                  {totalExpenseSum > 0 ? ((amount / totalExpenseSum) * 100).toFixed(1) : 0}% du total
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher description, bénéficiaire, réf..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500">Catégorie :</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              <option value="all">Toutes catégories (19)</option>
              {EXPENSE_CATEGORIES_LIST.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500">Département :</span>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              <option value="all">Tous départements</option>
              {EXPENSE_DEPARTMENTS_LIST.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[11px]">
              <tr>
                <th className="py-3 px-3">Date / Réf.</th>
                <th className="py-3 px-3">Catégorie</th>
                <th className="py-3 px-3">Description</th>
                <th className="py-3 px-3">Département</th>
                <th className="py-3 px-3">Bénéficiaire</th>
                <th className="py-3 px-3 text-right">Montant (DA)</th>
                <th className="py-3 px-3">Mode</th>
                <th className="py-3 px-3">Statut</th>
                {canEdit && <th className="py-3 px-3 text-center">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Aucune dépense enregistrée correspondant aux critères.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="font-semibold text-slate-900">{exp.date}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{exp.reference || 'N/A'}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-medium text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-medium text-slate-900">{exp.description}</div>
                      {exp.notes && <div className="text-[11px] text-slate-500 italic">{exp.notes}</div>}
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-[11px] text-slate-600">{exp.department}</span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="text-slate-800 font-medium">{exp.beneficiary}</div>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900">
                      {exp.amount.toLocaleString()} DA
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="text-[11px] text-slate-600">{exp.paymentMode}</span>
                    </td>
                    <td className="py-3 px-3">
                      {exp.status === 'paye' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                          Payé
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">
                          En attente
                        </span>
                      )}
                    </td>
                    {canEdit && (
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {exp.status === 'en_attente' && (
                            <button
                              onClick={() => updateExpense(exp.id, { status: 'paye' })}
                              title="Marquer comme payé"
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              if (confirm(`Confirmer la suppression de la dépense ${exp.description} ?`)) {
                                deleteExpense(exp.id);
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

      {/* Modal: New Expense */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-2xl w-full p-5 space-y-4 my-8">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <FileText className="w-5 h-5 text-rose-600" />
                Nouvelle Dépense d'Exploitation
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
                  <label className="block font-medium text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-rose-500"
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Catégorie (19 postes)</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-rose-500"
                  >
                    {EXPENSE_CATEGORIES_LIST.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Département affecté</label>
                  <select
                    value={newDepartment}
                    onChange={(e) => setNewDepartment(e.target.value as any)}
                    className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-rose-500"
                  >
                    {EXPENSE_DEPARTMENTS_LIST.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Description / Motif</label>
                <input
                  type="text"
                  placeholder="Ex: Facture Sonelgaz Énergie Électrique EVA 1 & 2 - Août 2026"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-rose-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Montant Dépensé (DA)</label>
                  <input
                    type="number"
                    min={1}
                    value={newAmount}
                    onChange={(e) => setNewAmount(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-rose-500 font-bold text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Bénéficiaire / Prestataire</label>
                  <input
                    type="text"
                    placeholder="Ex: Sonelgaz / Propriétaire / Salariés"
                    value={newBeneficiary}
                    onChange={(e) => setNewBeneficiary(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Réf. Pièce / Facture</label>
                  <input
                    type="text"
                    value={newReference}
                    onChange={(e) => setNewReference(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Mode de Paiement</label>
                  <select
                    value={newPaymentMode}
                    onChange={(e) => setNewPaymentMode(e.target.value as any)}
                    className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="Virement">Virement bancaire</option>
                    <option value="Chèque">Chèque</option>
                    <option value="Espèces">Espèces (Petite caisse)</option>
                    <option value="Carte">Carte bancaire</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Statut Règlement</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as any)}
                    className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="paye">Payé (Décaissé immédiatement)</option>
                    <option value="en_attente">En attente de paiement</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Notes Complémentaires</label>
                <input
                  type="text"
                  placeholder="Justificatif annexé, approbation direction..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-rose-500"
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
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-lg shadow-sm"
                >
                  Enregistrer la dépense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
