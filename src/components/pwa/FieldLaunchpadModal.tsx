import React, { useState } from 'react';
import {
  Download,
  Smartphone,
  Factory,
  ShieldCheck,
  CheckCircle2,
  Share2,
  PlusSquare,
  QrCode,
  Zap,
  Sparkles,
  ArrowRight,
  X,
  Layers,
  Award,
  Wifi,
  WifiOff,
  Boxes,
  FileText,
  Printer,
  ChevronRight,
} from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { useApp } from '../../context/AppContext';

interface FieldLaunchpadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FieldLaunchpadModal: React.FC<FieldLaunchpadModalProps> = ({ isOpen, onClose }) => {
  const { isInstalled, canInstall, isIOS, installApp } = usePWAInstall();
  const { currentUser, isRtl, isOnline, setActiveTab } = useApp();
  const [activeTabGuide, setActiveTabGuide] = useState<'install' | 'chef' | 'gerant' | 'offline'>('install');
  const [installSuccess, setInstallSuccess] = useState(false);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    const success = await installApp();
    if (success) {
      setInstallSuccess(true);
    }
  };

  const appUrl = window.location.href;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div
        className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-3xl w-full text-slate-100 shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200"
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        {/* Brand Header with Shoe Factory Logo */}
        <div className="relative bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 p-6 sm:p-7 border-b border-slate-800 overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer z-10"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 relative z-10">
            {/* Dedicated Footwear Production Logo */}
            <div className="relative group shrink-0">
              <img
                src="/ctp-shoe-logo.png"
                alt="Logo CTP SMART Chaussures"
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover shadow-xl border-2 border-blue-500/30 group-hover:border-blue-400 transition"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <span className="absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded bg-amber-500 text-slate-950 font-black text-[9px] shadow-sm">
                EVA
              </span>
            </div>

            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[11px] font-bold tracking-wider uppercase flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  C.T PLAST • FOOTWEAR ERP 2026
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold">
                  {isInstalled ? '✅ Déjà Installé' : '📲 Prêt pour Installation'}
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <span>Démarrage & Installation Terrain CTP SMART</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
                Guide officiel pour déployer l'application sur smartphone, tablette d'atelier et poste de commande des machines EVA 1 à EVA 4.
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs Guide */}
        <div className="flex items-center gap-1 p-2 bg-slate-950/70 border-b border-slate-800 text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTabGuide('install')}
            className={`px-3 py-2 rounded-xl font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTabGuide === 'install'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>1. Télécharger l'App (PWA)</span>
          </button>

          <button
            onClick={() => setActiveTabGuide('chef')}
            className={`px-3 py-2 rounded-xl font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTabGuide === 'chef'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Factory className="w-4 h-4 text-blue-400" />
            <span>2. Routine Chef d'Équipe (8h)</span>
          </button>

          <button
            onClick={() => setActiveTabGuide('gerant')}
            className={`px-3 py-2 rounded-xl font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTabGuide === 'gerant'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>3. Contrôle & Matière (Gérant)</span>
          </button>

          <button
            onClick={() => setActiveTabGuide('offline')}
            className={`px-3 py-2 rounded-xl font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTabGuide === 'offline'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Wifi className="w-4 h-4 text-emerald-400" />
            <span>4. Fonctionnement Hors-Ligne</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-6">
          {/* TAB 1: INSTALLATION & DOWNLOAD */}
          {activeTabGuide === 'install' && (
            <div className="space-y-6">
              {/* Primary Install Action Box */}
              <div className="bg-gradient-to-br from-blue-900/40 via-indigo-950/40 to-slate-900 border border-blue-500/30 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-500/30">
                    <Smartphone className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-white">
                      Installer CTP SMART sur cet appareil
                    </h3>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Accédez à l'application comme une application native depuis votre écran d'accueil sans passer par l'App Store.
                    </p>
                  </div>
                </div>

                {isInstalled ? (
                  <div className="px-5 py-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold text-xs flex items-center gap-2 shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Déjà Installé en Standalone</span>
                  </div>
                ) : canInstall ? (
                  <button
                    onClick={handleInstallClick}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs shadow-lg shadow-blue-600/40 transition flex items-center justify-center gap-2 cursor-pointer shrink-0"
                  >
                    <Download className="w-4 h-4" />
                    <span>Installer Maintenant (1-Clic)</span>
                  </button>
                ) : isIOS ? (
                  <div className="px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-200 text-xs font-semibold shrink-0">
                    Suivre les étapes Safari ci-dessous ↓
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      alert('Pour installer l’application : ouvrez le menu de votre navigateur (les 3 points en haut à droite) puis sélectionnez "Installer l\'application" ou "Ajouter à l\'écran d\'accueil".');
                    }}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition flex items-center justify-center gap-2 cursor-pointer shrink-0"
                  >
                    <Download className="w-4 h-4 text-blue-400" />
                    <span>Instructions d'Installation</span>
                  </button>
                )}
              </div>

              {installSuccess && (
                <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Installation réussie ! Vous pouvez maintenant lancer CTP SMART directement depuis votre écran d'accueil.</span>
                </div>
              )}

              {/* Instructions by Platform */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Android / Chrome */}
                <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
                    <span className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center text-xs">🤖</span>
                    <span>Sur Téléphone Android / Chrome</span>
                  </div>
                  <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside leading-relaxed">
                    <li>Ouvrez le lien dans <strong>Google Chrome</strong>.</li>
                    <li>Appuyez sur le menu (<strong>⋮</strong> les 3 points verticaux).</li>
                    <li>Sélectionnez <strong>« Installer l'application »</strong> ou <strong>« Ajouter à l'écran d'accueil »</strong>.</li>
                    <li>L'icône officielle <strong>CTP SMART</strong> avec la semelle apparaîtra sur votre écran.</li>
                  </ol>
                </div>

                {/* iPhone / Safari */}
                <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
                    <span className="w-6 h-6 rounded-lg bg-indigo-500/20 flex items-center justify-center text-xs">🍏</span>
                    <span>Sur iPhone / iPad (Safari)</span>
                  </div>
                  <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside leading-relaxed">
                    <li>Ouvrez le lien dans le navigateur <strong>Safari</strong>.</li>
                    <li>Touchez le bouton <strong>Partager</strong> <Share2 className="w-3.5 h-3.5 inline text-blue-400" /> en bas de l'écran.</li>
                    <li>Faites défiler et choisissez <strong>« Sur l'écran d'accueil »</strong> <PlusSquare className="w-3.5 h-3.5 inline text-slate-300" />.</li>
                    <li>Touchez <strong>« Ajouter »</strong> en haut à droite.</li>
                  </ol>
                </div>
              </div>

              {/* Sharing link / Field QR */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300 shrink-0">
                    <QrCode className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <span className="font-bold text-white block">Lien d'accès usine direct :</span>
                    <span className="text-slate-400 font-mono text-[11px] truncate block max-w-sm">
                      {appUrl}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(appUrl);
                    alert('Lien copié dans le presse-papier ! Vous pouvez le transmettre par WhatsApp ou SMS aux chefs d’équipe.');
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-400" />
                  <span>Copier le Lien Atelier</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: CHEF D'EQUIPE ROUTINE */}
          {activeTabGuide === 'chef' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-blue-900/20 border border-blue-500/30 text-slate-200">
                <h4 className="font-bold text-sm text-white mb-1 flex items-center gap-2">
                  <Factory className="w-4 h-4 text-blue-400" />
                  <span>Procédure Quotidienne du Chef d'Équipe (Poste 8 Heures)</span>
                </h4>
                <p className="text-slate-300 text-xs">
                  Chaque Chef d'équipe est affecté à sa machine (EVA1, EVA2, EVA3, ou EVA4) et à son quart de travail (Matin, Soir, ou Nuit).
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black flex items-center justify-center shrink-0 text-xs">1</span>
                  <div>
                    <strong className="text-white font-bold block">Prise de poste :</strong>
                    <span className="text-slate-300">
                      Connectez-vous avec votre matricule officiel (ex: <code>CTP-CE-1A</code> pour Équipe A Matin sur EVA 1). L'application verrouille automatiquement votre machine et votre shift.
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black flex items-center justify-center shrink-0 text-xs">2</span>
                  <div>
                    <strong className="text-white font-bold block">Fin de poste (Relevé Compteur) :</strong>
                    <span className="text-slate-300">
                      Relevez le compteur début et fin sur le panneau de la machine. Entrez le total de paires produites et décomptez les défauts par référence de semelle.
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black flex items-center justify-center shrink-0 text-xs">3</span>
                  <div>
                    <strong className="text-white font-bold block">Transmission au Gérant :</strong>
                    <span className="text-slate-300">
                      Cliquez sur <strong>« Transmettre au Gérant pour Validation »</strong>. La fiche passe en attente (`soumis`). Si le Gérant la rejette avec motif, corrigez les données et renvoyez-la.
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => {
                    setActiveTab('ctp_tracker');
                    onClose();
                  }}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Ouvrir l'Espace Chef d'Équipe</span>
                  <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: GERANT DE MACHINE ROUTINE */}
          {activeTabGuide === 'gerant' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-amber-900/20 border border-amber-500/30 text-slate-200">
                <h4 className="font-bold text-sm text-white mb-1 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>Responsabilités du Gérant de Machine (U1 & U2)</span>
                </h4>
                <p className="text-slate-300 text-xs">
                  Chaque Gérant est dédié à une unique machine EVA. Il supervise ses 3 chefs d'équipe, valide les fiches et enregistre la matière première.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
                  <span className="text-amber-400 font-bold block flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Validation ou Rejet des Fiches
                  </span>
                  <p className="text-slate-300 leading-relaxed text-[11px]">
                    Examinez les compteurs et paires des 3 shifts (A, B, C). Cliquez sur <strong>Confirmer</strong> pour sceller la fiche, ou sur <strong>Rejeter</strong> en spécifiant obligatoirement le motif précis (écart de compteur, comptage cartons erroné, etc.).
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
                  <span className="text-blue-400 font-bold block flex items-center gap-1.5">
                    <Boxes className="w-4 h-4" />
                    Entrée Matière Première (EVA)
                  </span>
                  <p className="text-slate-300 leading-relaxed text-[11px]">
                    À l'arrivée des sacs de Compound EVA (sacs de 25 kg) dans votre atelier, saisissez immédiatement la quantité en Kg, le nombre de sacs et le N° de Lot pour alimenter le stock atelier et l'Audit Log.
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => {
                    setActiveTab('ctp_tracker');
                    onClose();
                  }}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-black text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Ouvrir l'Espace Gérant</span>
                  <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: OFFLINE SUPPORT */}
          {activeTabGuide === 'offline' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-emerald-900/20 border border-emerald-500/30 text-slate-200">
                <div className="flex items-center gap-2 mb-1">
                  {isOnline ? (
                    <Wifi className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <WifiOff className="w-5 h-5 text-amber-400 animate-pulse" />
                  )}
                  <h4 className="font-bold text-sm text-white">
                    État Réseau Actuel : {isOnline ? 'En Ligne (Connecté)' : 'Mode Hors-Ligne (Atelier)'}
                  </h4>
                </div>
                <p className="text-slate-300 text-xs">
                  L'application intègre un Service Worker et un stockage local (LocalStorage / IndexedDB) qui garantissent son fonctionnement même en cas de coupure de réseau ou de zone blanche dans l'atelier d'injection.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
                <strong className="text-white block font-bold">Garanties Terrain CTP SMART :</strong>
                <ul className="text-slate-300 space-y-1.5 text-[11px] list-disc list-inside">
                  <li>Toutes les saisies de compteurs et fiches restent enregistrées localement sur l'appareil.</li>
                  <li>Dès que la connexion Wi-Fi ou 4G est rétablie, les fiches sont synchronisées avec le serveur central.</li>
                  <li>Le Journal d'Audit consigne l'horodatage précis de la saisie physique locale.</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-400 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>CTP SMART v2026.1 • Prêt pour injection EVA 1-4</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
