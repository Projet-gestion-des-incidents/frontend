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
 * Ouvrir la modale de confirmation pour résoudre un incident
 */
confirmerResoudreIncident(incidentId: string, incidentCode: string, incidentDescription: string): void {
  if (!this.isTechnicien) {
    this.showErrorDialog('Seuls les techniciens peuvent résoudre des incidents');
    return;
  }
  
  this.incidentToResolve = {
    id: incidentId,
    code: incidentCode,
    description: incidentDescription
  };
  this.showResolveIncidentModal = true;
}

/**
 * Exécuter la résolution de l'incident
 */
executerResoudreIncident(): void {
  if (!this.incidentToResolve) return;
  
  this.resolvingIncidentId = this.incidentToResolve.id;

  this.ticketService.resoudreIncident(this.incidentToResolve.id).subscribe({
    next: (response) => {
      if (response.isSuccess) {
        // Mettre à jour le statut de l'incident dans la liste locale
        const incidentResolu = this.incidentsLies.find(i => i.id === this.incidentToResolve!.id);
        if (incidentResolu) {
          incidentResolu.statutIncident = 2; // Statut Résolu/Fermé
          incidentResolu.statutIncidentLibelle = 'Résolu';
        }
        
        // Vérifier si tous les incidents sont résolus
        const tousResolus = this.incidentsLies.every(incident => 
          incident.statutIncident === 2 || 
          incident.statutIncidentLibelle?.toLowerCase().includes('résolu') ||
          incident.statutIncidentLibelle?.toLowerCase().includes('resolu')
        );
        
        // Si tous les incidents sont résolus, mettre à jour le statut du ticket
        if (tousResolus && this.ticket.statutTicket !== 'Resolu') {
          this.ticket.statutTicket = 'Resolu';
          this.showSuccess(`Tous les incidents sont résolus. Le ticket a été automatiquement fermé.`);
        } else {
          this.showSuccess(`Incident ${this.incidentToResolve!.code} résolu avec succès`);
        }
        
        // Fermer la modale
        this.fermerModalResolveIncident();
      } else {
        this.showErrorDialog(response.message || 'Erreur lors de la résolution');
        this.fermerModalResolveIncident();
      }
      this.resolvingIncidentId = null;
    },
    error: (err) => {
      console.error('❌ Erreur:', err);
      const errorMessage = err.error?.message || err.message || 'Erreur lors de la résolution';
      this.showErrorDialog(errorMessage);
      this.resolvingIncidentId = null;
      this.fermerModalResolveIncident();
    }
  });
}
/**
 * Vérifie si tous les incidents sont résolus et met à jour le ticket si nécessaire
 */
verifierEtFermerTicket(): void {
  const tousResolus = this.incidentsLies.every(incident => 
    incident.statutIncident === 2 || 
    incident.statutIncidentLibelle?.toLowerCase().includes('résolu') ||
    incident.statutIncidentLibelle?.toLowerCase().includes('resolu')
  );
  
  if (tousResolus && this.ticket.statutTicket !== 'Resolu') {
    this.ticket.statutTicket = 'Resolu';
    this.showSuccess(`✅ Tous les incidents sont résolus. Le ticket a été automatiquement fermé.`);
  }
}
/**
 * Fermer la modale de résolution
 */
fermerModalResolveIncident(): void {
  this.showResolveIncidentModal = false;
  this.incidentToResolve = null;
}
  /**
   * Recharger seulement les incidents
   */
 /**
 * Recharger seulement les incidents
 */
reloadIncidents(): void {
  this.ticketService.getIncidentsByTicket(this.ticketId).subscribe({
    next: (incidents) => {
      this.incidentsLies = incidents;
      this.incidentsSelectionnes = incidents.map((i: any) => i.id);
      
      // Vérifier si tous les incidents sont résolus après le rechargement
      this.verifierEtFermerTicket();
    },
    error: (err) => {
      console.error('Erreur rechargement incidents:', err);
    }
  });
}
// Ajoutez ces propriétés avec les autres déclarations de modales
showResolveIncidentModal: boolean = false;
incidentToResolve: { id: string; code: string; description: string } | null = null;
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

  loadData(): void {
    this.loading = true;
    this.loadingIncidents = true;

    forkJoin({
      ticketDetails: this.ticketService.getTicketDetails(this.ticketId),
      incidentsDisponibles: this.incidentService.getIncidentsSansTicket().pipe(
        catchError(err => {
          console.error('Erreur chargement incidents disponibles:', err);
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
          this.originalStatut = this.ticket.statutTicket;
          this.originalAssigneeId = this.ticket.assigneeId;

          this.incidentsLies = results.incidentsLies;
          this.incidentsSelectionnes = this.incidentsLies.map((i: any) => i.id);

          this.incidentsDisponibles = results.incidentsDisponibles || [];
          this.incidentsDisponibles = this.incidentsDisponibles.filter((incident: any) => {
            const estDejaLie = this.incidentsLies.some((lie: any) => lie.id === incident.id);
            return !estDejaLie;
          });
          
          this.incidents = this.incidentsDisponibles;
        } else {
          this.error = 'Ticket introuvable';
        }
      },
      error: (err) => {
        console.error('Erreur:', err);
        this.error = 'Erreur lors du chargement des données';
      }
    });
  }
reloadIncidentsDisponibles(): void {
  this.incidentService.getIncidentsSansTicket().subscribe({
    next: (incidents) => {
      // Exclure les incidents déjà liés
      this.incidentsDisponibles = incidents.filter(incident => 
        !this.incidentsLies.some(lie => lie.id === incident.id)
      );
      this.incidents = this.incidentsDisponibles;
      console.log('✅ Incidents disponibles (sans aucun ticket lié):', this.incidentsDisponibles.length);
    },
    error: (err) => {
      console.error('❌ Erreur chargement incidents disponibles:', err);
      this.showError('Impossible de charger les incidents');
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
  
  // Ouvrir la modale de confirmation
  this.confirmerLierIncident(incident.id, incident.codeIncident, incident.descriptionIncident);
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
        }
        
        // ✅ AJOUTER CETTE LIGNE - Terminer le chargement
        this.loading = false;
        
        // Afficher un message de succès
        this.showSuccess('Ticket mis à jour avec succès');
        
        // Rediriger après un court délai
        setTimeout(() => {
          this.router.navigate(['/tickets', this.ticketId]);
        }, 1500);
        
      } else {
        this.error = response.message || 'Erreur mise à jour ticket';
        this.loading = false;  // ✅ AJOUTER CETTE LIGNE
      }
    },
    error: (err) => {
      console.error('❌ Erreur:', err.error);
      this.error = err.error?.errors?.StatutTicket?.[0] || err.error?.message || 'Erreur mise à jour ticket';
      this.loading = false;  // ✅ AJOUTER CETTE LIGNE (déjà présente)
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
  const hasStatusChange = this.ticket.statutTicket && this.ticket.statutTicket !== this.originalStatut;
  const hasAssigneeChange = this.ticket.assigneeId !== this.originalAssigneeId;
  
  // S'il n'y a aucune modification du ticket
  if (!hasStatusChange && !hasAssigneeChange) {
    this.loading = false;  // ✅ AJOUTER CETTE LIGNE
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
          this.originalStatut = this.ticket.statutTicket;
          this.originalAssigneeId = this.ticket.assigneeId;
        }
        
        // ✅ AJOUTER CETTE LIGNE - Terminer le chargement
        this.loading = false;
        
        // Afficher un message de succès
        this.showSuccess('Ticket mis à jour avec succès');
        
        // Rediriger après un court délai pour voir le message
        setTimeout(() => {
          this.router.navigate(['/tickets', this.ticketId]);
        }, 1500);
        
      } else {
        this.error = response.message || 'Erreur mise à jour ticket';
        this.loading = false;  // ✅ AJOUTER CETTE LIGNE
      }
    },
    error: (err) => {
      console.error('❌ Erreur:', err);
      this.error = err.error?.message || 'Erreur mise à jour ticket';
      this.loading = false;  // ✅ AJOUTER CETTE LIGNE (déjà présente mais vérifiez)
    }
  });
}
// Dans ticket-edit.component.ts
// Dans les propriétés de la classe, ajoutez :
originalStatut: string = '';
originalAssigneeId: string | null = null;



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
  
  // ✅ Vérifier si c'est le dernier incident
  if (this.incidentsLies.length === 1) {
    this.showErrorDialog('Impossible de retirer le dernier incident lié. Un ticket doit avoir au moins un incident associé.');
    return;
  }
  
  this.incidentToDelete = { id: incidentId, code: incidentCode };
  this.showDeleteIncidentModal = true;
}

// Dans ticket-edit.component.ts

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
        // ✅ Utiliser l'affichage d'erreur stylisé au lieu de alert
        this.showErrorDialog(response.message || 'Erreur lors du retrait');
      }
      this.deletingIncidentId = null;
      this.fermerModalIncident();
    },
    error: (err) => {
      console.error('❌ Erreur:', err);
      // ✅ Récupérer le message d'erreur du backend
      const errorMessage = err.error?.message || err.message || 'Erreur lors du retrait';
      this.showErrorDialog(errorMessage);
      this.deletingIncidentId = null;
      this.fermerModalIncident();
    }
  });
}

// ✅ Nouvelle méthode pour afficher les erreurs avec le style existant
showErrorDialog(message: string): void {
  this.error = message;
  
  // Faire défiler jusqu'au message d'erreur
  setTimeout(() => {
    const errorElement = document.querySelector('.rounded-xl.border-red-200');
    if (errorElement) {
      errorElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, 100);
  
  // Auto-fermeture après 5 secondes
  setTimeout(() => {
    if (this.error === message) {
      this.error = null;
    }
  }, 5000);
}

// Ajoutez la méthode pour fermer le modal incident
fermerModalIncident(): void {
  this.showDeleteIncidentModal = false;
  this.incidentToDelete = null;
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
// Ajoutez ces propriétés avec les autres déclarations
showLinkIncidentModal: boolean = false;
incidentToLink: { id: string; code: string; description: string } | null = null;
// Méthode pour confirmer la liaison d'un incident
confirmerLierIncident(incidentId: string, incidentCode: string, incidentDescription: string): void {
  this.incidentToLink = { id: incidentId, code: incidentCode, description: incidentDescription };
  this.showLinkIncidentModal = true;
}

// Méthode pour exécuter la liaison
executerLierIncident(): void {
  if (!this.incidentToLink) return;
  
  this.loading = true;
  
  this.ticketService.lierIncidents(this.ticketId, [this.incidentToLink.id]).subscribe({
    next: (response) => {
      if (response.isSuccess) {
        // Trouver l'incident complet dans la liste des disponibles
        const incidentComplet = this.incidentsDisponibles.find(i => i.id === this.incidentToLink!.id);
        
        if (incidentComplet) {
          // Ajouter à la liste des incidents liés
          this.incidentsLies.push(incidentComplet);
          this.incidentsSelectionnes.push(this.incidentToLink!.id);
          
          // Retirer de la liste des disponibles
          this.incidentsDisponibles = this.incidentsDisponibles.filter(i => i.id !== this.incidentToLink!.id);
          this.incidents = this.incidentsDisponibles;
        }
        
        this.showSuccess(`Incident ${this.incidentToLink!.code} lié avec succès`);
        
        // Ne pas recharger toutes les données, juste fermer la modale
        this.fermerModalLienIncident();
      } else {
        this.showErrorDialog(response.message || 'Erreur lors de la liaison');
        this.fermerModalLienIncident();
      }
      this.loading = false;
    },
    error: (err) => {
      console.error('❌ Erreur liaison incident:', err);
      const errorMessage = err.error?.message || err.message || 'Erreur lors de la liaison';
      this.showErrorDialog(errorMessage);
      this.fermerModalLienIncident();
      this.loading = false;
    }
  });
}

// Fermer le modal de liaison
fermerModalLienIncident(): void {
  this.showLinkIncidentModal = false;
  this.incidentToLink = null;
}

}