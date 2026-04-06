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
    RouterModule,
    ReactiveFormsModule,
    MultiSelectComponent
  ],
  templateUrl: './ticket-form.component.html',
  standalone: true
})
export class TicketFormComponent implements OnInit {

  ticketForm!: FormGroup;
  loading = false;
  


  // Pour les techniciens
  techniciens: { id: string; nom: string; prenom: string }[] = [];
  technicienOptions: { value: string; label: string }[] = [];

  // Pour les incidents
  incidents: any[] = [];
  incidentOptions: MultiOption[] = [];
 selectedIncidentIds: string[] = [];   showIncidentError = false;
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
    this.loadIncidents();
  }

  initForm(): void {
    this.ticketForm = this.fb.group({
      titreTicket: ['', [Validators.required, Validators.minLength(3)]],
      descriptionTicket: ['', Validators.required],
      assigneeId: [null],
      dateLimite: [null],
      commentaireInitial: [''],
      commentaireInterne: [false]
    });
  }

  futureDateValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) {
      return null;
    }
    
    const selectedDate = new Date(control.value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      return { pastDate: true };
    }
    return null;
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
    this.userService.getTechniciens().subscribe({
      next: (users) => {
        this.techniciens = users.map(u => ({
          id: u.id,
          nom: u.nom,
          prenom: u.prenom
        }));
        
        this.technicienOptions = this.techniciens.map(t => ({
          value: t.id,
          label: `${t.nom} ${t.prenom}`
        }));
        
        console.log('Techniciens chargés:', this.techniciens);
      },
      error: (err) => {
        console.error('Erreur chargement techniciens:', err);
        this.showError('Impossible de charger les techniciens');
      }
    });
  }

  getIncidentCode(incidentId: string): string {
    const incident = this.incidents.find(i => i.id === incidentId);
    return incident ? incident.codeIncident : 'Incident';
  }

// Dans ticket-form.component.ts
loadIncidents(): void {
  // ✅ Utiliser le nouvel endpoint qui récupère les incidents sans aucun ticket lié
  this.incidentService.getIncidentsSansTicket().subscribe({
    next: (incidents) => {
      this.incidents = incidents;
      console.log('Incidents disponibles (sans aucun ticket lié):', this.incidents.length);
      
      // Réinitialiser la sélection si des incidents sélectionnés ne sont plus disponibles
      this.selectedIncidentIds = this.selectedIncidentIds.filter(id => 
        this.incidents.find(i => i.id === id)
      );
    },
    error: (err) => {
      console.error('Erreur chargement incidents:', err);
      this.showError('Impossible de charger les incidents');
    }
  });
}



  /**
   * Vérifie si un incident est sélectionné
   */
  isIncidentSelected(incidentId: string): boolean {
    return this.selectedIncidentIds.includes(incidentId);
  }

  /**
   * Ajoute ou retire un incident de la sélection
   */
  toggleIncidentSelection(incidentId: string): void {
    if (this.isIncidentSelected(incidentId)) {
      this.selectedIncidentIds = this.selectedIncidentIds.filter(id => id !== incidentId);
    } else {
      this.selectedIncidentIds = [...this.selectedIncidentIds, incidentId];
    }
    this.showIncidentError = false;
    console.log('Incidents sélectionnés:', this.selectedIncidentIds);
  }
/**
 * Récupère les détails d'un incident par son ID
 */
getIncidentDetails(incidentId: string): any {
  return this.incidents.find(i => i.id === incidentId);
}




  private showError(message: string): void {
    alert(message);
  }

  private showWarning(message: string): void {
    console.warn(message);
  }

 

  // ========== SOUMISSION AVEC FORKJOIN ==========

 submit() {
    this.showIncidentError = false;

    if (this.ticketForm.invalid) {
      this.ticketForm.markAllAsTouched();
      return;
    }

    // Vérifier qu'au moins un incident est sélectionné
    if (!this.selectedIncidentIds || this.selectedIncidentIds.length === 0) {
      this.showIncidentError = true;
      
      setTimeout(() => {
        document.querySelector('.rounded-2xl')?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }, 100);
      
      return;
    }

    this.loading = true;
    console.log('🚀 Création du ticket...');

    // 1. Créer le ticket d'abord
    const ticketFormData = new FormData();
    ticketFormData.append('TitreTicket', this.ticketForm.value.titreTicket);
    ticketFormData.append('DescriptionTicket', this.ticketForm.value.descriptionTicket);
    
    if (this.ticketForm.value.assigneeId) {
      ticketFormData.append('AssigneeId', this.ticketForm.value.assigneeId);
    }
    
    if (this.ticketForm.value.dateLimite) {
      ticketFormData.append('DateLimite', new Date(this.ticketForm.value.dateLimite).toISOString());
    }

      this.ticketService.createTicket(ticketFormData).pipe(
      switchMap(ticketResponse => {
        const ticketId = ticketResponse.data.id;
        console.log('✅ Ticket créé avec ID:', ticketId);
        
        // Lier les incidents
        if (this.selectedIncidentIds && this.selectedIncidentIds.length > 0) {
          console.log('🔗 Liaison de', this.selectedIncidentIds.length, 'incident(s)...');
          return this.ticketService.lierIncidents(ticketId, this.selectedIncidentIds).pipe(
            map(incidentResult => ({ ticketId, incidentResult }))
          );
        }
        return of({ ticketId });
      }),
      catchError(error => {
        console.error('❌ Erreur:', error);
        return throwError(() => error);
      }),
      finalize(() => {
        this.loading = false;
      })
    ).subscribe({
      next: (result) => {
        console.log('✅ Ticket créé avec succès:', result);
        this.router.navigate(['/tickets', result.ticketId]);
      },
      error: (error) => {
        console.error('❌ Erreur fatale:', error);
        this.showError('Erreur lors de la création du ticket');
        this.loading = false;
      }
    });
  }


error: string | null = null;  

cancel(): void {
  this.router.navigate(['/tickets']);
}
}