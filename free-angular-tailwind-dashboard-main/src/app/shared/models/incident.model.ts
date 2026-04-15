export enum SeveriteIncident {
  Faible = 1,
  Moyenne = 2,
  Forte = 3
}

// Dans votre fichier incident.model.ts, vérifiez que l'enum contient :
export enum StatutIncident {
  NonTraite = 0,  // ou la valeur appropriée
  EnCours = 1,
  Ferme = 2
}

export enum TypeEntiteImpactee {
  MachineTPE = 1,
  FluxTransactionnel = 2,
  Reseau = 3,
  ServiceApplicatif = 4,
}

export enum TypeProbleme {
  PaiementRefuse = 1,
  TerminalHorsLigne = 2,
  Lenteur = 3,
  BugAffichage = 4,
  ConnexionReseau = 5,
  ErreurFluxTransactionnel = 6,
  ProblemeLogicielTPE = 7,
  Autre = 8
}

export interface EntiteImpactee {
  id?: string;
  typeEntiteImpactee: TypeEntiteImpactee;
}

export interface Incident {
  id: string;
  codeIncident: string;
  descriptionIncident: string;
  severiteIncident: SeveriteIncident;
  severiteIncidentLibelle: string;
  statutIncident: StatutIncident;
  statutIncidentLibelle: string;
  dateDetection: Date;
  dateResolution?: Date;
  createdAt: Date;
  updatedAt?: Date;
  createdById?: string;
  createdByName?: string;
  typeProbleme?: TypeProbleme;  // ← Changé de string à TypeProbleme
  nombreTickets: number;
  nombreEntitesImpactees: number;
}

export interface IncidentDetail extends Incident {
  tickets: IncidentTicket[];
  entitesImpactees: EntiteImpactee[];
  tpEs?: TpeLiaison[]; // Note: c'est "tpEs" dans la réponse, pas "tpes"
  piecesJointes?: PieceJointeDTO[];
}
export interface IncidentTPEDTO {
  tpeId: string;
  numSerie: string;
  numSerieComplet: string;
  modele: string;
  dateAssociation: string;
}
export interface TpeLiaison {
  tpeId: string;
  numSerie: string;
  numSerieComplet: string;
  modele: string;
  modeleNom: string;
  dateAssociation: string;
}

export interface PieceJointeDTO {
  id: string;
  nomFichier: string;
  taille: number;
  contentType?: string | null;
  dateAjout: string;
  url: string;
}
export interface IncidentTicket {
  ticketId: string;
  referenceTicket?: string;
  titreTicket?: string;
  statutTicket: number;
  prioriteTicket: number;
}

export interface UpdateIncidentDTO {
  descriptionIncident?: string;
  emplacement?: string;
  typeProbleme?: TypeProbleme;
  severiteIncident?: SeveriteIncident; // Admin only

}

export interface CreateIncidentDTO {
  descriptionIncident?: string;
  typeProbleme?: TypeProbleme;
  TPEIds: string[];
  PiecesJointes?: File[];
}

export interface ApiResponse<T> {
  data: T;
  errors?: string[];
  message?: string;
  resultCode: number;
  isSuccess: boolean;
}

// Interfaces supplémentaires
export interface IncidentSearchRequest {
  searchTerm?: string;
  severiteIncident?: number;
  statutIncident?: number;
  page: number;
  pageSize: number;
  sortBy?: string;
  sortDescending?: boolean; 
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}