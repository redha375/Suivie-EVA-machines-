import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ReferentialCategory,
  Employee,
  IndustrialTeam,
  Machine,
  ShoeModelItem,
  IndustrialMold,
  ShoeSizeItem,
  ShoeColorItem,
  RawMaterialItem,
  CartonTypeItem,
  SizeRangeItem,
  ShiftType,
} from '../../types';
import {
  Users,
  UserCheck,
  Cog,
  Layers,
  Wrench,
  Ruler,
  Palette,
  Boxes,
  Package,
  Grid,
  Plus,
  Edit2,
  Power,
  Trash2,
  Search,
  CheckCircle,
  XCircle,
  AlertCircle,
  ShieldAlert,
  Info,
  History,
  Check,
  X,
} from 'lucide-react';

export const ReferentialsManagement: React.FC = () => {
  const {
    can,
    currentUser,
    // Workers
    workers,
    addWorker,
    updateWorker,
    toggleWorkerActive,
    deleteWorker,
    // Teams
    teams,
    addTeam,
    updateTeam,
    toggleTeamActive,
    deleteTeam,
    // Machines
    machines,
    addMachine,
    updateMachine,
    toggleMachineActive,
    deleteMachine,
    // Shoe models
    shoeModels,
    addShoeModel,
    updateShoeModel,
    toggleShoeModelActive,
    deleteShoeModel,
    // Cartons
    cartonTypes,
    addCartonType,
    updateCartonType,
    toggleCartonTypeActive,
    deleteCartonType,
    // Size ranges
    sizeRanges,
    addSizeRange,
    updateSizeRange,
    toggleSizeRangeActive,
    deleteSizeRange,
    // Molds
    industrialMolds,
    addMold,
    updateMold,
    toggleMoldActive,
    deleteMold,
    // Sizes
    shoeSizes,
    addShoeSize,
    updateShoeSize,
    toggleShoeSizeActive,
    deleteShoeSize,
    // Colors
    shoeColors,
    addShoeColor,
    updateShoeColor,
    toggleShoeColorActive,
    deleteShoeColor,
    // Raw materials
    rawMaterials,
    addRawMaterial,
    updateRawMaterial,
    toggleRawMaterialActive,
    deleteRawMaterial,
  } = useApp();

  const [activeCategory, setActiveCategory] = useState<ReferentialCategory>('workers');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ message: string; type: 'success' | 'warning' | 'error' } | null>(null);

  // Form states for adding/editing
  const [formData, setFormData] = useState<Record<string, any>>({});

  const showFeedback = (message: string, type: 'success' | 'warning' | 'error' = 'success') => {
    setActionFeedback({ message, type });
    setTimeout(() => setActionFeedback(null), 5000);
  };

  // Map category to permission resource
  const getResourceForCategory = (cat: ReferentialCategory) => {
    switch (cat) {
      case 'workers':
        return 'referentials_workers' as const;
      case 'teams':
        return 'referentials_teams' as const;
      case 'machines':
        return 'referentials_machines' as const;
      case 'models':
        return 'referentials_models' as const;
      case 'cartons':
        return 'referentials_cartons' as const;
      case 'size_ranges':
        return 'referentials_size_ranges' as const;
      case 'molds':
        return 'referentials_molds' as const;
      case 'sizes':
        return 'referentials_sizes' as const;
      case 'colors':
        return 'referentials_colors' as const;
      case 'materials':
        return 'referentials_materials' as const;
    }
  };

  const currentResource = getResourceForCategory(activeCategory);
  const canRead = can('read', currentResource);
  const canCreate = can('create', currentResource);
  const canUpdate = can('update', currentResource);
  const canDeactivate = can('deactivate', currentResource);
  const canDelete = can('delete', currentResource);

  const categories: { id: ReferentialCategory; label: string; icon: React.FC<{ className?: string }>; count: number }[] = [
    { id: 'workers', label: 'Travailleurs', icon: Users, count: workers.length },
    { id: 'teams', label: 'Équipes', icon: UserCheck, count: teams.length },
    { id: 'machines', label: 'Presses & Machines', icon: Cog, count: machines.length },
    { id: 'models', label: 'Modèles Chaussures', icon: Layers, count: shoeModels.length },
    { id: 'cartons', label: 'Types de Cartons', icon: Package, count: cartonTypes.length },
    { id: 'size_ranges', label: 'Plages Pointures', icon: Grid, count: sizeRanges.length },
    { id: 'molds', label: 'Moules Industriels', icon: Wrench, count: industrialMolds.length },
    { id: 'sizes', label: 'Pointures', icon: Ruler, count: shoeSizes.length },
    { id: 'colors', label: 'Couleurs', icon: Palette, count: shoeColors.length },
    { id: 'materials', label: 'Matières Premières', icon: Boxes, count: rawMaterials.length },
  ];

  // Handlers for Delete with Traceability
  const handleDelete = (id: string, name: string) => {
    if (!window.confirm(`Confirmer la suppression de "${name}" ?\n\nRemarque : Si cet élément apparaît dans l'historique de fabrication, il sera automatiquement DÉSACTIVÉ pour préserver la traçabilité réglementaire.`)) {
      return;
    }

    let result: { success: boolean; deactivatedInstead?: boolean; message?: string } = { success: false };

    switch (activeCategory) {
      case 'workers':
        result = deleteWorker(id);
        break;
      case 'teams':
        result = deleteTeam(id);
        break;
      case 'machines':
        result = deleteMachine(id);
        break;
      case 'models':
        result = deleteShoeModel(id);
        break;
      case 'cartons':
        result = deleteCartonType(id);
        break;
      case 'size_ranges':
        result = deleteSizeRange(id);
        break;
      case 'molds':
        result = deleteMold(id);
        break;
      case 'sizes':
        result = deleteShoeSize(id);
        break;
      case 'colors':
        result = deleteShoeColor(id);
        break;
      case 'materials':
        result = deleteRawMaterial(id);
        break;
    }

    if (result.deactivatedInstead) {
      showFeedback(result.message || 'Élément désactivé pour conserver la traçabilité.', 'warning');
    } else if (result.success) {
      showFeedback(result.message || 'Élément supprimé avec succès.', 'success');
    } else {
      showFeedback(result.message || 'Opération refusée ou permissions insuffisantes.', 'error');
    }
  };

  // Handlers for Toggle Active
  const handleToggleActive = (id: string, currentStatus: boolean, name: string) => {
    let res: { success: boolean; message?: string } = { success: false };
    switch (activeCategory) {
      case 'workers':
        res = toggleWorkerActive(id);
        break;
      case 'teams':
        res = toggleTeamActive(id);
        break;
      case 'machines':
        res = toggleMachineActive(id);
        break;
      case 'models':
        res = toggleShoeModelActive(id);
        break;
      case 'cartons':
        res = toggleCartonTypeActive(id);
        break;
      case 'size_ranges':
        res = toggleSizeRangeActive(id);
        break;
      case 'molds':
        res = toggleMoldActive(id);
        break;
      case 'sizes':
        res = toggleShoeSizeActive(id);
        break;
      case 'colors':
        res = toggleShoeColorActive(id);
        break;
      case 'materials':
        res = toggleRawMaterialActive(id);
        break;
    }

    if (res.success) {
      showFeedback(`${name} ${currentStatus ? 'désactivé(e)' : 'réactivé(e)'} avec succès.`);
    } else {
      showFeedback(res.message || 'Échec de la mise à jour du statut', 'error');
    }
  };

  // Open Add Modal
  const openAddModal = () => {
    switch (activeCategory) {
      case 'workers':
        setFormData({ name: '', matricule: `EMP-${Math.floor(100 + Math.random() * 900)}`, role: 'Opérateur Injection', shift: 'A', team: 'Équipe A - Matin', hourlyRateTND: 6.5 });
        break;
      case 'teams':
        setFormData({ code: `EQ-${String.fromCharCode(65 + teams.length)}`, name: `Équipe ${String.fromCharCode(65 + teams.length)}`, shift: 'A', leaderName: '', membersCount: 6 });
        break;
      case 'machines':
        setFormData({ code: `EVA ${machines.length + 1}`, name: `Presse Injection Rotative EVA ${machines.length + 1}`, platformsCount: 6, maxStations: 24, tonnage: 280, serialNumber: `EVA-2026-0${machines.length + 1}` });
        break;
      case 'models':
        setFormData({
          code: `MOD-${Math.floor(100 + Math.random() * 900)}`,
          name: '',
          category: 'Femme',
          material: 'EVA',
          defaultMaterial: 'EVA',
          sizeRange: '36-41',
          sizeIntervalsStr: '36-37, 38-39, 39-40, 40-41',
          sizeIntervals: ['36-37', '38-39', '39-40', '40-41'],
          colorsStr: 'Blanc Pur, Rose Poudré, Noir Mat',
          colors: ['Blanc Pur', 'Rose Poudré', 'Noir Mat'],
          modelType: 'normal',
          moldsCount: 2,
          associatedMoldsStr: '',
          associatedMachinesStr: 'EVA 1, EVA 2',
          pairsPerCycle: 2,
          cartonType: 'D5',
          pairsPerCarton: 12,
          packagingRule: '12 paires par carton D5 sous polybag individuel',
          targetPairs: 300,
          weightPerPairGrams: 220,
          description: 'Modèle industriel paramétrable',
          active: true,
        });
        break;
      case 'cartons':
        setFormData({
          code: `D${cartonTypes.length + 1}`,
          name: `Carton D${cartonTypes.length + 1} Standard`,
          defaultPairsPerCarton: 24,
          dimensionsMm: '600 x 400 x 320 mm',
          maxWeightKg: 10,
          description: 'Format carton ondulé standard',
          active: true,
        });
        break;
      case 'size_ranges':
        setFormData({
          code: '36-41',
          label: '36–41 (Femme Standard)',
          category: 'Femme',
          minSize: 36,
          maxSize: 41,
          intervalsStr: '36-37, 38-39, 39-40, 40-41',
          intervals: ['36-37', '38-39', '39-40', '40-41'],
          description: 'Plage pointures féminine',
          active: true,
        });
        break;
      case 'molds':
        setFormData({ code: `M-EVA-${Math.floor(100 + Math.random() * 900)}`, name: '', modelId: shoeModels[0]?.id || '', modelName: shoeModels[0]?.name || '', size: 40, pairsPerMold: 1, machineCode: 'Toutes', condition: 'excellent' });
        break;
      case 'sizes':
        setFormData({ size: 42, category: 'adulte', standardLengthMm: 270 });
        break;
      case 'colors':
        setFormData({ name: '', hex: '#1E3A8A', usage: 'les_deux', colorCode: 'COL-01' });
        break;
      case 'materials':
        setFormData({ code: `MAT-${Math.floor(100 + Math.random() * 900)}`, name: '', type: 'EVA', unit: 'sacs_25kg', minAlertThreshold: 40, supplier: 'Polymères Tunisie S.A.' });
        break;
    }
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (item: any) => {
    setEditingItem(item);
    const initial = { ...item };
    if (item.intervals) initial.intervalsStr = item.intervals.join(', ');
    if (item.sizeIntervals) initial.sizeIntervalsStr = item.sizeIntervals.join(', ');
    if (item.colors) initial.colorsStr = item.colors.join(', ');
    if (item.associatedMolds) initial.associatedMoldsStr = item.associatedMolds.join(', ');
    if (item.associatedMachines) initial.associatedMachinesStr = item.associatedMachines.join(', ');
    setFormData(initial);
  };

  // Save Form (Add or Edit)
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();

    // Prepare processed form data (converting comma strings to arrays for rich model/range entities)
    const processed = { ...formData };
    if (typeof processed.intervalsStr === 'string') {
      processed.intervals = processed.intervalsStr.split(',').map((s: string) => s.trim()).filter(Boolean);
      delete processed.intervalsStr;
    }
    if (typeof processed.sizeIntervalsStr === 'string') {
      processed.sizeIntervals = processed.sizeIntervalsStr.split(',').map((s: string) => s.trim()).filter(Boolean);
      delete processed.sizeIntervalsStr;
    }
    if (typeof processed.colorsStr === 'string') {
      processed.colors = processed.colorsStr.split(',').map((s: string) => s.trim()).filter(Boolean);
      delete processed.colorsStr;
    }
    if (typeof processed.associatedMoldsStr === 'string') {
      processed.associatedMolds = processed.associatedMoldsStr.split(',').map((s: string) => s.trim()).filter(Boolean);
      delete processed.associatedMoldsStr;
    }
    if (typeof processed.associatedMachinesStr === 'string') {
      processed.associatedMachines = processed.associatedMachinesStr.split(',').map((s: string) => s.trim()).filter(Boolean);
      delete processed.associatedMachinesStr;
    }

    if (editingItem) {
      // Update
      let res: { success: boolean; message?: string } = { success: false };
      switch (activeCategory) {
        case 'workers':
          res = updateWorker(editingItem.id, processed);
          break;
        case 'teams':
          res = updateTeam(editingItem.id, processed);
          break;
        case 'machines':
          res = updateMachine(editingItem.id, processed);
          break;
        case 'models':
          res = updateShoeModel(editingItem.id, processed);
          break;
        case 'cartons':
          res = updateCartonType(editingItem.id, processed);
          break;
        case 'size_ranges':
          res = updateSizeRange(editingItem.id, processed);
          break;
        case 'molds':
          res = updateMold(editingItem.id, processed);
          break;
        case 'sizes':
          res = updateShoeSize(editingItem.id, processed);
          break;
        case 'colors':
          res = updateShoeColor(editingItem.id, processed);
          break;
        case 'materials':
          res = updateRawMaterial(editingItem.id, processed);
          break;
      }

      if (res.success) {
        showFeedback(res.message || 'Mise à jour effectuée avec succès.');
        setEditingItem(null);
      } else {
        showFeedback(res.message || 'Erreur lors de la mise à jour.', 'error');
      }
    } else {
      // Add
      let res: { success: boolean; message?: string } = { success: false };
      switch (activeCategory) {
        case 'workers':
          res = addWorker(processed as any);
          break;
        case 'teams':
          res = addTeam(processed as any);
          break;
        case 'machines':
          res = addMachine(processed as any);
          break;
        case 'models':
          res = addShoeModel(processed as any);
          break;
        case 'cartons':
          res = addCartonType(processed as any);
          break;
        case 'size_ranges':
          res = addSizeRange(processed as any);
          break;
        case 'molds':
          res = addMold(processed as any);
          break;
        case 'sizes':
          res = addShoeSize(processed as any);
          break;
        case 'colors':
          res = addShoeColor(processed as any);
          break;
        case 'materials':
          res = addRawMaterial(processed as any);
          break;
      }

      if (res.success) {
        showFeedback(res.message || 'Création effectuée avec succès.');
        setIsAddModalOpen(false);
      } else {
        showFeedback(res.message || 'Erreur lors de la création.', 'error');
      }
    }
  };

  // Get active items list
  const getItemsForCurrentCategory = () => {
    let items: any[] = [];
    switch (activeCategory) {
      case 'workers':
        items = workers;
        break;
      case 'teams':
        items = teams;
        break;
      case 'machines':
        items = machines;
        break;
      case 'models':
        items = shoeModels;
        break;
      case 'cartons':
        items = cartonTypes;
        break;
      case 'size_ranges':
        items = sizeRanges;
        break;
      case 'molds':
        items = industrialMolds;
        break;
      case 'sizes':
        items = shoeSizes;
        break;
      case 'colors':
        items = shoeColors;
        break;
      case 'materials':
        items = rawMaterials;
        break;
    }

    return items.filter((item) => {
      // Status filter
      if (statusFilter === 'active' && item.active === false) return false;
      if (statusFilter === 'inactive' && item.active !== false) return false;

      // Search term
      if (!searchTerm) return true;
      const s = searchTerm.toLowerCase();
      return (
        (item.name && item.name.toLowerCase().includes(s)) ||
        (item.label && item.label.toLowerCase().includes(s)) ||
        (item.code && item.code.toLowerCase().includes(s)) ||
        (item.category && item.category.toLowerCase().includes(s)) ||
        (item.cartonType && item.cartonType.toLowerCase().includes(s)) ||
        (item.matricule && item.matricule.toLowerCase().includes(s)) ||
        (item.description && item.description.toLowerCase().includes(s)) ||
        (item.type && item.type.toLowerCase().includes(s))
      );
    });
  };

  const currentItems = getItemsForCurrentCategory();
  const activeCount = currentItems.filter((i) => i.active !== false).length;
  const inactiveCount = currentItems.filter((i) => i.active === false).length;

  if (!canRead) {
    return (
      <div className="bg-white border border-rose-200 rounded-xl p-8 text-center shadow-sm">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-900">Accès Référentiel Non Autorisé</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
          Votre rôle actuel (<strong>{currentUser.role}</strong>) ne dispose pas des droits de lecture requis pour consulter cette section. Contactez l’Administrateur Général.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Feedback Banner */}
      {actionFeedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between shadow-xs transition-all ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : actionFeedback.type === 'warning'
              ? 'bg-amber-50 border-amber-200 text-amber-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionFeedback.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-600" />}
            {actionFeedback.type === 'warning' && <AlertCircle className="w-4 h-4 text-amber-600" />}
            {actionFeedback.type === 'error' && <XCircle className="w-4 h-4 text-rose-600" />}
            <span>{actionFeedback.message}</span>
          </div>
          <button
            onClick={() => setActionFeedback(null)}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Traceability Regulatory Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 shadow-xs flex items-start gap-3">
        <History className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold text-blue-950">Règle de Traçabilité Industrielle et Norme Qualité</h4>
          <p className="text-blue-800 mt-0.5 leading-relaxed">
            Les travailleurs, machines, moules et modèles ayant déjà généré des lots de fabrication dans l'historique <strong>ne peuvent pas être supprimés définitivement</strong>. Pour préserver la cohérence des audits et des déclarations, le système applique automatiquement la <strong>désactivation réversible</strong>. Toute modification est consignée dans le journal d'audit avec l'ancienne et la nouvelle valeur.
          </p>
        </div>
      </div>

      {/* Referentials Category Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isSelected = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => {
                setActiveCategory(cat.id);
                setSearchTerm('');
              }}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition ${
                isSelected
                  ? 'bg-blue-600 border-blue-600 text-white shadow-sm font-semibold'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              <Icon className={`w-4 h-4 mb-1.5 ${isSelected ? 'text-white' : 'text-slate-500'}`} />
              <span className="text-[11px] leading-tight font-medium truncate w-full">{cat.label}</span>
              <span
                className={`text-[9px] mt-1 px-1.5 py-0.2 rounded-full font-mono ${
                  isSelected ? 'bg-blue-500/40 text-blue-100' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {cat.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Actions & Filters Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par nom, code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-hidden"
          />
        </div>

        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <span className="text-[11px] text-slate-400 font-medium mr-1">Statut :</span>
          {[
            { id: 'all', label: `Tous (${currentItems.length})` },
            { id: 'active', label: `Actifs (${activeCount})` },
            { id: 'inactive', label: `Désactivés (${inactiveCount})` },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id as any)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                statusFilter === st.id
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>

        {/* Gated "Ajouter" button: Automatically hidden if user lacks permission */}
        {canCreate && (
          <button
            onClick={openAddModal}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ajouter {categories.find((c) => c.id === activeCategory)?.label.replace(/s$/, '')}</span>
          </button>
        )}
      </div>

      {/* Content Table / Card Display */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase text-[10px] font-semibold">
              {activeCategory === 'workers' && (
                <tr>
                  <th className="px-3.5 py-3">Matricule</th>
                  <th className="px-3.5 py-3">Nom & Prénom</th>
                  <th className="px-3.5 py-3">Poste / Spécialité</th>
                  <th className="px-3.5 py-3">Équipe & Shift</th>
                  <th className="px-3.5 py-3">Taux Horaire</th>
                  <th className="px-3.5 py-3 text-center">Statut</th>
                  <th className="px-3.5 py-3 text-right">Actions</th>
                </tr>
              )}

              {activeCategory === 'teams' && (
                <tr>
                  <th className="px-3.5 py-3">Code Équipe</th>
                  <th className="px-3.5 py-3">Nom de l'Équipe</th>
                  <th className="px-3.5 py-3">Shift Assigné</th>
                  <th className="px-3.5 py-3">Chef d'Équipe</th>
                  <th className="px-3.5 py-3">Membres Actifs</th>
                  <th className="px-3.5 py-3 text-center">Statut</th>
                  <th className="px-3.5 py-3 text-right">Actions</th>
                </tr>
              )}

              {activeCategory === 'machines' && (
                <tr>
                  <th className="px-3.5 py-3">Code Presse</th>
                  <th className="px-3.5 py-3">Désignation</th>
                  <th className="px-3.5 py-3">Plateformes</th>
                  <th className="px-3.5 py-3">Tonnage</th>
                  <th className="px-3.5 py-3">N° Série</th>
                  <th className="px-3.5 py-3 text-center">Statut</th>
                  <th className="px-3.5 py-3 text-right">Actions</th>
                </tr>
              )}

              {activeCategory === 'models' && (
                <tr>
                  <th className="px-3.5 py-3">Code Modèle</th>
                  <th className="px-3.5 py-3">Désignation & Catégorie</th>
                  <th className="px-3.5 py-3">Matière & Type</th>
                  <th className="px-3.5 py-3">Pointures & Plage</th>
                  <th className="px-3.5 py-3">Moules / Cycle</th>
                  <th className="px-3.5 py-3">Carton & Règle</th>
                  <th className="px-3.5 py-3">Objectif</th>
                  <th className="px-3.5 py-3 text-center">Statut</th>
                  <th className="px-3.5 py-3 text-right">Actions</th>
                </tr>
              )}

              {activeCategory === 'cartons' && (
                <tr>
                  <th className="px-3.5 py-3">Format Carton</th>
                  <th className="px-3.5 py-3">Désignation Format</th>
                  <th className="px-3.5 py-3">Paires / Carton</th>
                  <th className="px-3.5 py-3">Dimensions (L x l x h)</th>
                  <th className="px-3.5 py-3">Poids Max</th>
                  <th className="px-3.5 py-3 text-center">Statut</th>
                  <th className="px-3.5 py-3 text-right">Actions</th>
                </tr>
              )}

              {activeCategory === 'size_ranges' && (
                <tr>
                  <th className="px-3.5 py-3">Code Plage</th>
                  <th className="px-3.5 py-3">Intitulé</th>
                  <th className="px-3.5 py-3">Catégorie</th>
                  <th className="px-3.5 py-3">Pointures Min-Max</th>
                  <th className="px-3.5 py-3">Intervalles / Découpage</th>
                  <th className="px-3.5 py-3 text-center">Statut</th>
                  <th className="px-3.5 py-3 text-right">Actions</th>
                </tr>
              )}

              {activeCategory === 'molds' && (
                <tr>
                  <th className="px-3.5 py-3">Code Moule</th>
                  <th className="px-3.5 py-3">Modèle Associé</th>
                  <th className="px-3.5 py-3">Pointure</th>
                  <th className="px-3.5 py-3">Paires / Injection</th>
                  <th className="px-3.5 py-3">Presse Attitrée</th>
                  <th className="px-3.5 py-3 text-center">État / Statut</th>
                  <th className="px-3.5 py-3 text-right">Actions</th>
                </tr>
              )}

              {activeCategory === 'sizes' && (
                <tr>
                  <th className="px-3.5 py-3">Pointure</th>
                  <th className="px-3.5 py-3">Catégorie</th>
                  <th className="px-3.5 py-3">Longueur Normalisée</th>
                  <th className="px-3.5 py-3 text-center">Statut</th>
                  <th className="px-3.5 py-3 text-right">Actions</th>
                </tr>
              )}

              {activeCategory === 'colors' && (
                <tr>
                  <th className="px-3.5 py-3">Code</th>
                  <th className="px-3.5 py-3">Nom Couleur</th>
                  <th className="px-3.5 py-3">Aperçu</th>
                  <th className="px-3.5 py-3">Application Recommandée</th>
                  <th className="px-3.5 py-3 text-center">Statut</th>
                  <th className="px-3.5 py-3 text-right">Actions</th>
                </tr>
              )}

              {activeCategory === 'materials' && (
                <tr>
                  <th className="px-3.5 py-3">Code Matière</th>
                  <th className="px-3.5 py-3">Désignation</th>
                  <th className="px-3.5 py-3">Type Polymère</th>
                  <th className="px-3.5 py-3">Conditionnement</th>
                  <th className="px-3.5 py-3">Seuil Alerte Min</th>
                  <th className="px-3.5 py-3">Fournisseur</th>
                  <th className="px-3.5 py-3 text-center">Statut</th>
                  <th className="px-3.5 py-3 text-right">Actions</th>
                </tr>
              )}
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-700">
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Aucun élément trouvé pour cette catégorie ou ce filtre.
                  </td>
                </tr>
              ) : (
                currentItems.map((item) => {
                  const isItemActive = item.active !== false;

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/70 transition ${
                        !isItemActive ? 'bg-slate-50/40 text-slate-400' : ''
                      }`}
                    >
                      {/* Category Specific Columns */}
                      {activeCategory === 'workers' && (
                        <>
                          <td className="px-3.5 py-3 font-mono font-semibold text-slate-900">{item.matricule}</td>
                          <td className="px-3.5 py-3 font-medium text-slate-900">{item.name}</td>
                          <td className="px-3.5 py-3">{item.role}</td>
                          <td className="px-3.5 py-3 font-mono text-slate-600">
                            {item.team || '-'} (Shift {item.shift || 'A'})
                          </td>
                          <td className="px-3.5 py-3 font-mono">{item.hourlyRateTND ? `${item.hourlyRateTND} DT/h` : '6.50 DT/h'}</td>
                        </>
                      )}

                      {activeCategory === 'teams' && (
                        <>
                          <td className="px-3.5 py-3 font-mono font-bold text-blue-700">{item.code}</td>
                          <td className="px-3.5 py-3 font-medium text-slate-900">{item.name}</td>
                          <td className="px-3.5 py-3 font-mono">Shift {item.shift}</td>
                          <td className="px-3.5 py-3">{item.leaderName || 'Non désigné'}</td>
                          <td className="px-3.5 py-3 font-mono">{item.membersCount || 0} ouvriers</td>
                        </>
                      )}

                      {activeCategory === 'machines' && (
                        <>
                          <td className="px-3.5 py-3 font-mono font-bold text-blue-700">{item.code}</td>
                          <td className="px-3.5 py-3 font-medium text-slate-900">{item.name}</td>
                          <td className="px-3.5 py-3 font-mono">{item.platformsCount} plateformes ({item.maxStations || 24} stations)</td>
                          <td className="px-3.5 py-3 font-mono">{item.tonnage || 280} T</td>
                          <td className="px-3.5 py-3 font-mono text-slate-500">{item.serialNumber || 'N/A'}</td>
                        </>
                      )}

                      {activeCategory === 'models' && (
                        <>
                          <td className="px-3.5 py-3 font-mono font-bold text-blue-700">{item.code}</td>
                          <td className="px-3.5 py-3">
                            <div className="font-semibold text-slate-900">{item.name}</div>
                            <div className="text-[11px] text-slate-500 font-medium">{item.category || 'Femme'}</div>
                          </td>
                          <td className="px-3.5 py-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                (item.material || item.defaultMaterial) === 'EVA'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : (item.material || item.defaultMaterial) === 'SOUMELLE'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}>
                                {item.material || item.defaultMaterial || 'EVA'}
                              </span>
                              {item.modelType === 'bicolor' && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                                  Bicolor
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3.5 py-3">
                            <div className="font-mono font-bold text-slate-800">
                              {item.sizeRange || (item.sizes && item.sizes.length ? `${Math.min(...item.sizes)}–${Math.max(...item.sizes)}` : '-')}
                            </div>
                            {item.sizeIntervals && item.sizeIntervals.length > 0 && (
                              <div className="text-[10px] text-slate-500 truncate max-w-[150px]" title={item.sizeIntervals.join(', ')}>
                                {item.sizeIntervals.join(' · ')}
                              </div>
                            )}
                          </td>
                          <td className="px-3.5 py-3 font-mono">
                            <div className="font-medium text-slate-800">{item.pairsPerCycle || 2} p/cycle</div>
                            <div className="text-[10px] text-slate-500">{item.moldsCount || 2} moule(s)</div>
                          </td>
                          <td className="px-3.5 py-3">
                            <div className="font-semibold text-emerald-700">
                              Carton {item.cartonType || 'D5'} ({item.pairsPerCarton || 12} p/c)
                            </div>
                            <div className="text-[10px] text-slate-500 truncate max-w-[160px]" title={item.packagingRule}>
                              {item.packagingRule || 'Standard'}
                            </div>
                          </td>
                          <td className="px-3.5 py-3 font-mono font-bold text-slate-700">
                            {item.targetPairs ? `${item.targetPairs} p` : '-'}
                          </td>
                        </>
                      )}

                      {activeCategory === 'cartons' && (
                        <>
                          <td className="px-3.5 py-3 font-mono font-bold text-blue-700">{item.code}</td>
                          <td className="px-3.5 py-3">
                            <div className="font-medium text-slate-900">{item.name}</div>
                            {item.description && <div className="text-[11px] text-slate-500 truncate max-w-xs">{item.description}</div>}
                          </td>
                          <td className="px-3.5 py-3 font-mono font-bold text-emerald-700">{item.defaultPairsPerCarton} paires / carton</td>
                          <td className="px-3.5 py-3 font-mono text-slate-600">{item.dimensionsMm || '-'}</td>
                          <td className="px-3.5 py-3 font-mono text-slate-600">{item.maxWeightKg ? `${item.maxWeightKg} kg` : '-'}</td>
                        </>
                      )}

                      {activeCategory === 'size_ranges' && (
                        <>
                          <td className="px-3.5 py-3 font-mono font-bold text-blue-700">{item.code}</td>
                          <td className="px-3.5 py-3">
                            <div className="font-medium text-slate-900">{item.label}</div>
                            {item.description && <div className="text-[11px] text-slate-500 truncate max-w-xs">{item.description}</div>}
                          </td>
                          <td className="px-3.5 py-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                              {item.category}
                            </span>
                          </td>
                          <td className="px-3.5 py-3 font-mono font-bold text-slate-900">
                            {item.minSize} – {item.maxSize}
                          </td>
                          <td className="px-3.5 py-3">
                            <div className="flex flex-wrap gap-1">
                              {item.intervals?.map((inv: string) => (
                                <span key={inv} className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-700 border border-slate-200">
                                  {inv}
                                </span>
                              ))}
                            </div>
                          </td>
                        </>
                      )}

                      {activeCategory === 'molds' && (
                        <>
                          <td className="px-3.5 py-3 font-mono font-bold text-blue-700">{item.code}</td>
                          <td className="px-3.5 py-3 font-medium text-slate-900">{item.modelName || item.name}</td>
                          <td className="px-3.5 py-3 font-mono font-bold text-slate-900">{item.size}</td>
                          <td className="px-3.5 py-3 font-mono">{item.pairsPerMold} paire(s)</td>
                          <td className="px-3.5 py-3 font-mono text-slate-600">{item.machineCode || 'Toutes'}</td>
                        </>
                      )}

                      {activeCategory === 'sizes' && (
                        <>
                          <td className="px-3.5 py-3 font-mono font-bold text-lg text-blue-700">{item.size}</td>
                          <td className="px-3.5 py-3 capitalize">{item.category}</td>
                          <td className="px-3.5 py-3 font-mono">{item.standardLengthMm} mm</td>
                        </>
                      )}

                      {activeCategory === 'colors' && (
                        <>
                          <td className="px-3.5 py-3 font-mono text-slate-500">{item.colorCode || '-'}</td>
                          <td className="px-3.5 py-3 font-medium text-slate-900">{item.name}</td>
                          <td className="px-3.5 py-3">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-5 h-5 rounded-full border border-slate-300 shadow-xs shrink-0"
                                style={{ backgroundColor: item.hex }}
                              />
                              <span className="font-mono text-[10px] text-slate-500 uppercase">{item.hex}</span>
                            </div>
                          </td>
                          <td className="px-3.5 py-3 capitalize">{item.usage.replace('_', ' ')}</td>
                        </>
                      )}

                      {activeCategory === 'materials' && (
                        <>
                          <td className="px-3.5 py-3 font-mono font-bold text-blue-700">{item.code}</td>
                          <td className="px-3.5 py-3 font-medium text-slate-900">{item.name}</td>
                          <td className="px-3.5 py-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {item.type}
                            </span>
                          </td>
                          <td className="px-3.5 py-3 font-mono">{item.unit === 'sacs_25kg' ? 'Sacs de 25kg' : 'Kilogrammes'}</td>
                          <td className="px-3.5 py-3 font-mono text-amber-700">{item.minAlertThreshold} {item.unit === 'sacs_25kg' ? 'sacs' : 'kg'}</td>
                          <td className="px-3.5 py-3 text-slate-500">{item.supplier || '-'}</td>
                        </>
                      )}

                      {/* Statut Badge */}
                      <td className="px-3.5 py-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                            isItemActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border border-slate-300'
                          }`}
                        >
                          {isItemActive ? 'Actif' : 'Désactivé'}
                        </span>
                      </td>

                      {/* Action Buttons: Gated by permissions & traceability */}
                      <td className="px-3.5 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Modifier button: hidden if !canUpdate */}
                          {canUpdate && (
                            <button
                              onClick={() => openEditModal(item)}
                              className="p-1.5 rounded-md text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition"
                              title="Modifier les propriétés"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Désactiver / Réactiver button: hidden if !canDeactivate */}
                          {canDeactivate && (
                            <button
                              onClick={() => handleToggleActive(item.id, isItemActive, item.name || item.code)}
                              className={`p-1.5 rounded-md transition ${
                                isItemActive
                                  ? 'text-amber-600 hover:bg-amber-50'
                                  : 'text-emerald-600 hover:bg-emerald-50'
                              }`}
                              title={isItemActive ? 'Désactiver (Conserver traçabilité)' : 'Réactiver'}
                            >
                              <Power className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Supprimer button: hidden if !canDelete */}
                          {canDelete && (
                            <button
                              onClick={() => handleDelete(item.id, item.name || item.code)}
                              className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                              title="Supprimer (Désactivation automatique si lié à l'historique)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
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

      {/* Add & Edit Modal */}
      {(isAddModalOpen || editingItem) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className={`bg-white rounded-xl shadow-xl border border-slate-200 w-full ${activeCategory === 'models' || activeCategory === 'cartons' || activeCategory === 'size_ranges' ? 'max-w-2xl' : 'max-w-lg'} max-h-[90vh] flex flex-col overflow-hidden animate-fade-in`}>
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
              <h3 className="font-bold text-sm text-slate-900">
                {editingItem ? 'Modifier' : 'Ajouter un(e)'} {categories.find((c) => c.id === activeCategory)?.label.replace(/s$/, '')}
              </h3>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingItem(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Category-specific form fields */}
              {activeCategory === 'workers' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Matricule</label>
                      <input
                        type="text"
                        required
                        value={formData.matricule || ''}
                        onChange={(e) => setFormData({ ...formData, matricule: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Nom & Prénom</label>
                      <input
                        type="text"
                        required
                        value={formData.name || ''}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Poste / Spécialité</label>
                      <input
                        type="text"
                        value={formData.role || ''}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
                        placeholder="Ex: Opérateur Injection"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Shift / Quart</label>
                      <select
                        value={formData.shift || 'A'}
                        onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
                      >
                        <option value="A">Shift A (Matin)</option>
                        <option value="B">Shift B (Soir)</option>
                        <option value="C">Shift C (Nuit)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Équipe Assignée</label>
                    <select
                      value={formData.team || ''}
                      onChange={(e) => setFormData({ ...formData, team: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
                    >
                      {teams.map((t) => (
                        <option key={t.id} value={t.name}>{t.name} ({t.code})</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {activeCategory === 'machines' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Code Machine</label>
                      <input
                        type="text"
                        required
                        value={formData.code || ''}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Désignation</label>
                      <input
                        type="text"
                        required
                        value={formData.name || ''}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Nombre Plateformes</label>
                      <input
                        type="number"
                        min="1"
                        max="12"
                        value={formData.platformsCount || 6}
                        onChange={(e) => setFormData({ ...formData, platformsCount: Number(e.target.value) })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Tonnage (Tonnes)</label>
                      <input
                        type="number"
                        value={formData.tonnage || 280}
                        onChange={(e) => setFormData({ ...formData, tonnage: Number(e.target.value) })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono"
                      />
                    </div>
                  </div>
                </>
              )}

              {activeCategory === 'models' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Code Modèle *</label>
                      <input
                        type="text"
                        required
                        value={formData.code || ''}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono font-bold"
                        placeholder="Ex: SB23"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Nom du Modèle *</label>
                      <input
                        type="text"
                        required
                        value={formData.name || ''}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-medium"
                        placeholder="Ex: SB23 Femme"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Catégorie *</label>
                      <select
                        value={formData.category || 'Femme'}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
                      >
                        <option value="Femme">Femme</option>
                        <option value="Homme">Homme</option>
                        <option value="Garçon">Garçon</option>
                        <option value="Enfant">Enfant</option>
                        <option value="Mixte">Mixte</option>
                        <option value="Autre">Autre</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Matière *</label>
                      <select
                        value={formData.material || formData.defaultMaterial || 'EVA'}
                        onChange={(e) => setFormData({ ...formData, material: e.target.value, defaultMaterial: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold"
                      >
                        <option value="EVA">EVA (Éthylène-acétate de vinyle)</option>
                        <option value="SOUMELLE">SOUMELLE (Semelles injectées)</option>
                        <option value="PVC">PVC (Polychlorure de vinyle)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Type de Finition *</label>
                      <select
                        value={formData.modelType || 'normal'}
                        onChange={(e) => setFormData({ ...formData, modelType: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
                      >
                        <option value="normal">Normal (Monocolore)</option>
                        <option value="bicolor">Bicolor (Bi-injection 2 couleurs/composants)</option>
                      </select>
                    </div>
                  </div>

                  <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 space-y-3">
                    <span className="text-xs font-bold text-indigo-900 block">Pointures &amp; Plages Configurables</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-indigo-800 mb-1">Plage de Pointures</label>
                        <select
                          value={formData.sizeRange || (sizeRanges[0]?.code || '36-41')}
                          onChange={(e) => {
                            const foundRange = sizeRanges.find((r) => r.code === e.target.value);
                            setFormData({
                              ...formData,
                              sizeRange: e.target.value,
                              sizeIntervalsStr: foundRange?.intervals ? foundRange.intervals.join(', ') : formData.sizeIntervalsStr,
                            });
                          }}
                          className="w-full bg-white border border-indigo-200 rounded-lg p-2 text-xs font-mono font-semibold"
                        >
                          {sizeRanges.map((r) => (
                            <option key={r.id} value={r.code}>
                              {r.code} ({r.label} - T{r.minSize} à T{r.maxSize})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-indigo-800 mb-1">
                          Intervalles de Pointures (séparés par virgule)
                        </label>
                        <input
                          type="text"
                          value={formData.sizeIntervalsStr || (Array.isArray(formData.sizeIntervals) ? formData.sizeIntervals.join(', ') : '')}
                          onChange={(e) => setFormData({ ...formData, sizeIntervalsStr: e.target.value })}
                          className="w-full bg-white border border-indigo-200 rounded-lg p-2 text-xs font-mono"
                          placeholder="Ex: 36-37, 38-39, 39-40, 40-41"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 space-y-3">
                    <span className="text-xs font-bold text-amber-950 block">Conditionnement en Cartons (D1 à D6)</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-amber-900 mb-1">Type de Carton Associé *</label>
                        <select
                          value={formData.cartonType || (cartonTypes[0]?.code || 'D5')}
                          onChange={(e) => {
                            const foundCarton = cartonTypes.find((c) => c.code === e.target.value);
                            setFormData({
                              ...formData,
                              cartonType: e.target.value,
                              pairsPerCarton: foundCarton?.defaultPairsPerCarton || formData.pairsPerCarton || 12,
                            });
                          }}
                          className="w-full bg-white border border-amber-300 rounded-lg p-2 text-xs font-mono font-bold"
                        >
                          {cartonTypes.map((c) => (
                            <option key={c.id} value={c.code}>
                              {c.code} — {c.name} ({c.defaultPairsPerCarton} paires/carton)
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-amber-900 mb-1">Paires par Carton *</label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={formData.pairsPerCarton || 12}
                          onChange={(e) => setFormData({ ...formData, pairsPerCarton: Number(e.target.value) })}
                          className="w-full bg-white border border-amber-300 rounded-lg p-2 text-xs font-mono font-bold"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-amber-900 mb-1">Règle de Conditionnement</label>
                      <input
                        type="text"
                        value={formData.packagingRule || ''}
                        onChange={(e) => setFormData({ ...formData, packagingRule: e.target.value })}
                        className="w-full bg-white border border-amber-200 rounded-lg p-2 text-xs"
                        placeholder="Ex: 12 paires par carton D5 réparties par pointures sous polybag"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre de Moules *</label>
                      <select
                        value={formData.moldsCount || 2}
                        onChange={(e) => setFormData({ ...formData, moldsCount: Number(e.target.value) as 1 | 2 | 4 })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono font-semibold"
                      >
                        <option value={1}>1 moule</option>
                        <option value={2}>2 moules</option>
                        <option value={4}>4 moules</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Paires par Cycle *</label>
                      <input
                        type="number"
                        min="1"
                        value={formData.pairsPerCycle || 2}
                        onChange={(e) => setFormData({ ...formData, pairsPerCycle: Number(e.target.value) })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Objectif Poste (Paires)</label>
                      <input
                        type="number"
                        min="1"
                        value={formData.targetPairs || 300}
                        onChange={(e) => setFormData({ ...formData, targetPairs: Number(e.target.value) })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Machine(s) Associée(s)</label>
                      <input
                        type="text"
                        value={formData.associatedMachinesStr || (Array.isArray(formData.associatedMachines) ? formData.associatedMachines.join(', ') : '')}
                        onChange={(e) => setFormData({ ...formData, associatedMachinesStr: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
                        placeholder="Ex: EVA 1, EVA 2"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Moules Associés</label>
                      <input
                        type="text"
                        value={formData.associatedMoldsStr || (Array.isArray(formData.associatedMolds) ? formData.associatedMolds.join(', ') : '')}
                        onChange={(e) => setFormData({ ...formData, associatedMoldsStr: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono"
                        placeholder="Ex: M-SB23-01, M-SB23-02"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Couleurs Disponibles</label>
                      <input
                        type="text"
                        value={formData.colorsStr || (Array.isArray(formData.colors) ? formData.colors.join(', ') : '')}
                        onChange={(e) => setFormData({ ...formData, colorsStr: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
                        placeholder="Ex: Blanc Pur, Rose Poudré, Bleu Azur, Noir Mat"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Poids Moyen par Paire (g)</label>
                      <input
                        type="number"
                        value={formData.weightPerPairGrams || 210}
                        onChange={(e) => setFormData({ ...formData, weightPerPairGrams: Number(e.target.value) })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono"
                        placeholder="210"
                      />
                    </div>
                  </div>
                </>
              )}

              {activeCategory === 'cartons' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Code Carton *</label>
                      <input
                        type="text"
                        required
                        value={formData.code || ''}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono font-bold"
                        placeholder="Ex: D5, D1, D6"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Désignation du Format *</label>
                      <input
                        type="text"
                        required
                        value={formData.name || ''}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
                        placeholder="Ex: Carton D5 - 12 Paires (Spécial Sabots)"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Capacité Paires / Carton *</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        required
                        value={formData.defaultPairsPerCarton || 12}
                        onChange={(e) => setFormData({ ...formData, defaultPairsPerCarton: Number(e.target.value) })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Dimensions (L x l x h mm)</label>
                      <input
                        type="text"
                        value={formData.dimensionsMm || ''}
                        onChange={(e) => setFormData({ ...formData, dimensionsMm: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono"
                        placeholder="Ex: 600 x 400 x 320 mm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Poids Brut Max (kg)</label>
                      <input
                        type="number"
                        value={formData.maxWeightKg || 10}
                        onChange={(e) => setFormData({ ...formData, maxWeightKg: Number(e.target.value) })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Description &amp; Consignes</label>
                    <textarea
                      rows={2}
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
                      placeholder="Spécifications de gerbage, résistance carton ou modèles cibles..."
                    />
                  </div>
                </>
              )}

              {activeCategory === 'size_ranges' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Code Plage *</label>
                      <input
                        type="text"
                        required
                        value={formData.code || ''}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono font-bold"
                        placeholder="Ex: 36-41"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Libellé Descriptif *</label>
                      <input
                        type="text"
                        required
                        value={formData.label || ''}
                        onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
                        placeholder="Ex: 36–41 (Femme Standard)"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Catégorie *</label>
                      <select
                        value={formData.category || 'Femme'}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
                      >
                        <option value="Femme">Femme</option>
                        <option value="Homme">Homme</option>
                        <option value="Garçon">Garçon</option>
                        <option value="Enfant">Enfant</option>
                        <option value="Bébé">Bébé</option>
                        <option value="Mixte">Mixte</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Pointure Min *</label>
                      <input
                        type="number"
                        required
                        value={formData.minSize || 36}
                        onChange={(e) => setFormData({ ...formData, minSize: Number(e.target.value) })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Pointure Max *</label>
                      <input
                        type="number"
                        required
                        value={formData.maxSize || 41}
                        onChange={(e) => setFormData({ ...formData, maxSize: Number(e.target.value) })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Intervalles Suggérés (séparés par virgule)
                    </label>
                    <input
                      type="text"
                      value={formData.intervalsStr || (Array.isArray(formData.intervals) ? formData.intervals.join(', ') : '')}
                      onChange={(e) => setFormData({ ...formData, intervalsStr: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono"
                      placeholder="Ex: 36-37, 38-39, 39-40, 40-41"
                    />
                  </div>
                </>
              )}

              {activeCategory === 'molds' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Code Moule</label>
                      <input
                        type="text"
                        required
                        value={formData.code || ''}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Pointure Moule</label>
                      <input
                        type="number"
                        required
                        value={formData.size || 40}
                        onChange={(e) => setFormData({ ...formData, size: Number(e.target.value) })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Modèle Associé</label>
                    <select
                      value={formData.modelId || ''}
                      onChange={(e) => {
                        const m = shoeModels.find((x) => x.id === e.target.value);
                        setFormData({ ...formData, modelId: e.target.value, modelName: m?.name || '' });
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
                    >
                      {shoeModels.map((m) => (
                        <option key={m.id} value={m.id}>{m.name} ({m.code})</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {activeCategory === 'colors' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Nom de la Couleur</label>
                      <input
                        type="text"
                        required
                        value={formData.name || ''}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Code Hexadécimal</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={formData.hex || '#1E3A8A'}
                          onChange={(e) => setFormData({ ...formData, hex: e.target.value })}
                          className="w-8 h-8 rounded border border-slate-200 p-0 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={formData.hex || '#1E3A8A'}
                          onChange={(e) => setFormData({ ...formData, hex: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {activeCategory === 'materials' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Code Matière</label>
                      <input
                        type="text"
                        required
                        value={formData.code || ''}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Désignation</label>
                      <input
                        type="text"
                        required
                        value={formData.name || ''}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Type</label>
                      <select
                        value={formData.type || 'EVA'}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
                      >
                        <option value="EVA">Granulés EVA</option>
                        <option value="PVC">PVC Plastifié</option>
                        <option value="TPR">TPR Gomme</option>
                        <option value="COLORANT">Colorant / Masterbatch</option>
                        <option value="ADDITIF">Agent Gonflant / Additif</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Seuil Alerte Stock</label>
                      <input
                        type="number"
                        value={formData.minAlertThreshold || 40}
                        onChange={(e) => setFormData({ ...formData, minAlertThreshold: Number(e.target.value) })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* General active status check */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <input
                  type="checkbox"
                  id="active-check"
                  checked={formData.active !== false}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="active-check" className="text-xs text-slate-700 font-medium">
                  Référentiel actif dans l'atelier (utilisable dans les ordres de production)
                </label>
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingItem(null);
                  }}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition"
                >
                  {editingItem ? 'Enregistrer les modifications' : 'Créer le référentiel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
