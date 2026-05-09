import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { IncidentService } from '../../shared/services/incident.service';
import { TicketService } from '../../shared/services/ticket.service';
import { BadgeColor, BadgeComponent } from '../../shared/components/ui/badge/badge.component';
import { AuthService } from '../../shared/services/auth.service';
import { Incident } from '../../shared/models/incident.model';
import { TicketDTO } from '../../shared/models/Ticket.models';
import { UserService } from '../../shared/services/user.service';
import { CheckboxComponent } from '../../shared/components/form/input/checkbox.component';

@Component({
  selector: 'app-archives',
  standalone: true,
  imports: [CommonModule,CheckboxComponent, FormsModule, RouterModule, BadgeComponent],
  templateUrl: './archives.component.html',
  styleUrls: ['./archives.component.css']
})
export class ArchivesComponent implements OnInit {
  // Onglet actif
  activeTab: 'incidents' | 'tickets' = 'incidents';
  
  // Incidents archivés
  archivedIncidents: Incident[] = [];
  loadingIncidents = false;
  incidentsTotalCount = 0;
  incidentsCurrentPage = 1;
  incidentsPageSize = 5;
  incidentsTotalPages = 1;
  incidentsSearchTerm = '';
  
  // ✅ Pour la sélection multiple des tickets archivés
  selectedTickets: Set<string> = new Set<string>();
  showMultiRestoreTicketModal = false;
  confirmRestoreTickets: TicketDTO[] = [];
  bulkRestoring = false;
  pendingRestoreIds: string[] = [];

  // ✅ Pour la sélection multiple des incidents archivés (optionnel)
  selectedIncidents: Set<string> = new Set<string>();
  showMultiRestoreIncidentModal = false;
  confirmRestoreIncidents: Incident[] = [];
  bulkRestoringIncidents = false;
  pendingRestoreIncidentIds: string[] = [];
  // Tickets archivés
  archivedTickets: TicketDTO[] = [];
  loadingTickets = false;
  ticketsTotalCount = 0;
  ticketsCurrentPage = 1;
  ticketsPageSize = 5;
  ticketsTotalPages = 1;
  ticketsSearchTerm = '';
  
  // État de restauration
  restoringIncidentId: string | null = null;
  restoringTicketId: string | null = null;
  
  // ✅ Modales de confirmation
  showRestoreIncidentModal = false;
  incidentToRestore: Incident | null = null;
  
  showRestoreTicketModal = false;
  ticketToRestore: TicketDTO | null = null;
  
  // Alertes
  alert = {
    show: false,
    variant: 'success' as 'success' | 'error' | 'warning' | 'info',
    title: '',
    message: ''
  };
  
  userRole: string = '';
  
  constructor(
    private incidentService: IncidentService,
    private ticketService: TicketService,
    private authService: AuthService,
    private userService: UserService,
    private router: Router
  ) {}
  
  ngOnInit(): void {
    this.loadUserRole();
  }
  
loadUserRole(): void {
  this.userService.getMyProfile().subscribe({
    next: (user) => {
      this.userRole = user.role;
      
      // ✅ Définir l'onglet par défaut selon le rôle
      if (this.userRole === 'Technicien') {
        this.activeTab = 'tickets';
      } else if (this.userRole === 'Commercant') {
        this.activeTab = 'incidents';
      } else {
        this.activeTab = 'incidents'; // Admin par défaut sur incidents
      }
      
      this.loadArchives();
    },
    error: (err) => {
      console.error('Erreur récupération rôle:', err);
      this.userRole = '';
      this.loadArchives();
    }
  });
}
  
  loadArchives(): void {
  // ✅ Pour Admin : charger les deux
  if (this.userRole === 'Admin') {
    this.loadArchivedIncidents();
    this.loadArchivedTickets();
  }
  // ✅ Pour Commercant : charger uniquement les incidents
  else if (this.userRole === 'Commercant') {
    this.loadArchivedIncidents();
  }
  // ✅ Pour Technicien : charger uniquement les tickets
  else if (this.userRole === 'Technicien') {
    this.loadArchivedTickets();
  }
}
  
  loadArchivedIncidents(): void {
    this.loadingIncidents = true;
    
    const params = {
      Page: this.incidentsCurrentPage,
      PageSize: this.incidentsPageSize,
      SearchTerm: this.incidentsSearchTerm,
      SortBy: 'DateArchivage',
      SortDescending: true
    };
    
    this.incidentService.getIncidentsArchives(params).subscribe({
      next: (response: any) => {
        let incidentsList: Incident[] = [];
        let total = 0;
        
        if (response?.items && Array.isArray(response.items)) {
          incidentsList = response.items;
          total = response.totalCount || incidentsList.length;
        } else if (response?.data?.items && Array.isArray(response.data.items)) {
          incidentsList = response.data.items;
          total = response.data.totalCount || incidentsList.length;
        } else if (Array.isArray(response)) {
          incidentsList = response;
          total = incidentsList.length;
        }
        
        this.archivedIncidents = incidentsList;
        this.incidentsTotalCount = total;
        this.incidentsTotalPages = Math.ceil(total / this.incidentsPageSize);
        this.loadingIncidents = false;
      },
      error: (err) => {
        console.error('❌ Erreur chargement incidents archivés:', err);
        this.showAlert('error', 'Erreur', 'Impossible de charger les incidents archivés');
        this.loadingIncidents = false;
      }
    });
  }
  
  loadArchivedTickets(): void {
    this.loadingTickets = true;
    
    const params = {
      Page: this.ticketsCurrentPage,
      PageSize: this.ticketsPageSize,
      SearchTerm: this.ticketsSearchTerm,
      SortBy: 'DateArchivage',
      SortDescending: true
    };
    
    this.ticketService.getArchivedTickets(params).subscribe({
      next: (response: any) => {
        let ticketsList: TicketDTO[] = [];
        let total = 0;
        
        if (response?.items && Array.isArray(response.items)) {
          ticketsList = response.items;
          total = response.totalCount || ticketsList.length;
        } else if (response?.data?.items && Array.isArray(response.data.items)) {
          ticketsList = response.data.items;
          total = response.data.totalCount || ticketsList.length;
        } else if (Array.isArray(response)) {
          ticketsList = response;
          total = ticketsList.length;
        }
        
        this.archivedTickets = ticketsList;
        this.ticketsTotalCount = total;
        this.ticketsTotalPages = Math.ceil(total / this.ticketsPageSize);
        this.loadingTickets = false;
      },
      error: (err) => {
        console.error('❌ Erreur chargement tickets archivés:', err);
        this.showAlert('error', 'Erreur', 'Impossible de charger les tickets archivés');
        this.loadingTickets = false;
      }
    });
  }
 // ========== GESTION DE LA SÉLECTION MULTIPLE POUR TICKETS ==========

toggleTicketSelection(ticketId: string, checked: boolean): void {
  // Si on modifie une sélection individuelle, on désactive le mode global
  if (this.globalTicketSelectionMode) {
    this.globalTicketSelectionMode = false;
    // Conserver les sélections de la page courante
    this.selectedTickets.clear();
    this.archivedTickets.forEach(ticket => {
      this.selectedTickets.add(ticket.id);
    });
  }
  
  if (checked) {
    this.selectedTickets.add(ticketId);
  } else {
    this.selectedTickets.delete(ticketId);
  }
}

toggleAllTicketSelection(checked: boolean): void {
  if (checked) {
    // Activer le mode global (tous les tickets de toutes les pages)
    this.globalTicketSelectionMode = true;
    this.selectedTickets.clear();
    // Optionnel: afficher un message
  } else {
    this.globalTicketSelectionMode = false;
    this.selectedTickets.clear();
  }
}

isTicketSelected(ticketId: string): boolean {
  if (this.globalTicketSelectionMode) return true;
  return this.selectedTickets.has(ticketId);
}

isAllTicketsSelected(): boolean {
  return this.globalTicketSelectionMode || 
         (this.archivedTickets.length > 0 && 
          this.selectedTickets.size === this.archivedTickets.length);
}

isTicketIndeterminate(): boolean {
  if (this.globalTicketSelectionMode) return false;
  return this.selectedTickets.size > 0 && 
         this.selectedTickets.size < this.archivedTickets.length;
}

// Ouvrir la modale de restauration multiple pour tickets
openMultiRestoreTicketModal(): void {
  if (this.globalTicketSelectionMode) {
    // Mode global: restaurer tous les tickets de toutes les pages
   this.showMultiRestoreTicketModal = true;
    this.confirmRestoreTickets = []; // Vide car on va restaurer tous
    return;
  }
  
  if (this.selectedTickets.size === 0) return;
  
  const selectedIds = Array.from(this.selectedTickets);
  this.confirmRestoreTickets = this.archivedTickets.filter(ticket => 
    selectedIds.includes(ticket.id)
  );
  this.showMultiRestoreTicketModal = true;
}

// Restaurer tous les tickets (toutes pages)
restoreAllTickets(): void {
  this.bulkRestoring = true;
  
  // Récupérer tous les tickets via l'API
  const params = {
    Page: 1,
    PageSize: this.ticketsTotalCount,
    SearchTerm: this.ticketsSearchTerm,
    SortBy: 'DateArchivage',
    SortDescending: true
  };
  
  this.ticketService.getArchivedTickets(params).subscribe({
    next: (response: any) => {
      let allTickets: TicketDTO[] = [];
      if (response?.data?.items) {
        allTickets = response.data.items;
      } else if (response?.items) {
        allTickets = response.items;
      }
      
      this.restoreTicketsInBatches(allTickets, 0);
    },
    error: (err) => {
      console.error('Erreur chargement tous les tickets:', err);
      this.bulkRestoring = false;
      this.showAlert('error', 'Erreur', 'Impossible de charger tous les tickets');
    }
  });
}

// Restaurer les tickets par lots
restoreTicketsInBatches(tickets: TicketDTO[], startIndex: number): void {
  const batchSize = 10;
  const batch = tickets.slice(startIndex, startIndex + batchSize);
  
  if (batch.length === 0) {
    this.bulkRestoring = false;
    this.globalTicketSelectionMode = false;
    this.selectedTickets.clear();
    this.showAlert('success', 'Succès', `Tous les tickets ont été restaurés avec succès.`);
    this.loadArchivedTickets();
    return;
  }
  
  let completed = 0;
  let successCount = 0;
  
  batch.forEach(ticket => {
    this.ticketService.restaurerTicket(ticket.id).subscribe({
      next: (response) => {
        if (response.isSuccess) successCount++;
        completed++;
        if (completed === batch.length) {
          this.restoreTicketsInBatches(tickets, startIndex + batchSize);
        }
      },
      error: (err) => {
        console.error(`Erreur restauration ${ticket.id}:`, err);
        completed++;
        if (completed === batch.length) {
          this.restoreTicketsInBatches(tickets, startIndex + batchSize);
        }
      }
    });
  });
}

// Désélectionner tous les tickets
clearTicketSelection(): void {
  this.selectedTickets.clear();
  this.globalTicketSelectionMode = false;
}

// ========== GESTION DE LA SÉLECTION MULTIPLE POUR INCIDENTS ==========


toggleIncidentSelection(incidentId: string, checked: boolean): void {
  // Si on modifie une sélection individuelle, on désactive le mode global
  if (this.globalIncidentSelectionMode) {
    this.globalIncidentSelectionMode = false;
    // Conserver les sélections de la page courante
    this.selectedIncidents.clear();
    this.archivedIncidents.forEach(incident => {
      this.selectedIncidents.add(incident.id);
    });
  }
  
  if (checked) {
    this.selectedIncidents.add(incidentId);
  } else {
    this.selectedIncidents.delete(incidentId);
  }
}

toggleAllIncidentsSelection(checked: boolean): void {
  if (checked) {
    // Activer le mode global (tous les incidents de toutes les pages)
    this.globalIncidentSelectionMode = true;
    this.selectedIncidents.clear();
  } else {
    this.globalIncidentSelectionMode = false;
    this.selectedIncidents.clear();
  }
}
isIncidentSelected(incidentId: string): boolean {
  if (this.globalIncidentSelectionMode) return true;
  return this.selectedIncidents.has(incidentId);
}

isAllIncidentsSelected(): boolean {
  return this.globalIncidentSelectionMode || 
         (this.archivedIncidents.length > 0 && 
          this.selectedIncidents.size === this.archivedIncidents.length);
}

isIncidentIndeterminate(): boolean {
  if (this.globalIncidentSelectionMode) return false;
  return this.selectedIncidents.size > 0 && 
         this.selectedIncidents.size < this.archivedIncidents.length;
}

openMultiRestoreIncidentModal(): void {
  if (this.globalIncidentSelectionMode) {
    // ✅ OUVERTURE DE LA MODALE au lieu de confirm()
    this.showMultiRestoreIncidentModal = true;
    this.confirmRestoreIncidents = []; // Vide car on va restaurer tous
    return;
  }
  
  if (this.selectedIncidents.size === 0) return;
  
  const selectedIds = Array.from(this.selectedIncidents);
  this.confirmRestoreIncidents = this.archivedIncidents.filter(incident => 
    selectedIds.includes(incident.id)
  );
  this.showMultiRestoreIncidentModal = true;
}

restoreAllIncidents(): void {
  this.bulkRestoringIncidents = true;
  
  const params = {
    Page: 1,
    PageSize: this.incidentsTotalCount,
    SearchTerm: this.incidentsSearchTerm,
    SortBy: 'DateArchivage',
    SortDescending: true
  };
  
  this.incidentService.getIncidentsArchives(params).subscribe({
    next: (response: any) => {
      let allIncidents: Incident[] = [];
      if (response?.data?.items) {
        allIncidents = response.data.items;
      } else if (response?.items) {
        allIncidents = response.items;
      }
      
      this.restoreIncidentsInBatches(allIncidents, 0);
    },
    error: (err) => {
      console.error('Erreur chargement tous les incidents:', err);
      this.bulkRestoringIncidents = false;
      this.showAlert('error', 'Erreur', 'Impossible de charger tous les incidents');
    }
  });
}

restoreIncidentsInBatches(incidents: Incident[], startIndex: number): void {
  const batchSize = 10;
  const batch = incidents.slice(startIndex, startIndex + batchSize);
  
  if (batch.length === 0) {
    this.bulkRestoringIncidents = false;
    this.globalIncidentSelectionMode = false;
    this.selectedIncidents.clear();
    this.showAlert('success', 'Succès', `Tous les incidents ont été restaurés avec succès.`);
    this.loadArchivedIncidents();
    return;
  }
  
  let completed = 0;
  let successCount = 0;
  
  batch.forEach(incident => {
    this.incidentService.restaurerIncident(incident.id).subscribe({
      next: (response) => {
        if (response.isSuccess) successCount++;
        completed++;
        if (completed === batch.length) {
          this.restoreIncidentsInBatches(incidents, startIndex + batchSize);
        }
      },
      error: (err) => {
        console.error(`Erreur restauration ${incident.id}:`, err);
        completed++;
        if (completed === batch.length) {
          this.restoreIncidentsInBatches(incidents, startIndex + batchSize);
        }
      }
    });
  });
}
  // ✅ Pour la sélection globale des tickets archivés
  globalTicketSelectionMode: boolean = false;
  
  // ✅ Pour la sélection globale des incidents archivés
  globalIncidentSelectionMode: boolean = false;
clearIncidentSelection(): void {
  this.selectedIncidents.clear();
  this.globalIncidentSelectionMode = false;
}
  onSearchIncidents(): void {
    this.incidentsCurrentPage = 1;
    this.loadArchivedIncidents();
  }
  
  onSearchTickets(): void {
    this.ticketsCurrentPage = 1;
    this.loadArchivedTickets();
  }
  
  onIncidentsPageChange(page: number): void {
    if (page >= 1 && page <= this.incidentsTotalPages) {
      this.incidentsCurrentPage = page;
      this.loadArchivedIncidents();
    }
  }
  
  onTicketsPageChange(page: number): void {
    if (page >= 1 && page <= this.ticketsTotalPages) {
      this.ticketsCurrentPage = page;
      this.loadArchivedTickets();
    }
  }
  
  // ✅ Méthodes pour ouvrir les modales de restauration
  openRestoreIncidentModal(incident: Incident): void {
    this.incidentToRestore = incident;
    this.showRestoreIncidentModal = true;
  }
  
  openRestoreTicketModal(ticket: TicketDTO): void {
    this.ticketToRestore = ticket;
    this.showRestoreTicketModal = true;
  }
  
  // ✅ Fermer les modales
  cancelRestoreIncident(): void {
    this.showRestoreIncidentModal = false;
    this.incidentToRestore = null;
  }
  
  cancelRestoreTicket(): void {
    this.showRestoreTicketModal = false;
    this.ticketToRestore = null;
  }
  
  // ✅ Confirmer la restauration d'un incident
  confirmRestoreIncident(): void {
    if (!this.incidentToRestore) return;
    
    this.restoringIncidentId = this.incidentToRestore.id;
    
    this.incidentService.restaurerIncident(this.incidentToRestore.id).subscribe({
      next: (response) => {
        if (response.isSuccess) {
          this.showAlert('success', 'Succès', `L'incident "${this.incidentToRestore!.codeIncident}" a été restauré.`);
          this.loadArchivedIncidents();
        } else {
          this.showAlert('error', 'Erreur', response.message || 'Impossible de restaurer l\'incident.');
        }
        this.restoringIncidentId = null;
        this.cancelRestoreIncident();
      },
      error: (err) => {
        console.error('❌ Erreur restauration:', err);
        this.showAlert('error', 'Erreur', err.error?.message || 'Erreur lors de la restauration');
        this.restoringIncidentId = null;
        this.cancelRestoreIncident();
      }
    });
  }
  
  // ✅ Confirmer la restauration d'un ticket
  confirmRestoreTicket(): void {
    if (!this.ticketToRestore) return;
    
    this.restoringTicketId = this.ticketToRestore.id;
    
    this.ticketService.restaurerTicket(this.ticketToRestore.id).subscribe({
      next: (response) => {
        if (response.isSuccess) {
          this.showAlert('success', 'Succès', `Le ticket "${this.ticketToRestore!.referenceTicket}" a été restauré.`);
          this.loadArchivedTickets();
        } else {
          this.showAlert('error', 'Erreur', response.message || 'Impossible de restaurer le ticket.');
        }
        this.restoringTicketId = null;
        this.cancelRestoreTicket();
      },
      error: (err) => {
        console.error('❌ Erreur restauration:', err);
        this.showAlert('error', 'Erreur', err.error?.message || 'Erreur lors de la restauration');
        this.restoringTicketId = null;
        this.cancelRestoreTicket();
      }
    });
  }
  
  viewIncident(id: string): void {
    this.router.navigate(['/incidents', id]);
  }
  
  viewTicket(id: string): void {
    this.router.navigate(['/tickets', id]);
  }
  
  switchTab(tab: 'incidents' | 'tickets'): void {
    this.activeTab = tab;
    this.loadArchives();
  }
  
  getPageNumbers(totalPages: number, currentPage: number): number[] {
    if (totalPages <= 0) return [1];
    
    const maxVisible = 5;
    const pages: number[] = [];
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push(-1);
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push(-1);
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push(-1);
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push(-1);
        pages.push(totalPages);
      }
    }
    
    return pages;
  }
  
  getStatutBadgeColor(statut: any): BadgeColor {
    if (!statut) return 'light';
    
    const statutStr = String(statut).toLowerCase();
    if (statutStr === 'ferme' || statutStr === 'resolu') return 'success';
    if (statutStr === 'encours' || statutStr === 'en cours') return 'warning';
    if (statutStr === 'assigne' || statutStr === 'assigné') return 'info';
    return 'light';
  }
  
  getStatutLibelle(statut: any): string {
    if (!statut) return 'Non défini';
    
    const statutStr = String(statut);
    const map: { [key: string]: string } = {
      'Ferme': 'Fermé',
      'Resolu': 'Résolu',
      'EnCours': 'En cours',
      'Assigne': 'Assigné'
    };
    
    return map[statutStr] || statutStr;
  }
  
  getSeveriteBadgeColor(severite: any): BadgeColor {
    const sevStr = String(severite).toLowerCase();
    if (sevStr === 'faible') return 'success';
    if (sevStr === 'moyenne') return 'warning';
    if (sevStr === 'forte') return 'error';
    return 'light';
  }
  
  getSeveriteLibelle(severite: any): string {
    if (!severite) return 'Non définie';
    const sevStr = String(severite);
    const map: { [key: string]: string } = {
      'Faible': 'Faible',
      'Moyenne': 'Moyenne',
      'Forte': 'Forte',
      'NonDefinie': 'Non définie'
    };
    return map[sevStr] || sevStr;
  }
  
formatDate(date: Date | string | null | undefined): string {
  if (!date) return 'N/A';
  const d = new Date(date);
  // Vérifier si la date est valide
  if (isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
  private showAlert(variant: 'success' | 'error' | 'warning' | 'info', title: string, message: string): void {
    this.alert = { show: true, variant, title, message };
    setTimeout(() => (this.alert.show = false), 5000);
  }
  
  clearAlert(): void {
    this.alert.show = false;
  }
  // ========== MÉTHODES POUR LA RESTAURATION MULTIPLE TICKETS ==========

cancelMultiRestoreTicket(): void {
  this.showMultiRestoreTicketModal = false;
  this.confirmRestoreTickets = [];
  this.pendingRestoreIds = [];
  this.bulkRestoring = false;
}

confirmMultiRestoreTicket(): void {
  // 👉 CAS 1: Mode global (tous les tickets)
  if (this.globalTicketSelectionMode && this.confirmRestoreTickets.length === 0) {
    this.restoreAllTickets();
    this.showMultiRestoreTicketModal = false;
    return;
  }
  
  // 👉 CAS 2: Sélection multiple normale
  if (this.confirmRestoreTickets.length === 0) return;
  
  this.bulkRestoring = true;
  let completed = 0;
  const total = this.confirmRestoreTickets.length;
  let successCount = 0;
  
  this.confirmRestoreTickets.forEach(ticket => {
    this.ticketService.restaurerTicket(ticket.id).subscribe({
      next: (response) => {
        if (response.isSuccess) successCount++;
        completed++;
        
        if (completed === total) {
          this.bulkRestoring = false;
          this.showMultiRestoreTicketModal = false;
          this.selectedTickets.clear();
          this.confirmRestoreTickets = [];
          this.globalTicketSelectionMode = false; // Reset global mode
          
          if (successCount === total) {
            this.showAlert('success', 'Succès', `${total} ticket(s) restauré(s) avec succès.`);
          } else if (successCount > 0) {
            this.showAlert('warning', 'Restauration partielle', `${successCount} ticket(s) restauré(s), ${total - successCount} échec(s).`);
          } else {
            this.showAlert('error', 'Échec', `Aucun ticket n'a pu être restauré.`);
          }
          this.loadArchivedTickets();
        }
      },
      error: (err) => {
        console.error(`Erreur restauration ${ticket.id}:`, err);
        completed++;
        if (completed === total) {
          this.bulkRestoring = false;
          this.showMultiRestoreTicketModal = false;
          this.selectedTickets.clear();
          this.confirmRestoreTickets = [];
          this.globalTicketSelectionMode = false; // Reset global mode
          this.showAlert('error', 'Erreur', `${successCount}/${total} ticket(s) restauré(s).`);
          this.loadArchivedTickets();
        }
      }
    });
  });
}

// ========== MÉTHODES POUR LA RESTAURATION MULTIPLE INCIDENTS ==========

cancelMultiRestoreIncident(): void {
  this.showMultiRestoreIncidentModal = false;
  this.confirmRestoreIncidents = [];
  this.pendingRestoreIncidentIds = [];
  this.bulkRestoringIncidents = false;
}

confirmMultiRestoreIncident(): void {
  // 👉 CAS 1: Mode global (tous les incidents)
  if (this.globalIncidentSelectionMode && this.confirmRestoreIncidents.length === 0) {
    this.restoreAllIncidents();
    this.showMultiRestoreIncidentModal = false;
    return;
  }
  
  // 👉 CAS 2: Sélection multiple normale
  if (this.confirmRestoreIncidents.length === 0) return;
  
  this.bulkRestoringIncidents = true;
  let completed = 0;
  const total = this.confirmRestoreIncidents.length;
  let successCount = 0;
  
  this.confirmRestoreIncidents.forEach(incident => {
    this.incidentService.restaurerIncident(incident.id).subscribe({
      next: (response) => {
        if (response.isSuccess) successCount++;
        completed++;
        
        if (completed === total) {
          this.bulkRestoringIncidents = false;
          this.showMultiRestoreIncidentModal = false;
          this.selectedIncidents.clear();
          this.confirmRestoreIncidents = [];
          this.globalIncidentSelectionMode = false; // Reset global mode
          
          if (successCount === total) {
            this.showAlert('success', 'Succès', `${total} incident(s) restauré(s) avec succès.`);
          } else if (successCount > 0) {
            this.showAlert('warning', 'Restauration partielle', `${successCount} incident(s) restauré(s), ${total - successCount} échec(s).`);
          } else {
            this.showAlert('error', 'Échec', `Aucun incident n'a pu être restauré.`);
          }
          this.loadArchivedIncidents();
        }
      },
      error: (err) => {
        console.error(`Erreur restauration ${incident.id}:`, err);
        completed++;
        if (completed === total) {
          this.bulkRestoringIncidents = false;
          this.showMultiRestoreIncidentModal = false;
          this.selectedIncidents.clear();
          this.confirmRestoreIncidents = [];
          this.globalIncidentSelectionMode = false; // Reset global mode
          this.showAlert('error', 'Erreur', `${successCount}/${total} incident(s) restauré(s).`);
          this.loadArchivedIncidents();
        }
      }
    });
  });
}

}