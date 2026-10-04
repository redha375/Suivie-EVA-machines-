import React from 'react';
import {
  Sparkles,
  Layers,
  Cpu,
  ShieldCheck,
  CheckCircle2,
  Info,
  Sliders,
  Settings,
  Flame,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const EVAWorkflowTab: React.FC = () => {
  const { machines, shoeModels, productionEntries } = useApp();

  const evaMachines = machines.filter(
    (m) => m.material === 'EVA' || m.code.includes('EVA') || m.supportedMaterials?.includes('EVA')
  );
  const evaModels = shoeModels.filter((m) => m.material === 'EVA' || m.defaultMaterial === 'EVA');
  const evaEntries = productionEntries.filter((p) => p.material === 'EVA');

  return (
    <div className="space-y-6" id="eva-workflow-container">
      {/* Decoupled Architecture Banner */}
      <div className="p-6 bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-2xl border border-emerald-500/30 shadow-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Architecture Découplée &amp; Évolutive EVA
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                  Prêt pour injection de règles
                </span>
              </div>
              <p className="text-xs text-emerald-200 mt-1 max-w-2xl">
                Principe fondamental : Ne pas appliquer les règles de PVC ou Soumelle à l'EVA. La logique EVA dispose de ses propres machines, de ses structures de données isolées et de ses règles de calcul dédiées.
              </p>
            </div>
          </div>
        </div>

        {/* Feature status badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-5 border-t border-white/15 text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Machines EVA isolées ({evaMachines.length} configurées)</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Fiche journalière multi-matières compatible</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Aucune interférence avec PVC ou Soumelle</span>
          </div>
        </div>
      </div>

      {/* Machines EVA & Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {evaMachines.map((mach) => (
          <div key={mach.id} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                {mach.code}
              </span>
              <span className="text-[11px] font-semibold text-slate-500 uppercase">
                {mach.status === 'production' ? 'En marche' : 'Arrêt'}
              </span>
            </div>
            <h4 className="text-base font-bold text-slate-900">{mach.name}</h4>
            <div className="mt-3 space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span className="text-slate-400">Plateformes :</span>
                <span className="font-semibold text-slate-800">{mach.platformsCount || 6}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Moules / Plateforme :</span>
                <span className="font-semibold text-slate-800">{mach.moldsPerPlatform || 2}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Dernier compteur :</span>
                <span className="font-mono font-bold text-emerald-700">
                  {mach.lastCounterValue.toLocaleString()} paires
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* EVA Production Entries */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200">
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-600" />
            Lots de Production Réalisés en EVA
          </h4>
          <p className="text-xs text-slate-500">
            Historique des fabrications EVA enregistrées via la Fiche Journalière
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Date / Heure</th>
                <th className="px-4 py-3">Machine</th>
                <th className="px-4 py-3">Modèle EVA</th>
                <th className="px-4 py-3">Moule(s) &amp; Couleur</th>
                <th className="px-4 py-3">Détail Pointures</th>
                <th className="px-4 py-3 text-right">Production</th>
                <th className="px-4 py-3">Conditionnement Cartons</th>
                <th className="px-4 py-3">Opérateur</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {evaEntries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    Aucune production EVA enregistrée pour l'instant. Utilisez la Fiche Journalière pour saisir un lot.
                  </td>
                </tr>
              ) : (
                evaEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-slate-900">
                      {entry.date} <span className="text-[10px] text-slate-400">{entry.time}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-emerald-800 font-bold">
                      {entry.machineCode}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{entry.modelName}</div>
                      <div className="text-[11px] text-slate-500 font-mono">Modèle EVA paramétré</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-800 font-medium">{entry.moldId}</div>
                      <div className="text-[11px] text-slate-500">{entry.color1}</div>
                    </td>
                    <td className="px-4 py-3">
                      {entry.sizeBreakdown && Object.keys(entry.sizeBreakdown).length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(entry.sizeBreakdown).map(([sz, q]) => (
                            <span
                              key={sz}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-[11px] font-mono text-indigo-900"
                            >
                              <strong className="font-bold">T{sz}:</strong> {q}p
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="font-mono text-xs text-slate-700">T{entry.size || 40}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="font-mono font-black text-emerald-700 text-sm">
                        {entry.qtyConforming} p.
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Brut : {entry.qtyProduced}p • Rebut : {entry.qtyRejected}p
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {entry.completeCartons !== undefined || entry.packagingCartonsCount !== undefined ? (
                        <div className="text-xs">
                          <span className="inline-flex items-center gap-1 font-mono font-bold text-slate-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                            📦 {entry.completeCartons ?? entry.packagingCartonsCount} cartons {entry.cartonType || 'D5'}
                          </span>
                          {(entry.remainderPairs ?? 0) > 0 && (
                            <span className="block text-[11px] text-amber-800 mt-0.5">
                              + {entry.remainderPairs} paires restantes
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-medium">{entry.operatorName}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
