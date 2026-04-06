// shared/models/Commentaire.models.ts
export interface CommentaireDTO {
  id: string;
  message: string;
  dateCreation: string;
  estInterne: boolean;
  auteurId: string;
  auteurNom: string;
  ticketId: string;
  piecesJointes: PieceJointeDTO[];
}

export interface CreateCommentaireDTO {
  message: string;
  estInterne: boolean;
  piecesJointes?: File[];
}

export interface UpdateCommentaireDTO {
  message: string;
  estInterne: boolean;
  piecesJointesASupprimer?: string[];
  nouveauxFichiers?: File[];
}

export interface PieceJointeDTO {
  id: string;
  nomFichier: string;
  taille: number;
  contentType: string | null;
  dateAjout: string;
  url: string;
}

export interface ApiResponse<T> {
  isSuccess: boolean;
  message: string;
  data: T;
  resultCode?: number;
}