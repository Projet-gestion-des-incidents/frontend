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
  
  // ========== PROPRIÉTÉS POUR LES FICHIERS ==========
  files: File[] = [];
  isDragActive = false;
  maxFileSize = 10 * 1024 * 1024; // 10MB
  maxFiles = 10;

  // Pour les techniciens
  techniciens: { id: string; nom: string; prenom: string }[] = [];
  technicienOptions: { value: string; label: string }[] = [];

  // Pour les incidents
  incidents: any[] = [];
  incidentOptions: MultiOption[] = [];
  selectedIncidentIds: string[] = [];
  showIncidentError = false;
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
  }

  // ========== GESTION DES FICHIERS ==========
  
  onFileSelected(event: any) {
    if (event.target.files && event.target.files.length > 0) {
      this.addFiles(Array.from(event.target.files));
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragActive = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragActive = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragActive = false;
    
    const files = event.dataTransfer?.files;
    if (files) {
      this.addFiles(Array.from(files));
    }
  }

  private addFiles(newFiles: File[]): void {
    const validFiles = newFiles.filter(file => {
      if (file.size > this.maxFileSize) {
        console.warn(`Fichier ${file.name} trop volumineux (max ${this.maxFileSize / 1024 / 1024}MB)`);
        return false;
      }
      return true;
    });

    if (this.files.length + validFiles.length > this.maxFiles) {
      this.showError(`Vous ne pouvez pas ajouter plus de ${this.maxFiles} fichiers`);
      return;
    }

    this.files = [...this.files, ...validFiles];
  }

  removeFile(index: number): void {
    this.files.splice(index, 1);
  }

  clearAllFiles(): void {
    this.files = [];
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // ========== SOUMISSION AVEC FORKJOIN ==========

submit() {
  this.showIncidentError = false;

  if (this.ticketForm.invalid) {
    this.ticketForm.markAllAsTouched();
    return;
  }

  if (!this.selectedIncidentIds || this.selectedIncidentIds.length === 0) {
    this.showIncidentError = true;
    
    setTimeout(() => {
      document.querySelector('.rounded-2xl.border-2')?.scrollIntoView({
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

  // Créer le ticket
  this.ticketService.createTicket(ticketFormData).pipe(
    switchMap(ticketResponse => {
      const ticketId = ticketResponse.data.id;
      console.log('✅ Ticket créé avec ID:', ticketId);
      
      // 2. Ajouter le commentaire si nécessaire
      if (this.ticketForm.value.commentaireInitial || this.files?.length) {
        return this.handleCommentaire(ticketId).pipe(
          map(result => ({
            ticketId,
            commentaireResult: result
          }))
        );
      }
      
      return of({ ticketId, commentaireResult: null });
    }),
    switchMap(result => {
      // 3. Lier les incidents
      if (this.selectedIncidentIds && this.selectedIncidentIds.length > 0) {
        console.log('🔗 Liaison de', this.selectedIncidentIds.length, 'incident(s)...');
        return this.ticketService.lierIncidents(result.ticketId, this.selectedIncidentIds).pipe(
          map(incidentResult => ({
            ...result,
            incidentResult
          }))
        );
      }
      return of(result);
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
      console.log('✅ Opérations terminées:', result);
      this.router.navigate(['/tickets', result.ticketId]);
    },
    error: (error) => {
      console.error('❌ Erreur fatale:', error);
      this.showError('Erreur lors de la création du ticket');
      this.loading = false;
    }
  });
}

private handleCommentaire(ticketId: string): Observable<any> {
  const commentaireFormData = new FormData();
  commentaireFormData.append('Message', this.ticketForm.value.commentaireInitial || '');
  commentaireFormData.append('EstInterne', String(this.ticketForm.value.commentaireInterne));

  // Ajouter les fichiers
  if (this.files?.length) {
    this.files.forEach(file => {
      commentaireFormData.append('piecesJointes', file, file.name);
    });
  }

  // Ajouter un petit délai pour s'assurer que le ticket est bien en base
  return timer(500).pipe(
    switchMap(() => this.ticketService.addCommentaire(ticketId, commentaireFormData)),
    tap(response => {
      console.log('✅ Commentaire ajouté:', response);
    }),
    catchError(error => {
      console.error('❌ Erreur ajout commentaire:', error);
      this.showWarning('Le ticket a été créé mais le commentaire n\'a pas pu être ajouté');
      return of(null); // Continuer même si le commentaire échoue
    })
  );
}
}