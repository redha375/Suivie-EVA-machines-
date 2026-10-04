export type UserRole =
  | 'admin_general'
  | 'direction'
  | 'resp_production'
  | 'gerant'
  | 'chef_equipe'
  | 'resp_qualite'
  | 'resp_maintenance'
  | 'resp_stock'
  | 'resp_commercial'
  | 'rh'
  | 'operateur';

export type ShiftType = 'matin' | 'soir' | 'nuit';
export type FactoryUnite = 'U1' | 'U2' | 'Toutes';

// Multi-material production architecture
export type ProductionMaterial = 'EVA' | 'SOUMELLE' | 'PVC';

export interface User {
  id: string;
  name: string;
  matricule: string;
  role: UserRole;
  avatar?: string;
  department?: string;
  email?: string;
  unite?: FactoryUnite; // U1 (EVA 1, 2, 3) ou U2 (EVA 4)
  assignedMachine?: string; // e.g. 'EVA 1', 'EVA 2', 'EVA 3', 'EVA 4' ou 'Toutes'
  assignedEquipe?: 'A' | 'B' | 'C' | 'Toutes';
  assignedShift?: ShiftType;
  phone?: string;
}

export interface Tenant {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  active: boolean;
}

export interface Machine {
  id: string;
  code: string; // 'EVA1', 'EVA2', 'EVA3', 'EVA4', 'PVC 1', 'SOUMELLE 1', etc.
  name: string;
  unite?: 'U1' | 'U2';
  type: 'EVA' | 'PVC' | 'TPR';
  material?: ProductionMaterial;
  supportedMaterials?: ProductionMaterial[];
  platformsCount: number; // 6 stations pour EVA (2 moules/station = 12 moules, 2 injecteurs)
  maxStations?: number;
  moldsPerPlatform: number; // 2 moules par station pour EVA
  pairsPerPlatform: number; // 4 en standard 1-couleur (ou 2 en Bicolor)
  injectorsPerPlatform?: number; // 2 injecteurs matière
  theoreticalMaxPairsPerCycle?: number; // 24 paires/cycle
  engagedCapacityPerCycle?: number; // capacité réellement engagée
  utilizationRatePercent?: number; // %
  overallMode?: '1_couleur' | 'bicolor' | 'mixte' | 'arretee';
  status: 'running' | 'idle' | 'breakdown' | 'maintenance' | 'stopped';
  currentOperatorId?: string;
  currentShift: ShiftType;
  lastCounterValue: number;
  lastCounterDate: string;
  temperatureNozzle?: number; // °C
  temperatureMold?: number; // °C
  hydraulicPressure?: number; // Bar
  active?: boolean;
}

export type FicheWorkflowStatus = 'brouillon' | 'soumis' | 'valide' | 'rejete';

export interface ProductionEntry {
  id: string;
  tenantId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  shift: ShiftType;
  groupName?: string; // Groupe d'opérateurs
  machineId: string;
  machineCode?: string;
  unite?: 'U1' | 'U2';
  platformNumber: number; // 1 to 12 (Station)
  stationNumber?: number; // 1 to 12 (Station)
  operatorId: string;
  operatorName: string;
  
  // Workflow d'approbation Chef -> Gérant
  workflowStatus?: FicheWorkflowStatus;
  submittedBy?: string;
  submittedAt?: string;
  validatedBy?: string;
  validatedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  
  // Multi-material selection (MANDATORY: EVA, SOUMELLE, PVC)
  material?: ProductionMaterial;
  rawMaterialType?: 'EVA' | 'PVC' | 'TPR';
  kgConsumed?: number; // Consommation matière en kg

  modelId?: string;
  modelName: string;
  moldId: string;
  moldsUsed?: string[];
  
  // Bicolor / Be-color configuration
  isBicolor?: boolean;
  bicolorDetails?: {
    moldA: string;
    colorA: string;
    moldB: string;
    colorB: string;
  };

  size: number; // Pointure principale (36-45)
  sizeInterval?: string; // e.g. '36-37'
  // For SOUMELLE or EVA detailed breakdown: distinct registration by pointure/range - NEVER merged!
  sizeQuantities?: Record<number, number>; // { 18: 50, 19: 54, 20: ..., 45: ... }
  sizeBreakdown?: Record<string, number>; // { '36-37': 67, '38-39': 65, '39-40': 66, '40-41': 70 }

  color?: string; // Couleur principale (synonyme / rétro-compatibilité)
  color1: string; // Empeigne / corps / couleur A
  color2: string; // Semelle / logo / couleur B

  // Production counters & cycle data
  counterStart?: number;
  counterEnd?: number;
  cycles?: number;
  qtyProduced: number; // Total paires (production brute)
  pairsProduced?: number; // Alias total paires
  cyclesCount?: number; // Alias cycles
  qtyConforming: number; // Bonnes paires (1er choix)
  qtyRejected: number; // Rebuts
  secondChoicePairs?: number; // 2ème choix / 2ème qualité
  qtySecondChoice?: number; // Alias 2ème choix
  thirdChoicePairs?: number; // 3ème choix
  qtyThirdChoice?: number; // Alias 3ème choix
  rebutRecuperable?: number; // Rebut récupérable (broyable / réinjectable)
  rebutNonRecuperable?: number; // Rebut non récupérable (définitif)
  pairsPerCycle?: number; // Paires par cycle (1, 2, etc.)
  team?: 'A' | 'B' | 'C' | string; // Équipe A, B ou C
  standardWeightKgPerPair?: number; // Poids standard théorique par paire en kg
  prodHours?: number; // Heures effectives de production
  downtimeChangeModelMinutes?: number; // Arrêts changement de modèle/moule (min)
  downtimeMaintenanceMinutes?: number; // Arrêts maintenance (min)
  theoreticalHourlyCapacity?: number; // Capacité théorique machine (paires/h)
  rejectReason?: string;
  pointure?: string; // Pointure ou intervalle de pointure (ex: '28-35', '36-41', '40-44')
  platformPointure?: string; // Pointure plateforme (ex: '18-19', '36-37', '43-44')
  cartonsCount?: number; // Nombre de cartons pleins
  openCartonsCount?: number; // Nombre de cartons ouverts
  loosePairs?: number; // Paires en vrac / carton ouvert
  qualityValidationStatus?: 'pending' | 'approved' | 'rejected' | 'reserve';
  qualityNotes?: string;

  // Calculs dynamiques
  targetPairs?: number; // Objectif de production
  variancePairs?: number; // Écart = Conforme - Objectif
  scrapRatePct?: number; // Rejet % = Rejets / Production brute * 100
  conformanceRatePct?: number; // Conformité % = Conforme / Production brute * 100
  yieldPct?: number; // Rendement % = Conforme / Objectif * 100

  // Matières
  materialConsumedKg: number; // Matière : kg
  bags25kgConsumed: number; // Sac matière = 25 kg

  // Temps & Productivité
  startTime: string;
  endTime: string;
  durationMinutes?: number; // Temps : h/min
  productivityPairsPerHour?: number; // Productivité : paires/h
  downtimeMinutes: number; // Arrêts
  downtimeReason?: string;

  // AI OCR Counter evidence
  counterPhotoUrl?: string; // Photo preuve du compteur
  ocrDetectedValue?: number;
  ocrConfidence?: number;
  counterScanAnomaly?: boolean;
  anomalyReason?: string;

  // Conditionnement & Stock workflow stages
  workflowStage?: 'production' | 'control' | 'cartons' | 'stock_produit_fini' | 'stock_soumelle' | 'en_attente_eva';
  packagingCartonsCount?: number; // Nombre de cartons complets
  completeCartons?: number; // Nombre de cartons complets calculés
  remainderPairs?: number; // Paires restantes (reliquat modulo)
  cartonType?: string; // Type de carton (D1, D2, D3, D4, D5, D6, etc.)
  pairsPerCarton?: number; // Paires configurées par carton (12 à 30)

  notes?: string;
  observations?: string;
  verifiedByChef: boolean;
  syncStatus: 'synced' | 'pending';
  createdAt: string;
}

export interface CounterScanRecord {
  id: string;
  machineId: string;
  machineCode: string;
  operatorId: string;
  operatorName: string;
  timestamp: string;
  previousValue: number;
  counterValue: number;
  calculatedProduction: number;
  photoUrl: string;
  isAnomaly: boolean;
  anomalyReason?: string;
  confirmedByOperator: boolean;
  notes?: string;
  readingConfidence?: number;
  method?: string;
}

export interface QualityRecord {
  id: string;
  date: string;
  time: string;
  machineId: string;
  shift: ShiftType;
  modelName: string;
  operatorId: string;
  inspectedQty: number;
  conformingQty: number;
  rejectedQty: number;
  defectReason: string; // Bavures, Bulle d'air, Manque matière, Brûlure, Déformation, Décoloration
  severity: 'mineur' | 'majeur' | 'critique';
  defectPhotoUrl?: string;
  correctiveAction: string;
  status: 'ouvert' | 'en_cours' | 'resolu';
  auditorName: string;
}

export interface StockItem {
  id: string;
  code: string;
  name: string;
  category: 'matiere_premiere' | 'produit_fini' | 'colorant' | 'additif' | 'piece_rechange';
  materialType?: 'EVA' | 'PVC' | 'TPR' | 'CHIMINGOM' | 'SOUMELLE' | 'Autre';
  color?: string;
  quantity: number;
  unit: 'sacs_25kg' | 'kg' | 'paires' | 'unites';
  minThreshold: number;
  location: string;
  lastUpdated: string;
}

export type RawMaterialType = 'EVA' | 'PVC' | 'CHIMINGOM' | 'Autre';

// -------------------------------------------------------------
// MATIÈRES PREMIÈRES & STOCK INTELLIGENT (CTP SMART)
// -------------------------------------------------------------
export interface RawMaterialStockItem {
  id: string;
  reference: string; // Référence matière (ex: "MAT-EVA-BL-01")
  name: string; // Nom (ex: "Compound EVA Vierge Blanc")
  type: RawMaterialType; // EVA, PVC, CHIMINGOM / SHIMINGOM, Autre
  color: string; // Couleur (ex: "Blanc", "Noir", "Rouge", "Bleu Marine")
  colorHex?: string;
  quantityAvailable: number; // Quantité disponible (dans l'unité)
  unit: 'kg' | 'sac' | 'autre';
  bagWeightKg: number; // Poids du sac (ex: 25 kg)
  totalWeightKg: number; // Poids total en kg (sacs * 25 ou direct kg)
  unitPrice: number; // Prix unitaire DZD
  averagePrice: number; // Prix moyen pondéré PMP DZD (recalculé à chaque achat)
  supplier: string; // Fournisseur
  entryDate: string; // Date d'entrée
  receiptDate: string; // Date de réception
  batchNumber: string; // Lot / Batch
  storageLocation: string; // Emplacement de stockage
  minAlertStock: number; // Stock minimum / Stock d'alerte (par matière ET par couleur !)
  notes?: string;
  photoOrDocumentUrl?: string; // Photo ou justificatif
  status: 'normal' | 'stock_faible' | 'rupture';
  lastUpdated: string;
}

export type StockMovementType =
  | 'Réception'
  | 'Achat'
  | 'Consommation Production'
  | 'Retour Production'
  | 'Correction inventaire'
  | 'Correction / Ajustement'
  | 'Transfert'
  | 'Perte'
  | 'Rebut'
  | 'Sortie Vente'
  | 'Ajustement'
  | 'entree'
  | 'sortie_production'
  | 'ajustement'
  | 'rebut';

export type DepartmentService =
  | 'Stock / Logistique'
  | 'Production'
  | 'Achats'
  | 'Commercial'
  | 'Qualité'
  | 'Maintenance'
  | 'Finance / P&L'
  | 'RH'
  | 'Direction';

export interface StockMovement {
  id: string;
  date: string; // Date & Heure
  itemId?: string;
  itemName: string;
  type: StockMovementType;
  direction?: 'entree' | 'sortie';
  quantity: number;
  unit: string;
  material?: string;
  color?: string;
  batchNumber?: string;
  reason?: string; // Motif
  performedBy: string; // Utilisateur
  service?: DepartmentService | string; // Service responsable
  operationRef?: string; // Référence opération
  status?: 'validé' | 'annulé';
  cancelledReason?: string;
  cancelledBy?: string;
  cancelledAt?: string;
  reference?: string; // rétro-compatibilité
}

export type ProductionRequestStatus = 'Nouveau' | 'En cours' | 'Contrôle' | 'Validé' | 'Clôturé';

// -------------------------------------------------------------
// DEMANDE DE PRODUCTION / ORDRE DE FABRICATION (OF)
// Connecté automatiquement avec Commercial & Stock
// -------------------------------------------------------------
export interface ProductionRequest {
  id: string;
  code: string; // Ex: "OF-2026-001"
  originSaleOrderId?: string;
  clientName?: string;
  modelName: string;
  category?: string;
  size: string | number;
  color: string;
  material: 'EVA' | 'PVC' | 'SOUMELLE' | 'CHIMINGOM' | 'TPR' | string;
  quantityRequested: number; // Paires demandées
  quantityProduced: number; // Paires produites
  materialAvailability: 'disponible' | 'matiere_insuffisante' | 'a_verifier' | 'partiel' | 'manquant';
  materialNeededKg: number;
  serviceResponsable: string;
  responsable: string;
  date: string;
  dueDate?: string;
  status: ProductionRequestStatus;
  notes?: string;
  history: Array<{
    date: string;
    user: string;
    status: ProductionRequestStatus;
    note: string;
  }>;
}

export interface MaintenanceTicket {
  id: string;
  machineId: string;
  type: 'preventive' | 'corrective';
  title: string;
  description: string;
  reportedAt: string;
  resolvedAt?: string;
  status: 'ouvert' | 'en_cours' | 'resolu';
  downtimeMinutes: number;
  sparePartsUsed: { partName: string; quantity: number }[];
  technicianName: string;
  priority: 'basse' | 'moyenne' | 'haute' | 'urgente';
  scheduledDate?: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'retard' | 'conge';

export interface Employee {
  id: string;
  matricule: string;
  name: string;
  role: UserRole;
  functionTitle: string;
  assignedShift: ShiftType;
  phone: string;
  active: boolean;
  attendanceToday: AttendanceStatus;
  checkInTime?: string;
  producedPairsThisMonth: number;
  scrapRateAverage: number;
  efficiencyScore: number; // 0 to 100
  notes?: string;
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  module: string;
  action: string;
  details: string;
  targetId?: string;
  targetName?: string;
  oldValue?: string;
  newValue?: string;
  ipAddress?: string;
}

export interface SystemAlert {
  id: string;
  type:
    | 'breakdown'
    | 'low_stock'
    | 'high_scrap'
    | 'target_missed'
    | 'anomaly_counter'
    | 'maintenance_due'
    | 'absence'
    | 'system_permission'
    | 'traceability'
    | 'production_complete'
    | 'stock_replenished'
    | 'order_ready'
    | 'quality_approved'
    | 'commercial_sale'
    | 'financial'
    | 'matiere_insuffisante_of'
    | 'nouvel_ordre_fabrication'
    | 'stock_matiere_critique'
    | 'production_terminee'
    | 'arret_machine_maintenance'
    | 'machine_remise_en_service';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'danger' | 'success';
  timestamp: string;
  read: boolean;
  linkTab?: string;
  category?: string;
  targetDepartments?: string[]; // e.g. ['Stock / Logistique', 'Production', 'Achats']
  targetRoles?: UserRole[]; // specific roles that receive the notification
  isSuccess?: boolean; // 🟢 green success vs 🔴 danger/warning
  actionRequired?: string;
  materialId?: string;
  materialType?: string;
  color?: string;
  currentQuantity?: number;
  alertThreshold?: number;
}

// -------------------------------------------------------------
// Granular Permissions (RBAC)
// -------------------------------------------------------------
export type PermissionAction =
  | 'read'
  | 'create'
  | 'update'
  | 'deactivate'
  | 'delete'
  | 'validate'
  | 'export';

export type PermissionResource =
  | 'dashboard'
  | 'pnl'
  | 'production'
  | 'counter_scanner'
  | 'fast_entry'
  | 'quality'
  | 'stock'
  | 'maintenance'
  | 'hr'
  | 'reports'
  | 'audit'
  | 'settings'
  | 'referentials'
  | 'referentials_workers'
  | 'referentials_teams'
  | 'referentials_machines'
  | 'referentials_models'
  | 'referentials_molds'
  | 'referentials_sizes'
  | 'referentials_colors'
  | 'referentials_materials'
  | 'referentials_cartons'
  | 'referentials_size_ranges'
  | 'roles_permissions';

export type RolePermissions = Record<
  UserRole,
  Record<PermissionResource, Record<PermissionAction, boolean>>
>;

// -------------------------------------------------------------
// Master Data / Industrial Referentials
// -------------------------------------------------------------
export type ReferentialCategory =
  | 'workers'
  | 'teams'
  | 'machines'
  | 'models'
  | 'cartons'
  | 'size_ranges'
  | 'molds'
  | 'sizes'
  | 'colors'
  | 'materials';

// Types de Cartons (D1, D2, D3, D4, D5, D6, etc.)
export interface CartonTypeItem {
  id: string;
  code: string; // 'D1', 'D2', 'D3', 'D4', 'D5', 'D6'
  name: string; // Ex: "Carton D5 (12 Paires - Spécial Sabots)"
  description?: string;
  defaultPairsPerCarton: number; // 12 à 30 paires/carton
  dimensionsMm?: string; // Ex: "600 x 400 x 320 mm"
  maxWeightKg?: number;
  active: boolean; // Statut : Actif / Désactivé
}

// Plages de Pointures (19-23, 23-28, 28-35, 36-39, 36-41, 39-44, 39-43, 40-44, etc.)
export interface SizeRangeItem {
  id: string;
  code: string; // Ex: '36-41', '19-23'
  label: string; // Ex: '36–41 (Femme Standard)'
  category: 'Femme' | 'Homme' | 'Garçon' | 'Enfant' | 'Mixte' | string;
  minSize: number;
  maxSize: number;
  intervals?: string[]; // Ex: ['36-37', '38-39', '39-40', '40-41']
  description?: string;
  active: boolean; // Statut : Actif / Désactivé
}

export interface IndustrialTeam {
  id: string;
  code: string;
  name: string;
  shift: ShiftType;
  leaderId?: string;
  leaderName: string;
  membersCount: number;
  active: boolean;
  description?: string;
}

export interface IndustrialMold {
  id: string;
  code: string;
  name: string;
  modelId: string;
  modelName: string;
  size: number;
  pairsPerMold: number;
  machineCode: string; // e.g. 'EVA 1', 'EVA 2', 'Toutes'
  condition: 'excellent' | 'bon' | 'a_reviser';
  active: boolean;
  notes?: string;
}

// Configuration Dynamique des Modèles (EVA, PVC, SOUMELLE)
export interface ShoeModelItem {
  id: string;
  code: string; // Code modèle (ex: SB23)
  name: string; // Nom modèle (ex: SB23 Femme)
  category?: 'Femme' | 'Homme' | 'Garçon' | 'Enfant' | string; // Catégorie
  material?: ProductionMaterial; // Matière obligatoire : EVA / SOUMELLE / PVC
  defaultMaterial?: 'EVA' | 'PVC' | 'TPR' | 'SOUMELLE'; // Rétro-compatibilité
  sizes?: number[]; // Pointures disponibles (ex: [36, 37, 38, 39, 40, 41])
  sizeRange?: string; // Plage de pointures (ex: '36-41')
  sizeIntervals?: string[]; // Combinaisons / plages spécifiques (ex: ['36-37', '38-39', '39-40', '40-41'])
  colors?: string[]; // Couleurs autorisées/associées (ex: ['Blanc Pur', 'Rose Poudré', 'Bleu Azur'])
  modelType?: 'normal' | 'bicolor'; // Type Normal / Bicolor
  bicolorConfig?: {
    moldA: string;
    colorA: string;
    moldB: string;
    colorB: string;
  };
  moldsCount?: 1 | 2 | 4; // Nombre de moules : 1 / 2 / 4
  moldsPerPlatform?: 1 | 2 | 4; // Rétro-compatibilité
  molds?: string[];
  associatedMolds?: string[]; // Moules associés (ex: ['M-SB23-01', 'M-SB23-02'])
  associatedMachineIds?: string[];
  associatedMachines?: string[]; // Machine(s) associée(s) (ex: ['EVA 1', 'EVA 2'])
  pairsPerCycle?: number; // Paires par cycle
  cartonType?: string; // Type de carton : D1, D2, D3, D4, D5, D6
  pairsPerCarton?: number; // Paires par carton (variable : 12 à 30 paires/carton)
  condt?: string; // Conditionnement officiel (ex: '14 PAIRES')
  reference_moule?: string; // Clé dynamique / Référence moule
  fiche_journaliere_ref?: string; // Clé étrangère dynamique vers la Fiche Journalière
  packagingRule?: string; // Règle de conditionnement
  counterRule?: string; // Règle de compteur (ex: '1 = 1 pair')
  targetPairs?: number; // Objectif de production (paires / poste)
  weightPerPairGrams: number;
  description?: string;
  active: boolean; // Statut : Actif / Désactivé
}

// -------------------------------------------------------------
// Stock Soumelle Spécifique (Détail par Pointure 18 à 45)
// -------------------------------------------------------------
export interface StockSoumelleItem {
  id: string;
  modelId: string;
  modelName: string;
  color: string;
  size: number; // Pointure distincte (ex: 18, 19, ..., 45)
  quantityPairs: number; // Quantité en paires (NEVER MERGED)
  minThreshold: number;
  machineCode?: string;
  location: string;
  lastUpdated: string;
}

// -------------------------------------------------------------
// Conditionnement Cartons Spécifique (Workflow PVC)
// -------------------------------------------------------------
export interface PackagingCartonRecord {
  id: string;
  productionEntryId: string;
  batchNumber: string;
  modelName: string;
  color: string;
  size: number;
  cartonType: string;
  pairsPerCarton: number;
  totalConformingPairs: number;
  cartonsCount: number;
  remainderPairs: number;
  date: string;
  operatorName: string;
  status: 'en_cours' | 'conditionne' | 'expedie_stock';
  notes?: string;
}

export interface ShoeSizeItem {
  id: string;
  size: number;
  category: 'adulte' | 'enfant';
  standardLengthMm: number;
  active: boolean;
}

export interface ShoeColorItem {
  id: string;
  name: string;
  hex: string;
  usage: 'corps' | 'semelle' | 'les_deux';
  colorCode?: string;
  active: boolean;
}

export interface RawMaterialItem {
  id: string;
  code: string;
  name: string;
  type: 'EVA' | 'PVC' | 'TPR' | 'COLORANT' | 'ADDITIF';
  unit: 'sacs_25kg' | 'kg';
  minAlertThreshold: number;
  supplier?: string;
  active: boolean;
}

// -------------------------------------------------------------
// MODEL MASTER - Référentiel Central des Modèles de Production
// Clé logique: MODEL + POINTURE + CATÉGORIE
// -------------------------------------------------------------
export interface ModelMasterItem {
  id: string;
  num_id?: number;
  article: string; // Ex: "003", "SB96", "TANGO"
  model_name: string; // Ex: "003", "SB96", "TANGO"
  photo?: string;
  designation: string; // Ex: "MOCASSIN HOMME 39/44"
  condt?: string; // Ex: "14 PAIRES"
  category: string; // Ex: Femme, Homme, Fillette, Garçon, Enfant, Bébé, Cadet
  pointure: string; // Ex: 36/41, 28/35, 23/28, 39/44
  paires_par_carton: number; // Ex: 14, 20, 24, 30, 18, 12, 36
  counterRule?: string; // Ex: '1 = 1 pair'
  material?: 'EVA' | 'PVC' | 'TPR' | 'SOUMELLE';
  weightPerPairGrams?: number;
  associatedMachines?: string[];
  qualityNotes?: string;
  priceDzd?: number;
  active?: boolean;
  
  // Clé dynamique / Foreign Key vers Fiche Journalière & Moule
  reference_moule?: string; // Référence / code du moule (ex: "M-003-3944")
  fiche_journaliere_ref?: string; // Référence dynamique vers la fiche journalière (FK)
  fiche_journaliere_date?: string; // Date de la fiche liée
  fiche_journaliere_machine?: string; // Machine de la fiche liée
  is_dynamic_linked?: boolean; // Vrai si synchronisé dynamiquement

  verified: boolean; // Statut validé par le responsable
  source: 'IMPORT_OFFICIEL' | 'LISTE_ARTICLES_2025' | 'MANUAL_ENTRY' | 'FICHE_OCR';
  created_at: string;
  updated_at: string;
}

export type FicheRecordStatus = 'VALIDÉ' | 'À VÉRIFIER' | 'NOUVEAU MODÈLE' | 'CONFLIT';

// CTP SMART - Fiche Journalière de Suivi de Production OCR & Analysis Types
export interface FicheProductionLine {
  ligne_num?: number;
  equipe?: string;
  machine?: string;
  operateur?: string;
  modele: string;
  designation?: string;
  category?: string;
  reference_moule?: string;
  pointure: string;
  couleur_1: string;
  couleur_2: string;
  poids_matiere_1?: string;
  poids_matiere_2?: string;
  situation_cartons?: string;
  
  // Nouveaux champs OCR demandés
  quantite_production?: number | null; // Quantité totale / brute
  cartons_remplis?: number | null; // Cartons pleins / terminés
  cartons_ouverts?: number | null; // Cartons ouverts / entamés (NE PAS COMPTER COMME PLEIN)
  quantite_restante?: number | null; // Paires restantes en vrac
  rebut_defauts?: number | null; // Rebuts / défauts
  compteur_entree?: string; // Index compteur début
  compteur_sortie?: string; // Index compteur fin
  observations?: string;

  // Calculs & Référentiel ModelMaster
  paires_par_carton?: number | null; // Récupéré automatiquement de ModelMaster
  paires_produites_calculees?: number | null; // Cartons remplis × Paires par carton
  paires_conformes: number | null; // Production bonne (À VÉRIFIER si vide!)
  paires_emballees: number | null;
  compteur_debut?: string;
  compteur_fin?: string;

  // Statuts & Contrôles
  status?: FicheRecordStatus;
  model_recognition_status?: 'EXACT_MATCH' | 'MODELE_A_VERIFIER' | 'NOUVEAU_MODELE' | 'A_VERIFIER';
  alerts?: string[];
  operator_confirmed?: boolean;
  confidence?: Record<string, number>;
}

export interface FicheProductionEquipe {
  equipe: string;
  statut?: 'VALIDE' | 'MISSING_REQUIRED_DATA' | 'ANOMALIE';
  lignes: FicheProductionLine[];
}

export interface FicheMissingField {
  equipe: string;
  ligne?: number;
  champ: string;
  message: string;
  severite: 'CRITIQUE' | 'ATTENTION';
}

export interface FicheErrorItem {
  type: string;
  equipe?: string;
  ligne?: number;
  description: string;
}

export interface FicheUncertainValue {
  champ: string;
  valeur_lue: string;
  confidence: number;
  alternative_possible: string;
  emplacement?: string;
}

export interface FicheResultatEquipe {
  equipe: string;
  statut: string;
  paires_conformes: number | null;
  paires_emballees: number | null;
  remarques: string;
}

export interface FicheRapportSynthese {
  donnees_correctement_lues_count: number;
  donnees_manquantes_count: number;
  erreurs_detectees_count: number;
  donnees_incertaines_count: number;
  total_production_conforme: number;
  total_paires_emballees: number;
  resultat_par_equipe: FicheResultatEquipe[];
}

export interface FicheProductionAnalysisResult {
  date: string;
  machine: string;
  shift?: string;
  equipes: FicheProductionEquipe[];
  missing_fields: FicheMissingField[];
  errors: FicheErrorItem[];
  warnings: Array<{ equipe?: string; message: string }>;
  uncertain_values: FicheUncertainValue[];
  reprendre_photo_zone?: string | null;
  rapport_synthese: FicheRapportSynthese;
  rawJson?: string;
  method?: string;
}

// -------------------------------------------------------------
// Grille des 12 Plateformes / Empreintes par Machine
// Règle stricte CTP SMART :
// - Exactement 12 plateformes (01 à 12)
// - Chaque plateforme porte au maximum 2 paires (2 si Active, 0 si Vide ou Défaut)
// - Pointure : un chiffre (ex: '18', '36') ou deux chiffres (ex: '18-19', '36-37', '43-44')
// - 18-19 représente la pointure de la plateforme = 2 paires (jamais 4 paires!)
// - Capacité par cycle = Nombre de plateformes actives × 2
// -------------------------------------------------------------
export type PlatformState = 'Active' | 'Vide' | 'Défaut';

export interface PlatformConfigItem {
  id: number; // 1 à 12
  number: number; // 1 à 12
  name: string; // "Plateforme 01" ... "Plateforme 12"
  pointure: string; // ex: '18-19', '36-37', '43-44' ou '18', '36'
  state: PlatformState; // 'Active' | 'Vide' | 'Défaut'
  pairsCount: number; // Maximum 2 paires!
  moldRef?: string;
  notes?: string;
}

// -------------------------------------------------------------
// P&L MANAGEMENT – PROFIT & LOSS (MODULE FINANCIER)
// -------------------------------------------------------------

export type PnlPeriodFilter = 'today' | 'week' | 'month' | 'year' | 'custom' | 'jour' | 'semaine' | 'mois' | 'annee' | 'personnalise';

export type PaymentStatus = 'paye' | 'partiel' | 'non_paye';

export type PurchaseType =
  | 'Matière première'
  | 'Pièce de rechange'
  | 'Emballage'
  | 'Consommable'
  | 'Autre';

// 2. Revenus / Ventes (Commercial)
export interface SaleOrder {
  id: string;
  date: string; // YYYY-MM-DD
  client: string;
  invoiceRef: string; // Facture / Référence
  model?: string;
  modelId?: string;
  modelName: string;
  category?: string;
  material?: string;
  size: string; // Pointure
  color?: string;
  quantity: number; // paires
  unitPrice: number; // DZD par paire
  discount: number; // Remise en DZD
  total: number; // Quantité × Prix unitaire – Remise
  amountPaid: number; // Montant payé
  remainingAmount: number; // Reste à payer (Créance client)
  paymentMode?: 'Virement' | 'Chèque' | 'Espèces' | 'Traite';
  paymentStatus: PaymentStatus;
  deliveryStatus?: 'En attente' | 'Expédié' | 'Livré';
  notes?: string;
}

// 3. Achats (Fournisseurs & Stock)
export interface PurchaseOrder {
  id: string;
  date: string; // YYYY-MM-DD
  supplier: string; // Fournisseur
  type?: PurchaseType;
  article: string;
  stockItemId?: string;
  quantity: number;
  unit: string; // kg, sacs_25kg, unités, paires, cartons
  unitPrice: number; // DZD
  total: number; // Quantité × Prix unitaire
  amountPaid: number; // Montant payé
  remainingAmount: number; // Reste (Dette fournisseur)
  paymentMode?: 'Virement' | 'Chèque' | 'Espèces' | 'Traite';
  paymentStatus: PaymentStatus;
  receiptStatus?: 'Reçu' | 'En cours' | 'En commande';
  invoiceRef?: string;
  notes?: string;
}

// 4. Dépenses (19 Catégories d'exploitation & de structure)
export type ExpenseCategory =
  | 'Salaires'
  | 'Électricité'
  | 'Gaz'
  | 'Eau'
  | 'Loyer'
  | 'Maintenance'
  | 'maintenance'
  | 'Pièces de rechange'
  | 'Transport'
  | 'Carburant'
  | 'Emballage'
  | 'Consommables'
  | 'Restauration'
  | 'Sécurité'
  | 'Assurance'
  | 'Téléphone / Internet'
  | 'Marketing'
  | 'Taxes'
  | 'CNAS'
  | 'Divers'
  | 'Matières premières'
  | 'Administration'
  | 'Commercial'
  | 'Fournitures'
  | 'Autres';

export type ExpenseDepartment =
  | 'Production'
  | 'Maintenance'
  | 'Qualité'
  | 'Magasin'
  | 'Administration'
  | 'Commercial'
  | 'Direction';

export type ExpensePaymentMode = 'Virement' | 'Chèque' | 'Espèces' | 'Traite' | 'Carte';
export type ExpenseStatus = 'paye' | 'en_attente' | 'rejete';

export interface ExpenseRecord {
  id: string;
  date: string; // YYYY-MM-DD
  category: ExpenseCategory;
  department?: string;
  description: string;
  amount: number; // DZD
  supplier?: string;
  beneficiary?: string;
  reference?: string;
  paymentMode?: ExpensePaymentMode | string;
  paymentMethod?: string;
  machineId?: string;
  status?: ExpenseStatus;
  attachmentUrl?: string;
  notes?: string;
}

// 10. Budget vs Réel par catégorie
export interface CategoryBudget {
  category: ExpenseCategory;
  monthlyBudget: number; // DZD
}

// 12. Cash Flow (Trésorerie réelle)
export type CashFlowType = 'entree' | 'sortie';

export interface CashFlowMovement {
  id: string;
  date: string; // YYYY-MM-DD
  type: CashFlowType;
  category?: string;
  source?: 'encaissement_client' | 'paiement_fournisseur' | 'autre_mouvement' | 'depense' | 'salaires';
  description: string;
  amount: number; // DZD
  reference?: string;
  paymentMode?: string;
  account?: 'Banque CPA' | 'Banque BNA' | 'Caisse Usine' | string;
}

// -------------------------------------------------------------
// ERP USINE DE CHAUSSURES CTP - TABLES PRINCIPALES (2026)
// -------------------------------------------------------------

// 1. Table catalogue_modeles (Générique et extensible)
export interface CtpCatalogueModele {
  id: string;
  code: string; // NM, BC07, SB101, SML, SH...
  designation: string; // Fillette/Garçon, Femme, Kadet, Homme, Bébé, Enfant...
  pointure_debut: number; // INT (ex: 28)
  pointure_fin: number; // INT (ex: 35)
  pointure_text?: string; // "28-35"
  paires_par_carton: number; // INT - PARAMETRABLE - Pour NM = 12 pour tout
  actif: boolean; // BOOL
  notes?: string;
}
export type CtpCatalogueVariant = CtpCatalogueModele; // Alias pour compatibilité

// 2. Table cartons (COEUR DU SYSTÈME)
export type CtpCartonStatut = 'OUVERT' | 'FERME';

export interface CtpCarton {
  id_carton: string; // PK: ex: NM-28-35-0001
  modele_id: string; // FK ou code (NM, BC07...)
  pointure_text: string; // "28-35", "40-44"
  paires_par_carton: number; // 12 pour NM
  paires_actuelles: number; // 0-12
  statut: CtpCartonStatut; // 'OUVERT' | 'FERME'
  date_creation: string;
  date_fermeture?: string;
  equipe_remplissage?: string; // 'A' | 'B'
  equipe_fermeture?: string; // 'C' (Seule équipe habilitée à clôturer)
  machine_origine?: string; // 'EVA 1', 'EVA 2', 'EVA 3'
  QR_code?: string;
  notes?: string;

  // Logique 3 couleurs par carton (EVA 3 & Usine CTP)
  couleur_1?: string;
  qte_c1?: number;
  equipe_c1?: string;
  couleur_2?: string;
  qte_c2?: number;
  equipe_c2?: string;
  couleur_3?: string;
  qte_c3?: number;
  equipe_c3?: string;
  total_paires?: number; // qte_c1 + qte_c2 + qte_c3
  nb_equipes_touchees?: number; // 1, 2, ou 3
  nb_couleurs?: number; // 1, 2, ou 3

  // Suivi dynamique du flux physique réel (3 étapes / couleurs)
  etape_actuelle?: 1 | 2 | 3;
  nb_etapes_requises?: number; // 3 étapes par défaut
  controle_qualite_valide?: boolean;
  controle_qualite_date?: string;
  controle_qualite_par?: string;
  configuration_validee?: boolean;
  cloture_confirmee_par?: string;
  station_actuelle?: number;
  etapes_historique?: CtpCartonEtapeLog[];
}

export interface CtpCartonEtapeLog {
  etape: 1 | 2 | 3;
  couleurNom: string;
  equipe: string;
  date: string;
  pairesAjoutees: number;
  machine?: string;
  station?: number;
  operateur?: string;
  compteurInfo?: string;
}

// Opération de flux physique réel enregistrée pour chaque passage d'équipe
export interface CtpCartonFlowOperation {
  id: string;
  date: string;
  heure?: string;
  equipe: string; // 'A' | 'B' | 'C' | 'S' | string
  machine: string;
  stationNumber?: number;
  modele: string;
  pointure: string;
  etapeNumero: 1 | 2 | 3;
  couleurNom: string;

  // BILAN FLUX PHYSIQUE RÉEL EXPLICITE (Sans double comptage)
  cartonsRecuperes: number;     // Cartons repris du stock ouvert précédent
  nouveauxCartons: number;       // Nouveaux cartons introduits physiquement
  cartonsCompletes: number;      // Cartons ayant achevé l'étape
  cartonsRestantOuverts: number; // Cartons restant encore ouverts après opération

  pairesTotalesTraitees: number;
  cartonsIdsTraites?: string[];
  observations?: string;
  operateur: string;
  createdAt: string;
}

// Validation des 5 conditions de clôture d'un carton
export interface CtpCartonClosureValidation {
  allStepsCompleted: boolean;     // 1. Toutes les couleurs/étapes prévues sont réalisées
  requiredPairsComplete: boolean; // 2. La quantité de paires requise est complète (ex: 12/12)
  modelSizeRespected: boolean;    // 3. La configuration modèle/pointure est respectée
  qualityCheckPassed: boolean;    // 4. Le contrôle qualité requis est validé
  authorizedOperatorApproved: boolean; // 5. L'opérateur autorisé confirme la clôture
  canClose: boolean;
  blockReasons: string[];
}

// 3. Table production_journal (Historique détaillé remplissage/fermeture)
export type CtpProductionAction = 'REMPLISSAGE' | 'FERMETURE' | 'ملؤها' | 'ملؤها - لون 2' | 'غلقها';

export interface CtpProductionJournal {
  id: string;
  date: string; // YYYY-MM-DD
  machine: 'EVA 1' | 'EVA 2' | 'EVA 3' | string;
  equipe: 'A' | 'B' | 'C' | string;
  modele_id: string; // Code modèle (NM...)
  pointure_text: string; // Pointure
  id_carton?: string; // FK vers cartons
  paires_ajoutees: number;
  qte_ajoutee?: number;
  action: CtpProductionAction;
  couleur_du_jour?: string;
  couleur?: string;
  station_number?: number;
  production_mode?: '1_couleur' | 'bicolor' | 'inactif';
  moules_actifs?: number;
  paires_par_cycle_station?: number;
  capacite_engagee_machine?: number;
  compteur_debut: number;
  compteur_fin: number;
  total_compteur?: number; // compteur_fin - compteur_debut
  ecart_compteur?: number; // total_compteur - paires_ajoutees (alerte si != 0)
  createdAt?: string;
  observations?: string;
}

// Scénario officiel EVA 3 Jour 15 & Décomposition équipes
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

export interface Eva3Jour15Record {
  equipe: 'A' | 'B' | 'C';
  compteur_debut: number;
  compteur_fin: number;
  total_compteur: number;
  modele: string;
  pointure: string;
  paires_par_carton: number;
  paires_saisies: number;
  cartons_fermes: number;
  wip_reste_paires: number;
  ecart_compteur_equipe: number;
  alerte_ecart: number;
}
export type CtpProductionRecord = CtpProductionJournal & {
  paires?: number;
  cartons_ouverts?: number;
  cartons_pleins?: number;
  modele?: string;
  pointure?: string;
};

// 4. Table stock_auto (VUE CALCULÉE AUTO, PAS DE SAISIE)
export interface CtpStockAuto {
  modele: string;
  pointure: string;
  paires_par_carton: number;
  stock_ferme_cartons: number; // COUNT(cartons WHERE statut='FERME')
  stock_ferme_paires: number; // stock_ferme_cartons * paires_par_carton
  wip_ouvert_paires: number; // SUM(paires_actuelles WHERE statut='OUVERT')
  wip_ouvert_cartons_equivalent: number; // wip_ouvert_paires / paires_par_carton
  wip_cartons_count?: number; // Nombre de cartons ouverts
  cartons_prets_fermeture?: number; // Cartons ouverts qui ont paires_actuelles == paires_par_carton
  isAlert?: boolean; // stock_ferme_cartons < 10
}
export type CtpStockRecord = CtpStockAuto & {
  id?: string;
  entree_paires?: number;
  entree_cartons?: number;
  sortie_paires?: number;
  sortie_cartons?: number;
  stock_paires?: number;
  stock_cartons?: number;
  cartons_ouverts?: number;
  lastRecalculatedAt?: string;
};

// 5. Table commandes commerciales
export interface CtpCommercialOrder {
  id: string;
  client: string;
  commande: string; // Ex: 'CMD-2026-081'
  modele: string;
  pointure: string;
  qte_commandee: number; // en paires
  qte_produite: number; // paires produites
  reste_a_produire: number; // Math.max(0, qte_commandee - qte_produite)
  prix_paire: number; // Prix unitaire en DZD
  prix_carton: number; // prix_paire * 12
  total: number; // qte_commandee * prix_paire
  statut: 'En attente' | 'En production' | 'Prêt' | 'Livré';
  date: string;
  notes?: string;
  cartons_ids?: string[]; // QR / IDs des cartons fermés alloués
}

// 6. Table maintenance & compteurs
export interface CtpMaintenanceRecord {
  id: string;
  machine: 'EVA 1' | 'EVA 2' | 'EVA 3' | string;
  date: string;
  compteur_debut: number;
  compteur_fin: number;
  total: number; // fin - debut
  panne: 'oui' | 'non';
  duree_arret: number; // en heures
  cause_panne?: string;
  photo_compteur?: string; // URL ou image base64
  technicien?: string;
  heures_marche?: number;
  rendement_paires_heure?: number; // total / heures_marche
  createdAt: string;
}





