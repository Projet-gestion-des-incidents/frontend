import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { BadgeComponent } from '../../shared/components/ui/badge/badge.component';
import { AvatarTextComponent } from '../../shared/components/ui/avatar/avatar-text.component';
import { IncidentDetail, TypeEntiteImpactee, TypeProbleme, SeveriteIncident, StatutIncident, PieceJointeDTO } from '../../shared/models/incident.model';
import { IncidentService } from '../../shared/services/incident.service';
import { UserService } from '../../shared/services/user.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-incident-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    BadgeComponent,
    AvatarTextComponent
  ],
  templateUrl: './incident-detail.component.html',
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class IncidentDetailComponent implements OnInit {
  incident!: IncidentDetail;
  piecesJointes: PieceJointeDTO[] = [];
  loading = true;
  error: string | null = null;
  userRole: string = '';
  selectedImage: string | null = null;

  typeEntiteImpacteeLabels: { [key in TypeEntiteImpactee]: string } = {
    [TypeEntiteImpactee.MachineTPE]: 'Machine TPE',
    [TypeEntiteImpactee.FluxTransactionnel]: 'Flux Transactionnel',
    [TypeEntiteImpactee.Reseau]: 'Réseau',
    [TypeEntiteImpactee.ServiceApplicatif]: 'Service Applicatif'
  };

  // Mapping pour les valeurs string venant du backend
  stringToEnumMap: { [key: string]: TypeEntiteImpactee } = {
    'MachineTPE': TypeEntiteImpactee.MachineTPE,
    'FluxTransactionnel': TypeEntiteImpactee.FluxTransactionnel,
    'Reseau': TypeEntiteImpactee.Reseau,
    'ServiceApplicatif': TypeEntiteImpactee.ServiceApplicatif,
  };

  // Mapping pour les types de problème
  typeProblemeLabels: { [key: string]: string } = {
    'PaiementRefuse': 'Paiement refusé',
    'TerminalHorsLigne': 'Terminal hors ligne',
    'Lenteur': 'Lenteur',
    'BugAffichage': 'Bug affichage',
    'ConnexionReseau': 'Connexion réseau',
    'ErreurFluxTransactionnel': 'Erreur flux transactionnel',
    'ProblemeLogicielTPE': 'Problème logiciel TPE',
    'Autre': 'Autre'
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private incidentService: IncidentService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    // Récupérer le rôle de l'utilisateur connecté
    this.userService.getMyProfile().subscribe({
      next: (user) => {
        this.userRole = user.role;
        console.log('Rôle utilisateur:', this.userRole);
      },
      error: (err) => {
        console.error('Erreur récupération rôle:', err);
      }
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadIncidentDetails(id);
    } else {
      this.error = 'ID incident non trouvé';
      this.loading = false;
    }
  }

  loadIncidentDetails(id: string): void {
    this.loading = true;
    this.error = null;
    
    // Charger l'incident et ses pièces jointes en parallèle
    forkJoin({
      incident: this.incidentService.getIncidentDetails(id),
      piecesJointes: this.incidentService.getPiecesJointesByIncident(id)
    }).subscribe({
      next: (results) => {
        if (results.incident) {
          this.incident = results.incident;
          this.piecesJointes = results.piecesJointes;
          console.log('Incident chargé:', this.incident);
          console.log('Pièces jointes chargées:', this.piecesJointes);
        } else {
          this.error = 'Incident non trouvé';
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur chargement détails incident:', err);
        this.error = err.error?.message || 'Impossible de charger les détails de l\'incident';
        this.loading = false;
      }
    });
  }

  formatDate(date: Date): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // ========== GESTION DU STATUT DE L'INCIDENT ==========
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

  getStatutLibelle(statut: number, statutLibelle: string): string {
    if (!statut || statut === 0) {
      return 'Non défini';
    }
    return statutLibelle || `Statut ${statut}`;
  }

  // ========== GESTION DE LA SÉVÉRITÉ ==========
  getSeveriteLibelle(severite: any, severiteLibelle: string): string {
    if (!severite) {
      return 'Non définie';
    }
    
    if (typeof severite === 'string') {
      return severite;
    }
    
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
    
    if (typeof severite === 'string') {
      switch(severite) {
        case 'Faible': return 'success';
        case 'Moyenne': return 'warning';
        case 'Forte': return 'error';
        default: return 'warning';
      }
    }
    
    if (typeof severite === 'number') {
      switch(severite) {
        case 1: return 'success';
        case 2: return 'warning';
        case 3: return 'error';
        default: return 'warning';
      }
    }
    
    return 'warning';
  }

  // ========== GESTION DU TYPE DE PROBLÈME ==========
  getTypeProblemeLibelle(typeProbleme: any): string {
    if (!typeProbleme) return 'Non spécifié';
    
    if (typeof typeProbleme === 'string') {
      return this.typeProblemeLabels[typeProbleme] || typeProbleme;
    }
    
    if (typeof typeProbleme === 'number') {
      const typeMap: { [key: number]: string } = {
        1: 'PaiementRefuse',
        2: 'TerminalHorsLigne',
        3: 'Lenteur',
        4: 'BugAffichage',
        5: 'ConnexionReseau',
        6: 'ErreurFluxTransactionnel',
        7: 'ProblemeLogicielTPE',
        8: 'Autre'
      };
      const typeString = typeMap[typeProbleme];
      return this.typeProblemeLabels[typeString] || `Type ${typeProbleme}`;
    }
    
    return 'Non spécifié';
  }

  // ========== GESTION DES TICKETS ==========
  getTicketStatutBadgeColor(statut: any): 'success' | 'warning' | 'error' | 'info' | 'primary' {
    if (typeof statut === 'string') {
      switch(statut) {
        case 'Assigne': return 'primary';
        case 'En cours': return 'warning';
        case 'Résolu': return 'success';
        default: return 'info';
      }
    }
    
    switch(statut) {
      case 1: return 'primary';
      case 2: return 'warning';
      case 3: return 'success';
      default: return 'info';
    }
  }

  getTicketStatutLibelle(statut: any): string {
    if (typeof statut === 'string') {
      return statut;
    }
    
    const statuts: { [key: number]: string } = {
      1: 'Assigné',
      2: 'En cours',
      3: 'Résolu'
    };
    return statuts[statut] || 'Inconnu';
  }

  // ========== GESTION DES ENTITÉS IMPACTÉES ==========
  getTypeEntiteLibelle(type: any): string {
    console.log('Type reçu:', type, 'type:', typeof type);
    
    if (typeof type === 'number') {
      return this.typeEntiteImpacteeLabels[type as TypeEntiteImpactee] || `Type ${type} (inconnu)`;
    }
    
    if (typeof type === 'string') {
      const enumValue = this.stringToEnumMap[type];
      if (enumValue !== undefined) {
        return this.typeEntiteImpacteeLabels[enumValue];
      }
      return type.replace(/([A-Z])/g, ' $1').trim();
    }
    
    return 'Inconnu';
  }

  // ========== GESTION DES PIÈCES JOINTES ==========
  isImage(contentType: string | null | undefined): boolean {
    if (!contentType) {
      return false;
    }
    return contentType.startsWith('image/');
  }

  isImageByExtension(fileName: string): boolean {
    if (!fileName) return false;
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
    const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
    return imageExtensions.includes(ext);
  }

  openImage(url: string): void {
    this.selectedImage = url;
  }

  closeImageModal(): void {
    this.selectedImage = null;
  }

  // ========== NAVIGATION ==========
  viewTicket(ticketId: string): void {
    this.router.navigate(['/tickets', ticketId]);
  }

  goBack(): void {
    this.router.navigate(['/incidents']);
  }


}