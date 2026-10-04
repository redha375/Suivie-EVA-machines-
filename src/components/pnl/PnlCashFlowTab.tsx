import React, { useState } from 'react';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Plus,
  TrendingUp,
  AlertCircle,
  Building,
  CheckCircle,
  Clock,
  X,
  DollarSign,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { CashFlowMovement, CashFlowType } from '../../types';

interface PnlCashFlowTabProps {
  canEdit: boolean;
}

export const PnlCashFlowTab: React.FC<PnlCashFlowTabProps> = ({ canEdit }) => {
  const { cashFlowMovements, addCashFlowMovement, sales, purchases, expenses } = useApp();

  const [showAddModal, setShowAddModal] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');

  // Form state
  const [newDate, setNewDate] = useState(new Date().toISOString().substring(0, 10));
  const [newType, setNewType] = useState<CashFlowType>('entree');
  const [newCategory, setNewCategory] = useState('Encaissement client');
  const [newAmount, setNewAmount] = useState<number>(100000);
  const [newDescription, setNewDescription] = useState('');
  const [newAccount, setNewAccount] = useState<CashFlowMovement['account']>('Banque CPA');
  const [newReference, setNewReference] = useState(`TR-${Math.floor(1000 + Math.random() * 9000)}`);

  // Calculate actual cash positions
  const totalInflows = cashFlowMovements
    .filter((m) => m.type === 'entree')
    .reduce((acc, m) => acc + m.amount, 0);

  const totalOutflows = cashFlowMovements
    .filter((m) => m.type === 'sortie')
    .reduce((acc, m) => acc + m.amount, 0);

  const netCashBalance = totalInflows - totalOutflows;

  // Account balances
  const cpaBalance = cashFlowMovements
    .filter((m) => m.account === 'Banque CPA')
    .reduce((acc, m) => acc + (m.type === 'entree' ? m.amount : -m.amount), 0);

  const bnaBalance = cashFlowMovements
    .filter((m) => m.account === 'Banque BNA')
    .reduce((acc, m) => acc + (m.type === 'entree' ? m.amount : -m.amount), 0);

  const cashDeskBalance = cashFlowMovements
    .filter((m) => m.account === 'Caisse Usine')
    .reduce((acc, m) => acc + (m.type === 'entree' ? m.amount : -m.amount), 0);

  // 30-Day Forecast (Prévisionnel à 30 jours)
  // Expected incoming = Uncollected client receivables
  const expectedInflows30d = sales.reduce((acc, s) => acc + (s.remainingAmount || 0), 0);
  // Expected outgoing = Unpaid supplier debts + pending expenses
  const supplierDebts = purchases.reduce((acc, p) => acc + (p.remainingAmount || 0), 0);
  const pendingExpenses = expenses.filter((e) => e.status === 'en_attente').reduce((acc, e) => acc + e.amount, 0);
  const expectedOutflows30d = supplierDebts + pendingExpenses;

  const forecastedBalance30d = netCashBalance + expectedInflows30d - expectedOutflows30d;

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newAmount <= 0 || !newDescription.trim()) {
      alert('Veuillez renseigner une description et un montant valides.');
      return;
    }

    addCashFlowMovement({
      date: newDate,
      type: newType,
      category: newCategory,
      amount: newAmount,
      description: newDescription.trim(),
      account: newAccount,
      reference: newReference.trim(),
    });

    setShowAddModal(false);
    setNewDescription('');
    setNewReference(`TR-${Math.floor(1000 + Math.random() * 9000)}`);
  };

  const filteredMovements = cashFlowMovements.filter((m) => {
    if (filterType === 'all') return true;
    return m.type === filterType;
  });

  return (
    <div className="space-y-6">
      {/* Current Liquid Cash KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">Position de Trésorerie Nette</div>
          <div className={`text-2xl font-bold mt-1 ${netCashBalance >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
            {netCashBalance.toLocaleString()} DA
          </div>
          <div className="text-xs text-slate-500 mt-0.5">Disponibilités liquides globales</div>
        </div>

        <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-200">
          <div className="text-xs text-emerald-700 font-medium">Total Entrées (Encaissements)</div>
          <div className="text-2xl font-bold text-emerald-900 mt-1">+{totalInflows.toLocaleString()} DA</div>
          <div className="text-xs text-emerald-700 mt-0.5">Ventes & règlements clients</div>
        </div>

        <div className="bg-rose-50/70 p-4 rounded-xl border border-rose-200">
          <div className="text-xs text-rose-700 font-medium">Total Sorties (Décaissements)</div>
          <div className="text-2xl font-bold text-rose-900 mt-1">-{totalOutflows.toLocaleString()} DA</div>
          <div className="text-xs text-rose-700 mt-0.5">Fournisseurs, salaires & charges</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-medium">Comptes Trésorerie</div>
            <div className="text-sm font-bold text-slate-900 mt-1">CPA, BNA, Caisse</div>
            <div className="text-xs text-slate-500 mt-0.5">3 comptes actifs</div>
          </div>
          {canEdit && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-lg flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Mouvement Caisse</span>
            </button>
          )}
        </div>
      </div>

      {/* Account Breakdown Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase">Banque CPA (Principal)</span>
            <Building className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 mt-2">{cpaBalance.toLocaleString()} DA</div>
          <div className="text-[11px] text-slate-500 mt-1">Virements clients & fournisseurs majeurs</div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase">Banque BNA</span>
            <Building className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 mt-2">{bnaBalance.toLocaleString()} DA</div>
          <div className="text-[11px] text-slate-500 mt-1">Compte secondaire opérations</div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase">Caisse Espèces Usine</span>
            <Wallet className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 mt-2">{cashDeskBalance.toLocaleString()} DA</div>
          <div className="text-[11px] text-slate-500 mt-1">Petite caisse dépenses immédiates atelier</div>
        </div>
      </div>

      {/* 30-Day Forecast Box */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-400" />
          <h3 className="font-bold text-sm">Prévisionnel de Trésorerie à 30 Jours</h3>
        </div>
        <p className="text-xs text-slate-300 mt-1">
          Projection automatique calculée à partir des créances clients à encaisser et des dettes fournisseurs / charges à échéance.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-4">
          <div className="bg-white/10 p-3 rounded-lg border border-white/10">
            <div className="text-[11px] text-slate-300">Solde Initial Actuel</div>
            <div className="text-base font-bold text-white mt-0.5">{netCashBalance.toLocaleString()} DA</div>
          </div>
          <div className="bg-white/10 p-3 rounded-lg border border-white/10">
            <div className="text-[11px] text-emerald-300">+ Encaissements prévus (Créances)</div>
            <div className="text-base font-bold text-emerald-400 mt-0.5">+{expectedInflows30d.toLocaleString()} DA</div>
          </div>
          <div className="bg-white/10 p-3 rounded-lg border border-white/10">
            <div className="text-[11px] text-rose-300">- Décaissements prévus (Dettes + Charges)</div>
            <div className="text-base font-bold text-rose-400 mt-0.5">-{expectedOutflows30d.toLocaleString()} DA</div>
          </div>
          <div className="bg-indigo-950/80 p-3 rounded-lg border border-indigo-400/40">
            <div className="text-[11px] text-indigo-200">Solde Projeté à 30J</div>
            <div className={`text-base font-extrabold mt-0.5 ${forecastedBalance30d >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
              {forecastedBalance30d.toLocaleString()} DA
            </div>
          </div>
        </div>
      </div>

      {/* Movements Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Historique des Flux de Trésorerie
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                filterType === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              Tous ({cashFlowMovements.length})
            </button>
            <button
              onClick={() => setFilterType('entree')}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                filterType === 'entree' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              Entrées
            </button>
            <button
              onClick={() => setFilterType('sortie')}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                filterType === 'sortie' ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              Sorties
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[11px]">
              <tr>
                <th className="py-3 px-3">Date / Réf.</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Catégorie</th>
                <th className="py-3 px-3">Description</th>
                <th className="py-3 px-3">Compte</th>
                <th className="py-3 px-3 text-right">Montant (DA)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredMovements.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-3 whitespace-nowrap">
                    <div className="font-semibold text-slate-900">{m.date}</div>
                    <div className="text-[11px] text-slate-500 font-mono">{m.reference || 'N/A'}</div>
                  </td>
                  <td className="py-3 px-3">
                    {m.type === 'entree' ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1 w-fit">
                        <ArrowUpRight className="w-3 h-3" />
                        Entrée
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 flex items-center gap-1 w-fit">
                        <ArrowDownLeft className="w-3 h-3" />
                        Sortie
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 font-medium text-slate-800">{m.category}</td>
                  <td className="py-3 px-3 text-slate-600">{m.description}</td>
                  <td className="py-3 px-3">
                    <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                      {m.account}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-sm">
                    {m.type === 'entree' ? (
                      <span className="text-emerald-700">+{m.amount.toLocaleString()} DA</span>
                    ) : (
                      <span className="text-rose-600">-{m.amount.toLocaleString()} DA</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: New Cash Movement */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Wallet className="w-4 h-4 text-emerald-600" />
                Nouveau Mouvement de Trésorerie
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Sens du Flux</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 font-semibold"
                  >
                    <option value="entree">🟢 Entrée (+ Encaissement)</option>
                    <option value="sortie">🔴 Sortie (- Décaissement)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Compte affecté</label>
                  <select
                    value={newAccount}
                    onChange={(e) => setNewAccount(e.target.value as any)}
                    className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Banque CPA">Banque CPA</option>
                    <option value="Banque BNA">Banque BNA</option>
                    <option value="Caisse Usine">Caisse Usine</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Catégorie</label>
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Montant (DA)</label>
                <input
                  type="number"
                  min={1}
                  value={newAmount}
                  onChange={(e) => setNewAmount(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 font-bold text-sm"
                  required
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Description / Motif</label>
                <input
                  type="text"
                  placeholder="Ex: Alimentation caisse usine, virement client spécial..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-700"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg shadow-sm"
                >
                  Enregistrer le mouvement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
