import { User, UserRole, ShiftType } from '../types';

/**
 * Normalise le code machine (ex: "EVA 1" -> "EVA1")
 */
export function normalizeMachineCode(code: string | undefined): string {
  if (!code) return '';
  return code.toUpperCase().replace(/\s+/g, '');
}

/**
 * Normalise l'équipe ou le shift
 */
export function normalizeShiftOrEquipe(value: string | undefined): string {
  if (!value) return '';
  const v = value.toLowerCase().trim();
  if (v === 'a' || v === 'matin') return 'matin';
  if (v === 'b' || v === 'soir') return 'soir';
  if (v === 'c' || v === 'nuit') return 'nuit';
  return v;
}

/**
 * Vérifie si l'utilisateur a le droit d'accéder / voir les données d'une machine spécifique
 * Règle d'or : ROLE + UNITÉ + MACHINE
 */
export function canUserAccessMachine(user: User | null | undefined, machineCode: string): boolean {
  if (!user) return false;

  // Rôles avec vue globale usine (Toutes les machines U1 et U2)
  if (
    user.role === 'admin_general' ||
    user.role === 'direction' ||
    user.role === 'resp_production' ||
    user.role === 'resp_qualite' ||
    user.role === 'rh' ||
    user.role === 'resp_maintenance'
  ) {
    return true;
  }

  const targetCode = normalizeMachineCode(machineCode);
  const userMachine = normalizeMachineCode(user.assignedMachine);

  // GÉRANT : strictement limité à son unique machine
  if (user.role === 'gerant') {
    return userMachine === targetCode;
  }

  // CHEF D'ÉQUIPE : strictement limité à son unique machine
  if (user.role === 'chef_equipe') {
    return userMachine === targetCode;
  }

  // OPÉRATEUR : strictement sa machine
  if (user.role === 'operateur') {
    return userMachine === targetCode;
  }

  return false;
}

/**
 * Vérifie si l'utilisateur a le droit d'accéder à un shift / poste donné sur une machine
 * Règle d'or : ROLE + UNITÉ + MACHINE + SHIFT
 */
export function canUserAccessShift(
  user: User | null | undefined,
  machineCode: string,
  shiftOrEquipe: string
): boolean {
  if (!user) return false;

  // D'abord vérifier la machine
  if (!canUserAccessMachine(user, machineCode)) {
    return false;
  }

  // Directeur, RH, Qualité, Maintenance, Direction : tous les shifts
  if (
    user.role === 'admin_general' ||
    user.role === 'direction' ||
    user.role === 'resp_production' ||
    user.role === 'resp_qualite' ||
    user.role === 'rh' ||
    user.role === 'resp_maintenance'
  ) {
    return true;
  }

  // GÉRANT : voit tous les 3 shifts (Matin, Soir, Nuit) de SA machine
  if (user.role === 'gerant') {
    return true;
  }

  // CHEF D'ÉQUIPE : strictement SON shift / équipe
  if (user.role === 'chef_equipe') {
    const targetShift = normalizeShiftOrEquipe(shiftOrEquipe);
    const userShift = normalizeShiftOrEquipe(user.assignedShift);
    const userEquipe = (user.assignedEquipe || '').toLowerCase();
    const targetEquipe = (shiftOrEquipe || '').toLowerCase();

    return targetShift === userShift || targetEquipe === userEquipe;
  }

  return false;
}

/**
 * Vérifie si l'utilisateur peut valider ou rejeter une fiche de production
 * Seul le Gérant de la machine ou le Directeur de Production peut valider/rejeter.
 */
export function canUserValidateOrRejectFiche(user: User | null | undefined, machineCode: string): boolean {
  if (!user) return false;

  if (user.role === 'admin_general' || user.role === 'direction' || user.role === 'resp_production') {
    return true;
  }

  if (user.role === 'gerant') {
    return normalizeMachineCode(user.assignedMachine) === normalizeMachineCode(machineCode);
  }

  return false;
}

/**
 * Vérifie si l'utilisateur peut éditer / remplir une fiche de production
 */
export function canUserEditFiche(
  user: User | null | undefined,
  machineCode: string,
  shiftOrEquipe: string,
  currentStatus?: string
): boolean {
  if (!user) return false;

  // Une fiche déjà validée ne peut pas être modifiée par les chefs d'équipe (Immuabilité)
  if (currentStatus === 'valide') {
    return user.role === 'admin_general' || user.role === 'direction';
  }

  // Chef d'équipe : peut modifier son brouillon ou sa fiche rejetée
  if (user.role === 'chef_equipe') {
    return canUserAccessShift(user, machineCode, shiftOrEquipe);
  }

  // Directeur de production : tous droits opérationnels
  if (user.role === 'resp_production' || user.role === 'admin_general') {
    return true;
  }

  return false;
}

/**
 * Vérifie si l'utilisateur est habilité à enregistrer une entrée de matière première
 * - Gérant de machine (pour les matières premières reçues pour sa machine)
 * - Responsable Stock
 * - Directeur Production / Admin
 */
export function canUserEnterRawMaterial(user: User | null | undefined): boolean {
  if (!user) return false;
  return (
    user.role === 'gerant' ||
    user.role === 'resp_stock' ||
    user.role === 'resp_production' ||
    user.role === 'admin_general'
  );
}

/**
 * Matrice de protection des pages / onglets (Navigation Guard)
 */
export function canUserAccessTab(user: User | null | undefined, tabId: string): boolean {
  if (!user) return false;

  // Administrateur Général & Direction & Directeur Production : accès complet
  if (user.role === 'admin_general' || user.role === 'direction' || user.role === 'resp_production') {
    return true;
  }

  const tid = tabId.toLowerCase();

  // CHEF D'ÉQUIPE : Uniquement saisie et suivi de sa machine
  if (user.role === 'chef_equipe') {
    const allowed = [
      'ctp_tracker',
      'production_tracker',
      'tracker',
      'ctp_production',
      'production',
      'counter_scanner',
      'scanner',
      'fast_entry',
      'machine_eva',
      'eva',
    ];
    return allowed.includes(tid);
  }

  // GÉRANT : Suivi de sa machine, validation des fiches, stock matière première, dashboard machine
  if (user.role === 'gerant') {
    const allowed = [
      'ctp_tracker',
      'production_tracker',
      'tracker',
      'ctp_production',
      'production',
      'ctp_dashboard',
      'dashboard',
      'ctp_stock',
      'stock',
      'raw_materials',
      'raw_materials_stock',
      'counter_scanner',
      'scanner',
      'machine_eva',
      'eva',
      'quality',
    ];
    // Ne peut PAS voir RH, P&L, utilisateurs, audit
    return allowed.includes(tid);
  }

  // RESPONSABLE QUALITÉ : Qualité, contrôles, rebuts, stats qualité, tracker (vue défauts)
  if (user.role === 'resp_qualite') {
    const allowed = [
      'quality',
      'ctp_tracker',
      'production_tracker',
      'tracker',
      'reports',
      'ctp_dashboard',
      'dashboard',
    ];
    return allowed.includes(tid);
  }

  // RESPONSABLE GESTION RH : Personnel, présences, shifts, utilisateurs, audit, dashboard
  if (user.role === 'rh') {
    const allowed = [
      'hr',
      'rh',
      'admin',
      'settings',
      'referentials',
      'audit',
      'reports',
      'ctp_dashboard',
      'dashboard',
    ];
    return allowed.includes(tid);
  }

  // RESPONSABLE MAINTENANCE
  if (user.role === 'resp_maintenance') {
    const allowed = [
      'ctp_maintenance',
      'maintenance',
      'machine_eva',
      'eva',
      'counter_scanner',
      'reports',
      'ctp_dashboard',
      'dashboard',
    ];
    return allowed.includes(tid);
  }

  // RESPONSABLE STOCK
  if (user.role === 'resp_stock') {
    const allowed = [
      'ctp_stock',
      'stock',
      'raw_materials',
      'raw_materials_stock',
      'ctp_flow',
      'flow',
      'reports',
      'ctp_dashboard',
      'dashboard',
    ];
    return allowed.includes(tid);
  }

  return true;
}
