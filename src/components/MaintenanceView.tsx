import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Wrench,
  AlertTriangle,
  Plus,
  CheckCircle2,
  Clock,
  Settings2,
  Check,
  Calendar,
  Layers,
} from 'lucide-react';
import { MaintenanceTicket } from '../types';

export const MaintenanceView: React.FC = () => {
  const {
    t,
    machines,
    maintenanceTickets,
    addMaintenanceTicket,
    resolveMaintenanceTicket,
    currentUser,
    hasPermission,
  } = useApp();

  const [showReportModal, setShowReportModal] = useState(false);
  const [resolvingTicketId, setResolvingTicketId] = useState<string | null>(null);
  const [resolutionTimeMin, setResolutionTimeMin] = useState<number>(45);

  // Form states
  const [formMachine, setFormMachine] = useState<string>(machines[0]?.id || 'mach-eva-1');
  const [formType, setFormType] = useState<'corrective' | 'preventive'>('corrective');
  const [formTitle, setFormTitle] = useState<string>('Défaut hydraulique vérin plateau 3');
  const [formDescription, setFormDescription] = useState<string>('Baisse de pression d\'injection constatée lors du cycle.');
  const [formPriority, setFormPriority] = useState<'basse' | 'moyenne' | 'haute' | 'urgente'>('urgente');
  const [formTechnician, setFormTechnician] = useState<string>('Tarek Mansouri');

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    const nowStr = new Date().toISOString().substring(0, 16).replace('T', ' ');

    addMaintenanceTicket({
      machineId: formMachine,
      type: formType,
      title: formTitle,
      description: formDescription,
      reportedAt: nowStr,
      status: 'en_cours',
      downtimeMinutes: 0,
      sparePartsUsed: [],
      technicianName: formTechnician,
      priority: formPriority,
    });

    setShowReportModal(false);
  };

  const handleConfirmResolve = (id: string) => {
    resolveMaintenanceTicket(id, resolutionTimeMin);
    setResolvingTicketId(null);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Wrench className="w-6 h-6 text-blue-600" />
            {t('maintenanceTitle')}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Gestion de la maintenance préventive, corrective, pièces de rechange et temps d'arrêt.
          </p>
        </div>

        {hasPermission('maintenance') && (
          <button
            onClick={() => setShowReportModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>{t('reportBreakdown')}</span>
          </button>
        )}
      </div>

      {/* Machine Telemetry Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {machines.map((mach) => (
          <div key={mach.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-slate-900 font-mono text-sm">{mach.code}</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                mach.status === 'running'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
              }`}>
                {mach.status === 'running' ? 'En Service' : 'Arrêt Maintenance'}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Température Buse :</span>
                <span className="font-mono font-bold text-slate-800">{mach.temperatureNozzle || 175}°C</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Température Moule :</span>
                <span className="font-mono font-bold text-slate-800">{mach.temperatureMold || 168}°C</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Pression Hydraulique :</span>
                <span className="font-mono font-bold text-slate-800">{mach.hydraulicPressure || 140} Bar</span>
              </div>
              <div className="flex justify-between text-slate-500 pt-2.5 border-t border-slate-100">
                <span>Compteur cycle :</span>
                <span className="font-mono font-bold text-blue-600">{mach.lastCounterValue.toLocaleString()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Maintenance Tickets Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            Ordres d'Intervention & Pannes Enregistrées
          </h3>
          <span className="text-xs text-slate-500 font-medium">
            {maintenanceTickets.filter((t) => t.status !== 'resolu').length} intervention(s) active(s)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase text-[10px] font-semibold">
              <tr>
                <th className="px-3.5 py-3">Date Signalement</th>
                <th className="px-3.5 py-3">Machine</th>
                <th className="px-3.5 py-3">Type</th>
                <th className="px-3.5 py-3">Titre & Description</th>
                <th className="px-3.5 py-3">Priorité</th>
                <th className="px-3.5 py-3">Technicien</th>
                <th className="px-3.5 py-3 text-right">Temps d'arrêt</th>
                <th className="px-3.5 py-3">Pièces utilisées</th>
                <th className="px-3.5 py-3 text-center">Statut</th>
                <th className="px-3.5 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {maintenanceTickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-slate-50/70 transition">
                  <td className="px-3.5 py-3 font-mono text-slate-500">{ticket.reportedAt}</td>
                  <td className="px-3.5 py-3 font-bold text-slate-900 font-mono">
                    {ticket.machineId.toUpperCase()}
                  </td>
                  <td className="px-3.5 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      ticket.type === 'corrective'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>
                      {ticket.type === 'corrective' ? 'Corrective (Panne)' : 'Préventive'}
                    </span>
                  </td>
                  <td className="px-3.5 py-3 max-w-xs">
                    <div className="font-semibold text-slate-900">{ticket.title}</div>
                    <div className="text-[11px] text-slate-500 line-clamp-1">{ticket.description}</div>
                  </td>
                  <td className="px-3.5 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      ticket.priority === 'urgente'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : ticket.priority === 'haute'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}>
                      {ticket.priority}
                    </span>
                  </td>
                  <td className="px-3.5 py-3 text-slate-800 font-medium">{ticket.technicianName}</td>
                  <td className="px-3.5 py-3 text-right font-mono font-bold text-amber-600">
                    {ticket.downtimeMinutes > 0 ? `${ticket.downtimeMinutes} min` : '0 min'}
                  </td>
                  <td className="px-3.5 py-3 text-[11px] text-slate-500">
                    {ticket.sparePartsUsed.length > 0
                      ? ticket.sparePartsUsed.map((p) => `${p.partName} (${p.quantity})`).join(', ')
                      : 'Aucune'}
                  </td>
                  <td className="px-3.5 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold capitalize border ${
                      ticket.status === 'resolu'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                    }`}>
                      {ticket.status}
                    </span>
                  </td>
                  <td className="px-3.5 py-3 text-center">
                    {ticket.status !== 'resolu' && hasPermission('maintenance') ? (
                      <button
                        onClick={() => setResolvingTicketId(ticket.id)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold transition shadow-xs"
                      >
                        Clôturer
                      </button>
                    ) : (
                      <span className="text-slate-400 text-xs">Clôturé</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Report Breakdown */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                Signaler une Panne Machine
              </h3>
              <button
                onClick={() => setShowReportModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Machine concernée</label>
                <select
                  value={formMachine}
                  onChange={(e) => setFormMachine(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 font-bold focus:bg-white focus:border-blue-500"
                >
                  {machines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.code} - {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Type d'intervention</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:bg-white focus:border-blue-500"
                >
                  <option value="corrective">Corrective (Arrêt Panne Urgente)</option>
                  <option value="preventive">Préventive (Entretien Programmé)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Titre de la panne</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:bg-white focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Description détaillée</label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:bg-white focus:border-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Degré d'urgence</label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:bg-white focus:border-blue-500"
                  >
                    <option value="urgente">Urgente (Arrêt machine)</option>
                    <option value="haute">Haute</option>
                    <option value="moyenne">Moyenne</option>
                    <option value="basse">Basse</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">Technicien assigné</label>
                  <input
                    type="text"
                    value={formTechnician}
                    onChange={(e) => setFormTechnician(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:bg-white focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-sm transition"
                >
                  Déclarer et Arrêter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Resolve Maintenance Ticket */}
      {resolvingTicketId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-sm p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Clôturer l'Intervention
            </h3>
            <p className="text-xs text-slate-600">
              Indiquez la durée totale de l'arrêt machine afin de recalculer la disponibilité (TRS) et remettre la machine en production.
            </p>

            <div>
              <label className="block text-slate-600 text-xs font-medium mb-1">Temps d'arrêt total (minutes)</label>
              <input
                type="number"
                min={1}
                value={resolutionTimeMin}
                onChange={(e) => setResolutionTimeMin(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 font-mono text-base font-bold focus:bg-white focus:border-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setResolvingTicketId(null)}
                className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition"
              >
                Annuler
              </button>
              <button
                onClick={() => handleConfirmResolve(resolvingTicketId)}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition"
              >
                Valider et Remettre en Marche
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
