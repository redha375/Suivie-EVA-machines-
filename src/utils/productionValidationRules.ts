import {
  FicheProductionLine,
  FicheRecordStatus,
  ModelMasterItem,
} from '../types';
import { recognizeModelInMaster, ModelRecognitionResult } from '../data/initialModelMaster';

export interface EvaluatedLineResult {
  line: FicheProductionLine;
  modelRecognition: ModelRecognitionResult;
  paires_par_carton: number | null;
  paires_produites_calculees: number | null;
  status: FicheRecordStatus;
  alerts: string[];
  notes: string[];
}

/**
 * Applique strictement les RÈGLES D'OR CTP SMART sur une ligne de production:
 * 1. Ne jamais deviner.
 * 2. Ne jamais inventer.
 * 3. Ne jamais corriger silencieusement.
 * 4. Ne jamais transformer une case vide en zéro.
 * 5. Ne jamais considérer Production = Production Bonne sans preuve.
 * 6. Cartons ouverts != Cartons remplis.
 * 7. Modèle non répertorié = NOUVEAU MODÈLE.
 * 8. Incohérence de calcul = CONFLIT ou ALERT.
 */
export function evaluateProductionLine(
  rawLine: FicheProductionLine,
  masterList: ModelMasterItem[]
): EvaluatedLineResult {
  const alerts: string[] = [];
  const notes: string[] = [];

  // 1. Reconnaissance du Modèle dans ModelMaster
  const modelRecognition = recognizeModelInMaster(
    rawLine.modele,
    rawLine.pointure,
    rawLine.category,
    masterList
  );

  let paires_par_carton: number | null = rawLine.paires_par_carton ?? null;
  let status: FicheRecordStatus = 'VALIDÉ';

  if (modelRecognition.status === 'EXACT_MATCH') {
    paires_par_carton = modelRecognition.paires_par_carton ?? null;
    notes.push(modelRecognition.message);
  } else if (modelRecognition.status === 'MODELE_A_VERIFIER') {
    status = 'À VÉRIFIER';
    alerts.push(`⚠️ ${modelRecognition.message}`);
  } else if (modelRecognition.status === 'NOUVEAU_MODELE') {
    status = 'NOUVEAU MODÈLE';
    alerts.push(`ℹ️ ${modelRecognition.message}`);
  } else {
    status = 'À VÉRIFIER';
    alerts.push(`⚠️ ${modelRecognition.message}`);
  }

  // 2. Calcul des paires produites à partir des cartons remplis
  // RÈGLE : Paires produites = Cartons remplis × Paires par carton
  // Cartons ouverts NE SONT PAS des cartons remplis.
  let paires_produites_calculees: number | null = null;
  const cartonsRemplis = rawLine.cartons_remplis;
  const cartonsOuverts = rawLine.cartons_ouverts;
  const quantiteRestante = rawLine.quantite_restante;

  if (cartonsRemplis !== null && cartonsRemplis !== undefined && paires_par_carton !== null) {
    paires_produites_calculees = cartonsRemplis * paires_par_carton;
    notes.push(
      `Calcul cartons pleins : ${cartonsRemplis} cartons × ${paires_par_carton} paires = ${paires_produites_calculees} paires.`
    );
  }

  if (cartonsOuverts !== null && cartonsOuverts !== undefined && cartonsOuverts > 0) {
    alerts.push(
      `📦 ${cartonsOuverts} carton(s) ouvert(s) / entamé(s) détecté(s). Non comptabilisé(s) dans les cartons pleins conformément à la règle stricte.`
    );
  }

  if (quantiteRestante !== null && quantiteRestante !== undefined && quantiteRestante > 0) {
    notes.push(`Quantité en vrac / reliquat : +${quantiteRestante} paires.`);
  }

  // 3. RÈGLE D'OR CRITIQUE CTP SMART : "CAS DE LA FICHE ÉQUIPE A"
  // Si la case "Paires conformes / Production bonne" est vide:
  // NE JAMAIS LA REMPLIR AUTOMATIQUEMENT AVEC LE TOTAL PRODUIT!
  // Production bonne reste null, et statut = À VÉRIFIER.
  const prodBonne = rawLine.paires_conformes;
  const prodTotale = rawLine.quantite_production ?? paires_produites_calculees;

  if (prodBonne === null || prodBonne === undefined) {
    alerts.push(
      `⚠️ RÈGLE CRITIQUE : "Paires conformes / Production bonne" non renseignée sur la fiche. Ne JAMAIS présumer que la production est 100% conforme. Statut : À VÉRIFIER.`
    );
    if (status !== 'NOUVEAU MODÈLE') {
      status = 'À VÉRIFIER';
    }
  }

  // 4. Contrôle de cohérence : Production bonne + Rebut = Production totale
  const rebut = rawLine.rebut_defauts;
  if (
    prodBonne !== null &&
    prodBonne !== undefined &&
    rebut !== null &&
    rebut !== undefined &&
    prodTotale !== null &&
    prodTotale !== undefined
  ) {
    const totalSomme = prodBonne + rebut;
    if (totalSomme !== prodTotale) {
      status = 'CONFLIT';
      alerts.push(
        `🚨 CONFLIT D'INCOHÉRENCE : Production bonne (${prodBonne}) + Rebut (${rebut}) = ${totalSomme} paires ≠ Production totale déclarée (${prodTotale} paires). Écart de ${Math.abs(
          totalSomme - prodTotale
        )} paires !`
      );
    } else {
      notes.push(`Équilibre vérifié : ${prodBonne} conformes + ${rebut} rebuts = ${prodTotale} totale.`);
    }
  }

  // 5. Contrôle des compteurs machine (si disponibles)
  if (rawLine.compteur_entree && rawLine.compteur_sortie) {
    const cIn = parseInt(rawLine.compteur_entree.replace(/\D/g, ''), 10);
    const cOut = parseInt(rawLine.compteur_sortie.replace(/\D/g, ''), 10);
    if (!isNaN(cIn) && !isNaN(cOut)) {
      if (cOut < cIn) {
        status = 'CONFLIT';
        alerts.push(
          `🚨 CONFLIT COMPTEUR : Compteur sortie (${cOut}) inférieur au compteur entrée (${cIn}).`
        );
      } else {
        const delta = cOut - cIn;
        notes.push(`Delta compteur machine : ${delta} cycles.`);
      }
    }
  }

  // Fusionner la ligne avec les valeurs calculées
  const updatedLine: FicheProductionLine = {
    ...rawLine,
    paires_par_carton,
    paires_produites_calculees,
    status,
    model_recognition_status: modelRecognition.status,
    alerts,
  };

  return {
    line: updatedLine,
    modelRecognition,
    paires_par_carton,
    paires_produites_calculees,
    status,
    alerts,
    notes,
  };
}
