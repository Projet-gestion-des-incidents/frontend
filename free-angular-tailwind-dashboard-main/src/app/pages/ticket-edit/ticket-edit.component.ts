import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TicketService } from '../../shared/services/ticket.service';
import { UserService } from '../../shared/services/user.service';
import { IncidentService } from '../../shared/services/incident.service';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../../shared/components/ui/button/button.component';
import { AlertComponent } from '../../shared/components/ui/alert/alert.component';
import { BadgeComponent } from '../../shared/components/ui/badge/badge.component';
import { AvatarTextComponent } from '../../shared/components/ui/avatar/avatar-text.component';
import { forkJoin, finalize, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { TechnicianUpdateTicketDTO } from '../../shared/models/Ticket.models';

@Component({
  selector: 'app-ticket-edit',
  standalone: true,
  imports: [
    CommonModule,
    ButtonComponent,
    AlertComponent,
    FormsModule,
    RouterModule,
    ReactiveFormsModule,
    BadgeComponent,
    AvatarTextComponent
  ],
  templateUrl: './ticket-edit.component.html',
  styleUrl: './ticket-edit.component.css',
})
export class TicketEditComponent implements OnInit {
  // Fichiers
  piecesASupprimer: string[] = [];
    piecesASupprimerBackup: string[] = []; // Backup pour persistance
  nouveauxFichiers: File[] = [];
  piecesExistantes: any[] = [];
  
  // Ticket
  ticket!: any;
  ticketId!: string;
  loading = false;
  loadingIncidents = false;
  error: string | null = null;
  
  // Gestion des rôles
  userRole: string | null = null;
  isAdmin: boolean = false;
  isTechnicien: boolean = false;
  userId: string | null = null;
  
  // Pour les selects
  techniciens: { id: string; nom: string; prenom: string }[] = [];
  technicienOptions: { value: string; label: string }[] = [];
  
  // Incidents
  incidents: any[] = [];
  incidentsLies: any[] = [];
  incidentsSelectionnes: string[] = [];
  deletingIncidentId: string | null = null;

  // État de résolution
  resolvingIncidentId: string | null = null;

  // Statuts disponibles
  statuts: any[] = [];
  statutsAdmin = [
    { label: 'Assigné', value: 'Assigné' },
    { label: 'En cours', value: 'EnCours' },
    { label: 'Résolu', value: 'Resolu' }
  ];
  
statutsTechnicien = [
  { label: 'En cours', value: 'EnCours' },
  { label: 'Résolu', value: 'Resolu' }
];

  // Propriétés pour la gestion des fichiers
  isDragActive = false;
  selectedFiles: File[] = [];
  today: string = this.getTodayString();

  constructor(
    private route: ActivatedRoute,
    private ticketService: TicketService,
    private userService: UserService,
    private incidentService: IncidentService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.ticketId = this.route.snapshot.paramMap.get('id')!;
    
    // Récupérer le profil utilisateur
    this.userService.getMyProfile().subscribe({
      next: (user) => {
        this.userRole = user.role;
        this.isAdmin = user.role === 'Admin';
        this.isTechnicien = user.role === 'Technicien';
        this.userId = user.id;
        
        console.log('👤 Rôle utilisateur (edit):', this.userRole);
        console.log('  - isAdmin:', this.isAdmin);
        console.log('  - isTechnicien:', this.isTechnicien);
        console.log('  - userId:', this.userId);
        
        // Définir les statuts selon le rôle
        if (this.isAdmin) {
          this.statuts = this.statutsAdmin;
        } else if (this.isTechnicien) {
          this.statuts = this.statutsTechnicien;
        }
        
        // Charger les données
        this.loadTechniciens();
        this.loadData();
      },
      error: (err) => {
        console.error('Erreur récupération rôle:', err);
        this.error = 'Impossible de récupérer votre profil';
      }
    });
  }

  getTodayString(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    const hours = today.getHours().toString().padStart(2, '0');
    const minutes = today.getMinutes().toString().padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }


/**
 * Vérifie si l'utilisateur peut supprimer un fichier
 * - Admin: peut supprimer tous les fichiers de tous les commentaires
 * - Technicien: ne peut supprimer que les fichiers de SES PROPRES commentaires
 */
canDeleteFile(commentaire: any, piece: any): boolean {
  if (!commentaire) return false;
  
  // Admin peut tout supprimer
  if (this.isAdmin) return true;
  
  // Technicien ne peut supprimer que ses propres fichiers
  if (this.isTechnicien && commentaire.auteurId === this.userId) return true;
  
  return false;
}

/**
 * Vérifie si l'utilisateur peut modifier le commentaire
 * - Admin: peut modifier ses propres commentaires
 * - Technicien: ne peut modifier que ses propres commentaires
 */
canEditComment(commentaire: any): boolean {
  if (!commentaire) return false;
  
  // Admin ne modifie que ses propres commentaires
  if (this.isAdmin && commentaire.auteurId === this.userId) return true;
  
  // Technicien ne modifie que ses propres commentaires
  if (this.isTechnicien && commentaire.auteurId === this.userId) return true;
  
  return false;
}
/**
 * Récupère les commentaires visibles selon le rôle
 */
getCommentairesVisibles(): any[] {
  if (!this.tousLesCommentaires) return [];
  
  return this.tousLesCommentaires.filter(comment => this.isCommentVisible(comment));
}
getTechnicienComment(): any {
  if (!this.tousLesCommentaires || this.tousLesCommentaires.length === 0) {
    return null;
  }
  
  // Pour admin, retourner son propre commentaire
  if (this.isAdmin) {
    return this.tousLesCommentaires.find((c: any) => c.auteurId === this.userId) || null;
  }
  
  // Pour technicien, trouver son commentaire
  return this.tousLesCommentaires.find((comment: any) => comment.auteurId === this.userId);
}
// Dans ticket-edit.component.ts

/**
 * Trouve le commentaire contenant une pièce jointe spécifique
 */
getCommentContainingPiece(piece: any): any {
  // Utiliser tousLesCommentaires au lieu de ticket.commentaires
  if (!this.tousLesCommentaires || this.tousLesCommentaires.length === 0) {
    return null;
  }
  
  // Chercher dans tous les commentaires
  return this.tousLesCommentaires.find((comment: any) => 
    comment.piecesJointes && comment.piecesJointes.some((p: any) => p.id === piece.id)
  );
}
  /**
   * Vérifie si le technicien peut résoudre un incident
   */
/**
 * Vérifie si le technicien peut résoudre un incident
 */
canResolveIncident(incident: any): boolean {
  if (!this.isTechnicien) return false;
  
  // Convertir en string et en minuscules pour la comparaison
  const statut = String(incident.statutIncident).toLowerCase();
  
  // Ne pas résoudre si déjà résolu
  if (statut.includes('résolu') || statut.includes('resolu') || statut.includes('ferme')) {
    return false;
  }
  
  // Résoluble seulement si en cours
  return statut.includes('encours') || statut.includes('en cours');
}
  /**
   * Résoudre un incident
   */
  resoudreIncident(incidentId: string): void {
    if (!this.isTechnicien) {
      this.showError('Seuls les techniciens peuvent résoudre des incidents');
      return;
    }

    if (!confirm('Voulez-vous marquer cet incident comme résolu ?')) {
      return;
    }

    this.resolvingIncidentId = incidentId;

    this.ticketService.resoudreIncident(incidentId).subscribe({
      next: (response) => {
        if (response.isSuccess) {
          // Recharger les incidents pour voir le nouveau statut
          this.reloadIncidents();
          this.showSuccess('Incident résolu avec succès');
          
          // Mettre à jour le statut du ticket dans l'interface
          // (Le backend le fera automatiquement si tous les incidents sont résolus)
        } else {
          this.showError(response.message || 'Erreur lors de la résolution');
        }
        this.resolvingIncidentId = null;
      },
      error: (err) => {
        console.error('❌ Erreur:', err);
        this.showError(err.error?.message || 'Erreur lors de la résolution');
        this.resolvingIncidentId = null;
      }
    });
  }

  /**
   * Recharger seulement les incidents
   */
  reloadIncidents(): void {
    this.ticketService.getIncidentsByTicket(this.ticketId).subscribe({
      next: (incidents) => {
        this.incidentsLies = incidents;
        this.incidentsSelectionnes = incidents.map((i: any) => i.id);
      },
      error: (err) => {
        console.error('Erreur rechargement incidents:', err);
      }
    });
  }

// Dans ticket-edit.component.ts

// Dans ticket-edit.component.ts

loadTechniciens(): void {
  console.log('🔍 Chargement des techniciens...');
  
  this.userService.getTechniciens().subscribe({
    next: (users) => {
      console.log('✅ Techniciens reçus:', users);
      
      if (users && users.length > 0) {
        this.techniciens = users.map(u => ({
          id: u.id,
          nom: u.nom,
          prenom: u.prenom
        }));
        
        this.technicienOptions = this.techniciens.map(t => ({
          value: t.id,
          label: `${t.nom} ${t.prenom}`
        }));
        
        console.log('📋 Techniciens chargés:', this.techniciens.length);
        console.log('📋 Options:', this.technicienOptions);
      } else {
        console.warn('⚠️ Aucun technicien trouvé');
        this.technicienOptions = [];
        
        // Message d'information pour l'utilisateur
        if (this.isAdmin) {
          this.showError('Aucun technicien disponible. Veuillez en créer un d\'abord.');
        }
      }
    },
    error: (err) => {
      console.error('❌ Erreur chargement techniciens:', err);
      this.technicienOptions = [];
      this.showError('Impossible de charger la liste des techniciens');
    }
  });
}

  // Méthodes pour le drag & drop
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
      this.handleFiles(Array.from(files));
    }
  }

  onFileSelected(event: any): void {
    if (event.target.files && event.target.files.length > 0) {
      this.handleFiles(Array.from(event.target.files));
    }
  }



  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Gestion des incidents
  desactiverIncident(incidentId: string): void {
    if (!this.isAdmin) return; // Seul l'admin peut retirer des incidents
    
    this.incidentsSelectionnes = this.incidentsSelectionnes.filter(id => id !== incidentId);
    this.incidentsLies = this.incidentsLies.filter(i => i.id !== incidentId);
  }

  clearAllIncidents(): void {
    if (!this.isAdmin) return; // Seul l'admin peut tout désélectionner
    this.incidentsSelectionnes = [];
  }
incidentsDisponibles: any[] = []; // Incidents qui peuvent être liés (non traités)

// Dans loadData(), après avoir chargé le ticket
// Dans ticket-edit.component.ts - loadData()
  tousLesCommentaires: any[] = [];  // Pour la consultation (tous les commentaires)
  monCommentaire: any = null;  
loadData(): void {
  this.loading = true;
  this.loadingIncidents = true;

  forkJoin({
    ticketDetails: this.ticketService.getTicketDetails(this.ticketId),
    allIncidents: this.incidentService.getAllIncidents().pipe(
      catchError(err => {
        console.error('Erreur chargement incidents:', err);
        return of([]);
      })
    ),
    incidentsLies: this.ticketService.getIncidentsByTicket(this.ticketId).pipe(
      catchError(err => {
        console.error('Erreur chargement incidents liés:', err);
        return of([]);
      })
    ),
    tousLesCommentaires: this.ticketService.getAllCommentaires(this.ticketId).pipe(
      catchError(err => {
        console.error('Erreur chargement commentaires:', err);
        return of([]);
      })
    ),
    mesCommentaires: this.isTechnicien 
      ? this.ticketService.getMesCommentaires(this.ticketId).pipe(
          catchError(err => {
            console.error('Erreur chargement mes commentaires:', err);
            return of([]);
          })
        )
      : of([])
  }).pipe(
    finalize(() => {
      this.loading = false;
      this.loadingIncidents = false;
    })
  ).subscribe({
    next: (results) => {
      if (results.ticketDetails.isSuccess && results.ticketDetails.data) {
        this.ticket = results.ticketDetails.data;
        // Après avoir assigné this.ticket, ajoutez :
this.ticket.originalStatut = this.ticket.statutTicket;
this.ticket.originalAssigneeId = this.ticket.assigneeId;
        // Stocker tous les commentaires
        this.tousLesCommentaires = results.tousLesCommentaires;
        
        // Traitement pour ADMIN
        if (this.isAdmin) {
          this.monCommentaire = results.tousLesCommentaires.find((c: any) => c.auteurId === this.userId) || null;
          
          if (this.monCommentaire) {
            this.ticket.commentaireMessage = this.monCommentaire.message;
            this.ticket.commentaireInterne = this.monCommentaire.estInterne;
            this.ticket.commentaireId = this.monCommentaire.id;
            this.ticket.originalMessage = this.monCommentaire.message;
            this.piecesExistantes = this.monCommentaire.piecesJointes || [];
          } else {
            this.ticket.commentaireMessage = '';
            this.ticket.commentaireInterne = false;
            this.ticket.commentaireId = null;
            this.piecesExistantes = [];
            this.ticket.originalMessage = '';
          }
        }
        
        // Traitement pour TECHNICIEN
        if (this.isTechnicien) {
          this.monCommentaire = results.tousLesCommentaires.find((c: any) => c.auteurId === this.userId) || null;
          
          console.log('🔍 Technicien - monCommentaire trouvé:', this.monCommentaire ? 'OUI' : 'NON');
          
          if (this.monCommentaire) {
            this.ticket.commentaireMessage = this.monCommentaire.message;
            this.ticket.commentaireInterne = this.monCommentaire.estInterne;
            this.ticket.commentaireId = this.monCommentaire.id;
            this.ticket.originalMessage = this.monCommentaire.message;
            this.piecesExistantes = this.monCommentaire.piecesJointes || [];
          } else {
            this.ticket.commentaireMessage = '';
            this.ticket.commentaireInterne = false;
            this.ticket.commentaireId = null;
            this.piecesExistantes = [];
            this.ticket.originalMessage = '';
          }
        }

        // Incidents déjà liés
        this.incidentsLies = results.incidentsLies;
        this.incidentsSelectionnes = this.incidentsLies.map((i: any) => i.id);

        const tousLesIncidents = results.allIncidents;
        
        // ✅ CORRECTION: Filtrer les incidents disponibles
        // Un incident est disponible si:
        // 1. Il n'est pas déjà lié à ce ticket
        // 2. Il a nombreTickets === 0 (aucun ticket lié)
        // 3. Il a un statut approprié (Non traité ou Nouveau)
        this.incidentsDisponibles = tousLesIncidents.filter((incident: any) => {
          // Exclure les incidents déjà liés à ce ticket
          const estDejaLie = this.incidentsLies.some((lie: any) => lie.id === incident.id);
          if (estDejaLie) return false;
          
          // ✅ Vérifier que l'incident n'a aucun ticket lié
          const aAucunTicketLie = incident.nombreTickets === 0;
          if (!aAucunTicketLie) return false;
          
          // Vérifier si l'incident est disponible selon son statut
          const estDisponibleParStatut = this.estIncidentDisponible(incident);
          
          return estDisponibleParStatut;
        });
        
        // Pour la compatibilité avec l'ancien code
        this.incidents = this.incidentsDisponibles;
        
        console.log('📊 Incidents liés:', this.incidentsLies.length);
        console.log('📊 Incidents disponibles (sans tickets):', this.incidentsDisponibles.length);
      } else {
        this.error = 'Ticket introuvable';
      }
    },
    error: (err) => {
      console.error('❌ Erreur:', err);
      this.error = 'Erreur lors du chargement des données';
    }
  });
}
/**
 * Recharger la liste des incidents disponibles
 */
reloadIncidentsDisponibles(): void {
  this.incidentService.getAllIncidents().subscribe({
    next: (incidents) => {
      // Filtrer les incidents disponibles (sans tickets et non liés)
      this.incidentsDisponibles = incidents.filter((incident: any) => {
        const estDejaLie = this.incidentsLies.some((lie: any) => lie.id === incident.id);
        if (estDejaLie) return false;
        
        const aAucunTicketLie = incident.nombreTickets === 0;
        if (!aAucunTicketLie) return false;
        
        return this.estIncidentDisponible(incident);
      });
      
      this.incidents = this.incidentsDisponibles;
    },
    error: (err) => {
      console.error('Erreur rechargement incidents disponibles:', err);
    }
  });
}

showIncidentSelector: boolean = false;

toggleIncidentSelector(): void {
  this.showIncidentSelector = !this.showIncidentSelector;
}
lierIncident(incidentId: string): void {
  if (!this.isAdmin) return;
  
  // Trouver l'incident dans la liste des disponibles
  const incident = this.incidentsDisponibles.find(i => i.id === incidentId);
  if (!incident) return;
  
  // Appeler le service pour lier l'incident
  this.ticketService.lierIncidents(this.ticketId, [incidentId]).subscribe({
    next: (response) => {
      if (response.isSuccess) {
        // Ajouter à la liste des incidents liés
        this.incidentsLies.push(incident);
        this.incidentsSelectionnes.push(incidentId);
        
        // Retirer de la liste des disponibles
        this.incidentsDisponibles = this.incidentsDisponibles.filter(i => i.id !== incidentId);
        
        // Mettre à jour la liste incidents pour l'ancien code
        this.incidents = this.incidentsDisponibles;
        
        this.showSuccess('Incident lié avec succès');
        
        // Recharger les incidents disponibles pour être sûr
        this.reloadIncidentsDisponibles();
      } else {
        this.showError(response.message || 'Erreur lors de la liaison');
      }
    },
    error: (err) => {
      console.error('❌ Erreur liaison incident:', err);
      this.showError(err.error?.message || 'Erreur lors de la liaison');
    }
  });
}
// Dans ticket-edit.component.ts
  commentaireEnEdition: { id: string, message: string, estInterne: boolean } | null = null;
// Dans ticket-edit.component.ts

/**
 * Activer le mode édition pour un commentaire
 */
// Dans ticket-edit.component.ts

activerEdition(commentaire: any): void {
  // Vérifier les permissions
  if (!this.canEditComment(commentaire)) {
    this.showError('Vous ne pouvez pas modifier ce commentaire');
    return;
  }
  
  // Sauvegarder le commentaire en édition
  this.commentaireEnEdition = {
    id: commentaire.id,
    message: commentaire.message,
    estInterne: commentaire.estInterne
  };
  
  // IMPORTANT: Initialiser les champs d'édition avec le contenu du commentaire
  this.ticket.commentaireMessage = commentaire.message;
  this.ticket.commentaireInterne = commentaire.estInterne;
  this.ticket.commentaireId = commentaire.id;
  this.ticket.originalMessage = commentaire.message;
  
  // Initialiser les pièces jointes pour ce commentaire
  this.piecesExistantes = commentaire.piecesJointes || [];
  this.nouveauxFichiers = [];
  this.piecesASupprimer = [];
  this.piecesASupprimerBackup = [];
}

/**
 * Annuler l'édition
 */
annulerEdition(): void {
  this.commentaireEnEdition = null;
}


// ✅ Utiliser loadData() pour rafraîchir les données
sauvegarderCommentaire(): void {
  if (!this.commentaireEnEdition) return;
  
  this.loading = true;
  
  const formData = new FormData();
  formData.append('Id', this.commentaireEnEdition.id);
  formData.append('Message', this.commentaireEnEdition.message);
  formData.append('EstInterne', String(this.commentaireEnEdition.estInterne));
  
  const messageVide = !this.commentaireEnEdition.message || this.commentaireEnEdition.message.trim() === '';
  formData.append('EffacerMessage', String(messageVide));
  
  if (this.piecesASupprimer.length > 0) {
    this.piecesASupprimer.forEach(id => {
      formData.append('PiecesJointesASupprimer', id);
    });
  }
  
  if (this.nouveauxFichiers.length > 0) {
    this.nouveauxFichiers.forEach(file => {
      formData.append('NouveauxFichiers', file, file.name);
    });
  }
  
  this.ticketService.updateCommentaire(this.commentaireEnEdition.id, formData).subscribe({
    next: (response) => {
      if (response.isSuccess && response.data) {
        this.showSuccess('Commentaire modifié avec succès');
        
        // ✅ SIMPLE : Recharger toutes les données
        this.loadData();
        
        // Vider les listes temporaires
        this.nouveauxFichiers = [];
        this.piecesASupprimer = [];
        this.piecesASupprimerBackup = [];
        
        // Quitter le mode édition
        this.annulerEdition();
      } else {
        this.showError(response.message || 'Erreur lors de la modification');
      }
      this.loading = false;
    },
    error: (err: any) => {
      console.error('❌ Erreur:', err);
      this.showError(err.error?.message || 'Erreur lors de la modification');
      this.loading = false;
    }
  });
}
// Dans ticket-edit.component.ts

// Ajoutez cette propriété
showAddCommentForm: boolean = false;

/**
 * Afficher/masquer le formulaire d'ajout de commentaire
 */
toggleAddCommentForm(): void {
  this.showAddCommentForm = !this.showAddCommentForm;
  // Réinitialiser le formulaire quand on l'affiche
  if (this.showAddCommentForm) {
    this.nouveauCommentaireMessage = '';
    this.nouveauCommentaireInterne = false;
    this.nouveauxFichiers = [];
  }
}
/**
 * Supprimer un commentaire
 * - Admin: peut supprimer tous les commentaires
 * - Technicien: ne peut supprimer que son propre commentaire
 */
supprimerCommentaire(commentaireId: string): void {
  // Vérifier les permissions
  if (!this.isAdmin && !this.isTechnicien) {
    this.showError('Vous n\'avez pas les droits pour supprimer un commentaire');
    return;
  }

  // Pour le technicien, vérifier que c'est bien son commentaire
  if (this.isTechnicien && this.monCommentaire && this.monCommentaire.id !== commentaireId) {
    this.showError('Vous ne pouvez supprimer que votre propre commentaire');
    return;
  }

  if (!confirm('Voulez-vous vraiment supprimer ce commentaire ? Cette action est irréversible.')) {
    return;
  }

  this.loading = true;

  this.ticketService.deleteCommentaire(commentaireId).subscribe({
    next: (response) => {
      if (response.isSuccess) {
        this.showSuccess('Commentaire supprimé avec succès');
        
        // Recharger les données
        this.loadData();
      } else {
        this.showError(response.message || 'Erreur lors de la suppression du commentaire');
      }
      this.loading = false;
    },
    error: (err) => {
      console.error('❌ Erreur suppression commentaire:', err);
      this.showError(err.error?.message || 'Erreur lors de la suppression du commentaire');
      this.loading = false;
    }
  });
}
/**
 * Vérifie si un incident est disponible pour liaison
 * Disponible = statut différent de "EnCours" et "Résolu"/"Ferme"
 */
estIncidentDisponible(incident: any): boolean {
  // Si le libellé est disponible, l'utiliser
  if (incident.statutIncidentLibelle) {
    const libelle = incident.statutIncidentLibelle.toLowerCase();
    // Disponible si le libellé contient "non traité" ou "nouveau"
    if (libelle.includes('non') || libelle.includes('nouveau')) {
      return true;
    }
    // Non disponible si c'est "en cours" ou "résolu"
    return false;
  }
  
  // Sinon, utiliser la valeur
  if (typeof incident.statutIncident === 'number') {
    // 0 = Non traité (disponible)
    // 1 = En cours (non disponible)
    // 2 = Résolu/Fermé (non disponible)
    return incident.statutIncident === 0;
  }
  
  if (typeof incident.statutIncident === 'string') {
    const statut = incident.statutIncident.toLowerCase();
    // Disponible si ce n'est pas "encours", "ferme", "resolu"
    return !statut.includes('encours') && 
           !statut.includes('ferme') && 
           !statut.includes('resolu');
  }
  
  // Si pas de statut (null ou undefined), considéré comme disponible
  return true;
}
selectAllIncidents(): void {
  if (!this.isAdmin) return;
  this.incidentsSelectionnes = this.incidents.map(i => i.id);
}
  // Vérifier si un incident est sélectionné
  isIncidentSelected(incidentId: string): boolean {
    return this.incidentsSelectionnes.includes(incidentId);
  }
// Ajoutez cette méthode dans la classe TicketEditComponent
isImage(contentType: string | null | undefined): boolean {
  if (!contentType) {
    return false;
  }
  return contentType.startsWith('image/');
}
maxFiles: number = 10; // Limite de fichiers

  // Basculer la sélection d'un incident
  toggleIncident(incidentId: string, event: any): void {
    if (!this.isAdmin) return; // Seul l'admin peut modifier les incidents liés
    
    if (event.target.checked) {
      if (!this.incidentsSelectionnes.includes(incidentId)) {
        this.incidentsSelectionnes.push(incidentId);
      }
    } else {
      this.incidentsSelectionnes = this.incidentsSelectionnes.filter(id => id !== incidentId);
    }
  }

  // Obtenir le code d'un incident
  getIncidentCode(incidentId: string): string {
    const incident = this.incidents.find(i => i.id === incidentId);
    return incident ? incident.codeIncident : 'Incident';
  }

  // Obtenir le libellé du statut d'un incident
  getIncidentStatutLibelle(statut: number): string {
    const statutMap: { [key: number]: string } = {
      0: 'Nouveau',
      1: 'En cours',
      2: 'Résolu'
    };
    return statutMap[statut] || 'Inconnu';
  }

  // Couleur du badge pour le statut de l'incident
  getIncidentStatutBadgeColor(statut: number): string {
    switch(statut) {
      case 0: return 'info';     // Nouveau
      case 1: return 'warning';  // En cours
      case 2: return 'success';  // Résolu
      default: return 'light';
    }
  }

  // Navigation vers le détail d'un incident
  viewIncident(incidentId: string): void {
    this.router.navigate(['/incidents', incidentId]);
  }

  // Gestion des fichiers supplémentaires
  onFileInputChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;

    const filesArray = Array.from(input.files);
    this.nouveauxFichiers = [...this.nouveauxFichiers, ...filesArray];
    this.selectedFiles = [...this.nouveauxFichiers];
    input.value = '';
  }

  retirerFichier(index: number): void {
    this.nouveauxFichiers.splice(index, 1);
    this.selectedFiles.splice(index, 1);
  }

  /**
   * Supprimer une pièce jointe existante
   */
 // Ajoutez ces propriétés
showDeletePieceModal: boolean = false;
pieceToDelete: { id: string; index: number; nom: string } | null = null;

// Dans ticket-edit.component.ts

// Dans ticket-edit.component.ts

/**
 * Supprimer une pièce jointe existante
 */
// Dans ticket-edit.component.ts

/**
 * Supprimer une pièce jointe existante
 */
supprimerPieceJointe(pieceId: string, index: number) {
  // Récupérer la pièce jointe
  const piece = this.piecesExistantes[index];
  if (!piece) {
    console.error('Pièce jointe non trouvée à l\'index', index);
    return;
  }
  
  // Récupérer le commentaire contenant cette pièce
  const commentaire = this.getCommentContainingPiece(piece);
  
  console.log('🗑️ Suppression demandée pour:', piece.nomFichier, 'ID:', pieceId);
  console.log('Commentaire associé:', commentaire?.id, 'Auteur:', commentaire?.auteurId);
  console.log('Utilisateur courant:', this.userId);
  
  // Vérifier les permissions
  if (!this.isAdmin) {
    // Pour un technicien, vérifier que le commentaire lui appartient
    if (!commentaire || commentaire.auteurId !== this.userId) {
      this.showError('Vous ne pouvez pas supprimer ce fichier');
      return;
    }
  }
  
  // Stocker les infos pour confirmation
  this.pieceToDelete = {
    id: pieceId,
    index: index,
    nom: piece.nomFichier
  };
  this.showDeletePieceModal = true;
}
// Dans ticket-edit.component.ts

/**
 * Gestion des fichiers pour l'ajout de nouveau commentaire
 */
onFileSelectedForNewComment(event: any): void {
  if (event.target.files && event.target.files.length > 0) {
    this.handleFiles(Array.from(event.target.files));
  }
}
// Dans ticket-edit.component.ts

/**
 * Confirmer la suppression d'une pièce jointe
 */
confirmerSuppressionPiece() {
  if (!this.pieceToDelete) return;

  console.log('✅ Confirmation suppression:', this.pieceToDelete);
  
  // Récupérer la pièce à supprimer
  const piece = this.piecesExistantes[this.pieceToDelete.index];
  if (!piece) {
    this.showError('Fichier non trouvé');
    this.fermerModalPiece();
    return;
  }
  
  // Récupérer le commentaire contenant cette pièce
  const commentaire = this.getCommentContainingPiece(piece);
  
  if (!commentaire) {
    this.showError('Commentaire associé non trouvé');
    this.fermerModalPiece();
    return;
  }
  
  console.log('Ajout de la suppression pour le commentaire:', commentaire.id);
  
  // Ajouter l'ID à la liste des pièces à supprimer
  const idToDelete = this.pieceToDelete.id;
  
  if (!this.piecesASupprimer.includes(idToDelete)) {
    this.piecesASupprimer.push(idToDelete);
    this.piecesASupprimerBackup.push(idToDelete);
  }
  
  // Retirer de la liste d'affichage
  this.piecesExistantes = this.piecesExistantes.filter((_, i) => i !== this.pieceToDelete!.index);
  
  // Mettre à jour les pièces jointes dans le commentaire local
  if (commentaire.piecesJointes) {
    commentaire.piecesJointes = commentaire.piecesJointes.filter((p: any) => p.id !== idToDelete);
  }
  
  // ✅ NE PAS SUPPRIMER LE COMMENTAIRE ICI
  // Le commentaire ne sera supprimé que lors de la sauvegarde si le message est vide
  
  console.log('📋 piecesASupprimer après ajout:', this.piecesASupprimer);
  console.log('📋 piecesExistantes après suppression:', this.piecesExistantes.length);
  
  this.showSuccess('Fichier marqué pour suppression');
  this.fermerModalPiece();
}


/**
 * Supprimer un commentaire sans confirmation (utilisé pour suppression automatique)
 */
supprimerCommentaireSansConfirmation(commentaireId: string): void {
  this.ticketService.deleteCommentaire(commentaireId).subscribe({
    next: (response) => {
      if (response.isSuccess) {
        // Supprimer localement
        this.tousLesCommentaires = this.tousLesCommentaires.filter(c => c.id !== commentaireId);
        
        // Si c'était mon commentaire, le vider
        if (this.monCommentaire && this.monCommentaire.id === commentaireId) {
          this.monCommentaire = null;
          this.ticket.commentaireMessage = '';
          this.ticket.commentaireInterne = false;
          this.ticket.commentaireId = null;
          this.piecesExistantes = [];
        }
      }
    },
    error: (err) => {
      console.error('❌ Erreur suppression auto commentaire:', err);
    }
  });
}
/**
 * Fermer le modal de suppression
 */
fermerModalPiece() {
  this.showDeletePieceModal = false;
  this.pieceToDelete = null;
}
// Dans ticket-edit.component.ts

/**
 * Ajouter des fichiers (appelé lors du drop/upload)
 */
private handleFiles(files: File[]): void {
  console.log('📁 handleFiles appelé avec', files.length, 'fichier(s)');
  
  const validFiles = files.filter(file => {
    if (file.size > 10 * 1024 * 1024) {
      console.warn(`Fichier ${file.name} trop volumineux (max 10MB)`);
      this.showError(`Le fichier ${file.name} dépasse la limite de 10MB`);
      return false;
    }
    return true;
  });

  if (validFiles.length !== files.length) {
    this.showError(`${files.length - validFiles.length} fichier(s) ont été ignorés car trop volumineux`);
  }

  // Ajouter aux tableaux
  this.nouveauxFichiers = [...this.nouveauxFichiers, ...validFiles];
  this.selectedFiles = [...this.nouveauxFichiers];
  
  console.log('✅ nouveauxFichiers après ajout:', this.nouveauxFichiers.length);
}

/**
 * Retirer un fichier de la liste des nouveaux
 */
removeFile(index: number): void {
  console.log('🗑️ Retrait du fichier à l\'index', index);
  this.nouveauxFichiers.splice(index, 1);
  this.selectedFiles = [...this.nouveauxFichiers];
}
getPieceIndex(comment: any, piece: any): number {
  if (!comment || !comment.piecesJointes) return -1;
  return comment.piecesJointes.findIndex((p: any) => p.id === piece.id);
}
// Dans ticket-edit.component.ts

// Propriétés pour nouveau commentaire
nouveauCommentaireMessage: string = '';
nouveauCommentaireInterne: boolean = false;



/**
 * Gestion des fichiers pour l'édition
 */
onFileSelectedForEdit(event: any): void {
  if (event.target.files && event.target.files.length > 0) {
    this.handleFiles(Array.from(event.target.files));
  }
}

canAddComment(): boolean {
  // Admin peut toujours ajouter/modifier
  if (this.isAdmin) return true;
  
  // Technicien peut ajouter s'il n'a pas encore de commentaire
  if (this.isTechnicien) {
    // Vérifier si le technicien a déjà un commentaire
    const technicienComment = this.getTechnicienComment();
    return !technicienComment; // Retourne true s'il n'a PAS de commentaire
  }
  
  return false;
}
/**
 * Effacer tous les nouveaux fichiers
 */
clearAllFiles(): void {
  console.log('🗑️ Effacement de tous les nouveaux fichiers');
  this.nouveauxFichiers = [];
  this.selectedFiles = [];
}
// Ajoutez ces propriétés
showSuccessModal: boolean = false;
successMessage: string = '';

// Ajoutez ces propriétés
showDeleteIncidentModal: boolean = false;
incidentToDelete: { id: string; code: string } | null = null;

// Dans la méthode showSuccess, remplacez alert par le message stylisé
showSuccess(message: string): void {
  this.successMessage = message;
  setTimeout(() => {
    this.successMessage = '';
  }, 3000);
}

// Ajoutez la méthode pour confirmer la suppression d'un commentaire
confirmerSuppressionCommentaire(commentaireId: string, auteurNom: string): void {
  this.commentToDelete = { id: commentaireId, auteurNom: auteurNom };
  this.showDeleteCommentModal = true;
}
  // Couleur des badges
  getBadgeColor(status: string): string {
    switch (status) {
      case 'Nouveau': return 'info';
      case 'Assigné': return 'primary';
      case 'En cours': return 'warning';
      case 'Résolu': return 'success';
      case 'Clôturé': return 'dark';
      default: return 'light';
    }
  }

  cancel() {
    this.router.navigate(['/tickets']);
  }


getStatutLibelle(statut: string): string {

  
  const statutMap: { [key: string]: string } = {
    'Assigné': 'Assigné',
    'EnCours': 'En cours',
    'Resolu': 'Résolu'
  };
  
  const resultat = statutMap[statut] || statut || 'Non assigné';
  
  return resultat;
}
 getStatutBadgeColor(statut: number): 'success' | 'warning' | 'error' | 'info' {
    if (!statut || statut === 0) {
      return 'info';
    }
    
    switch(statut) {
      case 1: return 'warning';   // EnCours
      case 2: return 'success';   // Ferme
      default: return 'info';
    }
  }

  getStatutIncidentLibelle(statut: number, statutLibelle: string): string {
    if (!statut || statut === 0) {
      return 'Non défini';
    }
    return statutLibelle || `Statut ${statut}`;
  }
// Dans ticket-edit.component.ts

private saveAsAdmin(): void {
  const ticketFormData = new FormData();
  ticketFormData.append('TitreTicket', this.ticket.titreTicket);
  ticketFormData.append('DescriptionTicket', this.ticket.descriptionTicket);
  
  if (this.ticket.statutTicket && this.ticket.statutTicket !== 'null' && this.ticket.statutTicket.trim() !== '') {
    ticketFormData.append('StatutTicket', this.ticket.statutTicket);
  }
  
  if (this.ticket.assigneeId) {
    ticketFormData.append('AssigneeId', this.ticket.assigneeId);
  } else {
    ticketFormData.append('AssigneeId', '');
  }
  
  if (this.ticket.dateLimite) {
    ticketFormData.append('DateLimite', new Date(this.ticket.dateLimite).toISOString());
  }
  
  this.ticketService.updateTicket(this.ticketId, ticketFormData).subscribe({
    next: (response) => {
      if (response.isSuccess) {
        // Mettre à jour le ticket localement
        if (response.data) {
          this.ticket.titreTicket = response.data.titreTicket || this.ticket.titreTicket;
          this.ticket.descriptionTicket = response.data.descriptionTicket || this.ticket.descriptionTicket;
          this.ticket.statutTicket = response.data.statutTicket || this.ticket.statutTicket;
          this.ticket.assigneeId = response.data.assigneeId || this.ticket.assigneeId;
          //this.ticket.dateLimite = response.data.dateLimite || this.ticket.dateLimite;
        }
        
        // ✅ Toujours appeler updateCommentaire, qui gérera l'ajout/modification
        this.updateCommentaire();
      } else {
        this.error = response.message || 'Erreur mise à jour ticket';
        this.loading = false;
      }
    },
    error: (err) => {
      console.error('❌ Erreur:', err.error);
      this.error = err.error?.errors?.StatutTicket?.[0] || err.error?.message || 'Erreur mise à jour ticket';
      this.loading = false;
    }
  });
}

save() {
  if (!this.ticket) return;

  this.loading = true;
  this.error = null;

  if (this.isAdmin) {
    console.log('👑 Admin: mise à jour complète du ticket');
    this.saveAsAdmin();
  } else if (this.isTechnicien) {
    console.log('🔧 Technicien: mise à jour limitée du ticket');
    this.saveAsTechnicien();
  }
}

private saveAsTechnicien(): void {
  // ✅ Utiliser le DTO spécifique pour technicien
  const technicianUpdateDTO: TechnicianUpdateTicketDTO = {};
  
  const statutMap: { [key: string]: number } = {
    'Assigné': 1,
    'EnCours': 2,
    'Resolu': 3
  };
  
  if (this.ticket.statutTicket) {
    technicianUpdateDTO.statutTicket = statutMap[this.ticket.statutTicket] || 2;
  }
  
  // ✅ Le technicien peut modifier l'assignation
  if (this.ticket.assigneeId !== undefined) {
    technicianUpdateDTO.assigneeId = this.ticket.assigneeId || null;
  }

  // Vérifier s'il y a des changements
  const hasStatusChange = this.ticket.statutTicket && this.ticket.statutTicket !== this.ticket.originalStatut;
  const hasAssigneeChange = this.ticket.assigneeId !== this.ticket.originalAssigneeId;
  
  // Si seulement un commentaire à ajouter sans autres changements
  const hasCommentToAdd = (!this.ticket.commentaireId && 
                           (this.ticket.commentaireMessage?.trim() || this.nouveauxFichiers.length > 0));
  
  if (hasCommentToAdd && !hasStatusChange && !hasAssigneeChange) {
    // Seulement un commentaire, pas de modification du ticket
    this.ajouterCommentaireAvecFichiers(
      this.ticket.commentaireMessage || 'Fichiers joints',
      this.ticket.commentaireInterne || false,
      this.nouveauxFichiers,
      {
        isFromForm: true,
        resetForm: () => {
          this.nouveauxFichiers = [];
          this.ticket.commentaireMessage = '';
          this.ticket.commentaireInterne = false;
        }
      }
    );
    return;
  }
  
  // S'il n'y a aucune modification du ticket
  if (!hasStatusChange && !hasAssigneeChange && !hasCommentToAdd) {
    this.loading = false;
    this.router.navigate(['/tickets', this.ticketId]);
    return;
  }
  
  // ✅ Utiliser l'endpoint spécifique pour technicien
  this.ticketService.technicianUpdateTicket(this.ticketId, technicianUpdateDTO).subscribe({
    next: (response) => {
      if (response.isSuccess) {
        // Mettre à jour le ticket localement
        if (response.data) {
          this.ticket.statutTicket = response.data.statutTicket;
          this.ticket.assigneeId = response.data.assigneeId;
          // Sauvegarder les valeurs originales pour la prochaine comparaison
          this.ticket.originalStatut = this.ticket.statutTicket;
          this.ticket.originalAssigneeId = this.ticket.assigneeId;
        }
        
        // Gérer le commentaire
        this.updateCommentaire();
      } else {
        this.error = response.message || 'Erreur mise à jour ticket';
        this.loading = false;
      }
    },
    error: (err) => {
      console.error('❌ Erreur:', err);
      this.error = err.error?.message || 'Erreur mise à jour ticket';
      this.loading = false;
    }
  });
}
// Dans ticket-edit.component.ts
// Dans les propriétés de la classe, ajoutez :
originalStatut: string = '';
originalAssigneeId: string | null = null;
/**
 * Ajouter un commentaire avec fichiers
 * @param message - Le message du commentaire
 * @param estInterne - Si le commentaire est interne
 * @param fichiers - Liste des fichiers à joindre
 * @param options - Options supplémentaires
 */
ajouterCommentaireAvecFichiers(
  message: string,
  estInterne: boolean,
  fichiers: File[],
  options?: { isFromForm?: boolean; resetForm?: () => void }
): void {
  if (!message.trim() && fichiers.length === 0) {
    this.showError('Veuillez saisir un message ou ajouter un fichier');
    // Réinitialiser le flag
    this.isAddingComment = false;
    return;
  }
  
  this.loading = true;
  
  const formData = new FormData();
  formData.append('Message', message);
  formData.append('EstInterne', String(estInterne));
  
  fichiers.forEach(file => {
    formData.append('fichiers', file, file.name);
  });
  
  this.ticketService.addCommentaire(this.ticketId, formData).subscribe({
    next: (response) => {
      if (response.isSuccess && response.data) {
        this.showSuccess('Commentaire ajouté avec succès');
        
        // Recharger les données
        this.loadData();
        
        // Vider les listes temporaires
        this.nouveauxFichiers = [];
        this.piecesASupprimer = [];
        this.piecesASupprimerBackup = [];
        
        // Réinitialiser le formulaire si nécessaire
        if (options?.resetForm) {
          options.resetForm();
        }
        
        // Quitter le mode édition si actif
        if (this.commentaireEnEdition) {
          this.annulerEdition();
        }
        
        // Fermer le formulaire d'ajout
        if (options?.isFromForm) {
          this.showAddCommentForm = false;
        }
        
        // Mettre à jour monCommentaire pour technicien
        if (this.isTechnicien && !this.monCommentaire && response.data.auteurId === this.userId) {
          this.monCommentaire = response.data;
        }
        
        // ✅ Réinitialiser le flag
        this.isAddingComment = false;
      } else {
        this.showError(response.message || 'Erreur lors de l\'ajout');
        this.isAddingComment = false;
      }
      this.loading = false;
    },
    error: (err) => {
      console.error('❌ Erreur:', err);
      this.showError(err.error?.message || 'Erreur lors de l\'ajout');
      this.loading = false;
      this.isAddingComment = false;
    }
  });
}
/**
 * Ajouter un commentaire depuis le formulaire (admin ou technicien)
 */
ajouterCommentaire(): void {
  this.ajouterCommentaireAvecFichiers(
    this.nouveauCommentaireMessage,
    this.nouveauCommentaireInterne,
    this.nouveauxFichiers,
    {
      isFromForm: true,
      resetForm: () => {
        this.nouveauCommentaireMessage = '';
        this.nouveauCommentaireInterne = false;
      }
    }
  );
}
private updateCommentaire(): void {
  const allPiecesToDelete = [...this.piecesASupprimer, ...this.piecesASupprimerBackup];
  const uniquePiecesToDelete = [...new Set(allPiecesToDelete)];
  
  let commentaireId = this.ticket.commentaireId;
  if (this.commentaireEnEdition) {
    commentaireId = this.commentaireEnEdition.id;
  }
  
  const aNouveauxFichiers = this.nouveauxFichiers.length > 0;
  const aFichiersASupprimer = uniquePiecesToDelete.length > 0;
  const messageActuel = this.ticket.commentaireMessage || '';
  const messageOriginal = this.ticket.originalMessage || '';
  const aMessageModifie = messageActuel !== messageOriginal;
  
  // ✅ Vérifier s'il y a réellement quelque chose à faire
  const aUnContenu = messageActuel.trim() !== '' || aNouveauxFichiers;
  
  // ✅ CORRECTION: Détecter si c'est un nouveau commentaire
  const estNouveauCommentaire = !commentaireId && aUnContenu;
  
  // ✅ IMPORTANT: Ajouter un flag pour éviter les doublons
  if (this.isAddingComment) {
    console.log('⚠️ Déjà en cours d\'ajout de commentaire, ignore');
    return;
  }
  
  // ✅ Si c'est un nouveau commentaire, l'ajouter
  if (estNouveauCommentaire) {
    console.log('📝 Création d\'un nouveau commentaire');
    
    // Marquer qu'on est en train d'ajouter
    this.isAddingComment = true;
    
    const message = messageActuel.trim() || 'Fichiers joints';
    const estInterne = this.ticket.commentaireInterne || false;
    
    this.ajouterCommentaireAvecFichiers(
      message,
      estInterne,
      this.nouveauxFichiers,
      {
        isFromForm: true,
        resetForm: () => {
          // Réinitialiser les formulaires
          this.nouveauxFichiers = [];
          this.piecesASupprimer = [];
          this.piecesASupprimerBackup = [];
          this.ticket.commentaireMessage = '';
          this.ticket.commentaireInterne = false;
          this.ticket.commentaireId = null;
          this.ticket.originalMessage = '';
          
          // Réinitialiser le flag
          this.isAddingComment = false;
        }
      }
    );
    return;
  }
  
  // ✅ Si ce n'est pas un nouveau commentaire et qu'il n'y a pas de changements
  if (!aNouveauxFichiers && !aFichiersASupprimer && !aMessageModifie && commentaireId) {
    this.loading = false;
    this.router.navigate(['/tickets', this.ticketId]);
    return;
  }
  
  // ✅ Si c'est une modification de commentaire existant
  if (commentaireId && aUnContenu) {
    const commentaireFormData = new FormData();
    commentaireFormData.append('Id', commentaireId);
    commentaireFormData.append('Message', messageActuel);
    commentaireFormData.append('EstInterne', String(this.ticket.commentaireInterne || false));
    
    const messageVide = !messageActuel || messageActuel.trim() === '';
    commentaireFormData.append('EffacerMessage', String(messageVide));
    
    if (uniquePiecesToDelete.length > 0) {
      uniquePiecesToDelete.forEach(id => {
        commentaireFormData.append('PiecesJointesASupprimer', id);
      });
    }
    
    if (this.nouveauxFichiers.length > 0) {
      this.nouveauxFichiers.forEach(file => {
        commentaireFormData.append('NouveauxFichiers', file, file.name);
      });
    }
    
    this.ticketService.updateCommentaire(commentaireId, commentaireFormData).subscribe({
      next: (response: any) => {
        if (response.isSuccess && response.data) {
          this.showSuccess('Commentaire modifié avec succès');
          this.loadData();
          setTimeout(() => {
            this.router.navigate(['/tickets', this.ticketId]);
          }, 1000);
        } else {
          this.showError(response.message || 'Erreur lors de la modification');
        }
        this.loading = false;
      },
      error: (err: any) => {
        console.error('❌ Erreur:', err);
        this.showError(err.error?.message || 'Erreur lors de la modification');
        this.loading = false;
      }
    });
  } else {
    this.loading = false;
    this.router.navigate(['/tickets', this.ticketId]);
  }
}
isAddingComment: boolean = false;

delierIncident(incidentId: string): void {
  if (!this.isAdmin) {
    this.showError('Seuls les administrateurs peuvent retirer des incidents');
    return;
  }

  const incident = this.incidentsLies.find(i => i.id === incidentId);
  const incidentCode = incident?.codeIncident || 'cet incident';

  if (!confirm(`Voulez-vous vraiment retirer ${incidentCode} de ce ticket ?`)) {
    return;
  }

  this.deletingIncidentId = incidentId;

  this.ticketService.delierIncident(this.ticketId, incidentId).subscribe({
    next: (response) => {
      if (response.isSuccess) {
        // Retirer l'incident de la liste locale
        this.incidentsLies = this.incidentsLies.filter(i => i.id !== incidentId);
        this.incidentsSelectionnes = this.incidentsSelectionnes.filter(id => id !== incidentId);
        
        // Vérifier si cet incident est maintenant disponible (nombreTickets === 0 après délien)
        // Recharger les incidents disponibles
        this.reloadIncidentsDisponibles();
        
        this.showSuccess('Incident retiré avec succès');
      } else {
        this.showError(response.message || 'Erreur lors du retrait');
      }
      this.deletingIncidentId = null;
    },
    error: (err) => {
      console.error('❌ Erreur:', err);
      this.showError(err.error?.message || 'Erreur lors du retrait');
      this.deletingIncidentId = null;
    }
  });
}
private updateIncidents(): void {
  if (!this.isAdmin) {
    this.loading = false;
    this.router.navigate(['/tickets', this.ticketId]);
    return;
  }
  
  const incidentsActuels = this.incidentsLies.map((i: any) => i.id).sort();
  const nouvellesSelections = [...this.incidentsSelectionnes].sort();
  
  // Vérifier s'il y a des changements
  if (JSON.stringify(incidentsActuels) === JSON.stringify(nouvellesSelections)) {
    this.loading = false;
    this.router.navigate(['/tickets', this.ticketId]);
    return;
  }

  // Trouver les incidents à supprimer (présents dans actuels mais pas dans nouvelles)
  const aSupprimer = incidentsActuels.filter(id => !nouvellesSelections.includes(id));
  
  // Trouver les incidents à ajouter (présents dans nouvelles mais pas dans actuels)
  const aAjouter = nouvellesSelections.filter(id => !incidentsActuels.includes(id));

  console.log('📊 Incidents à supprimer:', aSupprimer);
  console.log('📊 Incidents à ajouter:', aAjouter);

  // S'il n'y a rien à faire
  if (aSupprimer.length === 0 && aAjouter.length === 0) {
    this.loading = false;
    this.router.navigate(['/tickets', this.ticketId]);
    return;
  }

  // Créer un tableau d'observables pour les suppressions
  const deleteRequests = aSupprimer.map(id => 
    this.ticketService.delierIncident(this.ticketId, id).pipe(
      catchError(err => {
        console.error(`Erreur suppression incident ${id}:`, err);
        return of(null);
      })
    )
  );

  // Exécuter d'abord toutes les suppressions
  forkJoin(deleteRequests).pipe(
    finalize(() => {
      // Ensuite ajouter les nouveaux incidents
      if (aAjouter.length > 0) {
        this.ticketService.lierIncidents(this.ticketId, aAjouter).subscribe({
          next: () => {
            this.loading = false;
            this.router.navigate(['/tickets', this.ticketId]);
          },
          error: (err) => {
            console.error('Erreur ajout incidents:', err);
            this.error = err.error?.message || 'Erreur mise à jour des incidents';
            this.loading = false;
          }
        });
      } else {
        this.loading = false;
        this.router.navigate(['/tickets', this.ticketId]);
      }
    })
  ).subscribe();
}

  private showError(message: string): void {
    alert(message);
  }
showDeleteCommentModal: boolean = false;
commentToDelete: { id: string, auteurNom: string } | null = null;
/**
 * Demander confirmation avant de supprimer un commentaire
 */
// confirmerSuppressionCommentaire(commentaireId: string, auteurNom: string): void {
//   this.commentToDelete = { id: commentaireId, auteurNom: auteurNom };
//   this.showDeleteCommentModal = true;
// }
// Ajoutez la méthode pour confirmer le délien d'un incident
confirmerDelierIncident(incidentId: string, incidentCode: string): void {
  console.log('🔔 Confirmation délien incident:', incidentId, incidentCode);
  console.log('🔔 showDeleteIncidentModal AVANT:', this.showDeleteIncidentModal);
  this.incidentToDelete = { id: incidentId, code: incidentCode };
  this.showDeleteIncidentModal = true;
  console.log('🔔 showDeleteIncidentModal APRÈS:', this.showDeleteIncidentModal);
  
  // Forcer la détection des changements (si nécessaire)
  setTimeout(() => {
    console.log('🔔 Vérification après setTimeout - showDeleteIncidentModal:', this.showDeleteIncidentModal);
  }, 100);
}

// Ajoutez la méthode pour exécuter le délien
executerDelierIncident(): void {
  if (!this.incidentToDelete) return;
  
  this.deletingIncidentId = this.incidentToDelete.id;

  this.ticketService.delierIncident(this.ticketId, this.incidentToDelete.id).subscribe({
    next: (response) => {
      if (response.isSuccess) {
        // Retirer l'incident de la liste locale
        this.incidentsLies = this.incidentsLies.filter(i => i.id !== this.incidentToDelete!.id);
        this.incidentsSelectionnes = this.incidentsSelectionnes.filter(id => id !== this.incidentToDelete!.id);
        
        // Recharger les incidents disponibles
        this.reloadIncidentsDisponibles();
        
        this.showSuccess(`Incident ${this.incidentToDelete!.code} retiré avec succès`);
      } else {
        this.showError(response.message || 'Erreur lors du retrait');
      }
      this.deletingIncidentId = null;
      this.fermerModalIncident();
    },
    error: (err) => {
      console.error('❌ Erreur:', err);
      this.showError(err.error?.message || 'Erreur lors du retrait');
      this.deletingIncidentId = null;
      this.fermerModalIncident();
    }
  });
}

// Ajoutez la méthode pour fermer le modal incident
fermerModalIncident(): void {
  this.showDeleteIncidentModal = false;
  this.incidentToDelete = null;
}
executerSuppressionCommentaire(): void {
  if (!this.commentToDelete) return;
  
  this.loading = true;
  
  this.ticketService.deleteCommentaire(this.commentToDelete.id).subscribe({
    next: (response) => {
      if (response.isSuccess) {
        this.showSuccess('Commentaire supprimé avec succès');
        
        // Recharger les données
        this.loadData();
      } else {
        this.showError(response.message || 'Erreur lors de la suppression');
      }
      this.loading = false;
      this.fermerModalCommentaire();
    },
    error: (err) => {
      console.error('❌ Erreur:', err);
      this.showError(err.error?.message || 'Erreur lors de la suppression');
      this.loading = false;
      this.fermerModalCommentaire();
    }
  });
}
/**
 * Fermer le modal de suppression de commentaire
 */
fermerModalCommentaire(): void {
  this.showDeleteCommentModal = false;
  this.commentToDelete = null;
}

/**
 * Vérifier si un commentaire est visible pour le technicien
 * (Les commentaires internes ne sont visibles que par les admins)
 */
isCommentVisible(comment: any): boolean {
  // Admin voit tous les commentaires
  if (this.isAdmin) return true;
  
  // Technicien
  if (this.isTechnicien) {
    // Son propre commentaire : toujours visible (même interne)
    if (comment.auteurId === this.userId) return true;
    
    // Commentaires des autres : visible seulement si non-interne
    return !comment.estInterne;
  }
  
  return true;
}
// Ajoutez ces propriétés
showImageModal: boolean = false;
currentImageUrl: string = '';
currentImageName: string = '';
/**
 * Ouvrir le modal pour afficher l'image
 */
openImageModal(url: string, name: string): void {
  this.currentImageUrl = url;
  this.currentImageName = name;
  this.showImageModal = true;
}

/**
 * Fermer le modal d'image
 */
closeImageModal(): void {
  this.showImageModal = false;
  this.currentImageUrl = '';
  this.currentImageName = '';
}
}