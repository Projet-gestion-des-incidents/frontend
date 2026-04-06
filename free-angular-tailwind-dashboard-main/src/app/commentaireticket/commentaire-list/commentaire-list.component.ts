import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommentaireService } from '../../shared/services/commentaire.service';
import { TicketService } from '../../shared/services/ticket.service';
import { UserService } from '../../shared/services/user.service';
import { CommentaireDTO, PieceJointeDTO } from '../../shared/models/Commentaire.models';
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
  successMessage: string | null = null;  // ✅ AJOUTER cette propriété
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
  
  // Pour la suppression (ancien modal)
  showDeleteModal = false;
  commentaireToDelete: CommentaireDTO | null = null;
  deleting = false;
  
  // Pour le modal d'image
  showImageModal = false;
  currentImageUrl: string = '';
  currentImageName: string = '';
  
  // ✅ NOUVEAUX MODALES (remplacent les anciens)
  showEditModal: boolean = false;
  editCommentData: any = null;
  showDeleteCommentModal: boolean = false;
  commentToDelete: any = null;
  isDeleting: boolean = false;
  filesToDelete: string[] = [];  // ✅ AJOUTER cette propriété
  
  maxFileSize = 10 * 1024 * 1024;
  maxFiles = 10;

  // Référence pour l'input file en édition
  fileInputEdit: any;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
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

  // ✅ AJOUTER cette méthode pour afficher les succès
  showSuccess(message: string): void {
    this.successMessage = message;
    setTimeout(() => {
      this.successMessage = null;
    }, 3000);
  }

  // ✅ AJOUTER cette méthode pour afficher les erreurs
  showError(message: string): void {
    this.error = message;
    setTimeout(() => {
      if (this.error === message) {
        this.error = null;
      }
    }, 5000);
  }

  /**
   * Détermine si un commentaire doit être affiché pour l'utilisateur courant
   */
  shouldDisplayComment(comment: CommentaireDTO): boolean {
    if (this.isAdmin) return true;
    if (comment.auteurId === this.userId) return true;
    return !comment.estInterne;
  }

canEditComment(commentaire: CommentaireDTO): boolean {
  // ✅ Si le ticket est résolu, on ne peut pas modifier
  if (this.isTicketResolu) return false;
  // Sinon, seul l'auteur peut modifier
  return commentaire.auteurId === this.userId;
}

canDeleteComment(commentaire: CommentaireDTO): boolean {
  // ✅ Si le ticket est résolu, on ne peut pas supprimer
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
      // ✅ Charger d'abord les infos du ticket, puis les commentaires
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
        
        // ✅ Utiliser statutTicketLibelle (qui est une chaîne) au lieu de statutTicket
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
// Modifiez loadCommentaires pour ne plus gérer le loading tout seul
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

  // ========== ÉDITION DE COMMENTAIRE (MODALE) ==========
  
  // ✅ Méthode pour ouvrir la modale d'édition
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
    this.editMessage = comment.message;
    this.editEstInterne = comment.estInterne;
    this.editFilesToAdd = [];
    this.editPiecesToDelete = [];
    this.filesToDelete = [];
    this.showEditModal = true;
  }

  // ✅ Fermer la modale d'édition
  closeEditModal(): void {
    this.showEditModal = false;
    this.editCommentData = null;
    this.editMessage = '';
    this.editEstInterne = false;
    this.editFilesToAdd = [];
    this.editPiecesToDelete = [];
    this.filesToDelete = [];
  }

  // ✅ Confirmer et sauvegarder l'édition
  confirmEditSave(): void {
    if (!this.editMessage?.trim()) {
      this.showError('Le message ne peut pas être vide');
      return;
    }
    this.saveEdit();
    this.closeEditModal();
  }

  // ✅ Sauvegarde de l'édition (appel API)
  saveEdit(): void {
    if (!this.editCommentData) return;
    
    const formData = new FormData();
    formData.append('Id', this.editCommentData.id);
    formData.append('Message', this.editMessage);
    formData.append('EstInterne', String(this.editEstInterne));
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
    const validFiles = files.filter(f => f.size <= this.maxFileSize);
    this.editFilesToAdd = [...this.editFilesToAdd, ...validFiles];
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

  // ========== SUPPRESSION DE COMMENTAIRE (MODALE AMÉLIORÉE) ==========
  
  // ✅ Ouvrir la modale de suppression
  openDeleteModal(comment: any): void {
    if (!this.canDeleteComment(comment)) {
      this.showError('Vous ne pouvez pas supprimer ce commentaire');
      return;
    }
    this.commentToDelete = comment;
    this.showDeleteCommentModal = true;
  }

  // ✅ Fermer la modale de suppression
  closeDeleteModal(): void {
    this.showDeleteCommentModal = false;
    this.commentToDelete = null;
    this.isDeleting = false;
  }

  // ✅ Exécuter la suppression
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

  // ========== UTILITAIRES ==========
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

  // ✅ Méthodes existantes conservées pour compatibilité
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
  // Ajoutez ces propriétés avec les autres déclarations
showAddCommentModal: boolean = false;
newCommentData = {
  message: '',
  estInterne: false
};
newCommentFiles: File[] = [];
isAddingComment: boolean = false;
addDragActive = false;

// Méthodes pour la modale d'ajout
openAddCommentModal(): void {
  this.showAddCommentModal = true;
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
  const validFiles = files.filter(f => {
    if (f.size > this.maxFileSize) {
      this.error = `Fichier ${f.name} trop volumineux (max 10MB)`;
      setTimeout(() => this.error = null, 3000);
      return false;
    }
    return true;
  });
  
  if (this.newCommentFiles.length + validFiles.length > this.maxFiles) {
    this.error = `Maximum ${this.maxFiles} fichiers autorisés`;
    setTimeout(() => this.error = null, 3000);
    return;
  }
  
  this.newCommentFiles = [...this.newCommentFiles, ...validFiles];
}

removeAddFile(index: number): void {
  this.newCommentFiles.splice(index, 1);
}

clearAddAllFiles(): void {
  this.newCommentFiles = [];
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
  formData.append('EstInterne', String(this.newCommentData.estInterne));
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