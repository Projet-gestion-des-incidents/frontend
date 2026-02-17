import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import {
  IncidentDetail,
  SeveriteIncident,
  StatutIncident,
  TypeEntiteImpactee,
  EntiteImpactee
} from '../../shared/models/incident.model';
import { IncidentService } from '../../shared/services/incident.service';

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
    private router: Router
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
      console.log('Données reçues:', data);
      console.log('Sévérité reçue:', data.severiteIncident, 'type:', typeof data.severiteIncident);
      console.log('Statut reçu:', data.statutIncident, 'type:', typeof data.statutIncident);

      this.incident = {
        ...data,
        severiteIncident: Number(data.severiteIncident),
        statutIncident: Number(data.statutIncident),
        entitesImpactees: data.entitesImpactees?.map(e => ({
          id: e.id,
          nom: e.nom,
          typeEntiteImpactee: Number(e.typeEntiteImpactee)
        })) || []
      };

      console.log('Incident après conversion:', this.incident);
      console.log('Sévérité après conversion:', this.incident.severiteIncident, 'type:', typeof this.incident.severiteIncident);
      console.log('Statut après conversion:', this.incident.statutIncident, 'type:', typeof this.incident.statutIncident);

      this.loading = false;
    },
    error: (err) => {
      console.error('Erreur chargement incident:', err);
      this.error = 'Erreur chargement incident';
      this.loading = false;
    }
  });
}

  // Ajouter une nouvelle entité
  ajouterEntite() {
    if (!this.newEntite.nom || !this.newEntite.nom.trim()) {
      return;
    }

    // Créer une nouvelle entité (sans ID pour le moment)
    const entite: Partial<EntiteImpactee> = {
      typeEntiteImpactee: this.newEntite.typeEntiteImpactee,
      nom: this.newEntite.nom.trim()
    };

    // Ajouter à la liste des entités de l'incident
    this.incident.entitesImpactees.push(entite as EntiteImpactee);

    // Réinitialiser le formulaire
    this.newEntite = {
      typeEntiteImpactee: TypeEntiteImpactee.Application,
      nom: ''
    };
    this.showNewEntiteForm = false;
  }

  // Supprimer une entité
  supprimerEntite(index: number) {
    this.incident.entitesImpactees.splice(index, 1);
  }

  // Sauvegarder
save() {
  // 1️⃣ AVANT D'ENVOYER, s'assurer que TOUTES les entités avec ID sont dans la collection
const entitesAEnvoyer = this.incident.entitesImpactees.map(entite => {
  const base = {
    typeEntiteImpactee: entite.typeEntiteImpactee,
    nom: entite.nom
  };

  // 🔥 ajouter id seulement si existe
  return entite.id
    ? { ...base, id: entite.id }
    : base;
});


  const dto = {
    titreIncident: this.incident.titreIncident,
    descriptionIncident: this.incident.descriptionIncident,
    severiteIncident: Number(this.incident.severiteIncident),
    statutIncident: Number(this.incident.statutIncident),
    entitesImpactees: entitesAEnvoyer
  };

  console.log('DTO envoyé:', JSON.stringify(dto, null, 2));

  this.loading = true;
  this.incidentService.updateIncident(this.incidentId, dto).subscribe({
    next: () => {
      this.router.navigate(['/incidents', this.incidentId]);
    },
    error: (err) => {
      console.error('Erreur mise à jour', err);
      this.error = 'Erreur lors de la mise à jour';
      this.loading = false;
    }
  });
}

  getTypeEntiteLabel(type: TypeEntiteImpactee): string {
    const option = this.typeEntiteOptions.find(o => o.value === type);
    return option ? option.label : '';
  }

  
}