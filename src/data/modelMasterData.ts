import { ModelMasterItem, FicheProductionLine } from '../types';
import { OFFICIAL_MODEL_MASTER } from './officialProductsCatalog';

/**
 * CTP SMART — MODEL MASTER OFFICIEL 2026
 * Référentiel Central des 180 Articles et Produits issu de la base officielle
 * 
 * Clé Logique Unique : ARTICLE / MODEL + POINTURE + CATÉGORIE
 * Intégration de la clé dynamique Fiche Journalière / Référence Moule (Dynamic Foreign Key)
 */

export const INITIAL_MODEL_MASTER: ModelMasterItem[] = OFFICIAL_MODEL_MASTER;

/**
 * Normalise une chaîne pour comparaison robuste (ex: '021 C' -> '021C', 'SB-14-PR' -> 'SB14PR')
 */
export function normalizeString(str?: string | null): string {
  if (!str) return '';
  return str
    .trim()
    .toUpperCase()
    .replace(/[\s\-_/]+/g, '');
}

/**
 * Normalise la pointure (ex: '36-41' -> '36/41', '36 - 41' -> '36/41')
 */
export function normalizePointure(p?: string | null): string {
  if (!p) return '';
  return p
    .trim()
    .replace(/\s+/g, '')
    .replace(/[-_]/g, '/');
}

/**
 * Clé logique unique : ARTICLE + POINTURE + CATÉGORIE
 */
export function getLogicalKey(modelName: string, pointure: string, category: string): string {
  return `${normalizeString(modelName)}|${normalizePointure(pointure)}|${normalizeString(category)}`;
}

/**
 * Génère ou récupère la clé dynamique Fiche Journalière / Référence Moule
 */
export function getDynamicFicheReference(article: string, dateStr?: string, machineStr?: string) {
  const clean = normalizeString(article) || 'ART';
  const d = dateStr || new Date().toISOString().substring(0, 10);
  const m = machineStr || 'EVA 1';
  return {
    reference_moule: `M-${clean}`,
    fiche_journaliere_ref: `FJ-${d.replace(/-/g, '')}-${clean}`,
    fiche_journaliere_date: d,
    fiche_journaliere_machine: m,
    is_dynamic_linked: true,
  };
}

/**
 * Recherche exacte ou approchée dans ModelMaster selon les spécifications :
 * 1. Chercher correspondance exacte (Article/Model + Pointure + Catégorie)
 * 2. Si Model existe mais Pointure/Catégorie non concordante -> MODÈLE À VÉRIFIER
 * 3. Si Model n'existe pas -> NOUVEAU MODÈLE
 */
export function lookupInModelMaster(
  list: ModelMasterItem[],
  modelInput: string,
  pointureInput: string,
  categoryInput?: string
): {
  status: 'EXACT_MATCH' | 'MODELE_A_VERIFIER' | 'NOUVEAU_MODELE' | 'A_VERIFIER';
  item: ModelMasterItem | null;
  candidates: ModelMasterItem[];
  message: string;
} {
  const normModel = normalizeString(modelInput);
  const normPt = normalizePointure(pointureInput);
  const normCat = normalizeString(categoryInput || '');

  if (!normModel || normModel === 'VIDE' || normModel === 'NULL' || normModel === 'INCONNU') {
    return {
      status: 'A_VERIFIER',
      item: null,
      candidates: [],
      message: 'Modèle ou article non lisible ou manquant sur la fiche (À VÉRIFIER).',
    };
  }

  // Tous les enregistrements correspondant au même code article ou nom de modèle
  const modelMatches = list.filter((m) => {
    const artNorm = normalizeString(m.article);
    const nameNorm = normalizeString(m.model_name);
    return artNorm === normModel || nameNorm === normModel || artNorm.includes(normModel) || normModel.includes(artNorm);
  });

  if (modelMatches.length === 0) {
    return {
      status: 'NOUVEAU_MODELE',
      item: null,
      candidates: [],
      message: `Article/Modèle "${modelInput}" non répertorié dans le catalogue officiel (180 articles). En attente de validation superviseur (NOUVEAU MODÈLE).`,
    };
  }

  // 1. Chercher correspondance exacte complète (Model + Pt + Cat)
  const exact = modelMatches.find((m) => {
    const ptMatch = normalizePointure(m.pointure) === normPt;
    const catMatch = !normCat || normalizeString(m.category) === normCat;
    return ptMatch && catMatch;
  });

  if (exact) {
    return {
      status: 'EXACT_MATCH',
      item: exact,
      candidates: modelMatches,
      message: `Correspondance exacte confirmée : Article ${exact.article} - ${exact.designation} [${exact.category} - ${exact.pointure}]. Conditionnement : ${exact.paires_par_carton} paires/carton. Moule lié : ${exact.reference_moule || 'N/A'}.`,
    };
  }

  // 2. Chercher si la pointure seule correspond
  const pointureMatch = modelMatches.find((m) => normalizePointure(m.pointure) === normPt);
  if (pointureMatch) {
    return {
      status: 'EXACT_MATCH',
      item: pointureMatch,
      candidates: modelMatches,
      message: `Correspondance trouvée : Article ${pointureMatch.article} [${pointureMatch.designation}] / Pt. ${pointureMatch.pointure} (${pointureMatch.paires_par_carton} p/carton).`,
    };
  }

  // Si on a un seul candidat pour ce modèle, on peut le proposer
  if (modelMatches.length === 1) {
    const single = modelMatches[0];
    return {
      status: 'EXACT_MATCH',
      item: single,
      candidates: modelMatches,
      message: `Article unique identifié : ${single.article} - ${single.designation} (${single.paires_par_carton} p/carton).`,
    };
  }

  // 3. Le modèle existe mais la pointure ou la catégorie ne correspond pas
  const knownCombinations = modelMatches
    .map((m) => `${m.category} ${m.pointure} (${m.paires_par_carton} p/ctn)`)
    .join(', ');

  return {
    status: 'MODELE_A_VERIFIER',
    item: null,
    candidates: modelMatches,
    message: `Modèle "${modelInput}" reconnu, mais combinaison Pt. "${pointureInput}" / Cat. "${categoryInput || 'N/A'}" non standard. Référencé en : ${knownCombinations}. (MODÈLE À VÉRIFIER).`,
  };
}

/**
 * Évalue une ligne de production OCR contre le ModelMaster
 */
export function evaluateProductionLine(
  line: FicheProductionLine,
  masterList: ModelMasterItem[]
): FicheProductionLine {
  const lookup = lookupInModelMaster(masterList, line.modele, line.pointure, line.category);
  const updatedLine = { ...line };

  updatedLine.model_recognition_status = lookup.status;
  const currentAlerts = [...(updatedLine.alerts || [])];

  if (lookup.status === 'EXACT_MATCH' && lookup.item) {
    updatedLine.paires_par_carton = lookup.item.paires_par_carton;
    updatedLine.designation = lookup.item.designation;
    // Si la ligne n'avait pas de référence moule, on injecte celle du ModelMaster
    if (!updatedLine.reference_moule && lookup.item.reference_moule) {
      updatedLine.reference_moule = lookup.item.reference_moule;
    }
    if (updatedLine.cartons_remplis !== undefined && updatedLine.cartons_remplis !== null) {
      updatedLine.paires_produites_calculees = updatedLine.cartons_remplis * lookup.item.paires_par_carton;
    }
  } else if (lookup.status === 'MODELE_A_VERIFIER') {
    currentAlerts.push(lookup.message);
    updatedLine.status = 'À VÉRIFIER';
  } else if (lookup.status === 'NOUVEAU_MODELE') {
    currentAlerts.push(lookup.message);
    updatedLine.status = 'NOUVEAU MODÈLE';
  }

  updatedLine.alerts = Array.from(new Set(currentAlerts));
  return updatedLine;
}
