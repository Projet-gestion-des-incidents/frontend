import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { TicketService } from '../../services/ticket.service';
import { IncidentService } from '../../services/incident.service';
import { CommonModule } from '@angular/common';
import { CreateTicketDTO } from '../../models/Ticket.models';
import { FileInputExampleComponent } from '../form/form-elements/file-input-example/file-input-example.component';
import { CheckboxComponent } from '../form/input/checkbox.component';
import { UserService } from '../../services/user.service';
import { MultiSelectComponent } from '../form/multi-select/multi-select.component';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize, map, switchMap } from 'rxjs/operators';

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
  files: File[] = [];

  // Pour les techniciens
  techniciens: { id: string; nom: string; prenom: string }[] = [];
  technicienOptions: { value: string; label: string }[] = [];

  // Pour les incidents
  incidents: any[] = [];
  incidentOptions: MultiOption[] = [];
  selectedIncidentIds: string[] = [];

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

  loadIncidents(): void {
    this.incidentService.getAllIncidents().subscribe({
      next: (incidents) => {
        this.incidents = incidents;
        
        this.incidentOptions = this.incidents.map(incident => ({
          value: incident.id,
          text: `${incident.codeIncident} - ${incident.typeProbleme || 'Incident'}`,
          selected: this.selectedIncidentIds.includes(incident.id)
        }));
        
        console.log('Incidents chargés:', this.incidents);
      },
      error: (err) => {
        console.error('Erreur chargement incidents:', err);
        this.showError('Impossible de charger les incidents');
      }
    });
  }

  onIncidentSelectionChange(selectedIds: string[]): void {
    this.selectedIncidentIds = selectedIds;
    console.log('Incidents sélectionnés:', this.selectedIncidentIds);
  }

  private showError(message: string): void {
    alert(message);
  }

  private showWarning(message: string): void {
    console.warn(message);
    // Optionnel: afficher une notification moins critique
    // this.notificationService.warning(message);
  }

  onFileSelected(event: any) {
    if (event.target.files && event.target.files.length > 0) {
      this.files = Array.from(event.target.files);
    }
  }

  submit() {
    if (this.ticketForm.invalid) {
      this.ticketForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    console.log('🚀 Création du ticket...');

    // 1. Créer le ticket
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
      // Une fois le ticket créé, on prépare les autres appels
      switchMap(ticketResponse => {
        const ticketId = ticketResponse.data.id;
        console.log('✅ Ticket créé avec ID:', ticketId);
        
        // Collection d'observables à exécuter en parallèle
        const observables: any[] = [];
        
        // 2. Ajouter le commentaire si nécessaire
        if (this.ticketForm.value.commentaireInitial || this.files?.length) {
          const commentaireFormData = new FormData();
          commentaireFormData.append('Message', this.ticketForm.value.commentaireInitial || '');
          commentaireFormData.append('EstInterne', String(this.ticketForm.value.commentaireInterne));

          if (this.files?.length) {
            this.files.forEach(file => {
              commentaireFormData.append('Fichiers', file, file.name);
            });
          }

          observables.push(
            this.ticketService.addCommentaire(ticketId, commentaireFormData).pipe(
              catchError(error => {
                console.error('❌ Erreur ajout commentaire:', error);
                return of({ success: false, message: 'Erreur commentaire' });
              })
            )
          );
        }
        
        // 3. Lier les incidents si sélectionnés
        if (this.selectedIncidentIds && this.selectedIncidentIds.length > 0) {
          console.log('🔗 Liaison de', this.selectedIncidentIds.length, 'incident(s)...');
          
          observables.push(
            this.ticketService.lierIncidents(ticketId, this.selectedIncidentIds).pipe(
              catchError(error => {
                console.error('❌ Erreur liaison incidents:', error);
                return of({ success: false, message: 'Erreur liaison' });
              })
            )
          );
        }
        
        // Si aucun observable supplémentaire, retourner un observable vide
        if (observables.length === 0) {
          return of({ ticketId, success: true });
        }
        
        // Exécuter tous les observables en parallèle avec forkJoin
        return forkJoin(observables).pipe(
          map(results => ({
            ticketId,
            results
          }))
        );
      }),
      finalize(() => {
        this.loading = false;
      })
    ).subscribe({
      next: (result: any) => {
        console.log('✅ Toutes les opérations terminées:', result);
        
        // Analyser les résultats
        if (result.results) {
          const commentaireResult = result.results[0];
          const liaisonResult = result.results[1];
          
          if (liaisonResult && !liaisonResult.isSuccess) {
            this.showWarning('Le ticket a été créé mais certains incidents n\'ont pas pu être liés');
          }
        }
        
        // Rediriger vers le détail du ticket
        this.router.navigate(['/tickets', result.ticketId]);
      },
      error: (error) => {
        console.error('❌ Erreur fatale:', error);
        this.showError('Erreur lors de la création du ticket');
        this.loading = false;
      }
    });
  }
}