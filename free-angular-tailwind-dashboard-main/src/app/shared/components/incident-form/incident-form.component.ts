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
    severiteIncident: SeveriteIncident.Moyenne,
    entitesImpactees: []
  };

  // Pour la sélection d'entités existantes
  entitesExistantes: EntiteImpactee[] = [];
  selectedEntiteIds: string[] = [];
  
  // Pour la création d'une nouvelle entité
  showNewEntiteForm = false;
  newEntite: CreateEntiteImpacteeDTO = {
    typeEntiteImpactee: TypeEntiteImpactee.Application,
    nom: ''
  };

  loading = false;
  loadingEntites = true;
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
    private entiteService: EntiteImpacteeService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadEntitesExistantes();
  }

  loadEntitesExistantes(): void {
    this.loadingEntites = true;
    this.entiteService.getAll().subscribe({
      next: (entites) => {
        console.log('Entités chargées:', entites); // Debug - CORRIGÉ : déplacé dans next
        this.entitesExistantes = entites;
        this.loadingEntites = false;
      },
      error: (err) => {
        console.error('Erreur chargement entités', err);
        this.loadingEntites = false;
        // On ne bloque pas le formulaire, on continue sans les entités existantes
      }
    });
  }

  // Gestion des entités sélectionnées
  onEntiteSelectionChange(event: any, entiteId: string): void {
    if (event.target.checked) {
      this.selectedEntiteIds.push(entiteId);
    } else {
      this.selectedEntiteIds = this.selectedEntiteIds.filter(id => id !== entiteId);
    }
  }

// Gardez uniquement la version temporaire
createNewEntite(): void {
  if (!this.newEntite.nom || !this.newEntite.nom.trim()) {
    return;
  }

  // Créer une entité TEMPORAIRE (pas d'appel API)
  const tempEntite = {
    id: 'temp_' + Date.now(),
    typeEntiteImpactee: this.newEntite.typeEntiteImpactee,
    nom: this.newEntite.nom.trim()
  };

  // Ajouter à la liste locale
  this.entitesExistantes.push(tempEntite as any);
  this.selectedEntiteIds.push(tempEntite.id);

  // Réinitialiser
  this.newEntite = {
    typeEntiteImpactee: TypeEntiteImpactee.Application,
    nom: ''
  };
  this.showNewEntiteForm = false;
}

// Dans onSubmit, envoyez TOUTES les entités (existantes et temporaires)
onSubmit(): void {
  if (!this.incident.titreIncident || !this.incident.descriptionIncident) {
    this.error = 'Veuillez remplir tous les champs obligatoires';
    return;
  }

  // Récupérer TOUTES les entités sélectionnées (existantes ET temporaires)
  const entitesSelectionnees = this.entitesExistantes
    .filter(e => e.id && this.selectedEntiteIds.includes(e.id))
    .map(e => ({
      typeEntiteImpactee: e.typeEntiteImpactee,
      nom: e.nom
      // Ne pas envoyer l'ID - le backend créera de nouvelles entités
    }));

  this.incident.entitesImpactees = entitesSelectionnees;

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

  // Ajouter une entité directement dans l'incident (sans la créer en base)
  addCustomEntite(): void {
    if (this.newEntite.nom && this.newEntite.nom.trim()) {
      // On crée l'entité en base d'abord
      this.createNewEntite();
    }
  }

  cancel(): void {
    this.router.navigate(['/incidents']);
  }

  // Ajouter dans la classe IncidentFormComponent
  getEntiteNameById(id: string): string {
    const entite = this.entitesExistantes.find(e => e.id === id);
    return entite ? entite.nom : '';
  }
}