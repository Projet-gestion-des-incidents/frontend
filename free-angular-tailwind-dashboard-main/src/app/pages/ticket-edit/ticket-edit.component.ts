import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TicketService } from '../../shared/services/ticket.service';
import { FileInputExampleComponent } from '../../shared/components/form/form-elements/file-input-example/file-input-example.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../../shared/components/ui/button/button.component';
import { AlertComponent } from '../../shared/components/ui/alert/alert.component';

@Component({
  selector: 'app-ticket-edit',
  standalone: true,
  imports: [
    CommonModule,ButtonComponent,AlertComponent,
    FormsModule,     // ✅ IMPORTANT
    RouterModule,ReactiveFormsModule,FileInputExampleComponent
  ],
  templateUrl: './ticket-edit.component.html',
  styleUrl: './ticket-edit.component.css',
})
export class TicketEditComponent implements OnInit {

  ticket!: any;
  ticketId!: string;
  loading = false;
  error: string | null = null;

statuts = [
  { label: 'Nouveau', value: 'Nouveau' },
  { label: 'Assigné', value: 'Assigné' },
  { label: 'En cours', value: 'EnCours' },
  { label: 'En Attente', value: 'EnAttente' },
  { label: 'Résolu', value: 'Résolu' },
  { label: 'Cloturé', value: 'Cloturé' },
  { label: 'Reouvert', value: 'Reouvert' }
];

priorites = [
  { label: 'Basse', value: 'Basse' },
  { label: 'Normale', value: 'Normale' },
  { label: 'Haute', value: 'Haute' }
];

  constructor(
    private route: ActivatedRoute,
    private ticketService: TicketService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.ticketId = this.route.snapshot.paramMap.get('id')!;
    this.loadTicket();
  }

loadTicket() {
  this.loading = true;

  this.ticketService.getTicketDetails(this.ticketId).subscribe({
    next: res => {
      if (res.isSuccess) {
        this.ticket = res.data;

        // ⚡ Map le premier commentaire existant
        if (this.ticket.commentaires && this.ticket.commentaires.length > 0) {
          this.ticket.commentaireMessage = this.ticket.commentaires[0].message;

          // Map les pièces jointes
          this.ticket.piecesJointes = this.ticket.commentaires[0].piecesJointes || [];
        } else {
          this.ticket.commentaireMessage = '';
          this.ticket.piecesJointes = [];
        }
      }
      this.loading = false;
    },
    error: err => {
      console.error(err);
      this.error = 'Erreur chargement ticket';
      this.loading = false;
    }
  });
}
onFilesSelected(files: File[]) {
  this.ticket.nouveauxFichiers = files;
}
  cancel() {
    this.router.navigate(['/tickets']);
  }
  save() {
    if (!this.ticket) return;

    this.loading = true;

    const formData = new FormData();

    // ===============================
    // 🔹 Champs simples
    // ===============================

    formData.append('TitreTicket', this.ticket.titreTicket);
    formData.append('DescriptionTicket', this.ticket.descriptionTicket);
    formData.append('PrioriteTicket', this.ticket.prioriteTicket.toString());
    formData.append('StatutTicket', this.ticket.statutTicket.toString());

    // ===============================
    // 🔹 Commentaire (nouveau)
    // ===============================

    if (this.ticket.commentaireMessage) {

      formData.append('Commentaires[0].Message', this.ticket.commentaireMessage);
      formData.append('Commentaires[0].EstInterne', 'false');

      if (this.ticket.nouveauxFichiers) {
        this.ticket.nouveauxFichiers.forEach((file: File) => {
          formData.append('Commentaires[0].NouveauxFichiers', file);
        });
      }
    }

    // ===============================
    // 🔹 Appel API
    // ===============================

    this.ticketService.updateTicket(this.ticketId, formData)
      .subscribe({
        next: () => {
          this.loading = false;
          this.router.navigate(['/tickets', this.ticketId]);
        },
        error: err => {
          console.error(err);
          this.error = 'Erreur mise à jour';
          this.loading = false;
        }
      });
  }
}