import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TicketService } from '../../shared/services/ticket.service';
import { TicketDetailDTO, TicketDTO } from '../../shared/models/Ticket.models';
import { CommonModule, DatePipe, NgForOf, NgIf } from '@angular/common';
import { BadgeColor, BadgeComponent } from '../../shared/components/ui/badge/badge.component';
import { AvatarTextComponent } from '../../shared/components/ui/avatar/avatar-text.component';
import { finalize, forkJoin } from 'rxjs';
import { Incident } from '../../shared/models/incident.model';
import { UserService } from '../../shared/services/user.service';

@Component({
  selector: 'app-ticket-detail',
  imports: [CommonModule, NgIf, NgForOf, DatePipe,BadgeComponent,AvatarTextComponent],
  templateUrl: './ticket-detail.component.html',
  styleUrl: './ticket-detail.component.css',
})
export class TicketDetailComponent {

  ticket?: TicketDetailDTO;
    loading = true;
      incidents: Incident[] = []; // Stocker les incidents séparément
  loadingIncidents = false; // 👈 AJOUTER CETTE LIGNE

  errorMessage = '';
selectedImage: string | null = null;
   userRole: string = ''; // AJOUTER CETTE PROPRIÉTÉ

  constructor(
    private route: ActivatedRoute,
    private ticketService: TicketService,
    private router: Router,
    private userService: UserService // AJOUTER UserService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.errorMessage = 'ID du ticket manquant';
      this.loading = false;
      return;
    }

    // Récupérer le rôle de l'utilisateur
    this.userService.getMyProfile().subscribe({
      next: (user) => {
        this.userRole = user.role;
        console.log('Rôle utilisateur:', this.userRole);
        this.loadTicketDetails(id);
      },
      error: (err) => {
        console.error('Erreur récupération rôle:', err);
        this.loadTicketDetails(id);
      }
    });
  }
// Ajoutez ces propriétés
showImageModal: boolean = false;
currentImageUrl: string = '';
currentImageName: string = '';

// Ajoutez cette méthode pour obtenir l'URL d'une pièce jointe
getImageUrl(pieceId: string): string {
  return `https://localhost:7063/api/pieces-jointes/${pieceId}`;
}

// Ajoutez cette méthode pour ouvrir le modal d'image
openImageModal(pieceId: string, imageName: string): void {
  this.currentImageUrl = this.getImageUrl(pieceId);
  this.currentImageName = imageName;
  this.showImageModal = true;
}

// Ajoutez cette méthode pour fermer le modal d'image
closeImageModal(): void {
  this.showImageModal = false;
  this.currentImageUrl = '';
  this.currentImageName = '';
}
  // Getter pour vérifier si l'utilisateur est admin
  get isAdmin(): boolean {
    return this.userRole === 'Admin';
  }
  getEntitesImpactees(incident: any): string {
  if (!incident.entitesImpactees || incident.entitesImpactees.length === 0) {
    return 'Non spécifié';
  }

  return incident.entitesImpactees
    .map((e: any) => e.typeEntiteImpactee)
    .join(', ');
}
// Pour les badges d'incidents
getIncidentStatutBadgeColor(statut: number): 'success' | 'warning' | 'error' | 'info' {
  if (!statut || statut === 0) return 'info';
  switch(statut) {
    case 1: return 'warning'; // EnCours
    case 2: return 'success'; // Ferme
    default: return 'info';
  }
}
// Badge pour le statut du ticket
getStatutBadgeClasses(statut: any): string {
  // Convertir en nombre si c'est une string
  let statutValue: number;
  
  if (typeof statut === 'string') {
    const statutClean = statut.trim().toLowerCase();
    switch(statutClean) {
      case 'non traité':
      case 'nontraite':
      case 'non_traite':
        statutValue = 0;
        break;
      case 'en cours':
      case 'encours':
        statutValue = 1;
        break;
      case 'fermé':
      case 'ferme':
      case 'résolu':
      case 'resolu':
        statutValue = 2;
        break;
      default:
        statutValue = 0;
    }
  } else {
    statutValue = statut;
  }
  
  switch(statutValue) {
    case 0: // Non traité
      return 'bg-[#C5C6FF] text-[#0C144E]';   // Digital Blue 48%
    case 1: // En cours
      return 'bg-[#8788FF] text-white';        // Digital Purple
    case 2: // Fermé
      return 'bg-[#D4B8FF] text-[#0C144E]';   // Digital Blue 64%
    default:
      return 'bg-[#D4B8FF] text-[#0C144E]';
  }
}


// Badge pour le statut de l'incident
getIncidentStatutBadgeClasses(statut: any): string {
  let statutValue: number;
  if (typeof statut === 'string') {
    const statutClean = statut.trim().toLowerCase();
    switch(statutClean) {
      case 'non traité': statutValue = 0; break;
      case 'en cours': statutValue = 1; break;
      case 'fermé': statutValue = 2; break;
      default: statutValue = 0;
    }
  } else {
    statutValue = statut;
  }
  
  switch(statutValue) {
    case 0: return 'bg-[#C5C6FF] text-[#0C144E]';
    case 1: return 'bg-[#8788FF] text-white';
    case 2: return 'bg-[#B2B3FF] text-[#0C144E]';
    default: return 'bg-[#C5C6FF] text-[#0C144E]';
  }
}

// Badge pour la sévérité de l'incident
getIncidentSeveriteBadgeClasses(severite: any): string {
  if (severite === 0 || severite === null || severite === undefined) {
    return 'bg-[#C5C6FF] text-[#0C144E]';
  }
  
  let severiteValue: number;
  if (typeof severite === 'string') {
    switch(severite) {
      case 'Faible': severiteValue = 1; break;
      case 'Moyenne': severiteValue = 2; break;
      case 'Forte': severiteValue = 3; break;
      default: severiteValue = 0;
    }
  } else {
    severiteValue = severite;
  }
  
  switch(severiteValue) {
    case 0: // Non traité
      return 'bg-[#C5C6FF] text-[#0C144E]';   // Digital Blue 48%
    case 1: // En cours
      return 'bg-[#8788FF] text-white';        // Digital Purple
    case 2: // Fermé
      return 'bg-[#D4B8FF] text-[#0C144E]';   // Digital Blue 64%
    default:
      return 'bg-[#D4B8FF] text-[#0C144E]';
  }
}

  loadTicketDetails(id: string): void {
    this.loading = true;
    
    // Charger les détails du ticket et les incidents en parallèle
    forkJoin({
      ticketDetails: this.ticketService.getTicketDetails(id),
      incidents: this.ticketService.getIncidentsByTicket(id)
    }).pipe(
      finalize(() => this.loading = false)
    ).subscribe({
      next: (results) => {
        // Traitement des détails du ticket
        if (results.ticketDetails.isSuccess && results.ticketDetails.data) {
          this.ticket = results.ticketDetails.data;
        } else {
          this.errorMessage = 'Ticket introuvable';
        }

        // Traitement des incidents
        this.incidents = results.incidents;
        console.log('✅ Incidents chargés:', this.incidents);
      },
      error: (err) => {
        console.error('❌ Erreur:', err);
        this.errorMessage = 'Erreur lors du chargement des données';
      }
    });
  }
// Modifiez cette méthode
isImage(contentType: string | null | undefined): boolean {
  if (!contentType) return false;
  const imageTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
  return imageTypes.includes(contentType.toLowerCase());
}
  // Navigation vers le détail de l'incident
  viewIncident(incidentId: string): void {
    this.router.navigate(['/incidents', incidentId]);
  }
 getBadgeColor(status: string): BadgeColor {

  switch (status) {
    case 'Nouveau': return 'info';
    case 'Assigné': return 'primary';
    case 'En cours': return 'warning';
    case 'Résolu': return 'success';
    case 'Clôturé': return 'dark';
    default: return 'light'; // ✅ au lieu de secondary
  }
}

  // ========== GESTION DE LA SÉVÉRITÉ ==========
  getSeveriteLibelle(severite: any, severiteLibelle: string): string {
    if (!severite) {
      return 'Non définie';
    }
    
    // Si c'est une string comme "Forte"
    if (typeof severite === 'string') {
      return severite;
    }
    
    // Si c'est un nombre
    if (typeof severite === 'number') {
      return severiteLibelle || this.getSeveriteLabelFromValue(severite);
    }
    
    return 'Non définie';
  }

  private getSeveriteLabelFromValue(severite: number): string {
    switch(severite) {
      case 1: return 'Faible';
      case 2: return 'Moyenne';
      case 3: return 'Forte';
      default: return 'Non définie';
    }
  }

  getSeveriteBadgeColor(severite: any): 'success' | 'warning' | 'error' {
    if (!severite) {
      return 'warning';
    }
    
    // Si c'est une string
    if (typeof severite === 'string') {
      switch(severite) {
        case 'Faible': return 'success';
        case 'Moyenne': return 'warning';
        case 'Forte': return 'error';
        default: return 'warning';
      }
    }
    
    // Si c'est un nombre
    if (typeof severite === 'number') {
      switch(severite) {
        case 1: return 'success';   // Faible
        case 2: return 'warning';   // Moyenne
        case 3: return 'error';     // Forte
        default: return 'warning';
      }
    }
    
    return 'warning';
  } 
  goBack() {
    this.router.navigate(['/tickets']);
  }


  }

