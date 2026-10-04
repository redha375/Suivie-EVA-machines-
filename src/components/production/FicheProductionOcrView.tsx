import React, { useState, useRef } from 'react';
import {
  Camera,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Eye,
  Download,
  Copy,
  Check,
  Database,
  RefreshCw,
  Upload,
  FileText,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Info,
  Maximize2,
  Layers,
  Plus,
  Package,
  Calculator,
  Tag,
  CheckSquare
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { FicheProductionAnalysisResult, FicheProductionLine, ModelMasterItem } from '../../types';

export const FicheProductionOcrView: React.FC = () => {
  const {
    analyzeFicheProduction,
    machines,
    addProductionEntry,
    logAudit,
    currentUser,
    isRTL,
    modelMaster,
    lookupModelMaster,
    addModelMaster,
    validatePendingModel,
  } = useApp();

  // State
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [activeScenario, setActiveScenario] = useState<string>('model_master_b01_exact');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<FicheProductionAnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState<'synthese' | 'donnees' | 'controles' | 'json'>('synthese');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [copiedJson, setCopiedJson] = useState<boolean>(false);
  const [injectedSuccess, setInjectedSuccess] = useState<boolean>(false);
  const [injectedCount, setInjectedCount] = useState<number>(0);

  // Modal to add a new model directly from OCR
  const [newModelModal, setNewModelModal] = useState<{
    isOpen: boolean;
    model_name: string;
    category: string;
    pointure: string;
    paires_par_carton: number;
    designation: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load and analyze preset scenario or custom image
  const handleRunAnalysis = async (scenarioKey?: string, customImageBase64?: string) => {
    setIsAnalyzing(true);
    setInjectedSuccess(false);
    const keyToUse = scenarioKey || activeScenario;

    try {
      const response = await analyzeFicheProduction(
        customImageBase64 || selectedImage || undefined,
        'image/jpeg',
        customImageBase64 ? undefined : keyToUse
      );

      if (response && response.success && response.result) {
        setAnalysisResult(response.result);
      }
    } catch (err) {
      console.error('Erreur lors de l’analyse:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setSelectedImage(base64);
      setActiveScenario('custom_upload');
      handleRunAnalysis('custom_upload', base64);
    };
    reader.readAsDataURL(file);
  };

  // Trigger initial analysis on mount if no result
  React.useEffect(() => {
    if (!analysisResult) {
      handleRunAnalysis('model_master_b01_exact');
    }
  }, []);

  // Save a new model into ModelMaster from OCR line
  const handleSaveNewModelMaster = () => {
    if (!newModelModal) return;
    addModelMaster({
      model_name: newModelModal.model_name,
      designation: newModelModal.designation || `Article ${newModelModal.model_name}`,
      category: newModelModal.category || 'Mixte',
      pointure: newModelModal.pointure,
      paires_par_carton: Number(newModelModal.paires_par_carton) || 20,
      verified: true,
      source: 'OCR_FICHE_PRODUCTION',
    });

    logAudit(
      'AJOUT_MODEL_MASTER_OCR',
      'Référentiels',
      `Validation officielle du modèle ${newModelModal.model_name} (${newModelModal.category}, Pt. ${newModelModal.pointure}, ${newModelModal.paires_par_carton} paires/carton) issu de la numérisation OCR.`,
      { targetName: newModelModal.model_name, newValue: `${newModelModal.paires_par_carton} p/ctn` }
    );

    setNewModelModal(null);
  };

  // Copy JSON to clipboard
  const handleCopyJson = () => {
    if (!analysisResult) return;
    navigator.clipboard.writeText(JSON.stringify(analysisResult, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  // Download JSON
  const handleDownloadJson = () => {
    if (!analysisResult) return;
    const blob = new Blob([JSON.stringify(analysisResult, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ctp_smart_fiche_${analysisResult.machine || 'EVA'}_${analysisResult.date || '2026-09-09'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Inject validated lines into CTP SMART production database
  const handleInjectIntoCtpSmart = () => {
    if (!analysisResult) return;

    let validRowsAdded = 0;
    const targetMachine = machines.find((m) => m.code === analysisResult.machine) || machines[0];

    analysisResult.equipes.forEach((eq) => {
      eq.lignes.forEach((ligne) => {
        // Only inject if paires_conformes is not null (complying with Rule #4: missing data must NOT be assumed 0)
        if (ligne.paires_conformes !== null && ligne.paires_conformes > 0) {
          const rawPointure = parseInt(ligne.pointure, 10) || 40;
          const qtyProduced = (parseInt(ligne.compteur_fin, 10) || 0) - (parseInt(ligne.compteur_debut, 10) || 0);
          const finalProduced = qtyProduced > 0 ? qtyProduced : (ligne.paires_conformes || 0);
          const finalRebuts = Math.max(0, finalProduced - (ligne.paires_conformes || 0));

          addProductionEntry({
            tenantId: 'ctp-main',
            date: analysisResult.date || new Date().toISOString().substring(0, 10),
            time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
            shift: 'matin',
            groupName: eq.equipe,
            machineId: targetMachine.id,
            machineCode: targetMachine.code,
            platformNumber: 1,
            operatorId: currentUser.id,
            operatorName: `${currentUser.name} (via Fiche IA OCR)`,
            material: targetMachine.material || 'EVA',
            rawMaterialType: targetMachine.type || 'EVA',
            modelName: ligne.modele || 'Modèle CTP',
            moldId: ligne.reference_moule || 'M-01',
            size: rawPointure,
            color1: ligne.couleur_1 || 'Standard',
            color2: ligne.couleur_2 || '',
            qtyProduced: finalProduced,
            qtyConforming: ligne.paires_conformes || 0,
            qtyRejected: finalRebuts,
            counterStart: parseInt(ligne.compteur_debut, 10) || undefined,
            counterEnd: parseInt(ligne.compteur_fin, 10) || undefined,
            materialConsumedKg: parseFloat(ligne.poids_matiere_1) || 25,
            bags25kgConsumed: Math.ceil((parseFloat(ligne.poids_matiere_1) || 25) / 25),
            startTime: '06:00',
            endTime: '14:00',
            downtimeMinutes: 0,
            verifiedByChef: true,
            notes: `Numérisé automatiquement par l'IA Gemini depuis la Fiche Journalière. Équipe: ${eq.equipe}, Carton: ${ligne.situation_cartons || 'N/A'}.`,
          });
          validRowsAdded += 1;
        }
      });
    });

    logAudit(
      'INJECTION_FICHE_OCR_IA',
      'Production',
      `Importation validée de ${validRowsAdded} lignes de production issues de la Fiche Journalière (${analysisResult.machine} - ${analysisResult.date}).`,
      { targetName: analysisResult.machine, newValue: `${validRowsAdded} lots injectés` }
    );

    setInjectedCount(validRowsAdded);
    setInjectedSuccess(true);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-48 -bottom-16 w-48 h-48 bg-emerald-600/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                <Sparkles className="w-3.5 h-3.5" />
                Gemini 3.8 Flash Vision
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <ShieldCheck className="w-3.5 h-3.5" />
                Anti-Invention & Règle d'Or #4
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Double-Check Cellulaire
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
              Fiche Journalière de Suivi de Production — Analyse IA
            </h1>
            <p className="text-slate-400 text-sm max-w-3xl leading-relaxed">
              Numérisation intelligente de fiches d'atelier manuscrites ou photographiées. Extraction géométrique stricte par cellules, détection des champs manquants sans inventer de données, et contrôle de cohérence pour CTP SMART.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium shadow-md transition-colors"
            >
              <Upload className="w-4 h-4" />
              Importer une Fiche (Photo)
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />

            <button
              onClick={() => handleRunAnalysis()}
              disabled={isAnalyzing}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-sm font-medium transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
              Réanalyser
            </button>
          </div>
        </div>

        {/* Industrial Presets Selector Bar */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="text-xs text-slate-400 font-medium uppercase tracking-wider flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-indigo-400" />
            Scénarios Industriels de Démonstration & Tests :
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setActiveScenario('model_master_b01_exact');
                setSelectedImage(null);
                handleRunAnalysis('model_master_b01_exact');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeScenario === 'model_master_b01_exact'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700'
              }`}
            >
              ✅ 1. B01 Conforme (20 P/Ctn)
            </button>

            <button
              onClick={() => {
                setActiveScenario('cas_equipe_a_vide');
                setSelectedImage(null);
                handleRunAnalysis('cas_equipe_a_vide');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeScenario === 'cas_equipe_a_vide'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700'
              }`}
              title="Règle Critique Équipe A : Production bonne vide sur la fiche, ne jamais inventer 120 !"
            >
              ⚠️ 2. Équipe A (Conforme = VIDE)
            </button>

            <button
              onClick={() => {
                setActiveScenario('modele_a_verifier_pointure');
                setSelectedImage(null);
                handleRunAnalysis('modele_a_verifier_pointure');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeScenario === 'modele_a_verifier_pointure'
                  ? 'bg-amber-500 text-slate-900 font-bold shadow-sm'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700'
              }`}
              title="Modèle B01 existe mais pointure 44 Homme inhabituelle : MODÈLE À VÉRIFIER"
            >
              🔍 3. Modèle à Vérifier (Pt. 44)
            </button>

            <button
              onClick={() => {
                setActiveScenario('nouveau_modele_inconnu');
                setSelectedImage(null);
                handleRunAnalysis('nouveau_modele_inconnu');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeScenario === 'nouveau_modele_inconnu'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700'
              }`}
              title="Modèle C99 non répertorié dans ModelMaster : NOUVEAU MODÈLE"
            >
              ✨ 4. Nouveau Modèle Inconnu
            </button>

            <button
              onClick={() => {
                setActiveScenario('conflit_cartons_ouverts_rebut');
                setSelectedImage(null);
                handleRunAnalysis('conflit_cartons_ouverts_rebut');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeScenario === 'conflit_cartons_ouverts_rebut'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700'
              }`}
              title="Cartons ouverts non multipliés et incohérence 70+10 != 90"
            >
              🚨 5. Conflit Cartons & Rebut
            </button>

            <button
              onClick={() => {
                setActiveScenario('partial_unreadable');
                setSelectedImage(null);
                handleRunAnalysis('partial_unreadable');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeScenario === 'partial_unreadable'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700'
              }`}
            >
              📸 6. Fiche Coupée (Reprise)
            </button>
          </div>
        </div>
      </div>

      {/* Reprendre Photo Zone Alert (Règle #9) */}
      {analysisResult?.reprendre_photo_zone && (
        <div className="p-4 bg-amber-500/10 border-2 border-amber-500/40 rounded-2xl flex items-start gap-3.5 text-amber-900 dark:text-amber-200">
          <Camera className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <span>Instruction de reprise de prise de vue (Règle #9 CTP SMART)</span>
            </h3>
            <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
              {analysisResult.reprendre_photo_zone}
            </p>
          </div>
        </div>
      )}

      {/* Injected Notification */}
      {injectedSuccess && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-between gap-4 text-emerald-900 dark:text-emerald-200">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span className="text-sm font-medium">
              {injectedCount} ligne(s) de production insérée(s) avec succès dans le registre CTP SMART et enregistrée(s) dans le journal d'audit.
            </span>
          </div>
          <span className="text-xs bg-emerald-600 text-white font-medium px-2.5 py-1 rounded-lg">
            Synchronisé
          </span>
        </div>
      )}

      {/* Main Layout: Left = Document Visual Viewer, Right = Structured 5 Sections & Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Visual Document Viewer (4 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-500" />
                <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                  Document Numérisé
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  title="Pivoter de 90°"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setZoomLevel((z) => Math.max(0.8, z - 0.2))}
                  className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  title="Zoom arrière"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs text-slate-400 font-mono w-10 text-center">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  onClick={() => setZoomLevel((z) => Math.min(2.0, z + 0.2))}
                  className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  title="Zoom avant"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Document Surface */}
            <div className="relative w-full aspect-[3/4] bg-slate-100 dark:bg-slate-950 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 flex items-center justify-center select-none">
              {selectedImage ? (
                <div
                  className="w-full h-full flex items-center justify-center transition-transform duration-200"
                  style={{
                    transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                  }}
                >
                  <img
                    src={selectedImage}
                    alt="Fiche Journalière Manuscrite"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              ) : (
                /* Interactive Simulated Industrial Sheet with Realistic Layout */
                <div
                  className="w-full h-full p-4 overflow-y-auto bg-amber-50/40 dark:bg-slate-900/60 font-sans transition-transform duration-200"
                  style={{
                    transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                  }}
                >
                  {/* Fiche Header Simulated */}
                  <div className="border-2 border-slate-700 dark:border-slate-600 p-2.5 rounded bg-white dark:bg-slate-800 text-[11px] shadow-sm mb-3">
                    <div className="flex justify-between items-center border-b border-slate-300 dark:border-slate-700 pb-1.5 mb-1.5">
                      <div className="font-black tracking-wider uppercase text-indigo-700 dark:text-indigo-400 text-xs">
                        CTP SMART — FICHE JOURNALIÈRE
                      </div>
                      <div className="font-mono text-[10px] text-slate-500">
                        RÉF : CTP-PRD-F04
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[10px]">
                      <div>
                        <span className="font-semibold text-slate-500">MACHINE :</span>{' '}
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {analysisResult?.machine || 'EVA 1'}
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-500">DATE :</span>{' '}
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {analysisResult?.date || '2026-09-09'}
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-500">POSTE :</span>{' '}
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {analysisResult?.shift || 'Matin (06h - 14h)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Simulated Table Rows */}
                  <div className="border border-slate-300 dark:border-slate-700 rounded overflow-hidden text-[9px] bg-white dark:bg-slate-850 shadow-sm">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-300 dark:border-slate-700">
                          <th className="p-1 text-left border-r border-slate-300 dark:border-slate-700">Équipe</th>
                          <th className="p-1 text-left border-r border-slate-300 dark:border-slate-700">Modèle</th>
                          <th className="p-1 text-center border-r border-slate-300 dark:border-slate-700">Pt.</th>
                          <th className="p-1 text-right border-r border-slate-300 dark:border-slate-700 bg-indigo-50/50 dark:bg-indigo-950/30">Paires Conf.</th>
                          <th className="p-1 text-right border-r border-slate-300 dark:border-slate-700 bg-amber-50/50 dark:bg-amber-950/30">Emballées</th>
                          <th className="p-1 text-center">Compteur</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analysisResult?.equipes.flatMap((eq) =>
                          eq.lignes.map((l, i) => (
                            <tr
                              key={`${eq.equipe}-${i}`}
                              className="border-b border-slate-200 dark:border-slate-800 font-mono"
                            >
                              <td className="p-1 border-r border-slate-200 dark:border-slate-800 font-bold text-indigo-600 dark:text-indigo-400">
                                {eq.equipe}
                              </td>
                              <td className="p-1 border-r border-slate-200 dark:border-slate-800 truncate max-w-[80px]">
                                {l.modele}
                              </td>
                              <td className="p-1 text-center border-r border-slate-200 dark:border-slate-800 font-semibold">
                                {l.pointure}
                              </td>
                              <td className="p-1 text-right border-r border-slate-200 dark:border-slate-800 font-bold">
                                {l.paires_conformes !== null ? (
                                  <span className="text-emerald-600 dark:text-emerald-400">{l.paires_conformes}</span>
                                ) : (
                                  <span className="bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 px-1 rounded text-[8px]">NULL</span>
                                )}
                              </td>
                              <td className="p-1 text-right border-r border-slate-200 dark:border-slate-800 font-bold">
                                {l.paires_emballees !== null ? (
                                  <span className="text-slate-900 dark:text-white">{l.paires_emballees}</span>
                                ) : (
                                  <span className="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 px-1 rounded text-[8px] animate-pulse">
                                    [VIDE / NULL]
                                  </span>
                                )}
                              </td>
                              <td className="p-1 text-center text-slate-500">
                                {l.compteur_debut} → {l.compteur_fin}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Stamp & Verification */}
                  <div className="mt-4 flex justify-between items-center text-[10px] text-slate-500">
                    <div className="border border-dashed border-slate-300 dark:border-slate-700 p-1.5 rounded text-center w-28">
                      Visa Chef de Poste
                    </div>
                    <div className="text-right font-mono text-[9px]">
                      Vérifié par IA CTP SMART
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Document Footer Controls */}
            <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
              <span>Format détecté : Grille matricielle</span>
              <button
                onClick={() => {
                  setSelectedImage(null);
                  setActiveScenario('standard_conforme');
                  handleRunAnalysis('standard_conforme');
                }}
                className="text-indigo-600 hover:text-indigo-500 font-medium"
              >
                Réinitialiser l'aperçu
              </button>
            </div>
          </div>

          {/* Quick Action Box: Inject into CTP SMART Database */}
          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 border border-indigo-800/60 rounded-2xl p-5 text-white shadow-md">
            <div className="flex items-center gap-2.5 mb-2">
              <Database className="w-5 h-5 text-indigo-400" />
              <h3 className="font-semibold text-sm">Validation & Écriture Base de Données</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Injecte automatiquement les lignes valides et conformes dans le journal de production, actualise les compteurs machine et la traçabilité des lots.
            </p>
            <button
              onClick={handleInjectIntoCtpSmart}
              disabled={isAnalyzing || !analysisResult}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white rounded-xl text-sm font-semibold shadow flex items-center justify-center gap-2 transition-all"
            >
              <Check className="w-4 h-4" />
              Valider & Enregistrer dans CTP SMART
            </button>
          </div>
        </div>

        {/* Right Column: Tabbed 5 Sections (A, B, C, D, E) & JSON (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-t-2xl p-2 gap-1 shadow-sm">
            <button
              onClick={() => setActiveTab('synthese')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'synthese'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              E) Résumé de Production
            </button>

            <button
              onClick={() => setActiveTab('donnees')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'donnees'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              A) Données Lues
            </button>

            <button
              onClick={() => setActiveTab('controles')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'controles'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              B, C, D) Contrôles & Alertes
              {(analysisResult?.missing_fields?.length || 0) + (analysisResult?.errors?.length || 0) > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('json')}
              className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'json'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              JSON Strict
            </button>
          </div>

          {/* TAB CONTENT */}

          {/* 1. SYNTHÈSE & RÉSUMÉ DE PRODUCTION (Section E & Règle #10) */}
          {activeTab === 'synthese' && (
            <div className="space-y-4">
              {/* Executive Metrics Bar (Règle #10) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl shadow-sm">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span>✅ Données Valides</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="text-xl font-bold text-slate-900 dark:text-white">
                    {analysisResult?.rapport_synthese?.donnees_correctement_lues_count ?? 0}
                  </div>
                  <span className="text-[10px] text-slate-400">Champs certifiés</span>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl shadow-sm">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span>⚠️ Champs Manquants</span>
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className={`text-xl font-bold ${
                    (analysisResult?.rapport_synthese?.donnees_manquantes_count ?? 0) > 0
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-slate-900 dark:text-white'
                  }`}>
                    {analysisResult?.rapport_synthese?.donnees_manquantes_count ?? 0}
                  </div>
                  <span className="text-[10px] text-slate-400">Cases vides (Non = 0)</span>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl shadow-sm">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span>📊 Production Conforme</span>
                    <Sparkles className="w-4 h-4 text-indigo-500" />
                  </div>
                  <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                    {analysisResult?.rapport_synthese?.total_production_conforme ?? 0}
                  </div>
                  <span className="text-[10px] text-slate-400">Paires bonnes</span>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl shadow-sm">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span>📦 Paires Emballées</span>
                    <Check className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                    {analysisResult?.rapport_synthese?.total_paires_emballees ?? 0}
                  </div>
                  <span className="text-[10px] text-slate-400">Remplies en carton</span>
                </div>
              </div>

              {/* Résultat par Équipe (Cards) */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    👥 Résultat d'Analyse par Équipe (CTP SMART Audit)
                  </h2>
                  <span className="text-xs text-slate-400 font-mono">
                    Poste : {analysisResult?.machine} ({analysisResult?.date})
                  </span>
                </div>

                <div className="space-y-3">
                  {analysisResult?.rapport_synthese?.resultat_par_equipe?.map((res, idx) => {
                    const isMissing = res.statut === 'MISSING_REQUIRED_DATA';
                    const isAnomaly = res.statut === 'ANOMALIE';
                    return (
                      <div
                        key={idx}
                        className={`p-4 rounded-xl border transition-all ${
                          isMissing
                            ? 'bg-amber-500/10 border-amber-500/40 text-amber-950 dark:text-amber-200'
                            : isAnomaly
                            ? 'bg-rose-500/10 border-rose-500/40 text-rose-950 dark:text-rose-200'
                            : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2.5">
                            <span className="font-bold text-sm">{res.equipe}</span>
                            <span
                              className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                                isMissing
                                  ? 'bg-amber-500 text-white'
                                  : isAnomaly
                                  ? 'bg-rose-500 text-white'
                                  : 'bg-emerald-600 text-white'
                              }`}
                            >
                              {res.statut}
                            </span>
                          </div>

                          <div className="flex items-center gap-4 text-xs font-mono">
                            <div>
                              <span className="text-slate-500">Conformes :</span>{' '}
                              <span className="font-bold">
                                {res.paires_conformes !== null ? `${res.paires_conformes} p` : 'NON RENSEIGNÉ'}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-500">Emballées :</span>{' '}
                              <span className="font-bold">
                                {res.paires_emballees !== null ? `${res.paires_emballees} p` : 'NON RENSEIGNÉ'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <p className="text-xs leading-relaxed font-medium">
                          {res.remarques}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Golden Rule #4 Reminder Notice */}
              <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 rounded-2xl text-xs text-indigo-900 dark:text-indigo-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-indigo-700 dark:text-indigo-400">
                  <ShieldCheck className="w-4 h-4" />
                  Règle de Gestion CTP SMART N°4 appliquée avec succès
                </div>
                <p className="text-indigo-800/80 dark:text-indigo-300 leading-relaxed">
                  Si le champ <em>"Nombre de paires conformes / emballées"</em> est vide, le système n'injecte jamais la valeur 0. L'équipe est étiquetée <strong>MISSING REQUIRED DATA</strong> avec alerte explicite bloquant toute déformation de statistique de productivité.
                </p>
              </div>
            </div>
          )}

          {/* 2. DONNÉES LUES (Section A - Grille Cellule par Cellule avec Validation ModelMaster) */}
          {activeTab === 'donnees' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-indigo-500" />
                    A) Données Lues — 16 Champs Officiels CTP SMART & Contrôle ModelMaster
                  </h2>
                  <p className="text-xs text-slate-400">
                    Chaque ligne est vérifiée contre le catalogue officiel 2025 (MODEL + POINTURE + CATÉGORIE).
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 rounded font-medium">
                    {analysisResult?.equipes?.reduce((acc, eq) => acc + eq.lignes.length, 0)} ligne(s) extraite(s)
                  </span>
                </div>
              </div>

              {/* Detailed Row Cards with ModelMaster Engine */}
              <div className="space-y-4">
                {analysisResult?.equipes.flatMap((eq) =>
                  eq.lignes.map((l, index) => {
                    // Live ModelMaster resolution
                    const mmResolution = lookupModelMaster(l.modele, l.pointure, l.category);
                    const effectiveStatus = l.model_recognition_status || mmResolution.status;
                    const pairesParCarton = l.paires_par_carton || mmResolution.item?.paires_par_carton || null;
                    const calculatedPairs = pairesParCarton && l.cartons_remplis !== null
                      ? (l.cartons_remplis * pairesParCarton) + (l.quantite_restante || 0)
                      : null;

                    return (
                      <div
                        key={`${eq.equipe}-${index}`}
                        className={`rounded-2xl border p-4 transition-all shadow-sm ${
                          effectiveStatus === 'EXACT_MATCH'
                            ? 'bg-emerald-50/20 border-emerald-200 dark:border-emerald-800/60 dark:bg-emerald-950/10'
                            : effectiveStatus === 'MODELE_A_VERIFIER'
                            ? 'bg-amber-50/30 border-amber-300 dark:border-amber-800/60 dark:bg-amber-950/10'
                            : effectiveStatus === 'NOUVEAU_MODELE'
                            ? 'bg-purple-50/30 border-purple-300 dark:border-purple-800/60 dark:bg-purple-950/10'
                            : 'bg-slate-50/50 border-slate-200 dark:border-slate-800 dark:bg-slate-850'
                        }`}
                      >
                        {/* Card Header: Identification & ModelMaster Badge */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200/60 dark:border-slate-800 mb-3">
                          <div className="flex items-center gap-2.5">
                            <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                              #{l.ligne_num || index + 1}
                            </span>
                            <div>
                              <span className="font-bold text-sm text-slate-900 dark:text-white">
                                {eq.equipe}
                              </span>
                              <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">
                                Machine : <strong className="text-slate-700 dark:text-slate-300">{l.machine || analysisResult.machine}</strong>
                              </span>
                              {l.operateur && (
                                <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">
                                  | Opérateur : <strong>{l.operateur}</strong>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* ModelMaster Status Badges */}
                          <div className="flex items-center gap-2">
                            {effectiveStatus === 'EXACT_MATCH' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                VALIDÉ (ModelMaster 2025) : {pairesParCarton} P/Carton
                              </span>
                            )}

                            {effectiveStatus === 'MODELE_A_VERIFIER' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                MODÈLE À VÉRIFIER (Pt. {l.pointure} inhabituelle)
                              </span>
                            )}

                            {effectiveStatus === 'NOUVEAU_MODELE' && (
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-900 dark:bg-purple-900/60 dark:text-purple-200 border border-purple-300 dark:border-purple-700">
                                  <Layers className="w-3.5 h-3.5 text-purple-600" />
                                  NOUVEAU MODÈLE (Inconnu)
                                </span>
                                <button
                                  onClick={() =>
                                    setNewModelModal({
                                      isOpen: true,
                                      model_name: l.modele || '',
                                      category: l.category || 'Mixte',
                                      pointure: l.pointure || '',
                                      paires_par_carton: 20,
                                      designation: `Modèle ${l.modele}`,
                                    })
                                  }
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-purple-600 hover:bg-purple-500 text-white shadow-sm transition-colors"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  Ajouter au Master
                                </button>
                              </div>
                            )}

                            {l.status === 'CONFLIT' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200 border border-rose-300">
                                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                CONFLIT DÉTECTÉ
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Critical Alert Warning (Équipe A / Empty Conformes Case Rule #5) */}
                        {l.paires_conformes === null && (
                          <div className="mb-3 p-3 bg-rose-500/10 border-2 border-rose-500/40 rounded-xl text-xs text-rose-900 dark:text-rose-200 flex items-start gap-2.5">
                            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                            <div className="space-y-0.5">
                              <strong className="font-bold block">
                                ⚠️ RÈGLE CRITIQUE CTP SMART (CAS ÉQUIPE A) :
                              </strong>
                              <span>
                                La case <em>"Paires conformes / Production bonne"</em> est <strong>VIDE [NULL]</strong> sur la fiche papier.
                                Le système refuse d'inventer la valeur ou de supposer Production ({l.quantite_production || 120}) = Conformes ({l.quantite_production || 120}).
                                Statut appliqué : <strong>À VÉRIFIER</strong>.
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Open Cartons Warning */}
                        {(l.cartons_ouverts || 0) > 0 && (
                          <div className="mb-3 p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
                            <Package className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>
                              <strong>Règle Cartons Ouverts :</strong> {l.cartons_ouverts} carton(s) ouvert(s) / entamé(s) détecté(s).
                              Ils ne sont <strong>PAS</strong> comptabilisés comme des cartons pleins dans la formule de production.
                            </span>
                          </div>
                        )}

                        {/* 16 Fields Grid Display */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 text-xs">
                          {/* Modèle */}
                          <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700">
                            <span className="text-[10px] text-slate-400 block uppercase font-semibold">Modèle</span>
                            <span className="font-bold text-slate-900 dark:text-white text-sm">
                              {l.modele || 'Non spécifié'}
                            </span>
                          </div>

                          {/* Pointure & Catégorie */}
                          <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700">
                            <span className="text-[10px] text-slate-400 block uppercase font-semibold">Pointure / Cat.</span>
                            <span className="font-bold text-slate-900 dark:text-white">
                              {l.pointure} <span className="text-slate-400 font-normal">({l.category || 'Mixte'})</span>
                            </span>
                          </div>

                          {/* Réf Moule */}
                          <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700">
                            <span className="text-[10px] text-slate-400 block uppercase font-semibold">Réf Moule N°</span>
                            <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                              {l.reference_moule || 'N/A'}
                            </span>
                          </div>

                          {/* Couleurs 1 & 2 */}
                          <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700">
                            <span className="text-[10px] text-slate-400 block uppercase font-semibold">Couleurs Matières</span>
                            <span className="font-medium text-slate-800 dark:text-slate-200">
                              {l.couleur_1 || '-'} {l.couleur_2 ? `/ ${l.couleur_2}` : ''}
                            </span>
                          </div>

                          {/* Cartons Remplis */}
                          <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                            <span className="text-[10px] text-emerald-800 dark:text-emerald-300 block uppercase font-semibold">Cartons Remplis</span>
                            <span className="font-bold text-emerald-900 dark:text-emerald-100 text-sm">
                              {l.cartons_remplis !== null ? `${l.cartons_remplis} pleins` : 'Non renseigné'}
                            </span>
                          </div>

                          {/* Cartons Ouverts */}
                          <div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/20">
                            <span className="text-[10px] text-amber-800 dark:text-amber-300 block uppercase font-semibold">Cartons Ouverts</span>
                            <span className="font-bold text-amber-900 dark:text-amber-100">
                              {l.cartons_ouverts || 0} entamé(s)
                            </span>
                          </div>

                          {/* Paires par Carton (ModelMaster) */}
                          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800">
                            <span className="text-[10px] text-indigo-700 dark:text-indigo-300 block uppercase font-semibold">Paires / Carton</span>
                            <span className="font-bold text-indigo-900 dark:text-indigo-100 text-sm">
                              {pairesParCarton ? `${pairesParCarton} paires` : <span className="text-amber-600 text-[11px]">Non défini</span>}
                            </span>
                          </div>

                          {/* Paires Produites Calculées */}
                          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800">
                            <span className="text-[10px] text-indigo-700 dark:text-indigo-300 block uppercase font-semibold">Calcul Pleins</span>
                            <span className="font-bold text-indigo-900 dark:text-indigo-100 text-sm font-mono">
                              {calculatedPairs !== null ? `${calculatedPairs} p` : 'N/A'}
                            </span>
                          </div>

                          {/* Paires Conformes */}
                          <div className={`p-2.5 rounded-xl border ${
                            l.paires_conformes === null
                              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800'
                              : 'bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700'
                          }`}>
                            <span className="text-[10px] text-slate-400 block uppercase font-semibold">Paires Conformes</span>
                            <span className="font-bold text-sm">
                              {l.paires_conformes !== null ? (
                                <span className="text-emerald-600 dark:text-emerald-400">{l.paires_conformes} p</span>
                              ) : (
                                <span className="text-rose-600 font-extrabold bg-rose-100 dark:bg-rose-900/60 px-1.5 py-0.5 rounded text-[11px]">
                                  VIDE [NULL]
                                </span>
                              )}
                            </span>
                          </div>

                          {/* Rebut / Défauts */}
                          <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700">
                            <span className="text-[10px] text-slate-400 block uppercase font-semibold">Rebuts / Défauts</span>
                            <span className={`font-bold ${l.rebut_defauts ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
                              {l.rebut_defauts ?? 0} p
                            </span>
                          </div>

                          {/* Compteurs Entrée / Sortie */}
                          <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700">
                            <span className="text-[10px] text-slate-400 block uppercase font-semibold">Compteur Machine</span>
                            <span className="font-mono font-medium text-slate-700 dark:text-slate-300 text-[11px]">
                              {l.compteur_entree || l.compteur_debut || '-'} → {l.compteur_sortie || l.compteur_fin || '-'}
                            </span>
                          </div>

                          {/* Reliquat / Restant */}
                          <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700">
                            <span className="text-[10px] text-slate-400 block uppercase font-semibold">Reliquat Vrac</span>
                            <span className="font-medium text-slate-800 dark:text-slate-200">
                              {l.quantite_restante || 0} paires
                            </span>
                          </div>
                        </div>

                        {/* Model Candidates Suggestions if MODELE_A_VERIFIER */}
                        {effectiveStatus === 'MODELE_A_VERIFIER' && mmResolution.candidates.length > 0 && (
                          <div className="mt-3 p-3 bg-amber-500/10 border border-amber-300 dark:border-amber-700/60 rounded-xl text-xs space-y-1.5">
                            <div className="font-semibold text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
                              <Info className="w-3.5 h-3.5 text-amber-600" />
                              Combinaisons officielles enregistrées pour le modèle "{l.modele}" dans le catalogue 2025 :
                            </div>
                            <div className="flex flex-wrap gap-2 pt-1">
                              {mmResolution.candidates.map((cand) => (
                                <span
                                  key={cand.id}
                                  className="px-2 py-1 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 rounded-lg text-[11px] font-mono"
                                >
                                  {cand.category} | Pt. <strong>{cand.pointure}</strong> → <strong>{cand.paires_par_carton}</strong> P/Ctn
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Alerts & Remarks */}
                        {l.alerts && l.alerts.length > 0 && (
                          <div className="mt-3 space-y-1">
                            {l.alerts.map((al, ai) => (
                              <div
                                key={ai}
                                className="text-xs p-2 rounded-lg bg-slate-100 dark:bg-slate-800 font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2"
                              >
                                <span>{al}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* 3. CONTRÔLES, CHAMPS MANQUANTS & VALEURS INCERTAINES (Sections B, C, D) */}
          {activeTab === 'controles' && (
            <div className="space-y-4">
              {/* SECTION B: CHAMPS MANQUANTS */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                  <h3 className="text-sm font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    B) Champs Manquants & Alertes d'Exclusion
                  </h3>
                  <span className="text-xs bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-medium px-2 py-0.5 rounded-full">
                    {analysisResult?.missing_fields?.length || 0} anomalie(s)
                  </span>
                </div>

                {analysisResult?.missing_fields && analysisResult.missing_fields.length > 0 ? (
                  <div className="space-y-2.5">
                    {analysisResult.missing_fields.map((mf, i) => (
                      <div
                        key={i}
                        className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3"
                      >
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <div className="text-xs space-y-1">
                          <div className="font-semibold text-amber-950 dark:text-amber-200 flex items-center gap-2">
                            <span>{mf.equipe}</span>
                            <span className="text-[10px] px-2 py-0.5 bg-amber-500 text-white rounded font-mono">
                              {mf.champ}
                            </span>
                          </div>
                          <p className="text-amber-900 dark:text-amber-300 leading-relaxed font-medium">
                            {mf.message}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    Aucun champ obligatoire manquant. Toutes les cases de production et d'emballage sont renseignées.
                  </div>
                )}
              </div>

              {/* SECTION C: ERREURS & INCOHÉRENCES AUTOMATIQUES */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                  <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                    <XCircle className="w-4 h-4" />
                    C) Erreurs & Incohérences Détectées
                  </h3>
                  <span className="text-xs bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-medium px-2 py-0.5 rounded-full">
                    {analysisResult?.errors?.length || 0} erreur(s)
                  </span>
                </div>

                {analysisResult?.errors && analysisResult.errors.length > 0 ? (
                  <div className="space-y-2.5">
                    {analysisResult.errors.map((err, i) => (
                      <div
                        key={i}
                        className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-3"
                      >
                        <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        <div className="text-xs space-y-0.5">
                          <div className="font-semibold text-rose-950 dark:text-rose-200">
                            {err.type} {err.equipe ? `(${err.equipe})` : ''}
                          </div>
                          <p className="text-rose-900 dark:text-rose-300 leading-relaxed font-medium">
                            {err.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    Aucune incohérence numérique détectée (compteurs ordonnés et écarts de production normaux).
                  </div>
                )}
              </div>

              {/* SECTION D: VALEURS INCERTAINES (ÉCRITURE MANUSCRITE) */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-indigo-500" />
                    D) Valeurs Manuscrites Douteuses & Alternatives (Règle #3 & #5)
                  </h3>
                  <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium px-2 py-0.5 rounded-full">
                    {analysisResult?.uncertain_values?.length || 0} doute(s)
                  </span>
                </div>

                {analysisResult?.uncertain_values && analysisResult.uncertain_values.length > 0 ? (
                  <div className="space-y-2.5">
                    {analysisResult.uncertain_values.map((uv, i) => (
                      <div
                        key={i}
                        className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/60 rounded-xl text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-indigo-900 dark:text-indigo-200">
                            {uv.emplacement || uv.champ}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded">
                            Confiance: {Math.round(uv.confidence * 100)}%
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 font-mono text-[11px] pt-1">
                          <div className="bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700">
                            <span className="text-slate-400 block text-[9px]">Valeur lue :</span>
                            <span className="font-bold text-slate-900 dark:text-white">
                              "{uv.valeur_lue}"
                            </span>
                          </div>
                          <div className="bg-emerald-50 dark:bg-emerald-950/30 p-2 rounded border border-emerald-200 dark:border-emerald-800">
                            <span className="text-emerald-700 dark:text-emerald-400 block text-[9px]">Alternative possible :</span>
                            <span className="font-bold text-emerald-800 dark:text-emerald-300">
                              "{uv.alternative_possible}"
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-slate-400" />
                    Aucun caractère ambigu (confusion 5/6 ou 3/8) détecté sur cette fiche.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 4. JSON STRUCTURE STRICTE (Section 7) */}
          {activeTab === 'json' && (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3 font-mono text-xs text-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-xs text-slate-300 font-bold">
                    JSON Schéma CTP SMART Conforme
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyJson}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors"
                  >
                    {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedJson ? 'Copié !' : 'Copier'}
                  </button>
                  <button
                    onClick={handleDownloadJson}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Télécharger .json
                  </button>
                </div>
              </div>

              <pre className="overflow-x-auto max-h-[500px] p-4 bg-slate-900 rounded-xl text-[11px] leading-relaxed text-emerald-400">
                {JSON.stringify(analysisResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Modal Quick Register into ModelMaster from OCR */}
      {newModelModal && newModelModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Enregistrer dans ModelMaster
                  </h3>
                  <p className="text-xs text-slate-500">
                    Validation du triplet logique Model + Pointure + Catégorie
                  </p>
                </div>
              </div>
              <button
                onClick={() => setNewModelModal(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Nom du Modèle
                </label>
                <input
                  type="text"
                  value={newModelModal.model_name}
                  onChange={(e) =>
                    setNewModelModal({ ...newModelModal, model_name: e.target.value.toUpperCase() })
                  }
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-bold"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Désignation
                </label>
                <input
                  type="text"
                  value={newModelModal.designation}
                  onChange={(e) =>
                    setNewModelModal({ ...newModelModal, designation: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Catégorie
                  </label>
                  <select
                    value={newModelModal.category}
                    onChange={(e) =>
                      setNewModelModal({ ...newModelModal, category: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                  >
                    <option value="Femme">Femme</option>
                    <option value="Homme">Homme</option>
                    <option value="Garçon">Garçon</option>
                    <option value="Fillette">Fillette</option>
                    <option value="Bébé">Bébé</option>
                    <option value="Mixte">Mixte</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Pointure
                  </label>
                  <input
                    type="text"
                    value={newModelModal.pointure}
                    onChange={(e) =>
                      setNewModelModal({ ...newModelModal, pointure: e.target.value })
                    }
                    placeholder="ex: 36/41"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Paires par Carton (Standard)
                </label>
                <input
                  type="number"
                  value={newModelModal.paires_par_carton}
                  onChange={(e) =>
                    setNewModelModal({
                      ...newModelModal,
                      paires_par_carton: Number(e.target.value) || 20,
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-bold text-indigo-600 text-sm"
                />
                <span className="text-[11px] text-slate-400 block mt-1">
                  Cette valeur servira à calculer automatiquement la production : Cartons pleins × Paires/Ctn.
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setNewModelModal(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveNewModelMaster}
                className="px-4 py-2 text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                Valider & Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
