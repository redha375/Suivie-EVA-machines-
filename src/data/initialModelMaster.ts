import { ModelMasterItem } from '../types';
import { OFFICIAL_MODEL_MASTER } from './officialProductsCatalog';

/**
 * INITIAL MODEL MASTER DATABASE
 * Source: Base Officielle CTP SMART 2026 (180 Articles / Produits)
 * Clé logique: ARTICLE / MODEL + POINTURE + CATÉGORIE
 * Intégration de la clé dynamique Fiche Journalière / Référence Moule (Dynamic Foreign Key)
 */
export const INITIAL_MODEL_MASTER: ModelMasterItem[] = OFFICIAL_MODEL_MASTER;

/**
 * Normalise une chaîne pour la comparaison stricte
 */
export function normalizeKey(str: string | undefined | null): string {
  if (!str) return '';
  return str
    .trim()
    .toUpperCase()
    .replace(/[\s\-_/]+/g, '');
}

export interface ModelRecognitionResult {
  status: 'EXACT_MATCH' | 'MODELE_A_VERIFIER' | 'NOUVEAU_MODELE' | 'A_VERIFIER';
  matchedItem?: ModelMasterItem;
  paires_par_carton?: number;
  availableVariants?: ModelMasterItem[];
  message: string;
}

export function recognizeModelInMaster(
  modelName: string | undefined | null,
  pointure: string | undefined | null,
  category: string | undefined | null,
  masterList: ModelMasterItem[]
): ModelRecognitionResult {
  const normModel = normalizeKey(modelName);
  const normPointure = normalizeKey(pointure);
  const normCategory = normalizeKey(category);

  if (!normModel) {
    return {
      status: 'A_VERIFIER',
      message: 'Nom de modèle ou code article non renseigné (À VÉRIFIER)',
    };
  }

  // 1. Tous les items correspondant au nom du modèle ou code article
  const matchingModels = masterList.filter((item) => {
    const artNorm = normalizeKey(item.article);
    const nameNorm = normalizeKey(item.model_name);
    return artNorm === normModel || nameNorm === normModel || artNorm.includes(normModel) || normModel.includes(artNorm);
  });

  // Si le modèle n'existe pas du tout
  if (matchingModels.length === 0) {
    return {
      status: 'NOUVEAU_MODELE',
      message: `Article/Modèle "${modelName}" non répertorié dans le catalogue officiel CTP SMART. En attente de validation superviseur.`,
    };
  }

  // 2. Chercher correspondance exacte (Modèle + Pointure + Catégorie)
  const exactMatch = matchingModels.find((item) => {
    const itemPt = normalizeKey(item.pointure);
    const itemCat = normalizeKey(item.category);

    const ptMatches =
      itemPt === normPointure ||
      (normPointure.length === 2 && isSizeInsideRange(normPointure, item.pointure));

    const catMatches = !normCategory || itemCat === normCategory;
    return ptMatches && catMatches;
  });

  if (exactMatch) {
    return {
      status: 'EXACT_MATCH',
      matchedItem: exactMatch,
      paires_par_carton: exactMatch.paires_par_carton,
      message: `Correspondance exacte confirmée : Article ${exactMatch.article} [${exactMatch.designation}] - ${exactMatch.pointure} → ${exactMatch.paires_par_carton} paires/carton. Moule lié : ${exactMatch.reference_moule || 'N/A'}.`,
    };
  }

  // Si un seul article correspond au code
  if (matchingModels.length === 1) {
    const single = matchingModels[0];
    return {
      status: 'EXACT_MATCH',
      matchedItem: single,
      paires_par_carton: single.paires_par_carton,
      message: `Article unique identifié : ${single.article} - ${single.designation} (${single.paires_par_carton} paires/carton).`,
    };
  }

  // 3. Modèle existe mais Pointure ou Catégorie non concordante
  return {
    status: 'MODELE_A_VERIFIER',
    availableVariants: matchingModels,
    message: `MODÈLE À VÉRIFIER : L'article "${modelName}" existe dans le catalogue mais la pointure "${pointure || 'N/A'}" ou catégorie "${category || 'N/A'}" ne correspond à aucune configuration enregistrée.`,
  };
}

/**
 * Vérifie si une pointure unique (ex: "39") est incluse dans une plage (ex: "36/41")
 */
function isSizeInsideRange(sizeStr: string, rangeStr: string): boolean {
  const sizeNum = parseInt(sizeStr, 10);
  if (isNaN(sizeNum)) return false;

  const parts = rangeStr.split(/[/_-]/).map((s) => parseInt(s.trim(), 10));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    const min = Math.min(parts[0], parts[1]);
    const max = Math.max(parts[0], parts[1]);
    return sizeNum >= min && sizeNum <= max;
  }
  return false;
}
