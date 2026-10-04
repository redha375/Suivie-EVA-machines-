import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  Camera,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  History,
  Sparkles,
  ShieldCheck,
  Check,
  Eye,
} from 'lucide-react';

export const CounterScannerModal: React.FC = () => {
  const {
    t,
    machines,
    counterScans,
    addCounterScan,
    analyzeCounterImage,
    currentUser,
  } = useApp();

  const [selectedMachineId, setSelectedMachineId] = useState<string>(machines[0]?.id || 'mach-eva-1');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [manualOverrideVal, setManualOverrideVal] = useState<number | null>(null);
  const [notes, setNotes] = useState<string>('');
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeMachine = machines.find((m) => m.id === selectedMachineId) || machines[0];
  const previousCounter = activeMachine.lastCounterValue || 14820;

  // Sample industrial counter presets for instant demonstration
  const sampleCounters = [
    {
      label: 'Compteur Électronique LED (EVA 1)',
      url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80',
      expectedVal: previousCounter + 160,
    },
    {
      label: 'Compteur Mécanique à Rouleaux (EVA 2)',
      url: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=600&auto=format&fit=crop&q=80',
      expectedVal: previousCounter + 240,
    },
    {
      label: 'Cas Test Anomalie (Valeur Incohérente)',
      url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=80',
      expectedVal: previousCounter - 50, // lower than previous!
    },
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64 = uploadEvent.target?.result as string;
      setCapturedImage(base64);
      runOcrAnalysis(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleSelectSample = (sample: typeof sampleCounters[0]) => {
    setCapturedImage(sample.url);
    runOcrAnalysis(sample.url, sample.expectedVal);
  };

  const runOcrAnalysis = async (imgBase64OrUrl: string, presetVal?: number) => {
    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      if (presetVal !== undefined) {
        // Preset test
        await new Promise((r) => setTimeout(r, 800));
        const delta = presetVal - previousCounter;
        const isAnomaly = presetVal < previousCounter || delta > 800;
        setAnalysisResult({
          success: true,
          counterValue: presetVal,
          confidence: 0.96,
          counterType: 'digital',
          calculatedProduction: delta,
          isAnomaly,
          anomalyMessage: isAnomaly
            ? presetVal < previousCounter
              ? 'Valeur inférieure au relevé précédent ! Vérifiez s\'il y a eu remise à zéro.'
              : 'Production calculée anormalement haute (> 800 paires).'
            : null,
          method: 'gemini-vision',
        });
        setManualOverrideVal(presetVal);
      } else {
        const result = await analyzeCounterImage(imgBase64OrUrl, activeMachine.id, previousCounter);
        setAnalysisResult(result);
        setManualOverrideVal(result.counterValue);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirmAndSave = () => {
    const finalVal = manualOverrideVal ?? analysisResult?.counterValue ?? previousCounter;
    const delta = finalVal >= previousCounter ? finalVal - previousCounter : 0;
    const isAnomaly = Boolean(analysisResult?.isAnomaly);

    const nowStr = new Date().toISOString().substring(0, 16).replace('T', ' ');

    addCounterScan({
      machineId: activeMachine.id,
      machineCode: activeMachine.code,
      operatorId: currentUser.id,
      operatorName: currentUser.name,
      timestamp: nowStr,
      previousValue: previousCounter,
      counterValue: finalVal,
      calculatedProduction: delta,
      photoUrl: capturedImage || 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=500',
      isAnomaly,
      anomalyReason: analysisResult?.anomalyMessage || undefined,
      confirmedByOperator: true,
      notes: notes || 'Vérification et validation de cycle conforme.',
      readingConfidence: analysisResult?.confidence || 0.95,
      method: analysisResult?.method || 'gemini-vision',
    });

    // Reset view
    setCapturedImage(null);
    setAnalysisResult(null);
    setShowConfirmModal(false);
    setNotes('');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Title Banner */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Camera className="w-6 h-6 text-blue-600" />
            {t('scanCounterTitle')}
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            {t('scanCounterDesc')}
          </p>
        </div>

        {/* Machine Selector */}
        <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
          <span className="text-[11px] text-slate-500 pl-2 font-medium">Machine:</span>
          {machines.map((m) => (
            <button
              key={m.id}
              onClick={() => {
                setSelectedMachineId(m.id);
                setCapturedImage(null);
                setAnalysisResult(null);
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-mono font-bold transition ${
                selectedMachineId === m.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {m.code}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Camera Capture & OCR Area (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  Photographie du Compteur - {activeMachine.name}
                </h2>
                <span className="text-[11px] text-slate-500">
                  Dernière valeur enregistrée : <strong className="text-blue-600 font-mono">{previousCounter.toLocaleString()}</strong>
                </span>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                capture="environment"
                onChange={handleFileUpload}
                className="hidden"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition"
              >
                <Camera className="w-4 h-4" />
                <span>Prendre Photo / Fichier</span>
              </button>
            </div>

            {/* Photo Preview & Scan Laser Animation */}
            <div className="relative w-full h-64 sm:h-72 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 overflow-hidden flex flex-col items-center justify-center">
              {capturedImage ? (
                <>
                  <img
                    src={capturedImage}
                    alt="Compteur machine"
                    className="w-full h-full object-contain"
                  />
                  {isAnalyzing && (
                    <div className="absolute inset-0 bg-blue-900/30 backdrop-blur-2xs flex flex-col items-center justify-center">
                      <div className="w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent absolute top-0 animate-[bounce_2s_infinite]" />
                      <RefreshCw className="w-8 h-8 text-white animate-spin mb-2" />
                      <span className="text-xs font-bold text-white tracking-wider uppercase font-mono shadow-sm">
                        Analyse OCR Gemini 3.8 Flash...
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center p-6 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-white border border-slate-200 shadow-2xs flex items-center justify-center mx-auto text-slate-400">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-700">
                      Cadrez le compteur mécanique ou l'afficheur digital 7-segments
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Formats supportés : JPG, PNG ou capture directe smartphone/tablette
                    </p>
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 shadow-2xs transition"
                  >
                    Ouvrir la caméra ou la galerie
                  </button>
                </div>
              )}
            </div>

            {/* Quick Demo Test Presets */}
            <div className="mt-4 pt-3 border-t border-slate-100">
              <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block mb-2">
                Simuler avec un exemple d'atelier réel :
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {sampleCounters.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectSample(s)}
                    className="p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left text-xs transition flex flex-col justify-between"
                  >
                    <span className="font-semibold text-slate-800 text-[11px] truncate">{s.label}</span>
                    <span className="text-[10px] text-blue-600 font-mono mt-1 font-semibold">Cible: {s.expectedVal}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right: OCR Results, Anomaly Detection & Confirmation (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Résultats de la Reconnaissance IA
            </h2>

            {analysisResult ? (
              <div className="space-y-4">
                {/* Anomaly Banner */}
                {analysisResult.isAnomaly ? (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-bold text-rose-900">
                        {t('anomalyDetected')}
                      </strong>
                      <p className="mt-0.5 text-[11px] text-rose-700">
                        {analysisResult.anomalyMessage || 'Le relevé calculé présente un écart anormal avec l\'historique.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Relevé cohérent et validé par l'algorithme de contrôle.</span>
                  </div>
                )}

                {/* Metrics Breakdown */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">
                      {t('previousReading')}
                    </span>
                    <span className="text-lg font-bold font-mono text-slate-800">
                      {previousCounter.toLocaleString()}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">
                      {t('currentReading')}
                    </span>
                    <input
                      type="number"
                      value={manualOverrideVal ?? analysisResult.counterValue}
                      onChange={(e) => setManualOverrideVal(Number(e.target.value))}
                      className="text-lg font-bold font-mono text-blue-600 bg-transparent border-b border-blue-400 focus:outline-none w-full"
                    />
                  </div>
                </div>

                {/* Calculated Production */}
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-blue-900 font-bold block">
                      {t('pairsProducedCalc')}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Formule : Nouveau compteur - Ancien compteur
                    </span>
                  </div>
                  <div className="text-2xl font-black font-mono text-slate-900">
                    {Math.max(0, (manualOverrideVal ?? analysisResult.counterValue) - previousCounter)}
                    <span className="text-xs font-normal text-blue-700 ml-1">paires</span>
                  </div>
                </div>

                {/* Operator observations */}
                <div>
                  <label className="block text-slate-700 text-xs font-medium mb-1.5">
                    Notes / Observations de l'opérateur
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ex: Fin de poste matin, compteur net et vérifié"
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg p-2.5 text-xs focus:bg-white focus:border-blue-500"
                  />
                </div>

                {/* Action Buttons */}
                <div className="pt-2 flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (analysisResult.isAnomaly) {
                        setShowConfirmModal(true);
                      } else {
                        handleConfirmAndSave();
                      }
                    }}
                    className="flex-1 py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>{t('confirmReading')}</span>
                  </button>

                  <button
                    onClick={() => {
                      setCapturedImage(null);
                      setAnalysisResult(null);
                    }}
                    className="py-2.5 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition"
                  >
                    Réinitialiser
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs">
                Prenez ou chargez une photo de compteur pour afficher l'extraction IA automatique.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* History of Counter Scans & Photo Proofs */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Journal d'Archivage des Relevés & Preuves Photographiques
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            {counterScans.length} relevés enregistrés
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase text-[10px] font-semibold">
              <tr>
                <th className="px-3.5 py-3">Date & Heure</th>
                <th className="px-3.5 py-3">Machine</th>
                <th className="px-3.5 py-3">Opérateur</th>
                <th className="px-3.5 py-3 text-right">Ancien Compteur</th>
                <th className="px-3.5 py-3 text-right">Nouveau Relevé</th>
                <th className="px-3.5 py-3 text-right">Paires Réalisées</th>
                <th className="px-3.5 py-3 text-center">Preuve Photo</th>
                <th className="px-3.5 py-3">Statut / Remarques</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {counterScans.map((scan) => (
                <tr key={scan.id} className="hover:bg-slate-50/70 transition">
                  <td className="px-3.5 py-3 font-mono text-slate-500">{scan.timestamp}</td>
                  <td className="px-3.5 py-3 font-bold text-slate-900">{scan.machineCode}</td>
                  <td className="px-3.5 py-3">{scan.operatorName}</td>
                  <td className="px-3.5 py-3 text-right font-mono text-slate-500">{scan.previousValue.toLocaleString()}</td>
                  <td className="px-3.5 py-3 text-right font-mono font-bold text-blue-600">
                    {scan.counterValue.toLocaleString()}
                  </td>
                  <td className="px-3.5 py-3 text-right font-mono font-bold text-emerald-700">
                    +{scan.calculatedProduction}
                  </td>
                  <td className="px-3.5 py-3 text-center">
                    <button
                      onClick={() => setPreviewPhoto(scan.photoUrl)}
                      className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline font-medium"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Voir</span>
                    </button>
                  </td>
                  <td className="px-3.5 py-3">
                    {scan.isAnomaly ? (
                      <span className="text-rose-600 font-semibold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Anomalie confirmée
                      </span>
                    ) : (
                      <span className="text-slate-500">{scan.notes || 'Conforme'}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal for Anomalous Reading */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-900">Confirmation d'Anomalie Requise</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Le relevé du compteur indique une valeur inhabituelle. Confirmez-vous formellement que ce chiffre est exact (par exemple suite à une maintenance ou un redémarrage de la machine) ?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmAndSave}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition"
              >
                Confirmer et Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Proof Photo Fullscreen Modal */}
      {previewPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs">
          <div className="relative max-w-2xl w-full bg-white p-3 rounded-xl border border-slate-200 shadow-2xl">
            <button
              onClick={() => setPreviewPhoto(null)}
              className="absolute top-4 right-4 text-white font-bold bg-slate-800 hover:bg-slate-900 w-8 h-8 rounded-full flex items-center justify-center transition shadow-md"
            >
              ✕
            </button>
            <img src={previewPhoto} alt="Preuve Compteur" className="w-full max-h-[80vh] object-contain rounded-lg" />
          </div>
        </div>
      )}
    </div>
  );
};
