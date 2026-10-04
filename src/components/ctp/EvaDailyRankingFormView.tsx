import React, { useState, useMemo, useEffect } from 'react';
import {
  Award,
  Trophy,
  Medal,
  Calendar,
  Layers,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ShieldCheck,
  ShieldAlert,
  BarChart3,
  TrendingUp,
  FileSpreadsheet,
  Users,
  Sparkles,
  Crown,
  ChevronRight,
  Info,
  Edit3,
  Trash2,
  Check,
  Percent,
} from 'lucide-react';
import {
  EvaMachineCode,
  ShiftTeam,
  EvaDailyProductionRecord,
} from '../../types/evaPilotageLogic';
import {
  EVA_MACHINES_LIST,
  calculateTeamScore,
  analyzeMachineDailyRecord,
  analyzeFactoryDailyRecords,
  INITIAL_EVA_DAILY_RECORDS,
} from '../../utils/evaPilotageEngine';
import { useApp } from '../../context/AppContext';

interface EvaDailyRankingFormViewProps {
  initialMachine?: EvaMachineCode;
  onRecordSaved?: (record: EvaDailyProductionRecord) => void;
}

export const EvaDailyRankingFormView: React.FC<EvaDailyRankingFormViewProps> = ({
  initialMachine = 'EVA 1',
  onRecordSaved,
}) => {
  const { currentUser, logAudit } = useApp();

  // Liste des enregistrements quotidiens stockés localement
  const [records, setRecords] = useState<EvaDailyProductionRecord[]>(() => {
    const stored = localStorage.getItem('ctp_eva_daily_production_forms_v1');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('Erreur de lecture du stockage des fiches quotidiennes', e);
      }
    }
    return INITIAL_EVA_DAILY_RECORDS;
  });

  // Sauvegarde automatique
  useEffect(() => {
    localStorage.setItem('ctp_eva_daily_production_forms_v1', JSON.stringify(records));
  }, [records]);

  // État du formulaire
  const [formDate, setFormDate] = useState<string>('2026-09-20');
  const [formMachine, setFormMachine] = useState<EvaMachineCode>(initialMachine);

  // Valeurs par équipe
  const [equipeA_Paires, setEquipeA_Paires] = useState<number | string>(600);
  const [equipeA_Defauts, setEquipeA_Defauts] = useState<number | string>(20);

  const [equipeB_Paires, setEquipeB_Paires] = useState<number | string>(620);
  const [equipeB_Defauts, setEquipeB_Defauts] = useState<number | string>(30);

  const [equipeC_Paires, setEquipeC_Paires] = useState<number | string>(580);
  const [equipeC_Defauts, setEquipeC_Defauts] = useState<number | string>(15);

  // Valeurs de qualité globale machine
  const [rebut, setRebut] = useState<number | string>(80);
  const [deuxiemeChoix, setDeuxiemeChoix] = useState<number | string>(90);
  const [note, setNote] = useState<string>('Cadence régulière, excellent score Equipe C');

  // Messages de retour
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Synchronisation lors du changement de Date ou Machine
  const loadMatchingRecord = (targetDate: string, targetMachine: EvaMachineCode) => {
    const match = records.find((r) => r.date === targetDate && r.machine === targetMachine);
    if (match) {
      setEquipeA_Paires(match.equipes['Équipe A']?.paires ?? 0);
      setEquipeA_Defauts(match.equipes['Équipe A']?.defauts ?? 0);

      setEquipeB_Paires(match.equipes['Équipe B']?.paires ?? 0);
      setEquipeB_Defauts(match.equipes['Équipe B']?.defauts ?? 0);

      setEquipeC_Paires(match.equipes['Équipe C']?.paires ?? 0);
      setEquipeC_Defauts(match.equipes['Équipe C']?.defauts ?? 0);

      setRebut(match.rebut ?? 0);
      setDeuxiemeChoix(match.deuxiemeChoix ?? 0);
      setNote(match.note || '');
    } else {
      // Valeurs par défaut propres prêtes pour nouvelle saisie
      setEquipeA_Paires(0);
      setEquipeA_Defauts(0);
      setEquipeB_Paires(0);
      setEquipeB_Defauts(0);
      setEquipeC_Paires(0);
      setEquipeC_Defauts(0);
      setRebut(0);
      setDeuxiemeChoix(0);
      setNote('');
    }
  };

  const handleMachineChange = (m: EvaMachineCode) => {
    setFormMachine(m);
    loadMatchingRecord(formDate, m);
  };

  const handleDateChange = (d: string) => {
    setFormDate(d);
    loadMatchingRecord(d, formMachine);
  };

  // Calculs instantanés du formulaire en cours de saisie
  const liveTotalPaires = useMemo(() => {
    return Number(equipeA_Paires || 0) + Number(equipeB_Paires || 0) + Number(equipeC_Paires || 0);
  }, [equipeA_Paires, equipeB_Paires, equipeC_Paires]);

  const liveScoreA = useMemo(() => {
    return calculateTeamScore(Number(equipeA_Paires || 0), Number(equipeA_Defauts || 0));
  }, [equipeA_Paires, equipeA_Defauts]);

  const liveScoreB = useMemo(() => {
    return calculateTeamScore(Number(equipeB_Paires || 0), Number(equipeB_Defauts || 0));
  }, [equipeB_Paires, equipeB_Defauts]);

  const liveScoreC = useMemo(() => {
    return calculateTeamScore(Number(equipeC_Paires || 0), Number(equipeC_Defauts || 0));
  }, [equipeC_Paires, equipeC_Defauts]);

  const liveTauxNonConformite = useMemo(() => {
    const total = liveTotalPaires;
    const reb = Number(rebut || 0);
    const dChoix = Number(deuxiemeChoix || 0);
    if (total <= 0) return 0;
    return Number((((reb + dChoix) / total) * 100).toFixed(2));
  }, [liveTotalPaires, rebut, deuxiemeChoix]);

  // Analyse complète de l'usine pour la date sélectionnée
  const factoryAnalysis = useMemo(() => {
    return analyzeFactoryDailyRecords(records, formDate);
  }, [records, formDate]);

  // Enregistrement de la fiche
  const handleSaveForm = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const newRecordId = `rec-${formMachine.replace(' ', '').toLowerCase()}-${formDate}`;
    const newRecord: EvaDailyProductionRecord = {
      id: newRecordId,
      date: formDate,
      machine: formMachine,
      equipes: {
        'Équipe A': {
          paires: Number(equipeA_Paires || 0),
          defauts: Number(equipeA_Defauts || 0),
        },
        'Équipe B': {
          paires: Number(equipeB_Paires || 0),
          defauts: Number(equipeB_Defauts || 0),
        },
        'Équipe C': {
          paires: Number(equipeC_Paires || 0),
          defauts: Number(equipeC_Defauts || 0),
        },
      },
      totalPaires: liveTotalPaires,
      rebut: Number(rebut || 0),
      deuxiemeChoix: Number(deuxiemeChoix || 0),
      tauxNonConformitePct: liveTauxNonConformite,
      note: note.trim() || undefined,
      updatedAt: new Date().toISOString(),
      enregistrePar: currentUser?.name || 'Responsable Atelier EVA',
    };

    setRecords((prev) => {
      const filtered = prev.filter((r) => !(r.date === formDate && r.machine === formMachine));
      return [newRecord, ...filtered];
    });

    logAudit(
      'SAISIE_JOURNALIERE_EVA',
      `Production & Qualité ${formMachine}`,
      `Enregistrement du ${formDate} : ${liveTotalPaires} paires, Rebut: ${rebut}, 2ème: ${deuxiemeChoix}`,
      { date: formDate, machine: formMachine, totalPaires: liveTotalPaires }
    );

    if (onRecordSaved) {
      onRecordSaved(newRecord);
    }

    setSuccessBanner(
      `✓ تم حفظ بيانات الإنتاج والعيوب لآلة ${formMachine} لتاريخ ${formDate} بنجاح، وتحديث الترتيب التلقائي للفرق والمصنع!`
    );

    setTimeout(() => {
      setSuccessBanner(null);
    }, 4500);
  };

  // Recharger l'exemple réel du 20/09/2026
  const handleLoadSample20Sept = () => {
    setRecords(INITIAL_EVA_DAILY_RECORDS);
    setFormDate('2026-09-20');
    setFormMachine('EVA 1');
    const match = INITIAL_EVA_DAILY_RECORDS.find((r) => r.machine === 'EVA 1');
    if (match) {
      setEquipeA_Paires(match.equipes['Équipe A'].paires);
      setEquipeA_Defauts(match.equipes['Équipe A'].defauts);
      setEquipeB_Paires(match.equipes['Équipe B'].paires);
      setEquipeB_Defauts(match.equipes['Équipe B'].defauts);
      setEquipeC_Paires(match.equipes['Équipe C'].paires);
      setEquipeC_Defauts(match.equipes['Équipe C'].defauts);
      setRebut(match.rebut);
      setDeuxiemeChoix(match.deuxiemeChoix);
      setNote(match.note || '');
    }
    setSuccessBanner('✓ تم تحميل بيانات النموذج المرجعي ليوم 20/09/2026 لكافة الآلات (EVA 1..4)!');
    setTimeout(() => setSuccessBanner(null), 3500);
  };

  // Analyse de la machine actuellement sélectionnée dans le formulaire
  const currentMachineRecord = useMemo(() => {
    return records.find((r) => r.date === formDate && r.machine === formMachine);
  }, [records, formDate, formMachine]);

  const currentMachineAnalysis = useMemo(() => {
    if (currentMachineRecord) {
      return analyzeMachineDailyRecord(currentMachineRecord);
    }
    // Simulation à partir des champs en cours de saisie
    const simulatedRecord: EvaDailyProductionRecord = {
      id: 'preview',
      date: formDate,
      machine: formMachine,
      equipes: {
        'Équipe A': { paires: Number(equipeA_Paires || 0), defauts: Number(equipeA_Defauts || 0) },
        'Équipe B': { paires: Number(equipeB_Paires || 0), defauts: Number(equipeB_Defauts || 0) },
        'Équipe C': { paires: Number(equipeC_Paires || 0), defauts: Number(equipeC_Defauts || 0) },
      },
      totalPaires: liveTotalPaires,
      rebut: Number(rebut || 0),
      deuxiemeChoix: Number(deuxiemeChoix || 0),
      tauxNonConformitePct: liveTauxNonConformite,
      updatedAt: new Date().toISOString(),
    };
    return analyzeMachineDailyRecord(simulatedRecord);
  }, [currentMachineRecord, formDate, formMachine, equipeA_Paires, equipeA_Defauts, equipeB_Paires, equipeB_Defauts, equipeC_Paires, equipeC_Defauts, liveTotalPaires, rebut, deuxiemeChoix, liveTauxNonConformite]);

  return (
    <div className="space-y-6">
      {/* BANNIÈRE DE SUCCÈS */}
      {successBanner && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex items-center justify-between gap-3 text-sm font-bold shadow-xs animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successBanner}</span>
          </div>
          <button
            onClick={() => setSuccessBanner(null)}
            className="text-xs px-2.5 py-1 rounded bg-emerald-200 hover:bg-emerald-300 text-emerald-900 transition-colors"
          >
            Fermer
          </button>
        </div>
      )}

      {/* EN-TÊTE DU MODULE DE SAISIE & CLASSEMENT */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 shadow-md border border-indigo-900/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-amber-500 text-slate-950">
                CTP SMART • Formulaire &amp; Classement
              </span>
              <span className="text-xs text-indigo-200">Règles Industrielles CTP</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <Trophy className="w-6 h-6 text-amber-400" />
              <span>استمارة التسجيل والترتيب اليومي (EVA 1 à EVA 4)</span>
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              تسجيل بيانات الإنتاج بالوردية، والعيوب، والتالف (Scrap) والصنف الثاني لكل آلة. يتم احتساب النقاط والترتيب
              بشكل فوري: <code className="bg-white/10 px-1.5 py-0.5 rounded font-mono text-amber-300">Score = Paires - (Défauts × 10)</code>.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleLoadSample20Sept}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all flex items-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4 text-amber-400" />
              <span>نموذج 20/09/2026 (Exemple)</span>
            </button>

            <button
              onClick={() => {
                setFormDate(new Date().toISOString().slice(0, 10));
                loadMatchingRecord(new Date().toISOString().slice(0, 10), formMachine);
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Calendar className="w-4 h-4" />
              <span>اليوم (Aujourd'hui)</span>
            </button>
          </div>
        </div>

        {/* Formule de calcul en rappel clair */}
        <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
          <div className="bg-white/5 rounded-xl p-2.5 border border-white/10 flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-lg bg-amber-400 text-slate-900 font-bold flex items-center justify-center shrink-0">1</span>
            <div>
              <strong className="text-white block">Score Global de l'Équipe</strong>
              <span className="text-slate-300 font-mono text-[10px]">Paires - (Défauts × 10)</span>
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-2.5 border border-white/10 flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-lg bg-blue-400 text-slate-900 font-bold flex items-center justify-center shrink-0">2</span>
            <div>
              <strong className="text-white block">Qualité Machine</strong>
              <span className="text-slate-300 font-mono text-[10px]">(Rebut + 2ème) / Total Paires</span>
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-2.5 border border-white/10 flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-lg bg-emerald-400 text-slate-900 font-bold flex items-center justify-center shrink-0">3</span>
            <div>
              <strong className="text-white block">Classement Usine (Palmarès)</strong>
              <span className="text-slate-300 font-mono text-[10px]">Toutes machines &amp; 12 équipes</span>
            </div>
          </div>
        </div>
      </div>

      {/* 1. FORMULAIRE DE SAISIE PRINCIPAL */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
          <div>
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-indigo-600" />
              <span>1. استمارة التسجيل اليومي / Formulaire de Saisie Quotidienne</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              اختر التاريخ والآلة ثم أدخل إنتاج كل وردية وعيوبها لحساب الترتيب تلقائياً.
            </p>
          </div>

          {currentMachineRecord && (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Enregistrement existant chargé ({currentMachineRecord.totalPaires} p.)</span>
            </span>
          )}
        </div>

        <form onSubmit={handleSaveForm} className="space-y-6">
          {/* Sélection Date et Machine */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            {/* Date */}
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <span>Date de Production / تاريخ الإنتاج</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none shadow-xs"
                />
                <button
                  type="button"
                  onClick={() => handleDateChange('2026-09-20')}
                  className="px-3 py-2.5 rounded-xl text-xs font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 shrink-0"
                >
                  20/09/2026
                </button>
              </div>
            </div>

            {/* Machine */}
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase mb-1.5 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>Machine EVA / اختيار الآلة (1 seul choix)</span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {EVA_MACHINES_LIST.map((m) => {
                  const isSelected = formMachine === m;
                  const hasRecord = records.some((r) => r.date === formDate && r.machine === m);
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleMachineChange(m)}
                      className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex flex-col items-center justify-center gap-0.5 border ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm ring-2 ring-indigo-300'
                          : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-300'
                      }`}
                    >
                      <span>{m}</span>
                      {hasRecord && (
                        <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-amber-400' : 'bg-emerald-500'}`} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Saisie des 3 Équipes : A, B, C */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-black text-slate-800 uppercase flex items-center gap-1.5">
                <Users className="w-4 h-4 text-indigo-600" />
                <span>Production &amp; Défauts par Équipe (Postes A, B, C)</span>
              </label>
              <span className="text-[11px] text-slate-500 font-medium">
                Paires produites et défauts constatés
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* ÉQUIPE A */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3 relative hover:border-slate-300 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-blue-600 text-white text-xs font-black flex items-center justify-center">
                      A
                    </span>
                    <strong className="text-sm font-black text-slate-900">ÉQUIPE A (Matin)</strong>
                  </div>
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                    Score: {liveScoreA}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Paires Produites
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={equipeA_Paires}
                      onChange={(e) => setEquipeA_Paires(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="ex: 600"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Défauts
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={equipeA_Defauts}
                      onChange={(e) => setEquipeA_Defauts(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-mono font-bold text-rose-600 focus:ring-2 focus:ring-rose-500 outline-none"
                      placeholder="ex: 20"
                      required
                    />
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 flex justify-between pt-1 border-t border-slate-200">
                  <span>Score Formule :</span>
                  <span className="font-mono">{equipeA_Paires || 0} - ({equipeA_Defauts || 0} × 10)</span>
                </div>
              </div>

              {/* ÉQUIPE B */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3 relative hover:border-slate-300 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white text-xs font-black flex items-center justify-center">
                      B
                    </span>
                    <strong className="text-sm font-black text-slate-900">ÉQUIPE B (Soir)</strong>
                  </div>
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                    Score: {liveScoreB}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Paires Produites
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={equipeB_Paires}
                      onChange={(e) => setEquipeB_Paires(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="ex: 620"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Défauts
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={equipeB_Defauts}
                      onChange={(e) => setEquipeB_Defauts(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-mono font-bold text-rose-600 focus:ring-2 focus:ring-rose-500 outline-none"
                      placeholder="ex: 30"
                      required
                    />
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 flex justify-between pt-1 border-t border-slate-200">
                  <span>Score Formule :</span>
                  <span className="font-mono">{equipeB_Paires || 0} - ({equipeB_Defauts || 0} × 10)</span>
                </div>
              </div>

              {/* ÉQUIPE C */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3 relative hover:border-slate-300 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-purple-600 text-white text-xs font-black flex items-center justify-center">
                      C
                    </span>
                    <strong className="text-sm font-black text-slate-900">ÉQUIPE C (Nuit)</strong>
                  </div>
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                    Score: {liveScoreC}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Paires Produites
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={equipeC_Paires}
                      onChange={(e) => setEquipeC_Paires(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-purple-500 outline-none"
                      placeholder="ex: 580"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Défauts
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={equipeC_Defauts}
                      onChange={(e) => setEquipeC_Defauts(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-mono font-bold text-rose-600 focus:ring-2 focus:ring-rose-500 outline-none"
                      placeholder="ex: 15"
                      required
                    />
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 flex justify-between pt-1 border-t border-slate-200">
                  <span>Score Formule :</span>
                  <span className="font-mono">{equipeC_Paires || 0} - ({equipeC_Defauts || 0} × 10)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Saisie Qualité Machine : Rebut & 2ème Choix */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                <span>Rebut Total (Scrap)</span>
              </label>
              <input
                type="number"
                min={0}
                value={rebut}
                onChange={(e) => setRebut(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-mono font-bold text-rose-600 focus:ring-2 focus:ring-rose-500 outline-none"
                placeholder="ex: 80"
                required
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Paires détruites / non valorisables</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                <span>2ème Choix (Déclassé)</span>
              </label>
              <input
                type="number"
                min={0}
                value={deuxiemeChoix}
                onChange={(e) => setDeuxiemeChoix(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-mono font-bold text-amber-600 focus:ring-2 focus:ring-amber-500 outline-none"
                placeholder="ex: 90"
                required
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Paires vendues avec décote</span>
            </div>

            {/* Total Paires Calculé Automatiquement */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-indigo-500" />
                <span>Total Paires (A+B+C)</span>
              </label>
              <div className="w-full px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-xl text-base font-black text-indigo-900 font-mono flex items-center justify-between">
                <span>{liveTotalPaires.toLocaleString('fr-FR')}</span>
                <span className="text-[10px] font-bold text-indigo-600">Calcul auto</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Somme des 3 équipes</span>
            </div>

            {/* Taux de Non-conformité calculé */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center gap-1">
                <Percent className="w-3.5 h-3.5 text-orange-500" />
                <span>Non-Conformité %</span>
              </label>
              <div
                className={`w-full px-3 py-2 rounded-xl text-base font-black font-mono flex items-center justify-between border ${
                  liveTauxNonConformite > 10
                    ? 'bg-rose-50 border-rose-200 text-rose-700'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                }`}
              >
                <span>{liveTauxNonConformite}%</span>
                <span className="text-[10px] font-bold">(Rebut+2ème)/Total</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Indicateur qualité machine</span>
            </div>
          </div>

          {/* Notes et observations */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Observations / Notes de poste (Optionnel)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="ex: Cadence régulière, bon rendement matière, alerte bavures équipe B..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          {/* Boutons d'action */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Info className="w-4 h-4 text-slate-400 shrink-0" />
              <span>
                يتم تحديث الترتيب وحساب إحصائيات كافة الآلات والمصنع بمجرد الضغط على الحفظ.
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => loadMatchingRecord(formDate, formMachine)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all flex items-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Réinitialiser</span>
              </button>

              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <Save className="w-4 h-4" />
                <span>Enregistrer &amp; Calculer le Classement (حفظ وترتيب)</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* 2. RÉSULTATS & CLASSEMENT DE LA MACHINE SÉLECTIONNÉE (EVA 1..4) */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
          <div>
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Medal className="w-5 h-5 text-amber-500" />
              <span>2. ترتيب فرق الآلة المحددة : {formMachine} — ({formDate})</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              ترتيب الورديات (1er, 2ème, 3ème) حسب النقاط الإجمالية، وتحديد أفضل إنتاج وأفضل جودة.
            </p>
          </div>

          <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            Total Machine : <strong className="text-indigo-600">{currentMachineAnalysis.totalPaires}</strong> paires
          </span>
        </div>

        {/* 3 Cartes de Récompenses Spécifiques à la Machine */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Meilleure Production Machine */}
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block">
                MEILLEURE PRODUCTION (MAX)
              </span>
              <strong className="text-sm font-black text-slate-900">
                {currentMachineAnalysis.meilleureProduction.equipe}
              </strong>
              <div className="text-xs text-emerald-700 font-mono font-bold mt-0.5">
                {currentMachineAnalysis.meilleureProduction.paires} paires produites
              </div>
            </div>
          </div>

          {/* Meilleure Qualité Machine */}
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-800 block">
                MEILLEURE QUALITÉ (MIN DÉFAUTS)
              </span>
              <strong className="text-sm font-black text-slate-900">
                {currentMachineAnalysis.meilleureQualite.equipe}
              </strong>
              <div className="text-xs text-blue-700 font-mono font-bold mt-0.5">
                {currentMachineAnalysis.meilleureQualite.defauts} défauts seulement
              </div>
            </div>
          </div>

          {/* Meilleur Score Global Machine */}
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-xs">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block">
                SCORE GLOBAL (CHAMPION)
              </span>
              <strong className="text-sm font-black text-slate-900">
                {currentMachineAnalysis.meilleurScoreGlobal.equipe}
              </strong>
              <div className="text-xs text-amber-800 font-mono font-bold mt-0.5">
                Score : {currentMachineAnalysis.meilleurScoreGlobal.score} pts
              </div>
            </div>
          </div>
        </div>

        {/* Tableau du Classement de la Machine */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/80 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Rang / الترتيب</th>
                <th className="py-3 px-4">Équipe / الوردية</th>
                <th className="py-3 px-4 text-center">Paires Produites</th>
                <th className="py-3 px-4 text-center">Défauts</th>
                <th className="py-3 px-4 text-center">Formule</th>
                <th className="py-3 px-4 text-right">Score Global</th>
                <th className="py-3 px-4 text-center">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentMachineAnalysis.equipesRanked.map((item, idx) => {
                const isLeader = idx === 0;
                return (
                  <tr
                    key={item.equipe}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isLeader ? 'bg-amber-50/40 font-bold' : ''
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {idx === 0 && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-black bg-amber-400 text-slate-950 flex items-center gap-1 shadow-2xs">
                            <Trophy className="w-3 h-3" />
                            <span>1er</span>
                          </span>
                        )}
                        {idx === 1 && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-black bg-slate-300 text-slate-800">
                            2ème
                          </span>
                        )}
                        {idx === 2 && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-black bg-amber-800/20 text-amber-900 border border-amber-800/30">
                            3ème
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4 font-black text-slate-900">
                      {item.equipe}
                    </td>

                    <td className="py-3 px-4 text-center font-mono font-bold text-slate-800">
                      {item.paires.toLocaleString('fr-FR')} p.
                    </td>

                    <td className="py-3 px-4 text-center font-mono font-bold text-rose-600">
                      {item.defauts} d.
                    </td>

                    <td className="py-3 px-4 text-center font-mono text-[11px] text-slate-400">
                      {item.paires} - ({item.defauts} × 10)
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-black text-sm">
                      <span
                        className={`px-2 py-1 rounded-lg ${
                          isLeader
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {item.scoreGlobal} pts
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      {isLeader ? (
                        <span className="text-[10px] font-black uppercase text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                          Vainqueur Machine
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Suiveur</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. COMPARAISON ENTRE TOUTES LES MACHINES (INTER-MACHINES POUR LA DATE) */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
          <div>
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              <span>3. المقارنة بين كافة الآلات (Toutes les Machines pour le {formDate})</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              مقارنة شاملة بين EVA 1, EVA 2, EVA 3, EVA 4 لتحديد أفضل آلة إنتاجاً وأفضل آلة جودةً وأسوأ آلة.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600">
              Total Usine : <strong className="text-slate-900">{factoryAnalysis.totalPairesUsine.toLocaleString('fr-FR')}</strong> paires
            </span>
          </div>
        </div>

        {/* 3 Cartes Trophées Machines */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Meilleure Machine Production */}
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block">
                MEILLEURE MACHINE PROD (MAX)
              </span>
              <strong className="text-base font-black text-slate-900">
                {factoryAnalysis.meilleureMachineProd?.machine || 'En attente'}
              </strong>
              <div className="text-xs text-emerald-700 font-mono font-bold mt-0.5">
                {factoryAnalysis.meilleureMachineProd?.totalPaires.toLocaleString('fr-FR')} paires au total
              </div>
            </div>
          </div>

          {/* Meilleure Machine Qualité */}
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-800 block">
                MEILLEURE MACHINE QUALITÉ (MIN)
              </span>
              <strong className="text-base font-black text-slate-900">
                {factoryAnalysis.meilleureMachineQualite?.machine || 'En attente'}
              </strong>
              <div className="text-xs text-blue-700 font-mono font-bold mt-0.5">
                Taux Rebut+2ème : {factoryAnalysis.meilleureMachineQualite?.tauxNonConformitePct}%
              </div>
            </div>
          </div>

          {/* Pire Machine */}
          <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-800 block">
                PIRE MACHINE (MIN PROD)
              </span>
              <strong className="text-base font-black text-slate-900">
                {factoryAnalysis.pireMachine?.machine || 'En attente'}
              </strong>
              <div className="text-xs text-rose-700 font-mono font-bold mt-0.5">
                {factoryAnalysis.pireMachine?.totalPaires.toLocaleString('fr-FR')} paires seulement
              </div>
            </div>
          </div>
        </div>

        {/* Tableau récapitulatif des 4 Machines */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/80 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Machine</th>
                <th className="py-3 px-4 text-center">Éq. A (p./d.)</th>
                <th className="py-3 px-4 text-center">Éq. B (p./d.)</th>
                <th className="py-3 px-4 text-center">Éq. C (p./d.)</th>
                <th className="py-3 px-4 text-center">Total Paires</th>
                <th className="py-3 px-4 text-center">Rebut</th>
                <th className="py-3 px-4 text-center">2ème Choix</th>
                <th className="py-3 px-4 text-center">Non-Conformité</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {EVA_MACHINES_LIST.map((mach) => {
                const rec = records.find((r) => r.date === formDate && r.machine === mach);
                const isSelected = formMachine === mach;

                if (!rec) {
                  return (
                    <tr key={mach} className="hover:bg-slate-50/80 text-slate-400">
                      <td className="py-3 px-4 font-bold text-slate-700">{mach}</td>
                      <td colSpan={7} className="py-3 px-4 text-center italic text-slate-400">
                        Aucune saisie enregistrée pour le {formDate}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleMachineChange(mach)}
                          className="px-2.5 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px]"
                        >
                          Saisir
                        </button>
                      </td>
                    </tr>
                  );
                }

                const analysis = analyzeMachineDailyRecord(rec);
                const isBestProd = factoryAnalysis.meilleureMachineProd?.machine === mach;
                const isBestQual = factoryAnalysis.meilleureMachineQualite?.machine === mach;

                return (
                  <tr
                    key={mach}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isSelected ? 'bg-indigo-50/40' : ''
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <strong className="text-slate-900">{mach}</strong>
                        {isBestProd && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Top Prod
                          </span>
                        )}
                        {isBestQual && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-blue-100 text-blue-800 border border-blue-300">
                            Top Qualité
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center font-mono text-slate-700">
                      {rec.equipes['Équipe A']?.paires} / <span className="text-rose-600 font-bold">{rec.equipes['Équipe A']?.defauts}</span>
                    </td>

                    <td className="py-3 px-4 text-center font-mono text-slate-700">
                      {rec.equipes['Équipe B']?.paires} / <span className="text-rose-600 font-bold">{rec.equipes['Équipe B']?.defauts}</span>
                    </td>

                    <td className="py-3 px-4 text-center font-mono text-slate-700">
                      {rec.equipes['Équipe C']?.paires} / <span className="text-rose-600 font-bold">{rec.equipes['Équipe C']?.defauts}</span>
                    </td>

                    <td className="py-3 px-4 text-center font-mono font-black text-slate-900 text-sm">
                      {analysis.totalPaires.toLocaleString('fr-FR')} p.
                    </td>

                    <td className="py-3 px-4 text-center font-mono font-bold text-rose-600">
                      {analysis.rebut}
                    </td>

                    <td className="py-3 px-4 text-center font-mono font-bold text-amber-600">
                      {analysis.deuxiemeChoix}
                    </td>

                    <td className="py-3 px-4 text-center font-mono font-bold">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] ${
                          analysis.tauxNonConformitePct > 10
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {analysis.tauxNonConformitePct}%
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleMachineChange(mach)}
                        className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px]"
                      >
                        Éditer
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. PALMARÈS GÉNÉRAL DE TOUTES LES ÉQUIPES DE L'USINE (12 ÉQUIPES) */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
          <div>
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-500" />
              <span>4. الترتيب العام الشامل لكافة فرق المصنع (Toutes Équipes Usine)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              ترتيب شرفي يرتب كل فرق المصنع (9 أو 12 فريقاً) حسب النقاط الشاملة، مع إبراز أفضل وأسوأ أداء.
            </p>
          </div>

          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>{factoryAnalysis.classementGeneralUsine.length} équipes en compétition</span>
          </span>
        </div>

        {/* 3 Cartes Spéciales Usine */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Meilleure Équipe Usine Production */}
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block">
                MEILLEURE ÉQUIPE USINE PROD (MAX)
              </span>
              <strong className="text-sm font-black text-slate-900">
                {factoryAnalysis.meilleureEquipeUsineProd
                  ? `${factoryAnalysis.meilleureEquipeUsineProd.equipe} (${factoryAnalysis.meilleureEquipeUsineProd.machine})`
                  : 'En attente'}
              </strong>
              <div className="text-xs text-emerald-700 font-mono font-bold mt-0.5">
                {factoryAnalysis.meilleureEquipeUsineProd?.paires} paires produites (Record Usine)
              </div>
            </div>
          </div>

          {/* Meilleure Équipe Usine Qualité */}
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-800 block">
                MEILLEURE ÉQUIPE USINE QUALITÉ (MIN)
              </span>
              <strong className="text-sm font-black text-slate-900">
                {factoryAnalysis.meilleureEquipeUsineQualite
                  ? `${factoryAnalysis.meilleureEquipeUsineQualite.equipe} (${factoryAnalysis.meilleureEquipeUsineQualite.machine})`
                  : 'En attente'}
              </strong>
              <div className="text-xs text-blue-700 font-mono font-bold mt-0.5">
                {factoryAnalysis.meilleureEquipeUsineQualite?.defauts} défauts seulement (Moins de scrap)
              </div>
            </div>
          </div>

          {/* Pire Équipe Usine */}
          <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-800 block">
                PIRE ÉQUIPE USINE (MAX DÉFAUTS)
              </span>
              <strong className="text-sm font-black text-slate-900">
                {factoryAnalysis.pireEquipeUsine
                  ? `${factoryAnalysis.pireEquipeUsine.equipe} (${factoryAnalysis.pireEquipeUsine.machine})`
                  : 'En attente'}
              </strong>
              <div className="text-xs text-rose-700 font-mono font-bold mt-0.5">
                {factoryAnalysis.pireEquipeUsine?.defauts} défauts constatés (Plan d'action requis)
              </div>
            </div>
          </div>
        </div>

        {/* Grand Tableau du Classement Usine */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/80 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Rang Usine</th>
                <th className="py-3 px-4">Équipe</th>
                <th className="py-3 px-4">Machine</th>
                <th className="py-3 px-4 text-center">Paires</th>
                <th className="py-3 px-4 text-center">Défauts</th>
                <th className="py-3 px-4 text-center">Calcul du Score</th>
                <th className="py-3 px-4 text-right">Score Global</th>
                <th className="py-3 px-4 text-center">Distinction</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {factoryAnalysis.classementGeneralUsine.map((t, idx) => {
                const isFirst = idx === 0;
                const isSecond = idx === 1;
                const isThird = idx === 2;
                const isWorst = idx === factoryAnalysis.classementGeneralUsine.length - 1;

                return (
                  <tr
                    key={`${t.machine}-${t.equipe}`}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isFirst ? 'bg-amber-50/50 font-bold' : ''
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {isFirst && (
                          <span className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 font-black flex items-center justify-center text-[11px] shadow-2xs">
                            1
                          </span>
                        )}
                        {isSecond && (
                          <span className="w-6 h-6 rounded-full bg-slate-300 text-slate-800 font-black flex items-center justify-center text-[11px]">
                            2
                          </span>
                        )}
                        {isThird && (
                          <span className="w-6 h-6 rounded-full bg-amber-700/20 text-amber-900 border border-amber-700/40 font-black flex items-center justify-center text-[11px]">
                            3
                          </span>
                        )}
                        {!isFirst && !isSecond && !isThird && (
                          <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-[11px]">
                            {idx + 1}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4 font-black text-slate-900">
                      {t.equipe}
                    </td>

                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {t.machine}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center font-mono font-bold text-slate-800">
                      {t.paires.toLocaleString('fr-FR')} p.
                    </td>

                    <td className="py-3 px-4 text-center font-mono font-bold text-rose-600">
                      {t.defauts} d.
                    </td>

                    <td className="py-3 px-4 text-center font-mono text-[11px] text-slate-400">
                      {t.paires} - ({t.defauts} × 10)
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-black text-sm">
                      <span
                        className={`px-2 py-1 rounded-lg ${
                          isFirst
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {t.scoreGlobal} pts
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      {isFirst && (
                        <span className="text-[10px] font-black uppercase text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                          🏆 Major Usine
                        </span>
                      )}
                      {t.paires === factoryAnalysis.meilleureEquipeUsineProd?.paires && !isFirst && (
                        <span className="text-[10px] font-bold uppercase text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                          Top Prod
                        </span>
                      )}
                      {t.defauts === factoryAnalysis.meilleureEquipeUsineQualite?.defauts && !isFirst && (
                        <span className="text-[10px] font-bold uppercase text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full border border-blue-300">
                          Top Qualité
                        </span>
                      )}
                      {isWorst && (
                        <span className="text-[10px] font-bold uppercase text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-300">
                          À Surveiller
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. HISTORIQUE DES ENREGISTREMENTS STOCKÉS */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-slate-600" />
              <span>السجل التاريخي للبيانات المخزنة / Historique des Saisies ({records.length})</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              قائمة البطاقات المسجلة في الذاكرة الدائمة لنظام CTP SMART مع إمكانية إعادة التعديل.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Machine</th>
                <th className="py-2.5 px-3 text-center">Total Paires</th>
                <th className="py-2.5 px-3 text-center">Rebut</th>
                <th className="py-2.5 px-3 text-center">2ème Choix</th>
                <th className="py-2.5 px-3 text-center">Non-Conf. %</th>
                <th className="py-2.5 px-3">Observations</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/80">
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{r.date}</td>
                  <td className="py-2.5 px-3 font-bold text-indigo-700">{r.machine}</td>
                  <td className="py-2.5 px-3 text-center font-mono font-black">{r.totalPaires} p.</td>
                  <td className="py-2.5 px-3 text-center font-mono text-rose-600 font-bold">{r.rebut}</td>
                  <td className="py-2.5 px-3 text-center font-mono text-amber-600 font-bold">{r.deuxiemeChoix}</td>
                  <td className="py-2.5 px-3 text-center font-mono">
                    <span className="px-2 py-0.5 rounded bg-slate-100 font-bold text-[10px]">
                      {r.tauxNonConformitePct}%
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-500 max-w-xs truncate">{r.note || '-'}</td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={() => {
                        setFormDate(r.date);
                        handleMachineChange(r.machine);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px]"
                    >
                      Charger
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
