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

  // Statuts disponibles
  statuts: any[] = [];
  statutsAdmin = [
    { label: 'Assigné', value: 'Assigné' },
    { label: 'En cours', value: 'EnCours' },
    { label: 'Résolu', value: 'Résolu' }
  ];
  
  statutsTechnicien = [
    { label: 'En cours', value: 'EnCours' },
    { label: 'Résolu', value: 'Résolu' }
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
   * Vérifie si l'utilisateur peut modifier le commentaire
   * Le technicien ne peut modifier que ses propres commentaires
   */
  canEditComment(commentaire: any): boolean {
    if (this.isAdmin) return true;
    if (this.isTechnicien && commentaire.auteurId === this.userId) return true;
    return false;
  }

  /**
   * Vérifie si l'utilisateur peut supprimer un fichier
   */
  canDeleteFile(commentaire: any, piece: any): boolean {
    if (this.isAdmin) return true;
    if (this.isTechnicien && commentaire.auteurId === this.userId) return true;
    return false;
  }

  loadTechniciens(): void {
    this.userService.getTechniciens().subscribe({
      next: (users) => {
        this.techniciens = users.map(u => ({
          id: u.id,
          nom: u.nom,
          prenom: u.prenom
        }));
        
        this.technicienOptions = this.techniciens.map(t => ({
          value: t.id,
          label: `${t.nom} ${t.prenom}`
        }));
        
        console.log('Techniciens chargés:', this.techniciens);
      },
      error: (err) => {
        console.error('Erreur chargement techniciens:', err);
        // Ne pas bloquer l'interface, juste logger
        this.technicienOptions = [];
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

  removeFile(index: number): void {
    this.selectedFiles.splice(index, 1);
    this.nouveauxFichiers.splice(index, 1);
  }

  clearAllFiles(): void {
    this.selectedFiles = [];
    this.nouveauxFichiers = [];
  }

  private handleFiles(files: File[]): void {
    const validFiles = files.filter(file => {
      if (file.size > 10 * 1024 * 1024) {
        console.warn(`Fichier ${file.name} trop volumineux (max 10MB)`);
        return false;
      }
      return true;
    });

    if (validFiles.length !== files.length) {
      alert('Certains fichiers dépassent la limite de 10MB et ont été ignorés');
    }

    this.nouveauxFichiers = [...this.nouveauxFichiers, ...validFiles];
    this.selectedFiles = [...this.nouveauxFichiers];
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

  loadData(): void {
    this.loading = true;
    this.loadingIncidents = true;

    forkJoin({
      ticketDetails: this.ticketService.getTicketDetails(this.ticketId),
      incidents: this.incidentService.getAllIncidents().pipe(
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
      )
    }).pipe(
      finalize(() => {
        this.loading = false;
        this.loadingIncidents = false;
      })
    ).subscribe({
      next: (results) => {
        if (results.ticketDetails.isSuccess && results.ticketDetails.data) {
          this.ticket = results.ticketDetails.data;

          this.incidentsLies = results.incidentsLies;
          this.incidentsSelectionnes = this.incidentsLies.map((i: any) => i.id);

          // Initialiser les commentaires
          if (this.ticket.commentaires && this.ticket.commentaires.length > 0) {
            // Pour l'édition, on garde le premier commentaire comme commentaire principal
            this.ticket.commentaireMessage = this.ticket.commentaires[0].message;
            this.ticket.commentaireInterne = this.ticket.commentaires[0].estInterne;
            this.ticket.commentaireId = this.ticket.commentaires[0].id;
            this.ticket.commentaireAuteurId = this.ticket.commentaires[0].auteurId;
            this.piecesExistantes = this.ticket.commentaires[0].piecesJointes || [];
          } else {
            this.ticket.commentaireMessage = '';
            this.ticket.commentaireInterne = false;
            this.ticket.commentaireId = null;
            this.ticket.commentaireAuteurId = null;
            this.piecesExistantes = [];
          }
        } else {
          this.error = 'Ticket introuvable';
        }

        this.incidents = results.incidents;
        console.log('✅ Incidents chargés:', this.incidents);
        console.log('✅ Incidents liés:', this.incidentsLies);
      },
      error: (err) => {
        console.error('❌ Erreur:', err);
        this.error = 'Erreur lors du chargement des données';
      }
    });
  }

  // Vérifier si un incident est sélectionné
  isIncidentSelected(incidentId: string): boolean {
    return this.incidentsSelectionnes.includes(incidentId);
  }

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
  supprimerPieceJointe(pieceId: string): void {
    if (!this.ticket.commentaireId) return;
    
    if (confirm('Voulez-vous vraiment supprimer cette pièce jointe ?')) {
      this.piecesASupprimer.push(pieceId);
      this.piecesExistantes = this.piecesExistantes.filter((p: any) => p.id !== pieceId);
    }
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

  save() {
    if (!this.ticket) return;

    this.loading = true;
    this.error = null;

    // ADMIN: peut tout modifier via updateTicket (FormData)
    if (this.isAdmin) {
      console.log('👑 Admin: mise à jour complète du ticket');
      this.saveAsAdmin();
    }
    // TECHNICIEN: ne peut modifier que statut, assignation et son commentaire
    else if (this.isTechnicien) {
      console.log('🔧 Technicien: mise à jour limitée du ticket');
      
      // Vérifier si le technicien peut modifier le commentaire
     // if (this.ticket.commentaireId && this.ticket.commentaireAuteurId !== this.userId) {
        // Le technicien essaie de modifier un commentaire qui n'est pas le sien
        // if (this.ticket.commentaireMessage || this.nouveauxFichiers.length > 0 || this.piecesASupprimer.length > 0) {
        //   this.error = 'Vous ne pouvez modifier que vos propres commentaires';
        //   this.loading = false;
        //   return;
        // }
    //  }
      
      this.saveAsTechnicien();
    }
  }

  /**
   * Sauvegarde pour ADMIN (peut tout modifier)
   */
  private saveAsAdmin(): void {
    const ticketFormData = new FormData();
    ticketFormData.append('TitreTicket', this.ticket.titreTicket);
    ticketFormData.append('DescriptionTicket', this.ticket.descriptionTicket);
    ticketFormData.append('StatutTicket', this.ticket.statutTicket);
    
    if (this.ticket.assigneeId) {
      ticketFormData.append('AssigneeId', this.ticket.assigneeId);
    } else {
      ticketFormData.append('AssigneeId', '');
    }
    
    if (this.ticket.dateLimite) {
      ticketFormData.append('DateLimite', new Date(this.ticket.dateLimite).toISOString());
    }

    this.ticketService.updateTicket(this.ticketId, ticketFormData)
      .subscribe({
        next: (response) => {
          if (response.isSuccess) {
            this.updateCommentaire();
          } else {
            this.error = response.message || 'Erreur mise à jour ticket';
            this.loading = false;
          }
        },
        error: (err) => {
          console.error(err);
          this.error = err.error?.message || 'Erreur mise à jour ticket';
          this.loading = false;
        }
      });
  }

  /**
   * Sauvegarde pour TECHNICIEN (ne peut modifier que statut, assignation et son commentaire)
   */
  private saveAsTechnicien(): void {
    const dto: any = {};
    
    // Statut (si modifié)
    if (this.ticket.statutTicket) {
      dto.statutTicket = this.ticket.statutTicket;
    }
    
    // Assignation (si modifiée)
    if (this.ticket.assigneeId !== undefined) {
      dto.assigneeId = this.ticket.assigneeId || null;
    }

    console.log('📤 Technician update DTO:', dto);

    // Mettre à jour le ticket d'abord
    this.ticketService.technicianUpdateTicket(this.ticketId, dto)
      .subscribe({
        next: (response) => {
          if (response.isSuccess) {
            // Ensuite mettre à jour le commentaire si nécessaire
            this.updateCommentaire();
          } else {
            this.error = response.message || 'Erreur mise à jour ticket';
            this.loading = false;
          }
        },
        error: (err) => {
          console.error(err);
          this.error = err.error?.message || 'Erreur mise à jour ticket';
          this.loading = false;
        }
      });
  }

  private updateCommentaire(): void {
    // Si pas de commentaire et pas de fichiers, passer directement aux incidents
    if (!this.ticket.commentaireMessage && this.nouveauxFichiers.length === 0 && this.piecesASupprimer.length === 0) {
      this.updateIncidents();
      return;
    }

    const commentaireExistant = !!this.ticket.commentaireId;
    
    const commentaireFormData = new FormData();
    
    if (commentaireExistant) {
      commentaireFormData.append('Id', this.ticket.commentaireId);
    }
    
    commentaireFormData.append('Message', this.ticket.commentaireMessage || '');
    commentaireFormData.append('EstInterne', String(this.ticket.commentaireInterne || false));

    // Fichiers à supprimer
    this.piecesASupprimer.forEach(id => {
      commentaireFormData.append('PiecesJointesASupprimer', id);
    });

    // Nouveaux fichiers
    this.nouveauxFichiers.forEach(file => {
      commentaireFormData.append('NouveauxFichiers', file, file.name);
    });

    const request = commentaireExistant
      ? this.ticketService.updateCommentaire(this.ticket.commentaireId, commentaireFormData)
      : this.ticketService.addCommentaire(this.ticketId, commentaireFormData);

    request.subscribe({
      next: () => {
        this.updateIncidents();
      },
      error: (err) => {
        console.error('Erreur mise à jour commentaire:', err);
        this.error = err.error?.message || 'Erreur mise à jour commentaire';
        this.loading = false;
      }
    });
  }

  private updateIncidents(): void {
    // Seul l'admin peut modifier les incidents liés
    if (!this.isAdmin) {
      this.loading = false;
      this.router.navigate(['/tickets', this.ticketId]);
      return;
    }
    
    const incidentsActuels = this.incidentsLies.map((i: any) => i.id).sort();
    const ontChange = JSON.stringify(incidentsActuels) !== JSON.stringify([...this.incidentsSelectionnes].sort());
    
    if (!ontChange) {
      this.loading = false;
      this.router.navigate(['/tickets', this.ticketId]);
      return;
    }

    this.ticketService.lierIncidents(this.ticketId, this.incidentsSelectionnes).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/tickets', this.ticketId]);
      },
      error: (err) => {
        console.error('Erreur liaison incidents:', err);
        this.error = err.error?.message || 'Erreur mise à jour des incidents';
        this.loading = false;
      }
    });
  }

  private showError(message: string): void {
    alert(message);
  }
}