import React, { useState, useMemo } from 'react';
import {
  Boxes,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  Edit2,
  Trash2,
  Check,
  X,
  Package,
  Layers,
  Sparkles,
  ShieldCheck,
  FileSpreadsheet,
  Filter,
  Info,
  Camera,
  Image as ImageIcon,
  RefreshCw,
  Eye,
  SlidersHorizontal,
  Briefcase,
  Factory,
  Wrench,
  ShieldAlert,
  Lock,
  ChevronRight,
  ExternalLink,
  Upload
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ModelMasterItem } from '../../types';
import { getLogicalKey } from '../../data/modelMasterData';

type DomainType = 'ALL' | 'PRODUCTION' | 'COMMERCIAL' | 'QUALITE' | 'MAINTENANCE';

export const ModelMasterView: React.FC = () => {
  const {
    modelMaster,
    addModelMaster,
    updateModelMaster,
    updateModelPhoto,
    importAndSyncClick1Models,
    validatePendingModel,
    deleteModelMaster,
    resetModelMasterToCatalog,
    lookupModelMaster,
    currentUser,
    can,
    isRTL,
  } = useApp();

  // Determine user's native domain based on role
  const userDomain: DomainType = useMemo(() => {
    const role = currentUser?.role || '';
    if (role === 'admin_general' || role === 'directeur_usine' || role === 'super_admin') return 'ALL';
    if (role === 'resp_production' || role === 'chef_equipe' || role === 'operateur') return 'PRODUCTION';
    if (role === 'resp_commercial' || role === 'commercial') return 'COMMERCIAL';
    if (role === 'resp_qualite' || role === 'controleur_qualite') return 'QUALITE';
    if (role === 'resp_maintenance' || role === 'technicien_maintenance') return 'MAINTENANCE';
    return 'ALL';
  }, [currentUser]);

  // Active domain view (managers can switch, regular operators/commercial are locked to their domain or authorized views)
  const isSupervisor =
    currentUser?.role === 'admin_general' ||
    currentUser?.role === 'directeur_usine' ||
    currentUser?.role === 'resp_production';

  const [activeDomain, setActiveDomain] = useState<DomainType>(userDomain);

  // Search, Category and Status Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'VERIFIED' | 'PENDING'>('ALL');
  const [viewLayout, setViewLayout] = useState<'table' | 'grid'>('grid');

  // Photo Upload Modal
  const [photoModalItem, setPhotoModalItem] = useState<ModelMasterItem | null>(null);
  const [photoInput, setPhotoInput] = useState<string>('');
  const [photoUploadSuccess, setPhotoUploadSuccess] = useState<string | null>(null);

  // Click1 Sync feedback
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Add / Edit Model Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ModelMasterItem | null>(null);
  const [formData, setFormData] = useState({
    model_name: '',
    article: '',
    designation: '',
    category: 'Femme',
    pointure: '36/41',
    paires_par_carton: 12,
    reference_moule: '',
    material: 'EVA' as const,
    photo: '',
    verified: true,
    source: 'MANUAL_ENTRY' as ModelMasterItem['source'],
  });
  const [formError, setFormError] = useState<string | null>(null);

  // Detail Drawer / Modal for Model Inspection
  const [detailModalItem, setDetailModalItem] = useState<ModelMasterItem | null>(null);

  // Permissions check based on organigramme & domains
  const canEditCurrentDomain = useMemo(() => {
    if (currentUser?.role === 'admin_general' || currentUser?.role === 'directeur_usine') return true;
    if (activeDomain === 'PRODUCTION' && (currentUser?.role === 'resp_production' || currentUser?.role === 'chef_equipe')) return true;
    if (activeDomain === 'COMMERCIAL' && (currentUser?.role === 'resp_commercial' || currentUser?.role === 'commercial')) return true;
    if (activeDomain === 'QUALITE' && (currentUser?.role === 'resp_qualite' || currentUser?.role === 'controleur_qualite')) return true;
    if (activeDomain === 'MAINTENANCE' && (currentUser?.role === 'resp_maintenance' || currentUser?.role === 'technicien_maintenance')) return true;
    return false;
  }, [currentUser, activeDomain]);

  // Click1 Sync Action
  const handleSyncClick1 = () => {
    const res = importAndSyncClick1Models();
    setSyncFeedback(res.message);
    setTimeout(() => setSyncFeedback(null), 5000);
  };

  // Filtered List based on Search, Category, Status, and Domain
  const filteredList = useMemo(() => {
    return modelMaster.filter((item) => {
      const matchesSearch =
        item.model_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.article.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.pointure.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.reference_moule && item.reference_moule.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCategory =
        categoryFilter === 'ALL' || item.category.toLowerCase() === categoryFilter.toLowerCase();

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'VERIFIED' && item.verified) ||
        (statusFilter === 'PENDING' && !item.verified);

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [modelMaster, searchTerm, categoryFilter, statusFilter]);

  // Modal Open Handlers
  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormData({
      model_name: '',
      article: '',
      designation: '',
      category: 'Femme',
      pointure: '36/41',
      paires_par_carton: 12,
      reference_moule: '',
      material: 'EVA',
      photo: '',
      verified: true,
      source: 'MANUAL_ENTRY',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: ModelMasterItem) => {
    setEditingItem(item);
    setFormData({
      model_name: item.model_name,
      article: item.article || item.model_name,
      designation: item.designation,
      category: item.category,
      pointure: item.pointure,
      paires_par_carton: item.paires_par_carton,
      reference_moule: item.reference_moule || `M-${item.article || item.model_name}`,
      material: (item.material || 'EVA') as any,
      photo: item.photo || '',
      verified: item.verified,
      source: item.source,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  // Handle Form Submission
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const name = formData.model_name.trim() || formData.article.trim();
    if (!name) {
      setFormError('Le nom du modèle ou code article est obligatoire.');
      return;
    }
    if (!formData.pointure.trim()) {
      setFormError('La pointure ou plage de pointures est obligatoire (ex: 36/41).');
      return;
    }
    if (formData.paires_par_carton <= 0) {
      setFormError('Le nombre de paires par carton doit être supérieur à 0.');
      return;
    }

    if (editingItem) {
      const res = updateModelMaster(editingItem.id, {
        model_name: name,
        article: formData.article.trim() || name,
        designation: formData.designation.trim() || `${name} ${formData.category} ${formData.pointure}`,
        category: formData.category,
        pointure: formData.pointure.trim(),
        paires_par_carton: formData.paires_par_carton,
        reference_moule: formData.reference_moule.trim() || `M-${name}`,
        material: formData.material,
        photo: formData.photo,
        condt: `${formData.paires_par_carton} PAIRES`,
      });
      if (!res.success) {
        setFormError(res.message);
        return;
      }
    } else {
      const res = addModelMaster({
        model_name: name,
        article: formData.article.trim() || name,
        designation: formData.designation.trim() || `${name} ${formData.category} ${formData.pointure}`,
        category: formData.category,
        pointure: formData.pointure.trim(),
        paires_par_carton: formData.paires_par_carton,
        reference_moule: formData.reference_moule.trim() || `M-${name}`,
        material: formData.material,
        photo: formData.photo,
        condt: `${formData.paires_par_carton} PAIRES`,
        verified: true,
        source: 'MANUAL_ENTRY',
      });
      if (!res.success) {
        setFormError(res.message);
        return;
      }
    }

    setIsModalOpen(false);
  };

  // Handle Photo Save
  const handleSavePhoto = () => {
    if (!photoModalItem) return;
    updateModelPhoto(photoModalItem.id, photoInput);
    setPhotoUploadSuccess('Photo enregistrée avec succès.');
    setTimeout(() => {
      setPhotoUploadSuccess(null);
      setPhotoModalItem(null);
    }, 1200);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner with Direct Access & High Visibility */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 border border-slate-700/80 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                <Boxes className="w-3.5 h-3.5" />
                Module Modèles Produits CTP SMART
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <ShieldCheck className="w-3.5 h-3.5" />
                {modelMaster.length} Modèles Référencés
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Clé Logique : Article + Pointure + Catégorie
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              Base Référentielle des Modèles Produits
            </h1>
            <p className="text-slate-300 text-sm max-w-3xl leading-relaxed">
              Catalogue central des articles de la manufacture CTP. Intègre automatiquement les données techniques 
              (moules, pointures, conditionnement par carton) et les photos pour chaque domaine : Production, Commercial, Qualité et Maintenance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {/* Sync Click1 Button */}
            <button
              onClick={handleSyncClick1}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-indigo-600/80 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition"
              title="Intégrer et synchroniser les modèles Click1 sans créer de doublons"
              id="btn-sync-click1-models"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Intégrer Données Click1
            </button>

            {/* Quick Add Model Button */}
            {(isSupervisor || canEditCurrentDomain) && (
              <button
                onClick={handleOpenAddModal}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 transition transform hover:-translate-y-0.5 active:translate-y-0"
                id="btn-add-model-master"
              >
                <Plus className="w-4 h-4" />
                Ajouter un Modèle
              </button>
            )}

            {/* Reinitialiser Catalogue 180 articles */}
            {currentUser?.role === 'admin_general' && (
              <button
                onClick={() => {
                  if (window.confirm('Réinitialiser la base avec les 180 articles officiels ? Vos ajouts récents seront préservés.')) {
                    resetModelMasterToCatalog();
                  }
                }}
                className="inline-flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-medium transition"
                title="Restaurer la liste officielle des articles"
              >
                <RotateCcw className="w-3 h-3" />
                Réinitialiser
              </button>
            )}
          </div>
        </div>

        {/* Sync Feedback Alert */}
        {syncFeedback && (
          <div className="mt-4 p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-200 text-xs font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              {syncFeedback}
            </div>
            <button onClick={() => setSyncFeedback(null)} className="text-emerald-300 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Domain Selection Tabs (Role-Based Access) */}
        <div className="flex flex-wrap items-center gap-2 mt-6 pt-4 border-t border-slate-700/80">
          <div className="text-xs font-bold text-slate-400 mr-2 flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
            Vue par Domaine :
          </div>

          {(
            [
              { id: 'ALL', label: 'Vue Globale (Direction)', icon: Boxes, reqAdmin: true },
              { id: 'PRODUCTION', label: 'Production & Moules', icon: Factory },
              { id: 'COMMERCIAL', label: 'Commercial & Ventes', icon: Briefcase },
              { id: 'QUALITE', label: 'Contrôle Qualité', icon: ShieldCheck },
              { id: 'MAINTENANCE', label: 'Maintenance & Stations', icon: Wrench },
            ] as const
          ).map((dom) => {
            const isSelected = activeDomain === dom.id;
            const isUserNative = userDomain === dom.id;
            return (
              <button
                key={dom.id}
                onClick={() => {
                  if (!isSupervisor && userDomain !== 'ALL' && dom.id !== userDomain) {
                    alert(`Accès réservé : votre profil est assigné au domaine ${userDomain}.`);
                    return;
                  }
                  setActiveDomain(dom.id);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <dom.icon className="w-3.5 h-3.5" />
                <span>{dom.label}</span>
                {isUserNative && (
                  <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/30 text-emerald-300">
                    Mon Service
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Rechercher modèle, moule, article, pointure..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="ALL">Toutes Catégories</option>
            <option value="Femme">Femme</option>
            <option value="Homme">Homme</option>
            <option value="Fillette">Fillette</option>
            <option value="Garçon">Garçon</option>
            <option value="Enfant">Enfant</option>
            <option value="Bébé">Bébé</option>
            <option value="Kadet">Kadet</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="ALL">Tous les statuts</option>
            <option value="VERIFIED">Validés officiels</option>
            <option value="PENDING">À vérifier</option>
          </select>

          {/* View Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 ml-auto">
            <button
              onClick={() => setViewLayout('grid')}
              className={`p-1.5 rounded-lg text-xs font-bold transition ${
                viewLayout === 'grid' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Affichage Catalogue Grille (avec photos)"
            >
              Grille Photos
            </button>
            <button
              onClick={() => setViewLayout('table')}
              className={`p-1.5 rounded-lg text-xs font-bold transition ${
                viewLayout === 'table' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Affichage Tableau Détaillé"
            >
              Tableau
            </button>
          </div>
        </div>
      </div>

      {/* Content Rendering: Grid vs Table */}
      {viewLayout === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredList.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
              Aucun modèle ne correspond aux filtres actuels.
            </div>
          ) : (
            filteredList.map((item) => {
              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col group"
                >
                  {/* Model Photo Container */}
                  <div className="h-40 bg-gradient-to-br from-slate-100 to-slate-200 relative overflow-hidden flex items-center justify-center p-2 border-b border-slate-100">
                    {item.photo ? (
                      <img
                        src={item.photo}
                        alt={item.model_name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover rounded-xl group-hover:scale-105 transition duration-300"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                        <ImageIcon className="w-10 h-10 mb-1 opacity-50 text-slate-500" />
                        <span className="text-[11px] font-semibold text-slate-500 font-mono">
                          {item.article || item.model_name}
                        </span>
                        <span className="text-[10px] text-slate-400">Aucune photo</span>
                      </div>
                    )}

                    {/* Badge Category */}
                    <div className="absolute top-2 left-2 flex gap-1">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/90 backdrop-blur-md text-slate-800 shadow-sm">
                        {item.category}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white shadow-sm">
                        {item.pointure}
                      </span>
                    </div>

                    {/* Action Button to update / add photo */}
                    <button
                      onClick={() => {
                        setPhotoModalItem(item);
                        setPhotoInput(item.photo || '');
                      }}
                      className="absolute bottom-2 right-2 p-1.5 bg-slate-900/80 hover:bg-slate-900 text-white rounded-lg text-[10px] font-semibold backdrop-blur-sm shadow-md transition flex items-center gap-1 opacity-90 group-hover:opacity-100"
                      title="Ajouter ou modifier la photo"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Photo</span>
                    </button>
                  </div>

                  {/* Card Content with Domain Specific Fields */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-mono text-xs font-black text-blue-600 uppercase">
                          {item.article || item.model_name}
                        </span>
                        {item.verified ? (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 font-bold">
                            <CheckCircle2 className="w-3 h-3" /> Validé
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-600 font-bold">
                            <Clock className="w-3 h-3" /> À vérifier
                          </span>
                        )}
                      </div>

                      <h3 className="font-bold text-slate-900 text-sm line-clamp-1 mt-0.5">
                        {item.designation || item.model_name}
                      </h3>

                      {/* Domain-specific metrics */}
                      <div className="mt-2 text-xs space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        {/* Always show mould & packaging */}
                        <div className="flex justify-between text-slate-600">
                          <span className="text-[11px]">Réf. Moule :</span>
                          <span className="font-mono font-bold text-slate-900 text-[11px]">
                            {item.reference_moule || `M-${item.article || '01'}`}
                          </span>
                        </div>

                        <div className="flex justify-between text-slate-600">
                          <span className="text-[11px]">Conditionnement :</span>
                          <span className="font-bold text-emerald-700 text-[11px]">
                            {item.paires_par_carton} paires / ctn
                          </span>
                        </div>

                        {activeDomain === 'PRODUCTION' && (
                          <div className="flex justify-between text-slate-600 pt-1 border-t border-slate-200">
                            <span className="text-[11px]">Matière Atelier :</span>
                            <span className="font-bold text-blue-800 text-[11px]">{item.material || 'EVA'}</span>
                          </div>
                        )}

                        {activeDomain === 'COMMERCIAL' && (
                          <div className="flex justify-between text-slate-600 pt-1 border-t border-slate-200">
                            <span className="text-[11px]">Usage Ventes :</span>
                            <span className="font-bold text-indigo-700 text-[11px]">Commercialisable</span>
                          </div>
                        )}

                        {activeDomain === 'QUALITE' && (
                          <div className="flex justify-between text-slate-600 pt-1 border-t border-slate-200">
                            <span className="text-[11px]">Tolérance Poids :</span>
                            <span className="font-bold text-slate-800 text-[11px]">Standard CTP ±5%</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                      <button
                        onClick={() => setDetailModalItem(item)}
                        className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Fiche
                      </button>

                      {canEditCurrentDomain && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Modifier les données du modèle"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {currentUser?.role === 'admin_general' && (
                            <button
                              onClick={() => {
                                if (window.confirm(`Supprimer le modèle ${item.model_name} ?`)) {
                                  deleteModelMaster(item.id);
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Supprimer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3">Photo</th>
                  <th className="py-3 px-3">Article / Modèle</th>
                  <th className="py-3 px-3">Désignation</th>
                  <th className="py-3 px-3">Catégorie</th>
                  <th className="py-3 px-3">Pointure</th>
                  <th className="py-3 px-3">Réf. Moule</th>
                  <th className="py-3 px-3 text-right">Paires/Carton</th>
                  <th className="py-3 px-3">Matière</th>
                  <th className="py-3 px-3 text-center">Statut</th>
                  <th className="py-3 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredList.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition">
                    <td className="py-2 px-3">
                      <div
                        onClick={() => {
                          setPhotoModalItem(item);
                          setPhotoInput(item.photo || '');
                        }}
                        className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center cursor-pointer overflow-hidden hover:opacity-80 transition"
                        title="Cliquer pour ajouter/modifier la photo"
                      >
                        {item.photo ? (
                          <img src={item.photo} alt={item.model_name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                        ) : (
                          <Camera className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900 font-mono">{item.article || item.model_name}</div>
                      <div className="text-[10px] text-slate-400">{item.model_name}</div>
                    </td>
                    <td className="py-2.5 px-3 max-w-xs truncate text-slate-700 font-medium">
                      {item.designation}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">
                      {item.category}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-[11px] border border-blue-200">
                        {item.pointure}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                      {item.reference_moule || `M-${item.article || '01'}`}
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-emerald-700 font-mono">
                      {item.paires_par_carton} p
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-700">
                      {item.material || 'EVA'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {item.verified ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3" /> Validé
                        </span>
                      ) : (
                        <button
                          onClick={() => validatePendingModel(item.id)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 hover:bg-amber-200 transition"
                        >
                          <Clock className="w-3 h-3" /> Valider
                        </button>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            setPhotoModalItem(item);
                            setPhotoInput(item.photo || '');
                          }}
                          className="p-1 text-slate-400 hover:text-blue-600 rounded"
                          title="Modifier la photo"
                        >
                          <Camera className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(item)}
                          className="p-1 text-slate-400 hover:text-blue-600 rounded"
                          title="Modifier"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: AJOUTER / MODIFIER PHOTO DU MODÈLE */}
      {photoModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
                <Camera className="w-5 h-5 text-blue-600" />
                Photo du Modèle — {photoModalItem.model_name}
              </div>
              <button
                onClick={() => setPhotoModalItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {photoUploadSuccess && (
              <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-xl border border-emerald-200">
                {photoUploadSuccess}
              </div>
            )}

            {/* Preview Box */}
            <div className="h-44 bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center border border-slate-200 relative">
              {photoInput ? (
                <img
                  src={photoInput}
                  alt="Aperçu"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-center text-slate-400 p-4">
                  <ImageIcon className="w-10 h-10 mx-auto mb-1 opacity-40" />
                  <span className="text-xs">Aperçu de la photo</span>
                </div>
              )}
            </div>

            {/* Upload File or URL */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Téléverser depuis l'appareil :</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setPhotoInput(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Ou saisir une URL d'image :</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={photoInput}
                  onChange={(e) => setPhotoInput(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPhotoModalItem(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSavePhoto}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-600/30"
              >
                Enregistrer la Photo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: FICHE DÉTAIL DU MODÈLE */}
      {detailModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  {detailModalItem.model_name}
                </h3>
                <p className="text-xs text-slate-500 font-mono">Code Article : {detailModalItem.article}</p>
              </div>
              <button
                onClick={() => setDetailModalItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Photo & Specs */}
            <div className="flex gap-4 items-start">
              <div className="w-32 h-32 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                {detailModalItem.photo ? (
                  <img src={detailModalItem.photo} alt={detailModalItem.model_name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-slate-400" />
                )}
              </div>

              <div className="flex-1 space-y-1 text-xs">
                <div className="text-slate-600 font-medium">{detailModalItem.designation}</div>
                <div className="pt-2 grid grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-slate-50 p-2 rounded-lg">
                    <span className="text-slate-500 block">Pointure :</span>
                    <strong className="text-slate-900">{detailModalItem.pointure}</strong>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg">
                    <span className="text-slate-500 block">Moule :</span>
                    <strong className="text-slate-900 font-mono">{detailModalItem.reference_moule || 'Standard'}</strong>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg">
                    <span className="text-slate-500 block">Conditionnement :</span>
                    <strong className="text-emerald-700">{detailModalItem.paires_par_carton} p/ctn</strong>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg">
                    <span className="text-slate-500 block">Catégorie :</span>
                    <strong className="text-slate-900">{detailModalItem.category}</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setDetailModalItem(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: AJOUTER / MODIFIER MODÈLE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-lg">
                <Boxes className="w-5 h-5 text-blue-600" />
                {editingItem ? 'Modifier le Modèle Produit' : 'Ajouter un Nouveau Modèle'}
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Code Article / Réf</label>
                  <input
                    type="text"
                    value={formData.article}
                    onChange={(e) => setFormData({ ...formData, article: e.target.value })}
                    placeholder="Ex: 021C, SB99, CLICK-1"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nom du Modèle</label>
                  <input
                    type="text"
                    value={formData.model_name}
                    onChange={(e) => setFormData({ ...formData, model_name: e.target.value })}
                    placeholder="Ex: Sabot Presto Femme"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Désignation Complète</label>
                <input
                  type="text"
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  placeholder="Ex: MOCASSIN HOMME 39/44"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Référence Moule</label>
                  <input
                    type="text"
                    value={formData.reference_moule}
                    onChange={(e) => setFormData({ ...formData, reference_moule: e.target.value })}
                    placeholder="Ex: M-021C-3641"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Pointure / Intervalle</label>
                  <input
                    type="text"
                    value={formData.pointure}
                    onChange={(e) => setFormData({ ...formData, pointure: e.target.value })}
                    placeholder="Ex: 36/41, 39/44"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Paires / Carton</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.paires_par_carton}
                    onChange={(e) => setFormData({ ...formData, paires_par_carton: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-black text-emerald-700"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Catégorie</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="Femme">Femme</option>
                    <option value="Homme">Homme</option>
                    <option value="Fillette">Fillette</option>
                    <option value="Garçon">Garçon</option>
                    <option value="Enfant">Enfant</option>
                    <option value="Bébé">Bébé</option>
                    <option value="Kadet">Kadet</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Matière</label>
                  <select
                    value={formData.material}
                    onChange={(e) => setFormData({ ...formData, material: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="EVA">EVA</option>
                    <option value="PVC">PVC</option>
                    <option value="TPR">TPR</option>
                    <option value="SOUMELLE">SOUMELLE</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Photo (URL ou Fichier)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setFormData({ ...formData, photo: reader.result as string });
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-md shadow-blue-600/30"
                >
                  {editingItem ? 'Enregistrer les Modifications' : 'Créer le Modèle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
