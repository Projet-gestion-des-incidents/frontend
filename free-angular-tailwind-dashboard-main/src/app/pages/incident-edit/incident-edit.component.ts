// import { Component, OnInit } from '@angular/core';
// import { ActivatedRoute, Router, RouterModule } from '@angular/router';
// import { FormsModule } from '@angular/forms';
// import { CommonModule } from '@angular/common';
// import { forkJoin } from 'rxjs'; // 🔥 IMPORT AJOUTÉ
// import {
//   IncidentDetail,
//   SeveriteIncident,
//   StatutIncident,
//   TypeEntiteImpactee,
//   EntiteImpactee
// } from '../../shared/models/incident.model';
// import { IncidentService } from '../../shared/services/incident.service';
// import { EntiteImpacteeService } from '../../shared/services/entite-impactee.service';

// @Component({
//   selector: 'app-incident-edit',
//   standalone: true,
//   imports: [CommonModule, FormsModule, RouterModule],
//   templateUrl: './incident-edit.component.html'
// })
// export class IncidentEditComponent implements OnInit {
//   incidentId!: string;
//   incident!: IncidentDetail;

//   // Options pour les selects
//   severiteOptions = [
//     { value: SeveriteIncident.Faible, label: 'Faible' },
//     { value: SeveriteIncident.Moyenne, label: 'Moyenne' },
//     { value: SeveriteIncident.Forte, label: 'Forte' }
//   ];

//   statutOptions = [
//     { value: StatutIncident.Nouveau, label: 'Nouveau' },
//     { value: StatutIncident.Assigne, label: 'Assigné' },
//     { value: StatutIncident.EnCours, label: 'En cours' },
//     { value: StatutIncident.EnAttente, label: 'En attente' },
//     { value: StatutIncident.Resolu, label: 'Résolu' },
//     { value: StatutIncident.Ferme, label: 'Fermé' }
//   ];

//   typeEntiteOptions = [
//     { value: TypeEntiteImpactee.Hardware, label: 'Hardware' },
//     { value: TypeEntiteImpactee.Software, label: 'Software' },
//     { value: TypeEntiteImpactee.Reseau, label: 'Réseau' },
//     { value: TypeEntiteImpactee.BaseDonnees, label: 'Base de données' },
//     { value: TypeEntiteImpactee.Application, label: 'Application' },
//     { value: TypeEntiteImpactee.Utilisateur, label: 'Utilisateur' },
//     { value: TypeEntiteImpactee.Securite, label: 'Sécurité' },
//     { value: TypeEntiteImpactee.Autre, label: 'Autre' }
//   ];

//   // Pour l'ajout d'une nouvelle entité
//   showNewEntiteForm = false;
//   newEntite: Partial<EntiteImpactee> = {
//     typeEntiteImpactee: TypeEntiteImpactee.Application,
//     nom: ''
//   };

//   loading = true;
//   error: string | null = null;

//   constructor(
//     private route: ActivatedRoute,
//     private incidentService: IncidentService,
//     private router: Router,
//     private entiteService: EntiteImpacteeService,
//   ) {}

//   ngOnInit(): void {
//     this.incidentId = this.route.snapshot.paramMap.get('id')!;
//     this.loadIncident();
//   }

//   cancel() {
//     this.router.navigate(['/incidents', this.incidentId]);
//   }

//   loadIncident() {
//     this.incidentService.getIncidentDetails(this.incidentId).subscribe({
//       next: (data) => {
//         console.log('📥 Données reçues:', data);
        
//         this.incident = {
//           ...data,
//           severiteIncident: Number(data.severiteIncident),
//           statutIncident: Number(data.statutIncident),
//           entitesImpactees: data.entitesImpactees?.map(e => ({
//             id: e.id,
//             nom: e.nom,
//             typeEntiteImpactee: Number(e.typeEntiteImpactee) as TypeEntiteImpactee
//           })) || []
//         };

//         console.log('✅ Entités avec IDs conservés:', this.incident.entitesImpactees);
//         this.loading = false;
//       },
//       error: (err) => {
//         console.error('❌ Erreur chargement incident:', err);
//         this.error = 'Erreur chargement incident';
//         this.loading = false;
//       }
//     });
//   }

//   // Supprimer une entité
//   supprimerEntite(index: number) {
//     this.incident.entitesImpactees.splice(index, 1);
//   }

//   // Sauvegarder
// save() {
//   const dto = {
//     titreIncident: this.incident.titreIncident,
//     descriptionIncident: this.incident.descriptionIncident,
//     severiteIncident: Number(this.incident.severiteIncident),
//     statutIncident: Number(this.incident.statutIncident),
//     entitesImpactees: this.incident.entitesImpactees.map(e => ({
//       id: e.id ?? undefined, // important !
//       typeEntiteImpactee: e.typeEntiteImpactee,
//       nom: e.nom
//     }))
//   };

//   console.log('📦 DTO complet envoyé:', dto);

//   this.incidentService.updateIncident(this.incidentId, dto)
//     .subscribe({
//       next: () => this.router.navigate(['/incidents', this.incidentId]),
//       error: err => {
//         console.error(err);
//         this.error = 'Erreur mise à jour';
//       }
//     });
// }

//   // Méthode pour mettre à jour l'incident
//   private updateIncident(nouvellesEntites: Partial<EntiteImpactee>[]) {
//     // 🔥 Filtrer les entités pour s'assurer qu'elles ont les propriétés requises
//     const entitesValides = nouvellesEntites
//       .filter(e => e.typeEntiteImpactee !== undefined && e.nom !== undefined)
//       .map(e => ({
//         typeEntiteImpactee: e.typeEntiteImpactee as TypeEntiteImpactee,
//         nom: e.nom as string
//       }));

//     const dto = {
//       titreIncident: this.incident.titreIncident,
//       descriptionIncident: this.incident.descriptionIncident,
//       severiteIncident: Number(this.incident.severiteIncident) as SeveriteIncident,
//       statutIncident: Number(this.incident.statutIncident) as StatutIncident,
//       entitesImpactees: entitesValides
//     };

//     console.log('📦 DTO incident envoyé:', JSON.stringify(dto, null, 2));

//     this.incidentService.updateIncident(this.incidentId, dto).subscribe({
//       next: () => {
//         this.router.navigate(['/incidents', this.incidentId]);
//       },
//       error: (err: any) => {
//         console.error('❌ Erreur mise à jour incident:', err);
//         this.error = 'Erreur lors de la mise à jour';
//         this.loading = false;
//       }
//     });
//   }

//   getTypeEntiteLabel(type: TypeEntiteImpactee): string {
//     const option = this.typeEntiteOptions.find(o => o.value === type);
//     return option ? option.label : '';
//   }

//   toggleNewEntiteForm(): void {
//     if (!this.showNewEntiteForm) {
//       this.showNewEntiteForm = true;
//     } else {
//       this.resetNewEntiteForm();
//       this.showNewEntiteForm = false;
//     }
//   }

//   resetNewEntiteForm(): void {
//     this.newEntite = {
//       typeEntiteImpactee: TypeEntiteImpactee.Application,
//       nom: ''
//     };
//   }

//   ajouterEntite(): void {
//     if (!this.newEntite.nom || !this.newEntite.nom.trim()) {
//       return;
//     }

//     const entite: EntiteImpactee = {
//       typeEntiteImpactee: this.newEntite.typeEntiteImpactee as TypeEntiteImpactee,
//       nom: this.newEntite.nom.trim()
//     };
    
//     this.incident.entitesImpactees.push(entite);
//     this.resetNewEntiteForm();
//     this.showNewEntiteForm = false;
//   }
// }
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CreateIncidentDTO, EntiteImpactee, Incident, IncidentDetail, SeveriteIncident, StatutIncident, TypeEntiteImpactee } from '../../shared/models/incident.model';
import { IncidentService } from '../../shared/services/incident.service';
import { EntiteImpacteeService } from '../../shared/services/entite-impactee.service';
import { CommonModule } from '@angular/common';
import { SelectComponent } from '../../shared/components/form/select/select.component';




@Component({
  selector: 'app-incident-edit',
  templateUrl: './incident-edit.component.html',
   imports: [CommonModule,SelectComponent, FormsModule, RouterModule],

  styleUrls: ['./incident-edit.component.css']
})
export class IncidentEditComponent implements OnInit {

  incident!: IncidentDetail;
  loading = false;
  error: string | null = null;


  // Options pour les select
//  severiteOptions = [
//   { value: 'Faible', label: 'Faible' },
//   { value: 'Moyenne', label: 'Moyenne' },
//   { value: 'Forte', label: 'Forte' }
// ];
severiteOptions = [
  { value: '1', label: 'Faible' },
  { value: '2', label: 'Moyenne' },
  { value: '3', label: 'Forte' }
];


statutOptions = [
  { value: 'Nouveau', label: 'Nouveau' },
  { value: 'Assigné', label: 'Assigné' },
  { value: 'En cours', label: 'En cours' },
  { value: 'En attente', label: 'En attente' },
  { value: 'Résolu', label: 'Résolu' },
  { value: 'Fermé', label: 'Fermé' },
];


// Convertir enum en string pour le composant select
typeEntiteOptions = [
  { value: 'Hardware', label: 'Hardware' },
  { value: 'Software', label: 'Software' },
  { value: 'Reseau', label: 'Réseau' },
  { value: 'BaseDonnees', label: 'Base de données' },
  { value: 'Application', label: 'Application' },
  { value: 'Utilisateur', label: 'Utilisateur' },
  { value: 'Securite', label: 'Sécurité' },
  { value: 'Autre', label: 'Autre' },
];


  // Formulaire ajout entité
  showNewEntiteForm = false;
  newEntite: EntiteImpactee = {
    typeEntiteImpactee: TypeEntiteImpactee.Autre,
    nom: ''
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private incidentService: IncidentService,
    private entiteService: EntiteImpacteeService
  ) { }

  ngOnInit(): void {
    const incidentId = this.route.snapshot.paramMap.get('id');
    if (incidentId) {
      this.loadIncident(incidentId);
    }
  }
  
// Méthode pour convertir la valeur string du select en enum
setTypeEntite(entite: EntiteImpactee, value: any) {
  const val = typeof value === 'string' ? value : (value.target?.value ?? 'Autre');

  switch(val) {
    case 'Hardware': entite.typeEntiteImpactee = TypeEntiteImpactee.Hardware; break;
    case 'Software': entite.typeEntiteImpactee = TypeEntiteImpactee.Software; break;
    case 'Reseau': entite.typeEntiteImpactee = TypeEntiteImpactee.Reseau; break;
    case 'BaseDonnees': entite.typeEntiteImpactee = TypeEntiteImpactee.BaseDonnees; break;
    case 'Application': entite.typeEntiteImpactee = TypeEntiteImpactee.Application; break;
    case 'Utilisateur': entite.typeEntiteImpactee = TypeEntiteImpactee.Utilisateur; break;
    case 'Securite': entite.typeEntiteImpactee = TypeEntiteImpactee.Securite; break;
    case 'Autre': entite.typeEntiteImpactee = TypeEntiteImpactee.Autre; break;
    default: entite.typeEntiteImpactee = TypeEntiteImpactee.Autre;
  }
}

// setTypeSeverite(incident: IncidentDetail, value: string) {

//   switch (value) {
//     case 'Faible': incident.severiteIncident = SeveriteIncident.Faible; break;
//     case 'Moyenne': incident.severiteIncident = SeveriteIncident.Moyenne; break;
//     case 'Forte': incident.severiteIncident = SeveriteIncident.Forte; break;
//     default: incident.severiteIncident = SeveriteIncident.Faible;
//   }
// }
setTypeSeverite(incident: IncidentDetail, value: string) {
  switch(value) {
    case '1': incident.severiteIncident = SeveriteIncident.Faible; break;
    case '2': incident.severiteIncident = SeveriteIncident.Moyenne; break;
    case '3': incident.severiteIncident = SeveriteIncident.Forte; break;
    default: incident.severiteIncident = SeveriteIncident.Faible;
  }
}

setStatut(incident: IncidentDetail, value: string) {
  switch (value) {
    case 'Nouveau': incident.statutIncident = StatutIncident.Nouveau; break;
    case 'Assigné': incident.statutIncident = StatutIncident.Assigne; break;
    case 'En cours': incident.statutIncident = StatutIncident.EnCours; break;
    case 'En attente': incident.statutIncident = StatutIncident.EnAttente; break;
    case 'Résolu': incident.statutIncident = StatutIncident.Resolu; break;
    case 'Fermé': incident.statutIncident = StatutIncident.Ferme; break;
    default: incident.statutIncident = StatutIncident.Nouveau;
  }
}

  loadIncident(id: string) {
    this.loading = true;
    this.incidentService.getIncidentDetails(id).subscribe({
      next: (data: IncidentDetail) => {
        this.incident = data;
        this.loading = false;
      },
      error: (err: any) => {
        this.error = 'Erreur lors du chargement de l\'incident.';
        console.error(err);
        this.loading = false;
      }
    });
  }

  toggleNewEntiteForm() {
    this.showNewEntiteForm = !this.showNewEntiteForm;
    if (!this.showNewEntiteForm) {
      this.newEntite = { typeEntiteImpactee: TypeEntiteImpactee.Autre, nom: '' };
    }
  }



  ajouterEntite() {
    if (!this.newEntite.nom) return;
    this.incident.entitesImpactees.push({ ...this.newEntite });
    this.toggleNewEntiteForm();
  }

  supprimerEntite(index: number) {
    const entite = this.incident.entitesImpactees[index];
    if (entite.id) {
      this.entiteService.delete(entite.id).subscribe({
        next: (success: boolean) => {
          if (success) this.incident.entitesImpactees.splice(index, 1);
        },
        error: (err: any) => console.error(err)
      });
    } else {
      this.incident.entitesImpactees.splice(index, 1);
    }
  }

  cancel() {
    this.router.navigate(['/incidents']);
  }
getStatutValue(statut: StatutIncident): string {
  switch (statut) {
    case StatutIncident.Nouveau: return 'Nouveau';
    case StatutIncident.Assigne: return 'Assigné';
    case StatutIncident.EnCours: return 'En cours';
    case StatutIncident.EnAttente: return 'En attente';
    case StatutIncident.Resolu: return 'Résolu';
    case StatutIncident.Ferme: return 'Fermé';
    default: return 'Nouveau';
  }
}


// Convertir enum SeveriteIncident en string compatible avec select
// getSeveriteValue(severite: SeveriteIncident): string {
//   switch (severite) {
//     case SeveriteIncident.Faible: return 'Faible';
//     case SeveriteIncident.Moyenne: return 'Moyenne';
//     case SeveriteIncident.Forte: return 'Forte';
//     default: return 'Faible';
//   }
// }

getSeveriteValue(severite: SeveriteIncident): string {
  return severite.toString(); // Faible=1 => "1", Moyenne=2 => "2", Forte=3 => "3"
}

  save() {
    if (!this.incident) return;
    this.loading = true;

    const dto: CreateIncidentDTO = {
      titreIncident: this.incident.titreIncident,
      descriptionIncident: this.incident.descriptionIncident,
      severiteIncident: this.incident.severiteIncident,
      entitesImpactees: this.incident.entitesImpactees.map((e: EntiteImpactee) => ({
        id: e.id,
        typeEntiteImpactee: e.typeEntiteImpactee,
        nom: e.nom
      }))
    };

    this.incidentService.updateIncident(this.incident.id, {
      ...dto,
      statutIncident: this.incident.statutIncident
    }).subscribe({
      next: (updated: Incident) => {
        console.log('Incident mis à jour:', updated);
        this.loading = false;
this.router.navigate(['/incidents', this.incident.id]);
      },
      error: (err: any) => {
        console.error(err);
        this.error = 'Erreur lors de la mise à jour.';
        this.loading = false;
      }
    });
  }
}
