import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { BadgeColor, BadgeComponent } from '../../shared/components/ui/badge/badge.component';
import { AvatarTextComponent } from '../../shared/components/ui/avatar/avatar-text.component';
import { IncidentDetail, TypeEntiteImpactee, TypeProbleme, SeveriteIncident, StatutIncident, PieceJointeDTO } from '../../shared/models/incident.model';
import { IncidentService } from '../../shared/services/incident.service';
import { UserService } from '../../shared/services/user.service';
import { forkJoin } from 'rxjs';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-incident-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    BadgeComponent,
    AvatarTextComponent,
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
    private userService: UserService, private sanitizer: DomSanitizer
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
getSeveriteLibelle(severite: any, severiteLibelle?: string): string {
  // Si le libellé est déjà fourni et n'est pas null/undefined
  if (severiteLibelle) {
    return severiteLibelle;
  }
  
  // Si sévérité est null ou undefined
  if (severite === undefined || severite === null) {
    return 'Non définie';
  }
  
  // Si c'est une string
  if (typeof severite === 'string') {
    switch(severite) {
      case 'NonDefinie':
      case 'Non définie':
        return 'Non définie';
      case 'Faible':
        return 'Faible';
      case 'Moyenne':
        return 'Moyenne';
      case 'Forte':
        return 'Forte';
      default:
        return severite;
    }
  }
  
  // Si c'est un nombre
  if (typeof severite === 'number') {
    switch(severite) {
      case 0:
        return 'Non définie';
      case SeveriteIncident.Faible:
        return 'Faible';
      case SeveriteIncident.Moyenne:
        return 'Moyenne';
      case SeveriteIncident.Forte:
        return 'Forte';
      default:
        return 'Non définie';
    }
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

getSeveriteBadgeColor(severite: any): BadgeColor {
  // Cas 1: La sévérité est 0 ou null
  if (severite === 0 || severite === null || severite === undefined) {
    return 'light'; // Gris pour "Non définie"
  }
  
  let severiteValue: number;
  
  if (typeof severite === 'string') {
    switch(severite) {
      case 'Non définie':
        return 'light';
      case 'Faible':
        severiteValue = SeveriteIncident.Faible;
        break;
      case 'Moyenne':
        severiteValue = SeveriteIncident.Moyenne;
        break;
      case 'Forte':
        severiteValue = SeveriteIncident.Forte;
        break;
      default:
        const parsed = parseInt(severite);
        severiteValue = isNaN(parsed) ? 0 : parsed;
    }
  } else {
    severiteValue = severite;
  }
  
  switch(severiteValue) {
    case SeveriteIncident.Faible:
      return 'success'; // Vert
    case SeveriteIncident.Moyenne:
      return 'warning'; // Orange
    case SeveriteIncident.Forte:
      return 'error'; // Rouge
    default:
      return 'light'; // Gris pour "Non définie"
  }
}

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

// Badges pour sévérité
getSeveriteBadgeClasses(severite: any): string {
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
    case 1: return 'bg-[#B2B3FF] text-[#0C144E]';
    case 2: return 'bg-[#8788FF] text-white';
    case 3: return 'bg-[#D4B8FF] text-[#0C144E]';
    default: return 'bg-[#C5C6FF] text-[#0C144E]';
  }
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



// Ouvrir une image dans un modal
openImage(url: string): void {
  console.log('🖼️ openImage - URL:', url);
  console.log('🔗 Type:', typeof url);
  console.log('📏 Longueur URL:', url?.length);
  
  if (!url) {
    console.error('❌ URL de l\'image manquante');
    return;
  }
  
  this.selectedImage = url;
  this.selectedImageUrl = url;
  console.log('✅ Image ouverte avec succès');
}





   
 // Dans IncidentDetailComponent, ajoutez ces propriétés avec les autres déclarations
selectedImageUrl: string | null = null;
currentImageUrl: string = '';
currentImageName: string = '';
showImageModal: boolean = false;
pdfUrl: SafeResourceUrl | null = null;
showPdfModal: boolean = false;

// ========== GESTION DES IMAGES ==========
getImageUrl(pieceId: string): string {
  return `https://localhost:7063/api/pieces-jointes/${pieceId}`;
}

openImageModal(pieceId: string, imageName: string): void {
  console.log('🖼️ Ouverture du modal image:', pieceId, imageName);
  this.currentImageUrl = this.getImageUrl(pieceId);
  this.currentImageName = imageName;
  this.showImageModal = true;
}

closeImageModal(): void {
  console.log('❌ Fermeture du modal image');
  this.showImageModal = false;
  this.currentImageUrl = '';
  this.currentImageName = '';
}

// Vérifier si c'est une image par content-type (plus fiable que l'extension)
isImage(contentType: string | null | undefined): boolean {
  if (!contentType) {
    // Fallback: vérifier par extension si contentType est null
    return false;
  }
  const imageTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml'];
  return imageTypes.includes(contentType.toLowerCase());
}

// Vérifier si c'est une image par extension (fallback)
isImageByExtension(filename: string): boolean {
  if (!filename) return false;
  const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
  return imageExtensions.includes(ext);
}

// Vérifier si c'est un PDF
isPdf(contentType: string | null | undefined, filename: string): boolean {
  if (contentType === 'application/pdf') return true;
  // Fallback par extension
  return filename?.toLowerCase().endsWith('.pdf') || false;
}

// Ouvrir un PDF dans un modal
openPdf(url: string): void {
  console.log('📑 openPdf - URL:', url);
  if (!url) {
    console.error('❌ URL du PDF manquante');
    return;
  }
  
  try {
    this.pdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    this.showPdfModal = true;
    console.log('✅ PDF ouvert avec succès dans le modal');
  } catch (error) {
    console.error('❌ Erreur lors de l\'ouverture du PDF:', error);
  }
}

// Fermer le modal PDF
closePdfModal(): void {
  console.log('❌ Fermeture du modal PDF');
  this.showPdfModal = false;
  this.pdfUrl = null;
}

// Télécharger un fichier
downloadFile(piece: PieceJointeDTO): void {
  console.log('💾 Téléchargement:', piece.nomFichier);
  const downloadUrl = `https://localhost:7063/api/pieces-jointes/${piece.id}`;
  
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = piece.nomFichier;
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Ouvrir dans un nouvel onglet
openInNewTab(url: string): void {
  if (url) {
    window.open(url, '_blank');
  }
}

// Aperçu du fichier (image, PDF ou téléchargement)
previewFile(piece: PieceJointeDTO): void {
  if (this.isImage(piece.contentType)) {
    this.openImageModal(piece.id, piece.nomFichier);
  } else if (this.isPdf(piece.contentType, piece.nomFichier)) {
    this.openPdf(piece.url);
  } else {
    this.downloadFile(piece);
  }
}
  // ========== NAVIGATION ==========
  viewTicket(ticketId: string): void {
    this.router.navigate(['/tickets', ticketId]);
  }

  goBack(): void {
    this.router.navigate(['/incidents']);
  }


}