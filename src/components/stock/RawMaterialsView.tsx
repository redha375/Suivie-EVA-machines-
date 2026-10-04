import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Boxes,
  AlertTriangle,
  Plus,
  Search,
  ShoppingCart,
  Layers,
  History,
  TrendingDown,
  Warehouse,
  ShieldAlert,
  CheckCircle2,
  RefreshCw,
  Tag,
  Calendar,
  Truck,
  FileText,
  Clock,
  ArrowDownRight,
  ArrowUpRight,
  Sliders,
  DollarSign,
  Camera,
  X,
  Sparkles,
  ClipboardList,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import {
  RawMaterialStockItem,
  RawMaterialType,
  StockMovement,
  ProductionRequest,
  ProductionRequestStatus,
} from '../../types';

export const RawMaterialsView: React.FC = () => {
  const {
    rawMaterialsStock,
    addRawMaterialStock,
    updateRawMaterialStock,
    deleteRawMaterialStock,
    stockMovements,
    logStockMovement,
    cancelStockMovement,
    productionRequests,
    addProductionRequest,
    updateProductionRequestStatus,
    addPurchase,
    currentUser,
    hasPermission,
    setActiveTab,
  } = useApp();

  // Navigation Sub-tabs
  const [activeTab, setActiveSubTab] = useState<'materials' | 'alerts' | 'traceability' | 'orders'>('materials');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState<boolean>(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState<boolean>(false);
  const [selectedItemForOrder, setSelectedItemForOrder] = useState<RawMaterialStockItem | null>(null);
  const [selectedItemForAdjust, setSelectedItemForAdjust] = useState<RawMaterialStockItem | null>(null);

  // Form State: Add Raw Material
  const [newMatType, setNewMatType] = useState<RawMaterialType>('EVA');
  const [newMatName, setNewMatName] = useState<string>('Granulés EVA Vierge');
  const [newMatColor, setNewMatColor] = useState<string>('Blanc');
  const [newMatColorHex, setNewMatColorHex] = useState<string>('#FFFFFF');
  const [newMatRef, setNewMatRef] = useState<string>(`RAW-${Date.now().toString().slice(-4)}`);
  const [newMatQty, setNewMatQty] = useState<number>(500);
  const [newMatUnit, setNewMatUnit] = useState<string>('kg');
  const [newMatBagWeight, setNewMatBagWeight] = useState<number>(25);
  const [newMatUnitPrice, setNewMatUnitPrice] = useState<number>(320);
  const [newMatSupplier, setNewMatSupplier] = useState<string>('PlastAlchem Algérie');
  const [newMatEntryDate, setNewMatEntryDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [newMatReceptionDate, setNewMatReceptionDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [newMatBatchNumber, setNewMatBatchNumber] = useState<string>(`LOT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
  const [newMatStorageLocation, setNewMatStorageLocation] = useState<string>('Silo Sil-1 / Zone A');
  const [newMatMinAlert, setNewMatMinAlert] = useState<number>(200);
  const [newMatNotes, setNewMatNotes] = useState<string>('Matière première homologuée production CTP.');
  const [newMatPhotoUrl, setNewMatPhotoUrl] = useState<string>('');

  // Form State: Fast Purchase / Reorder
  const [orderQty, setOrderQty] = useState<number>(500);
  const [orderUnitPrice, setOrderUnitPrice] = useState<number>(320);
  const [orderSupplier, setOrderSupplier] = useState<string>('');
  const [orderNotes, setOrderNotes] = useState<string>('Commande de réapprovisionnement automatique suite à alerte stock');

  // Form State: Inventory Adjustment
  const [adjustDirection, setAdjustDirection] = useState<'entree' | 'sortie'>('entree');
  const [adjustQty, setAdjustQty] = useState<number>(50);
  const [adjustReason, setAdjustReason] = useState<string>('Inventaire tournant / Régularisation pesée');

  // Cancel Movement Modal
  const [cancelModalMovId, setCancelModalMovId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('Erreur de saisie opérateur');

  // Feedback Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Filtered Materials
  const filteredMaterials = useMemo(() => {
    return rawMaterialsStock.filter((mat) => {
      if (typeFilter !== 'ALL' && mat.type !== typeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          mat.name.toLowerCase().includes(q) ||
          mat.color.toLowerCase().includes(q) ||
          mat.reference.toLowerCase().includes(q) ||
          (mat.supplier && mat.supplier.toLowerCase().includes(q)) ||
          (mat.batchNumber && mat.batchNumber.toLowerCase().includes(q)) ||
          mat.storageLocation.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [rawMaterialsStock, typeFilter, searchQuery]);

  // Critical Low Stock Materials (Requirement 17)
  const lowStockItems = useMemo(() => {
    return rawMaterialsStock.filter((mat) => mat.quantityAvailable <= mat.minAlertStock);
  }, [rawMaterialsStock]);

  // Global Stock Stats
  const totalStockWeightKg = useMemo(() => {
    return rawMaterialsStock.reduce((acc, m) => acc + (m.quantityAvailable || 0), 0);
  }, [rawMaterialsStock]);

  const totalStockBags = useMemo(() => {
    return Math.round(
      rawMaterialsStock.reduce((acc, m) => acc + (m.quantityAvailable / (m.bagWeightKg || 25)), 0)
    );
  }, [rawMaterialsStock]);

  const totalStockValuationDA = useMemo(() => {
    return rawMaterialsStock.reduce(
      (acc, m) => acc + (m.quantityAvailable * (m.averagePrice || m.unitPrice || 0)),
      0
    );
  }, [rawMaterialsStock]);

  // Traceability Movements (sorted newest first)
  const rawMaterialMovements = useMemo(() => {
    return stockMovements
      .filter((m) => m.material || m.type.toLowerCase().includes('achat') || m.type.toLowerCase().includes('production') || m.type.toLowerCase().includes('ajustement'))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [stockMovements]);

  // Submit: Add New Raw Material
  const handleCreateRawMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    const res = addRawMaterialStock({
      type: newMatType,
      name: newMatName,
      color: newMatColor,
      colorHex: newMatColorHex,
      reference: newMatRef,
      totalWeightKg: Number(newMatQty),
      quantityAvailable: Number(newMatQty),
      unit: newMatUnit,
      bagWeightKg: Number(newMatBagWeight),
      unitPrice: Number(newMatUnitPrice),
      averagePrice: Number(newMatUnitPrice),
      supplier: newMatSupplier,
      entryDate: newMatEntryDate,
      receptionDate: newMatReceptionDate,
      batchNumber: newMatBatchNumber,
      storageLocation: newMatStorageLocation,
      minAlertStock: Number(newMatMinAlert),
      notes: newMatNotes,
      photoUrl: newMatPhotoUrl || undefined,
    });

    if (res.success) {
      showToast(res.message);
      setIsAddModalOpen(false);
      // Reset Ref for next entry
      setNewMatRef(`RAW-${Date.now().toString().slice(-4)}`);
      setNewMatBatchNumber(`LOT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
    }
  };

  // Submit: Fast Reorder / Purchase
  const handleConfirmOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForOrder) return;

    // Direct Integration with Achats & P&L (Requirement 23)
    addPurchase({
      date: new Date().toISOString().substring(0, 10),
      supplier: orderSupplier || selectedItemForOrder.supplier || 'Fournisseur Agréé',
      article: `${selectedItemForOrder.type} ${selectedItemForOrder.color} (${selectedItemForOrder.reference})`,
      category: 'matiere_premiere',
      quantity: Number(orderQty),
      unit: selectedItemForOrder.unit,
      unitPrice: Number(orderUnitPrice),
      amountPaid: 0, // Dette fournisseur générée
      paymentStatus: 'non_paye',
      stockItemId: selectedItemForOrder.id,
      notes: `${orderNotes} - Seuil d'alerte était à ${selectedItemForOrder.minAlertStock} kg`,
    });

    showToast(`Commande d'achat créée avec succès (${orderQty} ${selectedItemForOrder.unit} de ${selectedItemForOrder.type} ${selectedItemForOrder.color}). Stock et P&L mis à jour !`);
    setIsOrderModalOpen(false);
    setSelectedItemForOrder(null);
  };

  // Submit: Inventory Adjustment
  const handleConfirmAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForAdjust) return;

    const qtyNumber = Number(adjustQty);
    const effectiveQty = adjustDirection === 'entree' ? qtyNumber : -qtyNumber;
    const newQty = Math.max(0, selectedItemForAdjust.quantityAvailable + effectiveQty);

    updateRawMaterialStock(selectedItemForAdjust.id, {
      quantityAvailable: newQty,
      totalWeightKg: newQty,
    });

    // Immutable Stock Movement (Requirement 19 & 29)
    logStockMovement({
      itemId: selectedItemForAdjust.id,
      itemName: `${selectedItemForAdjust.name} (${selectedItemForAdjust.color})`,
      type: 'Ajustement / Correction',
      direction: adjustDirection,
      quantity: effectiveQty,
      unit: selectedItemForAdjust.unit,
      material: selectedItemForAdjust.type,
      color: selectedItemForAdjust.color,
      batchNumber: selectedItemForAdjust.batchNumber,
      reason: adjustReason,
      performedBy: currentUser.name,
      service: 'Stock / Logistique',
      operationRef: `AJUST-${Date.now().toString().slice(-5)}`,
      status: 'validé',
    });

    showToast(`Ajustement enregistré : ${effectiveQty > 0 ? '+' : ''}${effectiveQty} ${selectedItemForAdjust.unit}. Audit trace générée.`);
    setIsAdjustModalOpen(false);
    setSelectedItemForAdjust(null);
  };

  // Cancel previous movement (Compensatory reversal)
  const handleConfirmCancelMovement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelModalMovId) return;

    const res = cancelStockMovement(cancelModalMovId, cancelReason);
    if (res.success) {
      showToast(res.message);
      setCancelModalMovId(null);
    }
  };

  return (
    <div className="space-y-6 pb-16" id="raw-materials-module">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-medium">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-6 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-blue-400" /> MODULE INDÉPENDANT 16
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                <RefreshCw className="w-3 h-3 text-emerald-400" /> Synchro Production Active
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <Boxes className="w-8 h-8 text-blue-400" />
              MATIÈRES PREMIÈRES & STOCK
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Gestion intelligente, traçabilité des lots, calcul automatique du PMP, seuils d’alerte par couleur et synchronisation en direct avec la production CTP.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center gap-2 transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Nouvelle Matière Première
            </button>
            <button
              onClick={() => setActiveSubTab('orders')}
              className="px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-2 transition"
            >
              <ClipboardList className="w-4 h-4 text-amber-400" />
              Ordres de Fabrication ({productionRequests.length})
            </button>
          </div>
        </div>

        {/* Global KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-700/60">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Stock Total Disponible</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-black font-mono text-white">{totalStockWeightKg.toLocaleString()}</span>
              <span className="text-xs text-slate-400 font-medium">kg</span>
            </div>
            <span className="text-[10px] text-blue-400 font-medium">≈ {totalStockBags} sacs de 25 kg</span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Valorisation Matières (PMP)</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-black font-mono text-emerald-400">{totalStockValuationDA.toLocaleString()}</span>
              <span className="text-xs text-emerald-500 font-medium">DA</span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Actifs d'inventaire valorisés</span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Alertes Stock Critique</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className={`text-2xl font-black font-mono ${lowStockItems.length > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                {lowStockItems.length}
              </span>
              {lowStockItems.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                  🔴 STOCK FAIBLE
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Sous le seuil d'alerte</span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Mouvements Enregistrés</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-black font-mono text-indigo-300">{rawMaterialMovements.length}</span>
              <span className="text-xs text-slate-400 font-medium">écritures</span>
            </div>
            <span className="text-[10px] text-indigo-400 font-medium">Audit Trail 100% Inaltérable</span>
          </div>
        </div>
      </div>

      {/* 17. CRITICAL FLASHING ALERT BANNER (If any material is low) */}
      {lowStockItems.length > 0 && (
        <div className="bg-rose-500/10 border-2 border-rose-500/50 rounded-2xl p-4 sm:p-5 shadow-lg shadow-rose-500/5 animate-pulse">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-md">
                <AlertTriangle className="w-6 h-6 animate-bounce" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black tracking-wider text-rose-700 uppercase bg-rose-100 px-2 py-0.5 rounded-md border border-rose-300">
                    🔴 ALERTE STOCK D'ALERTE PAR COULEUR (POINT 17)
                  </span>
                  <span className="text-xs text-rose-600 font-semibold">
                    {lowStockItems.length} matière(s) nécessitent un réapprovisionnement immédiat !
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-700">
                  {lowStockItems.map((item) => (
                    <span key={item.id} className="inline-flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-rose-200 font-medium shadow-2xs">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.colorHex || '#ccc' }} />
                      <strong className="text-slate-900">{item.type}</strong> {item.color}:
                      <span className="text-rose-600 font-bold font-mono">{item.quantityAvailable} kg</span>
                      <span className="text-slate-400 text-[10px]">(Seuil: {item.minAlertStock} kg)</span>
                      <button
                        onClick={() => {
                          setSelectedItemForOrder(item);
                          setOrderQty(Math.max(300, item.minAlertStock * 2 - item.quantityAvailable));
                          setOrderUnitPrice(item.averagePrice || item.unitPrice || 320);
                          setOrderSupplier(item.supplier || 'PlastAlchem Algérie');
                          setIsOrderModalOpen(true);
                        }}
                        className="ml-1 text-[11px] text-blue-600 hover:text-blue-800 font-bold underline"
                      >
                        Commander
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Module Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto">
          {[
            { id: 'materials', label: 'Registre des Matières', icon: Boxes, count: rawMaterialsStock.length },
            { id: 'alerts', label: 'Alertes & Seuils par Couleur', icon: AlertTriangle, count: lowStockItems.length, danger: lowStockItems.length > 0 },
            { id: 'traceability', label: 'Traçabilité & Mouvements', icon: History, count: rawMaterialMovements.length },
            { id: 'orders', label: 'Ordres de Fabrication (OF)', icon: ClipboardList, count: productionRequests.length },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <Icon className={`w-4 h-4 ${tab.danger ? 'text-rose-500' : ''}`} />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isActive
                        ? 'bg-slate-700 text-white'
                        : tab.danger
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Global Search */}
        {activeTab === 'materials' && (
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Rechercher matière, couleur, lot..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 text-slate-900 pl-9 pr-3 py-2 rounded-xl text-xs shadow-2xs focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: REGISTRE DES MATIÈRES PREMIÈRES */}
      {/* ========================================================================= */}
      {activeTab === 'materials' && (
        <div className="space-y-4">
          {/* Material Type Pills Filter */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {['ALL', 'EVA', 'PVC', 'CHIMINGOM', 'SHIMINGOM', 'AUTRE'].map((tp) => (
                <button
                  key={tp}
                  onClick={() => setTypeFilter(tp)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    typeFilter === tp
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {tp === 'ALL' ? 'Toutes Matières' : tp}
                </button>
              ))}
            </div>

            <span className="text-xs text-slate-500">
              Affichage de <strong className="text-slate-900">{filteredMaterials.length}</strong> matière(s) première(s)
            </span>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredMaterials.map((mat) => {
              const isLow = mat.quantityAvailable <= mat.minAlertStock;
              const bagCount = Math.round(mat.quantityAvailable / (mat.bagWeightKg || 25));
              const stockValuation = mat.quantityAvailable * (mat.averagePrice || mat.unitPrice);

              return (
                <div
                  key={mat.id}
                  className={`rounded-2xl border transition duration-200 overflow-hidden shadow-2xs flex flex-col justify-between ${
                    isLow ? 'bg-rose-50/40 border-rose-300 ring-1 ring-rose-400/20' : 'bg-white border-slate-200'
                  }`}
                >
                  {/* Card Header */}
                  <div className="p-5 border-b border-slate-100">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-900 text-white">
                            {mat.type}
                          </span>
                          <span className="text-xs font-mono font-bold text-slate-500">
                            {mat.reference}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900 mt-1.5">{mat.name}</h3>
                      </div>

                      {/* Status Badge */}
                      {isLow ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1 shrink-0 animate-pulse">
                          🔴 STOCK FAIBLE
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 shrink-0">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Stock Normal
                        </span>
                      )}
                    </div>

                    {/* Color Preview & Storage Location */}
                    <div className="flex items-center gap-2 mt-3 text-xs">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 font-semibold text-slate-800">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-slate-300 shadow-2xs"
                          style={{ backgroundColor: mat.colorHex || '#ccc' }}
                        />
                        <span>{mat.color}</span>
                      </div>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-600 font-mono text-[11px] truncate" title={mat.storageLocation}>
                        📍 {mat.storageLocation}
                      </span>
                    </div>
                  </div>

                  {/* Quantities & Price Metrics */}
                  <div className="p-5 space-y-3 bg-slate-50/50">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Stock Disponible</span>
                        <div className="flex items-baseline gap-1">
                          <span className={`text-2xl font-black font-mono ${isLow ? 'text-rose-600' : 'text-slate-900'}`}>
                            {mat.quantityAvailable.toLocaleString()}
                          </span>
                          <span className="text-xs text-slate-500 font-bold">{mat.unit}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-medium">≈ {bagCount} sacs ({mat.bagWeightKg || 25} kg)</span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Stock d'Alerte</span>
                        <div className="flex items-baseline justify-end gap-1">
                          <span className="text-base font-black font-mono text-slate-700">{mat.minAlertStock.toLocaleString()}</span>
                          <span className="text-[10px] text-slate-500 font-bold">{mat.unit}</span>
                        </div>
                        <span className="text-[10px] text-slate-400">Seuil de réappro</span>
                      </div>
                    </div>

                    {/* Financial Specs */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 block">Prix Moyen (PMP)</span>
                        <span className="font-bold text-slate-800 font-mono">{mat.averagePrice || mat.unitPrice} DA / kg</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 block">Valeur en Stock</span>
                        <span className="font-bold text-emerald-700 font-mono">{stockValuation.toLocaleString()} DA</span>
                      </div>
                    </div>

                    {/* Batch & Supplier Tag */}
                    <div className="text-[11px] text-slate-600 flex items-center justify-between pt-1 text-slate-500">
                      <span>Lot: <strong className="text-slate-700 font-mono">{mat.batchNumber || 'Non spécifié'}</strong></span>
                      <span className="truncate max-w-[140px]" title={mat.supplier}>Fourn: <strong>{mat.supplier || 'N/A'}</strong></span>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="p-3 bg-white border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        setSelectedItemForAdjust(mat);
                        setAdjustQty(50);
                        setIsAdjustModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition"
                    >
                      Ajuster Stock
                    </button>

                    <button
                      onClick={() => {
                        setSelectedItemForOrder(mat);
                        setOrderQty(Math.max(300, mat.minAlertStock * 2 - mat.quantityAvailable));
                        setOrderUnitPrice(mat.averagePrice || mat.unitPrice || 320);
                        setOrderSupplier(mat.supplier || 'PlastAlchem Algérie');
                        setIsOrderModalOpen(true);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                        isLow
                          ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      Commander
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ALERTES & SEUILS PAR COULEUR (POINT 17) */}
      {/* ========================================================================= */}
      {activeTab === 'alerts' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-3 mb-2">
              <AlertTriangle className="w-6 h-6 text-rose-600" />
              <h2 className="text-lg font-bold text-slate-900">
                Surveillance des Seuils d'Alerte par Couleur & Matière
              </h2>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
              Conformément à la règle de gestion 17, dès que le stock actuel d'une matière et couleur spécifique devient
              inférieur ou égal au stock d'alerte (Stock actuel ≤ Stock d'alerte), le système déclenche une alerte rouge
              permanente et permet de commander immédiatement avec mise à jour du P&L et de la production.
            </p>
          </div>

          {/* Table of all alerts */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4">Statut Alerte</th>
                    <th className="py-3 px-4">Matière</th>
                    <th className="py-3 px-4">Couleur</th>
                    <th className="py-3 px-4">Référence</th>
                    <th className="py-3 px-4 text-right">Stock Actuel</th>
                    <th className="py-3 px-4 text-right">Stock d'Alerte</th>
                    <th className="py-3 px-4 text-right">Déficit estimé</th>
                    <th className="py-3 px-4">Fournisseur</th>
                    <th className="py-3 px-4 text-right">Action Immédiate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rawMaterialsStock.map((mat) => {
                    const isLow = mat.quantityAvailable <= mat.minAlertStock;
                    const deficit = isLow ? mat.minAlertStock - mat.quantityAvailable : 0;

                    return (
                      <tr key={mat.id} className={`hover:bg-slate-50/80 transition ${isLow ? 'bg-rose-50/30' : ''}`}>
                        <td className="py-3 px-4 font-semibold">
                          {isLow ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-100 text-rose-700 border border-rose-300 animate-pulse">
                              🔴 STOCK FAIBLE
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Normal
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">{mat.type}</td>
                        <td className="py-3 px-4 font-medium text-slate-800">
                          <div className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-full border border-slate-300" style={{ backgroundColor: mat.colorHex || '#ccc' }} />
                            <span>{mat.color}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">{mat.reference}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold">
                          <span className={isLow ? 'text-rose-600' : 'text-slate-900'}>
                            {mat.quantityAvailable.toLocaleString()} {mat.unit}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-slate-600">
                          {mat.minAlertStock.toLocaleString()} {mat.unit}
                        </td>
                        <td className="py-3 px-4 text-right font-mono">
                          {deficit > 0 ? (
                            <span className="text-rose-600 font-bold">-{deficit} {mat.unit}</span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600">{mat.supplier || 'N/A'}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedItemForOrder(mat);
                              setOrderQty(Math.max(300, mat.minAlertStock * 2 - mat.quantityAvailable));
                              setOrderUnitPrice(mat.averagePrice || mat.unitPrice || 320);
                              setOrderSupplier(mat.supplier || 'PlastAlchem Algérie');
                              setIsOrderModalOpen(true);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition inline-flex items-center gap-1.5 ${
                              isLow
                                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-2xs'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                            Commander maintenant
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: TRAÇABILITÉ & MOUVEMENTS DE STOCK (POINT 19) */}
      {/* ========================================================================= */}
      {activeTab === 'traceability' && (
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-600" />
                Journal d'Audit & Traçabilité Inaltérable des Mouvements
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Point 19 & 29: Chaque mouvement (Achat, Consommation, Ajustement, Rejet) est tracé avec date, heure, quantité, matière, lot et service.
                Aucune suppression autorisée : les corrections font l'objet d'écritures compensatoires inverses.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4">Date & Heure</th>
                    <th className="py-3 px-4">Type de Mouvement</th>
                    <th className="py-3 px-4">Article / Matière</th>
                    <th className="py-3 px-4">Couleur</th>
                    <th className="py-3 px-4 text-right">Quantité</th>
                    <th className="py-3 px-4">Lot / Batch</th>
                    <th className="py-3 px-4">Service & Opérateur</th>
                    <th className="py-3 px-4">Motif / Justificatif</th>
                    <th className="py-3 px-4 text-center">Statut</th>
                    <th className="py-3 px-4 text-right">Action Corrective</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rawMaterialMovements.map((mov) => {
                    const isEntry = mov.quantity > 0 || mov.direction === 'entree';
                    const isCancelled = mov.status === 'annulé';

                    return (
                      <tr key={mov.id} className={`hover:bg-slate-50/80 transition ${isCancelled ? 'bg-slate-100/60 opacity-60' : ''}`}>
                        <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">{mov.date}</td>
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px]">
                            {mov.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">{mov.itemName}</td>
                        <td className="py-3 px-4 text-slate-600">{mov.color || '-'}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold">
                          <span
                            className={`inline-flex items-center gap-0.5 ${
                              isEntry ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {isEntry ? <ArrowDownRight className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                            {mov.quantity > 0 ? `+${mov.quantity}` : mov.quantity} {mov.unit}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">{mov.batchNumber || mov.operationRef || '-'}</td>
                        <td className="py-3 px-4 text-slate-700">
                          <span className="font-semibold block">{mov.performedBy}</span>
                          <span className="text-[10px] text-slate-400">{mov.service || 'Général'}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={mov.reason}>
                          {mov.reason}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {isCancelled ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-600">
                              Annulé
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                              Validé
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {!isCancelled && (
                            <button
                              onClick={() => {
                                setCancelModalMovId(mov.id);
                                setCancelReason(`Correction écriture #${mov.id}`);
                              }}
                              className="px-2.5 py-1 rounded-md text-[11px] font-medium text-rose-600 hover:bg-rose-50 border border-rose-200 transition"
                            >
                              Annuler (Contre-passation)
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: ORDRES DE FABRICATION (OF) & WORKFLOW (POINT 21, 22) */}
      {/* ========================================================================= */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-blue-600" />
                Ordres de Fabrication (OF) & Interconnexion Commerciale
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Génération automatique lors des ruptures de stock produit fini (Point 21), vérification matière première et notification commerciale lors de l'achèvement (Point 22).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {productionRequests.map((of) => {
              const progressPct = of.quantityRequested > 0 ? Math.min(100, Math.round((of.quantityProduced / of.quantityRequested) * 100)) : 0;
              const isFinished = of.status === 'Validé';

              return (
                <div key={of.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-600 block">
                        {of.code}
                      </span>
                      <h3 className="text-base font-bold text-slate-900">{of.modelName}</h3>
                      <span className="text-xs text-slate-500">Client: {of.clientName || 'Interne CTP'}</span>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        of.status === 'Validé'
                          ? 'bg-emerald-100 text-emerald-800'
                          : of.status === 'En cours'
                          ? 'bg-blue-100 text-blue-800 animate-pulse'
                          : of.status === 'Contrôle'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {of.status}
                    </span>
                  </div>

                  {/* Specs Strip */}
                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Matière & Couleur</span>
                      <span className="font-bold text-slate-800">{of.material || 'EVA'} - {of.color || 'Blanc'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Dispo Matière</span>
                      <span
                        className={`font-bold text-[11px] ${
                          of.materialAvailability === 'disponible'
                            ? 'text-emerald-600'
                            : of.materialAvailability === 'partiel'
                            ? 'text-amber-600'
                            : 'text-rose-600'
                        }`}
                      >
                        {of.materialAvailability === 'disponible' ? '🟢 Stock OK' : of.materialAvailability === 'partiel' ? '🟡 Partiel' : '🔴 Manquant'}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold mb-1">
                      <span className="text-slate-600">Avancement</span>
                      <span className="font-mono text-slate-900">{of.quantityProduced} / {of.quantityRequested} paires ({progressPct}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          isFinished ? 'bg-emerald-500' : 'bg-blue-600'
                        }`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Quick Action to advance status */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">Échéance : {of.dueDate || '3 jours'}</span>
                    <select
                      value={of.status}
                      onChange={(e) => updateProductionRequestStatus(of.id, e.target.value as ProductionRequestStatus)}
                      className="text-xs bg-slate-100 border border-slate-200 rounded-lg px-2 py-1 font-semibold text-slate-800 focus:outline-hidden"
                    >
                      <option value="Nouveau">Nouveau</option>
                      <option value="En cours">En cours</option>
                      <option value="Contrôle">Contrôle Qualité</option>
                      <option value="Validé">Validé (Disponible)</option>
                      <option value="Bloqué">Bloqué</option>
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: AJOUTER UNE NOUVELLE MATIÈRE PREMIÈRE */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Boxes className="w-6 h-6 text-blue-600" />
                  Nouvelle Matière Première – Stock Intelligent
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Point 16, 17, 18 : La couleur et matière enregistrées seront automatiquement synchronisées dans la Production CTP.
                </p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRawMaterial} className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Type de Matière *</label>
                  <select
                    value={newMatType}
                    onChange={(e) => setNewMatType(e.target.value as RawMaterialType)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:bg-white"
                  >
                    <option value="EVA">EVA</option>
                    <option value="PVC">PVC</option>
                    <option value="CHIMINGOM">CHIMINGOM</option>
                    <option value="SHIMINGOM">SHIMINGOM</option>
                    <option value="AUTRE">AUTRE</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Désignation / Nom de la Matière *</label>
                  <input
                    type="text"
                    required
                    value={newMatName}
                    onChange={(e) => setNewMatName(e.target.value)}
                    placeholder="Ex: Granulés EVA Vierge Densité 0.35"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Couleur *</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={newMatColorHex}
                      onChange={(e) => setNewMatColorHex(e.target.value)}
                      className="w-9 h-9 rounded-lg border border-slate-200 cursor-pointer p-0.5 shrink-0"
                    />
                    <input
                      type="text"
                      required
                      value={newMatColor}
                      onChange={(e) => setNewMatColor(e.target.value)}
                      placeholder="Ex: Blanc, Noir, Rouge..."
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:bg-white"
                    />
                  </div>
                  <span className="text-[10px] text-emerald-600 font-semibold mt-1 block">
                    ✓ Cette couleur sera automatiquement ajoutée à la Production
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Référence Matière *</label>
                  <input
                    type="text"
                    required
                    value={newMatRef}
                    onChange={(e) => setNewMatRef(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-semibold text-slate-900 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Quantité Disponible (kg) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newMatQty}
                    onChange={(e) => setNewMatQty(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Poids du Sac (kg)</label>
                  <input
                    type="number"
                    value={newMatBagWeight}
                    onChange={(e) => setNewMatBagWeight(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Prix Unitaire / Achat (DA / kg)</label>
                  <input
                    type="number"
                    value={newMatUnitPrice}
                    onChange={(e) => setNewMatUnitPrice(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-rose-700 mb-1">Stock d'Alerte (kg) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newMatMinAlert}
                    onChange={(e) => setNewMatMinAlert(Number(e.target.value))}
                    className="w-full bg-rose-50/60 border border-rose-300 rounded-xl px-3 py-2 text-xs font-bold text-rose-900 focus:bg-white"
                  />
                  <span className="text-[10px] text-slate-400">Déclenche 🔴 STOCK FAIBLE si atteint</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Fournisseur</label>
                  <input
                    type="text"
                    value={newMatSupplier}
                    onChange={(e) => setNewMatSupplier(e.target.value)}
                    placeholder="Ex: PlastAlchem Algérie"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Emplacement de Stockage</label>
                  <input
                    type="text"
                    value={newMatStorageLocation}
                    onChange={(e) => setNewMatStorageLocation(e.target.value)}
                    placeholder="Ex: Silo Sil-1 / Zone A"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Lot / Batch</label>
                  <input
                    type="text"
                    value={newMatBatchNumber}
                    onChange={(e) => setNewMatBatchNumber(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-semibold text-slate-900 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date d'Entrée / Réception</label>
                  <input
                    type="date"
                    value={newMatReceptionDate}
                    onChange={(e) => setNewMatReceptionDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notes & Spécifications</label>
                <textarea
                  rows={2}
                  value={newMatNotes}
                  onChange={(e) => setNewMatNotes(e.target.value)}
                  placeholder="Notes de conformité matière, granulométrie..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/20"
                >
                  Enregistrer et Synchroniser la Couleur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: COMMANDER MAINTENANT (ACHAT DIRECT & IMPACT P&L) */}
      {/* ========================================================================= */}
      {isOrderModalOpen && selectedItemForOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-bold text-slate-900">Commander la Matière Première</h2>
              </div>
              <button onClick={() => setIsOrderModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div className="flex justify-between font-semibold text-slate-800">
                <span>{selectedItemForOrder.type} - {selectedItemForOrder.color}</span>
                <span className="font-mono text-slate-500">{selectedItemForOrder.reference}</span>
              </div>
              <div className="flex justify-between text-slate-500 mt-1">
                <span>Stock Actuel: <strong className="text-rose-600 font-mono">{selectedItemForOrder.quantityAvailable} kg</strong></span>
                <span>Seuil d'Alerte: <strong className="text-slate-700 font-mono">{selectedItemForOrder.minAlertStock} kg</strong></span>
              </div>
            </div>

            <form onSubmit={handleConfirmOrder} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Quantité à Commander (kg) *</label>
                <input
                  type="number"
                  required
                  min="50"
                  value={orderQty}
                  onChange={(e) => setOrderQty(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 focus:bg-white text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Prix Unitaire (DA / kg) *</label>
                  <input
                    type="number"
                    required
                    value={orderUnitPrice}
                    onChange={(e) => setOrderUnitPrice(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Montant Total Estimé</label>
                  <div className="py-2 px-3 bg-slate-100 rounded-xl font-black font-mono text-emerald-700">
                    {(orderQty * orderUnitPrice).toLocaleString()} DA
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Fournisseur *</label>
                <input
                  type="text"
                  required
                  value={orderSupplier}
                  onChange={(e) => setOrderSupplier(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notes de commande</label>
                <input
                  type="text"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white"
                />
              </div>

              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 text-[11px] text-blue-900 leading-relaxed">
                ℹ️ <strong>Règle 23</strong> : L'enregistrement créera automatiquement l'ordre d'achat dans le module P&L (Dette fournisseur) et augmentera le stock avec recalcul automatique du Prix Moyen Pondéré (PMP).
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsOrderModalOpen(false)}
                  className="px-4 py-2 rounded-xl font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md shadow-emerald-600/20"
                >
                  Confirmer la Commande
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: AJUSTEMENT / INVENTAIRE DE STOCK */}
      {/* ========================================================================= */}
      {isAdjustModalOpen && selectedItemForAdjust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Ajustement d'Inventaire</h2>
              <button onClick={() => setIsAdjustModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-3 p-3 rounded-xl bg-slate-50 text-xs">
              <span className="font-bold text-slate-900">{selectedItemForAdjust.name}</span>
              <div className="text-slate-500 mt-0.5">Stock actuel : <strong>{selectedItemForAdjust.quantityAvailable} {selectedItemForAdjust.unit}</strong></div>
            </div>

            <form onSubmit={handleConfirmAdjustment} className="space-y-4 mt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAdjustDirection('entree')}
                  className={`py-2 rounded-xl font-bold border transition ${
                    adjustDirection === 'entree'
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  + Entrée / Surplus
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustDirection('sortie')}
                  className={`py-2 rounded-xl font-bold border transition ${
                    adjustDirection === 'sortie'
                      ? 'bg-rose-600 text-white border-rose-600'
                      : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  - Sortie / Perte
                </button>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Quantité (kg) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Motif de l'Ajustement (Obligatoire Audit) *</label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="Ex: Écart inventaire physique fin de mois"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-900 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2 rounded-xl font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-md shadow-blue-600/20"
                >
                  Enregistrer l'Ajustement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: ANNULATION PAR CONTRE-PASSATION (POINT 19 & 29) */}
      {/* ========================================================================= */}
      {cancelModalMovId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                Annulation de Mouvement par Écriture Inverse
              </h2>
              <button onClick={() => setCancelModalMovId(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 mt-3 leading-relaxed">
              Conformément aux normes d'audit industriel CTP, aucune écriture n'est effacée. Une opération compensatoire de sens inverse sera enregistrée avec votre signature et motif.
            </p>

            <form onSubmit={handleConfirmCancelMovement} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Motif de l'annulation *</label>
                <input
                  type="text"
                  required
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-900 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCancelModalMovId(null)}
                  className="px-4 py-2 rounded-xl font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Abandonner
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-md shadow-rose-600/20"
                >
                  Appliquer la Contre-passation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
