import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { TicketService } from '../../services/ticket.service';
import { IncidentService } from '../../services/incident.service';
import { CommonModule } from '@angular/common';
import { CreateTicketDTO } from '../../models/Ticket.models';
import { FileInputExampleComponent } from '../form/form-elements/file-input-example/file-input-example.component';
import { CheckboxComponent } from '../form/input/checkbox.component';
import { UserService } from '../../services/user.service';
import { MultiSelectComponent } from '../form/multi-select/multi-select.component';
import { forkJoin, Observable, of, throwError, timer } from 'rxjs';
import { catchError, finalize, map, switchMap, delay, tap } from 'rxjs/operators';
import { AvatarTextComponent } from '../ui/avatar/avatar-text.component';

interface MultiOption {
  value: string;
  text: string;
  selected: boolean;
}

@Component({
  selector: 'app-ticket-form',
  imports: [
    CommonModule,
    CheckboxComponent,
    FileInputExampleComponent,
    FormsModule,
    RouterModule,AvatarTextComponent  ,
    ReactiveFormsModule,
    MultiSelectComponent
  ],
  templateUrl: './ticket-form.component.html',
  standalone: true
})
export class TicketFormComponent implements OnInit {

  ticketForm!: FormGroup;
  loading = false;
successMessage: string = '';
  // Pour les techniciens
  techniciens: { id: string; nom: string; prenom: string }[] = [];
  technicienOptions: { value: string; label: string }[] = [];

  showCommercantError = false;
  // Pour les incidents
  incidents: any[] = [];
  filteredIncidents: any[] = [];  //  Incidents filtrés par commerçant
  groupedIncidents: any[] = [];    //  Incidents groupés par commerçant
  selectedIncidentIds: string[] = [];
  showIncidentError = false;
  
  //  Pour le filtre par commerçant
  commercants: any[] = [];
  selectedCommercantId: string | null = null;
  commercantsAvecIncidents: any[] = [];

  today: string = this.getTodayString();

  constructor(
    private fb: FormBuilder,
    private ticketService: TicketService,
    private incidentService: IncidentService,
    private router: Router,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadTechniciens();
    this.loadCommercants();  //  Charger les commerçants
    this.loadIncidents();
  }

initForm(): void {
  this.ticketForm = this.fb.group({
    titreTicket: ['', [Validators.required, Validators.minLength(3)]],
    descriptionTicket: ['', [Validators.required, Validators.minLength(10)]], 
    assigneeId: [null, Validators.required],
    dateLimite: [null, [Validators.required, this.futureDateValidator]],
    commentaireInitial: [''],
    commentaireInterne: [false]
  });
}
/** Filtre les commerçants pour ne garder que ceux qui ont des incidents disponibles*/
filtrerCommercantsAvecIncidents(): void {
  if (!this.incidents || this.incidents.length === 0) {
    this.commercantsAvecIncidents = [];
    return;
  }
    this.commercants.forEach(commercant => {
    console.log(`  - Commerçant: ${commercant.nomMagasin || commercant.userName || commercant.nom} -> id: ${commercant.id}`);
  });
  
  // Récupérer les IDs des commerçants (en string)
  const commercantsIds = new Set(
    this.commercants.map(c => c.id?.toString())
  );
  
  // Filtrer les incidents dont le createdById correspond à un commerçant
  const incidentsAvecCommercant = this.incidents.filter(incident => {
    const incidentCreatorId = incident.createdById?.toString();
    return commercantsIds.has(incidentCreatorId);
  });
  
  console.log(` Incidents avec commerçant correspondant: ${incidentsAvecCommercant.length}`);
  
  // Récupérer les IDs des commerçants qui ont des incidents
  const commercantsIdsAvecIncidents = new Set(
    incidentsAvecCommercant.map(incident => incident.createdById?.toString())
  );
  
  // Filtrer la liste complète des commerçants
  this.commercantsAvecIncidents = this.commercants.filter(commercant => 
    commercantsIdsAvecIncidents.has(commercant.id?.toString())
  );
  
  console.log(` Commerçants avec incidents disponibles: ${this.commercantsAvecIncidents.length}`);
  console.log('Commerçants filtrés:', this.commercantsAvecIncidents.map(c => ({
    id: c.id,
    nom: c.nomMagasin || c.userName,
    incidentCount: incidentsAvecCommercant.filter(i => i.createdById?.toString() === c.id?.toString()).length
  })));
}
// Validateur personnalisé pour vérifier que la date est dans le futur
futureDateValidator(control: AbstractControl): ValidationErrors | null {
  if (!control.value) {
    return null; 
  }
  
  const selectedDate = new Date(control.value);
  const now = new Date();
  
  // Comparer les dates sans les millisecondes
  selectedDate.setSeconds(0, 0);
  now.setSeconds(0, 0);
  
  if (selectedDate <= now) {
    return { pastDate: true };
  }
  return null;
}
// Vérifier si le formulaire est valide pour activer le bouton
isFormValid(): boolean {
  return this.ticketForm.valid && this.selectedIncidentIds.length > 0;
}
  getTodayString(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    const hours = today.getHours().toString().padStart(2, '0');
    const minutes = today.getMinutes().toString().padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

loadTechniciens(): void {
  console.log(' Récupération des techniciens...');
  
  //  Passer des paramètres pour récupérer TOUS les techniciens
  const request = {
    page: 1,
    pageSize: 100,  
    sortBy: 'Nom',
    sortDescending: false
  };
  
  this.userService.getTechniciens(request).subscribe({
    next: (response) => {
      console.log(' Réponse API techniciens:', response);
      
      let techniciensData = [];
      
      if (response?.data && Array.isArray(response.data)) {
        techniciensData = response.data;
      }
      
      console.log(` Nombre total de techniciens dans la réponse: ${techniciensData.length}`);
      
      //  Filtrer par statut "Actif" et email confirmé
      const techniciensFiltres = techniciensData.filter((u: any) => {
        const isActif = u.statut === 'Actif' || u.statut === 0;
        const isEmailConfirmed = u.emailConfirmed === true || u.emailConfirmed === 1;
        return isActif && isEmailConfirmed;
      });
      
      console.log(` Techniciens après filtrage (Actif + email confirmé): ${techniciensFiltres.length}`);
      
      techniciensFiltres.forEach((t: any, index: number) => {
        console.log(` Technicien ${index + 1}: ${t.prenom} ${t.nom}`);
      });
      
      this.techniciens = techniciensFiltres.map((u: any) => ({
        id: u.id,
        nom: u.nom || '',
        prenom: u.prenom || '',
        email: u.email || '',
        userName: u.userName || '',
        phoneNumber: u.phoneNumber || '',
        statut: u.statut,
        emailConfirmed: u.emailConfirmed,
        birthDate: u.birthDate,
        image: u.image
      }));
      
      this.technicienOptions = this.techniciens.map(t => ({
        value: t.id,
        label: `${t.prenom} ${t.nom}`.trim()
      }));
      
      console.log(' Techniciens chargés:', this.techniciens.length);
    },
    error: (err) => {
      console.error(' Erreur:', err);
    }
  });
}

  //  Charger la liste des commerçants
  loadCommercants(): void {
    this.userService.getCommercants().subscribe({
      next: (commercants) => {
        this.commercants = commercants;
        console.log('Commerçants chargés:', this.commercants);
      },
      error: (err) => {
        console.error('Erreur chargement commerçants:', err);
      }
    });
  }

  getIncidentCode(incidentId: string): string {
    const incident = this.incidents.find(i => i.id === incidentId);
    return incident ? incident.codeIncident : 'Incident';
  }
    showIncidentsList: boolean = false;


onCommercantChange(): void {
  // Ne rien faire si aucun commerçant n'est sélectionné
  if (!this.selectedCommercantId) {
    this.showIncidentsList = false;
    this.filteredIncidents = [];
    this.groupedIncidents = [];
    return;
  }
  
  // Trouver le commerçant sélectionné dans commercantsAvecIncidents
  const selectedCommercant = this.commercantsAvecIncidents.find(
    c => c.id === this.selectedCommercantId
  );
  
  if (selectedCommercant && selectedCommercant.incidents) {
    this.filteredIncidents = selectedCommercant.incidents;
    this.groupIncidentsByCommercant();
    this.showIncidentsList = true;
    this.showIncidentError = false;
  } else {
    this.filteredIncidents = [];
    this.groupedIncidents = [];
    this.showIncidentsList = true;
  }
  
  console.log(` ${this.filteredIncidents.length} incidents pour le commerçant sélectionné`);
  console.log('IDs actuellement sélectionnés:', this.selectedIncidentIds);
}

// vider  la sélection
clearAllSelections(): void {
  this.selectedIncidentIds = [];
  this.showIncidentError = false;
  console.log(' Sélection complètement vidée');
}
loadIncidents(): void {
  this.incidentService.getIncidentsSansTicket().subscribe({
    next: (incidents) => {
      this.incidents = incidents;
      console.log('Incidents disponibles:', this.incidents.length);
      
      //  CRÉER LA LISTE DES COMMERÇANTS À PARTIR DES INCIDENTS
      const commercantsMap = new Map();
      
      this.incidents.forEach(incident => {
        if (incident.createdById && !commercantsMap.has(incident.createdById)) {
          commercantsMap.set(incident.createdById, {
            id: incident.createdById,
            nomMagasin: incident.createdByName || 'Commerçant',
            nom: incident.createdByName,
            incidents: []
          });
        }
        
        if (incident.createdById) {
          const commercant = commercantsMap.get(incident.createdById);
          if (commercant) {
            commercant.incidents = commercant.incidents || [];
            commercant.incidents.push(incident);
          }
        }
      });
      
      // Convertir la Map en tableau
      this.commercantsAvecIncidents = Array.from(commercantsMap.values());
      
      console.log(' Commerçants extraits des incidents:', this.commercantsAvecIncidents);
      
      // Trier les incidents
      this.incidents.sort((a, b) => {
        return new Date(b.dateDetection).getTime() - new Date(a.dateDetection).getTime();
      });
      
      // Initialiser les listes vides
      this.filteredIncidents = [];
      this.groupedIncidents = [];
      this.selectedIncidentIds = [];
    },
    error: (err) => {
      console.error('Erreur chargement incidents:', err);
      this.showError('Impossible de charger les incidents');
    }
  });
}


 groupIncidentsByCommercant(): void {
  const groups = new Map();
  
  // Utiliser filteredIncidents
  this.filteredIncidents.forEach(incident => {
    const commercantId = incident.createdById;
    const commercantName = incident.createdByName || 'Commerçant inconnu';
    const key = `${commercantId}-${commercantName}`;
    
    if (!groups.has(key)) {
      groups.set(key, {
        commercantId: commercantId,
        commercantName: commercantName,
        incidents: []
      });
    }
    
    groups.get(key).incidents.push(incident);
  });
  
  // Convertir la Map en tableau et trier par nom de commerçant
  this.groupedIncidents = Array.from(groups.values()).sort((a, b) => 
    a.commercantName.localeCompare(b.commercantName)
  );
  
  console.log('Incidents groupés par commerçant:', this.groupedIncidents);
}

  //  obtenir le libellé du statut
  getStatutLibelle(statut: string): string {
    const statuts: { [key: string]: string } = {
      'NonTraite': 'Non traité',
      'EnCours': 'En cours',
      'Ferme': 'Fermé'
    };
    return statuts[statut] || statut;
  }

selectAllIncidents(): void {
  // Calculer combien d'incidents on peut encore ajouter
  const remainingSlots = this.maxIncidents - this.selectedIncidentIds.length;
  
  if (remainingSlots <= 0) {
    this.showMaxIncidentError = true;
    return;
  }
  
  // Ne prendre que le nombre d'incidents permis
  const newIds = this.filteredIncidents
    .map(i => i.id)
    .filter(id => !this.selectedIncidentIds.includes(id))
    .slice(0, remainingSlots);
  
  const combinedIds = [...this.selectedIncidentIds, ...newIds];
  this.selectedIncidentIds = combinedIds;
  this.showIncidentError = false;
  
  // Afficher un avertissement si tous n'ont pas pu être sélectionnés
  if (newIds.length < this.filteredIncidents.length) {
    this.showMaxIncidentError = true;
    setTimeout(() => {
      this.showMaxIncidentError = false;
    }, 10000);
  }
  
  console.log(' Après "Tout sélectionner":', this.selectedIncidentIds.length, '/', this.maxIncidents);
}


  deselectAllIncidents(): void {
    this.selectedIncidentIds = [];
    this.showIncidentError = false;
  }

  // Vérifie si un incident est sélectionné
  isIncidentSelected(incidentId: string): boolean {
    return this.selectedIncidentIds.includes(incidentId);
  }
  maxIncidents: number = 5;
  showMaxIncidentError: boolean = false;
  // Ajoute ou retire un incident de la sélection
 toggleIncidentSelection(incidentId: string): void {
  if (this.isIncidentSelected(incidentId)) {
    // Désélectionner l'incident 
    this.selectedIncidentIds = this.selectedIncidentIds.filter(id => id !== incidentId);
    this.showIncidentError = false;
    this.showMaxIncidentError = false; 
    // Vérifier la limite avant d'ajouter
    if (this.selectedIncidentIds.length >= this.maxIncidents) {
      this.showMaxIncidentError = true;
      this.showIncidentError = false;
      
      // faire disparaître l'erreur après 3 secondes
      setTimeout(() => {
        this.showMaxIncidentError = false;
      }, 10000);
      
      return;
    }
    
    this.selectedIncidentIds = [...this.selectedIncidentIds, incidentId];
    this.showIncidentError = false;
    this.showMaxIncidentError = false;
  }
  console.log('Incidents sélectionnés:', this.selectedIncidentIds.length, '/', this.maxIncidents);
}

  // Récupère les détails d'un incident par son ID
  getIncidentDetails(incidentId: string): any {
    return this.incidents.find(i => i.id === incidentId);
  }

  private showError(message: string): void {
    alert(message);
  }

  private showWarning(message: string): void {
    console.warn(message);
  }
// ========== SOUMISSION ==========
submit() {
  this.showIncidentError = false;
  this.showCommercantError = false;

  if (this.ticketForm.invalid) {
    this.ticketForm.markAllAsTouched();
    const firstInvalid = document.querySelector('.ng-invalid.ng-touched, .ng-invalid.ng-dirty');
    if (firstInvalid) {
      firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return;
  }
  
  //  Vérifier qu'un commerçant est sélectionné
  if (!this.selectedCommercantId) {
    this.showCommercantError = true;
    setTimeout(() => {
      document.querySelector('.rounded-2xl')?.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }, 100);
    return;
  }
  
  //  Vérifier qu'au moins un incident est sélectionné
  if (!this.selectedIncidentIds || this.selectedIncidentIds.length === 0) {
    this.showIncidentError = true;
    
    setTimeout(() => {
      document.querySelector('.incidents-section')?.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }, 100);
    
    return;
  }

  this.loading = true;
  console.log(' Création du ticket...');

  const ticketFormData = new FormData();
  ticketFormData.append('TitreTicket', this.ticketForm.value.titreTicket);
  ticketFormData.append('DescriptionTicket', this.ticketForm.value.descriptionTicket);
  
  if (this.ticketForm.value.assigneeId) {
    ticketFormData.append('AssigneeId', this.ticketForm.value.assigneeId);
  }
  
  if (this.ticketForm.value.dateLimite) {
    const dateValue = new Date(this.ticketForm.value.dateLimite);
    ticketFormData.append('DateLimite', dateValue.toISOString());
  }

  this.ticketService.createTicket(ticketFormData).pipe(
    switchMap(ticketResponse => {
      const ticketId = ticketResponse.data.id;
      console.log(' Ticket créé avec ID:', ticketId);
      
      if (this.selectedIncidentIds && this.selectedIncidentIds.length > 0) {
        console.log(' Liaison de', this.selectedIncidentIds.length, 'incident(s)...');
        return this.ticketService.lierIncidents(ticketId, this.selectedIncidentIds).pipe(
          map(incidentResult => ({ ticketId, incidentResult }))
        );
      }
      return of({ ticketId });
    }),
    catchError(error => {
      console.error(' Erreur détaillée:', error);
      
      if (error.error?.message) {
        this.error = error.error.message;
      } else if (error.error?.errors) {
        const messages = Object.values(error.error.errors).flat();
        this.error = messages.join(', ');
      } else if (typeof error.error === 'string') {
        this.error = error.error;
      } else {
        this.error = 'Erreur lors de la création du ticket';
      }
      
      return throwError(() => error);
    }),
    finalize(() => {
      this.loading = false;
    })
  ).subscribe({
    next: (result) => {
      console.log(' Ticket créé avec succès:', result);
      
      //  Afficher le message de succès
      this.successMessage = `Ticket créé avec succès !`;
      
      //  SCROLL AUTOMATIQUE VERS LE HAUT
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
      
      //  Rediriger vers la liste des tickets après 5 secondes
      setTimeout(() => {
        this.router.navigate(['/tickets']);
      }, 5000);
    },
    error: (error) => {
      console.error(' Erreur fatale:', error);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      this.loading = false;
    }
  });
}
  error: string | null = null;  

  cancel(): void {
    this.router.navigate(['/tickets']);
  }
}