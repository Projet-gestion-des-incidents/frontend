import { PieceJointeDTO } from "./incident.model";

export interface TicketDTO {
  id: string;
  referenceTicket: string;
  titreTicket: string;
  descriptionTicket: string;

  statutTicket: number;
  statutTicketLibelle: string;

  prioriteTicket: number;
  prioriteTicketLibelle: string;

  dateCreation: string;
  dateCloture?: string;

  dateArchivage?: string | null;  
  createurId: string;
  createurNom: string;

  assigneeId?: string;
  assigneeNom?: string;

  nombreCommentaires: number;
  nombrePiecesJointes: number;
  
}

export interface CreateTicketDTO {
  titreTicket: string;
  descriptionTicket?: string;
  prioriteTicket: number;
  statutTicket: number;
    commentaireInitial?: string; 
  commentaireInterne?: boolean;
    piecesJointes?: File[];
}

export interface ApiResponse<T> {
  isSuccess: boolean;
  message: string;
  data: T;
}
export interface TechnicianUpdateTicketDTO {
  assigneeId?: string | null;
  statutTicket?: number;
}
export interface UpdateTicketResponseDTO extends TicketDTO {
  commentaires: CommentaireDTO[];
}
export interface CommentaireDTO {
  id: string;
  message: string;
  dateCreation: string;
  estInterne: boolean;
  auteurId: string;
  auteurNom: string;
  piecesJointes: PieceJointeDTO[]; 

}

export interface TicketDetailDTO extends TicketDTO {
  commentaires: CommentaireDTO[];
    dateLimite?: string; 
    incidents?: IncidentLiaison[]; 

}
export interface IncidentLiaison {
  id: string;
  codeIncident: string;
  descriptionIncident: string;
  typeProbleme?: string;
  emplacement?: string;
  statutIncident: number;
  statutIncidentLibelle: string;
  severiteIncident: number;
  severiteIncidentLibelle: string;
  dateDetection: string;
}