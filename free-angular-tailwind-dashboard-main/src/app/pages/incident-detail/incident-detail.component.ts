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
    switch(statut) {
      case 1: return 'info';      // Nouveau
      case 2: return 'warning';   // Assigné
      case 3: return 'warning';   // En cours
      case 4: return 'info';      // En attente
      case 5: return 'success';   // Résolu
      case 6: return 'success';   // Fermé
      default: return 'warning';
    }
  }

  getSeveriteBadgeColor(severite: number): 'success' | 'warning' | 'error' {
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

getTypeEntiteLibelle(type: string | TypeEntiteImpactee): string {
  console.log('Type reçu:', type);
  
  // Si c'est déjà une string comme "Application", "Securite", etc.
  if (typeof type === 'string') {
    // Capitaliser la première lettre si nécessaire
    const typeString = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
    
    // Remplacer les éventuelles variations
    const typeMap: { [key: string]: string } = {
      'Hardware': 'Hardware',
      'Software': 'Software',
      'Reseau': 'Réseau',
      'BaseDonnees': 'Base de données',
      'Application': 'Application',
      'Utilisateur': 'Utilisateur',
      'Securite': 'Sécurité',
      'Autre': 'Autre'
    };
    
    return typeMap[typeString] || typeString;
  }
  
  // Si c'est un nombre (ancien comportement)
  const typeMap = {
    [TypeEntiteImpactee.Hardware]: 'Hardware',
    [TypeEntiteImpactee.Software]: 'Software',
    [TypeEntiteImpactee.Reseau]: 'Réseau',
    [TypeEntiteImpactee.BaseDonnees]: 'Base de données',
    [TypeEntiteImpactee.Application]: 'Application',
    [TypeEntiteImpactee.Utilisateur]: 'Utilisateur',
    [TypeEntiteImpactee.Securite]: 'Sécurité',
    [TypeEntiteImpactee.Autre]: 'Autre'
  };
  
  return typeMap[type] || 'Inconnu';
}
}