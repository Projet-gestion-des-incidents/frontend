import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TicketService } from '../../shared/services/ticket.service';
import { TicketDetailDTO, TicketDTO } from '../../shared/models/Ticket.models';
import { CommonModule, DatePipe, NgForOf, NgIf } from '@angular/common';
import { BadgeColor, BadgeComponent } from '../../shared/components/ui/badge/badge.component';
import { AvatarTextComponent } from '../../shared/components/ui/avatar/avatar-text.component';

@Component({
  selector: 'app-ticket-detail',
  imports: [CommonModule, NgIf, NgForOf, DatePipe,BadgeComponent,AvatarTextComponent],
  templateUrl: './ticket-detail.component.html',
  styleUrl: './ticket-detail.component.css',
})
export class TicketDetailComponent {

  ticket?: TicketDetailDTO;
    loading = true;
  errorMessage = '';
selectedImage: string | null = null;
  constructor(
    private route: ActivatedRoute,
    private ticketService: TicketService,
    private router: Router
  ) {}

 ngOnInit(): void {
  const id = this.route.snapshot.paramMap.get('id');
  if (!id) {
    this.errorMessage = 'ID du ticket manquant';
    this.loading = false;
    return;
  }

  this.ticketService.getTicketDetails(id).subscribe({
    next: res => {
      if (res.isSuccess && res.data) {
        this.ticket = res.data; // Maintenant TicketDetailDTO
      } else {
        this.errorMessage = 'Ticket introuvable';
      }
      this.loading = false;
    },
    error: err => {
      console.error(err);
      this.errorMessage = 'Erreur lors du chargement du ticket';
      this.loading = false;
    }
  });
}
  isImage(contentType: string | undefined): boolean {
  if (!contentType) return false;
  const imageTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
  return imageTypes.includes(contentType.toLowerCase());
}
 getBadgeColor(status: string): BadgeColor {

  switch (status) {
    case 'Nouveau': return 'info';
    case 'Assigné': return 'primary';
    case 'En cours': return 'warning';
    case 'Résolu': return 'success';
    case 'Clôturé': return 'dark';
    default: return 'light'; // ✅ au lieu de secondary
  }
}
  
  goBack() {
    this.router.navigate(['/tickets']);
  }


  }

