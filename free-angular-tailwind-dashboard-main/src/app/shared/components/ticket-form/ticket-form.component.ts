import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { TicketService } from '../../services/ticket.service';
import { CommonModule } from '@angular/common';
import { CreateTicketDTO } from '../../models/Ticket.models';
import { FileInputExampleComponent } from '../form/form-elements/file-input-example/file-input-example.component';
import { CheckboxComponent } from '../form/input/checkbox.component';

@Component({
  selector: 'app-ticket-form',
    imports: [CommonModule,CheckboxComponent,FileInputExampleComponent, FormsModule, RouterModule,ReactiveFormsModule],
  styles: ``,

  templateUrl: './ticket-form.component.html',
  standalone: true
})
export class TicketFormComponent implements OnInit {

  ticketForm!: FormGroup;
  loading = false;
  files: File[] = []; // fichiers attachés

statuts = [
  { label: 'Nouveau', value: 1 },
  { label: 'Assigné', value: 2 },
  { label: 'En cours', value: 3 },
    { label: 'En Attente', value: 4 } ,
  { label: 'Résolu', value: 5 } ,
    { label: 'Cloturé', value: 6 } ,
    { label: 'Reouvert', value: 7 } 

];

priorites = [
  { label: 'Basse', value: 1 },
  { label: 'Normale', value: 2 },
  { label: 'Haute', value: 3 }
];

  ticket: CreateTicketDTO = {
    titreTicket: '',
    descriptionTicket: '',
    prioriteTicket: 1, // Basse par défaut
    statutTicket: 1    // Nouveau par défaut
  };
  constructor(
    private fb: FormBuilder,
    private ticketService: TicketService,
    private router: Router
  ) {}

ngOnInit(): void {
  this.ticketForm = this.fb.group({
    titreTicket: ['', Validators.required],
    descriptionTicket: ['', Validators.required],
    priorite: [0, Validators.required], // Faible par défaut
    statut: [0, Validators.required],   // Nouveau par défaut
      commentaireInitial: [''],
      commentaireInterne: [false]  });
}
  onFileSelected(event: any) {
    if (event.target.files && event.target.files.length > 0) {
      this.files = Array.from(event.target.files);
    }
  }
private toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1]; // enlever data:image/...;base64,
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
}
async submit() {
  if (this.ticketForm.invalid) {
    this.ticketForm.markAllAsTouched();
    return;
  }

  this.loading = true;

  try {

    // Convertir les fichiers en base64
    const piecesJointes = await Promise.all(
      this.files.map(async (file) => ({
        nomFichier: file.name,
        contentType: file.type,
contenuBase64: await this.toBase64(file)   
   }))
    );

    const dto: CreateTicketDTO = {
      titreTicket: this.ticketForm.value.titreTicket,
      descriptionTicket: this.ticketForm.value.descriptionTicket,
     prioriteTicket: Number(this.ticketForm.value.priorite),
statutTicket: Number(this.ticketForm.value.statut),
      commentaireInitial: this.ticketForm.value.commentaireInitial || '',
      commentaireInterne: !!this.ticketForm.value.commentaireInterne,
  fichiers: piecesJointes 
    };

    console.log("DTO envoyé :", dto);

    this.ticketService.createTicket(dto).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/tickets']);
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      }
    });

  } catch (error) {
    console.error("Erreur conversion fichier:", error);
    this.loading = false;
  }
}


}
