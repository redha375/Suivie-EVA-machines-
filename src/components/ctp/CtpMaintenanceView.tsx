import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { CtpMaintenanceRecord, MaintenanceTicket } from '../../types';
import {
  Wrench,
  AlertTriangle,
  Plus,
  Calendar,
  Gauge,
  Clock,
  Camera,
  CheckCircle2,
  TrendingUp,
  Image as ImageIcon,
  UserCheck,
  X,
  Zap,
  Search,
  Trash2,
  RotateCcw,
  Check,
  FileText,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
} from 'recharts';

export const CtpMaintenanceView: React.FC = () => {
  const {
    ctpMaintenance,
    addCtpMaintenanceRecord,
    deleteCtpMaintenanceRecord,
    maintenanceTickets,
    resolveMaintenanceTicket,
    deleteMaintenanceTicket,
    restoreDefaultErpData,
  } = useApp();

  // Active section tab: 'releves' (compteurs journaliers) vs 'tickets' (ordres de travail / fiches pannes)
  const [activeTab, setActiveTab] = useState<'releves' | 'tickets'>('releves');

  // Search & Filters for relevés
  const [searchReleves, setSearchReleves] = useState<string>('');
  const [filterMachineReleves, setFilterMachineReleves] = useState<string>('all');

  // Search & Filters for tickets
  const [searchTickets, setSearchTickets] = useState<string>('');
  const [filterTicketStatus, setFilterTicketStatus] = useState<string>('all');
  const [filterTicketPriority, setFilterTicketPriority] = useState<string>('all');

  // Ticket resolution state
  const [resolvingTicketId, setResolvingTicketId] = useState<string | null>(null);
  const [resolutionMinutes, setResolutionMinutes] = useState<number>(45);
  const [partsCost, setPartsCost] = useState<number>(0);
  const [laborCost, setLaborCost] = useState<number>(0);
  const [technicianReport, setTechnicianReport] = useState<string>('');

  // Form states
  const todayStr = new Date().toISOString().split('T')[0];
  const [machine, setMachine] = useState<'EVA 1' | 'EVA 2' | 'EVA 3'>('EVA 1');
  const [date, setDate] = useState<string>(todayStr);
  const [compteurDebut, setCompteurDebut] = useState<number>(818500);
  const [compteurFin, setCompteurFin] = useState<number>(819104);
  const [panne, setPanne] = useState<'oui' | 'non'>('non');
  const [dureeArret, setDureeArret] = useState<number>(0);
  const [causePanne, setCausePanne] = useState<string>('');
  const [photoCompteur, setPhotoCompteur] = useState<string>('');
  const [technicien, setTechnicien] = useState<string>('Tarek Mansouri');
  const [heuresMarche, setHeuresMarche] = useState<number>(7.5);

  const [notification, setNotification] = useState<string | null>(null);
  const [viewPhotoUrl, setViewPhotoUrl] = useState<string | null>(null);

  // Auto total = fin - début
  const totalPaires = Math.max(0, compteurFin - compteurDebut);
  const calculatedRendement = heuresMarche > 0 ? Number((totalPaires / heuresMarche).toFixed(1)) : 0;

  const filteredReleves = useMemo(() => {
    return ctpMaintenance.filter((m) => {
      if (filterMachineReleves !== 'all' && m.machine !== filterMachineReleves) return false;
      if (searchReleves.trim()) {
        const q = searchReleves.toLowerCase();
        return (
          m.machine.toLowerCase().includes(q) ||
          m.technicien.toLowerCase().includes(q) ||
          m.date.includes(q) ||
          m.cause_panne?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [ctpMaintenance, filterMachineReleves, searchReleves]);

  const filteredTickets = useMemo(() => {
    return maintenanceTickets.filter((t) => {
      if (filterTicketStatus !== 'all' && t.status !== filterTicketStatus) return false;
      if (filterTicketPriority !== 'all' && t.priority !== filterTicketPriority) return false;
      if (searchTickets.trim()) {
        const q = searchTickets.toLowerCase();
        return (
          t.machineId.toLowerCase().includes(q) ||
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.assignedTo?.toLowerCase().includes(q) ||
          t.technicianReport?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [maintenanceTickets, filterTicketStatus, filterTicketPriority, searchTickets]);

  // Handle Photo Upload (file to base64)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoCompteur(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (compteurFin < compteurDebut) {
      alert('Le compteur fin doit être supérieur ou égal au compteur début.');
      return;
    }

    const res = addCtpMaintenanceRecord({
      machine,
      date,
      compteur_debut: compteurDebut,
      compteur_fin: compteurFin,
      total: totalPaires,
      panne,
      duree_arret: panne === 'oui' ? Number(dureeArret) : 0,
      cause_panne: panne === 'oui' ? causePanne : '',
      photo_compteur: photoCompteur || (panne === 'oui'
        ? 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500&auto=format&fit=crop&q=60'
        : 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=500&auto=format&fit=crop&q=60'),
      technicien,
      heures_marche: heuresMarche,
      rendement_paires_heure: calculatedRendement,
    });

    setNotification(res.message);
    setCompteurDebut(compteurFin);
    setCompteurFin(compteurFin + 600);
    setPanne('non');
    setDureeArret(0);
    setCausePanne('');
    setPhotoCompteur('');
    setTimeout(() => setNotification(null), 5000);
  };

  // Prepare chart data: Rendement machine par jour (total paires / heures)
  const chartData = useMemo(() => {
    // Group by date
    const dateMap: { [date: string]: { date: string; [mach: string]: any } } = {};

    ctpMaintenance.forEach((rec) => {
      if (!dateMap[rec.date]) {
        dateMap[rec.date] = { date: rec.date };
      }
      const machKey = rec.machine.replace(' ', '_');
      dateMap[rec.date][machKey] = rec.rendement_paires_heure || 0;
      dateMap[rec.date][`${machKey}_total`] = rec.total;
    });

    return Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));
  }, [ctpMaintenance]);

  // Overall KPIs
  const totalArretsHeures = ctpMaintenance.reduce((acc, m) => acc + (m.panne === 'oui' ? m.duree_arret : 0), 0);
  const totalPannes = ctpMaintenance.filter((m) => m.panne === 'oui').length;
  const avgRendement = ctpMaintenance.length > 0
    ? Math.round(ctpMaintenance.reduce((acc, m) => acc + (m.rendement_paires_heure || 0), 0) / ctpMaintenance.length)
    : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-slate-800">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 bg-blue-500/20 text-blue-300 text-xs font-semibold rounded border border-blue-400/30 uppercase tracking-wider">
                Module 4 • Relevés Machines & Compteurs
              </span>
              <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 text-xs font-semibold rounded border border-amber-400/30">
                Formule : Total = Fin - Début • Rendement = Paires / Heures
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Interface Maintenance & Suivi des Compteurs
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              Saisie des index compteurs machines EVA 1, EVA 2, EVA 3, déclaration des arrêts et pannes avec photos, et{' '}
              <strong className="text-emerald-300">dashboard du rendement machine par jour</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {notification && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Rendement Moyen</span>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
              {avgRendement} <span className="text-sm font-normal text-slate-500">paires / heure</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Cadence moyenne observée</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Temps d'Arrêt Total</span>
            <div className="text-2xl sm:text-3xl font-black text-rose-600 mt-1">
              {totalArretsHeures.toFixed(1)} <span className="text-sm font-normal text-rose-500">heures</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{totalPannes} incidents enregistrés</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Disponibilité Parc Machine</span>
            <div className="text-2xl sm:text-3xl font-black text-blue-700 mt-1">
              96.4%
            </div>
            <p className="text-xs text-slate-500 mt-0.5">EVA 1, EVA 2, EVA 3 opérationnelles</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Gauge className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* DASHBOARD PANNE : GRAPHIQUE RENDEMENT MACHINE PAR JOUR (TOTAL PAIRES / HEURES) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              <span>Dashboard Rendement Machine par Jour (Total Paires / Heures)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Comparaison de productivité horaire entre EVA 1, EVA 2 et EVA 3
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
            Unité : Paires injectées / Heure de marche
          </span>
        </div>

        <div className="h-72 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="date" tick={{ fill: '#64748B', fontSize: 12 }} />
              <YAxis tick={{ fill: '#64748B', fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  borderRadius: '12px',
                  border: 'none',
                  fontSize: '12px',
                }}
                formatter={(value: any) => [`${value} paires/h`, 'Rendement']}
              />
              <Legend />
              <Bar dataKey="EVA_1" name="EVA 1 (Rotative)" fill="#2563EB" radius={[6, 6, 0, 0]} />
              <Bar dataKey="EVA_2" name="EVA 2 (Bicolore)" fill="#10B981" radius={[6, 6, 0, 0]} />
              <Bar dataKey="EVA_3" name="EVA 3 (Cadence)" fill="#F59E0B" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* FORMULAIRE DE SAISIE MAINTENANCE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">
              Saisie Maintenance & Relevé Compteur
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-medium">1 = 1 Paire</span>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Machine */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
                <Gauge className="w-4 h-4 text-slate-400" />
                Machine
              </label>
              <select
                value={machine}
                onChange={(e) => setMachine(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="EVA 1">EVA 1</option>
                <option value="EVA 2">EVA 2</option>
                <option value="EVA 3">EVA 3</option>
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-slate-400" />
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Compteur Début */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Compteur Début
              </label>
              <input
                type="number"
                value={compteurDebut}
                onChange={(e) => setCompteurDebut(Number(e.target.value))}
                min={0}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Compteur Fin */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Compteur Fin
              </label>
              <input
                type="number"
                value={compteurFin}
                onChange={(e) => setCompteurFin(Number(e.target.value))}
                min={0}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* KPI Total = Fin - Début */}
          <div className="bg-slate-900 text-white p-4 rounded-xl flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs uppercase text-slate-400 font-semibold block">
                Total Paires (Fin - Début)
              </span>
              <span className="text-2xl font-black text-amber-400">
                {totalPaires.toLocaleString('fr-FR')} paires
              </span>
            </div>

            <div>
              <span className="text-xs uppercase text-slate-400 font-semibold block">
                Heures de Marche Effectives
              </span>
              <input
                type="number"
                step="0.1"
                min="0.5"
                max="24"
                value={heuresMarche}
                onChange={(e) => setHeuresMarche(Number(e.target.value))}
                className="w-24 px-2 py-1 bg-slate-800 text-white text-sm font-bold rounded-lg border border-slate-700 outline-none"
              />
            </div>

            <div>
              <span className="text-xs uppercase text-slate-400 font-semibold block">
                Rendement Instantané
              </span>
              <span className="text-2xl font-black text-emerald-400">
                {calculatedRendement} p/h
              </span>
            </div>
          </div>

          {/* Panne Oui/Non, Durée Arrêt, Photo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 pt-2 border-t border-slate-100">
            {/* Panne Oui/Non */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Panne / Arrêt Constaté ?
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPanne('non')}
                  className={`py-2 text-sm font-bold rounded-xl border transition-all ${
                    panne === 'non'
                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Non (RAS)
                </button>
                <button
                  type="button"
                  onClick={() => setPanne('oui')}
                  className={`py-2 text-sm font-bold rounded-xl border transition-all ${
                    panne === 'oui'
                      ? 'bg-rose-600 border-rose-600 text-white shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Oui (Panne)
                </button>
              </div>
            </div>

            {/* Durée Arrêt */}
            {panne === 'oui' && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-rose-600 mb-1.5">
                  Durée d'Arrêt (Heures)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={dureeArret}
                  onChange={(e) => setDureeArret(Number(e.target.value))}
                  required
                  placeholder="Ex : 1.2 (pour 1h12)"
                  className="w-full px-3.5 py-2.5 bg-rose-50 border border-rose-300 rounded-xl text-sm font-bold text-rose-900 focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>
            )}

            {/* Cause de la panne */}
            {panne === 'oui' && (
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-rose-600 mb-1.5">
                  Cause & Description de l'Arrêt
                </label>
                <input
                  type="text"
                  value={causePanne}
                  onChange={(e) => setCausePanne(e.target.value)}
                  placeholder="Ex : Échauffement buse, rupture courroie, blocage convoyeur..."
                  required
                  className="w-full px-3.5 py-2.5 bg-rose-50 border border-rose-300 rounded-xl text-sm text-rose-900 focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>
            )}

            {/* Technicien */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-slate-400" />
                Technicien
              </label>
              <input
                type="text"
                value={technicien}
                onChange={(e) => setTechnicien(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Photo Compteur */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-slate-400" />
                Photo Compteur (Justificatif Atelier)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {photoCompteur && (
                  <button
                    type="button"
                    onClick={() => setViewPhotoUrl(photoCompteur)}
                    className="flex items-center gap-1 text-xs font-bold text-blue-600 underline"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Voir photo</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-blue-500/20 flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              <span>Enregistrer le Relevé Maintenance</span>
            </button>
          </div>
        </form>
      </div>

      {/* SECTION SELECTOR TABS & ACTION BUTTONS */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('releves')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'releves'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Gauge className="w-4 h-4" />
            <span>Relevés Compteurs EVA ({ctpMaintenance.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('tickets')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'tickets'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>Ordres de Travail & Pannes ({maintenanceTickets.length})</span>
          </button>
        </div>

        <button
          onClick={() => restoreDefaultErpData()}
          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
          title="Restaurer et synchroniser les fiches de base Maintenance CTP"
        >
          <RotateCcw className="w-4 h-4 text-slate-500" />
          <span>Synchro Fiches Maintenance</span>
        </button>
      </div>

      {activeTab === 'releves' ? (
        /* TABLEAU HISTORIQUE DES RELEVÉS */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Historique des Relevés & Interventions Machines</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Total des paires calculé automatiquement : Fin - Début ({filteredReleves.length} affiché(s) sur {ctpMaintenance.length})
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher machine, technicien..."
                  value={searchReleves}
                  onChange={(e) => setSearchReleves(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:border-blue-500 outline-none w-52"
                />
              </div>

              {/* Filter Machine */}
              <select
                value={filterMachineReleves}
                onChange={(e) => setFilterMachineReleves(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:bg-white focus:border-blue-500 outline-none"
              >
                <option value="all">Toutes machines</option>
                <option value="EVA 1">EVA 1</option>
                <option value="EVA 2">EVA 2</option>
                <option value="EVA 3">EVA 3</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Machine</th>
                  <th className="py-3 px-4 font-mono text-right">Compteur Début</th>
                  <th className="py-3 px-4 font-mono text-right">Compteur Fin</th>
                  <th className="py-3 px-4 text-right">Total (Fin - Début)</th>
                  <th className="py-3 px-4 text-center">Panne ?</th>
                  <th className="py-3 px-4 text-center">Arrêt (H)</th>
                  <th className="py-3 px-4 text-right">Rendement (P/H)</th>
                  <th className="py-3 px-4">Technicien</th>
                  <th className="py-3 px-4 text-center">Photo</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {filteredReleves.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-8 text-center text-slate-400">
                      Aucun relevé trouvé pour les critères sélectionnés.
                    </td>
                  </tr>
                ) : (
                  filteredReleves.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-medium text-slate-900 whitespace-nowrap">{m.date}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-800 whitespace-nowrap">
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-xs border border-slate-200">
                          {m.machine}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-xs text-slate-600">
                        {m.compteur_debut.toLocaleString('fr-FR')}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-xs text-slate-600">
                        {m.compteur_fin.toLocaleString('fr-FR')}
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-slate-900">
                        {m.total.toLocaleString('fr-FR')} p.
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {m.panne === 'oui' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Panne</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700">
                            Non (RAS)
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center text-xs font-bold text-rose-600">
                        {m.duree_arret > 0 ? `${m.duree_arret} h` : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-blue-700">
                        {m.rendement_paires_heure || Math.round(m.total / 7.5)} p/h
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600 font-medium">{m.technicien}</td>
                      <td className="py-3.5 px-4 text-center">
                        {m.photo_compteur ? (
                          <button
                            onClick={() => setViewPhotoUrl(m.photo_compteur!)}
                            className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                            title="Agrandir la photo du compteur"
                          >
                            <ImageIcon className="w-4 h-4 inline" />
                          </button>
                        ) : (
                          <span className="text-slate-300 text-xs">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => {
                            if (window.confirm(`Supprimer le relevé de ${m.machine} du ${m.date} ?`)) {
                              deleteCtpMaintenanceRecord(m.id);
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          title="Supprimer ce relevé"
                        >
                          <Trash2 className="w-4 h-4 inline" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* TABLEAU ORDRES DE TRAVAIL & FICHES PANNES */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-blue-600" />
                Fiches d'Intervention & Ordres de Travail (GMAO)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Suivi des pannes, diagnostics, réparations et clôtures ({filteredTickets.length} affiché(s) sur {maintenanceTickets.length})
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher ticket, machine..."
                  value={searchTickets}
                  onChange={(e) => setSearchTickets(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:border-blue-500 outline-none w-52"
                />
              </div>

              {/* Status filter */}
              <select
                value={filterTicketStatus}
                onChange={(e) => setFilterTicketStatus(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:bg-white focus:border-blue-500 outline-none"
              >
                <option value="all">Tous les statuts</option>
                <option value="ouvert">Ouvert</option>
                <option value="en_cours">En cours</option>
                <option value="resolu">Résolu</option>
              </select>

              {/* Priority filter */}
              <select
                value={filterTicketPriority}
                onChange={(e) => setFilterTicketPriority(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:bg-white focus:border-blue-500 outline-none"
              >
                <option value="all">Toutes priorités</option>
                <option value="critique">Critique</option>
                <option value="haute">Haute</option>
                <option value="moyenne">Moyenne</option>
                <option value="basse">Basse</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Réf. Ticket</th>
                  <th className="py-3 px-4">Date / Heure</th>
                  <th className="py-3 px-4">Machine</th>
                  <th className="py-3 px-4">Problème / Panne</th>
                  <th className="py-3 px-4">Priorité</th>
                  <th className="py-3 px-4">Assigné à</th>
                  <th className="py-3 px-4 text-center">Statut</th>
                  <th className="py-3 px-4 text-right">Coût</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {filteredTickets.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      Aucune fiche d'intervention trouvée.
                    </td>
                  </tr>
                ) : (
                  filteredTickets.map((tk) => (
                    <tr key={tk.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-xs text-blue-700">{tk.id}</td>
                      <td className="py-3 px-4 text-xs text-slate-600 whitespace-nowrap">
                        {tk.reportedDate} <span className="text-slate-400">{tk.reportedTime}</span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 uppercase">{tk.machineId}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 text-xs">{tk.title}</div>
                        <div className="text-[11px] text-slate-500 max-w-xs truncate">{tk.description}</div>
                        {tk.technicianReport && (
                          <div className="mt-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            Rapport : {tk.technicianReport}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                          tk.priority === 'critique'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : tk.priority === 'haute'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          {tk.priority}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs font-medium text-slate-700">{tk.assignedTo || 'Non assigné'}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          tk.status === 'resolu'
                            ? 'bg-emerald-100 text-emerald-800'
                            : tk.status === 'en_cours'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {tk.status === 'resolu' ? 'Résolu' : tk.status === 'en_cours' ? 'En cours' : 'Ouvert'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs font-bold text-slate-800">
                        {((tk.partsCost || 0) + (tk.laborCost || 0)).toLocaleString('fr-FR')} TND
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {tk.status !== 'resolu' && (
                            <button
                              onClick={() => {
                                setResolvingTicketId(tk.id);
                                setResolutionMinutes(45);
                                setPartsCost(0);
                                setLaborCost(60);
                                setTechnicianReport('Remplacement joint et test cycle complet OK.');
                              }}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold flex items-center gap-1 transition-colors"
                              title="Résoudre et clôturer l'intervention"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Clôturer</span>
                            </button>
                          )}
                          <button
                            onClick={() => {
                              if (window.confirm(`Supprimer l'ordre de travail #${tk.id} ?`)) {
                                deleteMaintenanceTicket(tk.id);
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            title="Supprimer ce ticket"
                          >
                            <Trash2 className="w-4 h-4 inline" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL CLOTURE ORDRE DE TRAVAIL */}
      {resolvingTicketId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Clôturer l'Intervention #{resolvingTicketId}</span>
              </div>
              <button
                onClick={() => setResolvingTicketId(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Durée de l'intervention (minutes)
                </label>
                <input
                  type="number"
                  value={resolutionMinutes}
                  onChange={(e) => setResolutionMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Pièces (TND)
                  </label>
                  <input
                    type="number"
                    value={partsCost}
                    onChange={(e) => setPartsCost(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Main d'œuvre (TND)
                  </label>
                  <input
                    type="number"
                    value={laborCost}
                    onChange={(e) => setLaborCost(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Compte-rendu technique
                </label>
                <textarea
                  rows={3}
                  value={technicianReport}
                  onChange={(e) => setTechnicianReport(e.target.value)}
                  placeholder="Actions réalisées, causes identifiées, pièces remplacées..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800"
                />
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => setResolvingTicketId(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  resolveMaintenanceTicket(
                    resolvingTicketId,
                    technicianReport,
                    resolutionMinutes,
                    partsCost,
                    laborCost
                  );
                  setResolvingTicketId(null);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Valider la clôture</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PHOTO PREVIEW MODAL */}
      {viewPhotoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <Camera className="w-4 h-4 text-blue-600" />
                <span>Justificatif Photo Compteur</span>
              </div>
              <button
                onClick={() => setViewPhotoUrl(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 bg-slate-950 flex items-center justify-center">
              <img
                src={viewPhotoUrl}
                alt="Compteur Machine EVA"
                className="max-h-96 w-auto object-contain rounded-lg"
              />
            </div>
            <div className="p-4 bg-slate-50 flex justify-end">
              <button
                onClick={() => setViewPhotoUrl(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
