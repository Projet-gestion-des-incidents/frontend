import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TicketService } from '../../shared/services/ticket.service';
import { TicketDetailDTO, TicketDTO } from '../../shared/models/Ticket.models';
import { CommonModule, DatePipe, NgForOf, NgIf } from '@angular/common';
import { BadgeColor, BadgeComponent } from '../../shared/components/ui/badge/badge.component';
import { AvatarTextComponent } from '../../shared/components/ui/avatar/avatar-text.component';
import { finalize, forkJoin } from 'rxjs';
import { Incident, PieceJointeDTO, StatutIncident } from '../../shared/models/incident.model';
import { UserService } from '../../shared/services/user.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { IncidentService } from '../../shared/services/incident.service';

@Component({
  selector: 'app-ticket-detail',
  imports: [CommonModule, NgIf, NgForOf, DatePipe,BadgeComponent,AvatarTextComponent],
  templateUrl: './ticket-detail.component.html',
  styleUrl: './ticket-detail.component.css',
})
export class TicketDetailComponent {

  ticket?: TicketDetailDTO;
    loading = true;
      incidents: Incident[] = []; // Stocker les incidents 
  loadingIncidents = false; 

  errorMessage = '';
selectedImage: string | null = null;
   userRole: string = ''; 

  constructor(
    private route: ActivatedRoute,
    private ticketService: TicketService,
    private router: Router,
      private incidentService: IncidentService, 
    private userService: UserService, 
      private sanitizer: DomSanitizer  
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
piecesJointes: PieceJointeDTO[] = [];
showImageModal: boolean = false;
currentImageUrl: string = '';
currentImageName: string = '';
pdfUrl: SafeResourceUrl | null = null;
showPdfModal: boolean = false;

// obtenir l'URL d'une pièce jointe
getImageUrl(pieceId: string): string {
  return `https://localhost:7063/api/pieces-jointes/${pieceId}`;
}

// ouvrir le modal d'image
openImageModal(pieceId: string, imageName: string): void {
  console.log(' openImageModal appelé avec:', { pieceId, imageName });
  const url = this.getImageUrl(pieceId);
  console.log(' URL générée:', url);
  this.currentImageUrl = url;
  this.currentImageName = imageName;
  this.showImageModal = true;
  console.log(' showImageModal =', this.showImageModal);
}

//  fermer le modal d'image
closeImageModal(): void {
  this.showImageModal = false;
  this.currentImageUrl = '';
  this.currentImageName = '';
}
// Ouvrir un PDF dans un modal
openPdf(url: string): void {
  console.log(' openPdf - URL:', url);
  if (!url) {
    console.error(' URL du PDF manquante');
    return;
  }
  
  try {
    this.pdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    this.showPdfModal = true;
  } catch (error) {
    console.error(' Erreur lors de l\'ouverture du PDF:', error);
  }
}

// Fermer le modal PDF
closePdfModal(): void {
  this.showPdfModal = false;
  this.pdfUrl = null;
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
getStatutBadgeClasses(status: string): BadgeColor {
  switch (status) {
    case 'Non assigné':
    case 'Non assigne':
    case 'NonAssigne':
      return 'error';      // Rouge - pour alerter
    case 'Assigné':
    case 'Assigne':
      return 'warning';    // Jaune/Ambre - en attente
    case 'En cours':
    case 'EnCours':
      return 'orange';    // Orange - en progression
    case 'Résolu':
    case 'Resolu':
      return 'success';    // Vert - terminé
    default:
      return 'light';      // Gris clair
  }
}

// Badge pour le statut de l'incident
getStatutBadgeColor(statut: StatutIncident | string | number): BadgeColor {
  console.log('Statut reçu:', statut, 'Type:', typeof statut);
  
  // Convertir en nombre si c'est une string
  let statutValue: number;
  
  if (typeof statut === 'string') {
    const statutClean = statut.trim().toLowerCase();
    
    switch(statutClean) {
      case 'non traité':
      case 'nontraite':
      case 'non_traite':
        statutValue = StatutIncident.NonTraite;
        break;
      case 'en cours':
      case 'encours':
        statutValue = StatutIncident.EnCours;
        break;
      case 'fermé':
      case 'ferme':
      case 'résolu':
      case 'resolu':
        statutValue = StatutIncident.Ferme;
        break;
      default:
        statutValue = StatutIncident.NonTraite;
    }
  } else {
    statutValue = statut;
  }
  
  switch(statutValue) {
    case StatutIncident.NonTraite:
      return 'error';  // Bleu pour "Non traité"
    case StatutIncident.EnCours:
      return 'orange';  // Orange pour "En cours"
    case StatutIncident.Ferme:
      return 'success';  // Vert pour "Fermé"
    default:
      return 'light';
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
      return 'bg-[#C5C6FF] text-[#0C144E]';   
    case 1: // En cours
      return 'bg-[#8788FF] text-white';        
    case 2: // Fermé
      return 'bg-[#D4B8FF] text-[#0C144E]';  
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
        console.log(' Incidents chargés:', this.incidents);
      },
      error: (err) => {
        console.error(' Erreur:', err);
        this.errorMessage = 'Erreur lors du chargement des données';
      }
    });
  }
// Vérifier si c'est une image
isImage(contentType: string | null | undefined): boolean {
  if (!contentType) return false;
  const imageTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml'];
  return imageTypes.includes(contentType.toLowerCase());
}

// Vérifier si c'est un PDF
isPdf(contentType: string | null | undefined, filename: string): boolean {
  if (contentType === 'application/pdf') return true;
  return filename?.toLowerCase().endsWith('.pdf') || false;
}
downloadFile(piece: PieceJointeDTO): void {
  console.log(' Téléchargement:', piece.nomFichier);
  const downloadUrl = `https://localhost:7063/api/pieces-jointes/${piece.id}`;
  
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = piece.nomFichier;
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
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
    default: return 'light'; 
  }
}

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

