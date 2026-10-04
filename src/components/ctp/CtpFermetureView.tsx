import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { CtpEva3Jour15Panel } from './CtpEva3Jour15Panel';
import {
  Lock,
  CheckCircle,
  AlertTriangle,
  QrCode,
  Box,
  Layers,
  Clock,
  ShieldCheck,
  Search,
  Sparkles,
  ArrowRight,
  Printer,
  History,
  Info,
  UserCheck,
} from 'lucide-react';
import { getCartonQrCodeDataUrl } from '../../utils/ctpQrHelper';
import { formatCartonMultiColorSummary } from '../../data/ctpFactoryErpData';
import { evaluateCartonClosure } from '../../utils/ctpCartonFlowEngine';

export const CtpFermetureView: React.FC = () => {
  const {
    ctpCartons,
    ctpProductionJournal,
    closeCarton,
    closeAllReadyCartons,
    wipOpenCount,
    wipOpenAlert,
    cartonsReadyToCloseCount,
    stockCartonsRemplisCount,
    stockCartonsFermesCount,
    closeCtpCartonStrict,
    validateQualityCheck,
    setActiveTab: setGlobalActiveTab,
    currentUser,
  } = useApp();

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('all');
  const [scannedQrCode, setScannedQrCode] = useState<string>('');
  const [selectedCartonId, setSelectedCartonId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);
  const [authorizedSigner, setAuthorizedSigner] = useState<string>(currentUser?.name || 'Chef d\'Équipe C');

  // QR Modal Simulation & Confirmation إغلاق نهائي؟
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [printCarton, setPrintCarton] = useState<any | null>(null);
  const [cartonToConfirmClose, setCartonToConfirmClose] = useState<string | null>(null);

  // Cartons prêts pour fermeture (statut OUVERT et paires_actuelles == paires_par_carton)
  const cartonsReadyToClose = useMemo(() => {
    return ctpCartons.filter(
      (c) => c.statut === 'OUVERT' && c.paires_actuelles === c.paires_par_carton
    );
  }, [ctpCartons]);

  // Cartons en cours incomplets (statut OUVERT et paires_actuelles < paires_par_carton)
  const cartonsIncomplete = useMemo(() => {
    return ctpCartons.filter(
      (c) => c.statut === 'OUVERT' && c.paires_actuelles < c.paires_par_carton
    );
  }, [ctpCartons]);

  // Historique des fermetures (statut FERME)
  const closedCartonsHistory = useMemo(() => {
    const list = ctpCartons
      .filter((c) => c.statut === 'FERME')
      .sort((a, b) => (b.date_fermeture || '').localeCompare(a.date_fermeture || ''));
    const seen = new Set<string>();
    return list.filter((c) => {
      if (!c.id_carton || seen.has(c.id_carton)) return false;
      seen.add(c.id_carton);
      return true;
    });
  }, [ctpCartons]);

  // Filtered list of open cartons
  const filteredOpenCartons = useMemo(() => {
    const list = ctpCartons
      .filter((c) => c.statut === 'OUVERT')
      .filter((c) => {
        const matchesSearch =
          c.id_carton.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.modele_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.pointure_text.includes(searchTerm);
        const matchesModel = selectedModel === 'all' || c.modele_id === selectedModel;
        return matchesSearch && matchesModel;
      });
    const seen = new Set<string>();
    return list.filter((c) => {
      if (!c.id_carton || seen.has(c.id_carton)) return false;
      seen.add(c.id_carton);
      return true;
    });
  }, [ctpCartons, searchTerm, selectedModel]);

  // Currently inspected carton
  const activeCarton = useMemo(() => {
    if (!selectedCartonId) return null;
    return ctpCartons.find((c) => c.id_carton === selectedCartonId) || null;
  }, [ctpCartons, selectedCartonId]);

  // Simulate scanning QR Code
  const handleScanSimulate = (cartonId: string) => {
    setScannedQrCode(cartonId);
    setSelectedCartonId(cartonId);
    setShowQrModal(false);
    const found = ctpCartons.find((c) => c.id_carton === cartonId);
    if (!found) {
      setNotification({ type: 'error', message: `Carton ${cartonId} introuvable dans le système.` });
    } else if (found.statut === 'FERME') {
      setNotification({ type: 'warning', message: `Le carton ${cartonId} est déjà FERMÉ par l'Équipe C.` });
    } else if (found.paires_actuelles < found.paires_par_carton) {
      setNotification({
        type: 'warning',
        message: `Carton scanné ${cartonId} : INCOMPLET (${found.paires_actuelles}/${found.paires_par_carton} paires). Fermeture interdite tant qu'il n'est pas plein.`,
      });
    } else {
      setNotification({
        type: 'success',
        message: `Carton ${cartonId} scanné avec succès : 100% plein (${found.paires_actuelles}/${found.paires_par_carton} paires). Prêt pour clôture Équipe C.`,
      });
    }
  };

  // Close specific carton strictly according to the 5 conditions
  const handleCloseCarton = (id: string) => {
    const res = closeCtpCartonStrict(id, authorizedSigner);
    if (res.success) {
      setNotification({ type: 'success', message: res.message });
      setSelectedCartonId(null);
    } else {
      setNotification({ type: 'error', message: res.message });
    }
    setTimeout(() => setNotification(null), 6000);
  };

  // Close all full cartons
  const handleCloseAllReady = () => {
    let closedCount = 0;
    cartonsReadyToClose.forEach((c) => {
      const val = evaluateCartonClosure(c, { authorizedOperator: authorizedSigner });
      if (val.canClose) {
        closeCtpCartonStrict(c.id_carton, authorizedSigner);
        closedCount++;
      }
    });

    if (closedCount > 0) {
      setNotification({ type: 'success', message: `${closedCount} carton(s) scellé(s) avec succès selon les 5 conditions.` });
    } else {
      setNotification({ type: 'warning', message: 'Aucun carton ne remplit actuellement l\'ensemble des 5 conditions (contrôle qualité ou couleurs incomplètes).' });
    }
    setTimeout(() => setNotification(null), 6000);
  };

  return (
    <div id="ctp-fermeture-view" className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-amber-500/20 text-amber-400 border border-amber-500/40 text-xs font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Équipe C UNIQUEMENT
              </span>
              <span className="text-xs text-slate-400">Règle Métier CTP 2026</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Lock className="w-6 h-6 text-amber-400" /> Fermeture & Clôture des Cartons
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Seule l'Équipe C est habilitée à clôturer et sceller les cartons. <strong className="text-amber-300">C'est la SEULE interface qui incrémente le stock vendable.</strong> Tout carton incomplet (&lt;12 paires) est strictement refusé.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setGlobalActiveTab('ctp_flow')}
              className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-sm font-bold transition flex items-center gap-2 shadow-sm"
              title="Calcul dynamique des cartons basé sur le flux physique réel"
            >
              <Layers className="w-4 h-4 text-purple-200" /> Flux 3 Étapes &rarr;
            </button>
            <button
              onClick={() => setShowQrModal(true)}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-medium transition flex items-center gap-2 border border-slate-700 shadow-sm"
            >
              <QrCode className="w-4 h-4 text-amber-400" /> Scanner QR Carton
            </button>
            <button
              onClick={handleCloseAllReady}
              disabled={cartonsReadyToClose.length === 0}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition flex items-center gap-2 shadow-md ${
                cartonsReadyToClose.length > 0
                  ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
              }`}
            >
              <CheckCircle className="w-4 h-4" /> Tout Clôturer ({cartonsReadyToClose.length} prêts)
            </button>
          </div>
        </div>

        {/* WIP Alert Notification Rule */}
        {wipOpenAlert && (
          <div className="mt-4 p-3 bg-red-950/80 border border-red-500/50 rounded-xl text-red-200 text-sm flex items-center gap-3 animate-pulse">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            <div>
              <strong className="font-semibold">⚠️ ALERTE ATELIER CTP :</strong> Il y a actuellement{' '}
              <span className="font-bold text-white">{wipOpenCount} cartons ouverts</span> en WIP (&gt; 20 cartons).
              L'Équipe C doit procéder d'urgence à la vérification et fermeture des cartons pour alimenter le stock vendable !
            </div>
          </div>
        )}
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`p-4 rounded-xl text-sm font-medium flex items-center justify-between border shadow-md transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : notification.type === 'warning'
              ? 'bg-amber-50 text-amber-800 border-amber-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            )}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-xs underline ml-4 hover:opacity-75">
            Fermer
          </button>
        </div>
      )}

      {/* KPI Cards Row avec distinction des 2 compteurs métier */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Compteur 1 : تم ملؤها */}
        <div className="bg-white border-2 border-indigo-200 rounded-xl p-4 shadow-sm bg-gradient-to-br from-white to-indigo-50/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-indigo-900 uppercase tracking-wider">
              تم ملؤها (Cartons Remplis)
            </span>
            <span className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
              <Box className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-indigo-950 mt-2">
            {stockCartonsRemplisCount}{' '}
            <span className="text-xs font-bold text-indigo-600">cartons (&gt;0 p.)</span>
          </div>
          <div className="text-xs text-indigo-800 font-medium mt-1">
            Organisation atelier & Chef production
          </div>
        </div>

        {/* Compteur 2 : تم غلقها */}
        <div className="bg-white border-2 border-emerald-500/50 rounded-xl p-4 shadow-sm bg-gradient-to-br from-white to-emerald-50/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-emerald-900 uppercase tracking-wider">
              تم غلقها (Cartons Fermés)
            </span>
            <span className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
              <Lock className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-800 mt-2">
            {stockCartonsFermesCount}{' '}
            <span className="text-xs font-bold text-emerald-600">cartons (12/12)</span>
          </div>
          <div className="text-xs text-emerald-800 font-bold mt-1">
            Stock vendable commercial (100% scellé)
          </div>
        </div>

        {/* Prêts pour clôture Équipe C */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">En attente scellage Équipe C</span>
            <span className="p-2 bg-amber-100 text-amber-700 rounded-lg">
              <CheckCircle className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-amber-800 mt-2">{cartonsReadyToClose.length}</div>
          <div className="text-xs text-amber-700 font-medium mt-1">100% complets (12/12) prêts à fermer</div>
        </div>

        {/* Règle d'habilitation Équipe C */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Habilitation & Règle</span>
            <span className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <ShieldCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="text-sm font-bold text-slate-900 mt-2">Équipe C (Seule à Fermer)</div>
          <div className="text-xs text-slate-500 font-medium mt-1">Équipes A/B : Remplissage uniquement</div>
        </div>
      </div>

      {/* Main Action Workspaces: Left List of Cartons, Right Inspection / Closure Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols): Cartons en attente de fermeture */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/50">
              <div>
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <Box className="w-4 h-4 text-slate-600" /> Cartons Ouverts en Atelier (WIP)
                </h3>
                <p className="text-xs text-slate-500">Cliquez sur un carton plein pour le valider et le fermer</p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Filtrer carton ou réf..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="all">Tous Modèles</option>
                  <option value="NM">Modèles NM (12 paires)</option>
                  <option value="BC07">Modèle BC07 (16 paires)</option>
                </select>
              </div>
            </div>

            {/* List */}
            <div className="divide-y divide-slate-100 max-h-[520px] overflow-y-auto">
              {filteredOpenCartons.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">
                  Aucun carton ouvert correspondant aux filtres.
                </div>
              ) : (
                filteredOpenCartons.map((carton, idx) => {
                  const isFull = carton.paires_actuelles === carton.paires_par_carton;
                  const isSelected = selectedCartonId === carton.id_carton;

                  return (
                    <div
                      key={`${carton.id_carton}-${carton.statut}-${idx}`}
                      onClick={() => setSelectedCartonId(carton.id_carton)}
                      className={`p-4 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 ${
                        isSelected ? 'bg-amber-50/70 border-l-4 border-amber-500' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`p-2 rounded-xl shrink-0 ${
                            isFull ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {isFull ? <CheckCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 font-mono text-sm">{carton.id_carton}</span>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                isFull
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {isFull ? 'PRÊT POUR CLÔTURE (12/12)' : `WIP EN COURS (${carton.paires_actuelles}/${carton.paires_par_carton})`}
                            </span>
                          </div>
                          <div className="text-xs text-slate-600 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span>Modèle: <strong className="text-slate-800">{carton.modele_id}</strong></span>
                            <span>Pointure: <strong className="text-slate-800">{carton.pointure_text}</strong></span>
                            <span>Machine: {carton.machine_origine || 'EVA 2'}</span>
                            <span>Remplissage: Équipe {carton.equipe_remplissage || 'A'}</span>
                          </div>

                          {/* Multi-Couleurs Résumé */}
                          <div className="mt-1.5 text-[11px] font-mono text-slate-700 bg-slate-100/90 px-2 py-1 rounded border border-slate-200">
                            {formatCartonMultiColorSummary(carton)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPrintCarton(carton);
                          }}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
                          title="Imprimer étiquette QR"
                        >
                          <Printer className="w-4 h-4" />
                        </button>

                        {isFull ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setCartonToConfirmClose(carton.id_carton);
                            }}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
                          >
                            <Lock className="w-3.5 h-3.5" /> Fermer Carton
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 italic px-2 py-1 bg-slate-100 rounded">
                            Incomplet ({carton.paires_actuelles}/{carton.paires_par_carton})
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column (1 col): Inspection & Validation Card */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
              <ShieldCheck className="w-5 h-5 text-amber-500" /> Poste de Validation Équipe C
            </h3>

            {activeCarton ? (
              <div className="mt-4 space-y-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <div className="w-24 h-24 mx-auto bg-white p-2 rounded-lg border border-slate-200 shadow-sm flex items-center justify-center">
                    <img
                      src={activeCarton.QR_code || getCartonQrCodeDataUrl(activeCarton.id_carton)}
                      alt="QR Code"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="font-mono font-bold text-slate-900 mt-2 text-base">{activeCarton.id_carton}</div>
                  <div className="text-xs text-slate-500">Carton d'origine CTP 2026</div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Modèle:</span>
                    <span className="font-semibold text-slate-800">{activeCarton.modele_id}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Pointure:</span>
                    <span className="font-semibold text-slate-800">{activeCarton.pointure_text}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Remplissage:</span>
                    <span className="font-semibold text-slate-800">
                      {activeCarton.paires_actuelles} / {activeCarton.paires_par_carton} paires
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Équipe Remplissage:</span>
                    <span className="font-semibold text-slate-800">Équipe {activeCarton.equipe_remplissage || 'A'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Machine:</span>
                    <span className="font-semibold text-slate-800">{activeCarton.machine_origine || 'EVA 2'}</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-xs text-slate-600 mb-1">
                    <span>Niveau de remplissage</span>
                    <span className="font-bold">
                      {Math.round((activeCarton.paires_actuelles / activeCarton.paires_par_carton) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-2.5 rounded-full transition-all ${
                        activeCarton.paires_actuelles === activeCarton.paires_par_carton
                          ? 'bg-emerald-500'
                          : 'bg-amber-500'
                      }`}
                      style={{
                        width: `${(activeCarton.paires_actuelles / activeCarton.paires_par_carton) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Multi-Couleurs Détails */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>Composition Multi-Couleurs CTP (Max 3)</span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-slate-200 rounded text-slate-800">
                      {activeCarton.nb_couleurs || 1}/3 Couleurs
                    </span>
                  </div>
                  <div className="text-xs font-mono text-slate-800 bg-white p-2 rounded border border-slate-200">
                    {formatCartonMultiColorSummary(activeCarton)}
                  </div>
                </div>

                {/* Validation selon les 5 conditions strictes */}
                {(() => {
                  const val = evaluateCartonClosure(activeCarton, { authorizedOperator: authorizedSigner });
                  return (
                    <div className="space-y-3 pt-2 border-t border-slate-100">
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                        <div className="flex items-center justify-between font-bold text-slate-800">
                          <span className="flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-amber-600" />
                            5 Conditions de Clôture
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black ${
                              val.canClose
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {val.canClose ? 'Prêt à Clôturer' : 'Incomplet (OUVERT)'}
                          </span>
                        </div>

                        <div className="space-y-1.5 text-[11px]">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-600">1. Couleurs/étapes :</span>
                            <span
                              className={`font-bold ${
                                val.allStepsCompleted ? 'text-emerald-700' : 'text-amber-700'
                              }`}
                            >
                              {val.allStepsCompleted
                                ? '3/3 étapes réalisées'
                                : `${activeCarton.nb_couleurs || 1}/3 étapes`}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-slate-600">2. Quantité requise :</span>
                            <span
                              className={`font-bold ${
                                val.requiredPairsComplete ? 'text-emerald-700' : 'text-rose-700'
                              }`}
                            >
                              {activeCarton.total_paires ?? activeCarton.paires_actuelles ?? 0}/
                              {activeCarton.paires_par_carton || 12} paires
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-slate-600">3. Configuration :</span>
                            <span className="text-emerald-700 font-bold">Modèle & Pt. Conformes</span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-slate-600">4. Contrôle qualité :</span>
                            {activeCarton.controle_qualite_valide ? (
                              <span className="text-emerald-700 font-bold flex items-center gap-1">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Validé
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  const res = validateQualityCheck(activeCarton.id_carton, authorizedSigner);
                                  if (res.success) setNotification({ type: 'success', message: res.message });
                                }}
                                className="px-2 py-0.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded text-[10px] transition-colors"
                              >
                                Valider Contrôle
                              </button>
                            )}
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-slate-600">5. Signataire Équipe C :</span>
                            <span className="font-bold text-slate-800">{authorizedSigner}</span>
                          </div>
                        </div>
                      </div>

                      {val.canClose ? (
                        <button
                          onClick={() => setCartonToConfirmClose(activeCarton.id_carton)}
                          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md transition flex items-center justify-center gap-2"
                        >
                          <CheckCircle className="w-4 h-4" /> VALIDER ET FERMER LE CARTON (إغلاق نهائي)
                        </button>
                      ) : (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs space-y-1">
                          <div className="font-bold flex items-center gap-1 text-amber-950">
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>Carton maintenu OUVERT :</span>
                          </div>
                          <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-800">
                            {val.blockReasons.map((reason, idx) => (
                              <li key={idx}>{reason}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <Box className="w-10 h-10 mx-auto text-slate-300 stroke-[1.5]" />
                <p className="text-sm">Sélectionnez un carton dans la liste de gauche ou scannez son QR code pour l'inspecter et le clôturer.</p>
              </div>
            )}
          </div>

          {/* Quick Explanatory Info Card */}
          <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-4 text-xs text-amber-900 space-y-1.5">
            <div className="font-bold flex items-center gap-1.5 text-amber-950">
              <Info className="w-4 h-4 text-amber-600" /> Règle de Clôture CTP
            </div>
            <p>
              Les cartons fermés par l'Équipe C passent immédiatement au <strong>stock vendable</strong>. Seuls les cartons fermés sont visibles par le service commercial pour les commandes.
            </p>
          </div>
        </div>
      </div>

      {/* History of Closures Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <History className="w-4 h-4 text-slate-600" /> Historique Récent des Cartons Clôturés (Équipe C)
          </h3>
          <span className="text-xs bg-slate-200 text-slate-700 px-2.5 py-0.5 rounded-full font-medium">
            {closedCartonsHistory.length} cartons au stock
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-100 uppercase tracking-wider font-semibold">
              <tr>
                <th className="p-3">ID Carton</th>
                <th className="p-3">Modèle</th>
                <th className="p-3">Pointure</th>
                <th className="p-3 text-center">Paires</th>
                <th className="p-3">Statut</th>
                <th className="p-3">Date Fermeture</th>
                <th className="p-3">Équipe Fermeture</th>
                <th className="p-3 text-right">Étiquette QR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {closedCartonsHistory.slice(0, 15).map((carton) => (
                <tr key={carton.id_carton} className="hover:bg-slate-50/80 transition">
                  <td className="p-3 font-mono font-bold text-slate-900">{carton.id_carton}</td>
                  <td className="p-3 font-semibold text-slate-800">{carton.modele_id}</td>
                  <td className="p-3 text-slate-700">{carton.pointure_text}</td>
                  <td className="p-3 text-center">
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      {carton.paires_actuelles} / {carton.paires_par_carton}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-semibold text-[10px]">
                      FERMÉ & SCELLÉ
                    </span>
                  </td>
                  <td className="p-3 text-slate-500">{carton.date_fermeture || carton.date_creation}</td>
                  <td className="p-3 font-semibold text-amber-700">Équipe {carton.equipe_fermeture || 'C'}</td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => setPrintCarton(carton)}
                      className="px-2 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded border border-slate-200"
                    >
                      Voir QR
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* QR Scanner Simulation Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <QrCode className="w-5 h-5 text-amber-500" /> Scanner QR Code Carton
              </h3>
              <button onClick={() => setShowQrModal(false)} className="text-slate-400 hover:text-slate-600 text-lg">
                ✕
              </button>
            </div>

            <div className="p-6 bg-slate-900 rounded-xl text-center text-white space-y-3">
              <div className="w-32 h-32 mx-auto border-2 border-dashed border-amber-400/80 rounded-xl flex items-center justify-center animate-pulse">
                <QrCode className="w-16 h-16 text-amber-400" />
              </div>
              <p className="text-xs text-slate-300">Placez la caméra face au QR code apposé sur le flanc du carton CTP.</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">Ou sélectionnez un carton existant :</label>
              <select
                className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500"
                onChange={(e) => {
                  if (e.target.value) handleScanSimulate(e.target.value);
                }}
                defaultValue=""
              >
                <option value="" disabled>
                  Choisir un carton pour simuler le scan...
                </option>
                {ctpCartons.slice(0, 30).map((c) => (
                  <option key={c.id_carton} value={c.id_carton}>
                    {c.id_carton} ({c.modele_id} {c.pointure_text} - {c.paires_actuelles}/{c.paires_par_carton} paires - {c.statut})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setShowQrModal(false)}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Print Label Modal */}
      {printCarton && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Étiquette Industrielle Carton CTP</h3>
              <button onClick={() => setPrintCarton(null)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <div className="p-4 border-2 border-slate-900 rounded-xl bg-white space-y-3">
              <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                <span className="font-black text-sm tracking-wider">CTP CHAUSSURES</span>
                <span className="text-[10px] font-mono bg-slate-900 text-white px-1.5 py-0.5 rounded">2026</span>
              </div>

              <div className="text-center py-1">
                <img
                  src={printCarton.QR_code || getCartonQrCodeDataUrl(printCarton.id_carton)}
                  alt="QR Code"
                  className="w-32 h-32 mx-auto object-contain"
                />
                <div className="font-mono font-black text-base mt-2">{printCarton.id_carton}</div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-900 pt-2 font-mono">
                <div>
                  <span className="text-slate-500 block text-[10px]">MODÈLE</span>
                  <strong className="text-sm">{printCarton.modele_id}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">POINTURE</span>
                  <strong className="text-sm">{printCarton.pointure_text}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">CONDITIONNEMENT</span>
                  <strong>{printCarton.paires_par_carton} PAIRES</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">STATUT</span>
                  <strong>{printCarton.statut}</strong>
                </div>
              </div>

              {/* Composition 3 couleurs sur l'étiquette QR */}
              <div className="border-t border-slate-900 pt-2 text-[11px] font-mono text-slate-800 bg-slate-50 p-1.5 rounded">
                <span className="block font-bold text-[9px] text-slate-600">COMPOSITION COULEURS:</span>
                {formatCartonMultiColorSummary(printCarton)}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  window.print();
                }}
                className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" /> Imprimer
              </button>
              <button
                onClick={() => setPrintCarton(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmation de fermeture finale "إغلاق نهائي؟" */}
      {cartonToConfirmClose && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <span>إغلاق نهائي؟</span>
                  <span className="text-xs font-bold text-slate-500 font-sans">(Fermeture Définitive)</span>
                </h3>
                <p className="text-xs text-slate-500">Carton #{cartonToConfirmClose}</p>
              </div>
            </div>

            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-2">
              <p className="font-semibold text-sm">
                هل أنت متأكد من الإغلاق النهائي وتشميع الكرتونة؟
              </p>
              <p className="text-amber-800 leading-relaxed">
                Ce carton de 12 paires sera scellé définitivement par l'<strong>Équipe C</strong>.
                Il passera immédiatement au statut <strong>FERMÉ (تم غلقها)</strong> et sera incrémenté dans le stock commercial vendable.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => {
                  handleCloseCarton(cartonToConfirmClose);
                  setCartonToConfirmClose(null);
                }}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md flex items-center justify-center gap-2 transition"
              >
                <CheckCircle className="w-4 h-4" />
                <span>نعم، إغلاق نهائي (Confirmer Clôture)</span>
              </button>
              <button
                onClick={() => setCartonToConfirmClose(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                إلغاء (Annuler)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
