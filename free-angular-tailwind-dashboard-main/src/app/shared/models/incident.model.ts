export enum SeveriteIncident {
  Faible = 1,
  Moyenne = 2,
  Forte = 3
}
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
export enum StatutIncident {
   EnCours = 1,
   Ferme = 2
}

export enum TypeEntiteImpactee {
MachineTPE = 1,
FluxTransactionnel = 2,
Reseau = 3,
ServiceApplicatif = 4,
}




export interface EntiteImpactee {
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
    typeProbleme?: string; // <-- add this line
      emplacement?: string;  // <-- add this line

  nombreTickets: number;
  nombreEntitesImpactees: number;
}

export interface IncidentDetail extends Incident {
  tickets: IncidentTicket[];
  entitesImpactees: EntiteImpactee[]; // Changé de EntiteImpactee à EntiteImpacteeDTO
}

export interface IncidentTicket {
  ticketId: string;
  referenceTicket?: string;
  titreTicket?: string;
  statutTicket: number;
  prioriteTicket: number;
}

export interface CreateIncidentDTO {
  descriptionIncident?: string;
  typeProbleme?: TypeProbleme; // <-- optionnel, peut être undefined
  emplacement: string;
  TPEIds: string[];
  PiecesJointes?: File[];
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
export interface ApiResponse<T> {
  data: T;
  errors?: string[];
  message?: string;
  resultCode: number;
  isSuccess: boolean;
}
