import React, { useState, useMemo, useEffect } from 'react';
import {
  Factory,
  Sliders,
  Play,
  Pause,
  AlertTriangle,
  CheckCircle2,
  Package,
  Boxes,
  Clock,
  Flame,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  BarChart3,
  Calendar,
  Layers,
  Save,
  RefreshCw,
  Zap,
  Info,
  ChevronRight,
  Filter,
  Plus,
  Trash2,
  FileSpreadsheet,
  Users,
  Search,
  Award,
  Trophy,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { EvaDailyRankingFormView } from './EvaDailyRankingFormView';
import {
  EvaMachineCode,
  EvaStationRecord,
  EvaStationStatus,
  MoldPairsConfig,
  ShiftTeam,
  EvaArretRecord,
  EvaQualityCheck,
  EvaAuditLogEntry,
} from '../../types/evaPilotageLogic';
import {
  EVA_MACHINES_LIST,
  STATION_STATUS_CONFIG,
  createDefault12StationsConfig,
  recalculateStation,
  calculateEvaMachineSession,
  applyFastEntryToStations,
  INITIAL_EVA_ARRETS,
  INITIAL_EVA_QUALITY_CHECKS,
} from '../../utils/evaPilotageEngine';

export const EvaMachinePilotageView: React.FC = () => {
  const {
    currentUser,
    logAudit,
    auditLogs: globalAuditLogs,
    addProductionEntry,
    addCtpProductionEntry,
    cartonPackagingList,
    shoeColors,
    t,
  } = useApp();

  // Machine sélectionnée parmi EVA 1, EVA 2, EVA 3, EVA 4
  const [selectedMachine, setSelectedMachine] = useState<EvaMachineCode>('EVA 1');

  // Sous-onglets du module Pilotage Industriel
  const [activeSubTab, setActiveSubTab] = useState<
    'saisie_classement' | 'stations' | 'fast_entry' | 'arrets' | 'quality_trace' | 'direction_dashboard' | 'audit_log'
  >('saisie_classement');

  // Paramètres de session de travail
  const [date, setDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [heure, setHeure] = useState<string>(
    new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  );
  const [equipe, setEquipe] = useState<ShiftTeam>('Équipe A');
  const [operateur, setOperateur] = useState<string>(currentUser?.name || 'Opérateur EVA Principal');
  const [objectifPaires, setObjectifPaires] = useState<number>(1800);
  const [poidsMoyenPaire, setPoidsMoyenPaire] = useState<number>(280); // grammes

  // État des 12 stations pour chaque machine (stocké dans localStorage)
  const [allMachinesStations, setAllMachinesStations] = useState<Record<EvaMachineCode, EvaStationRecord[]>>(() => {
    const defaultConfigs: Record<EvaMachineCode, EvaStationRecord[]> = {
      'EVA 1': createDefault12StationsConfig('EVA 1'),
      'EVA 2': createDefault12StationsConfig('EVA 2'),
      'EVA 3': createDefault12StationsConfig('EVA 3'),
      'EVA 4': createDefault12StationsConfig('EVA 4'),
    };
    const stored = localStorage.getItem('ctp_eva_12_stations_v1');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return {
          ...defaultConfigs,
          ...parsed,
        };
      } catch (e) {
        console.error('Error loading 12 stations from localStorage', e);
      }
    }
    return defaultConfigs;
  });

  // Sauvegarde automatique localStorage
  useEffect(() => {
    localStorage.setItem('ctp_eva_12_stations_v1', JSON.stringify(allMachinesStations));
  }, [allMachinesStations]);

  // Arrêts enregistrés
  const [arrets, setArrets] = useState<EvaArretRecord[]>(() => {
    const stored = localStorage.getItem('ctp_eva_arrets_v1');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_EVA_ARRETS;
  });

  useEffect(() => {
    localStorage.setItem('ctp_eva_arrets_v1', JSON.stringify(arrets));
  }, [arrets]);

  // Contrôles qualité
  const [qualityChecks, setQualityChecks] = useState<EvaQualityCheck[]>(() => {
    const stored = localStorage.getItem('ctp_eva_qc_v1');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_EVA_QUALITY_CHECKS;
  });

  // Audit Logs internes du module
  const [auditLogs, setAuditLogs] = useState<EvaAuditLogEntry[]>(() => {
    const stored = localStorage.getItem('ctp_eva_audit_v1');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error(e);
      }
    }
    return [
      {
        id: 'aud-01',
        date: new Date().toISOString().substring(0, 10),
        heure: '08:00',
        utilisateur: 'Admin Système',
        machineCode: 'EVA 1',
        action: 'INITIALISATION_SESSION',
        champModifie: 'Toutes les stations',
        ancienneValeur: 'Session précédente',
        nouvelleValeur: 'Session Ouverte Équipe A',
        details: 'Initialisation des 12 stations EVA 1 pour le poste matin.',
      },
    ];
  });

  const [auditFilterSource, setAuditFilterSource] = useState<'eva' | 'global'>('eva');
  const [auditSearchQuery, setAuditSearchQuery] = useState<string>('');

  useEffect(() => {
    localStorage.setItem('ctp_eva_audit_v1', JSON.stringify(auditLogs));
  }, [auditLogs]);

  // Enregistre une modification dans l'audit log
  const recordAudit = (
    action: string,
    champ: string,
    oldVal: any,
    newVal: any,
    details: string,
    stationNum?: number
  ) => {
    const newEntry: EvaAuditLogEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      date: new Date().toISOString().substring(0, 10),
      heure: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      utilisateur: currentUser?.name || 'Opérateur',
      machineCode: selectedMachine,
      action,
      stationNumber: stationNum,
      champModifie: champ,
      ancienneValeur: oldVal,
      nouvelleValeur: newVal,
      details,
    };
    setAuditLogs((prev) => [newEntry, ...prev]);

    // Envoi également vers le système d'audit global CTP SMART
    logAudit(
      action,
      `EVA 12 STATIONS (${selectedMachine})`,
      `${champ} : ${oldVal} → ${newVal} (${details})`,
      { oldValue: oldVal, newValue: newVal, targetName: selectedMachine }
    );
  };

  // Stations de la machine active
  const currentStations = allMachinesStations[selectedMachine] || [];

  // Synthèse calculée automatique de la machine active
  const sessionKpis = useMemo(() => {
    return calculateEvaMachineSession(selectedMachine, currentStations, {
      equipe,
      operateur,
      objectifPaires,
      poidsMoyenGrammes: poidsMoyenPaire,
      date,
      heure,
    });
  }, [selectedMachine, currentStations, equipe, operateur, objectifPaires, poidsMoyenPaire, date, heure]);

  // Synthèse globale multi-machines pour le bandeau supérieur
  const multiMachineSummary = useMemo(() => {
    return EVA_MACHINES_LIST.map((m) => {
      const sts = allMachinesStations[m] || [];
      return calculateEvaMachineSession(m, sts);
    });
  }, [allMachinesStations]);

  // Handler : Changement de statut d'une station
  const handleStatusChange = (stationNumber: number, newStatus: EvaStationStatus) => {
    const oldSt = currentStations.find((s) => s.stationNumber === stationNumber);
    if (!oldSt) return;

    recordAudit(
      'CHANGEMENT_STATUT_STATION',
      `Station ${stationNumber} Statut`,
      oldSt.status,
      newStatus,
      `Bascule statut de ${oldSt.status} à ${newStatus}`,
      stationNumber
    );

    setAllMachinesStations((prev) => {
      const updatedList = (prev[selectedMachine] || []).map((s) => {
        if (s.stationNumber === stationNumber) {
          const updated = {
            ...s,
            status: newStatus,
          };
          return recalculateStation(updated);
        }
        return s;
      });
      return { ...prev, [selectedMachine]: updatedList };
    });
  };

  // Handler : Mise à jour des valeurs d'une station
  const handleStationFieldChange = (
    stationNumber: number,
    field: keyof EvaStationRecord,
    value: any
  ) => {
    const oldSt = currentStations.find((s) => s.stationNumber === stationNumber);
    if (!oldSt) return;

    const oldVal = (oldSt as any)[field];
    if (oldVal !== value) {
      recordAudit(
        'MODIFICATION_VALEUR_STATION',
        `Station ${stationNumber} - ${String(field)}`,
        oldVal,
        value,
        `Modification de ${field}`,
        stationNumber
      );
    }

    setAllMachinesStations((prev) => {
      const updatedList = (prev[selectedMachine] || []).map((s) => {
        if (s.stationNumber === stationNumber) {
          const updated = {
            ...s,
            [field]: value,
          };
          return recalculateStation(updated);
        }
        return s;
      });
      return { ...prev, [selectedMachine]: updatedList };
    });
  };

  // Handler : Mode Production Rapide (Saisie Express / 1-Clic)
  const [fastCompteurDebut, setFastCompteurDebut] = useState<number>(sessionKpis.compteurGlobalDebut || 20000);
  const [fastCompteurFin, setFastCompteurFin] = useState<number>(
    (sessionKpis.compteurGlobalDebut || 20000) + 120
  );
  const [fastRebutGlobal, setFastRebutGlobal] = useState<number>(4);
  const [fastSuccessMsg, setFastSuccessMsg] = useState<string | null>(null);

  const handleApplyFastEntry = () => {
    const updated = applyFastEntryToStations(
      currentStations,
      Number(fastCompteurDebut),
      Number(fastCompteurFin),
      Number(fastRebutGlobal)
    );

    recordAudit(
      'APPLICATION_PRODUCTION_RAPIDE',
      'Compteurs & Rebut Globaux',
      `Debut: ${fastCompteurDebut}, Fin: ${fastCompteurFin}`,
      `Delta: ${fastCompteurFin - fastCompteurDebut} cycles, Rebut: ${fastRebutGlobal}`,
      `Distribution automatique sur les ${sessionKpis.totalStationsActives} stations actives de ${selectedMachine}`
    );

    setAllMachinesStations((prev) => ({
      ...prev,
      [selectedMachine]: updated,
    }));

    setFastSuccessMsg(
      `Succès : ${fastCompteurFin - fastCompteurDebut} cycles distribués sur ${sessionKpis.totalStationsActives} stations actives (${sessionKpis.productionBruteTotale} paires brutes calculées).`
    );
    setTimeout(() => setFastSuccessMsg(null), 4500);
  };

  // Handler : Enregistrement de la session dans le Journal CTP & Cartons
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const handleSaveToJournalAndCartons = () => {
    if (sessionKpis.productionNetteTotale <= 0) {
      alert('Aucune production nette calculée à enregistrer. Veuillez vérifier les compteurs des stations actives.');
      return;
    }

    // Création d'une entrée de production consolidée pour le journal CTP SMART
    addProductionEntry({
      tenantId: 'tenant-1',
      date: sessionKpis.date,
      time: sessionKpis.heure,
      shift: sessionKpis.equipe === 'Équipe A' ? 'matin' : sessionKpis.equipe === 'Équipe B' ? 'soir' : 'nuit',
      groupName: sessionKpis.equipe,
      machineId: selectedMachine === 'EVA 1' ? 'mach-eva-1' : selectedMachine === 'EVA 2' ? 'mach-eva-2' : 'mach-eva-3',
      machineCode: selectedMachine,
      platformNumber: 1,
      operatorId: currentUser?.id || 'op-eva',
      operatorName: sessionKpis.operateur,
      material: 'EVA',
      rawMaterialType: 'EVA',
      modelName: 'Production Multi-Stations EVA',
      moldId: `${sessionKpis.totalStationsActives} stations actives`,
      moldsUsed: currentStations.filter((s) => s.status === 'ACTIVE').map((s) => s.referenceMoule),
      isBicolor: currentStations.some((s) => s.status === 'ACTIVE' && s.isBicolor),
      counterStart: sessionKpis.compteurGlobalDebut,
      counterEnd: sessionKpis.compteurGlobalFin,
      cycles: sessionKpis.cyclesMachine,
      qtyProduced: sessionKpis.productionBruteTotale,
      qtyConforming: sessionKpis.productionNetteTotale,
      qtyRejected: sessionKpis.rebutTotal,
      targetPairs: sessionKpis.objectifPaires,
      variancePairs: sessionKpis.productionNetteTotale - sessionKpis.objectifPaires,
      scrapRatePct: sessionKpis.tauxRebutPct,
      conformanceRatePct: sessionKpis.tauxConformitePct,
      materialConsumedKg: sessionKpis.matiereConsommeeKg,
      bags25kgConsumed: sessionKpis.sacs25kgConsommes,
      downtimeMinutes: sessionKpis.tempsArretTotalMinutes,
      workflowStage: 'cartons',
      packagingCartonsCount: sessionKpis.totalCartonsPleins,
      completeCartons: sessionKpis.totalCartonsPleins,
      remainderPairs: sessionKpis.totalPairesOuvertes,
      observations: `Session Pilotage Industriel 12 Stations [${sessionKpis.totalStationsActives}/12 Actives, ${sessionKpis.totalStationsArretees} Arrêtées, ${sessionKpis.totalStationsVides} Vides, ${sessionKpis.totalStationsMaintenance} Maintenance]. Capacité engagée: ${sessionKpis.capaciteEngageePairesParCycle} p/cycle.`,
      verifiedByChef: true,
    });

    // Synchronisation automatique avec la table centrale des Cartons et le Journal CTP
    const activeProducedStations = currentStations.filter((s) => s.status === 'ACTIVE' && s.pairesNettes > 0);
    const modelSizeMap: Record<string, { modele: string; pointure: string; paires: number; debut: number; fin: number }> = {};
    activeProducedStations.forEach((s) => {
      const key = `${s.modele}-${s.pointure}`;
      if (!modelSizeMap[key]) {
        modelSizeMap[key] = {
          modele: s.modele,
          pointure: s.pointure,
          paires: 0,
          debut: s.compteurDebut,
          fin: s.compteurFin,
        };
      }
      modelSizeMap[key].paires += s.pairesNettes;
      modelSizeMap[key].debut = Math.min(modelSizeMap[key].debut, s.compteurDebut);
      modelSizeMap[key].fin = Math.max(modelSizeMap[key].fin, s.compteurFin);
    });

    const shiftCode = sessionKpis.equipe === 'Équipe A' ? 'A' : sessionKpis.equipe === 'Équipe B' ? 'B' : 'C';
    Object.values(modelSizeMap).forEach((item) => {
      addCtpProductionEntry({
        date: sessionKpis.date,
        machine: selectedMachine,
        equipe: shiftCode,
        modele: item.modele,
        pointure: item.pointure,
        compteur_debut: item.debut,
        compteur_fin: item.fin,
        paires: item.paires,
        observations: `Saisie 12 Stations [${selectedMachine}] - Équipe ${shiftCode}. Stations actives: ${sessionKpis.totalStationsActives}/12.`,
      });
    });

    recordAudit(
      'ENREGISTREMENT_SESSION_JOURNAL',
      'Journal CTP & Stock',
      'Session en cours',
      `Journal mis à jour (+${sessionKpis.productionNetteTotale} paires)`,
      `Session enregistrée avec succès. ${sessionKpis.totalCartonsPleins} cartons pleins générés.`
    );

    setSaveSuccessMsg(
      `Session validée et enregistrée dans le Journal CTP & Conditionnement ! (${sessionKpis.productionNetteTotale} paires nettes, ${sessionKpis.totalCartonsPleins} cartons scellés).`
    );
    setTimeout(() => setSaveSuccessMsg(null), 5000);
  };

  // Formulaire d'ajout d'arrêt machine
  const [newArretStation, setNewArretStation] = useState<number | 'Toutes'>('Toutes');
  const [newArretDuree, setNewArretDuree] = useState<number>(30);
  const [newArretCause, setNewArretCause] = useState<EvaArretRecord['cause']>('Mécanique');
  const [newArretResponsable, setNewArretResponsable] = useState<string>('Mécanicien Ligne');
  const [newArretDesc, setNewArretDesc] = useState<string>('');

  const handleAddArret = (e: React.FormEvent) => {
    e.preventDefault();
    const created: EvaArretRecord = {
      id: `arr-${Date.now()}`,
      machineCode: selectedMachine,
      stationNumber: newArretStation,
      date: new Date().toISOString().substring(0, 10),
      heureDebut: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      dureeMinutes: Number(newArretDuree),
      cause: newArretCause,
      responsable: newArretResponsable,
      description: newArretDesc || `Arrêt pour ${newArretCause}`,
      resolu: false,
    };
    setArrets([created, ...arrets]);

    recordAudit(
      'DECLARATION_ARRET',
      `Arrêt ${selectedMachine}`,
      '-',
      `${newArretDuree} min (${newArretCause})`,
      `Déclaration d'arrêt : ${created.description}`
    );

    setNewArretDesc('');
  };

  // Filtre directionnel (Dashboard Direction)
  const [directionTimeRange, setDirectionTimeRange] = useState<'jour' | '7j' | '30j'>('7j');

  // Données analytiques consolidées pour le Dashboard Direction (Comparatif Jour / 7 Jours / 30 Jours)
  const directionDashboardData = useMemo(() => {
    const baseProduction = multiMachineSummary.reduce((sum, m) => sum + m.productionNetteTotale, 0) || 5210;
    const baseRebut = multiMachineSummary.reduce((sum, m) => sum + m.rebutTotal, 0) || 85;
    const baseArretMin = multiMachineSummary.reduce((sum, m) => sum + m.tempsArretTotalMinutes, 0) || 65;

    if (directionTimeRange === 'jour') {
      return {
        labelPeriode: "Aujourd'hui (Journée en cours)",
        productionNette: baseProduction,
        objectifPaires: 5400,
        atteintePct: Number(((baseProduction / 5400) * 100).toFixed(1)),
        compProduction: { delta: '+3.2%', positive: true, label: 'vs Hier (J-1)' },
        tauxConformite: 98.4,
        compConformite: { delta: '+0.3%', positive: true, label: 'vs J-1' },
        rendementMatiere: 97.8,
        compRendement: { delta: '+0.5%', positive: true, label: 'vs J-1' },
        rebutPaires: baseRebut,
        tauxRebut: Number(((baseRebut / (baseProduction + baseRebut)) * 100).toFixed(2)) || 1.6,
        compRebut: { delta: '-0.3%', positive: true, label: 'vs J-1' },
        coutRebutEstimeDA: baseRebut * 420,
        tempsArretMinutes: baseArretMin,
        disponibilitePct: 94.8,
        compArrets: { delta: '-15 min', positive: true, label: 'vs J-1' },
        cadencePairesHeure: 285,
        teams: [
          {
            nom: 'ÉQUIPE A (Matin)',
            chef: 'Mohamed K.',
            horaire: '06h00 - 14h00',
            productionNette: 1840,
            conformite: 98.8,
            rendement: 98.2,
            rebutTaux: 1.2,
            rebutPaires: 22,
            arretMin: 15,
            badge: 'Trophée Cadence & Qualité',
            badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
            isLeader: true,
          },
          {
            nom: 'ÉQUIPE B (Soir)',
            chef: 'Karim B.',
            horaire: '14h00 - 22h00',
            productionNette: 1720,
            conformite: 98.1,
            rendement: 97.5,
            rebutTaux: 1.9,
            rebutPaires: 33,
            arretMin: 25,
            badge: 'Cadence Régulière',
            badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
            isLeader: false,
          },
          {
            nom: 'ÉQUIPE C (Nuit)',
            chef: 'Yacine M.',
            horaire: '22h00 - 06h00',
            productionNette: 1650,
            conformite: 98.3,
            rendement: 97.1,
            rebutTaux: 1.7,
            rebutPaires: 30,
            arretMin: 25,
            badge: 'Fermeture & Conditionnement',
            badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
            isLeader: false,
          },
        ],
        machines: [
          {
            code: 'EVA 1',
            nom: 'Machine EVA 1 (Standard)',
            stationsActives: 10,
            production: 1760,
            rendement: 98.0,
            rebutTaux: 1.4,
            disponibilite: 95.2,
          },
          {
            code: 'EVA 2',
            nom: 'Machine EVA 2 (Bicolor)',
            stationsActives: 9,
            production: 1610,
            rendement: 97.4,
            rebutTaux: 1.9,
            disponibilite: 93.8,
          },
          {
            code: 'EVA 3',
            nom: 'Machine EVA 3 (Haute cadence)',
            stationsActives: 11,
            production: 1840,
            rendement: 98.1,
            rebutTaux: 1.5,
            disponibilite: 95.5,
          },
        ],
        trendPoints: [
          { label: '06h-08h', paires: 640, rebut: 8, target: 600 },
          { label: '08h-10h', paires: 720, rebut: 11, target: 650 },
          { label: '10h-12h', paires: 680, rebut: 9, target: 650 },
          { label: '12h-14h', paires: 710, rebut: 12, target: 650 },
          { label: '14h-16h', paires: 620, rebut: 14, target: 650 },
          { label: '16h-18h', paires: 660, rebut: 10, target: 650 },
          { label: '18h-20h', paires: 690, rebut: 11, target: 650 },
          { label: '20h-22h', paires: 490, rebut: 10, target: 500 },
        ],
      };
    }

    if (directionTimeRange === '7j') {
      return {
        labelPeriode: '7 Derniers Jours (Semaine S-38)',
        productionNette: 36470,
        objectifPaires: 37800,
        atteintePct: 96.5,
        compProduction: { delta: '+5.4%', positive: true, label: 'vs Semaine précédente' },
        tauxConformite: 98.3,
        compConformite: { delta: '+0.5%', positive: true, label: 'vs S-1' },
        rendementMatiere: 97.9,
        compRendement: { delta: '+0.8%', positive: true, label: 'vs S-1' },
        rebutPaires: 620,
        tauxRebut: 1.7,
        compRebut: { delta: '-0.5%', positive: true, label: 'vs S-1 (baisse du scrap)' },
        coutRebutEstimeDA: 620 * 420,
        tempsArretMinutes: 385,
        disponibilitePct: 95.4,
        compArrets: { delta: '-70 min', positive: true, label: 'vs S-1 (gain productif)' },
        cadencePairesHeure: 288,
        teams: [
          {
            nom: 'ÉQUIPE A (Matin)',
            chef: 'Mohamed K.',
            horaire: 'Poste Matin',
            productionNette: 12880,
            conformite: 98.6,
            rendement: 98.3,
            rebutTaux: 1.4,
            rebutPaires: 180,
            arretMin: 95,
            badge: 'Trophée Qualité & Volume',
            badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
            isLeader: true,
          },
          {
            nom: 'ÉQUIPE B (Soir)',
            chef: 'Karim B.',
            horaire: 'Poste Soir',
            productionNette: 12040,
            conformite: 98.1,
            rendement: 97.7,
            rebutTaux: 1.9,
            rebutPaires: 230,
            arretMin: 135,
            badge: 'Cadence Régulière',
            badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
            isLeader: false,
          },
          {
            nom: 'ÉQUIPE C (Nuit)',
            chef: 'Yacine M.',
            horaire: 'Poste Nuit & Clôture',
            productionNette: 11550,
            conformite: 98.2,
            rendement: 97.5,
            rebutTaux: 1.8,
            rebutPaires: 210,
            arretMin: 155,
            badge: 'Zéro Défaut Clôture',
            badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
            isLeader: false,
          },
        ],
        machines: [
          {
            code: 'EVA 1',
            nom: 'Machine EVA 1 (Standard)',
            stationsActives: 10,
            production: 12320,
            rendement: 98.1,
            rebutTaux: 1.5,
            disponibilite: 95.8,
          },
          {
            code: 'EVA 2',
            nom: 'Machine EVA 2 (Bicolor)',
            stationsActives: 9,
            production: 11270,
            rendement: 97.5,
            rebutTaux: 1.9,
            disponibilite: 94.2,
          },
          {
            code: 'EVA 3',
            nom: 'Machine EVA 3 (Haute cadence)',
            stationsActives: 11,
            production: 12880,
            rendement: 98.2,
            rebutTaux: 1.6,
            disponibilite: 96.1,
          },
        ],
        trendPoints: [
          { label: 'Lun', paires: 5120, rebut: 88, target: 5400 },
          { label: 'Mar', paires: 5240, rebut: 82, target: 5400 },
          { label: 'Mer', paires: 5310, rebut: 79, target: 5400 },
          { label: 'Jeu', paires: 5180, rebut: 95, target: 5400 },
          { label: 'Ven', paires: 5410, rebut: 75, target: 5400 },
          { label: 'Sam', paires: 5090, rebut: 105, target: 5400 },
          { label: 'Dim', paires: 5120, rebut: 96, target: 5400 },
        ],
      };
    }

    // 30 Jours
    return {
      labelPeriode: '30 Derniers Jours (Bilan Mensuel)',
      productionNette: 156300,
      objectifPaires: 162000,
      atteintePct: 96.5,
      compProduction: { delta: '+8.2%', positive: true, label: 'vs Mois précédent (M-1)' },
      tauxConformite: 98.2,
      compConformite: { delta: '+0.9%', positive: true, label: 'vs M-1' },
      rendementMatiere: 97.7,
      compRendement: { delta: '+1.1%', positive: true, label: 'vs M-1 (gain matière)' },
      rebutPaires: 2810,
      tauxRebut: 1.8,
      compRebut: { delta: '-0.9%', positive: true, label: 'vs M-1' },
      coutRebutEstimeDA: 2810 * 420,
      tempsArretMinutes: 1620,
      disponibilitePct: 95.5,
      compArrets: { delta: '-310 min', positive: true, label: 'vs M-1 (amélioration TPM)' },
      cadencePairesHeure: 286,
      teams: [
        {
          nom: 'ÉQUIPE A (Matin)',
          chef: 'Mohamed K.',
          horaire: 'Poste Matin',
          productionNette: 55200,
          conformite: 98.5,
          rendement: 98.2,
          rebutTaux: 1.5,
          rebutPaires: 820,
          arretMin: 410,
          badge: 'N°1 Mensuel Global',
          badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          isLeader: true,
        },
        {
          nom: 'ÉQUIPE B (Soir)',
          chef: 'Karim B.',
          horaire: 'Poste Soir',
          productionNette: 51600,
          conformite: 98.0,
          rendement: 97.6,
          rebutTaux: 1.9,
          rebutPaires: 990,
          arretMin: 580,
          badge: 'Constance Opérationnelle',
          badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
          isLeader: false,
        },
        {
          nom: 'ÉQUIPE C (Nuit)',
          chef: 'Yacine M.',
          horaire: 'Poste Nuit & Clôture',
          productionNette: 49500,
          conformite: 98.1,
          rendement: 97.3,
          rebutTaux: 1.9,
          rebutPaires: 1000,
          arretMin: 630,
          badge: 'Excellence Clôture Stock',
          badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
          isLeader: false,
        },
      ],
      machines: [
        {
          code: 'EVA 1',
          nom: 'Machine EVA 1 (Standard)',
          stationsActives: 10,
          production: 52800,
          rendement: 98.0,
          rebutTaux: 1.6,
          disponibilite: 95.7,
        },
        {
          code: 'EVA 2',
          nom: 'Machine EVA 2 (Bicolor)',
          stationsActives: 9,
          production: 48300,
          rendement: 97.4,
          rebutTaux: 2.0,
          disponibilite: 94.5,
        },
        {
          code: 'EVA 3',
          nom: 'Machine EVA 3 (Haute cadence)',
          stationsActives: 11,
          production: 55200,
          rendement: 98.1,
          rebutTaux: 1.7,
          disponibilite: 96.2,
        },
      ],
      trendPoints: [
        { label: 'Semaine 1', paires: 38200, rebut: 720, target: 40500 },
        { label: 'Semaine 2', paires: 39100, rebut: 690, target: 40500 },
        { label: 'Semaine 3', paires: 39900, rebut: 680, target: 40500 },
        { label: 'Semaine 4', paires: 39100, rebut: 720, target: 40500 },
      ],
    };
  }, [directionTimeRange, multiMachineSummary]);

  // Synthèse par modèle de la machine active
  const productionByModel = useMemo(() => {
    const map: Record<string, { model: string; pairs: number; scrap: number; cartons: number }> = {};
    currentStations
      .filter((s) => s.status === 'ACTIVE' && s.modele)
      .forEach((s) => {
        const key = `${s.modele} ${s.designation}`;
        if (!map[key]) {
          map[key] = { model: key, pairs: 0, scrap: 0, cartons: 0 };
        }
        map[key].pairs += s.pairesNettes;
        map[key].scrap += s.rebutPaires;
        map[key].cartons += s.cartonsPleins;
      });
    return Object.values(map);
  }, [currentStations]);

  return (
    <div className="space-y-6">
      {/* 1. BANDEAU DE TITRE & SÉLECTEUR DE MACHINE EVA (EVA 1 / EVA 2 / EVA 3) */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-indigo-600 text-white tracking-wide uppercase shadow-xs">
                Système de Pilotage Industriel
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                12 Stations Indépendantes • Pas de pénalité vide/arrêtée
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                Traçabilité Totale CTP
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-3">
              <Factory className="w-8 h-8 text-indigo-600 shrink-0" />
              <span>Module « Machine EVA » (12 Stations)</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-3xl">
              Gestion indépendante d'EVA 1, EVA 2 et EVA 3. Configuration de chaque station en{' '}
              <strong className="text-emerald-700">ACTIVE</strong>,{' '}
              <strong className="text-rose-700">ARRÊTÉE</strong>,{' '}
              <strong className="text-slate-700">VIDE</strong> ou{' '}
              <strong className="text-amber-700">MAINTENANCE</strong>. L'opérateur active uniquement les stations
              réellement utilisées.
            </p>
          </div>

          {/* Sélecteur de machines EVA 1, EVA 2, EVA 3 */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            {EVA_MACHINES_LIST.map((mach) => {
              const summary = multiMachineSummary.find((s) => s.machineCode === mach);
              const isSelected = selectedMachine === mach;
              return (
                <button
                  key={mach}
                  onClick={() => setSelectedMachine(mach)}
                  className={`px-4 py-2.5 rounded-xl text-left transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-black tracking-wide">{mach}</span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                        isSelected ? 'bg-indigo-800 text-indigo-100' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {summary?.totalStationsActives || 0}/12 Actives
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-xs font-mono font-bold">
                      {summary?.productionNetteTotale.toLocaleString('fr-FR') || 0} p.
                    </span>
                    <span
                      className={`text-[10px] ${
                        isSelected ? 'text-indigo-200' : 'text-slate-400'
                      }`}
                    >
                      ({summary?.tauxRebutPct || 0}% reb.)
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Paramètres rapides du Poste (Équipe, Opérateur, Objectif) */}
        <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Heure</label>
            <input
              type="time"
              value={heure}
              onChange={(e) => setHeure(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Équipe (Shift)</label>
            <select
              value={equipe}
              onChange={(e) => setEquipe(e.target.value as ShiftTeam)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="Équipe A">Équipe A (Matin)</option>
              <option value="Équipe B">Équipe B (Soir)</option>
              <option value="Équipe C">Équipe C (Nuit)</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Opérateur Ligne</label>
            <input
              type="text"
              value={operateur}
              onChange={(e) => setOperateur(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Objectif Poste (p.)</label>
            <input
              type="number"
              value={objectifPaires}
              onChange={(e) => setObjectifPaires(Number(e.target.value))}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Poids Paire (g)</label>
            <input
              type="number"
              value={poidsMoyenPaire}
              onChange={(e) => setPoidsMoyenPaire(Number(e.target.value))}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* 2. BARRE DE NAVIGATION SOUS-ONGLETS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200">
        <button
          onClick={() => setActiveSubTab('saisie_classement')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeSubTab === 'saisie_classement'
              ? 'bg-amber-500 text-slate-950 shadow-md font-black ring-2 ring-amber-300'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Trophy className="w-4 h-4 text-amber-600" />
          <span>استمارة التسجيل &amp; الترتيب اليومي (Saisie &amp; Classement)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('stations')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeSubTab === 'stations'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Grille 12 Stations ({sessionKpis.totalStationsActives} Actives)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('fast_entry')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeSubTab === 'fast_entry'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Zap className="w-4 h-4 text-amber-500" />
          <span>Mode Production Rapide (1-Clic)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('arrets')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeSubTab === 'arrets'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Pause className="w-4 h-4 text-rose-500" />
          <span>Suivi des Arrêts ({arrets.filter((a) => a.machineCode === selectedMachine).length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('quality_trace')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeSubTab === 'quality_trace'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Contrôle Qualité &amp; Traçabilité Totale</span>
        </button>

        <button
          onClick={() => setActiveSubTab('direction_dashboard')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeSubTab === 'direction_dashboard'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-blue-500" />
          <span>Dashboard Direction (Jour / 7j / 30j)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('audit_log')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeSubTab === 'audit_log'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-purple-500" />
          <span>Audit Log ({auditLogs.length})</span>
        </button>
      </div>

      {/* 3. KPIS CONSOLIDÉS EN TEMPS RÉEL (SYNOPTIQUE ATELIER) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Production Nette & Brute */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold uppercase mb-1">
            <span>Production Nette</span>
            <Factory className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {sessionKpis.productionNetteTotale.toLocaleString('fr-FR')}{' '}
            <span className="text-xs font-normal text-slate-400">paires</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>Brut : {sessionKpis.productionBruteTotale} p.</span>
            <span className="font-bold text-indigo-600">{sessionKpis.tauxEfficiencePct}% obj.</span>
          </div>
        </div>

        {/* Conditionnement Cartons */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold uppercase mb-1">
            <span>Cartons Générés</span>
            <Package className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-600">
            {sessionKpis.totalCartonsPleins}{' '}
            <span className="text-xs font-normal text-slate-400">scellés</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Ouvert / Reliquat : <strong className="text-slate-700">{sessionKpis.totalPairesOuvertes} p.</strong>
          </div>
        </div>

        {/* Rebut & Conformité */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold uppercase mb-1">
            <span>Rebut &amp; Qualité</span>
            <ShieldAlert className="w-4 h-4 text-rose-500" />
          </div>
          <div
            className={`text-2xl font-black ${
              sessionKpis.tauxRebutPct > 2 ? 'text-rose-600' : 'text-emerald-600'
            }`}
          >
            {sessionKpis.tauxRebutPct}%
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>{sessionKpis.rebutTotal} paires reb.</span>
            <span className="font-bold text-emerald-600">{sessionKpis.tauxConformitePct}% conf.</span>
          </div>
        </div>

        {/* Rendement Matière */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold uppercase mb-1">
            <span>Rendement Matière</span>
            <Flame className="w-4 h-4 text-orange-500" />
          </div>
          <div
            className={`text-2xl font-black ${
              sessionKpis.rendementMatierePct < 95 ? 'text-amber-600' : 'text-emerald-600'
            }`}
          >
            {sessionKpis.rendementMatierePct}%
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {sessionKpis.matiereConsommeeKg} kg ({sessionKpis.sacs25kgConsommes} sacs)
          </div>
        </div>

        {/* Capacité Réelle Engagée */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold uppercase mb-1">
            <span>Capacité Engagée</span>
            <Layers className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-600">
            {sessionKpis.capaciteEngageePairesParCycle}{' '}
            <span className="text-xs font-normal text-slate-400">p/cycle</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>{sessionKpis.totalStationsActives} stations actives / 12</span>
          </div>
        </div>

        {/* Temps Productif & Arrêt */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold uppercase mb-1">
            <span>Temps de Ligne</span>
            <Clock className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-xl font-black text-slate-800">
            {Math.floor(sessionKpis.tempsProductifMinutes / 60)}h{sessionKpis.tempsProductifMinutes % 60}m
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>Arrêts :</span>
            <span
              className={`font-bold ${
                sessionKpis.tempsArretTotalMinutes > 30 ? 'text-rose-600' : 'text-slate-600'
              }`}
            >
              {sessionKpis.tempsArretTotalMinutes} min
            </span>
          </div>
        </div>
      </div>

      {/* BANNIÈRES D'ALERTES ET ANOMALIES DÉTECTÉES */}
      {sessionKpis.anomaliesDetectees.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 space-y-2">
          <div className="flex items-center gap-2 font-bold text-sm text-amber-950">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <span>Contrôle Automatique : {sessionKpis.anomaliesDetectees.length} anomalie(s) ou alerte(s) détectée(s)</span>
          </div>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs pl-7 list-disc">
            {sessionKpis.anomaliesDetectees.map((ano, idx) => (
              <li key={idx} className="font-medium text-amber-900">
                {ano}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* MESSAGES DE SUCCÈS D'ENREGISTREMENT */}
      {saveSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 flex items-center gap-3 text-sm font-bold shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {fastSuccessMsg && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 flex items-center gap-3 text-sm font-bold shadow-xs">
          <Zap className="w-5 h-5 text-amber-600 shrink-0" />
          <span>{fastSuccessMsg}</span>
        </div>
      )}

      {/* ACTION RAPIDE D'ENREGISTREMENT VERS LE JOURNAL GLOBAL */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-slate-900 text-white rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-600 text-white">
            <Save className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold">Synchronisation Industrielle CTP SMART</h3>
            <p className="text-xs text-slate-400">
              Valider la production des 12 stations de {selectedMachine} ({sessionKpis.productionNetteTotale} paires nettes, {sessionKpis.totalCartonsPleins} cartons) vers le stock et le journal d'usine.
            </p>
          </div>
        </div>
        <button
          onClick={handleSaveToJournalAndCartons}
          className="w-full sm:w-auto px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 shrink-0 shadow-md"
        >
          <Save className="w-4 h-4" />
          <span>Enregistrer dans le Journal CTP &amp; Stock</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SOUS-ONGLET 0 : FORMULAIRE DE SAISIE & CLASSEMENT JOURNALIER CTP SMART */}
      {/* ========================================================================= */}
      {activeSubTab === 'saisie_classement' && (
        <EvaDailyRankingFormView initialMachine={selectedMachine} />
      )}

      {/* ========================================================================= */}
      {/* SOUS-ONGLET 1 : GRILLE VISUELLE DES 12 STATIONS */}
      {/* ========================================================================= */}
      {activeSubTab === 'stations' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-600" />
                <span>Configuration des 12 Stations Indépendantes — {selectedMachine}</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Activez uniquement les stations en production. Les stations vides ou arrêtées ne sont jamais comptabilisées comme une perte de production.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Légende :</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                ACTIVE
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                ARRÊTÉE
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                VIDE
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                MAINTENANCE
              </span>
            </div>
          </div>

          {/* Grille des 12 Stations */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {currentStations.map((st) => {
              const statusCfg = STATION_STATUS_CONFIG[st.status];
              const isBlocked = st.status !== 'ACTIVE';

              return (
                <div
                  key={st.stationNumber}
                  className={`rounded-2xl border p-4 transition-all ${statusCfg.bg} ${statusCfg.border} ${
                    st.anomalies.length > 0 ? 'ring-2 ring-amber-400' : ''
                  }`}
                >
                  {/* Header de la station : Numéro & Statut */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-slate-900 text-white font-mono font-bold text-xs flex items-center justify-center">
                        #{st.stationNumber}
                      </span>
                      <span className="text-xs font-bold text-slate-800">Station {st.stationNumber}</span>
                    </div>

                    {/* Sélecteur de statut rapide */}
                    <select
                      value={st.status}
                      onChange={(e) => handleStatusChange(st.stationNumber, e.target.value as EvaStationStatus)}
                      className={`px-2 py-1 rounded-lg text-[11px] font-bold uppercase cursor-pointer outline-none border ${statusCfg.badge}`}
                    >
                      <option value="ACTIVE" className="bg-white text-emerald-800">ACTIVE</option>
                      <option value="ARRETEE" className="bg-white text-rose-800">ARRÊTÉE</option>
                      <option value="VIDE" className="bg-white text-slate-700">VIDE</option>
                      <option value="MAINTENANCE" className="bg-white text-amber-800">MAINTENANCE</option>
                    </select>
                  </div>

                  {/* Corps de la station : Modèle, Moule, Pointure, Couleurs */}
                  <div className="space-y-2.5 text-xs">
                    {/* Modèle & Pointure */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Modèle</label>
                        <select
                          disabled={isBlocked}
                          value={st.modele}
                          onChange={(e) => handleStationFieldChange(st.stationNumber, 'modele', e.target.value)}
                          className="w-full mt-0.5 px-2 py-1 bg-white border border-slate-300 rounded text-xs font-bold text-slate-800 disabled:opacity-50"
                        >
                          <option value="NM">Modèle NM</option>
                          <option value="BC07">Modèle BC07</option>
                          <option value="SB101">Modèle SB101</option>
                          <option value="SB23">Modèle SB23</option>
                          <option value="Non assigné">Non assigné</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Pointure</label>
                        <input
                          type="text"
                          disabled={isBlocked}
                          value={st.pointure}
                          onChange={(e) => handleStationFieldChange(st.stationNumber, 'pointure', e.target.value)}
                          className="w-full mt-0.5 px-2 py-1 bg-white border border-slate-300 rounded text-xs font-mono font-bold text-slate-800 disabled:opacity-50"
                          placeholder="ex: 40-44"
                        />
                      </div>
                    </div>

                    {/* Référence Moule & Configuration Paires/Cycle */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Réf. Moule</label>
                        <input
                          type="text"
                          disabled={isBlocked}
                          value={st.referenceMoule}
                          onChange={(e) => handleStationFieldChange(st.stationNumber, 'referenceMoule', e.target.value)}
                          className="w-full mt-0.5 px-2 py-1 bg-white border border-slate-300 rounded text-xs font-mono text-slate-800 disabled:opacity-50"
                          placeholder="Réf. Moule"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Moule Paires/C.</label>
                        <select
                          disabled={isBlocked}
                          value={st.pairsPerCycle}
                          onChange={(e) =>
                            handleStationFieldChange(st.stationNumber, 'pairsPerCycle', Number(e.target.value))
                          }
                          className="w-full mt-0.5 px-2 py-1 bg-white border border-slate-300 rounded text-xs font-bold text-slate-800 disabled:opacity-50"
                        >
                          <option value={1}>1 paire/cycle</option>
                          <option value={2}>2 paires/cycle (Standard)</option>
                          <option value={4}>4 paires/cycle (Double)</option>
                        </select>
                      </div>
                    </div>

                    {/* Couleurs (Couleur 1 + Option Bicolor) */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Couleur(s)</label>
                        <label className="flex items-center gap-1 text-[10px] font-semibold text-slate-600 cursor-pointer">
                          <input
                            type="checkbox"
                            disabled={isBlocked}
                            checked={st.isBicolor}
                            onChange={(e) => handleStationFieldChange(st.stationNumber, 'isBicolor', e.target.checked)}
                            className="rounded text-indigo-600 w-3 h-3"
                          />
                          <span>Bicolor</span>
                        </label>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <input
                          type="text"
                          disabled={isBlocked}
                          value={st.couleur1}
                          onChange={(e) => handleStationFieldChange(st.stationNumber, 'couleur1', e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-[11px] font-medium disabled:opacity-50"
                          placeholder="Couleur 1"
                        />
                        {st.isBicolor ? (
                          <input
                            type="text"
                            disabled={isBlocked}
                            value={st.couleur2 || ''}
                            onChange={(e) => handleStationFieldChange(st.stationNumber, 'couleur2', e.target.value)}
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-[11px] font-medium disabled:opacity-50"
                            placeholder="Couleur 2"
                          />
                        ) : (
                          <span className="text-[10px] text-slate-400 self-center italic">Mono-couleur</span>
                        )}
                      </div>
                    </div>

                    {/* Compteur Début & Fin */}
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Compteur Début</label>
                        <input
                          type="number"
                          disabled={isBlocked}
                          value={st.compteurDebut}
                          onChange={(e) =>
                            handleStationFieldChange(st.stationNumber, 'compteurDebut', Number(e.target.value))
                          }
                          className="w-full mt-0.5 px-2 py-1 bg-white border border-slate-300 rounded text-xs font-mono font-bold text-slate-900 disabled:opacity-50"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Compteur Fin</label>
                        <input
                          type="number"
                          disabled={isBlocked}
                          value={st.compteurFin}
                          onChange={(e) =>
                            handleStationFieldChange(st.stationNumber, 'compteurFin', Number(e.target.value))
                          }
                          className="w-full mt-0.5 px-2 py-1 bg-white border border-slate-300 rounded text-xs font-mono font-bold text-slate-900 disabled:opacity-50"
                        />
                      </div>
                    </div>

                    {/* Rebut par station */}
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Rebut (paires)</label>
                      <input
                        type="number"
                        min={0}
                        disabled={isBlocked}
                        value={st.rebutPaires}
                        onChange={(e) =>
                          handleStationFieldChange(st.stationNumber, 'rebutPaires', Number(e.target.value))
                        }
                        className="w-20 px-2 py-1 bg-white border border-slate-300 rounded text-xs font-mono font-bold text-rose-700 text-right disabled:opacity-50"
                      />
                    </div>

                    {/* Résultat calculé pour la station */}
                    <div className="bg-slate-900 text-white p-2.5 rounded-xl space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Cycles :</span>
                        <span className="font-mono font-bold">{st.cycles} c.</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Production Nette :</span>
                        <span className="font-mono font-bold text-emerald-400">{st.pairesNettes} paires</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Cartons :</span>
                        <span className="font-mono font-bold text-amber-400">
                          {st.cartonsPleins} pleins + {st.reliquatPaires} p.
                        </span>
                      </div>
                    </div>

                    {/* Signalement d'anomalies spécifiques à cette station */}
                    {st.anomalies.length > 0 && (
                      <div className="p-2 rounded bg-amber-100 text-amber-900 text-[10px] font-bold flex items-start gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                        <span>{st.anomalies.join(' • ')}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* TABLEAU EN TEMPS RÉEL DES 12 STATIONS AVEC DÉTAIL PAR MODÈLE */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>Tableau Récapitulatif en Temps Réel des 12 Stations ({selectedMachine})</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold uppercase border-b border-slate-200">
                    <th className="py-2.5 px-3">Station</th>
                    <th className="py-2.5 px-3">Statut</th>
                    <th className="py-2.5 px-3">Modèle / Pt.</th>
                    <th className="py-2.5 px-3">Réf. Moule</th>
                    <th className="py-2.5 px-3">Couleur(s)</th>
                    <th className="py-2.5 px-3 text-center">P./Cycle</th>
                    <th className="py-2.5 px-3 text-right">Début</th>
                    <th className="py-2.5 px-3 text-right">Fin</th>
                    <th className="py-2.5 px-3 text-right">Cycles</th>
                    <th className="py-2.5 px-3 text-right">Brut</th>
                    <th className="py-2.5 px-3 text-right">Rebut</th>
                    <th className="py-2.5 px-3 text-right text-emerald-700 font-black">Net</th>
                    <th className="py-2.5 px-3 text-right text-amber-700">Cartons</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {currentStations.map((s) => (
                    <tr key={s.stationNumber} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-3 font-bold text-slate-900">Station {s.stationNumber}</td>
                      <td className="py-2.5 px-3 font-sans">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            s.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : s.status === 'ARRETEE'
                              ? 'bg-rose-100 text-rose-800'
                              : s.status === 'VIDE'
                              ? 'bg-slate-100 text-slate-700'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-sans font-medium text-slate-800">
                        {s.modele} {s.pointure ? `(${s.pointure})` : ''}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{s.referenceMoule}</td>
                      <td className="py-2.5 px-3 font-sans text-slate-700">
                        {s.couleur1} {s.isBicolor && s.couleur2 ? `+ ${s.couleur2}` : ''}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-800">{s.pairsPerCycle}</td>
                      <td className="py-2.5 px-3 text-right text-slate-500">{s.compteurDebut}</td>
                      <td className="py-2.5 px-3 text-right text-slate-900 font-bold">{s.compteurFin}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-indigo-700">{s.cycles}</td>
                      <td className="py-2.5 px-3 text-right text-slate-700">{s.pairesBrutes}</td>
                      <td className="py-2.5 px-3 text-right text-rose-600 font-bold">{s.rebutPaires}</td>
                      <td className="py-2.5 px-3 text-right text-emerald-700 font-black">{s.pairesNettes}</td>
                      <td className="py-2.5 px-3 text-right text-amber-700 font-bold font-sans text-[11px]">
                        {s.cartonsPleins}c + {s.reliquatPaires}p
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-900 text-white font-mono font-bold text-xs">
                    <td colSpan={5} className="py-3 px-3 font-sans font-black">
                      TOTAL CONSOLIDÉ MACHINE ({selectedMachine})
                    </td>
                    <td className="py-3 px-3 text-center text-blue-300">
                      {sessionKpis.capaciteEngageePairesParCycle} p/c
                    </td>
                    <td colSpan={2} className="py-3 px-3 text-center font-sans text-slate-400">
                      {sessionKpis.totalStationsActives} Actives / 12
                    </td>
                    <td className="py-3 px-3 text-right text-indigo-300">{sessionKpis.cyclesMachine}</td>
                    <td className="py-3 px-3 text-right">{sessionKpis.productionBruteTotale}</td>
                    <td className="py-3 px-3 text-right text-rose-400">{sessionKpis.rebutTotal}</td>
                    <td className="py-3 px-3 text-right text-emerald-400 text-sm font-black">
                      {sessionKpis.productionNetteTotale}
                    </td>
                    <td className="py-3 px-3 text-right text-amber-400 text-sm font-black font-sans">
                      {sessionKpis.totalCartonsPleins} cartons
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SOUS-ONGLET 2 : MODE PRODUCTION RAPIDE (SAISIE EXPRESS / 1-CLIC) */}
      {/* ========================================================================= */}
      {activeSubTab === 'fast_entry' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-500 text-white">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">
                Mode Production Rapide (Saisie Express / 1-Clic) — {selectedMachine}
              </h2>
              <p className="text-xs text-slate-500">
                Saisissez uniquement les compteurs début/fin et le rebut global. Le système calcule automatiquement tous les indicateurs et les distribue équitablement sur les {sessionKpis.totalStationsActives} stations actives.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-5 rounded-2xl bg-amber-50/50 border border-amber-200">
            <div>
              <label className="block text-xs font-bold text-amber-950 uppercase mb-1.5">
                Compteur Début Global
              </label>
              <input
                type="number"
                value={fastCompteurDebut}
                onChange={(e) => setFastCompteurDebut(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-white border border-amber-300 rounded-xl font-mono text-base font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-amber-950 uppercase mb-1.5">
                Compteur Fin Global
              </label>
              <input
                type="number"
                value={fastCompteurFin}
                onChange={(e) => setFastCompteurFin(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-white border border-amber-300 rounded-xl font-mono text-base font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-amber-950 uppercase mb-1.5">
                Rebut Global (Paires)
              </label>
              <input
                type="number"
                min={0}
                value={fastRebutGlobal}
                onChange={(e) => setFastRebutGlobal(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-white border border-amber-300 rounded-xl font-mono text-base font-bold text-rose-700 focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>
          </div>

          {/* Prévisualisation de la distribution */}
          <div className="p-4 rounded-xl bg-slate-900 text-white grid grid-cols-2 sm:grid-cols-4 gap-4 items-center">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Cycles Calculés</span>
              <span className="text-xl font-mono font-black text-amber-400">
                {Math.max(0, fastCompteurFin - fastCompteurDebut)} cycles
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Stations Ciblées</span>
              <span className="text-xl font-bold text-white">
                {sessionKpis.totalStationsActives} Actives
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Production Projetée</span>
              <span className="text-xl font-mono font-black text-emerald-400">
                ~{Math.max(0, fastCompteurFin - fastCompteurDebut) * sessionKpis.capaciteEngageePairesParCycle} p.
              </span>
            </div>
            <div>
              <button
                onClick={handleApplyFastEntry}
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-md"
              >
                <Zap className="w-4 h-4 fill-slate-950" />
                <span>Appliquer aux Stations Actives</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SOUS-ONGLET 3 : SUIVI DES ARRÊTS MACHINE & STATIONS */}
      {/* ========================================================================= */}
      {activeSubTab === 'arrets' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Pause className="w-6 h-6 text-rose-600" />
                <span>Gestion &amp; Suivi des Arrêts — {selectedMachine}</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Traçabilité rigoureuse des arrêts machine avec cause, durée, responsable et impact sur la cadence.
              </p>
            </div>
            <div className="px-4 py-2 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-800">
              Cumul Arrêts : {sessionKpis.tempsArretTotalMinutes} minutes
            </div>
          </div>

          {/* Formulaire de déclaration d'arrêt */}
          <form
            onSubmit={handleAddArret}
            className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4"
          >
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-600" />
              <span>Déclarer un Arrêt ou une Panne</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Station concernée</label>
                <select
                  value={String(newArretStation)}
                  onChange={(e) =>
                    setNewArretStation(e.target.value === 'Toutes' ? 'Toutes' : Number(e.target.value))
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-800"
                >
                  <option value="Toutes">Machine Complète (Toutes)</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((s) => (
                    <option key={s} value={s}>Station #{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Durée (Minutes)</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={newArretDuree}
                  onChange={(e) => setNewArretDuree(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Cause de l'arrêt</label>
                <select
                  value={newArretCause}
                  onChange={(e) => setNewArretCause(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-800"
                >
                  <option value="Moule">Changement / Panne Moule</option>
                  <option value="Mécanique">Mécanique / Injecteur</option>
                  <option value="Matière">Manque / Préparation Matière</option>
                  <option value="Électrique">Électrique / Régulation T°</option>
                  <option value="Changement Série">Changement de Série / Pointure</option>
                  <option value="Opérateur">Intervention Opérateur</option>
                  <option value="Pause">Pause Réglementaire</option>
                  <option value="Autre">Autre Cause</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Responsable</label>
                <input
                  type="text"
                  required
                  value={newArretResponsable}
                  onChange={(e) => setNewArretResponsable(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Description / Action corrective engagée
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newArretDesc}
                  onChange={(e) => setNewArretDesc(e.target.value)}
                  placeholder="Ex: Remplacement buse injecteur, nettoyage circuits de refroidissement..."
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                />
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition shrink-0"
                >
                  Enregistrer l'Arrêt
                </button>
              </div>
            </div>
          </form>

          {/* Tableau historique des arrêts */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
              Historique des Arrêts Enregistrés ({selectedMachine})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold uppercase border-b border-slate-200">
                    <th className="py-2.5 px-3">Date/Heure</th>
                    <th className="py-2.5 px-3">Machine/Station</th>
                    <th className="py-2.5 px-3">Cause</th>
                    <th className="py-2.5 px-3">Durée</th>
                    <th className="py-2.5 px-3">Responsable</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3 text-center">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {arrets
                    .filter((a) => a.machineCode === selectedMachine)
                    .map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50 transition">
                        <td className="py-2 px-3 font-mono text-slate-600">
                          {a.date} à {a.heureDebut}
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-800">
                          {a.machineCode} — {a.stationNumber === 'Toutes' ? 'Toutes stations' : `Station #${a.stationNumber}`}
                        </td>
                        <td className="py-2 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">
                            {a.cause}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-rose-700">{a.dureeMinutes} min</td>
                        <td className="py-2 px-3 text-slate-700">{a.responsable}</td>
                        <td className="py-2 px-3 text-slate-600">{a.description}</td>
                        <td className="py-2 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              a.resolu ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {a.resolu ? 'Résolu' : 'En cours'}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SOUS-ONGLET 4 : CONTRÔLE QUALITÉ & TRAÇABILITÉ TOTALE */}
      {/* ========================================================================= */}
      {activeSubTab === 'quality_trace' && (
        <div className="space-y-6">
          {/* Chaîne visuelle de traçabilité complète */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <span>Chaîne de Traçabilité Complète CTP SMART</span>
            </h2>
            <p className="text-xs text-slate-500">
              Chaque paire de chaussures et chaque carton scellé est lié de manière inaltérable à la matière, la station et l'opérateur.
            </p>

            <div className="p-4 rounded-2xl bg-slate-900 text-white overflow-x-auto">
              <div className="flex items-center gap-2 min-w-[700px] text-xs font-mono">
                <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-center">
                  <span className="text-[10px] text-slate-400 block">1. Matière</span>
                  <span className="font-bold text-amber-400">EVA Vierge</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
                <div className="p-2.5 rounded-xl bg-indigo-900/60 border border-indigo-700 text-center">
                  <span className="text-[10px] text-indigo-300 block">2. Machine</span>
                  <span className="font-bold text-indigo-200">{selectedMachine}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
                <div className="p-2.5 rounded-xl bg-blue-900/60 border border-blue-700 text-center">
                  <span className="text-[10px] text-blue-300 block">3. Station</span>
                  <span className="font-bold text-blue-200">12 Stations</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
                <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-center">
                  <span className="text-[10px] text-slate-400 block">4. Moule / Pt.</span>
                  <span className="font-bold text-slate-200">M-EVA-01..12</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
                <div className="p-2.5 rounded-xl bg-purple-900/60 border border-purple-700 text-center">
                  <span className="text-[10px] text-purple-300 block">5. Équipe / Op.</span>
                  <span className="font-bold text-purple-200">{equipe}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
                <div className="p-2.5 rounded-xl bg-amber-900/60 border border-amber-700 text-center">
                  <span className="text-[10px] text-amber-300 block">6. Carton (12p)</span>
                  <span className="font-bold text-amber-200">CTP-CRT-XXXX</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
                <div className="p-2.5 rounded-xl bg-emerald-900/60 border border-emerald-700 text-center">
                  <span className="text-[10px] text-emerald-300 block">7. Stock Fini</span>
                  <span className="font-bold text-emerald-200">Magasin Central</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tableau Contrôle Qualité par Modèle */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-indigo-600" />
              <span>Contrôles Qualité Réalisés sur {selectedMachine}</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold uppercase border-b border-slate-200">
                    <th className="py-2.5 px-3">Date/Heure</th>
                    <th className="py-2.5 px-3">Station / Modèle</th>
                    <th className="py-2.5 px-3">Inspecteur</th>
                    <th className="py-2.5 px-3 text-center">Bavures</th>
                    <th className="py-2.5 px-3 text-center">Bulles</th>
                    <th className="py-2.5 px-3 text-center">Retassures</th>
                    <th className="py-2.5 px-3 text-center">Statut</th>
                    <th className="py-2.5 px-3">Action Corrective</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {qualityChecks
                    .filter((q) => q.machineCode === selectedMachine)
                    .map((q) => (
                      <tr key={q.id} className="hover:bg-slate-50 transition">
                        <td className="py-2 px-3 font-mono text-slate-600">
                          {q.date} {q.heure}
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-800">
                          Station #{q.stationNumber} — {q.modele} ({q.pointure})
                        </td>
                        <td className="py-2 px-3 text-slate-700">{q.inspecteur}</td>
                        <td className="py-2 px-3 text-center font-mono">{q.defautsDetectes.bavures}</td>
                        <td className="py-2 px-3 text-center font-mono">{q.defautsDetectes.bulles}</td>
                        <td className="py-2 px-3 text-center font-mono">{q.defautsDetectes.retassures}</td>
                        <td className="py-2 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              q.conforme ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {q.conforme ? 'Conforme' : 'Non conforme'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-600 italic">{q.actionCorrective || '-'}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SOUS-ONGLET 5 : DASHBOARD DIRECTION (JOUR / 7 JOURS / 30 JOURS) */}
      {/* ========================================================================= */}
      {activeSubTab === 'direction_dashboard' && (
        <div className="space-y-6">
          {/* Header Dashboard Direction avec Sélecteur temporel */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-100 text-indigo-800 border border-indigo-200 uppercase tracking-wider">
                  Pilotage Exécutif Direction
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  {directionDashboardData.labelPeriode}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-indigo-600 shrink-0" />
                <span>Tableau de Bord Direction &amp; Analyse Comparative</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Comparatif multi-périodes (Aujourd'hui / 7j / 30j) : Production nette, Qualité, Rendement matière, Rebuts et Disponibilité TRS.
              </p>
            </div>

            {/* Sélecteur temporel Jour / 7 Jours / 30 Jours */}
            <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
              <button
                onClick={() => setDirectionTimeRange('jour')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  directionTimeRange === 'jour'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-white'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Aujourd'hui</span>
              </button>
              <button
                onClick={() => setDirectionTimeRange('7j')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  directionTimeRange === '7j'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-white'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>7 Derniers Jours</span>
              </button>
              <button
                onClick={() => setDirectionTimeRange('30j')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  directionTimeRange === '30j'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-white'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>30 Jours (Mois)</span>
              </button>
            </div>
          </div>

          {/* Grille des 5 KPIs Clés Direction avec Comparatif & Variations */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* 1. Production Nette */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Production Nette</span>
                  <Package className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="mt-2 text-2xl font-black font-mono text-slate-900">
                  {directionDashboardData.productionNette.toLocaleString('fr-FR')}
                  <span className="text-xs font-normal text-slate-500 ml-1">paires</span>
                </div>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-500">Obj: {directionDashboardData.objectifPaires.toLocaleString('fr-FR')}</span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700">
                    {directionDashboardData.atteintePct}%
                  </span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-1 text-[11px]">
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="font-bold text-emerald-700">{directionDashboardData.compProduction.delta}</span>
                <span className="text-slate-400 truncate">{directionDashboardData.compProduction.label}</span>
              </div>
            </div>

            {/* 2. Qualité & Conformité */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Taux Qualité</span>
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="mt-2 text-2xl font-black font-mono text-emerald-700">
                  {directionDashboardData.tauxConformite}%
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  Cible tolérance : &ge; 98.0%
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-1 text-[11px]">
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="font-bold text-emerald-700">{directionDashboardData.compConformite.delta}</span>
                <span className="text-slate-400 truncate">{directionDashboardData.compConformite.label}</span>
              </div>
            </div>

            {/* 3. Rendement Matière */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rendement Matière</span>
                  <Flame className="w-4 h-4 text-amber-600" />
                </div>
                <div className="mt-2 text-2xl font-black font-mono text-slate-900">
                  {directionDashboardData.rendementMatiere}%
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  Standard usine : &ge; 97.5%
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-1 text-[11px]">
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="font-bold text-emerald-700">{directionDashboardData.compRendement.delta}</span>
                <span className="text-slate-400 truncate">{directionDashboardData.compRendement.label}</span>
              </div>
            </div>

            {/* 4. Taux de Rebut & Coût Estimé */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Taux de Rebut</span>
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                </div>
                <div className="mt-2 text-2xl font-black font-mono text-rose-700">
                  {directionDashboardData.tauxRebut}%
                  <span className="text-xs font-normal text-slate-500 ml-1">({directionDashboardData.rebutPaires} p.)</span>
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  Impact financier : ~{directionDashboardData.coutRebutEstimeDA.toLocaleString('fr-FR')} DA
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-1 text-[11px]">
                <ArrowDownRight className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="font-bold text-emerald-700">{directionDashboardData.compRebut.delta}</span>
                <span className="text-slate-400 truncate">{directionDashboardData.compRebut.label}</span>
              </div>
            </div>

            {/* 5. TRS & Disponibilité Machine */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Disponibilité (TRS)</span>
                  <Zap className="w-4 h-4 text-purple-600" />
                </div>
                <div className="mt-2 text-2xl font-black font-mono text-purple-700">
                  {directionDashboardData.disponibilitePct}%
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  Arrêts totaux : {directionDashboardData.tempsArretMinutes} min
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-1 text-[11px]">
                <ArrowDownRight className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="font-bold text-emerald-700">{directionDashboardData.compArrets.delta}</span>
                <span className="text-slate-400 truncate">{directionDashboardData.compArrets.label}</span>
              </div>
            </div>
          </div>

          {/* Graphique d'Évolution Visuelle de la Production vs Objectif & Rebut */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-600" />
                  <span>Courbe de Cadence &amp; Production ({directionDashboardData.labelPeriode})</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Volume de paires produites par tranche temporelle comparé à la cible et niveau de rebut.
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-indigo-600 inline-block"></span>
                  <span className="text-slate-600 font-medium">Production nette</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-rose-500 inline-block"></span>
                  <span className="text-slate-600 font-medium">Rebut (scrap)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-0.5 border-t-2 border-dashed border-slate-400 inline-block"></span>
                  <span className="text-slate-600 font-medium">Cible</span>
                </div>
              </div>
            </div>

            {/* Visual Bar Chart */}
            <div className="pt-6 pb-2">
              {(() => {
                const maxVal = Math.max(...directionDashboardData.trendPoints.map((p) => p.paires), 100);
                return (
                  <div className="grid grid-cols-4 sm:grid-cols-7 lg:grid-cols-8 gap-3 items-end h-44 border-b border-slate-200 px-2">
                    {directionDashboardData.trendPoints.map((pt, idx) => {
                      const barHeight = Math.max(12, Math.round((pt.paires / maxVal) * 100));
                      const scrapHeight = Math.max(3, Math.round((pt.rebut / maxVal) * 100));
                      return (
                        <div key={idx} className="flex flex-col items-center justify-end h-full gap-1 group relative">
                          {/* Tooltip on hover */}
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-12 z-20 bg-slate-900 text-white text-[10px] py-1 px-2 rounded-lg shadow-lg whitespace-nowrap pointer-events-none">
                            <span className="font-bold">{pt.paires.toLocaleString('fr-FR')} paires</span>
                            <span className="text-rose-300 ml-1">({pt.rebut} rebuts)</span>
                          </div>

                          {/* Bars container */}
                          <div className="w-full max-w-[42px] flex items-end justify-center gap-0.5 h-full">
                            {/* Bar Production */}
                            <div
                              style={{ height: `${barHeight}%` }}
                              className="w-full bg-indigo-600 hover:bg-indigo-700 rounded-t-md transition-all duration-300 relative"
                            ></div>
                            {/* Bar Rebut */}
                            <div
                              style={{ height: `${scrapHeight}%` }}
                              className="w-2.5 bg-rose-500 hover:bg-rose-600 rounded-t-sm transition-all duration-300"
                            ></div>
                          </div>
                          {/* X Axis Label */}
                          <span className="text-[10px] font-mono text-slate-500 truncate w-full text-center mt-1">
                            {pt.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Tableau Comparatif des Équipes A / B / C */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <span>Performance Comparative des 3 Postes (Équipes A / B / C)</span>
              </h3>
              <span className="text-xs text-slate-500">
                Données agrégées sur {directionDashboardData.labelPeriode}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {directionDashboardData.teams.map((tm) => (
                <div
                  key={tm.nom}
                  className={`bg-white rounded-2xl p-5 border shadow-sm space-y-3 transition-all ${
                    tm.isLeader ? 'border-2 border-indigo-500 shadow-indigo-100/50' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-sm font-black text-slate-900 block">{tm.nom}</span>
                      <span className="text-xs text-slate-500">
                        Chef : <strong className="text-slate-700">{tm.chef}</strong> ({tm.horaire})
                      </span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${tm.badgeColor}`}>
                      {tm.badge}
                    </span>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Production nette :</span>
                      <span className="font-mono font-black text-slate-900">
                        {tm.productionNette.toLocaleString('fr-FR')} paires
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Taux de conformité :</span>
                      <span className="font-mono font-bold text-emerald-600">{tm.conformite}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Rendement matière :</span>
                      <span className="font-mono font-bold text-slate-800">{tm.rendement}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Taux de rebut :</span>
                      <span className="font-mono font-bold text-rose-600">
                        {tm.rebutTaux}% ({tm.rebutPaires} p.)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Arrêts cumulés :</span>
                      <span className="font-mono font-bold text-slate-700">{tm.arretMin} min</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tableau Comparatif des 3 Machines EVA (EVA 1 / EVA 2 / EVA 3) */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Factory className="w-4 h-4 text-indigo-600" />
                <span>État &amp; Rendement Comparatif des Machines (EVA 1, EVA 2, EVA 3)</span>
              </h3>
              <span className="text-xs text-slate-500">
                Stations actives sans pénalité pour les stations arrêtées/vides
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {directionDashboardData.machines.map((mach) => (
                <div key={mach.code} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-slate-900 text-sm">{mach.code}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800">
                      {mach.stationsActives}/12 stations
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">{mach.nom}</div>
                  <div className="pt-2 border-t border-slate-200 space-y-1 font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-sans">Volume produit :</span>
                      <span className="font-bold text-slate-900">{mach.production.toLocaleString('fr-FR')} p.</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-sans">Rendement matière :</span>
                      <span className="font-bold text-emerald-700">{mach.rendement}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-sans">Taux rebut :</span>
                      <span className="font-bold text-rose-600">{mach.rebutTaux}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-sans">Disponibilité :</span>
                      <span className="font-bold text-purple-700">{mach.disponibilite}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Synthèse par Modèle & Conditionnement de la machine active */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Boxes className="w-4 h-4 text-emerald-600" />
              <span>Ventilation par Modèle &amp; Conditionnement Cartons ({selectedMachine})</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {productionByModel.map((m) => (
                <div key={m.model} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <span className="font-black text-slate-900 block truncate" title={m.model}>
                    {m.model}
                  </span>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="font-mono font-bold text-emerald-700 text-sm">
                      {m.pairs.toLocaleString('fr-FR')} paires
                    </span>
                    <span className="text-[11px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {m.cartons} cartons
                    </span>
                  </div>
                  <div className="mt-1 text-[10px] text-slate-400">
                    Rebut détecté : {m.scrap} p.
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SOUS-ONGLET 6 : AUDIT LOG DU MODULE & INTÉGRATION GLOBALE */}
      {/* ========================================================================= */}
      {activeSubTab === 'audit_log' && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-purple-600" />
                <span>Journal d'Audit &amp; Traçabilité Industrielle</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Chaque modification de statut, de compteur ou de paramètre est horodatée avec l'ancienne et la nouvelle valeur.
              </p>
            </div>

            {/* Sélecteur de source d'audit : Module EVA vs Global ERP */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
                <button
                  onClick={() => setAuditFilterSource('eva')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    auditFilterSource === 'eva' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 hover:bg-white'
                  }`}
                >
                  Audit Module EVA ({auditLogs.length})
                </button>
                <button
                  onClick={() => setAuditFilterSource('global')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    auditFilterSource === 'global' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 hover:bg-white'
                  }`}
                >
                  Audit Global ERP ({globalAuditLogs.length})
                </button>
              </div>
            </div>
          </div>

          {/* Barre de recherche d'audit */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={auditSearchQuery}
                onChange={(e) => setAuditSearchQuery(e.target.value)}
                placeholder="Rechercher par utilisateur, machine, action ou champ modifié..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>
          </div>

          {/* Tableau de l'Audit Log */}
          <div className="overflow-x-auto">
            {auditFilterSource === 'eva' ? (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold uppercase border-b border-slate-200">
                    <th className="py-2.5 px-3">Date &amp; Heure</th>
                    <th className="py-2.5 px-3">Utilisateur</th>
                    <th className="py-2.5 px-3">Machine / Station</th>
                    <th className="py-2.5 px-3">Action</th>
                    <th className="py-2.5 px-3">Champ Modifié</th>
                    <th className="py-2.5 px-3">Ancienne Valeur</th>
                    <th className="py-2.5 px-3">Nouvelle Valeur</th>
                    <th className="py-2.5 px-3">Détails</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {auditLogs
                    .filter((log) => {
                      if (!auditSearchQuery) return true;
                      const q = auditSearchQuery.toLowerCase();
                      return (
                        log.utilisateur.toLowerCase().includes(q) ||
                        log.action.toLowerCase().includes(q) ||
                        log.champModifie.toLowerCase().includes(q) ||
                        log.machineCode.toLowerCase().includes(q) ||
                        log.details.toLowerCase().includes(q)
                      );
                    })
                    .map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50 transition">
                        <td className="py-2 px-3 text-slate-500 whitespace-nowrap">
                          {log.date} {log.heure}
                        </td>
                        <td className="py-2 px-3 font-sans font-bold text-slate-800">{log.utilisateur}</td>
                        <td className="py-2 px-3 text-indigo-700 font-bold">
                          {log.machineCode} {log.stationNumber ? `#${log.stationNumber}` : ''}
                        </td>
                        <td className="py-2 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-700">{log.champModifie}</td>
                        <td className="py-2 px-3 text-rose-600 max-w-xs truncate">{String(log.ancienneValeur)}</td>
                        <td className="py-2 px-3 text-emerald-700 font-bold max-w-xs truncate">{String(log.nouvelleValeur)}</td>
                        <td className="py-2 px-3 font-sans text-slate-500 max-w-xs truncate" title={log.details}>
                          {log.details}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold uppercase border-b border-slate-200">
                    <th className="py-2.5 px-3">Date &amp; Heure</th>
                    <th className="py-2.5 px-3">Utilisateur</th>
                    <th className="py-2.5 px-3">Module</th>
                    <th className="py-2.5 px-3">Action</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3">Détails</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {globalAuditLogs
                    .filter((log) => {
                      if (!auditSearchQuery) return true;
                      const q = auditSearchQuery.toLowerCase();
                      return (
                        (log.userName || '').toLowerCase().includes(q) ||
                        (log.action || '').toLowerCase().includes(q) ||
                        (log.module || '').toLowerCase().includes(q) ||
                        (log.description || '').toLowerCase().includes(q)
                      );
                    })
                    .map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50 transition">
                        <td className="py-2 px-3 text-slate-500 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString('fr-FR')}
                        </td>
                        <td className="py-2 px-3 font-sans font-bold text-slate-800">{log.userName || 'Opérateur'}</td>
                        <td className="py-2 px-3 text-indigo-700 font-bold">{log.module}</td>
                        <td className="py-2 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-sans text-slate-700 max-w-md truncate">{log.description}</td>
                        <td className="py-2 px-3 font-sans text-slate-500 max-w-xs truncate">
                          {log.details?.targetName || log.details?.newValue || '-'}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
