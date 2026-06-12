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

commercants: any[] = [];
selectedCommercantId: string | null = null;
showIncidentsList: boolean = false;
filteredIncidentsDisponibles: any[] = [];
groupedIncidentsDisponibles: any[] = [];
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
        
        console.log(' Rôle utilisateur (edit):', this.userRole);
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
        this.loadCommercants();

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




loadCommercants(): void {
  console.log(' Chargement des commerçants...');
  this.userService.getCommercants().subscribe({
    next: (commercants) => {
      this.commercants = commercants;
      console.log(' Commerçants chargés:', this.commercants.length);
      console.log('Détails:', this.commercants.map(c => ({ id: c.id, nom: c.nomMagasin || c.userName })));
      
      //  Re-filtrer après chargement des incidents
      this.filtrerCommercantsAvecIncidents();
    },
    error: (err) => {
      console.error(' Erreur chargement commerçants:', err);
    }
  });
}
commercantsAvecIncidents: any[] = []; // Commerçants qui ont au moins un incident disponible

/** Filtre les commerçants pour ne garder que ceux qui ont des incidents disponibles */
filtrerCommercantsAvecIncidents(): void {
  //  Utiliser la source complète des incidents disponibles (tous les incidents sans ticket)
  const sourceIncidents = this.incidentsDisponibles || [];
  
  if (sourceIncidents.length === 0) {
    this.commercantsAvecIncidents = [];
    console.log(' Aucun incident disponible, liste des commerçants vidée');
    return;
  }
  
  console.log(' Source incidents disponibles (tous):', sourceIncidents);
  console.log(' Nombre total d\'incidents disponibles:', sourceIncidents.length);
  
  //  Regrouper par commercial et créer la liste
  const commercantsMap = new Map();
  
  sourceIncidents.forEach(incident => {
    const commercantId = incident.createdById;
    const commercantName = incident.createdByName || 'Commerçant inconnu';
    
    if (!commercantsMap.has(commercantId)) {
      commercantsMap.set(commercantId, {
        id: commercantId,
        nomMagasin: commercantName,
        nomMagazine: commercantName,
        nom: commercantName,
        incidents: []
      });
    }
    
    commercantsMap.get(commercantId).incidents.push(incident);
  });
  
  // Convertir la Map en tableau
  this.commercantsAvecIncidents = Array.from(commercantsMap.values());
  
  console.log(` Commerçants avec incidents disponibles: ${this.commercantsAvecIncidents.length}`);
  console.log('Détails:', this.commercantsAvecIncidents);
}
onCommercantChange(): void {
  console.log(' onCommercantChange appelé, selectedCommercantId:', this.selectedCommercantId);
  console.log(' commercantsAvecIncidents:', this.commercantsAvecIncidents);
  
  if (!this.selectedCommercantId) {
    this.showIncidentsList = false;
    this.filteredIncidentsDisponibles = [];
    this.groupedIncidentsDisponibles = [];
    return;
  }
  
  this.filteredIncidentsDisponibles = this.incidentsDisponibles.filter(
    incident => incident.createdById === this.selectedCommercantId
  );
  
  console.log(' Incidents filtrés:', this.filteredIncidentsDisponibles.length);
  
  // Regrouper les incidents filtrés
  this.groupIncidentsDisponiblesByCommercant();
  
  //  Afficher la liste
  this.showIncidentsList = true;
  
  console.log(` ${this.filteredIncidentsDisponibles.length} incidents pour le commerçant sélectionné`);
}

//  grouper les incidents disponibles par commerçant
groupIncidentsDisponiblesByCommercant(): void {
  const groups = new Map();
  
  this.filteredIncidentsDisponibles.forEach(incident => {
    const commercantId = incident.createdById;
    const commercantName = incident.createdByName || 'Commerçant inconnu';
    const key = `${commercantId}-${commercantName}`;
    
    if (!groups.has(key)) {
      groups.set(key, {
        commercantId: commercantId,
        commercantName: commercantName,
        incidents: []
      });
    }
    
    groups.get(key).incidents.push(incident);
  });
  
  this.groupedIncidentsDisponibles = Array.from(groups.values()).sort((a, b) => 
    a.commercantName.localeCompare(b.commercantName)
  );
  
  console.log('Incidents disponibles groupés par commerçant:', this.groupedIncidentsDisponibles);
}



canResolveIncident(incident: any): boolean {
  if (!this.isTechnicien) return false;
    const statut = String(incident.statutIncident).toLowerCase();
  
  // Ne pas résoudre si déjà résolu
  if (statut.includes('résolu') || statut.includes('resolu') || statut.includes('ferme')) {
    return false;
  }
  // Résoluble seulement si en cours
  return statut.includes('encours') || statut.includes('en cours');
}
  /** Résoudre un incident */
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
        } else {
          this.showError(response.message || 'Erreur lors de la résolution');
        }
        this.resolvingIncidentId = null;
      },
      error: (err) => {
        console.error(' Erreur:', err);
        this.showError(err.error?.message || 'Erreur lors de la résolution');
        this.resolvingIncidentId = null;
      }
    });
  }
/** Ouvrir la modale de confirmation pour résoudre un incident*/
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
/** Met à jour l'état initial du ticket */
updateInitialTicketState(): void {
  if (this.initialTicketState && this.ticket) {
    this.initialTicketState = {
      titreTicket: this.ticket.titreTicket,
      descriptionTicket: this.ticket.descriptionTicket,
      statutTicket: this.ticket.statutTicket,
      assigneeId: this.ticket.assigneeId,
      dateLimite: this.ticket.dateLimite
    };
    console.log(' initialTicketState mis à jour:', this.initialTicketState);
  }
}
/** Exécuter la résolution de l'incident*/
executerResoudreIncident(): void {
  if (!this.incidentToResolve) return;
  
  this.resolvingIncidentId = this.incidentToResolve.id;

  this.ticketService.resoudreIncident(this.incidentToResolve.id).subscribe({
    next: (response) => {
      if (response.isSuccess) {
        // Mettre à jour le statut de l'incident dans la liste locale
        const incidentResolu = this.incidentsLies.find(i => i.id === this.incidentToResolve!.id);
        if (incidentResolu) {
          incidentResolu.statutIncident = 2;
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
          
          //  METTRE À JOUR l'état initial APRÈS modification
          this.updateInitialTicketState();
          
          setTimeout(() => {
            this.router.navigate(['/tickets']);
          }, 5000);
        } else {
          this.showSuccess(`Incident ${this.incidentToResolve!.code} résolu avec succès`);
          this.hasChanges = true;
          console.log(' hasChanges forcé à true (incident résolu)');
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
      console.error(' Erreur:', err);
      const errorMessage = err.error?.message || err.message || 'Erreur lors de la résolution';
      this.showErrorDialog(errorMessage);
      this.resolvingIncidentId = null;
      this.fermerModalResolveIncident();
    }
  });
}
/** Vérifie si tous les incidents sont résolus et met à jour le ticket si nécessaire*/
verifierEtFermerTicket(): void {
  const tousResolus = this.incidentsLies.every(incident => 
    incident.statutIncident === 2 || 
    incident.statutIncidentLibelle?.toLowerCase().includes('résolu') ||
    incident.statutIncidentLibelle?.toLowerCase().includes('resolu')
  );
  
  if (tousResolus && this.ticket.statutTicket !== 'Resolu') {
    this.ticket.statutTicket = 'Resolu';
    this.showSuccess(` Tous les incidents sont résolus. Le ticket a été automatiquement fermé.`);
    setTimeout(() => {
      this.router.navigate(['/tickets']);
    }, 5000);
  }
}
/**Fermer la modale de résolution*/
fermerModalResolveIncident(): void {
  this.showResolveIncidentModal = false;
  this.incidentToResolve = null;
}
  /** Recharger seulement les incidents*/
reloadIncidents(): void {
  this.ticketService.getIncidentsByTicket(this.ticketId).subscribe({
    next: (incidents) => {
      this.incidentsLies = incidents;
      this.incidentsSelectionnes = incidents.map((i: any) => i.id);
      
      //  Vérifier si tous les incidents sont résolus après le rechargement
      const tousResolus = this.incidentsLies.every(incident => 
        incident.statutIncident === 2 || 
        incident.statutIncidentLibelle?.toLowerCase().includes('résolu') ||
        incident.statutIncidentLibelle?.toLowerCase().includes('resolu')
      );
      
      //  Si tous les incidents sont résolus et le ticket n'est pas déjà résolu
      if (tousResolus && this.ticket.statutTicket !== 'Resolu') {
        // Mettre à jour le ticket localement
        this.ticket.statutTicket = 'Resolu';
        
        // Afficher le message de succès
        this.showSuccess(` Tous les incidents sont résolus. Le ticket a été automatiquement fermé.`);
        
        //  REDIRIGER VERS LA PAGE DE LISTE DES TICKETS
        setTimeout(() => {
          this.router.navigate(['/tickets']);
        }, 5000);
      }
    },
    error: (err) => {
      console.error('Erreur rechargement incidents:', err);
    }
  });
}
showResolveIncidentModal: boolean = false;
incidentToResolve: { id: string; code: string; description: string } | null = null;

 loadTechniciens(): void {
  console.log(' Récupération des techniciens...');
  
  this.userService.getTechniciens().subscribe({
    next: (response) => {
      console.log(' Réponse reçue:', response);
      
      //  Extraire les données 
      let techniciensData = [];
      if (response?.data && Array.isArray(response.data)) {
        techniciensData = response.data;
      } else if (Array.isArray(response)) {
        techniciensData = response;
      } else if (response?.items) {
        techniciensData = response.items;
      }
      
      //  Mapper les techniciens
      this.techniciens = techniciensData.map((u: any) => ({
        id: u.id,
        nom: u.nom,
        prenom: u.prenom,
        email: u.email,
        userName: u.userName,
        phoneNumber: u.phoneNumber,
        statut: u.statut,
        birthDate: u.birthDate,
        image: u.image
      }));
            this.technicienOptions = this.techniciens.map(t => ({
        value: t.id,
        label: `${t.prenom} ${t.nom}`  
      }));
      
      console.log(' Techniciens chargés:', this.techniciens.length);
      console.log(' Options:', this.technicienOptions);
    },
    error: (err) => {
      console.error(' Erreur chargement techniciens:', err);
      this.showError('Impossible de charger les techniciens');
    }
  });
}

getIncidentStatutClasses(statut: number): string {
  switch(statut) {
     case 0: // Non traité
      return 'bg-[#C5C6FF] text-[#0C144E]';   
    case 1: // En cours
      return 'bg-[#8788FF] text-white';        
    case 2: // Fermé
      return 'bg-[#D4B8FF] text-[#0C144E]';   
    default:
      return 'bg-[#D4B8FF] text-[#0C144E]';
  }
}

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
        
        //  Sauvegarder l'état initial du ticket
        this.initialTicketState = {
          titreTicket: this.ticket.titreTicket,
          descriptionTicket: this.ticket.descriptionTicket,
          statutTicket: this.ticket.statutTicket,
          assigneeId: this.ticket.assigneeId,
          dateLimite: this.ticket.dateLimite
        };
        
        this.incidentsLies = results.incidentsLies;
        this.incidentsSelectionnes = this.incidentsLies.map((i: any) => i.id);
        
        //  Sauvegarder la liste originale des incidents liés
        this.originalIncidentsList = [...this.incidentsLies.map((i: any) => i.id)];
        
        //  Réinitialiser hasChanges à false
        this.hasChanges = false;
        this.titreTouched = false;
        this.descriptionTouched = false;
        
        this.tempAssigneeId = this.ticket.assigneeId;

        //  Incidents disponibles (sans ticket lié)
        const allIncidentsDisponibles = results.incidentsDisponibles || [];
        this.incidentsDisponibles = allIncidentsDisponibles.filter((incident: any) => {
          const estDejaLie = this.incidentsLies.some((lie: any) => lie.id === incident.id);
          return !estDejaLie;
        });
        
        console.log(' Incidents disponibles après filtrage:', this.incidentsDisponibles.length);
        
        this.incidents = this.incidentsDisponibles;
        
        //  Filtrer les commerçants qui ont des incidents disponibles
        this.filtrerCommercantsAvecIncidents();
        
        // Réinitialiser le filtrage
        this.selectedCommercantId = null;
        this.showIncidentsList = false;
        this.filteredIncidentsDisponibles = [];
        this.groupedIncidentsDisponibles = [];
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
showAssignmentSection: boolean = false;  //  Pour contrôler l'affichage de la section assignation
tempAssigneeId: string | null = null;    //  Pour stocker temporairement l'ID du technicien sélectionné
// confirmer l'assignation du technicien
confirmerAssignation(): void {
  if (this.tempAssigneeId) {
    // Mettre à jour le ticket avec le technicien sélectionné
    this.ticket.assigneeId = this.tempAssigneeId;
    // Masquer la section d'assignation
    this.showAssignmentSection = false;
    this.showSuccess('Technicien sélectionné. N\'oubliez pas d\'enregistrer les modifications.');
  }
}

//  annuler l'assignation
annulerAssignation(): void {
  this.tempAssigneeId = null;
  this.showAssignmentSection = false;
}
reloadIncidentsDisponibles(): void {
  this.incidentService.getIncidentsSansTicket().subscribe({
    next: (incidents) => {
      // Exclure les incidents déjà liés
      this.incidentsDisponibles = incidents.filter(incident => 
        !this.incidentsLies.some(lie => lie.id === incident.id)
      );
      this.incidents = this.incidentsDisponibles;
      console.log(' Incidents disponibles (sans aucun ticket lié):', this.incidentsDisponibles.length);
      
      //  Mettre à jour la liste des commerçants avec incidents
      this.filtrerCommercantsAvecIncidents();
      
      //  Si un commerçant est sélectionné, refiltrer automatiquement
      if (this.selectedCommercantId) {
        // Vérifier si le commerçant sélectionné a encore des incidents
        const commercantADesIncidents = this.commercantsAvecIncidents.some(
          c => c.id === this.selectedCommercantId
        );
        
        if (commercantADesIncidents) {
          this.filteredIncidentsDisponibles = this.incidentsDisponibles.filter(
            incident => incident.createdById === this.selectedCommercantId
          );
          this.groupIncidentsDisponiblesByCommercant();
          this.showIncidentsList = true;
        } else {
          // Réinitialiser la sélection si le commerçant n'a plus d'incidents
          this.selectedCommercantId = null;
          this.showIncidentsList = false;
          this.filteredIncidentsDisponibles = [];
          this.groupedIncidentsDisponibles = [];
        }
      }
    },
    error: (err) => {
      console.error(' Erreur chargement incidents disponibles:', err);
      this.showError('Impossible de charger les incidents');
    }
  });
}

showIncidentSelector: boolean = false;

toggleIncidentSelector(): void {
  //  Ne pas ouvrir si la limite est atteinte
  if (this.incidentsLies?.length >= this.maxIncidents && !this.showIncidentSelector) {
    this.showErrorDialog(`Vous ne pouvez pas lier plus de ${this.maxIncidents} incidents.`);
    return;
  }
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







/** Vérifie si un incident est disponible pour liaison */
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

showSuccessModal: boolean = false;
successMessage: string = '';
showDeleteIncidentModal: boolean = false;
incidentToDelete: { id: string; code: string } | null = null;

showSuccess(message: string): void {
  this.successMessage = message;
  setTimeout(() => {
    this.successMessage = '';
  }, 5000);
}

hasChanges: boolean = false;
initialTicketState: any = null;
titreTouched: boolean = false;
descriptionTouched: boolean = false;

//  getters pour la validation
get titreInvalid(): boolean {
  return !this.ticket?.titreTicket || this.ticket.titreTicket.length < 3;
}

get descriptionInvalid(): boolean {
  return !this.ticket?.descriptionTicket || this.ticket.descriptionTicket.length < 10;
}

// vérifier si des changements ont été effectués
checkForChanges(): void {
  if (!this.initialTicketState || !this.ticket) {
    this.hasChanges = false;
    return;
  }
  
  let hasAnyChange = false;
  
  // Vérifier le titre (pour admin)
  if (this.isAdmin) {
    if (this.ticket.titreTicket !== this.initialTicketState.titreTicket) {
      hasAnyChange = true;
      console.log(' Changement détecté: Titre');
    }
  }
  
  // Vérifier la description (pour admin)
  if (this.isAdmin) {
    if (this.ticket.descriptionTicket !== this.initialTicketState.descriptionTicket) {
      hasAnyChange = true;
      console.log(' Changement détecté: Description');
    }
  }
  
  // Vérifier le statut (pour technicien)
  if (this.isTechnicien) {
    if (this.ticket.statutTicket !== this.initialTicketState.statutTicket) {
      hasAnyChange = true;
      console.log(' Changement détecté: Statut');
    }
  }
  
  //  Vérifier l'assignation (pour admin) - TOUJOURS vérifier
  if (this.isAdmin) {
    const currentAssigneeId = this.ticket.assigneeId || null;
    const originalAssigneeId = this.initialTicketState.assigneeId || null;
    if (currentAssigneeId !== originalAssigneeId) {
      hasAnyChange = true;
      console.log(' Changement détecté: Assignation (', originalAssigneeId, '->', currentAssigneeId, ')');
    }
  }
  
  // Vérifier la date limite (pour admin)
  if (this.isAdmin) {
    if (this.ticket.dateLimite !== this.initialTicketState.dateLimite) {
      hasAnyChange = true;
      console.log(' Changement détecté: Date limite');
    }
  }
  
  // Vérifier si la liste des incidents a changé
  const currentIncidentsList = this.incidentsLies.map((i: any) => i.id).sort();
  const originalIncidentsList = this.originalIncidentsList.sort();
  
  if (JSON.stringify(currentIncidentsList) !== JSON.stringify(originalIncidentsList)) {
    hasAnyChange = true;
    console.log(' Changement détecté: Liste des incidents');
  }
  
  this.hasChanges = hasAnyChange;
  console.log(' hasChanges =', this.hasChanges);
}
// confirmer la suppression d'un commentaire
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

private saveAsAdmin(): void {
    if (!this.ticket.descriptionTicket || this.ticket.descriptionTicket.length < 10) {
    this.error = 'La description doit contenir au moins 10 caractères';
    this.loading = false;
    // Scroll vers le haut pour voir l'erreur
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  
  //  Validation du titre 
  if (!this.ticket.titreTicket || this.ticket.titreTicket.trim() === '') {
    this.error = 'Le titre est requis';
    this.loading = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
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
                this.loading = false;
        
        // Afficher un message de succès
        this.showSuccess('Ticket mis à jour avec succès');
        
        // Rediriger après un court délai
        setTimeout(() => {
          this.router.navigate(['/tickets']);
        }, 5000);
        
      } else {
        this.error = response.message || 'Erreur mise à jour ticket';
        this.loading = false;  
      }
    },
    error: (err) => {
      console.error(' Erreur:', err.error);
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
    console.log(' Admin: mise à jour complète du ticket');
    this.saveAsAdmin();
  } else if (this.isTechnicien) {
    console.log(' Technicien: mise à jour limitée du ticket');
    this.saveAsTechnicien();
  }
}

private saveAsTechnicien(): void {
  //  Utiliser le DTO spécifique pour technicien
  const technicianUpdateDTO: TechnicianUpdateTicketDTO = {};
  
  const statutMap: { [key: string]: number } = {
    'Assigné': 1,
    'EnCours': 2,
    'Resolu': 3
  };
  
  if (this.ticket.statutTicket) {
    technicianUpdateDTO.statutTicket = statutMap[this.ticket.statutTicket] || 2;
  }
  
  //  Le technicien peut modifier l'assignation
  if (this.ticket.assigneeId !== undefined) {
    technicianUpdateDTO.assigneeId = this.ticket.assigneeId || null;
  }

  // Vérifier s'il y a des changements
  const hasStatusChange = this.ticket.statutTicket && this.ticket.statutTicket !== this.originalStatut;
  const hasAssigneeChange = this.ticket.assigneeId !== this.originalAssigneeId;
  
  // S'il n'y a aucune modification du ticket
  if (!hasStatusChange && !hasAssigneeChange) {
    this.loading = false;  
    this.router.navigate(['/tickets']);
    return;
  }
    this.ticketService.technicianUpdateTicket(this.ticketId, technicianUpdateDTO).subscribe({
    next: (response) => {
      if (response.isSuccess) {
        // Mettre à jour le ticket 
        if (response.data) {
          this.ticket.statutTicket = response.data.statutTicket;
          this.ticket.assigneeId = response.data.assigneeId;
          // Sauvegarder les valeurs originales pour la prochaine comparaison
          this.originalStatut = this.ticket.statutTicket;
          this.originalAssigneeId = this.ticket.assigneeId;
        }
                this.loading = false;
        
        // Afficher un message de succès
        this.showSuccess('Ticket mis à jour avec succès');
        
        // Rediriger après un court délai pour voir le message
        setTimeout(() => {
          this.router.navigate(['/tickets']);
        }, 5000);
        
      } else {
        this.error = response.message || 'Erreur mise à jour ticket';
        this.loading = false;  
      }
    },
    error: (err) => {
      console.error(' Erreur:', err);
      this.error = err.error?.message || 'Erreur mise à jour ticket';
      this.loading = false; 
    }
  });
}

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
      console.error(' Erreur:', err);
      this.showError(err.error?.message || 'Erreur lors du retrait');
      this.deletingIncidentId = null;
    }
  });
}
private updateIncidents(): void {
  if (!this.isAdmin) {
    this.loading = false;
    this.router.navigate(['/tickets']);
    return;
  }
  
  const incidentsActuels = this.incidentsLies.map((i: any) => i.id).sort();
  const nouvellesSelections = [...this.incidentsSelectionnes].sort();
  
  // Vérifier s'il y a des changements
  if (JSON.stringify(incidentsActuels) === JSON.stringify(nouvellesSelections)) {
    this.loading = false;
    this.router.navigate(['/tickets']);
    return;
  }

  // Trouver les incidents à supprimer (présents dans actuels mais pas dans nouvelles)
  const aSupprimer = incidentsActuels.filter(id => !nouvellesSelections.includes(id));
  
  // Trouver les incidents à ajouter (présents dans nouvelles mais pas dans actuels)
  const aAjouter = nouvellesSelections.filter(id => !incidentsActuels.includes(id));

  console.log(' Incidents à supprimer:', aSupprimer);
  console.log(' Incidents à ajouter:', aAjouter);

  // S'il n'y a rien à faire
  if (aSupprimer.length === 0 && aAjouter.length === 0) {
    this.loading = false;
    this.router.navigate(['/tickets']);
    return;
  }

  // Créer un tableau  pour les suppressions
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
            this.router.navigate(['/tickets']);
          },
          error: (err) => {
            console.error('Erreur ajout incidents:', err);
            this.error = err.error?.message || 'Erreur mise à jour des incidents';
            this.loading = false;
          }
        });
      } else {
        this.loading = false;
        this.router.navigate(['/tickets']);
      }
    })
  ).subscribe();
}

  private showError(message: string): void {
    alert(message);
  }
showDeleteCommentModal: boolean = false;
commentToDelete: { id: string, auteurNom: string } | null = null;

confirmerDelierIncident(incidentId: string, incidentCode: string): void {
  console.log(' Confirmation délien incident:', incidentId, incidentCode);
  
  //  Vérifier si c'est le dernier incident (limite minimum = 1)
  if (this.incidentsLies.length === 1) {
    this.showErrorDialog('Impossible de retirer le dernier incident lié. Un ticket doit avoir au moins 1 incident associé.');
    return;
  }
  
  this.incidentToDelete = { id: incidentId, code: incidentCode };
  this.showDeleteIncidentModal = true;
}


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
        
        //  Vérifier les changements après délien
        this.checkForChanges();
        
        this.showSuccess(`Incident ${this.incidentToDelete!.code} retiré avec succès`);
      } else {
        this.showErrorDialog(response.message || 'Erreur lors du retrait');
      }
      this.deletingIncidentId = null;
      this.fermerModalIncident();
    },
    error: (err) => {
      console.error(' Erreur:', err);
      const errorMessage = err.error?.message || err.message || 'Erreur lors du retrait';
      this.showErrorDialog(errorMessage);
      this.deletingIncidentId = null;
      this.fermerModalIncident();
    }
  });
}
originalIncidentsList: string[] = []; // Garde une copie de la liste originale des incidents liés

showErrorDialog(message: string, shouldScroll: boolean = false): void {
  this.error = message;
  
  //  NE PAS scroller automatiquement sauf si explicitement demandé
  if (shouldScroll) {
    setTimeout(() => {
      const errorElement = document.querySelector('.rounded-xl.border-red-200');
      if (errorElement) {
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }
  
  // Auto-fermeture après 5 secondes
  setTimeout(() => {
    if (this.error === message) {
      this.error = null;
    }
  }, 5000);
}

// fermer le modal incident
fermerModalIncident(): void {
  this.showDeleteIncidentModal = false;
  this.incidentToDelete = null;
}


showImageModal: boolean = false;
currentImageUrl: string = '';
currentImageName: string = '';
/** Ouvrir le modal pour afficher l'image*/
openImageModal(url: string, name: string): void {
  this.currentImageUrl = url;
  this.currentImageName = name;
  this.showImageModal = true;
}

/** Fermer le modal d'image*/
closeImageModal(): void {
  this.showImageModal = false;
  this.currentImageUrl = '';
  this.currentImageName = '';
}
showLinkIncidentModal: boolean = false;
incidentToLink: { id: string; code: string; description: string } | null = null;
//  confirmer la liaison d'un incident
confirmerLierIncident(incidentId: string, incidentCode: string, incidentDescription: string): void {
  this.incidentToLink = { id: incidentId, code: incidentCode, description: incidentDescription };
  this.showLinkIncidentModal = true;
}

  maxIncidents: number = 5;  //  Limite maximum d'incidents
  showMaxIncidentError: boolean = false;  //  afficher l'erreur de limite

executerLierIncident(): void {
  if (!this.incidentToLink) return;
  
  //  Vérifier la limite avant d'ajouter
  if (this.incidentsLies.length >= this.maxIncidents) {
    this.showErrorDialog(`Vous ne pouvez pas lier plus de ${this.maxIncidents} incidents à ce ticket.`);
    this.fermerModalLienIncident();
    this.loading = false;
    return;
  }
  
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
          
          // Mettre à jour la liste des commerçants avec incidents
          this.filtrerCommercantsAvecIncidents();
          
          // Mettre à jour les listes filtrées pour le commerçant actuel
          if (this.selectedCommercantId) {
            const commercantADesIncidents = this.commercantsAvecIncidents.some(
              c => c.id === this.selectedCommercantId
            );
            
            if (commercantADesIncidents) {
              this.filteredIncidentsDisponibles = this.incidentsDisponibles.filter(
                incident => incident.createdById === this.selectedCommercantId
              );
              this.groupIncidentsDisponiblesByCommercant();
              this.showIncidentsList = true;
            } else {
              this.selectedCommercantId = null;
              this.showIncidentsList = false;
              this.filteredIncidentsDisponibles = [];
              this.groupedIncidentsDisponibles = [];
            }
          }
        }
        
        //  Vérifier les changements après liaison
        this.checkForChanges();
        
        this.showSuccess(`Incident ${this.incidentToLink!.code} lié avec succès`);
        this.fermerModalLienIncident();
      } else {
        this.showErrorDialog(response.message || 'Erreur lors de la liaison');
        this.fermerModalLienIncident();
      }
      this.loading = false;
    },
    error: (err) => {
      console.error(' Erreur liaison incident:', err);
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