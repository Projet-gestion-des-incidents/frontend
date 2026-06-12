import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommentaireService } from '../../shared/services/commentaire.service';
import { TicketService } from '../../shared/services/ticket.service';
import { UserService } from '../../shared/services/user.service';
import { CommentaireDTO } from '../../shared/models/Commentaire.models';
import { BadgeComponent } from '../../shared/components/ui/badge/badge.component';
import { AvatarTextComponent } from '../../shared/components/ui/avatar/avatar-text.component';

@Component({
  selector: 'app-commentaire-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    BadgeComponent,
    AvatarTextComponent
  ],
  templateUrl: './commentaire-list.component.html'
})
export class CommentaireListComponent implements OnInit {
  ticketId!: string;
  ticketReference?: string;
  ticketTitre?: string;
  
  commentaires: CommentaireDTO[] = [];
  loading = true;
  error: string | null = null;
  successMessage: string | null = null;  
  userRole: string = '';
  userId: string | null = null;
  
  // Pour l'édition
  editingCommentaire: CommentaireDTO | null = null;
  editMessage: string = '';
  editEstInterne: boolean = false;
  editFilesToAdd: File[] = [];
  editPiecesToDelete: string[] = [];
  editIsDragActive = false;
  
  // Pour l'ajout
  showAddForm = false;
  newMessage: string = '';
  newEstInterne: boolean = false;
  newFiles: File[] = [];
  isDragActive = false;
  
  // Pour la suppression 
  showDeleteModal = false;
  commentaireToDelete: CommentaireDTO | null = null;
  deleting = false;
  
  // Pour le modal d'image
  showImageModal = false;
  currentImageUrl: string = '';
  currentImageName: string = '';


  showAddCommentModal: boolean = false;
newCommentData = {
  message: '',
  estInterne: false
};
newCommentFiles: File[] = [];
isAddingComment: boolean = false;
addDragActive = false;
addCommentError: string | null = null;  //  ERREUR LOCALE POUR L'AJOUT


// Pour l'édition
editCommentError: string | null = null;  //  ERREUR LOCALE POUR L'ÉDITION

  //  MODALES 
  showEditModal: boolean = false;
  editCommentData: any = null;
  showDeleteCommentModal: boolean = false;
  commentToDelete: any = null;
  isDeleting: boolean = false;
  filesToDelete: string[] = [];  
  
  maxFileSize = 10 * 1024 * 1024;
  maxFiles = 10;

  // Référence pour l'input file en édition
  fileInputEdit: any;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
      private cdr: ChangeDetectorRef,  

    private commentaireService: CommentaireService,
    private ticketService: TicketService,
    private userService: UserService
  ) {}



  get isAdmin(): boolean {
    return this.userRole === 'Admin';
  }

  get isTechnicien(): boolean {
    return this.userRole === 'Technicien';
  }

  get canViewInternalComments(): boolean {
    return this.isAdmin;
  }

showSuccess(message: string): void {
  this.successMessage = message;
  this.scrollToTop(); 
  setTimeout(() => {
    this.successMessage = null;
  }, 5000);
}

showError(message: string): void {
  this.error = message;
  this.scrollToTop(); 
  setTimeout(() => {
    if (this.error === message) {
      this.error = null;
    }
  }, 5000);
}

/** Détermine si un commentaire doit être affiché pour l'utilisateur courant*/
shouldDisplayComment(comment: CommentaireDTO): boolean {
  // Règle 1: L'auteur voit toujours son commentaire
  if (comment.auteurId === this.userId) {
    return true;
  }
  // Règle 2: Les Admins voient tout
  if (this.isAdmin) {
    return true;
  }

  // Règle 3: Si commentaire interne, seul l'auteur ou l'admin le voit
  if (comment.estInterne) {
    return false; // Technicien non-auteur ne voit pas les internes
  }
  
  // Règle 4: Technicien voit les commentaires publics
  return this.isTechnicien;
}
/** Détermine si l'utilisateur peut voir l'option "commentaire interne" */
get canChooseVisibility(): boolean {
  return this.isAdmin;  // Seul l'admin peut choisir
}

canEditComment(commentaire: CommentaireDTO): boolean {
  //  Si le ticket est résolu, on ne peut pas modifier
  if (this.isTicketResolu) return false;
  // Sinon, seul l'auteur peut modifier
  return commentaire.auteurId === this.userId;
}

canDeleteComment(commentaire: CommentaireDTO): boolean {
  //  Si le ticket est résolu, on ne peut pas supprimer
  if (this.isTicketResolu) return false;
  
  // Admin peut tout supprimer
  if (this.isAdmin) return true;
  // Technicien peut supprimer ses propres commentaires
  if (this.isTechnicien) return commentaire.auteurId === this.userId;
  return false;
}
ngOnInit(): void {
  this.ticketId = this.route.snapshot.paramMap.get('id')!;
  
  this.userService.getMyProfile().subscribe({
    next: (user) => {
      this.userRole = user.role;
      this.userId = user.id;
      //  Charger d'abord les infos du ticket, puis les commentaires
      this.loadTicketInfoAndComments();
    },
    error: (err) => {
      console.error('Erreur récupération profil:', err);
      this.loadTicketInfoAndComments();
    }
  });
}
ticketStatut: number = 0;

get isTicketResolu(): boolean {
  return this.ticketStatut === 3;  // 3 = Résolu
}

loadTicketInfoAndComments(): void {
  this.loading = true;
  
  this.ticketService.getTicketById(this.ticketId).subscribe({
    next: (response) => {
      if (response.isSuccess && response.data) {
        this.ticketReference = response.data.referenceTicket;
        this.ticketTitre = response.data.titreTicket;
        
        //  Utiliser statutTicketLibelle (qui est une chaîne) au lieu de statutTicket
        const statutLibelle = response.data.statutTicketLibelle;
        if (statutLibelle === 'Résolu') {
          this.ticketStatut = 3;
        } else if (statutLibelle === 'En cours') {
          this.ticketStatut = 2;
        } else if (statutLibelle === 'Assigné') {
          this.ticketStatut = 1;
        } else {
          this.ticketStatut = 0;
        }
        
        console.log('Statut du ticket (converti):', this.ticketStatut);
        console.log('isTicketResolu:', this.isTicketResolu);
      }
      this.loadCommentaires();
    },
    error: (err) => {
      console.error('Erreur chargement ticket:', err);
      this.loadCommentaires();
    }
  });
}
loadCommentaires(): void {
  this.commentaireService.getAllCommentaires(this.ticketId).subscribe({
    next: (commentaires) => {
      this.commentaires = commentaires;
      this.loading = false;
    },
    error: (err) => {
      console.error('Erreur chargement commentaires:', err);
      this.error = 'Impossible de charger les commentaires';
      this.loading = false;
    }
  });
}

  // ========== AJOUT DE COMMENTAIRE ==========
  toggleAddForm(): void {
    this.showAddForm = !this.showAddForm;
    if (!this.showAddForm) {
      this.newMessage = '';
      this.newEstInterne = false;
      this.newFiles = [];
      this.error = null;
    }
  }

  onFileSelected(event: any): void {
    const files = event.target.files;
    if (files) {
      this.addFilesToNew(Array.from(files));
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragActive = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragActive = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragActive = false;
    const files = event.dataTransfer?.files;
    if (files) {
      this.addFilesToNew(Array.from(files));
    }
  }

  private addFilesToNew(files: File[]): void {
    const validFiles = files.filter(f => {
      if (f.size > this.maxFileSize) {
        this.error = `Fichier ${f.name} trop volumineux (max 10MB)`;
        return false;
      }
      return true;
    });
    
    if (this.newFiles.length + validFiles.length > this.maxFiles) {
      this.error = `Maximum ${this.maxFiles} fichiers autorisés`;
      setTimeout(() => this.error = null, 3000);
      return;
    }
    
    this.newFiles = [...this.newFiles, ...validFiles];
    this.error = null;
  }

  removeNewFile(index: number): void {
    this.newFiles.splice(index, 1);
  }

  clearAllFiles(): void {
    this.newFiles = [];
  }

editHasChanges: boolean = false;
/** Vérifie si le formulaire d'édition de commentaire a des changements */
get isEditFormValid(): boolean {
  if (!this.editCommentData) return false;

  const messageChanged = this.editMessage !== this.editCommentData.message;
  const filesAdded = this.editFilesToAdd.length > 0;

  // comparer avec le count ORIGINAL sauvegardé à l'ouverture
  const currentFilesCount = this.editCommentData.piecesJointes?.length || 0;
  const filesDeleted = this.originalPiecesJointesCount !== currentFilesCount;

  let statusChanged = false;
  if (this.isAdmin && this.editCommentData) {
    statusChanged = this.editEstInterne !== this.editCommentData.estInterne;
  }

  const hasChanges = messageChanged || filesAdded || filesDeleted || statusChanged;

  const hasValidMessage = this.editMessage && this.editMessage.trim().length > 0;
  const hasExistingFiles = currentFilesCount > 0;
  const hasContent = hasValidMessage || filesAdded || hasExistingFiles;

  return hasChanges && hasContent;
}

showConfirmDeleteFileModal: boolean = false;
fileToDelete: { pieceId?: string; fileName: string; isDeleteAll: boolean } | null = null;
/**Ouvre la modale de confirmation pour supprimer une pièce jointe spécifique*/
confirmDeleteSingleFile(pieceId: string, fileName: string): void {
  this.fileToDelete = {
    pieceId: pieceId,
    fileName: fileName,
    isDeleteAll: false
  };
  this.showConfirmDeleteFileModal = true;
}

/**Ouvre la modale de confirmation pour supprimer toutes les pièces jointes*/
confirmDeleteAllFiles(): void {
  const totalFiles = this.editCommentData?.piecesJointes?.length || 0;
  if (totalFiles === 0) return;
  
  this.fileToDelete = {
    fileName: `${totalFiles} fichier(s)`,
    isDeleteAll: true
  };
  this.showConfirmDeleteFileModal = true;
}
private originalPiecesJointesCount: number = 0;

executeDeleteFiles(): void {
  if (!this.fileToDelete) return;
  
  if (this.fileToDelete.isDeleteAll) {
    // Supprimer immédiatement toutes les pièces jointes
    const allIds = this.editCommentData.piecesJointes.map((p: any) => p.id);
    allIds.forEach((id: string) => {
      if (!this.editPiecesToDelete.includes(id)) {
        this.editPiecesToDelete.push(id);
      }
    });
    this.editCommentData.piecesJointes = [];
  } else if (this.fileToDelete.pieceId) {
    const pieceIndex = this.editCommentData.piecesJointes.findIndex(
      (piece: any) => piece.id === this.fileToDelete!.pieceId
    );
    if (pieceIndex !== -1) {
      if (!this.editPiecesToDelete.includes(this.fileToDelete.pieceId)) {
        this.editPiecesToDelete.push(this.fileToDelete.pieceId);
      }
      this.editCommentData.piecesJointes.splice(pieceIndex, 1);
    }
  }
  
  this.closeConfirmDeleteFileModal();
  this.cdr.detectChanges();
}

showConfirmDeleteAddFileModal: boolean = false;
addFileToDelete: { index: number; fileName: string; isDeleteAll: boolean } | null = null;

/** Ouvre la modale de confirmation pour supprimer une pièce jointe spécifique dans l'ajout */
confirmDeleteSingleAddFile(index: number, fileName: string): void {
  this.addFileToDelete = {
    index: index,
    fileName: fileName,
    isDeleteAll: false
  };
  this.showConfirmDeleteAddFileModal = true;
}

/** Ouvre la modale de confirmation pour supprimer toutes les pièces jointes dans l'ajout*/
confirmDeleteAllAddFiles(): void {
  const totalFiles = this.newCommentFiles.length;
  if (totalFiles === 0) return;
  
  this.addFileToDelete = {
    index: -1,
    fileName: `${totalFiles} fichier(s)`,
    isDeleteAll: true
  };
  this.showConfirmDeleteAddFileModal = true;
}

/** Exécute la suppression des fichiers après confirmation pour l'ajout*/
executeDeleteAddFiles(): void {
  if (!this.addFileToDelete) return;
  
  if (this.addFileToDelete.isDeleteAll) {
    this.newCommentFiles = [];
  } else if (this.addFileToDelete.index >= 0) {
    this.newCommentFiles.splice(this.addFileToDelete.index, 1);
  }
  
  this.closeConfirmDeleteAddFileModal();
}
// Propriétés pour la modale de suppression des fichiers en édition
showConfirmDeleteFileEditModal: boolean = false;
fileToDeleteEdit: { pieceId?: string; fileName: string; isDeleteAll: boolean } | null = null;
/** Ouvre la modale de confirmation pour supprimer une pièce jointe spécifique dans l'édition*/
confirmDeleteSingleFileEdit(pieceId: string, fileName: string): void {
  this.fileToDeleteEdit = {
    pieceId: pieceId,
    fileName: fileName,
    isDeleteAll: false
  };
  this.showConfirmDeleteFileEditModal = true;
}

/**Ouvre la modale de confirmation pour supprimer toutes les pièces jointes dans l'édition*/
confirmDeleteAllFilesEdit(): void {
  const totalFiles = this.editCommentData?.piecesJointes?.length || 0;
  if (totalFiles === 0) return;
  
  this.fileToDeleteEdit = {
    fileName: `${totalFiles} fichier(s)`,
    isDeleteAll: true
  };
  this.showConfirmDeleteFileEditModal = true;
}

/** Exécute la suppression des fichiers après confirmation pour l'édition*/
executeDeleteFilesEdit(): void {
  if (!this.fileToDeleteEdit) return;
  
  if (this.fileToDeleteEdit.isDeleteAll) {
    // Supprimer immédiatement toutes les pièces jointes
    const allIds = this.editCommentData.piecesJointes.map((p: any) => p.id);
    allIds.forEach((id: string) => {
      if (!this.editPiecesToDelete.includes(id)) {
        this.editPiecesToDelete.push(id);
      }
    });
    this.editCommentData.piecesJointes = [];
  } else if (this.fileToDeleteEdit.pieceId) {
    const pieceIndex = this.editCommentData.piecesJointes.findIndex(
      (piece: any) => piece.id === this.fileToDeleteEdit!.pieceId
    );
    if (pieceIndex !== -1) {
      if (!this.editPiecesToDelete.includes(this.fileToDeleteEdit.pieceId)) {
        this.editPiecesToDelete.push(this.fileToDeleteEdit.pieceId);
      }
      this.editCommentData.piecesJointes.splice(pieceIndex, 1);
    }
  }
  
  this.closeConfirmDeleteFileEditModal();
  this.cdr.detectChanges();
}


/**Fait défiler la page vers le haut pour afficher le message de succès/erreur*/
scrollToTop(): void {
  // Scroll vers le haut de la page
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
  
}


/*** Ferme la modale de confirmation de suppression pour l'édition*/
closeConfirmDeleteFileEditModal(): void {
  this.showConfirmDeleteFileEditModal = false;
  this.fileToDeleteEdit = null;
}

/** Ferme la modale de confirmation de suppression pour l'ajout*/
closeConfirmDeleteAddFileModal(): void {
  this.showConfirmDeleteAddFileModal = false;
  this.addFileToDelete = null;
}

/** Ferme la modale de confirmation de suppression*/
closeConfirmDeleteFileModal(): void {
  this.showConfirmDeleteFileModal = false;
  this.fileToDelete = null;
}

/** Gère le changement de la checkbox "Interne" dans le formulaire d'édition*/
onEstInterneChange(value: boolean): void {
  this.editEstInterne = value;
}

  submitCommentaire(): void {
    if (!this.newMessage.trim() && this.newFiles.length === 0) {
      this.error = 'Veuillez saisir un message ou ajouter un fichier';
      setTimeout(() => this.error = null, 3000);
      return;
    }
    
    const formData = new FormData();
    formData.append('Message', this.newMessage);
    formData.append('EstInterne', String(this.newEstInterne));
    this.newFiles.forEach(file => {
      formData.append('fichiers', file, file.name);
    });
    
    this.commentaireService.addCommentaire(this.ticketId, formData).subscribe({
      next: () => {
        this.loadCommentaires();
        this.toggleAddForm();
        this.error = null;
        this.showSuccess('Commentaire ajouté avec succès');
      },
      error: (err) => {
        console.error('Erreur ajout commentaire:', err);
        this.error = err.error?.message || 'Erreur lors de l\'ajout du commentaire';
      }
    });
  }

  // ========== ÉDITION DE COMMENTAIRE ==========
  
  // ouvrir la modale d'édition
openEditModal(comment: any): void {
  if (!this.canEditComment(comment)) {
    this.showError('Vous ne pouvez pas modifier ce commentaire');
    return;
  }
  
  this.editCommentData = {
    id: comment.id,
    message: comment.message,
    estInterne: comment.estInterne,
    piecesJointes: comment.piecesJointes || []
  };
  this.originalPiecesJointesCount = (comment.piecesJointes || []).length;
  this.editMessage = comment.message;
  this.editEstInterne = this.isAdmin ? comment.estInterne : false;
  this.editFilesToAdd = [];
  this.editPiecesToDelete = [];
  this.editCommentError = null;  //  Réinitialiser l'erreur
  this.showEditModal = true;
  
  //  Vérifier si on a déjà atteint la limite
  const currentCount = (comment.piecesJointes || []).length;
  if (currentCount >= this.maxFiles) {
    this.editCommentError = `Ce commentaire a déjà ${currentCount} fichier(s). La limite maximale est de ${this.maxFiles} fichiers.`;
  }
}

saveEdit(): void {
  if (!this.editCommentData) return;
  
  const formData = new FormData();
  formData.append('Id', this.editCommentData.id);
  formData.append('Message', this.editMessage);
  
  //  Si l'utilisateur n'est pas Admin, conserver la valeur originale (ne pas modifier)
  const estInterne = this.isAdmin ? this.editEstInterne : this.editCommentData.estInterne;
  formData.append('EstInterne', String(estInterne));
  
  formData.append('EffacerMessage', String(!this.editMessage.trim()));
  
  this.editPiecesToDelete.forEach(id => {
    formData.append('PiecesJointesASupprimer', id);
  });
  
  this.editFilesToAdd.forEach(file => {
    formData.append('NouveauxFichiers', file, file.name);
  });
  
  this.commentaireService.updateCommentaire(this.editCommentData.id, formData).subscribe({
    next: () => {
      this.loadCommentaires();
      this.showSuccess('Commentaire modifié avec succès');
    },
    error: (err) => {
      console.error('Erreur modification:', err);
      this.showError('Erreur lors de la modification du commentaire');
    }
  });
}

  //  Fermer la modale d'édition
closeEditModal(): void {
  this.showEditModal = false;
  this.editCommentData = null;
  this.editMessage = '';
  this.editEstInterne = false;
  this.editFilesToAdd = [];
  this.editPiecesToDelete = [];
  this.filesToDelete = [];
  this.originalPiecesJointesCount = 0;  
}

  //  Confirmer et sauvegarder l'édition
confirmEditSave(): void {
  const hasMessage = this.editMessage?.trim().length > 0;
  const hasExistingFiles = this.editCommentData?.piecesJointes?.length > 0;
  const hasNewFiles = this.editFilesToAdd.length > 0;

  if (!hasMessage && !hasExistingFiles && !hasNewFiles) {
    this.showError('Le commentaire doit contenir un message ou au moins une pièce jointe');
    return;
  }

  this.saveEdit();
  this.closeEditModal();
} 

/** Vérifie si le formulaire d'ajout de commentaire est valide*/
get isAddCommentFormValid(): boolean {
  return (this.newCommentData.message && this.newCommentData.message.trim().length > 0) 
      || (this.newCommentFiles.length > 0);
}

  // ========== GESTION DES FICHIERS EN ÉDITION ==========
  onEditFileSelected(event: any): void {
    const files = event.target.files;
    if (files) {
      this.addFilesToEdit(Array.from(files));
    }
  }

  onEditDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.editIsDragActive = true;
  }

  onEditDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.editIsDragActive = false;
  }

  onEditDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.editIsDragActive = false;
    const files = event.dataTransfer?.files;
    if (files) {
      this.addFilesToEdit(Array.from(files));
    }
  }

private addFilesToEdit(files: File[]): void {
  // Filtrer les fichiers trop volumineux
  const validFiles = files.filter(f => {
    if (f.size > this.maxFileSize) {
      this.editCommentError = `Le fichier ${f.name} dépasse la limite de 10MB`;
      setTimeout(() => this.editCommentError = null, 3000);
      return false;
    }
    return true;
  });
  
  //  Calculer le nombre de fichiers existants (avant ajout)
  const currentFilesCount = (this.editCommentData?.piecesJointes?.length || 0) - this.editPiecesToDelete.length;
  const totalAfterAdd = currentFilesCount + this.editFilesToAdd.length + validFiles.length;
  
  if (totalAfterAdd > this.maxFiles) {
    const placesRestantes = this.maxFiles - (currentFilesCount + this.editFilesToAdd.length);
    if (placesRestantes <= 0) {
      this.editCommentError = `Ce commentaire a déjà ${currentFilesCount} fichier(s). La limite maximale est de ${this.maxFiles} fichiers.`;
    } else {
      this.editCommentError = `Vous ne pouvez ajouter que ${placesRestantes} fichier(s) supplémentaire(s). Limite maximale : ${this.maxFiles} fichiers.`;
    }
    setTimeout(() => this.editCommentError = null, 3000);
    return;
  }
  
  // Ajouter les fichiers valides
  if (validFiles.length > 0) {
    this.editFilesToAdd = [...this.editFilesToAdd, ...validFiles];
    this.showSuccessMessage(`${validFiles.length} fichier(s) ajouté(s)`);
    this.editCommentError = null; // Effacer l'erreur en cas de succès
  }
}

showSuccessMessage(message: string): void {
  this.successMessage = message;
  this.scrollToTop();
  setTimeout(() => {
    if (this.successMessage === message) {
      this.successMessage = null;
    }
  }, 3000);
}

  removeEditFile(index: number): void {
    this.editFilesToAdd.splice(index, 1);
  }

  markPieceToDelete(pieceId: string): void {
    if (!this.editPiecesToDelete.includes(pieceId)) {
      this.editPiecesToDelete.push(pieceId);
    }
  }

  unmarkPieceToDelete(pieceId: string): void {
    const index = this.editPiecesToDelete.indexOf(pieceId);
    if (index > -1) {
      this.editPiecesToDelete.splice(index, 1);
    }
  }

  isPieceMarkedForDelete(pieceId: string): boolean {
    return this.editPiecesToDelete.includes(pieceId);
  }

  // ========== SUPPRESSION DE COMMENTAIRE  ==========
  //  Ouvrir la modale de suppression
  openDeleteModal(comment: any): void {
    if (!this.canDeleteComment(comment)) {
      this.showError('Vous ne pouvez pas supprimer ce commentaire');
      return;
    }
    this.commentToDelete = comment;
    this.showDeleteCommentModal = true;
  }

  //  Fermer la modale de suppression
  closeDeleteModal(): void {
    this.showDeleteCommentModal = false;
    this.commentToDelete = null;
    this.isDeleting = false;
  }

  //  Exécuter la suppression
  confirmDeleteComment(): void {
    if (!this.commentToDelete) return;
    
    this.isDeleting = true;
    
    this.commentaireService.deleteCommentaire(this.commentToDelete.id).subscribe({
      next: (response: any) => {
        if (response.isSuccess !== false) {
          this.commentaires = this.commentaires.filter(c => c.id !== this.commentToDelete.id);
          this.showSuccess('Commentaire supprimé avec succès');
          this.closeDeleteModal();
        } else {
          this.showError(response.message || 'Erreur lors de la suppression');
          this.closeDeleteModal();
        }
        this.isDeleting = false;
      },
      error: (err) => {
        console.error('Erreur suppression:', err);
        this.showError(err.error?.message || 'Erreur lors de la suppression');
        this.closeDeleteModal();
        this.isDeleting = false;
      }
    });
  }

  // ========== GESTION DES IMAGES ==========
  getImageUrl(pieceId: string): string {
    return `https://localhost:7063/api/pieces-jointes/${pieceId}`;
  }

  openImageModal(pieceId: string, imageName: string): void {
    this.currentImageUrl = this.getImageUrl(pieceId);
    this.currentImageName = imageName;
    this.showImageModal = true;
  }

  closeImageModal(): void {
    this.showImageModal = false;
    this.currentImageUrl = '';
    this.currentImageName = '';
  }

  goBack(): void {
    this.router.navigate(['/tickets']);
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  isImage(contentType: string | null | undefined): boolean {
    if (!contentType) return false;
    const imageTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    return imageTypes.includes(contentType.toLowerCase());
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  get selectedFiles(): File[] {
    return this.newFiles;
  }

  removeFile(index: number): void {
    this.newFiles.splice(index, 1);
  }

  startEdit(commentaire: CommentaireDTO): void {
    this.openEditModal(commentaire);
  }

  cancelEdit(): void {
    this.closeEditModal();
  }

  confirmDelete(commentaire: CommentaireDTO): void {
    this.openDeleteModal(commentaire);
  }

  executeDelete(): void {
    this.confirmDeleteComment();
  }


// la modale d'ajout
openAddCommentModal(): void {
  this.showAddCommentModal = true;
  this.addCommentError = null; //  Réinitialiser l'erreur
}

closeAddCommentModal(): void {
  this.showAddCommentModal = false;
  this.newCommentData = {
    message: '',
    estInterne: false
  };
  this.newCommentFiles = [];
  this.addDragActive = false;
  this.error = null;
}

// Gestion des fichiers pour la modale d'ajout
onAddFileSelected(event: any): void {
  const files = event.target.files;
  if (files) {
    this.addFilesToComment(Array.from(files));
  }
}

onAddDragOver(event: DragEvent): void {
  event.preventDefault();
  event.stopPropagation();
  this.addDragActive = true;
}

onAddDragLeave(event: DragEvent): void {
  event.preventDefault();
  event.stopPropagation();
  this.addDragActive = false;
}

onAddDrop(event: DragEvent): void {
  event.preventDefault();
  event.stopPropagation();
  this.addDragActive = false;
  const files = event.dataTransfer?.files;
  if (files) {
    this.addFilesToComment(Array.from(files));
  }
}

private addFilesToComment(files: File[]): void {
  // Filtrer les fichiers trop volumineux
  const validFiles = files.filter(f => {
    if (f.size > this.maxFileSize) {
      this.addCommentError = `Le fichier ${f.name} dépasse la limite de 10MB`;
      setTimeout(() => this.addCommentError = null, 3000);
      return false;
    }
    return true;
  });
  
  //  Vérifier la limite de nombre de fichiers
  const totalAfterAdd = this.newCommentFiles.length + validFiles.length;
  if (totalAfterAdd > this.maxFiles) {
    const placesRestantes = this.maxFiles - this.newCommentFiles.length;
    if (placesRestantes <= 0) {
      this.addCommentError = `Vous avez déjà ${this.maxFiles} fichier(s). La limite maximale est de ${this.maxFiles} fichiers.`;
    } else {
      this.addCommentError = `Vous ne pouvez ajouter que ${placesRestantes} fichier(s) supplémentaire(s). Limite maximale : ${this.maxFiles} fichiers.`;
    }
    setTimeout(() => this.addCommentError = null, 3000);
    return;
  }
  
  // Ajouter les fichiers valides
  if (validFiles.length > 0) {
    this.newCommentFiles = [...this.newCommentFiles, ...validFiles];
    this.showSuccessMessage(`${validFiles.length} fichier(s) ajouté(s)`);
    this.addCommentError = null; // Effacer l'erreur en cas de succès
  }
}

//  ouvrir la modale de confirmation
removeAddFile(index: number): void {
  const file = this.newCommentFiles[index];
  if (!file) return;
  
  this.addFileToDelete = {
    index: index,
    fileName: file.name,
    isDeleteAll: false
  };
  this.showConfirmDeleteAddFileModal = true;
}

clearAddAllFiles(): void {
  const totalFiles = this.newCommentFiles.length;
  if (totalFiles === 0) return;
  
  this.addFileToDelete = {
    index: -1,
    fileName: `${totalFiles} fichier(s)`,
    isDeleteAll: true
  };
  this.showConfirmDeleteAddFileModal = true;
}
submitNewComment(): void {
  if (!this.newCommentData.message.trim() && this.newCommentFiles.length === 0) {
    this.error = 'Veuillez saisir un message ou ajouter un fichier';
    setTimeout(() => this.error = null, 3000);
    return;
  }
  
  this.isAddingComment = true;
  
  const formData = new FormData();
  formData.append('Message', this.newCommentData.message);
  
  // Si l'utilisateur n'est pas Admin, forcer estInterne à false
  const estInterne = this.isAdmin ? this.newCommentData.estInterne : false;
  formData.append('EstInterne', String(estInterne));
  
  this.newCommentFiles.forEach(file => {
    formData.append('fichiers', file, file.name);
  });
  
  this.commentaireService.addCommentaire(this.ticketId, formData).subscribe({
    next: () => {
      this.loadCommentaires();
      this.closeAddCommentModal();
      this.showSuccess('Commentaire ajouté avec succès');
      this.isAddingComment = false;
    },
    error: (err) => {
      console.error('Erreur ajout commentaire:', err);
      this.error = err.error?.message || 'Erreur lors de l\'ajout du commentaire';
      this.isAddingComment = false;
      setTimeout(() => this.error = null, 3000);
    }
  });
}
}