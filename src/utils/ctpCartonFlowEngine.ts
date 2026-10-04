import {
  CtpCarton,
  CtpCartonFlowOperation,
  CtpCartonClosureValidation,
  CtpCartonEtapeLog,
} from '../types';
import { getCartonQrCodeDataUrl } from './ctpQrHelper';

/**
 * Moteur de calcul dynamique du flux physique réel des cartons (CTP SMART)
 * Principe fondamental :
 * - Un carton est un objet physique unique qui traverse 3 étapes/couleurs.
 * - Il conserve son ID et son état d'une étape à l'autre.
 * - Il ne doit JAMAIS être compté comme un nouveau carton à chaque passage.
 * - Tout carton incomplet reste OUVERT.
 * - Ne jamais calculer automatiquement les cartons fermés à partir des paires.
 */

// Évaluation stricte des 5 conditions de clôture
export function evaluateCartonClosure(
  carton: CtpCarton,
  options?: {
    authorizedOperator?: string;
    overrideQualityCheck?: boolean;
    overrideConfiguration?: boolean;
  }
): CtpCartonClosureValidation {
  const blockReasons: string[] = [];

  // Condition 1 : Toutes les couleurs / étapes prévues pour le modèle sont réalisées
  const nbEtapesRequises = carton.nb_etapes_requises || 3;
  const currentStep = carton.etape_actuelle || 1;
  const filledColors = [carton.couleur_1, carton.couleur_2, carton.couleur_3].filter(Boolean).length;
  const allStepsCompleted = currentStep >= nbEtapesRequises && filledColors >= nbEtapesRequises;

  if (!allStepsCompleted) {
    blockReasons.push(
      `Étape incomplète : ${filledColors}/${nbEtapesRequises} couleur(s) réalisée(s) (Étape ${currentStep}/${nbEtapesRequises}). Toutes les étapes prévues doivent être achevées.`
    );
  }

  // Condition 2 : La quantité de paires requise est complète
  const maxPairs = carton.paires_par_carton || 12;
  const currentPairs = carton.total_paires ?? carton.paires_actuelles ?? 0;
  const requiredPairsComplete = currentPairs >= maxPairs;

  if (!requiredPairsComplete) {
    blockReasons.push(
      `Quantité de paires incomplète : ${currentPairs}/${maxPairs} paires. Un carton incomplet reste OUVERT.`
    );
  }

  // Condition 3 : La configuration modèle/pointure est respectée
  const hasModelAndSize = Boolean(carton.modele_id && carton.pointure_text);
  const modelSizeRespected = hasModelAndSize && (carton.configuration_validee !== false);

  if (!modelSizeRespected) {
    blockReasons.push('La configuration modèle / pointure / moule doit être vérifiée et conforme.');
  }

  // Condition 4 : Le contrôle requis est validé
  const qualityCheckPassed = Boolean(carton.controle_qualite_valide || options?.overrideQualityCheck);

  if (!qualityCheckPassed) {
    blockReasons.push('Contrôle qualité requis non validé : l\'inspection de conformité visuelle doit être approuvée.');
  }

  // Condition 5 : L'opérateur autorisé confirme la clôture
  const operatorName = options?.authorizedOperator || carton.cloture_confirmee_par;
  const authorizedOperatorApproved = Boolean(operatorName && operatorName.trim().length > 0);

  if (!authorizedOperatorApproved) {
    blockReasons.push('Validation de clôture requise par un opérateur ou chef d\'équipe autorisé.');
  }

  const canClose =
    allStepsCompleted &&
    requiredPairsComplete &&
    modelSizeRespected &&
    qualityCheckPassed &&
    authorizedOperatorApproved;

  return {
    allStepsCompleted,
    requiredPairsComplete,
    modelSizeRespected,
    qualityCheckPassed,
    authorizedOperatorApproved,
    canClose,
    blockReasons,
  };
}

/**
 * Calcul dynamique pour une opération de flux physique réel :
 * Prend en entrée :
 * - Le stock existant de cartons
 * - L'étape ciblée (1, 2, ou 3)
 * - Le nombre de cartons déclarés par l'équipe
 *
 * Applique la règle de non-double comptage :
 * - cartonsRecuperes = Min(cartonsADeclarer, cartonsOuvertsEtapePrecedente)
 * - nouveauxCartons = Max(0, cartonsADeclarer - cartonsOuvertsEtapePrecedente)
 * - cartonsCompletes = cartonsRecuperes
 * - cartonsRestantOuverts = restants à l'étape précédente + nouveaux cartons
 */
export function processCartonFlowStep(params: {
  existingCartons: CtpCarton[];
  modele: string;
  pointure: string;
  etapeNumero: 1 | 2 | 3;
  couleurNom: string;
  cartonsADeclarer: number;
  equipe: string;
  machine: string;
  stationNumber?: number;
  date: string;
  operateur: string;
  observations?: string;
  pairesParCarton?: number;
}): {
  updatedCartons: CtpCarton[];
  operation: CtpCartonFlowOperation;
  affectedCartonIds: string[];
} {
  const {
    existingCartons,
    modele,
    pointure,
    etapeNumero,
    couleurNom,
    cartonsADeclarer,
    equipe,
    machine,
    stationNumber = 1,
    date,
    operateur,
    observations,
    pairesParCarton = 12,
  } = params;

  const modClean = modele.trim().toUpperCase();
  const pairsPerBox = modClean.includes('NM') ? 12 : pairesParCarton;

  // Cartons ouverts éligibles pour cette étape
  // Pour l'Étape 1 : nouveaux cartons
  // Pour l'Étape 2 : cartons qui sont à l'étape 1
  // Pour l'Étape 3 : cartons qui sont à l'étape 2
  const targetPreviousStep = (etapeNumero - 1) as 0 | 1 | 2;

  // Trouver les cartons ouverts du même modèle et pointure en attente de cette étape
  const availableOpenCartons = existingCartons.filter((c) => {
    if (c.statut !== 'OUVERT') return false;
    if (c.modele_id.toUpperCase() !== modClean) return false;
    if (c.pointure_text !== pointure) return false;

    if (etapeNumero === 1) {
      // Étape 1 : carton vide ou nouveau
      return (c.etape_actuelle || 0) < 1;
    } else if (etapeNumero === 2) {
      return (c.etape_actuelle || 1) === 1;
    } else if (etapeNumero === 3) {
      return (c.etape_actuelle || 1) === 2;
    }
    return false;
  });

  let cartonsRecuperes = 0;
  let nouveauxCartons = 0;
  let cartonsCompletes = 0;
  let cartonsRestantOuverts = 0;

  const affectedCartonIds: string[] = [];
  const updatedCartonsMap = new Map<string, CtpCarton>();
  existingCartons.forEach((c) => updatedCartonsMap.set(c.id_carton, { ...c }));

  if (etapeNumero === 1) {
    // Étape 1 : Tous les cartons déclarés sont physiquement nouveaux (mis en circulation)
    // S'il y a déjà des cartons vides pré-enregistrés, on les récupère
    const toRetrieve = Math.min(cartonsADeclarer, availableOpenCartons.length);
    const toCreateNew = Math.max(0, cartonsADeclarer - availableOpenCartons.length);

    cartonsRecuperes = toRetrieve;
    nouveauxCartons = toCreateNew;
    cartonsCompletes = cartonsADeclarer; // Ont complété la couleur 1
    cartonsRestantOuverts = cartonsADeclarer; // Restent ouverts car les étapes 2 et 3 ne sont pas faites

    // Mettre à jour les récupérés
    for (let i = 0; i < toRetrieve; i++) {
      const c = availableOpenCartons[i];
      const log: CtpCartonEtapeLog = {
        etape: 1,
        couleurNom,
        equipe,
        date,
        pairesAjoutees: pairsPerBox,
        machine,
        station: stationNumber,
        operateur,
      };
      const updated: CtpCarton = {
        ...c,
        etape_actuelle: 1,
        couleur_1: couleurNom,
        qte_c1: pairsPerBox,
        equipe_c1: equipe,
        total_paires: pairsPerBox,
        paires_actuelles: pairsPerBox,
        nb_couleurs: 1,
        station_actuelle: stationNumber,
        etapes_historique: [...(c.etapes_historique || []), log],
      };
      updatedCartonsMap.set(c.id_carton, updated);
      affectedCartonIds.push(c.id_carton);
    }

    // Créer les nouveaux cartons
    const currentTotalForModel = existingCartons.filter(
      (c) => c.modele_id.toUpperCase() === modClean && c.pointure_text === pointure
    ).length;
    let seq = currentTotalForModel + 1;

    for (let i = 0; i < toCreateNew; i++) {
      const idCarton = `${modClean}-${pointure}-${String(seq++).padStart(4, '0')}`;
      const log: CtpCartonEtapeLog = {
        etape: 1,
        couleurNom,
        equipe,
        date,
        pairesAjoutees: pairsPerBox,
        machine,
        station: stationNumber,
        operateur,
      };
      const newBox: CtpCarton = {
        id_carton: idCarton,
        modele_id: modClean,
        pointure_text: pointure,
        paires_par_carton: pairsPerBox,
        paires_actuelles: pairsPerBox,
        total_paires: pairsPerBox,
        statut: 'OUVERT', // Reste OUVERT tant que les 3 étapes ne sont pas finies et validées
        etape_actuelle: 1,
        nb_etapes_requises: 3,
        couleur_1: couleurNom,
        qte_c1: pairsPerBox,
        equipe_c1: equipe,
        nb_couleurs: 1,
        nb_equipes_touchees: 1,
        date_creation: `${date} 08:00`,
        machine_origine: machine,
        station_actuelle: stationNumber,
        QR_code: getCartonQrCodeDataUrl(idCarton),
        controle_qualite_valide: false,
        configuration_validee: true,
        etapes_historique: [log],
        notes: `Étape 1 (${couleurNom}) traitée par Équipe ${equipe} sur ${machine} St.${stationNumber}.`,
      };
      updatedCartonsMap.set(idCarton, newBox);
      affectedCartonIds.push(idCarton);
    }
  } else {
    // Étape 2 ou 3 : Récupération stricte des cartons ouverts de l'étape précédente
    const toRetrieve = Math.min(cartonsADeclarer, availableOpenCartons.length);
    const toCreateNew = Math.max(0, cartonsADeclarer - availableOpenCartons.length);

    cartonsRecuperes = toRetrieve;
    nouveauxCartons = toCreateNew;
    cartonsCompletes = toRetrieve; // Les cartons récupérés ont maintenant franchi l'étape
    // Les cartons restants ouverts : le surplus de nouveaux cartons + les cartons de l'étape précédente non traités
    const leftoverPrevious = availableOpenCartons.length - toRetrieve;
    cartonsRestantOuverts = leftoverPrevious + toCreateNew;

    // Avancement des cartons récupérés (conservation stricte de l'identité et de l'état)
    for (let i = 0; i < toRetrieve; i++) {
      const c = availableOpenCartons[i];
      const log: CtpCartonEtapeLog = {
        etape: etapeNumero,
        couleurNom,
        equipe,
        date,
        pairesAjoutees: pairsPerBox,
        machine,
        station: stationNumber,
        operateur,
      };

      const updated: CtpCarton = {
        ...c,
        etape_actuelle: etapeNumero,
        station_actuelle: stationNumber,
        etapes_historique: [...(c.etapes_historique || []), log],
      };

      if (etapeNumero === 2) {
        updated.couleur_2 = couleurNom;
        updated.qte_c2 = pairsPerBox;
        updated.equipe_c2 = equipe;
        updated.nb_couleurs = 2;
        updated.nb_equipes_touchees = new Set([c.equipe_c1, equipe].filter(Boolean)).size;
      } else if (etapeNumero === 3) {
        updated.couleur_3 = couleurNom;
        updated.qte_c3 = pairsPerBox;
        updated.equipe_c3 = equipe;
        updated.nb_couleurs = 3;
        updated.nb_equipes_touchees = new Set([c.equipe_c1, c.equipe_c2, equipe].filter(Boolean)).size;
        // Carton prêt pour inspection qualité & confirmation de clôture
      }

      updatedCartonsMap.set(c.id_carton, updated);
      affectedCartonIds.push(c.id_carton);
    }

    // S'il y a de nouveaux cartons injectés directement à ce stade (ex: 6 nouveaux ouverts en C1)
    if (toCreateNew > 0) {
      const currentTotalForModel = existingCartons.filter(
        (c) => c.modele_id.toUpperCase() === modClean && c.pointure_text === pointure
      ).length;
      let seq = currentTotalForModel + 1;

      for (let i = 0; i < toCreateNew; i++) {
        const idCarton = `${modClean}-${pointure}-${String(seq++).padStart(4, '0')}`;
        const log: CtpCartonEtapeLog = {
          etape: 1, // Commencé comme nouveau carton
          couleurNom,
          equipe,
          date,
          pairesAjoutees: pairsPerBox,
          machine,
          station: stationNumber,
          operateur,
        };
        const newBox: CtpCarton = {
          id_carton: idCarton,
          modele_id: modClean,
          pointure_text: pointure,
          paires_par_carton: pairsPerBox,
          paires_actuelles: pairsPerBox,
          total_paires: pairsPerBox,
          statut: 'OUVERT',
          etape_actuelle: 1,
          nb_etapes_requises: 3,
          couleur_1: couleurNom,
          qte_c1: pairsPerBox,
          equipe_c1: equipe,
          nb_couleurs: 1,
          date_creation: `${date} 14:00`,
          machine_origine: machine,
          station_actuelle: stationNumber,
          QR_code: getCartonQrCodeDataUrl(idCarton),
          controle_qualite_valide: false,
          configuration_validee: true,
          etapes_historique: [log],
          notes: `Nouveau carton ouvert lors du flux par Équipe ${equipe}.`,
        };
        updatedCartonsMap.set(idCarton, newBox);
        affectedCartonIds.push(idCarton);
      }
    }
  }

  const operation: CtpCartonFlowOperation = {
    id: `cfo-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    date,
    heure: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    equipe,
    machine,
    stationNumber,
    modele: modClean,
    pointure,
    etapeNumero,
    couleurNom,
    cartonsRecuperes,
    nouveauxCartons,
    cartonsCompletes,
    cartonsRestantOuverts,
    pairesTotalesTraitees: cartonsADeclarer * pairsPerBox,
    cartonsIdsTraites: affectedCartonIds,
    observations: observations || `Équipe ${equipe} : ${cartonsADeclarer} cartons traités (Étape ${etapeNumero} - ${couleurNom}).`,
    operateur,
    createdAt: new Date().toISOString(),
  };

  return {
    updatedCartons: Array.from(updatedCartonsMap.values()),
    operation,
    affectedCartonIds,
  };
}

/**
 * Scénario modèle correspondant exactement à l'exemple de l'utilisateur :
 * - Équipe A traite 30 cartons -> Couleur 1 -> 30 cartons ouverts C1
 * - Étape suivante traite 36 cartons -> ajoute Couleur 2 aux 30 cartons existants -> 30 cartons complétés + 6 cartons ouverts C1
 * - Équipe S traite ensuite 40 cartons -> utilise les 6 cartons ouverts existants + 34 nouveaux cartons -> 6 cartons complétés + 34 nouveaux cartons ouverts
 */
export function generateUserExampleScenario(): {
  cartons: CtpCarton[];
  operations: CtpCartonFlowOperation[];
} {
  const date = '2026-09-19';
  let currentCartons: CtpCarton[] = [];
  const operations: CtpCartonFlowOperation[] = [];

  // 1. Équipe A traite 30 cartons -> Couleur 1 -> 30 cartons ouverts C1
  const op1 = processCartonFlowStep({
    existingCartons: currentCartons,
    modele: 'NM',
    pointure: '40-44',
    etapeNumero: 1,
    couleurNom: 'Couleur 1 (Noir Base)',
    cartonsADeclarer: 30,
    equipe: 'A',
    machine: 'EVA 1',
    stationNumber: 1,
    date,
    operateur: 'Chef Équipe A (Mourad)',
    observations: 'Traitement Équipe A : 30 cartons Couleur 1. 30 cartons ouverts C1 en attente de Couleur 2.',
  });
  currentCartons = op1.updatedCartons;
  operations.push(op1.operation);

  // 2. Étape suivante (ex: Équipe B) traite 36 cartons -> ajoute Couleur 2 aux 30 cartons existants -> 30 cartons complétés + 6 cartons ouverts C1
  const op2 = processCartonFlowStep({
    existingCartons: currentCartons,
    modele: 'NM',
    pointure: '40-44',
    etapeNumero: 2,
    couleurNom: 'Couleur 2 (Insert Rouge)',
    cartonsADeclarer: 36,
    equipe: 'B',
    machine: 'EVA 2',
    stationNumber: 4,
    date,
    operateur: 'Chef Équipe B (Khaled)',
    observations: 'Étape suivante : 36 cartons traités. 30 cartons existants complétés en C2 + 6 nouveaux cartons ouverts en C1.',
  });
  currentCartons = op2.updatedCartons;
  operations.push(op2.operation);

  // 3. Équipe S traite ensuite 40 cartons -> utilise les 6 cartons ouverts existants + 34 nouveaux cartons -> 6 cartons complétés + 34 nouveaux cartons ouverts
  const op3 = processCartonFlowStep({
    existingCartons: currentCartons,
    modele: 'NM',
    pointure: '40-44',
    etapeNumero: 2, // ou prochaine étape
    couleurNom: 'Couleur 2 (Insert Rouge - Lot S)',
    cartonsADeclarer: 40,
    equipe: 'S',
    machine: 'EVA 3',
    stationNumber: 7,
    date,
    operateur: 'Chef Équipe S (Sami)',
    observations: 'Équipe S : 40 cartons traités. 6 cartons ouverts existants récupérés et complétés + 34 nouveaux cartons ouverts.',
  });
  currentCartons = op3.updatedCartons;
  operations.push(op3.operation);

  return {
    cartons: currentCartons,
    operations,
  };
}
