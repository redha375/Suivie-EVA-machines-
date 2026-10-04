import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { CtpCommercialOrder } from '../../types';
import {
  Briefcase,
  FileText,
  Printer,
  Plus,
  Search,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  Truck,
  Box,
  Coins,
  Building2,
  Calendar,
  Layers,
  Filter,
  Lock,
  AlertCircle,
  AlertTriangle,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import { CtpInvoiceModal } from './CtpInvoiceModal';
import { getPairsPerCarton } from '../../data/ctpFactoryErpData';

export const CtpCommercialView: React.FC = () => {
  const {
    ctpOrders,
    addCtpOrder,
    updateCtpOrderStatus,
    deleteCtpOrder,
    restoreDefaultErpData,
    ctpStockAuto,
    ctpCatalogue,
  } = useApp();

  // Active modal for PDF generation
  const [activeModal, setActiveModal] = useState<{
    order: CtpCommercialOrder;
    type: 'bl' | 'facture';
  } | null>(null);

  // Form states for new order
  const [showOrderForm, setShowOrderForm] = useState<boolean>(false);
  const [client, setClient] = useState<string>('Grossiste Chaussures Constantine SARL');
  const [commandeRef, setCommandeRef] = useState<string>(`CMD-2026-00${ctpOrders.length + 1}`);
  const [modele, setModele] = useState<string>('NM');
  const [pointure, setPointure] = useState<string>('40-44');
  const [qteCommandee, setQteCommandee] = useState<number>(600);
  const [prixPaire, setPrixPaire] = useState<number>(480);
  const [notes, setNotes] = useState<string>('');
  const [feedback, setFeedback] = useState<string | null>(null);

  // Filters & sorting
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  type SortKey = 'commande' | 'client' | 'modele' | 'pointure' | 'qte_commandee' | 'qte_produite' | 'reste_a_produire' | 'prix_paire' | 'prix_carton' | 'total' | 'statut';
  const [sortKey, setSortKey] = useState<SortKey>('commande');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Dynamic calculations in form
  const isNM = modele.toUpperCase().includes('NM') || modele.toUpperCase() === 'NM';
  const formPairesParCarton = isNM ? 12 : getPairsPerCarton(modele, pointure);
  const formPrixCarton = prixPaire * formPairesParCarton; // Formule: prix_paire * 12 = prix_carton pour NM
  const formTotal = qteCommandee * prixPaire;
  const formCartons = Math.floor(qteCommandee / formPairesParCarton);

  // Check against CLOSED stock only (MANDATORY REQUIREMENT)
  const selectedStockItem = ctpStockAuto.find(
    (s) => s.modele.toUpperCase() === modele.toUpperCase() && s.pointure === pointure
  );
  const availableStockFermePaires = selectedStockItem ? selectedStockItem.stock_ferme_paires : 0;
  const availableStockFermeCartons = selectedStockItem ? selectedStockItem.stock_ferme_cartons : 0;
  const isStockInsuffisant = qteCommandee > availableStockFermePaires;

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!client || !commandeRef || qteCommandee <= 0) return;

    const res = addCtpOrder({
      client,
      commande: commandeRef,
      modele,
      pointure,
      qte_commandee: Number(qteCommandee),
      qte_produite: 0,
      reste_a_produire: Number(qteCommandee),
      prix_paire: Number(prixPaire),
      prix_carton: formPrixCarton,
      total: formTotal,
      statut: 'En production',
      date: new Date().toISOString().split('T')[0],
      notes,
    });

    setFeedback(res.message);
    setShowOrderForm(false);
    setCommandeRef(`CMD-2026-00${ctpOrders.length + 2}`);
    setTimeout(() => setFeedback(null), 5000);
  };

  // Filtered & Sorted orders
  const filteredOrders = useMemo(() => {
    return ctpOrders.filter((ord) => {
      const matchSearch =
        ord.client.toLowerCase().includes(searchFilter.toLowerCase()) ||
        ord.commande.toLowerCase().includes(searchFilter.toLowerCase()) ||
        ord.modele.toLowerCase().includes(searchFilter.toLowerCase()) ||
        ord.pointure.toLowerCase().includes(searchFilter.toLowerCase());

      const matchStatus = statusFilter === 'all' || ord.statut === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [ctpOrders, searchFilter, statusFilter]);

  const sortedOrders = useMemo(() => {
    return [...filteredOrders].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }
      const strA = String(valA || '');
      const strB = String(valB || '');
      return sortDirection === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
  }, [filteredOrders, sortKey, sortDirection]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
  };

  // Financial KPIs
  const totalChiffreAffaires = ctpOrders.reduce((acc, o) => acc + o.total, 0);
  const totalCommandesPaires = ctpOrders.reduce((acc, o) => acc + o.qte_commandee, 0);
  const totalResteAProduire = ctpOrders.reduce((acc, o) => acc + o.reste_a_produire, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-slate-800">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 bg-blue-500/20 text-blue-300 text-xs font-semibold rounded border border-blue-400/30 uppercase tracking-wider">
                Module 3 • Ventes & Expéditions
              </span>
              <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 text-xs font-semibold rounded border border-emerald-400/30">
                Calcul Prix : Prix Paire × 12 = Prix Carton
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Interface Commercial & Commandes Clients
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              Catalogue des stocks prêts à vendre en cartons & paires, gestion des commandes, et génération immédiate des{' '}
              <strong className="text-blue-300">Bons de Livraison (BL)</strong> et{' '}
              <strong className="text-emerald-300">Factures PDF</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                restoreDefaultErpData();
                setFeedback('Synchronisation effectuée : Toutes les fiches commandes initiales sont restaurées.');
                setTimeout(() => setFeedback(''), 4000);
              }}
              className="px-3.5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
              title="Restaurer et synchroniser les commandes commerciales CTP"
            >
              <RotateCcw className="w-4 h-4 text-slate-400" />
              <span>Synchro Fiches Commandes</span>
            </button>

            <button
              onClick={() => setShowOrderForm(!showOrderForm)}
              className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-blue-500/20"
            >
              <Plus className="w-5 h-5" />
              <span>{showOrderForm ? 'Fermer le formulaire' : 'Nouvelle Commande Client'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Top Financial Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Carnet de Commandes</span>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {totalChiffreAffaires.toLocaleString('fr-FR')} <span className="text-sm font-normal text-slate-500">DZD</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{ctpOrders.length} commandes enregistrées</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Coins className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Volume Total Commandé</span>
            <div className="text-2xl font-black text-blue-700 mt-1">
              {totalCommandesPaires.toLocaleString('fr-FR')} <span className="text-sm font-normal text-slate-500">paires</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              ~ {Math.floor(totalCommandesPaires / 12).toLocaleString('fr-FR')} cartons (base 12)
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Box className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Reste à Produire</span>
            <div className="text-2xl font-black text-indigo-700 mt-1">
              {totalResteAProduire.toLocaleString('fr-FR')} <span className="text-sm font-normal text-slate-500">paires</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">À planifier sur machines EVA 1/2/3</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* SECTION 1 : STOCK DISPONIBLE À VENDRE (Cartons FERMÉS Uniquement) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold text-slate-900">
              Disponibilité Immédiate en Stock FERMÉ (Vendable Uniquement)
            </h2>
          </div>
          <span className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg font-medium">
            Le commercial voit EXCLUSIVEMENT les cartons scellés par l'Équipe C
          </span>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {ctpStockAuto.map((s) => {
              const sIsNM = s.modele.toUpperCase().includes('NM') || s.modele.toUpperCase() === 'NM';
              const pairesParCarton = s.paires_par_carton;
              const prixUnitaireEstime = sIsNM ? 450 : 420;
              const prixCartonEstime = prixUnitaireEstime * pairesParCarton;

              return (
                <div
                  key={`comm-stk-${s.modele}-${s.pointure}`}
                  className={`p-4 rounded-xl border transition-all ${
                    s.isAlert
                      ? 'bg-rose-50/40 border-rose-200'
                      : 'bg-slate-50/60 border-slate-200 hover:border-emerald-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-bold uppercase text-slate-500">{s.modele}</span>
                      <h4 className="font-extrabold text-slate-900 text-base">Pointure {s.pointure}</h4>
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                      {pairesParCarton} p/ctn
                    </span>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-200/80 space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Cartons fermés :</span>
                      <span className="font-bold text-emerald-700">{s.stock_ferme_cartons} cartons</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Paires vendables :</span>
                      <span className="font-semibold text-slate-900">{s.stock_ferme_paires.toLocaleString('fr-FR')} p.</span>
                    </div>
                    <div className="flex justify-between text-slate-600 pt-1">
                      <span>Prix carton ({pairesParCarton}p) :</span>
                      <span className="font-bold text-slate-900">{prixCartonEstime.toLocaleString('fr-FR')} DZD</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* SECTION 2 : FORMULAIRE NOUVELLE COMMANDE CLIENT */}
      {showOrderForm && (
        <div className="bg-white rounded-2xl border-2 border-blue-600 shadow-xl overflow-hidden animate-fade-in">
          <div className="px-6 py-4 bg-blue-600 text-white flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-base">
              <Plus className="w-5 h-5" />
              <span>Créer une Nouvelle Commande Client (Calcul Automatique Prix Carton)</span>
            </div>
            <button
              onClick={() => setShowOrderForm(false)}
              className="text-white/80 hover:text-white text-xs font-bold uppercase tracking-wider"
            >
              Fermer
            </button>
          </div>

          <form onSubmit={handleCreateOrder} className="p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Nom du Client
                </label>
                <input
                  type="text"
                  value={client}
                  onChange={(e) => setClient(e.target.value)}
                  placeholder="Ex : Chaussures El Bahia SARL"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Référence Commande
                </label>
                <input
                  type="text"
                  value={commandeRef}
                  onChange={(e) => setCommandeRef(e.target.value)}
                  placeholder="Ex : CMD-2026-005"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Modèle
                </label>
                <select
                  value={modele}
                  onChange={(e) => setModele(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="NM">NM (Standard 12 paires)</option>
                  <option value="BC07">BC07 (16 paires)</option>
                  <option value="SB101">SB101 (24 paires)</option>
                  <option value="SB23">SB23 (24 paires)</option>
                  <option value="003">003 MOCASSIN (14 paires)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Pointure
                </label>
                <select
                  value={pointure}
                  onChange={(e) => setPointure(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {isNM ? (
                    <>
                      <option value="40-44">40-44 Homme</option>
                      <option value="36-41">36-41 Femme</option>
                      <option value="36-39">36-39 Kadet</option>
                      <option value="28-35">28-35 Fillette/Garçon</option>
                    </>
                  ) : (
                    <>
                      <option value="28-35">28-35</option>
                      <option value="36-41">36-41</option>
                      <option value="39-44">39-44</option>
                      <option value="23-28">23-28</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            {/* Quantité & Calculs financiers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Quantité Commandée (Paires)
                </label>
                <input
                  type="number"
                  min={1}
                  step={formPairesParCarton}
                  value={qteCommandee}
                  onChange={(e) => setQteCommandee(Number(e.target.value))}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Prix Paire (DZD)
                </label>
                <input
                  type="number"
                  min={1}
                  value={prixPaire}
                  onChange={(e) => setPrixPaire(Number(e.target.value))}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Prix Carton Automatique (prix_paire * 12) */}
              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200">
                <span className="text-[10px] font-bold uppercase text-amber-800 block">
                  Prix Carton (Prix Paire × {formPairesParCarton})
                </span>
                <span className="text-xl font-black text-amber-900">
                  {formPrixCarton.toLocaleString('fr-FR')} DZD
                </span>
                <span className="text-[11px] text-amber-700 block mt-0.5">
                  {formCartons} cartons commandés
                </span>
              </div>

              {/* Total commande */}
              <div className="bg-blue-50 p-3 rounded-xl border border-blue-200">
                <span className="text-[10px] font-bold uppercase text-blue-800 block">
                  Montant Total HT
                </span>
                <span className="text-xl font-black text-blue-900">
                  {formTotal.toLocaleString('fr-FR')} DZD
                </span>
                <span className="text-[11px] text-blue-700 block mt-0.5">Net à facturer</span>
              </div>
            </div>

            {/* ALERTE STOCK INSUFFISANT (MANDATORY REQUIREMENT) */}
            {isStockInsuffisant ? (
              <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-xl text-xs text-rose-900 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-extrabold text-sm text-rose-700">
                    Alerte : Stock Fermé Insuffisant !
                  </div>
                  <p>
                    Stock fermé disponible pour <strong>{modele} pointure {pointure}</strong> :{' '}
                    <strong className="text-emerald-700">{availableStockFermeCartons} cartons</strong> ({availableStockFermePaires.toLocaleString('fr-FR')} paires).
                  </p>
                  <p className="text-rose-800 font-semibold">
                    Quantité demandée : {qteCommandee.toLocaleString('fr-FR')} paires. 
                    Déficit à produire : <span className="underline font-bold text-rose-950">{(qteCommandee - availableStockFermePaires).toLocaleString('fr-FR')} paires</span>.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>Stock disponible suffisant :</strong> {availableStockFermeCartons} cartons fermés ({availableStockFermePaires.toLocaleString('fr-FR')} paires) en magasin prêts pour allocation immédiate.
                </span>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowOrderForm(false)}
                className="px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md transition-colors"
              >
                Enregistrer la Commande
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SECTION 3 : TABLEAU DES COMMANDES ET GÉNÉRATION PDF (BL + FACTURE) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Table des Commandes & Édition des Documents Officiels
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Cliquez sur les boutons d'action pour générer le <strong>Bon de Livraison (BL)</strong> ou la{' '}
              <strong>Facture PDF</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher client, commande..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="pl-9 pr-3.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-48 sm:w-56"
              />
            </div>

            {/* Filter status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-700 font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="all">Tous les statuts</option>
              <option value="Prêt">Prêt pour expédition</option>
              <option value="En production">En cours de production</option>
              <option value="Livré">Livré</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider select-none">
                <th
                  onClick={() => handleSort('commande')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>N° Commande</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('client')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Client</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('modele')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Modèle</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('pointure')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Pointure</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('qte_commandee')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Qté Cde</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('qte_produite')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors text-right text-emerald-700"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Produit</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('reste_a_produire')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors text-right text-amber-700"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Reste</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('prix_paire')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors text-right"
                >
                  <span>Prix/Paire</span>
                </th>
                <th
                  onClick={() => handleSort('prix_carton')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors text-right"
                >
                  <span>Prix/Carton</span>
                </th>
                <th
                  onClick={() => handleSort('total')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors text-right font-bold"
                >
                  <span>Total HT</span>
                </th>
                <th className="py-3 px-3 text-center">Statut</th>
                <th className="py-3 px-4 text-center">Documents Officiels</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {sortedOrders.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400">
                    Aucune commande client trouvée.
                  </td>
                </tr>
              ) : (
                sortedOrders.map((ord) => {
                  const isNM = ord.modele.toUpperCase().includes('NM') || ord.modele.toUpperCase() === 'NM';
                  const baseCarton = isNM ? 12 : 16;
                  const ctnCount = Math.floor(ord.qte_commandee / baseCarton);

                  return (
                    <tr key={ord.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {ord.commande}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800 whitespace-nowrap">
                        {ord.client}
                      </td>
                      <td className="py-3.5 px-3 font-bold text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <span>{ord.modele}</span>
                          {isNM && (
                            <span className="px-1 py-0.2 rounded text-[9px] font-black bg-amber-100 text-amber-900">
                              12p
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-3 font-semibold text-slate-700 whitespace-nowrap">
                        {ord.pointure}
                      </td>
                      <td className="py-3.5 px-3 text-right font-bold text-slate-900 whitespace-nowrap">
                        {ord.qte_commandee.toLocaleString('fr-FR')} p.
                        <span className="text-[10px] text-slate-400 block font-normal">
                          ({ctnCount} ctns)
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right font-bold text-emerald-700 whitespace-nowrap">
                        {ord.qte_produite.toLocaleString('fr-FR')} p.
                      </td>
                      <td className="py-3.5 px-3 text-right font-bold text-amber-600 whitespace-nowrap">
                        {ord.reste_a_produire === 0 ? (
                          <span className="text-emerald-600">0 (Prêt)</span>
                        ) : (
                          `${ord.reste_a_produire.toLocaleString('fr-FR')} p.`
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-right text-xs text-slate-600 font-mono whitespace-nowrap">
                        {ord.prix_paire.toLocaleString('fr-FR')} DZD
                      </td>
                      <td className="py-3.5 px-3 text-right text-xs font-bold text-slate-900 font-mono whitespace-nowrap">
                        {ord.prix_carton.toLocaleString('fr-FR')} DZD
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-blue-900 whitespace-nowrap">
                        {ord.total.toLocaleString('fr-FR')} DZD
                      </td>
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            ord.statut === 'Prêt'
                              ? 'bg-emerald-100 text-emerald-800'
                              : ord.statut === 'En production'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {ord.statut}
                        </span>
                      </td>
                      {/* BOUTONS BL + FACTURE PDF */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Bouton BL PDF */}
                          <button
                            onClick={() => setActiveModal({ order: ord, type: 'bl' })}
                            className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors shadow-sm"
                            title="Générer Bon de Livraison (BL) officiel"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            <span>BL PDF</span>
                          </button>

                          {/* Bouton Facture PDF */}
                          <button
                            onClick={() => setActiveModal({ order: ord, type: 'facture' })}
                            className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors shadow-sm"
                            title="Générer Facture commerciale officielle"
                          >
                            <FileText className="w-3.5 h-3.5 text-blue-400" />
                            <span>Facture</span>
                          </button>

                          {/* Bouton Supprimer Commande */}
                          <button
                            onClick={() => {
                              deleteCtpOrder(ord.id);
                              setFeedback(`Commande ${ord.commande} supprimée.`);
                              setTimeout(() => setFeedback(''), 3000);
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors ml-1"
                            title="Supprimer cette commande"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL IMPRESSION / EXPORT PDF (BL OU FACTURE) */}
      {activeModal && (
        <CtpInvoiceModal
          order={activeModal.order}
          type={activeModal.type}
          onClose={() => setActiveModal(null)}
        />
      )}
    </div>
  );
};
