import {
  CtpCatalogueModele,
  CtpCarton,
  CtpProductionJournal,
  CtpStockAuto,
  CtpCommercialOrder,
  CtpMaintenanceRecord,
  Eva3Jour15Record,
} from '../types';
import { getCartonQrCodeDataUrl } from '../utils/ctpQrHelper';

// =========================================================================
// 1. TABLE catalogue_modeles (Générique et extensible)
// Données initiales OBLIGATOIRES:
// - NM | 28-35 | Fillette/Garçon | 12
// - NM | 36-41 | Femme | 12
// - NM | 36-39 | Kadet | 12
// - NM | 40-44 | Homme | 12
// - BC07 | 23-28 | Bébé | 16
// - BC07 | 28-35 | Enfant | 16
// =========================================================================
export const INITIAL_CTP_CATALOGUE: CtpCatalogueModele[] = [
  // NOUVEAU MODÈLE NM (Règle stricte: TOUJOURS 12 paires par carton)
  {
    id: 'cat-nm-2835',
    code: 'NM',
    designation: 'Fillette/Garçon',
    pointure_debut: 28,
    pointure_fin: 35,
    pointure_text: '28-35',
    paires_par_carton: 12,
    actif: true,
    notes: 'Modèle NM 28-35. Compteur machine: 1 = 1 paire. Règle: 12 paires par carton.',
  },
  {
    id: 'cat-nm-3641',
    code: 'NM',
    designation: 'Femme',
    pointure_debut: 36,
    pointure_fin: 41,
    pointure_text: '36-41',
    paires_par_carton: 12,
    actif: true,
    notes: 'Modèle NM 36-41. Compteur machine: 1 = 1 paire. Règle: 12 paires par carton.',
  },
  {
    id: 'cat-nm-3639',
    code: 'NM',
    designation: 'Kadet',
    pointure_debut: 36,
    pointure_fin: 39,
    pointure_text: '36-39',
    paires_par_carton: 12,
    actif: true,
    notes: 'Modèle NM 36-39. Compteur machine: 1 = 1 paire. Règle: 12 paires par carton.',
  },
  {
    id: 'cat-nm-4044',
    code: 'NM',
    designation: 'Homme',
    pointure_debut: 40,
    pointure_fin: 44,
    pointure_text: '40-44',
    paires_par_carton: 12,
    actif: true,
    notes: 'Modèle NM 40-44. Compteur machine: 1 = 1 paire. Règle: 12 paires par carton.',
  },

  // MODÈLE BC07 (16 paires par carton)
  {
    id: 'cat-bc07-2328',
    code: 'BC07',
    designation: 'Bébé',
    pointure_debut: 23,
    pointure_fin: 28,
    pointure_text: '23-28',
    paires_par_carton: 16,
    actif: true,
    notes: 'Modèle BC07 23-28. 16 paires par carton.',
  },
  {
    id: 'cat-bc07-2835',
    code: 'BC07',
    designation: 'Enfant',
    pointure_debut: 28,
    pointure_fin: 35,
    pointure_text: '28-35',
    paires_par_carton: 16,
    actif: true,
    notes: 'Modèle BC07 28-35. 16 paires par carton.',
  },

  // AUTRES MODÈLES CATALOGUE 2026 (EXTENSIBLE)
  {
    id: 'cat-sb101-3944',
    code: 'SB101',
    designation: 'Homme',
    pointure_debut: 39,
    pointure_fin: 44,
    pointure_text: '39-44',
    paires_par_carton: 24,
    actif: true,
    notes: 'Modèle SB101 39-44. 24 paires par carton.',
  },
  {
    id: 'cat-sb23-3641',
    code: 'SB23',
    designation: 'Femme',
    pointure_debut: 36,
    pointure_fin: 41,
    pointure_text: '36-41',
    paires_par_carton: 24,
    actif: true,
    notes: 'Modèle SB23 36-41. 24 paires par carton.',
  },
  {
    id: 'cat-003-3944',
    code: '003',
    designation: 'Homme Mocassin',
    pointure_debut: 39,
    pointure_fin: 44,
    pointure_text: '39-44',
    paires_par_carton: 14,
    actif: true,
    notes: 'Modèle 003 39-44. 14 paires par carton.',
  },
];

// Helper: Règle automatique de conditionnement (Tous les NM = 12 paires)
export function getPairsPerCarton(modele: string, pointure?: string): number {
  const modClean = (modele || '').trim().toUpperCase();
  if (modClean === 'NM' || modClean.startsWith('NM ') || modClean.includes('NM')) {
    return 12; // Règle stricte CTP: TOUS les modèles NM se calculent à 12 paires par carton
  }

  const found = INITIAL_CTP_CATALOGUE.find((c) => {
    if (pointure) {
      return c.code.toUpperCase() === modClean && (c.pointure_text === pointure || `${c.pointure_debut}-${c.pointure_fin}` === pointure);
    }
    return c.code.toUpperCase() === modClean;
  });

  return found?.paires_par_carton || 12;
}

// =========================================================================
// 2. TABLE cartons (COEUR DU SYSTÈME)
// Règle: Equipe A et B remplissent, Equipe C clôture.
// Données de validation du 15/09/2026:
// EVA 2 - Equipe A: 603 paires saisies -> 50 cartons de 12 FERMÉS par Equipe C + 1 carton OUVERT de 3 paires
// =========================================================================

// =========================================================================
// STRUCTURE OFFICIELLE : EVA 3 - JOUR 15/09/2026 (LOGIQUE FERMÉ UNIQUEMENT)
// Règle stricte CTP : Stock vendable = cartons FERMÉS 12/12 uniquement. Equipe C seule peut fermer.
// Compteurs machine (1 = 1 paire):
// - Team A: 818500 -> 819104 (delta: 604)
// - Team B: 819104 -> 819748 (delta: 644)
// - Team C: 819748 -> 820362 (delta: 614)
// Saisies:
// - Team A: NM 28-35 (184), NM 36-39 (180), NM 40-44 (196) -> Saisi 560 | Écart 44
// - Team B: NM 28-35 (228), NM 36-39 (220), NM 40-44 (152) -> Saisi 600 | Écart 44
// - Team C: NM 28-35 (212), NM 36-39 (204), NM 40-44 (184) -> Saisi 600 | Écart 14
//
// Formules automatiques:
// - Cartons fermés = FLOOR(paires / 12)
// - Reste = paires % 12 = WIP (en cours atelier)
// - Écart compteur vs saisi = Delta Compteur - Total Saisi
// Dashboard EVA 3 cibles :
// - Total Compteur : 1862
// - Total Fermé : 144 cartons (1728 paires vendables)
// - WIP : 32 paires
// - Alerte Écart compteur vs saisi : 44 / 44 / 14 (Total 102 paires)
// =========================================================================

export interface Eva3LineReport {
  modele: string;
  pointure: string;
  paires: number;
  cartonsFermes: number; // FLOOR(paires / 12)
  wipPaires: number; // paires % 12
  pairesFermees: number; // cartonsFermes * 12
}

export interface Eva3TeamReport {
  equipe: 'A' | 'B' | 'C';
  nom: string;
  compteurDebut: number;
  compteurFin: number;
  totalCompteur: number;
  totalSaisi: number;
  ecartCompteur: number;
  alerteEcart: number;
  cartonsFermes: number;
  pairesFermees: number;
  wipPaires: number;
  lignes: Eva3LineReport[];
}

export interface Eva3Jour15Summary {
  machine: string;
  date: string;
  totalCompteur: number;
  totalSaisi: number;
  totalCartonsFermes: number;
  totalPairesFermees: number;
  totalWipPaires: number;
  alerteEcartsTexte: string;
  ecarts: {
    A: number;
    B: number;
    C: number;
    total: number;
  };
  teams: Eva3TeamReport[];
}

export const EVA3_JOUR15_SUMMARY: Eva3Jour15Summary = {
  machine: 'EVA 3',
  date: '2026-09-15',
  totalCompteur: 1862,
  totalSaisi: 1760,
  totalCartonsFermes: 144,
  totalPairesFermees: 1728,
  totalWipPaires: 32,
  alerteEcartsTexte: '44 / 44 / 14',
  ecarts: {
    A: 44,
    B: 44,
    C: 14,
    total: 102,
  },
  teams: [
    {
      equipe: 'A',
      nom: 'Équipe A (Matin)',
      compteurDebut: 818500,
      compteurFin: 819104,
      totalCompteur: 604,
      totalSaisi: 560,
      ecartCompteur: 44,
      alerteEcart: 44,
      cartonsFermes: 46,
      pairesFermees: 552,
      wipPaires: 8,
      lignes: [
        {
          modele: 'NM',
          pointure: '28-35',
          paires: 184,
          cartonsFermes: 15, // FLOOR(184 / 12)
          wipPaires: 4, // 184 % 12
          pairesFermees: 180,
        },
        {
          modele: 'NM',
          pointure: '36-39',
          paires: 180,
          cartonsFermes: 15, // FLOOR(180 / 12)
          wipPaires: 0, // 180 % 12
          pairesFermees: 180,
        },
        {
          modele: 'NM',
          pointure: '40-44',
          paires: 196,
          cartonsFermes: 16, // FLOOR(196 / 12)
          wipPaires: 4, // 196 % 12
          pairesFermees: 192,
        },
      ],
    },
    {
      equipe: 'B',
      nom: 'Équipe B (Après-midi)',
      compteurDebut: 819104,
      compteurFin: 819748,
      totalCompteur: 644,
      totalSaisi: 600,
      ecartCompteur: 44,
      alerteEcart: 44,
      cartonsFermes: 49,
      pairesFermees: 588,
      wipPaires: 12,
      lignes: [
        {
          modele: 'NM',
          pointure: '28-35',
          paires: 228,
          cartonsFermes: 19, // FLOOR(228 / 12)
          wipPaires: 0, // 228 % 12
          pairesFermees: 228,
        },
        {
          modele: 'NM',
          pointure: '36-39',
          paires: 220,
          cartonsFermes: 18, // FLOOR(220 / 12)
          wipPaires: 4, // 220 % 12
          pairesFermees: 216,
        },
        {
          modele: 'NM',
          pointure: '40-44',
          paires: 152,
          cartonsFermes: 12, // FLOOR(152 / 12)
          wipPaires: 8, // 152 % 12
          pairesFermees: 144,
        },
      ],
    },
    {
      equipe: 'C',
      nom: 'Équipe C (Nuit - Seule équipe qui ferme)',
      compteurDebut: 819748,
      compteurFin: 820362,
      totalCompteur: 614,
      totalSaisi: 600,
      ecartCompteur: 14,
      alerteEcart: 14,
      cartonsFermes: 49,
      pairesFermees: 588,
      wipPaires: 12,
      lignes: [
        {
          modele: 'NM',
          pointure: '28-35',
          paires: 212,
          cartonsFermes: 17, // FLOOR(212 / 12)
          wipPaires: 8, // 212 % 12
          pairesFermees: 204,
        },
        {
          modele: 'NM',
          pointure: '36-39',
          paires: 204,
          cartonsFermes: 17, // FLOOR(204 / 12)
          wipPaires: 0, // 204 % 12
          pairesFermees: 204,
        },
        {
          modele: 'NM',
          pointure: '40-44',
          paires: 184,
          cartonsFermes: 15, // FLOOR(184 / 12)
          wipPaires: 4, // 184 % 12
          pairesFermees: 180,
        },
      ],
    },
  ],
};

export const EVA3_JOUR15_RECORDS: Eva3Jour15Record[] = [
  // ÉQUIPE A (Compteur: 818500 → 819104, Saisi: 560, Rebut: 44)
  {
    equipe: 'A',
    compteur_debut: 818500,
    compteur_fin: 819104,
    total_compteur: 604,
    modele: 'NM',
    pointure: '28-35',
    paires_par_carton: 12,
    paires_saisies: 184,
    cartons_fermes: 15,
    wip_reste_paires: 4,
    ecart_compteur_equipe: 44,
    alerte_ecart: 44,
  },
  {
    equipe: 'A',
    compteur_debut: 818500,
    compteur_fin: 819104,
    total_compteur: 604,
    modele: 'NM',
    pointure: '36-39',
    paires_par_carton: 12,
    paires_saisies: 180,
    cartons_fermes: 15,
    wip_reste_paires: 0,
    ecart_compteur_equipe: 44,
    alerte_ecart: 44,
  },
  {
    equipe: 'A',
    compteur_debut: 818500,
    compteur_fin: 819104,
    total_compteur: 604,
    modele: 'NM',
    pointure: '40-44',
    paires_par_carton: 12,
    paires_saisies: 196,
    cartons_fermes: 16,
    wip_reste_paires: 4,
    ecart_compteur_equipe: 44,
    alerte_ecart: 44,
  },
  // ÉQUIPE B (Compteur: 819104 → 819748, Saisi: 600, Rebut: 44)
  {
    equipe: 'B',
    compteur_debut: 819104,
    compteur_fin: 819748,
    total_compteur: 644,
    modele: 'NM',
    pointure: '28-35',
    paires_par_carton: 12,
    paires_saisies: 228,
    cartons_fermes: 19,
    wip_reste_paires: 0,
    ecart_compteur_equipe: 44,
    alerte_ecart: 44,
  },
  {
    equipe: 'B',
    compteur_debut: 819104,
    compteur_fin: 819748,
    total_compteur: 644,
    modele: 'NM',
    pointure: '36-39',
    paires_par_carton: 12,
    paires_saisies: 220,
    cartons_fermes: 18,
    wip_reste_paires: 4,
    ecart_compteur_equipe: 44,
    alerte_ecart: 44,
  },
  {
    equipe: 'B',
    compteur_debut: 819104,
    compteur_fin: 819748,
    total_compteur: 644,
    modele: 'NM',
    pointure: '40-44',
    paires_par_carton: 12,
    paires_saisies: 152,
    cartons_fermes: 12,
    wip_reste_paires: 8,
    ecart_compteur_equipe: 44,
    alerte_ecart: 44,
  },
  // ÉQUIPE C (Compteur: 819748 → 820362, Saisi: 600, Rebut: 14)
  {
    equipe: 'C',
    compteur_debut: 819748,
    compteur_fin: 820362,
    total_compteur: 614,
    modele: 'NM',
    pointure: '28-35',
    paires_par_carton: 12,
    paires_saisies: 212,
    cartons_fermes: 17,
    wip_reste_paires: 8,
    ecart_compteur_equipe: 14,
    alerte_ecart: 14,
  },
  {
    equipe: 'C',
    compteur_debut: 819748,
    compteur_fin: 820362,
    total_compteur: 614,
    modele: 'NM',
    pointure: '36-39',
    paires_par_carton: 12,
    paires_saisies: 204,
    cartons_fermes: 17,
    wip_reste_paires: 0,
    ecart_compteur_equipe: 14,
    alerte_ecart: 14,
  },
  {
    equipe: 'C',
    compteur_debut: 819748,
    compteur_fin: 820362,
    total_compteur: 614,
    modele: 'NM',
    pointure: '40-44',
    paires_par_carton: 12,
    paires_saisies: 184,
    cartons_fermes: 15,
    wip_reste_paires: 4,
    ecart_compteur_equipe: 14,
    alerte_ecart: 14,
  },
];

// Formate le résumé multi-couleurs d'un carton (ex: GRIS ROSE 4 (A) + NOIR 4 (B) + VERT 4 (C) = 12/12)
export function formatCartonMultiColorSummary(carton: Partial<CtpCarton>): string {
  const parts: string[] = [];
  if (carton.couleur_1 && (carton.qte_c1 || 0) > 0) {
    parts.push(`${carton.couleur_1} ${carton.qte_c1} (${carton.equipe_c1 || 'A'})`);
  }
  if (carton.couleur_2 && (carton.qte_c2 || 0) > 0) {
    parts.push(`${carton.couleur_2} ${carton.qte_c2} (${carton.equipe_c2 || 'B'})`);
  }
  if (carton.couleur_3 && (carton.qte_c3 || 0) > 0) {
    parts.push(`${carton.couleur_3} ${carton.qte_c3} (${carton.equipe_c3 || 'C'})`);
  }
  const total = carton.total_paires ?? carton.paires_actuelles ?? 0;
  const max = carton.paires_par_carton || 12;
  const reste = Math.max(0, max - total);
  const nbCouleurs = carton.nb_couleurs ?? (parts.length || 1);

  if (parts.length === 0) {
    return `${carton.id_carton || 'Carton'}: ${total}/${max} paires`;
  }
  return `Carton ${carton.id_carton || ''}: ${parts.join(' + ')} = ${total}/${max} - Reste ${reste} - Couleurs: ${nbCouleurs}/3`;
}

// Générateur complet des 144 cartons fermés + 5 cartons WIP (32 paires) pour EVA 3 Jour 15
export function generateEva3Jour15Cartons(): CtpCarton[] {
  const cartons: CtpCarton[] = [];
  const date = '2026-09-15';

  // Helper pour créer un carton fermé (12/12 avec répartition 3 couleurs A:4, B:4, C:4)
  const addClosedCartons = (
    modele: string,
    pointure: string,
    count: number,
    equipeRemplissage: string,
    startIdx: number
  ) => {
    for (let i = 1; i <= count; i++) {
      const pad = String(startIdx + i).padStart(4, '0');
      const id = `${modele}-${pointure}-EVA3-${equipeRemplissage}-${pad}`;
      cartons.push({
        id_carton: id,
        modele_id: modele,
        pointure_text: pointure,
        paires_par_carton: 12,
        paires_actuelles: 12,
        statut: 'FERME',
        date_creation: `${date} 09:00`,
        date_fermeture: `${date} 22:00`,
        equipe_remplissage: equipeRemplissage,
        equipe_fermeture: 'C', // Equipe C seule peut fermer
        machine_origine: 'EVA 3',
        QR_code: getCartonQrCodeDataUrl(id),
        // Règle métier 3 couleurs par carton
        couleur_1: 'GRIS ROSE',
        qte_c1: 4,
        equipe_c1: 'A',
        couleur_2: 'NOIR',
        qte_c2: 4,
        equipe_c2: 'B',
        couleur_3: 'VERT',
        qte_c3: 4,
        equipe_c3: 'C',
        total_paires: 12,
        nb_equipes_touchees: 3,
        nb_couleurs: 3,
        notes: `EVA 3 - Carton 12/12 Fermé: 4x GRIS ROSE (A) + 4x NOIR (B) + 4x VERT (C) = 12 FERMÉ`,
      });
    }
  };

  // Helper pour créer un carton WIP ouvert (< 12 paires)
  const addWipCarton = (
    modele: string,
    pointure: string,
    paires: number,
    equipeRemplissage: string,
    wipIdSuffix: string
  ) => {
    if (paires <= 0) return;
    const id = `${modele}-${pointure}-EVA3-${equipeRemplissage}-WIP-${wipIdSuffix}`;
    const q1 = Math.min(paires, 4);
    const q2 = paires > 4 ? paires - 4 : 0;
    const nbCouleurs = q2 > 0 ? 2 : 1;
    const nbEquipes = q2 > 0 ? 2 : 1;

    cartons.push({
      id_carton: id,
      modele_id: modele,
      pointure_text: pointure,
      paires_par_carton: 12,
      paires_actuelles: paires,
      statut: 'OUVERT', // WIP ouvert non vendable
      date_creation: `${date} 22:30`,
      equipe_remplissage: equipeRemplissage,
      machine_origine: 'EVA 3',
      QR_code: getCartonQrCodeDataUrl(id),
      // Règle métier 3 couleurs
      couleur_1: 'GRIS ROSE',
      qte_c1: q1,
      equipe_c1: 'A',
      couleur_2: q2 > 0 ? 'NOIR' : undefined,
      qte_c2: q2 > 0 ? q2 : undefined,
      equipe_c2: q2 > 0 ? 'B' : undefined,
      total_paires: paires,
      nb_equipes_touchees: nbEquipes,
      nb_couleurs: nbCouleurs,
      notes: `EVA 3 - Carton reliquat WIP: ${paires}/12 paires (${nbCouleurs}/3 couleurs). Reste ${12 - paires} paires.`,
    });
  };

  // TEAM A : 46 cartons fermés (552 paires) + 8 paires WIP
  // NM 28-35: 184 paires -> 15 fermés + 4 WIP
  addClosedCartons('NM', '28-35', 15, 'A', 0);
  addWipCarton('NM', '28-35', 4, 'A', '01');

  // NM 36-39: 180 paires -> 15 fermés + 0 WIP
  addClosedCartons('NM', '36-39', 15, 'A', 0);

  // NM 40-44: 196 paires -> 16 fermés + 4 WIP
  addClosedCartons('NM', '40-44', 16, 'A', 0);
  addWipCarton('NM', '40-44', 4, 'A', '01');

  // TEAM B : 49 cartons fermés (588 paires) + 12 paires WIP
  // NM 28-35: 228 paires -> 19 fermés + 0 WIP
  addClosedCartons('NM', '28-35', 19, 'B', 15);

  // NM 36-39: 220 paires -> 18 fermés + 4 WIP
  addClosedCartons('NM', '36-39', 18, 'B', 15);
  addWipCarton('NM', '36-39', 4, 'B', '01');

  // NM 40-44: 152 paires -> 12 fermés + 8 WIP
  addClosedCartons('NM', '40-44', 12, 'B', 16);
  addWipCarton('NM', '40-44', 8, 'B', '01');

  // TEAM C : 49 cartons fermés (588 paires) + 12 paires WIP
  // NM 28-35: 212 paires -> 17 fermés + 8 WIP
  addClosedCartons('NM', '28-35', 17, 'C', 34);
  addWipCarton('NM', '28-35', 8, 'C', '01');

  // NM 36-39: 204 paires -> 17 fermés + 0 WIP
  addClosedCartons('NM', '36-39', 17, 'C', 33);

  // NM 40-44: 184 paires -> 15 fermés + 4 WIP
  addClosedCartons('NM', '40-44', 15, 'C', 28);
  addWipCarton('NM', '40-44', 4, 'C', '01');

  return cartons;
}

// Générateur du journal de production officiel EVA 3 Jour 15
export function generateEva3Jour15Journal(): CtpProductionJournal[] {
  const date = '2026-09-15';
  const journal: CtpProductionJournal[] = [
    // TEAM A (Compteur: 818500 -> 819104 = 604, Saisi = 560, Écart = 44)
    {
      id: 'pj-eva3-15-a-01',
      date,
      machine: 'EVA 3',
      equipe: 'A',
      modele_id: 'NM',
      pointure_text: '28-35',
      id_carton: 'NM-28-35-EVA3-A-Lot',
      paires_ajoutees: 184,
      action: 'REMPLISSAGE',
      compteur_debut: 818500,
      compteur_fin: 819104,
      total_compteur: 604,
      ecart_compteur: 44,
      createdAt: `${date}T08:30:00.000Z`,
      observations: 'EVA 3 Jour 15 Équipe A - NM 28-35 : 184 paires (15 cartons fermés + 4 paires WIP). Écart shift : 44 paires.',
    },
    {
      id: 'pj-eva3-15-a-02',
      date,
      machine: 'EVA 3',
      equipe: 'A',
      modele_id: 'NM',
      pointure_text: '36-39',
      id_carton: 'NM-36-39-EVA3-A-Lot',
      paires_ajoutees: 180,
      action: 'REMPLISSAGE',
      compteur_debut: 818500,
      compteur_fin: 819104,
      total_compteur: 604,
      ecart_compteur: 44,
      createdAt: `${date}T11:30:00.000Z`,
      observations: 'EVA 3 Jour 15 Équipe A - NM 36-39 : 180 paires (15 cartons fermés pile).',
    },
    {
      id: 'pj-eva3-15-a-03',
      date,
      machine: 'EVA 3',
      equipe: 'A',
      modele_id: 'NM',
      pointure_text: '40-44',
      id_carton: 'NM-40-44-EVA3-A-Lot',
      paires_ajoutees: 196,
      action: 'REMPLISSAGE',
      compteur_debut: 818500,
      compteur_fin: 819104,
      total_compteur: 604,
      ecart_compteur: 44,
      createdAt: `${date}T14:30:00.000Z`,
      observations: 'EVA 3 Jour 15 Équipe A - NM 40-44 : 196 paires (16 cartons fermés + 4 paires WIP). Total saisie A = 560, Compteur = 604, Écart = 44 paires.',
    },

    // TEAM B (Compteur: 819104 -> 819748 = 644, Saisi = 600, Écart = 44)
    {
      id: 'pj-eva3-15-b-01',
      date,
      machine: 'EVA 3',
      equipe: 'B',
      modele_id: 'NM',
      pointure_text: '28-35',
      id_carton: 'NM-28-35-EVA3-B-Lot',
      paires_ajoutees: 228,
      action: 'REMPLISSAGE',
      compteur_debut: 819104,
      compteur_fin: 819748,
      total_compteur: 644,
      ecart_compteur: 44,
      createdAt: `${date}T16:30:00.000Z`,
      observations: 'EVA 3 Jour 15 Équipe B - NM 28-35 : 228 paires (19 cartons fermés pile).',
    },
    {
      id: 'pj-eva3-15-b-02',
      date,
      machine: 'EVA 3',
      equipe: 'B',
      modele_id: 'NM',
      pointure_text: '36-39',
      id_carton: 'NM-36-39-EVA3-B-Lot',
      paires_ajoutees: 220,
      action: 'REMPLISSAGE',
      compteur_debut: 819104,
      compteur_fin: 819748,
      total_compteur: 644,
      ecart_compteur: 44,
      createdAt: `${date}T18:30:00.000Z`,
      observations: 'EVA 3 Jour 15 Équipe B - NM 36-39 : 220 paires (18 cartons fermés + 4 paires WIP).',
    },
    {
      id: 'pj-eva3-15-b-03',
      date,
      machine: 'EVA 3',
      equipe: 'B',
      modele_id: 'NM',
      pointure_text: '40-44',
      id_carton: 'NM-40-44-EVA3-B-Lot',
      paires_ajoutees: 152,
      action: 'REMPLISSAGE',
      compteur_debut: 819104,
      compteur_fin: 819748,
      total_compteur: 644,
      ecart_compteur: 44,
      createdAt: `${date}T20:30:00.000Z`,
      observations: 'EVA 3 Jour 15 Équipe B - NM 40-44 : 152 paires (12 cartons fermés + 8 paires WIP). Total saisie B = 600, Compteur = 644, Écart = 44 paires.',
    },

    // TEAM C (Compteur: 819748 -> 820362 = 614, Saisi = 600, Écart = 14)
    {
      id: 'pj-eva3-15-c-01',
      date,
      machine: 'EVA 3',
      equipe: 'C',
      modele_id: 'NM',
      pointure_text: '28-35',
      id_carton: 'NM-28-35-EVA3-C-Lot',
      paires_ajoutees: 212,
      action: 'REMPLISSAGE',
      compteur_debut: 819748,
      compteur_fin: 820362,
      total_compteur: 614,
      ecart_compteur: 14,
      createdAt: `${date}T22:30:00.000Z`,
      observations: 'EVA 3 Jour 15 Équipe C - NM 28-35 : 212 paires (17 cartons fermés + 8 paires WIP).',
    },
    {
      id: 'pj-eva3-15-c-02',
      date,
      machine: 'EVA 3',
      equipe: 'C',
      modele_id: 'NM',
      pointure_text: '36-39',
      id_carton: 'NM-36-39-EVA3-C-Lot',
      paires_ajoutees: 204,
      action: 'REMPLISSAGE',
      compteur_debut: 819748,
      compteur_fin: 820362,
      total_compteur: 614,
      ecart_compteur: 14,
      createdAt: `${date}T23:30:00.000Z`,
      observations: 'EVA 3 Jour 15 Équipe C - NM 36-39 : 204 paires (17 cartons fermés pile).',
    },
    {
      id: 'pj-eva3-15-c-03',
      date,
      machine: 'EVA 3',
      equipe: 'C',
      modele_id: 'NM',
      pointure_text: '40-44',
      id_carton: 'NM-40-44-EVA3-C-Lot',
      paires_ajoutees: 184,
      action: 'REMPLISSAGE',
      compteur_debut: 819748,
      compteur_fin: 820362,
      total_compteur: 614,
      ecart_compteur: 14,
      createdAt: `2026-09-16T01:30:00.000Z`,
      observations: 'EVA 3 Jour 15 Équipe C - NM 40-44 : 184 paires (15 cartons fermés + 4 paires WIP). Total saisie C = 600, Compteur = 614, Écart = 14 paires.',
    },

    // CLÔTURE OFFICIELLE PAR ÉQUIPE C
    {
      id: 'pj-eva3-15-c-cloture-officielle',
      date,
      machine: 'EVA 3',
      equipe: 'C',
      modele_id: 'NM',
      pointure_text: 'MULTI',
      id_carton: 'EVA3-144-CARTONS-FERMES',
      paires_ajoutees: 1728, // 144 cartons * 12 paires
      action: 'FERMETURE',
      compteur_debut: 820362,
      compteur_fin: 820362,
      total_compteur: 0,
      ecart_compteur: 0,
      createdAt: `2026-09-16T02:00:00.000Z`,
      observations: 'Clôture officielle et scellage par Équipe C de 144 cartons complets 12/12 sur machine EVA 3 (1728 paires vendables). 32 paires WIP restant ouvertes dans les cartons en atelier.',
    },
  ];

  return journal;
}

// Génération des 50 cartons fermés de NM 40-44 (Données 15/09/2026 Equipe A EVA2)
function generate50ClosedCartonsNm4044(): CtpCarton[] {
  const list: CtpCarton[] = [];
  for (let i = 1; i <= 50; i++) {
    const pad = String(i).padStart(4, '0');
    const id = `NM-40-44-${pad}`;
    list.push({
      id_carton: id,
      modele_id: 'NM',
      pointure_text: '40-44',
      paires_par_carton: 12,
      paires_actuelles: 12,
      statut: 'FERME',
      date_creation: '2026-09-15 08:30',
      date_fermeture: '2026-09-15 16:30',
      equipe_remplissage: 'A',
      equipe_fermeture: 'C',
      machine_origine: 'EVA 2',
      QR_code: getCartonQrCodeDataUrl(id),
      notes: `Carton officiel #NM-40-44-${pad} scellé par Équipe C`,
    });
  }
  return list;
}

export const INITIAL_CTP_CARTONS: CtpCarton[] = [
  // 144 CARTONS FERMÉS + 5 CARTONS WIP (32 PAIRES) - SCÉNARIO OFFICIEL EVA 3 JOUR 15/09/2026
  ...generateEva3Jour15Cartons(),

  // 50 CARTONS FERMÉS NM 40-44 (15/09/2026 Equipe A EVA2 - Clôturé par Équipe C)
  ...generate50ClosedCartonsNm4044(),

  // 1 CARTON OUVERT NM 40-44 (WIP: 3 paires sur 12, reste 9)
  {
    id_carton: 'NM-40-44-0051',
    modele_id: 'NM',
    pointure_text: '40-44',
    paires_par_carton: 12,
    paires_actuelles: 3,
    statut: 'OUVERT',
    date_creation: '2026-09-15 16:15',
    equipe_remplissage: 'A',
    machine_origine: 'EVA 2',
    QR_code: getCartonQrCodeDataUrl('NM-40-44-0051'),
    notes: 'WIP En cours: 3/12 paires. Reste 9 paires à compléter.',
  },

  // Autres modèles pour avoir un écosystème atelier réaliste
  // NM 36-41 Femme: 24 cartons fermés + 1 carton ouvert de 8 paires
  ...Array.from({ length: 24 }, (_, i) => {
    const id = `NM-36-41-${String(i + 1).padStart(4, '0')}`;
    return {
      id_carton: id,
      modele_id: 'NM',
      pointure_text: '36-41',
      paires_par_carton: 12,
      paires_actuelles: 12,
      statut: 'FERME' as const,
      date_creation: '2026-09-15 10:00',
      date_fermeture: '2026-09-15 17:00',
      equipe_remplissage: 'B',
      equipe_fermeture: 'C',
      machine_origine: 'EVA 1',
      QR_code: getCartonQrCodeDataUrl(id),
    };
  }),
  {
    id_carton: 'NM-36-41-0025',
    modele_id: 'NM',
    pointure_text: '36-41',
    paires_par_carton: 12,
    paires_actuelles: 8,
    statut: 'OUVERT',
    date_creation: '2026-09-15 17:10',
    equipe_remplissage: 'B',
    machine_origine: 'EVA 1',
    QR_code: getCartonQrCodeDataUrl('NM-36-41-0025'),
    notes: 'WIP: 8/12 paires. Reste 4.',
  },

  // NM 28-35 Fillette/Garçon: 15 cartons fermés + 1 carton complet en attente de fermeture
  ...Array.from({ length: 15 }, (_, i) => {
    const id = `NM-28-35-${String(i + 1).padStart(4, '0')}`;
    return {
      id_carton: id,
      modele_id: 'NM',
      pointure_text: '28-35',
      paires_par_carton: 12,
      paires_actuelles: 12,
      statut: 'FERME' as const,
      date_creation: '2026-09-16 07:30',
      date_fermeture: '2026-09-16 11:30',
      equipe_remplissage: 'A',
      equipe_fermeture: 'C',
      machine_origine: 'EVA 3',
      QR_code: getCartonQrCodeDataUrl(id),
    };
  }),
  {
    id_carton: 'NM-28-35-0016',
    modele_id: 'NM',
    pointure_text: '28-35',
    paires_par_carton: 12,
    paires_actuelles: 12, // 12/12 complet prêt pour Équipe C !
    statut: 'OUVERT',
    date_creation: '2026-09-16 11:45',
    equipe_remplissage: 'A',
    machine_origine: 'EVA 3',
    QR_code: getCartonQrCodeDataUrl('NM-28-35-0016'),
    notes: 'Carton plein 12/12 en attente de validation et clôture par Équipe C',
  },
  {
    id_carton: 'NM-28-35-0017',
    modele_id: 'NM',
    pointure_text: '28-35',
    paires_par_carton: 12,
    paires_actuelles: 5,
    statut: 'OUVERT',
    date_creation: '2026-09-16 12:00',
    equipe_remplissage: 'A',
    machine_origine: 'EVA 3',
    QR_code: getCartonQrCodeDataUrl('NM-28-35-0017'),
    notes: 'WIP: 5/12 paires. Reste 7.',
  },

  // BC07 28-35 Enfant: 20 cartons fermés (16 paires/carton)
  ...Array.from({ length: 20 }, (_, i) => {
    const id = `BC07-28-35-${String(i + 1).padStart(4, '0')}`;
    return {
      id_carton: id,
      modele_id: 'BC07',
      pointure_text: '28-35',
      paires_par_carton: 16,
      paires_actuelles: 16,
      statut: 'FERME' as const,
      date_creation: '2026-09-14 14:00',
      date_fermeture: '2026-09-14 20:00',
      equipe_remplissage: 'B',
      equipe_fermeture: 'C',
      machine_origine: 'EVA 2',
      QR_code: getCartonQrCodeDataUrl(id),
    };
  }),
];

// =========================================================================
// 3. TABLE production_journal
// Compteur (1 = 1 paire).
// Exemple de validation: 15/09/2026 Equipe A EVA2:
// Compteur début 818500 -> 819104 (delta: 604)
// Paires saisies: 603 -> Ecart: 1 paire (604 - 603)
// =========================================================================
export const INITIAL_CTP_PRODUCTION_JOURNAL: CtpProductionJournal[] = [
  // SCÉNARIO OFFICIEL EVA 3 JOUR 15/09/2026 (EQUIPES A, B, C + FERMETURE EQUIPE C)
  ...generateEva3Jour15Journal(),

  {
    id: 'pj-validation-01',
    date: '2026-09-15',
    machine: 'EVA 2',
    equipe: 'A',
    modele_id: 'NM',
    pointure_text: '40-44',
    id_carton: 'NM-40-44-0001..0051',
    paires_ajoutees: 603,
    action: 'REMPLISSAGE',
    compteur_debut: 818500,
    compteur_fin: 819104,
    total_compteur: 604,
    ecart_compteur: 1, // 604 - 603 = 1 paire de rebut
    createdAt: '2026-09-15T08:30:00.000Z',
    observations: 'Validation test officiel: EVA2 818500 -> 819104 (604 paires réelles). Saisie 603 paires, écart 1 paire. 50 cartons de 12 complétés (600 paires) + 1 carton WIP (3 paires).',
  },
  {
    id: 'pj-validation-02',
    date: '2026-09-15',
    machine: 'EVA 2',
    equipe: 'C',
    modele_id: 'NM',
    pointure_text: '40-44',
    id_carton: 'NM-40-44-0001..0050',
    paires_ajoutees: 600,
    action: 'FERMETURE',
    compteur_debut: 819104,
    compteur_fin: 819104,
    total_compteur: 0,
    ecart_compteur: 0,
    createdAt: '2026-09-15T16:30:00.000Z',
    observations: 'Clôture et scellage officiel par Équipe C de 50 cartons complets (12/12). Stock vendable +50 cartons (600 paires).',
  },
  {
    id: 'pj-003',
    date: '2026-09-15',
    machine: 'EVA 1',
    equipe: 'B',
    modele_id: 'NM',
    pointure_text: '36-41',
    id_carton: 'NM-36-41-0001..0025',
    paires_ajoutees: 296,
    action: 'REMPLISSAGE',
    compteur_debut: 642100,
    compteur_fin: 642400,
    total_compteur: 300,
    ecart_compteur: 4, // 300 - 296 = 4 paires rebutées
    createdAt: '2026-09-15T14:00:00.000Z',
    observations: '4 paires rebutées au démoulage.',
  },
  {
    id: 'pj-004',
    date: '2026-09-15',
    machine: 'EVA 1',
    equipe: 'C',
    modele_id: 'NM',
    pointure_text: '36-41',
    id_carton: 'NM-36-41-0001..0024',
    paires_ajoutees: 288,
    action: 'FERMETURE',
    compteur_debut: 642400,
    compteur_fin: 642400,
    total_compteur: 0,
    ecart_compteur: 0,
    createdAt: '2026-09-15T17:00:00.000Z',
    observations: 'Fermeture de 24 cartons NM 36-41 par Équipe C.',
  },
  {
    id: 'pj-005',
    date: '2026-09-16',
    machine: 'EVA 3',
    equipe: 'A',
    modele_id: 'NM',
    pointure_text: '28-35',
    id_carton: 'NM-28-35-0001..0017',
    paires_ajoutees: 197,
    action: 'REMPLISSAGE',
    compteur_debut: 310200,
    compteur_fin: 310397,
    total_compteur: 197,
    ecart_compteur: 0,
    createdAt: '2026-09-16T09:30:00.000Z',
    observations: 'Production cadencée sur NM Fillette/Garçon.',
  },
];

// Backward compatibility alias
export const INITIAL_CTP_PRODUCTION = INITIAL_CTP_PRODUCTION_JOURNAL;

// =========================================================================
// 4. VUE CALCULÉE AUTOMATIQUE: stock_auto (PAS DE SAISIE MANUELLE)
// Formules backend:
// - stock_ferme_cartons = COUNT(cartons WHERE statut='FERME')
// - stock_ferme_paires = stock_ferme_cartons * paires_par_carton
// - wip_ouvert_paires = SUM(paires_actuelles WHERE statut='OUVERT')
// - wip_ouvert_cartons_equivalent = wip_ouvert_paires / paires_par_carton
// =========================================================================
export function computeStockAutoFromCartons(
  cartons: CtpCarton[],
  catalogue: CtpCatalogueModele[]
): CtpStockAuto[] {
  // Liste des combinaisons distinctes (modele, pointure)
  const keysMap = new Map<string, { modele: string; pointure: string; paires_par_carton: number }>();

  // Init from catalogue
  for (const cat of catalogue) {
    const key = `${cat.code}__${cat.pointure_text || `${cat.pointure_debut}-${cat.pointure_fin}`}`;
    keysMap.set(key, {
      modele: cat.code,
      pointure: cat.pointure_text || `${cat.pointure_debut}-${cat.pointure_fin}`,
      paires_par_carton: cat.paires_par_carton,
    });
  }

  // Also catch any carton that has a custom key
  for (const c of cartons) {
    const key = `${c.modele_id}__${c.pointure_text}`;
    if (!keysMap.has(key)) {
      keysMap.set(key, {
        modele: c.modele_id,
        pointure: c.pointure_text,
        paires_par_carton: c.paires_par_carton,
      });
    }
  }

  const results: CtpStockAuto[] = [];

  keysMap.forEach(({ modele, pointure, paires_par_carton }) => {
    const matchingCartons = cartons.filter(
      (c) => c.modele_id.toUpperCase() === modele.toUpperCase() && c.pointure_text === pointure
    );

    const closedCartons = matchingCartons.filter((c) => c.statut === 'FERME');
    const openCartons = matchingCartons.filter((c) => c.statut === 'OUVERT');

    const stock_ferme_cartons = closedCartons.length;
    const stock_ferme_paires = stock_ferme_cartons * paires_par_carton;

    const wip_ouvert_paires = openCartons.reduce((acc, c) => acc + (Number(c.paires_actuelles) || 0), 0);
    const wip_ouvert_cartons_equivalent = Number((wip_ouvert_paires / paires_par_carton).toFixed(2));

    const cartons_prets_fermeture = openCartons.filter(
      (c) => c.paires_actuelles === c.paires_par_carton
    ).length;

    // Alerte rouge si stock fermé < 10 cartons
    const isAlert = stock_ferme_cartons < 10;

    results.push({
      modele,
      pointure,
      paires_par_carton,
      stock_ferme_cartons,
      stock_ferme_paires,
      wip_ouvert_paires,
      wip_ouvert_cartons_equivalent,
      wip_cartons_count: openCartons.length,
      cartons_prets_fermeture,
      isAlert,
    });
  });

  return results;
}

// Initial Stock for backward compatibility
export const INITIAL_CTP_STOCK = computeStockAutoFromCartons(INITIAL_CTP_CARTONS, INITIAL_CTP_CATALOGUE);

// =========================================================================
// 5. TABLE COMMERCIAL (Commandes & Prix: Voit UNIQUEMENT le stock FERMÉ)
// =========================================================================
export const INITIAL_CTP_ORDERS: CtpCommercialOrder[] = [
  {
    id: 'ord-001',
    client: 'Chaussures El Bahia SARL (Oran)',
    commande: 'CMD-2026-001',
    modele: 'NM',
    pointure: '40-44',
    qte_commandee: 600, // 50 cartons de 12
    qte_produite: 600,
    reste_a_produire: 0,
    prix_paire: 480, // DZD
    prix_carton: 480 * 12, // 5,760 DZD par carton
    total: 600 * 480, // 288,000 DZD
    statut: 'Prêt',
    date: '2026-09-15',
    notes: 'Commande prioritaire NM Homme 40-44. Stock fermé 50 cartons disponible à la livraison.',
    cartons_ids: Array.from({ length: 50 }, (_, i) => `NM-40-44-${String(i + 1).padStart(4, '0')}`),
  },
  {
    id: 'ord-002',
    client: 'Bazar Moderne Alger Centre',
    commande: 'CMD-2026-002',
    modele: 'NM',
    pointure: '36-41',
    qte_commandee: 360, // 30 cartons de 12
    qte_produite: 288, // 24 cartons fermés
    reste_a_produire: 72, // 6 cartons restants
    prix_paire: 450, // DZD
    prix_carton: 450 * 12, // 5,400 DZD
    total: 360 * 450, // 162,000 DZD
    statut: 'En production',
    date: '2026-09-15',
    notes: 'En attente de clôture des 6 cartons restants par Équipe C.',
  },
  {
    id: 'ord-003',
    client: 'Distributeur Footwear Constantine',
    commande: 'CMD-2026-003',
    modele: 'BC07',
    pointure: '28-35',
    qte_commandee: 320, // 20 cartons de 16
    qte_produite: 320,
    reste_a_produire: 0,
    prix_paire: 420,
    prix_carton: 420 * 16,
    total: 320 * 420,
    statut: 'Prêt',
    date: '2026-09-14',
    notes: '20 cartons BC07 fermés et étiquetés avec QR code.',
  },
];

// =========================================================================
// 6. TABLE MAINTENANCE (Compteurs machines, Pannes & Rendement par jour)
// =========================================================================
export const INITIAL_CTP_MAINTENANCE: CtpMaintenanceRecord[] = [
  {
    id: 'mnt-001',
    machine: 'EVA 2',
    date: '2026-09-15',
    compteur_debut: 818500,
    compteur_fin: 819104,
    total: 604,
    panne: 'non',
    duree_arret: 0,
    cause_panne: '',
    photo_compteur: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=500&auto=format&fit=crop&q=60',
    technicien: 'Tarek Mansouri',
    heures_marche: 7.5,
    rendement_paires_heure: 80.5,
    createdAt: '2026-09-15T08:00:00.000Z',
  },
  {
    id: 'mnt-002',
    machine: 'EVA 1',
    date: '2026-09-15',
    compteur_debut: 642100,
    compteur_fin: 642400,
    total: 300,
    panne: 'oui',
    duree_arret: 1.2,
    cause_panne: 'Nettoyage injecteur station 4 et remplacement joint haute pression.',
    photo_compteur: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500&auto=format&fit=crop&q=60',
    technicien: 'Youcef Belkacem',
    heures_marche: 6.3,
    rendement_paires_heure: 47.6,
    createdAt: '2026-09-15T11:30:00.000Z',
  },
  {
    id: 'mnt-003',
    machine: 'EVA 3',
    date: '2026-09-16',
    compteur_debut: 310200,
    compteur_fin: 310397,
    total: 197,
    panne: 'non',
    duree_arret: 0,
    cause_panne: '',
    photo_compteur: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=500&auto=format&fit=crop&q=60',
    technicien: 'Tarek Mansouri',
    heures_marche: 3.5,
    rendement_paires_heure: 56.3,
    createdAt: '2026-09-16T09:00:00.000Z',
  },
];
