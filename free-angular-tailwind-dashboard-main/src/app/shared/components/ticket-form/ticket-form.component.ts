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
    prioriteTicket: [1, Validators.required],   // ✅ même nom que backend
    statutTicket: [1, Validators.required],     // ✅ même nom
    commentaireInitial: [''],
    commentaireInterne: [false]
  });
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

  // 🔹 1️⃣ Créer FormData pour ticket
  const ticketFormData = new FormData();
  ticketFormData.append('TitreTicket', this.ticketForm.value.titreTicket);
  ticketFormData.append('DescriptionTicket', this.ticketForm.value.descriptionTicket);
  ticketFormData.append('PrioriteTicket', this.ticketForm.value.prioriteTicket.toString());
  ticketFormData.append('StatutTicket', this.ticketForm.value.statutTicket.toString());

  // 🔹 2️⃣ Appel API ticket
  this.ticketService.createTicket(ticketFormData).subscribe({
    next: (ticketResponse) => {

      const ticketId = ticketResponse.data.id;

      // 🔥 Si commentaire ou fichiers → appeler API commentaire
      if (this.ticketForm.value.commentaireInitial || this.files?.length) {

        const commentaireFormData = new FormData();
        commentaireFormData.append('Message', this.ticketForm.value.commentaireInitial || '');
        commentaireFormData.append('EstInterne', 'false');

        if (this.files?.length) {
          this.files.forEach(file => {
            commentaireFormData.append('Fichiers', file);
          });
        }

        this.ticketService
          .addCommentaire(ticketId, commentaireFormData)
          .subscribe({
            next: () => {
              this.loading = false;
              this.router.navigate(['/tickets']);
            },
            error: (err) => {
              console.error(err);
              this.loading = false;
            }
          });

      } else {
        // Pas de commentaire → juste redirection
        this.loading = false;
        this.router.navigate(['/tickets']);
      }
    },
    error: (err) => {
      console.error(err);
      this.loading = false;
    }
  });
}

}
