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
import { CheckboxComponent } from '../../shared/components/form/input/checkbox.component';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize, tap } from 'rxjs/operators';

@Component({
  selector: 'app-tickets',
  templateUrl: './tickets.component.html',
  standalone: true,
  imports: [
    CommonModule,
    ButtonComponent,
    AlertComponent,
    DatePickerComponent,
    FormsModule,
    RouterModule,
    ReactiveFormsModule,
    AvatarTextComponent,
    BadgeComponent,
    TableDropdownComponent,
    CheckboxComponent
  ]
})
export class TicketsComponent implements OnInit {
  private searchTimeout: any;
  yearOptions: string[] = [];
  maxTicketDate: Date = new Date();

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
  selectedDate: Date | null = null;
  selectedYear: string = '';
  
  // Pagination
  currentPage = 1;
  pageSize = 5;
  totalPages = 1;
  totalCount = 0;
  loading = true;
  error: string | null = null;
  
  // Suppression
  confirmTicket: TicketDTO | null = null;
  ticketsToDelete: string[] | null = null;
  deletingSelected = false;
  
  // Sélection multiple
  selectedTickets: string[] = [];

  constructor(
    private ticketService: TicketService,
    private router: Router
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
    this.selectedDate = event;
    if (!event) {
      this.tempFilters.dateDebut = '';
      return;
    }
    const year = event.getFullYear();
    const month = (event.getMonth() + 1).toString().padStart(2, '0');
    const day = event.getDate().toString().padStart(2, '0');
    this.tempFilters.dateDebut = `${year}-${month}-${day}`;
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
    if (this.showFilters) {
      this.tempFilters = {
        priorite: this.selectedPriorite,
        statut: this.selectedStatut,
        dateDebut: this.tempFilters.dateDebut
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
    this.selectedPriorite = this.tempFilters.priorite;
    this.selectedStatut = this.tempFilters.statut;
    this.selectedYear = this.tempFilters.dateDebut;
    
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
    this.selectedDate = null;
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
        
        // Nettoyer les sélections si on change de page
        this.selectedTickets = [];
        this.loading = false;
      },
      error: (err) => {
        console.error("❌ Erreur:", err);
        this.error = "Impossible de charger les tickets";
        this.loading = false;
      }
    });
  }

  // ========== GESTION DE LA SÉLECTION MULTIPLE ==========
  
  toggleSelection(ticketId: string, checked: boolean): void {
    if (checked) {
      this.selectedTickets.push(ticketId);
    } else {
      this.selectedTickets = this.selectedTickets.filter(id => id !== ticketId);
    }
  }

  toggleAllSelection(checked: boolean): void {
    if (checked) {
      this.selectedTickets = this.tickets.map(t => t.id);
    } else {
      this.selectedTickets = [];
    }
  }

  isSelected(ticketId: string): boolean {
    return this.selectedTickets.includes(ticketId);
  }

  isAllSelected(): boolean {
    return this.tickets.length > 0 && this.selectedTickets.length === this.tickets.length;
  }

  isIndeterminate(): boolean {
    return this.selectedTickets.length > 0 && this.selectedTickets.length < this.tickets.length;
  }

  // ========== GESTION DE LA SUPPRESSION ==========

  deleteTicket(ticket: TicketDTO) {
    this.confirmTicket = ticket;
    this.ticketsToDelete = null;
    
    this.alert = {
      show: true,
      variant: 'warning',
      title: 'Confirmation',
      message: `Voulez-vous vraiment supprimer le ticket "${ticket.titreTicket}" ?`
    };
  }

  deleteSelectedTickets(): void {
    if (this.selectedTickets.length === 0) return;
    
    this.ticketsToDelete = [...this.selectedTickets];
    this.confirmTicket = null;
    
    this.alert = {
      show: true,
      variant: 'warning',
      title: 'Confirmation',
      message: `Voulez-vous vraiment supprimer ${this.selectedTickets.length} ticket(s) ?`
    };
  }

 confirmDelete() {
  // Cas suppression multiple
  if (this.ticketsToDelete && this.ticketsToDelete.length > 0) {
    this.deletingSelected = true;
    
    // Compter les succès et échecs
    let successCount = 0;
    let errorCount = 0;
    const errors: any[] = [];
    
    // Créer un tableau d'observables pour chaque suppression
    const deleteObservables = this.ticketsToDelete.map(id =>
      this.ticketService.deleteTicket(id).pipe(
        catchError(error => {
          console.error(`❌ Erreur suppression ticket ${id}:`, error);
          errorCount++;
          errors.push({ id, error: error.error?.message || error.message });
          return of(null); // Retourner null pour ne pas casser forkJoin
        }),
        tap(result => {
          if (result && result.isSuccess) {
            successCount++;
          } else if (result && !result.isSuccess) {
            errorCount++;
          }
        })
      )
    );

    // Exécuter toutes les suppressions en parallèle
    forkJoin(deleteObservables).pipe(
      finalize(() => {
        this.deletingSelected = false;
        
        // Afficher le résultat
        if (successCount === this.ticketsToDelete!.length) {
          // Toutes les suppressions ont réussi
          this.showAlert(
            'success',
            'Succès',
            `${successCount} ticket(s) supprimé(s) avec succès.`
          );
        } else if (successCount > 0) {
          // Certaines ont réussi, d'autres non
          this.showAlert(
            'warning',
            'Suppression partielle',
            `${successCount} ticket(s) supprimé(s), ${errorCount} échec(s).`
          );
        } else {
          // Toutes ont échoué
          this.showAlert(
            'error',
            'Échec',
            `Impossible de supprimer les tickets sélectionnés.`
          );
        }
        
        // Nettoyer les sélections
        this.selectedTickets = [];
        this.ticketsToDelete = null;
        
        // Recharger la liste
        this.loadTickets();
      })
    ).subscribe({
      error: (err) => {
        console.error('❌ Erreur fatale:', err);
        this.deletingSelected = false;
        this.showAlert('error', 'Erreur', 'Une erreur inattendue est survenue.');
      }
    });
  } 
  // Cas suppression simple
  else if (this.confirmTicket) {
    this.ticketService.deleteTicket(this.confirmTicket.id).subscribe({
      next: (response) => {
        if (response.isSuccess) {
          this.showAlert(
            'success',
            'Ticket supprimé',
            `Le ticket "${this.confirmTicket!.titreTicket}" a été supprimé.`
          );
          
          // Retirer des sélections si présent
          this.selectedTickets = this.selectedTickets.filter(id => id !== this.confirmTicket!.id);
          this.confirmTicket = null;
          this.loadTickets();
        } else {
          this.showAlert(
            'error',
            'Erreur',
            response.message || `Impossible de supprimer le ticket "${this.confirmTicket!.titreTicket}".`
          );
          this.confirmTicket = null;
        }
      },
      error: (err) => {
        console.error('❌ Erreur:', err);
        const errorMessage = err.error?.message || err.message || 'Erreur inconnue';
        this.showAlert(
          'error',
          'Erreur',
          `Impossible de supprimer le ticket: ${errorMessage}`
        );
        this.confirmTicket = null;
      }
    });
  }
}
  cancelDelete() {
    this.confirmTicket = null;
    this.ticketsToDelete = null;
    this.alert.show = false;
  }

  showAlert(variant: 'success' | 'error' | 'warning' | 'info', title: string, message: string) {
    this.alert = { show: true, variant, title, message };
    setTimeout(() => (this.alert.show = false), 3000);
  }

  // ========== PAGINATION ==========

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadTickets();
    }
  }

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

  // ========== COULEURS DES BADGES ==========

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