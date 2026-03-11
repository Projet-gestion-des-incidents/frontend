import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { BadgeComponent } from '../../shared/components/ui/badge/badge.component';
import { AvatarTextComponent } from '../../shared/components/ui/avatar/avatar-text.component';
import { IncidentDetail, TypeEntiteImpactee } from '../../shared/models/incident.model';
import { IncidentService } from '../../shared/services/incident.service';


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
  loading = true;
  error: string | null = null;
 typeEntiteImpacteeLabels: { [key in TypeEntiteImpactee]: string } = {
    [TypeEntiteImpactee.MachineTPE]: 'Machine TPE',
    [TypeEntiteImpactee.FluxTransactionnel]: 'Flux Transactionnel',
    [TypeEntiteImpactee.Reseau]: 'Réseau',
    [TypeEntiteImpactee.ServiceApplicatif]: 'Service Applicatif'
  };  // Mapping pour les valeurs string venant du backend
  stringToEnumMap: { [key: string]: TypeEntiteImpactee } = {
    'MachineTPE': TypeEntiteImpactee.MachineTPE,
    'FluxTransactionnel': TypeEntiteImpactee.FluxTransactionnel,
    'Reseau': TypeEntiteImpactee.Reseau,
    'ServiceApplicatif': TypeEntiteImpactee.ServiceApplicatif,
  };
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private incidentService: IncidentService
  ) {}

  ngOnInit(): void {
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
    
    this.incidentService.getIncidentDetails(id).subscribe({
      next: (data) => {
        if (data) {
          this.incident = data;
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

 getStatutBadgeColor(statut: number): 'success' | 'warning' | 'error' | 'info' {
  if (!statut || statut === 0) {
    return 'info'; // ou 'warning' selon ce qui est disponible
  }
  
  switch(statut) {
    case 1: return 'warning';   // EnCours
    case 2: return 'success';   // Ferme
    default: return 'info';
  }
}

  // Obtenir le libellé du statut
  getStatutLibelle(statut: number, statutLibelle: string): string {
    if (!statut || statut === 0) {
      return 'Non défini';
    }
    return statutLibelle || `Statut ${statut}`;
  }

  // Obtenir le libellé de la sévérité
  getSeveriteLibelle(severite: number, severiteLibelle: string): string {
    if (!severite || severite === 0) {
      return 'Non définie';
    }
    return severiteLibelle || `Sévérité ${severite}`;
  }
getSeveriteBadgeColor(severite: number): 'success' | 'warning' | 'error' {
  if (!severite || severite === 0) {
    return 'warning'; // Valeur par défaut pour 0
  }
  
  switch(severite) {
    case 1: return 'success';   // Faible
    case 2: return 'warning';   // Moyenne
    case 3: return 'error';     // Forte
    default: return 'warning';
  }
}

  goBack(): void {
    this.router.navigate(['/incidents']);
  }

 getTypeEntiteLibelle(type: any): string {
    console.log('Type reçu:', type, 'type:', typeof type);
    
    // Cas 1: C'est déjà un nombre (enum)
    if (typeof type === 'number') {
      return this.typeEntiteImpacteeLabels[type as TypeEntiteImpactee] || `Type ${type} (inconnu)`;
    }
    
    // Cas 2: C'est une string (comme "MachineTPE")
    if (typeof type === 'string') {
      // Essayer de convertir la string en enum
      const enumValue = this.stringToEnumMap[type];
      if (enumValue !== undefined) {
        return this.typeEntiteImpacteeLabels[enumValue];
      }
      
      // Si pas trouvé dans le mapping, retourner la string formatée
      return type.replace(/([A-Z])/g, ' $1').trim(); // "MachineTPE" -> "Machine TPE"
    }
    
    return 'Inconnu';
  }


}