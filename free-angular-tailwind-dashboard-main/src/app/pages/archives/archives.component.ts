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

@Component({
  selector: 'app-archives',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, BadgeComponent],
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
      this.loadArchivedIncidents();
            this.loadArchivedTickets();

   
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
  
  formatDate(date: Date | string): string {
    if (!date) return 'N/A';
    const d = new Date(date);
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
}