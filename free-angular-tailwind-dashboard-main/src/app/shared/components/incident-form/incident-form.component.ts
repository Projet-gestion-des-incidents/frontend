import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { IncidentService } from '../../services/incident.service';
import { EntiteImpacteeService, CreateEntiteImpacteeDTO } from '../../services/entite-impactee.service';
import { CreateIncidentDTO, SeveriteIncident, TypeEntiteImpactee, EntiteImpactee } from '../../models/incident.model';

@Component({
  selector: 'app-incident-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './incident-form.component.html',
  styles: ``
})
export class IncidentFormComponent implements OnInit {
  incident: CreateIncidentDTO = {
    titreIncident: '',
    descriptionIncident: '',
    severiteIncident: SeveriteIncident.Faible,
    entitesImpactees: [] // Ce sera notre liste dynamique
  };

  // Pour la création d'une nouvelle entité
  showNewEntiteForm = false;
  newEntite: Partial<EntiteImpactee> = {
    typeEntiteImpactee: TypeEntiteImpactee.Hardware,
    nom: ''
  };

  loading = false;
  error: string | null = null;

  // Options pour les select
  severiteOptions = [
    { value: SeveriteIncident.Faible, label: 'Faible' },
    { value: SeveriteIncident.Moyenne, label: 'Moyenne' },
    { value: SeveriteIncident.Forte, label: 'Forte' }
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

  constructor(
    private incidentService: IncidentService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Plus besoin de charger les entités existantes
  }

  // Ajouter une nouvelle entité (comme dans IncidentEditComponent)
 

  // Supprimer une entité (comme dans IncidentEditComponent)
  supprimerEntite(index: number): void {
    this.incident.entitesImpactees.splice(index, 1);
  }

  onSubmit(): void {
    if (!this.incident.titreIncident || !this.incident.descriptionIncident) {
      this.error = 'Veuillez remplir tous les champs obligatoires';
      return;
    }

    this.loading = true;
    this.error = null;

    this.incidentService.createIncident(this.incident).subscribe({
      next: (createdIncident) => {
        this.loading = false;
        this.router.navigate(['/incidents', createdIncident.id]);
      },
      error: (err) => {
        console.error('Erreur création incident', err);
        this.error = 'Erreur lors de la création de l\'incident';
        this.loading = false;
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/incidents']);
  }

  getTypeEntiteLabel(type: TypeEntiteImpactee): string {
    const option = this.typeEntiteOptions.find(o => o.value === type);
    return option ? option.label : '';
  }

  // Dans incident-form.component.ts et incident-edit.component.ts
toggleNewEntiteForm(): void {
  if (!this.showNewEntiteForm) {
    // On ouvre le formulaire - on garde les valeurs actuelles
    this.showNewEntiteForm = true;
  } else {
    // On annule - on réinitialise complètement le formulaire
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

// Modifiez aussi ajouterEntite pour réinitialiser après ajout
ajouterEntite(): void {
  if (!this.newEntite.nom || !this.newEntite.nom.trim()) {
    return;
  }

  // Ajouter l'entité
  const entite: Partial<EntiteImpactee> = {
    typeEntiteImpactee: this.newEntite.typeEntiteImpactee,
    nom: this.newEntite.nom.trim()
  };
  
  this.incident.entitesImpactees.push(entite as EntiteImpactee);

  // Réinitialiser ET fermer le formulaire
  this.resetNewEntiteForm();
  this.showNewEntiteForm = false;
}
}