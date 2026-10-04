import React, { useState } from 'react';
import { Download, Smartphone, Sparkles, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { FieldLaunchpadModal } from './FieldLaunchpadModal';

interface PWAInstallButtonProps {
  variant?: 'header' | 'hero' | 'floating';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'header', className = '' }) => {
  const { isInstalled, canInstall, installApp } = usePWAInstall();
  const [modalOpen, setModalOpen] = useState(false);

  const handleClick = async () => {
    if (canInstall) {
      const ok = await installApp();
      if (!ok) {
        setModalOpen(true);
      }
    } else {
      setModalOpen(true);
    }
  };

  if (variant === 'floating') {
    if (isInstalled) return null;

    return (
      <>
        <div className="fixed bottom-4 right-4 z-40">
          <button
            onClick={handleClick}
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white font-bold text-xs shadow-xl shadow-blue-500/30 border border-blue-400/30 hover:scale-105 active:scale-95 transition cursor-pointer animate-bounce-subtle"
            title="Installer l'application CTP SMART"
          >
            <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center">
              <Download className="w-3.5 h-3.5 text-white" />
            </div>
            <span>Installer l'App Terrain</span>
          </button>
        </div>

        <FieldLaunchpadModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
      </>
    );
  }

  if (variant === 'hero') {
    return (
      <>
        <button
          onClick={handleClick}
          className={`flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition cursor-pointer ${className}`}
        >
          <Smartphone className="w-4 h-4 text-blue-200" />
          <span>{isInstalled ? 'App Installée • Guide Terrain' : '📲 Télécharger l\'Application (PWA)'}</span>
        </button>

        <FieldLaunchpadModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
      </>
    );
  }

  // Header variant
  return (
    <>
      <button
        onClick={handleClick}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
          isInstalled
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
            : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs hover:from-blue-500 hover:to-indigo-500'
        } ${className}`}
        title={isInstalled ? 'Guide Terrain & Démarrage' : 'Installer CTP SMART sur votre appareil'}
      >
        {isInstalled ? (
          <>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden md:inline">App Installée</span>
          </>
        ) : (
          <>
            <Download className="w-3.5 h-3.5 animate-pulse" />
            <span className="hidden sm:inline">Installer l'App</span>
          </>
        )}
      </button>

      <FieldLaunchpadModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
};
