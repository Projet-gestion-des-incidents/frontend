import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs'; // 🔥 IMPORT AJOUTÉ
import {
  IncidentDetail,
  SeveriteIncident,
  StatutIncident,
  TypeEntiteImpactee,
  EntiteImpactee
} from '../../shared/models/incident.model';
import { IncidentService } from '../../shared/services/incident.service';
import { EntiteImpacteeService } from '../../shared/services/entite-impactee.service';

@Component({
  selector: 'app-incident-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './incident-edit.component.html'
})
export class IncidentEditComponent implements OnInit {
  incidentId!: string;
  incident!: IncidentDetail;

  // Options pour les selects
  severiteOptions = [
    { value: SeveriteIncident.Faible, label: 'Faible' },
    { value: SeveriteIncident.Moyenne, label: 'Moyenne' },
    { value: SeveriteIncident.Forte, label: 'Forte' }
  ];

  statutOptions = [
    { value: StatutIncident.Nouveau, label: 'Nouveau' },
    { value: StatutIncident.Assigne, label: 'Assigné' },
    { value: StatutIncident.EnCours, label: 'En cours' },
    { value: StatutIncident.EnAttente, label: 'En attente' },
    { value: StatutIncident.Resolu, label: 'Résolu' },
    { value: StatutIncident.Ferme, label: 'Fermé' }
  ];

  typeEntiteOptions = [
    { value: TypeEntiteImpactee.Hardware, label: 'Hardware' },
    { value: TypeEntiteImpactee.Software, label: 'Software' },
    { value: TypeEntiteImpactee.Reseau, label: 'Réseau' },
    { value: TypeEntiteImpactee.BaseDonnees, label: 'Base de données' },
    { value: TypeEntiteImpactee.Application, label: 'Application' },
    { value: TypeEntiteImpactee.Utilisateur, label: 'Utilisateur' },
    { value: TypeEntiteImpactee.Securite, label: 'Sécurité' },
    { value: TypeEntiteImpactee.Autre, label: 'Autre' }
  ];

  // Pour l'ajout d'une nouvelle entité
  showNewEntiteForm = false;
  newEntite: Partial<EntiteImpactee> = {
    typeEntiteImpactee: TypeEntiteImpactee.Application,
    nom: ''
  };

  loading = true;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private incidentService: IncidentService,
    private router: Router,
    private entiteService: EntiteImpacteeService,
  ) {}

  ngOnInit(): void {
    this.incidentId = this.route.snapshot.paramMap.get('id')!;
    this.loadIncident();
  }

  cancel() {
    this.router.navigate(['/incidents', this.incidentId]);
  }

  loadIncident() {
    this.incidentService.getIncidentDetails(this.incidentId).subscribe({
      next: (data) => {
        console.log('📥 Données reçues:', data);
        
        this.incident = {
          ...data,
          severiteIncident: Number(data.severiteIncident),
          statutIncident: Number(data.statutIncident),
          entitesImpactees: data.entitesImpactees?.map(e => ({
            id: e.id,
            nom: e.nom,
            typeEntiteImpactee: Number(e.typeEntiteImpactee) as TypeEntiteImpactee
          })) || []
        };

        console.log('✅ Entités avec IDs conservés:', this.incident.entitesImpactees);
        this.loading = false;
      },
      error: (err) => {
        console.error('❌ Erreur chargement incident:', err);
        this.error = 'Erreur chargement incident';
        this.loading = false;
      }
    });
  }

  // Supprimer une entité
  supprimerEntite(index: number) {
    this.incident.entitesImpactees.splice(index, 1);
  }

  // Sauvegarder
save() {
  const dto = {
    titreIncident: this.incident.titreIncident,
    descriptionIncident: this.incident.descriptionIncident,
    severiteIncident: Number(this.incident.severiteIncident),
    statutIncident: Number(this.incident.statutIncident),
    entitesImpactees: this.incident.entitesImpactees.map(e => ({
      id: e.id ?? undefined, // important !
      typeEntiteImpactee: e.typeEntiteImpactee,
      nom: e.nom
    }))
  };

  console.log('📦 DTO complet envoyé:', dto);

  this.incidentService.updateIncident(this.incidentId, dto)
    .subscribe({
      next: () => this.router.navigate(['/incidents', this.incidentId]),
      error: err => {
        console.error(err);
        this.error = 'Erreur mise à jour';
      }
    });
}

  // Méthode pour mettre à jour l'incident
  private updateIncident(nouvellesEntites: Partial<EntiteImpactee>[]) {
    // 🔥 Filtrer les entités pour s'assurer qu'elles ont les propriétés requises
    const entitesValides = nouvellesEntites
      .filter(e => e.typeEntiteImpactee !== undefined && e.nom !== undefined)
      .map(e => ({
        typeEntiteImpactee: e.typeEntiteImpactee as TypeEntiteImpactee,
        nom: e.nom as string
      }));

    const dto = {
      titreIncident: this.incident.titreIncident,
      descriptionIncident: this.incident.descriptionIncident,
      severiteIncident: Number(this.incident.severiteIncident) as SeveriteIncident,
      statutIncident: Number(this.incident.statutIncident) as StatutIncident,
      entitesImpactees: entitesValides
    };

    console.log('📦 DTO incident envoyé:', JSON.stringify(dto, null, 2));

    this.incidentService.updateIncident(this.incidentId, dto).subscribe({
      next: () => {
        this.router.navigate(['/incidents', this.incidentId]);
      },
      error: (err: any) => {
        console.error('❌ Erreur mise à jour incident:', err);
        this.error = 'Erreur lors de la mise à jour';
        this.loading = false;
      }
    });
  }

  getTypeEntiteLabel(type: TypeEntiteImpactee): string {
    const option = this.typeEntiteOptions.find(o => o.value === type);
    return option ? option.label : '';
  }

  toggleNewEntiteForm(): void {
    if (!this.showNewEntiteForm) {
      this.showNewEntiteForm = true;
    } else {
      this.resetNewEntiteForm();
      this.showNewEntiteForm = false;
    }
  }

  resetNewEntiteForm(): void {
    this.newEntite = {
      typeEntiteImpactee: TypeEntiteImpactee.Application,
      nom: ''
    };
  }

  ajouterEntite(): void {
    if (!this.newEntite.nom || !this.newEntite.nom.trim()) {
      return;
    }

    const entite: EntiteImpactee = {
      typeEntiteImpactee: this.newEntite.typeEntiteImpactee as TypeEntiteImpactee,
      nom: this.newEntite.nom.trim()
    };
    
    this.incident.entitesImpactees.push(entite);
    this.resetNewEntiteForm();
    this.showNewEntiteForm = false;
  }
}