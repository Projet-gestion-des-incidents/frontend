import { Component, OnInit } from '@angular/core';
import { TicketService } from '../../shared/services/ticket.service';
import { UserService } from '../../shared/services/user.service';
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
  successMessage: string = '';
  
  tickets: any[] = [];
  filteredTickets: any[] = [];
  searchTerm: string = '';
  
  // Gestion des rôles
  userRole: string | null = null;
  isAdmin: boolean = false;
  isTechnicien: boolean = false;
  
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
  deletingSelected: boolean = false;
  
  // Sélection multiple
  selectedTickets: string[] = [];

  constructor(
    private ticketService: TicketService,
    private userService: UserService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.generateYearOptions();
    
    // Récupérer le rôle de l'utilisateur connecté
    this.userService.getMyProfile().subscribe({
      next: (user) => {
        this.userRole = user.role;
        this.isAdmin = user.role === 'Admin';
        this.isTechnicien = user.role === 'Technicien';
        console.log('👤 Rôle utilisateur:', this.userRole);
        console.log('  - isAdmin:', this.isAdmin);
        console.log('  - isTechnicien:', this.isTechnicien);
        
        // Charger les tickets selon le rôle
        this.loadTickets();
        this.loadDashboardStats();
      },
      error: (err) => {
        console.error('❌ Erreur récupération rôle:', err);
        this.error = 'Impossible de récupérer votre profil';
        this.loading = false;
      }
    });
  }
// Ajoutez ces propriétés avec les autres déclarations
ticketToArchive: TicketDTO | null = null;
showArchiveModal: boolean = false;
archiving: boolean = false;
// Ajoutez ces méthodes dans votre classe TicketsComponent

/**
 * Ouvre la modale de confirmation d'archivage pour un ticket
 */
onArchive(ticket: TicketDTO): void {
  this.ticketToArchive = ticket;
  this.showArchiveModal = true;
}

/**
 * Annule l'archivage
 */
cancelArchive(): void {
  this.showArchiveModal = false;
  this.ticketToArchive = null;
  this.archiving = false;
}

// Dans tickets.component.ts, modifiez la méthode confirmArchive :

confirmArchive(): void {
  if (!this.ticketToArchive) return;
  
  this.archiving = true;
  
  this.ticketService.archiverTicket(this.ticketToArchive.id).subscribe({
    next: (response) => {
      console.log('📥 Réponse complète:', response);
      
      if (response.isSuccess) {
        this.showAlert('success', 'Succès', `Le ticket "${this.ticketToArchive!.referenceTicket}" a été archivé avec succès.`);
        
        // Retirer le ticket de la liste actuelle
        const index = this.tickets.findIndex(t => t.id === this.ticketToArchive!.id);
        if (index !== -1) {
          this.tickets.splice(index, 1);
          this.filteredTickets = [...this.tickets];
          this.totalCount--;
          this.totalPages = Math.ceil(this.totalCount / this.pageSize);
        }
        
        // Désélectionner si sélectionné
        this.selectedTickets = this.selectedTickets.filter(id => id !== this.ticketToArchive!.id);
      } else {
        // Afficher le message d'erreur détaillé
        const errorMessage = response.message || 'Impossible d\'archiver le ticket.';
        this.showAlert('error', 'Erreur', errorMessage);
      }
      this.cancelArchive();
    },
    error: (err) => {
      console.error('❌ Erreur complète:', err);
      
      // Extraire le message d'erreur du backend
      let errorMessage = 'Erreur lors de l\'archivage';
      
      if (err.error?.message) {
        errorMessage = err.error.message;
      } else if (err.error?.errors) {
        // Cas des erreurs de validation
        const errors = Object.values(err.error.errors).flat();
        errorMessage = errors.join(', ');
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      this.showAlert('error', 'Erreur', errorMessage);
      this.cancelArchive();
    }
  });
}
  generateYearOptions(): void {
    const currentYear = new Date().getFullYear();
    for (let i = 0; i < 10; i++) {
      this.yearOptions.push((currentYear - i).toString());
    }
  }
// Dans tickets.component.ts - Ajouter ces propriétés

dashboardStats = {
  overview: {
    totalTickets: 0,
    ticketsNonAssigne: 0,
    ticketsAssignes: 0,
    ticketsEnCours: 0,
    ticketsResolus: 0,
    tauxNonAssigne: 0,
    tauxAssignes: 0,
    tauxEnCours: 0,
    tauxResolus: 0,
    tauxResolutionGlobal: 0
  },
  statsParStatut: [] as { statut: string; count: number; color: string; pourcentage: number }[],
  statsParJour: [] as any[],
  statsParSemaine: [] as any[],
  statsParMois: [] as any[]
};

loadingDashboard = false;
// Remplacer les méthodes existantes par celles-ci

formatDateLimite(dateLimite: string | null): string {
  if (!dateLimite || dateLimite === '0001-01-01T00:00:00') {
    return 'Non définie';
  }
  return new Date(dateLimite).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

// ✅ Nouvelle méthode : évaluer le statut par rapport à la date limite
getDateLimiteStatus(ticket: any): {
  text: string;
  color: string;
  icon: string;
} {
  // Si pas de date limite
  if (!ticket.dateLimite || ticket.dateLimite === '0001-01-01T00:00:00') {
    return {
      text: 'Non définie',
      color: 'text-gray-500 dark:text-gray-400',
      icon: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
    };
  }

  const dateLimite = new Date(ticket.dateLimite);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Cas 1: Ticket résolu
  if (ticket.statutTicketLibelle === 'Résolu' && ticket.dateCloture) {
    const dateCloture = new Date(ticket.dateCloture);
    
    if (dateCloture <= dateLimite) {
      // ✅ Résolu avant la date limite
      return {
        text: ' Réalisé avant délai',
        color: 'text-green-600 dark:text-green-400',
        icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
      };
    } else {
      // ❌ Résolu après la date limite
      const daysLate = Math.ceil((dateCloture.getTime() - dateLimite.getTime()) / (1000 * 3600 * 24));
      return {
        text: ` Réalisé après délai (+${daysLate}j)`,
        color: 'text-red-600 dark:text-red-400',
        icon: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
      };
    }
  }
  
  // Cas 2: Ticket non résolu - vérifier si la date limite est dépassée
  if (dateLimite < today) {
    const daysOverdue = Math.ceil((today.getTime() - dateLimite.getTime()) / (1000 * 3600 * 24));
    return {
      text: ` Expiré (${daysOverdue}j de retard)`,
      color: 'text-red-600 dark:text-red-400 font-semibold',
      icon: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
    };
  }
  
  // Cas 3: Ticket non résolu mais date limite pas encore dépassée
  const daysLeft = Math.ceil((dateLimite.getTime() - today.getTime()) / (1000 * 3600 * 24));
  
  if (daysLeft === 0) {
    return {
      text: ' Dernier jour',
      color: 'text-orange-600 dark:text-orange-400 font-semibold',
      icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
    };
  }
  
  if (daysLeft <= 3) {
    return {
      text: ` ${daysLeft}j restants (urgent)`,
      color: 'text-orange-600 dark:text-orange-400',
      icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
    };
  }
  
  return {
    text: `${daysLeft}j restants`,
    color: 'text-green-600 dark:text-green-400',
    icon: 'M5 13l4 4L19 7'
  };
}

// Version simplifiée pour la couleur du texte uniquement (optionnelle)
getDateLimiteSimpleStatus(ticket: any): { text: string; colorClass: string } {
  const status = this.getDateLimiteStatus(ticket);
  return {
    text: status.text,
    colorClass: status.color
  };
}
// Ajouter dans ngOnInit après le chargement du rôle
loadDashboardStats(): void {
  if (!this.isAdmin) return;
  
  this.loadingDashboard = true;
  
  this.ticketService.getTicketDashboard().subscribe({
    next: (response) => {
      if (response) {
        this.dashboardStats = response;
        console.log('Dashboard tickets stats chargées:', this.dashboardStats);
      }
      this.loadingDashboard = false;
    },
    error: (err) => {
      console.error('Erreur chargement dashboard tickets:', err);
      this.loadingDashboard = false;
    }
  });
}
openCalendar(): void {
  const dateInput = document.getElementById('ticketDate') as HTMLInputElement;
  if (dateInput) {
    dateInput.showPicker(); // Fonctionne dans les navigateurs modernes
  }
}
// Appeler dans ngOnInit après loadTickets()
// Ajouter : this.loadDashboardStats();
  // Valeur du picker
  get ticketDate(): Date | null {
    return this.tempFilters.dateDebut ? new Date(this.tempFilters.dateDebut) : null;
  }

 // Remplacer la méthode existante par celle-ci
onTicketDateChange(event: Event): void {
  const input = event.target as HTMLInputElement;
  const dateValue = input.value;
  
  if (dateValue) {
    const date = new Date(dateValue);
    if (!isNaN(date.getTime())) {
      this.selectedDate = date;
      this.tempFilters.dateDebut = dateValue;
    } else {
      this.selectedDate = null;
      this.tempFilters.dateDebut = '';
    }
  } else {
    this.selectedDate = null;
    this.tempFilters.dateDebut = '';
  }
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

  /**
   * Charge les tickets en fonction du rôle de l'utilisateur
   * - Admin: voit tous les tickets via getTicketsPaged()
   * - Technicien: voit seulement ses tickets assignés via getMesTicketsAssignes()
   */
  loadTickets() {
    if (!this.userRole) {
      console.log('⏳ En attente du chargement du rôle...');
      return;
    }

    this.loading = true;
    this.error = null;

    // ADMIN: voir tous les tickets
    if (this.isAdmin) {
      console.log('👑 Admin: Chargement de tous les tickets');
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
          
          console.log(`✅ ${this.tickets.length} tickets chargés pour l'admin`);
          
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
    
else if (this.isTechnicien) {
  console.log('🔧 Technicien: Chargement de mes tickets assignés avec pagination');
  
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

  console.log("📤 Request technicien envoyée:", request);

  this.ticketService.getMesTicketsAssignes(request).subscribe({
    next: (res) => {
      if (res.isSuccess && res.data) {
        const paged = res.data;
        // ✅ Utiliser les noms camelCase (items, totalCount, page)
        this.tickets = paged.items || [];
        this.filteredTickets = this.tickets;
        this.totalCount = paged.totalCount || 0;
        // Calculer totalPages à partir de totalCount et pageSize
        this.totalPages = Math.ceil(this.totalCount / this.pageSize);
        this.currentPage = paged.page || 1;
        
        console.log(`✅ ${this.tickets.length} tickets assignés chargés pour le technicien`);
      } else {
        this.tickets = [];
        this.totalCount = 0;
        this.totalPages = 1;
      }
      
      this.selectedTickets = [];
      this.loading = false;
    },
    error: (err) => {
      console.error("❌ Erreur chargement tickets assignés:", err);
      this.error = "Impossible de charger vos tickets assignés";
      this.loading = false;
    }
  });
}
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
  }

  deleteSelectedTickets(): void {
    if (this.selectedTickets.length === 0) return;
    
    this.ticketsToDelete = [...this.selectedTickets];
    this.confirmTicket = null;
  }

  confirmDelete() {
    // Cas suppression multiple
    if (this.ticketsToDelete && this.ticketsToDelete.length > 0) {
      this.deletingSelected = true;
      
      let successCount = 0;
      let errorCount = 0;
      
      const deleteObservables = this.ticketsToDelete.map(id =>
        this.ticketService.deleteTicket(id).pipe(
          catchError(error => {
            console.error(`❌ Erreur suppression ticket ${id}:`, error);
            errorCount++;
            return of(null);
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

      forkJoin(deleteObservables).pipe(
        finalize(() => {
          this.deletingSelected = false;
          
          if (successCount === this.ticketsToDelete!.length) {
            this.showAlert('success', 'Succès', `${successCount} ticket(s) supprimé(s) avec succès.`);
          } else if (successCount > 0) {
            this.showAlert('warning', 'Suppression partielle', `${successCount} ticket(s) supprimé(s), ${errorCount} échec(s).`);
          } else {
            this.showAlert('error', 'Échec', `Impossible de supprimer les tickets sélectionnés.`);
          }
          
          this.selectedTickets = [];
          this.ticketsToDelete = null;
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
            this.showAlert('success', 'Ticket supprimé', `Le ticket "${this.confirmTicket!.titreTicket}" a été supprimé.`);
            
            this.selectedTickets = this.selectedTickets.filter(id => id !== this.confirmTicket!.id);
            this.confirmTicket = null;
            this.loadTickets();
          } else {
            this.showAlert('error', 'Erreur', response.message || `Impossible de supprimer le ticket "${this.confirmTicket!.titreTicket}".`);
            this.confirmTicket = null;
          }
        },
        error: (err) => {
          console.error('❌ Erreur:', err);
          const errorMessage = err.error?.message || err.message || 'Erreur inconnue';
          this.showAlert('error', 'Erreur', `Impossible de supprimer le ticket: ${errorMessage}`);
          this.confirmTicket = null;
        }
      });
    }
  }

  cancelDelete() {
    this.confirmTicket = null;
    this.ticketsToDelete = null;
  }

  showAlert(variant: 'success' | 'error' | 'warning' | 'info', title: string, message: string) {
    if (variant === 'success') {
      this.successMessage = message;
      setTimeout(() => {
        this.successMessage = '';
      }, 3000);
    } else if (variant === 'error') {
      this.error = message;
      setTimeout(() => {
        this.error = null;
      }, 5000);
    } else if (variant === 'warning') {
      // Pour les avertissements, on peut utiliser l'alerte ou un toast
      console.warn(message);
    }
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
    case 'Non assigné':
    case 'Non assigne':
    case 'NonAssigne':
      return 'error';      // Rouge - pour alerter
    case 'Assigné':
    case 'Assigne':
      return 'warning';    // Jaune/Ambre - en attente
    case 'En cours':
    case 'EnCours':
      return 'orange';    // Orange - en progression
    case 'Résolu':
    case 'Resolu':
      return 'success';    // Vert - terminé
    default:
      return 'light';      // Gris clair
  }
}


}