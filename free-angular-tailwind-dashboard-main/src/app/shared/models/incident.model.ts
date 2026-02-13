export enum SeveriteIncident {
  Faible = 1,
  Moyenne = 2,
  Forte = 3
}

export enum StatutIncident {
  Nouveau = 1,
  Assigne = 2,
  EnCours = 3,
  EnAttente = 4,
  Resolu = 5,
  Ferme = 6
}

export enum TypeEntiteImpactee {
  Hardware = 1,
  Software = 2,
  Reseau = 3,
  BaseDonnees = 4,
  Application = 5,
  Utilisateur = 6,
  Securite = 7,
  Autre = 8
}



export interface EntiteImpactee {
      id?: string;  // Optionnel car peut être nouveau ou existant

  typeEntiteImpactee: TypeEntiteImpactee;
  nom: string;
}

export interface Incident {
  id: string;
  codeIncident: string;
  titreIncident: string;
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
  nombreTickets: number;
  nombreEntitesImpactees: number;
}

export interface IncidentDetail extends Incident {
  tickets: IncidentTicket[];
  entitesImpactees: EntiteImpactee[];
}

export interface IncidentTicket {
  ticketId: string;
  referenceTicket?: string;
  titreTicket?: string;
  statutTicket: number;
  prioriteTicket: number;
}

export interface CreateIncidentDTO {
  titreIncident: string;
  descriptionIncident: string;
  severiteIncident: SeveriteIncident;
  entitesImpactees: EntiteImpactee[];
}

export interface ApiResponse<T> {
  data: T;
  errors?: string[];
  message?: string;
  resultCode: number;
  isSuccess: boolean;
}