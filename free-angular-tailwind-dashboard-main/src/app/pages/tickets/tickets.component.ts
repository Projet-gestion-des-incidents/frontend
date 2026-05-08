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
import { forkJoin, Observable, of } from 'rxjs';
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
  // Ajoutez ces propriétés avec les autres déclarations
showMultiArchiveModal: boolean = false;
showMultiDeleteModal: boolean = false;
confirmArchiveTickets: TicketDTO[] = [];
confirmDeleteTickets: TicketDTO[] = [];
bulkArchiving: boolean = false;
bulkDeletingSelected: boolean = false;
pendingArchiveIds: string[] = [];
pendingDeleteIds: string[] = [];
cachedSelectionStats = { archivable: 0, deletable: 0, other: 0, total: 0 };
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
selectedTickets: Set<string> = new Set<string>();

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
// ========== GESTION DE LA SÉLECTION PAR STATUT ==========

/**
 * Vérifie si un ticket peut être sélectionné
 * - Admin: suit la logique de type (si on a commencé avec des supprimables, on ne peut prendre que des supprimables)
 * - Technicien: ne peut sélectionner que les tickets résolus (archivables)
 */
canSelectTicket(ticket: any): boolean {
  // ✅ 1. Règle ABSOLUE : les tickets "En cours" ne sont JAMAIS sélectionnables (pour tout le monde)
  if (ticket.statutTicketLibelle === 'En cours') {
    return false;
  }
  
  // ✅ 2. Technicien: ne peut sélectionner que les tickets résolus
  if (this.isTechnicien) {
    if (this.selectedTickets.size === 0 && this.currentSelectionType === null) {
      return ticket.statutTicketLibelle === 'Résolu';
    }
    if (this.currentSelectionType === 'archivable') {
      return ticket.statutTicketLibelle === 'Résolu';
    }
    return false;
  }
  
  // ✅ 3. Admin: logique de type
  if (this.isAdmin) {
    if (this.selectedTickets.size === 0 && this.currentSelectionType === null) {
      // Les tickets "En cours" sont déjà exclus, donc OK
      return true;
    }
    
    const isArchivable = ticket.statutTicketLibelle === 'Résolu';
    const isDeletable = ticket.statutTicketLibelle === 'Assigné' || ticket.statutTicketLibelle === 'Non assigné';
    
    if (this.isSelected(ticket.id)) {
      return true;
    }
    
    if (this.currentSelectionType === 'archivable' && !isArchivable) {
      return false;
    }
    
    if (this.currentSelectionType === 'deletable' && !isDeletable) {
      return false;
    }
    
    return true;
  }
  
  return false;
}
currentSelectionType: 'archivable' | 'deletable' | null = null;

/**
 * Met à jour les statistiques de la sélection avec le rôle pris en compte
 */
// Ajoutez cette propriété avec les autres
globalSelectionStats = { archivable: 0, deletable: 0, other: 0, total: 0 };

// Modifiez updateSelectionStats pour qu'elle ne soit utilisée que pour mettre à jour les stats
// et non pour afficher le compteur sur le bouton
updateSelectionStats(): void {
  let archivable = 0;
  let deletable = 0;
  let other = 0;
  
  // ✅ Calculer les stats pour la page courante
  this.selectedTickets.forEach(id => {
    const ticket = this.tickets.find(t => t.id === id);
    if (ticket) {
      if (ticket.statutTicketLibelle === 'Résolu') {
        archivable++;
      } else if (this.isAdmin && ticket.statutTicketLibelle === 'Assigné') {
        deletable++;
      } else {
        other++;
      }
    }
  });
  
  this.cachedSelectionStats = { archivable, deletable, other, total: this.selectedTickets.size };
}

// Ajoutez cette méthode pour calculer les stats globales
calculateGlobalSelectionStats(): void {
  if (this.selectedTickets.size === 0) {
    this.globalSelectionStats = { archivable: 0, deletable: 0, other: 0, total: 0 };
    return;
  }
  
  // ✅ Utiliser la bonne API selon le rôle
  let request$: Observable<any>;
  
  if (this.isAdmin) {
    const params: any = {
      page: 1,
      pageSize: this.totalCount,
      searchTerm: this.searchTerm || null,
      statut: this.selectedStatut ?? null,
      priorite: this.selectedPriorite ?? null,
      dateDebut: this.tempFilters.dateDebut || null
    };
    request$ = this.ticketService.getTicketsPaged(params);
  } else if (this.isTechnicien) {
    const params: any = {
      page: 1,
      pageSize: this.totalCount,
      searchTerm: this.searchTerm || null,
      statut: this.selectedStatut ?? null,
      priorite: this.selectedPriorite ?? null,
      dateDebut: this.tempFilters.dateDebut || null,
      sortBy: "date",
      sortDescending: true
    };
    request$ = this.ticketService.getMesTicketsAssignes(params);
  } else {
    return;
  }
  
  request$.subscribe({
    next: (res: any) => {  // ✅ Ajouter le type 'any'
      let allTickets: any[] = [];
      if (res.data?.items) {
        allTickets = res.data.items;
      } else if (res.items) {
        allTickets = res.items;
      } else if (Array.isArray(res)) {
        allTickets = res;
      } else if (res.data && Array.isArray(res.data)) {
        allTickets = res.data;
      }
      
      let archivable = 0;
      let deletable = 0;
      let other = 0;
      
      this.selectedTickets.forEach((id: string) => {  // ✅ Ajouter le type
        const ticket = allTickets.find((t: any) => t.id === id);
        if (ticket) {
          if (ticket.statutTicketLibelle === 'Résolu') {
            archivable++;
          } else if (this.isAdmin && (ticket.statutTicketLibelle === 'Assigné' || ticket.statutTicketLibelle === 'Non assigné')) {
            deletable++;
          } else {
            other++;
          }
        }
      });
      
      this.globalSelectionStats = { archivable, deletable, other, total: this.selectedTickets.size };
    },
    error: (err: any) => {  // ✅ Ajouter le type 'any'
      console.error('Erreur calcul stats globales:', err);
      this.globalSelectionStats = { ...this.cachedSelectionStats };
    }
  });
}
// Dans tickets.component.ts, modifiez la méthode confirmArchive :
// ========== GESTION DE L'ARCHIVAGE MULTIPLE ==========

/**
 * Ouvre la modale d'archivage multiple
 */
confirmArchiveMultiple(): void {
  if (this.selectedTickets.size === 0) return;
  
  this.loading = true;
  
  // ✅ Utiliser la bonne API selon le rôle
  const params: any = {
    page: 1,
    pageSize: this.totalCount,
    searchTerm: this.searchTerm || null,
    statut: this.selectedStatut ?? null,
    priorite: this.selectedPriorite ?? null,
    dateDebut: this.tempFilters.dateDebut || null
  };
  
  // ✅ Déterminer quelle API utiliser
  let request$;
  if (this.isAdmin) {
    request$ = this.ticketService.getTicketsPaged(params);
  } else if (this.isTechnicien) {
    const technicienParams = {
      ...params,
      sortBy: "date",
      sortDescending: true
    };
    request$ = this.ticketService.getMesTicketsAssignes(technicienParams);
  } else {
    this.loading = false;
    return;
  }
  
  request$.subscribe({
    next: (res: any) => {
      let allTickets: any[] = [];
      if (res.data?.items) {
        allTickets = res.data.items;
      } else if (res.items) {
        allTickets = res.items;
      } else if (Array.isArray(res)) {
        allTickets = res;
      } else if (res.data && Array.isArray(res.data)) {
        allTickets = res.data;
      }
      
      // ✅ Filtrer pour ne garder que les tickets résolus sélectionnés
      this.confirmArchiveTickets = allTickets.filter((t: TicketDTO) => 
        this.selectedTickets.has(t.id) && 
        t.statutTicketLibelle === 'Résolu'
      );
      
      this.pendingArchiveIds = this.confirmArchiveTickets.map((t: TicketDTO) => t.id);
      this.showMultiArchiveModal = true;
      this.loading = false;
    },
    error: (err: any) => {
      console.error('Erreur chargement tickets pour archivage:', err);
      this.loading = false;
      // Fallback: utiliser les tickets de la page courante
      this.confirmArchiveTickets = this.tickets.filter((t: any) => 
        this.selectedTickets.has(t.id) && 
        t.statutTicketLibelle === 'Résolu'
      );
      this.pendingArchiveIds = this.confirmArchiveTickets.map((t: any) => t.id);
      this.showMultiArchiveModal = true;
    }
  });
}

/**
 * Exécute l'archivage multiple
 */
executeMultiArchive(): void {
  if (this.pendingArchiveIds.length === 0) return;
  
  this.bulkArchiving = true;
  let completed = 0;
  const total = this.pendingArchiveIds.length;
  let successCount = 0;
  
  this.pendingArchiveIds.forEach(id => {
    this.ticketService.archiverTicket(id).subscribe({
      next: (response) => {
        if (response.isSuccess) {
          const index = this.tickets.findIndex(t => t.id === id);
          if (index !== -1) this.tickets.splice(index, 1);
          
          this.selectedTickets.delete(id);  // utiliser delete
          successCount++;
        }
        completed++;
        
        if (completed === total) {
          this.bulkArchiving = false;
          this.showMultiArchiveModal = false;
          this.pendingArchiveIds = [];
          this.confirmArchiveTickets = [];
          
          this.totalCount = this.tickets.length;
          this.totalPages = Math.ceil(this.totalCount / this.pageSize);
          
          this.updateSelectionStats();
          
          if (successCount === total) {
            this.showAlert('success', 'Succès', `${total} ticket(s) archivé(s) avec succès.`);
          } else if (successCount > 0) {
            this.showAlert('warning', 'Archivage partiel', `${successCount} ticket(s) archivé(s), ${total - successCount} échec(s).`);
          }
          this.loadTickets();
        }
      },
      error: (err) => {
        console.error(`Erreur archivage ${id}:`, err);
        completed++;
        if (completed === total) {
          this.bulkArchiving = false;
          this.showMultiArchiveModal = false;
          this.pendingArchiveIds = [];
          this.confirmArchiveTickets = [];
          this.updateSelectionStats();
          this.showAlert('error', 'Erreur', `${successCount}/${total} ticket(s) archivé(s).`);
          this.loadTickets();
        }
      }
    });
  });
}
/**
 * Annule l'archivage multiple
 */
cancelMultiArchive(): void {
  this.showMultiArchiveModal = false;
  this.confirmArchiveTickets = [];
  this.pendingArchiveIds = [];
  this.bulkArchiving = false;
}

// ========== GESTION DE LA SUPPRESSION MULTIPLE ==========

/**
 * Ouvre la modale de suppression multiple (Admin uniquement)
 */
confirmDeleteMultiple(): void {
  if (this.selectedTickets.size === 0) return;
  
  this.loading = true;
  
  const params: any = {
    page: 1,
    pageSize: this.totalCount,
    searchTerm: this.searchTerm || null,
    statut: this.selectedStatut ?? null,
    priorite: this.selectedPriorite ?? null,
    dateDebut: this.tempFilters.dateDebut || null
  };
  
  this.ticketService.getTicketsPaged(params).subscribe({
    next: (res) => {
      const allTickets = res.data.items;
      // ✅ Ne garder que les tickets avec statut "Assigné"
      this.confirmDeleteTickets = allTickets.filter((t: TicketDTO) => 
        this.selectedTickets.has(t.id) && 
        t.statutTicketLibelle === 'Assigné'
      );
      
      this.pendingDeleteIds = this.confirmDeleteTickets.map((t: TicketDTO) => t.id);
      this.showMultiDeleteModal = true;
      this.loading = false;
    },
    error: (err) => {
      console.error('Erreur chargement tickets pour suppression:', err);
      this.loading = false;
      this.confirmDeleteTickets = this.tickets.filter((t: any) => 
        this.selectedTickets.has(t.id) && 
        t.statutTicketLibelle === 'Assigné'
      );
      this.pendingDeleteIds = this.confirmDeleteTickets.map((t: any) => t.id);
      this.showMultiDeleteModal = true;
    }
  });
}
/**
 * Exécute la suppression multiple (Admin uniquement)
 */
executeMultiDelete(): void {
  if (this.pendingDeleteIds.length === 0) return;
  
  this.bulkDeletingSelected = true;
  let completed = 0;
  const total = this.pendingDeleteIds.length;
  let successCount = 0;
  
  this.pendingDeleteIds.forEach(id => {
    this.ticketService.deleteTicket(id).subscribe({
      next: (response) => {
        if (response.isSuccess) {
          const index = this.tickets.findIndex(t => t.id === id);
          if (index !== -1) this.tickets.splice(index, 1);
          
          // ✅ Utiliser delete sur Set
          this.selectedTickets.delete(id);
          successCount++;
        }
        completed++;
        
        if (completed === total) {
          this.bulkDeletingSelected = false;
          this.showMultiDeleteModal = false;
          this.pendingDeleteIds = [];
          this.confirmDeleteTickets = [];
          
          this.totalCount = this.tickets.length;
          this.totalPages = Math.ceil(this.totalCount / this.pageSize);
          
          this.updateSelectionStats();
          
          if (this.selectedTickets.size === 0) {
            this.currentSelectionType = null;
          }
          
          if (successCount === total) {
            this.showAlert('success', 'Succès', `${total} ticket(s) supprimé(s) avec succès.`);
          } else if (successCount > 0) {
            this.showAlert('warning', 'Suppression partielle', `${successCount} ticket(s) supprimé(s), ${total - successCount} échec(s).`);
          } else {
            this.showAlert('error', 'Échec', `Aucun ticket n'a pu être supprimé.`);
          }
          this.loadTickets();
        }
      },
      error: (err) => {
        console.error(`Erreur suppression ${id}:`, err);
        completed++;
        if (completed === total) {
          this.bulkDeletingSelected = false;
          this.showMultiDeleteModal = false;
          this.pendingDeleteIds = [];
          this.confirmDeleteTickets = [];
          this.updateSelectionStats();
          this.showAlert('error', 'Erreur', `${successCount}/${total} ticket(s) supprimé(s).`);
          this.loadTickets();
        }
      }
    });
  });
}

/**
 * Annule la suppression multiple
 */
cancelMultiDelete(): void {
  this.showMultiDeleteModal = false;
  this.confirmDeleteTickets = [];
  this.pendingDeleteIds = [];
  this.bulkDeletingSelected = false;
}

/**
 * Action principale selon le rôle et la sélection
 */
onBulkAction(): void {
  this.updateSelectionStats();
  
  if (this.cachedSelectionStats.archivable > 0 && this.cachedSelectionStats.deletable === 0) {
    // Uniquement des tickets résolus → Archiver
    this.confirmArchiveMultiple();
  } else if (this.isAdmin && this.cachedSelectionStats.deletable > 0 && this.cachedSelectionStats.archivable === 0) {
    // Admin et uniquement des tickets non résolus → Supprimer
    this.confirmDeleteMultiple();
  } else if (this.isAdmin && this.cachedSelectionStats.deletable > 0 && this.cachedSelectionStats.archivable > 0) {
    // Mixte → message d'erreur
    this.showAlert('warning', 'Action impossible', 
      `Vous ne pouvez pas mélanger des tickets à supprimer (${this.cachedSelectionStats.deletable}) et à archiver (${this.cachedSelectionStats.archivable}) dans la même sélection.`);
  } else if (!this.isAdmin && this.cachedSelectionStats.archivable === 0) {
    this.showAlert('warning', 'Action impossible', 'Seuls les tickets résolus peuvent être archivés.');
  }
}


confirmArchive(): void {
  if (!this.ticketToArchive) return;
  
  this.archiving = true;
  
  this.ticketService.archiverTicket(this.ticketToArchive.id).subscribe({
    next: (response) => {
      if (response.isSuccess) {
        this.showAlert('success', 'Succès', `Le ticket "${this.ticketToArchive!.referenceTicket}" a été archivé avec succès.`);
        
        this.loadTickets();
        
        this.successMessage = `Ticket "${this.ticketToArchive!.referenceTicket}" archivé avec succès.`;
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
        
        // ✅ Utiliser delete sur Set
        this.selectedTickets.delete(this.ticketToArchive!.id);
      } else {
        const errorMessage = response.message || 'Impossible d\'archiver le ticket.';
        this.showAlert('error', 'Erreur', errorMessage);
      }
      this.cancelArchive();
    },
    error: (err) => {
      console.error('❌ Erreur complète:', err);
      let errorMessage = 'Erreur lors de l\'archivage';
      
      if (err.error?.message) {
        errorMessage = err.error.message;
      } else if (err.error?.errors) {
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

  // Sauvegarder les IDs sélectionnés avant chargement
  const previousSelectedIds = Array.from(this.selectedTickets);
  const previousSelectionType = this.currentSelectionType;

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

    this.ticketService.getTicketsPaged(request).subscribe({
      next: (res) => {
        const paged = res.data;
        this.tickets = paged.items;
        this.filteredTickets = paged.items;
        this.totalCount = paged.totalCount;
        this.totalPages = paged.totalPages;
        this.currentPage = paged.page;
        
        // ✅ RESTAURER TOUTES les sélections (ne pas filtrer par la page courante)
        // On garde toutes les sélections, même celles qui ne sont pas dans la page courante
        // Car elles seront utilisées pour l'action globale
        this.selectedTickets.clear();
        previousSelectedIds.forEach(id => this.selectedTickets.add(id));
        this.currentSelectionType = previousSelectionType;
        
        // Mettre à jour les stats
        this.updateSelectionStats();
          this.calculateGlobalSelectionStats(); // ✅ Ajouter cette ligne

        console.log(`✅ ${this.tickets.length} tickets chargés pour l'admin`);
        console.log(`📌 ${this.selectedTickets.size} tickets sélectionnés au total`);
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

  this.ticketService.getMesTicketsAssignes(request).subscribe({
    next: (res) => {
      if (res.isSuccess && res.data) {
        const paged = res.data;
        this.tickets = paged.items || [];
        this.filteredTickets = this.tickets;
        this.totalCount = paged.totalCount || 0;
        this.totalPages = Math.ceil(this.totalCount / this.pageSize);
        this.currentPage = paged.page || 1;
      } else {
        this.tickets = [];
        this.totalCount = 0;
        this.totalPages = 1;
      }
      
      // ✅ RESTAURER TOUTES les sélections
      this.selectedTickets.clear();
      previousSelectedIds.forEach(id => {
        // Vérifier si le ticket existe encore (non archivé/supprimé)
        const exists = this.tickets.some(t => t.id === id) || 
                       (this.totalCount > 0 && true); // Si le ticket n'est pas dans la page courante, on le garde quand même
        // Pour le technicien, on garde toutes les sélections car l'action est globale
        this.selectedTickets.add(id);
      });
      this.currentSelectionType = previousSelectionType;
      
      this.updateSelectionStats();
      this.calculateGlobalSelectionStats();
      
      console.log(`✅ ${this.tickets.length} tickets assignés chargés pour le technicien`);
      console.log(`📌 ${this.selectedTickets.size} tickets sélectionnés au total`);
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

toggleSelection(ticketId: string, checked: boolean, ticket?: any): void {
  console.log('🖱️ toggleSelection appelé:', { ticketId, checked, selectedBefore: this.selectedTickets.size });
  
  const ticketObj = ticket || this.tickets.find(t => t.id === ticketId);
  if (!ticketObj) return;
  
  // ✅ Pour le technicien, ne permettre que la sélection de tickets résolus
  if (this.isTechnicien && ticketObj.statutTicketLibelle !== 'Résolu') {
    this.showAlert('warning', 'Sélection impossible', 'En tant que technicien, vous ne pouvez sélectionner que des tickets résolus pour les archiver.');
    return;
  }
  
  if (checked && !this.canSelectTicket(ticketObj)) {
    const message = this.currentSelectionType === 'archivable' 
      ? 'Vous avez déjà sélectionné des tickets résolus. Vous ne pouvez sélectionner que des tickets résolus.'
      : 'Vous avez déjà sélectionné des tickets supprimables (Assignés). Vous ne pouvez sélectionner que des tickets Assignés.';
    this.showAlert('warning', 'Sélection impossible', message);
    return;
  }
  
  if (checked) {
    if (this.selectedTickets.size === 0 && this.currentSelectionType === null) {
      const isArchivable = ticketObj.statutTicketLibelle === 'Résolu';
      this.currentSelectionType = isArchivable ? 'archivable' : 'deletable';
      console.log('🎯 Type de sélection défini:', this.currentSelectionType);
    }
    this.selectedTickets.add(ticketId);
    console.log('✅ Ticket ajouté:', ticketId, 'Total:', this.selectedTickets.size);
  } else {
    this.selectedTickets.delete(ticketId);
    console.log('❌ Ticket retiré:', ticketId, 'Total:', this.selectedTickets.size);
    
    if (this.selectedTickets.size === 0) {
      this.currentSelectionType = null;
      console.log('🔄 Type de sélection réinitialisé');
    }
  }
  
  this.updateSelectionStats();
  this.calculateGlobalSelectionStats();
}

clearSelection(): void {
  this.selectedTickets.clear();
  this.currentSelectionType = null;
  this.cachedSelectionStats = { archivable: 0, deletable: 0, other: 0, total: 0 };
  this.globalSelectionStats = { archivable: 0, deletable: 0, other: 0, total: 0 };
  this.updateSelectionStats();
}

toggleAllSelection(checked: boolean): void {
  if (checked) {
    if (this.isTechnicien) {
      const resolvables = this.tickets.filter(t => t.statutTicketLibelle === 'Résolu');
      if (resolvables.length === 0) {
        this.showAlert('warning', 'Aucun ticket disponible', 'Aucun ticket résolu à sélectionner.');
        return;
      }
      this.currentSelectionType = 'archivable';
      resolvables.forEach(t => this.selectedTickets.add(t.id));
    } else if (this.isAdmin) {
      const hasArchivable = this.tickets.some(t => t.statutTicketLibelle === 'Résolu');
      const hasDeletable = this.tickets.some(t => t.statutTicketLibelle !== 'Résolu');
      
      if (hasArchivable && hasDeletable) {
        this.showAlert('warning', 'Sélection impossible', 
          'Cette page contient des tickets de types différents (résolus et non résolus). Veuillez filtrer pour sélectionner tous les tickets.');
        return;
      }
      
      this.currentSelectionType = hasArchivable ? 'archivable' : 'deletable';
      this.tickets.forEach(t => this.selectedTickets.add(t.id));
    }
  } else {
    this.selectedTickets.clear();
    this.currentSelectionType = null;
  }
  
  this.updateSelectionStats();
  // ✅ Recalculer les stats globales
  this.calculateGlobalSelectionStats();
}
isSelected(ticketId: string): boolean {
  return this.selectedTickets.has(ticketId);
}

isAllSelected(): boolean {
  return this.tickets.length > 0 && this.selectedTickets.size === this.tickets.length;
}

isIndeterminate(): boolean {
  return this.selectedTickets.size > 0 && this.selectedTickets.size < this.tickets.length;
}
  // ========== GESTION DE LA SUPPRESSION ==========

  deleteTicket(ticket: TicketDTO) {
    this.confirmTicket = ticket;
    this.ticketsToDelete = null;
  }

deleteSelectedTickets(): void {
  if (this.selectedTickets.size === 0) return;
  
  // Vérifier si tous les tickets sélectionnés sont archivables ou supprimables
  this.updateSelectionStats();
  
  if (this.cachedSelectionStats.deletable > 0 && this.cachedSelectionStats.archivable === 0) {
    // Uniquement des tickets supprimables
    this.confirmDeleteMultiple();
  } else if (this.cachedSelectionStats.archivable > 0 && this.cachedSelectionStats.deletable === 0) {
    // Uniquement des tickets archivables
    this.confirmArchiveMultiple();
  } else if (this.cachedSelectionStats.deletable > 0 && this.cachedSelectionStats.archivable > 0) {
    this.showAlert('warning', 'Action impossible', 
      `Vous ne pouvez pas mélanger des tickets à supprimer (${this.cachedSelectionStats.deletable}) et à archiver (${this.cachedSelectionStats.archivable}) dans la même sélection.`);
  } else {
    this.showAlert('info', 'Aucune action', 'Aucun ticket sélectionné ne peut être supprimé ou archivé.');
  }
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
          
this.selectedTickets.clear();
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
            
this.selectedTickets.delete(this.confirmTicket!.id);
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