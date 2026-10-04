// =========================================================================
// CTP SMART Production Tracker - Types & Database Schema
// Suivi de production et qualité par Équipe (A/B/C) et Machine (EVA1/EVA2/EVA3)
// =========================================================================

export type TrackerMachineCode = 'EVA1' | 'EVA2' | 'EVA3' | 'EVA4';
export type TrackerEquipeCode = 'A' | 'B' | 'C';

export type TrackerUserRole = 'CHEF_EQUIPE' | 'GERANT' | 'QUALITE' | 'RH' | 'DIRECTEUR' | 'OPERATEUR' | 'SUPERVISEUR' | 'ADMIN';

// Types de défauts dynamiques par machine
export const TRACKER_MACHINE_DEFAULTS: Record<TrackerMachineCode, string[]> = {
  EVA1: ['SML', 'SB23/23-28', 'SB23/28-35'],
  EVA2: ['NM/28', 'NM/36', 'NM/40'],
  EVA3: ['SH318/28', 'SH318/36', 'SH316/36'],
  EVA4: ['B01/36-41', 'B02/40-45', 'B07/28-35'],
};

export const MACHINE_UNITE_MAP: Record<TrackerMachineCode, 'U1' | 'U2'> = {
  EVA1: 'U1',
  EVA2: 'U1',
  EVA3: 'U1',
  EVA4: 'U2',
};

// Saisie opérateur par équipe / machine / date
export interface ProductionTrackerEntry {
  id: string; // auto
  date: string; // YYYY-MM-DD (défaut aujourd'hui)
  machine: TrackerMachineCode; // ENUM: EVA1, EVA2, EVA3, EVA4
  unite?: 'U1' | 'U2';
  equipe: TrackerEquipeCode; // ENUM: A, B, C (Postes Matin, Soir, Nuit)
  shift?: 'matin' | 'soir' | 'nuit';
  user_id: string; // ID utilisateur ayant saisi
  user_name?: string; // Nom de l'opérateur / Chef
  debut_compteur: number; // Compteur Début
  fin_compteur: number; // Compteur Fin
  ttl_paires: number; // Production nette / Confort équipe
  confort: number; // Confort (par défaut égal à ttl_paires ou validé)
  matiere_gramme: number; // Poids matière en grammes (ex: 280g)
  defauts_detail: Record<string, number>; // JSON dynamique selon la machine { "NM/28": 9, ... }
  
  // Calculs auto équipe
  cycles_machine: number; // fin_compteur - debut_compteur
  defauts_equipe: number; // SUM(defauts_detail.values())
  taux_equipe: number; // (defauts_equipe / ttl_paires) * 100
  compteur_alert: boolean; // si (fin - debut) > ttl + 100
  compteur_alert_message?: string;

  // Workflow d'approbation Chef -> Gérant
  status: 'brouillon' | 'soumis' | 'valide' | 'rejete';
  submitted_by?: string;
  submitted_at?: string;
  validated_by?: string;
  validated_at?: string;
  rejected_by?: string;
  rejected_at?: string;
  rejection_reason?: string;

  created_at: string;
  updated_at: string;
  notes?: string;
}

// Synthèse quotidienne calculée automatiquement par machine
export interface DailyTrackerSummary {
  date: string; // YYYY-MM-DD
  machine: TrackerMachineCode; // EVA1, EVA2, EVA3
  total_production: number; // SUM(fin - debut pour chaque équipe)
  confort_total: number; // SUM(ttl_paires)
  deuxieme_choix: number; // Saisi par le superviseur
  rebut: number; // Saisi par le superviseur
  defauts_total: number; // total_production - confort_total
  taux_defaut: number; // (defauts_total / total_production) * 100

  // Statut superviseur
  is_validated: boolean;
  validated_by?: string;
  validated_at?: string;
  validation_comment?: string;

  // Entrées des équipes A, B, C associées
  entries: Partial<Record<TrackerEquipeCode, ProductionTrackerEntry>>;

  // KPIs de la journée
  meilleure_equipe_production?: TrackerEquipeCode;
  meilleure_equipe_qualite?: TrackerEquipeCode;
  scores_equipes?: Record<TrackerEquipeCode, number>; // Paires - (Défauts * 10)
}

// Synthèse globale de l'usine pour une date donnée
export interface FactoryTrackerOverview {
  date: string;
  total_production_usine: number; // Somme des 3 machines
  confort_total_usine: number;
  defauts_total_usine: number;
  taux_defaut_usine: number;
  total_rebut_usine: number;
  total_deuxieme_choix_usine: number;
  
  machines: Record<TrackerMachineCode, DailyTrackerSummary>;
  
  meilleure_machine_production?: TrackerMachineCode;
  meilleure_machine_qualite?: TrackerMachineCode;
  pire_machine?: TrackerMachineCode;
  
  meilleure_equipe_usine?: {
    machine: TrackerMachineCode;
    equipe: TrackerEquipeCode;
    paires: number;
  };
  meilleure_qualite_usine?: {
    machine: TrackerMachineCode;
    equipe: TrackerEquipeCode;
    defauts: number;
    taux: number;
  };
  
  ranking_toutes_equipes: Array<{
    machine: TrackerMachineCode;
    equipe: TrackerEquipeCode;
    paires: number;
    defauts: number;
    taux_equipe: number;
    score_global: number;
    rang: number;
  }>;
}
