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
    commentaireInitial?: string;  // nouveau champ
  commentaireInterne?: boolean;
  fichiers?: CreatePieceJointeDTO[];
}
export interface CreatePieceJointeDTO {
  nomFichier: string;
  contentType: string;
  contenuBase64: string; 
}
export interface ApiResponse<T> {
  isSuccess: boolean;
  message: string;
  data: T;
}
export interface PieceJointeDTO {
  id: string;
  nomFichier: string;
  taille: number;
  contentType: string;
  typePieceJointe: number; // correspond à TypePieceJointe enum côté back
  dateAjout: string;
  url: string; // URL du fichier
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
}