import { Component, OnInit } from '@angular/core';
import { TicketService } from '../../shared/services/ticket.service';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { BadgeColor, BadgeComponent } from '../../shared/components/ui/badge/badge.component';
import { TableDropdownComponent } from '../../shared/components/common/table-dropdown/table-dropdown.component';
import { AvatarTextComponent } from '../../shared/components/ui/avatar/avatar-text.component';
import { ButtonComponent } from '../../shared/components/ui/button/button.component';
import { AlertComponent } from '../../shared/components/ui/alert/alert.component';
import { TicketDTO } from '../../shared/models/Ticket.models';
import { DatePickerComponent } from '../../shared/components/form/date-picker/date-picker.component';

@Component({
  selector: 'app-tickets',
  templateUrl: './tickets.component.html',
  standalone: true,
    imports: [
    CommonModule,ButtonComponent,AlertComponent,DatePickerComponent,
    FormsModule,     // ✅ IMPORTANT
    RouterModule,ReactiveFormsModule,AvatarTextComponent,BadgeComponent,TableDropdownComponent
  ]
})
export class TicketsComponent implements OnInit {
  private searchTimeout: any;
  yearOptions: string[] = [];
maxTicketDate: Date = new Date(); // aujourd'hui

  tickets: any[] = [];
  filteredTickets: any[] = [];
  searchTerm: string = '';
 alert = {
    show: false,
    variant: 'info' as 'success' | 'error' | 'warning' | 'info',
    title: '',
    message: ''
  };
  showFilters = false;
tempFilters = {
  priorite: undefined as number | undefined,
  statut: undefined as number | undefined,
  dateDebut: ''
};
  // Filtres
  selectedPriorite?: number;
  selectedStatut?: number;
  selectedYear: string = '';
   currentPage = 1;
  pageSize = 5;
  totalPages = 1;
  totalCount = 0;
  loading = true;
  error: string | null = null;
confirmTicket: TicketDTO | null = null;  
  constructor(private ticketService: TicketService,    private router: Router
) {}

  ngOnInit(): void {
        this.generateYearOptions();

    this.loadTickets();
  }
   generateYearOptions(): void {
    const currentYear = new Date().getFullYear();
    for (let i = 0; i < 10; i++) {
      this.yearOptions.push((currentYear - i).toString());
    }
  }
// Valeur du picker
get ticketDate(): Date | null {
  return this.tempFilters.dateDebut ? new Date(this.tempFilters.dateDebut) : null;
}

onTicketDateChange(event: Date | null) {
  if (!event) {
    this.tempFilters.dateDebut = '';
    return;
  }
  const startOfDay = new Date(event);
  startOfDay.setHours(0, 0, 0, 0);
  this.tempFilters.dateDebut = startOfDay.toISOString();
}
  // Ajoutez ces méthodes
toggleFilters(): void {
  this.showFilters = !this.showFilters;
  if (this.showFilters) {
    // Initialiser les filtres temporaires avec les valeurs actuelles
    this.tempFilters = {
      priorite: this.selectedPriorite,
      statut: this.selectedStatut,
      dateDebut: '',
    };
  }
}
 formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
    extractYear(date: Date): string {
    return new Date(date).getFullYear().toString();
  }
applyFilters(): void {
  // Appliquer les filtres sélectionnés
  this.selectedPriorite = this.tempFilters.priorite;
  this.selectedStatut = this.tempFilters.statut;
  
  // Vous pouvez ajouter la logique pour les dates ici
  // Note: Le backend ne semble pas supporter le filtre par plage de dates pour l'instant
  
  this.currentPage = 1;
  this.loadTickets();
  this.showFilters = false;
}
cancelFilters(): void {
  this.showFilters = false;
  this.tempFilters = {
    priorite: this.selectedPriorite,
    statut: this.selectedStatut,
     dateDebut: this.tempFilters.dateDebut || ''
 };
}

clearFilters(): void {
  this.tempFilters = {
    priorite: undefined,
    statut: undefined,
    dateDebut: ''
  };
  this.selectedPriorite = undefined;
  this.selectedStatut = undefined;
  this.selectedYear = '';
  this.searchTerm = '';
  this.currentPage = 1;
  this.loadTickets();
  this.showFilters = false;
}
onSearch(): void {
  if (this.searchTimeout) clearTimeout(this.searchTimeout);
  
  this.searchTimeout = setTimeout(() => {
    console.log('🔍 Recherche lancée pour:', this.searchTerm);
    this.currentPage = 1;
    this.loadTickets();
  }, 400);
}
loadTickets() {
  this.loading = true;
  this.error = null;

  const request = {
    page: this.currentPage,
    pageSize: this.pageSize,
    searchTerm: this.searchTerm || null,
    statut: this.selectedStatut ?? null,
    priorite: this.selectedPriorite ?? null,
    dateDebut: this.tempFilters.dateDebut || null,
    sortBy: "date",
    sortDescending: true
  };

  console.log("📤 Request envoyée:", request);

  this.ticketService.getTicketsPaged(request).subscribe({
    next: (res) => {
      const paged = res.data;

      this.tickets = paged.items;
      this.filteredTickets = paged.items;

      this.totalCount = paged.totalCount;
      this.totalPages = paged.totalPages;
this.currentPage = paged.page;
      this.loading = false;
    },
    error: (err) => {
      console.error("❌ Erreur:", err);
      this.error = "Impossible de charger les tickets";
      this.loading = false;
    }
  });
}
deleteTicket(ticket: TicketDTO) {
  this.confirmTicket = ticket;

  this.alert = {
    show: true,
    variant: 'warning',
    title: 'Confirmation',
    message: `Voulez-vous vraiment supprimer le ticket "${ticket.titreTicket}" ?`
  };
}
  


 confirmDelete() {
  if (!this.confirmTicket) return;

  this.ticketService.deleteTicket(this.confirmTicket.id).subscribe({
    next: () => {
      this.showAlert(
        'success',
        'Ticket supprimé',
        `Le ticket "${this.confirmTicket!.titreTicket}" a été supprimé.`
      );

      this.confirmTicket = null;
      this.loadTickets();
    },
    error: () => {
      this.showAlert(
        'error',
        'Erreur',
        `Impossible de supprimer le ticket "${this.confirmTicket!.titreTicket}".`
      );

      this.confirmTicket = null;
    }
  });
}

  cancelDelete() {
    this.confirmTicket = null;
    this.alert.show = false;
  }

  showAlert(variant: 'success' | 'error' | 'warning' | 'info', title: string, message: string) {
    this.alert = { show: true, variant, title, message };
    setTimeout(() => (this.alert.show = false), 3000);
  }



  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }
// Gestion de la pagination
  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadTickets();
    }
  }

  // Génération des numéros de page
  getPageNumbers(): number[] {
    if (this.totalPages <= 0) {
      return [1];
    }
    
    const maxVisible = 5;
    const pages: number[] = [];
    
    if (this.totalPages <= maxVisible) {
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (this.currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push(-1);
        pages.push(this.totalPages);
      } else if (this.currentPage >= this.totalPages - 2) {
        pages.push(1);
        pages.push(-1);
        for (let i = this.totalPages - 3; i <= this.totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push(-1);
        for (let i = this.currentPage - 1; i <= this.currentPage + 1; i++) pages.push(i);
        pages.push(-1);
        pages.push(this.totalPages);
      }
    }
    
    return pages;
  }
// 🎨 Couleur selon le STATUT
getStatusBadgeColor(status: string): BadgeColor {
  switch (status) {
    case 'Nouveau': return 'info';
    case 'Assigné': return 'primary';
    case 'En cours': return 'warning';
    case 'Résolu': return 'success';
    case 'Clôturé': return 'dark';
    default: return 'light';
  }
}

// 🎨 Couleur selon la PRIORITÉ
getPriorityBadgeColor(priority: string): BadgeColor {
  switch (priority) {
    case 'Basse': return 'success';
    case 'Moyenne': return 'warning';
    case 'Haute': return 'primary';   
        case 'Critique': return 'dark';
    default: return 'light';
  }
}
}
