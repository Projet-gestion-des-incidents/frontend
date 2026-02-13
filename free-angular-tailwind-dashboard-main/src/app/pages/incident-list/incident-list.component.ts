import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AvatarTextComponent } from '../../shared/components/ui/avatar/avatar-text.component';
import { BadgeComponent } from '../../shared/components/ui/badge/badge.component';
import { CheckboxComponent } from '../../shared/components/form/input/checkbox.component';
import { Incident, SeveriteIncident, StatutIncident } from '../../shared/models/incident.model';
import { IncidentService } from '../../shared/services/incident.service';


@Component({
  selector: 'app-incident-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    BadgeComponent,
    AvatarTextComponent,
    CheckboxComponent
  ],
  templateUrl: './incident-list.component.html',
  styles: ``
})
export class IncidentListComponent implements OnInit {
  incidents: Incident[] = [];
  filteredIncidents: Incident[] = [];
  loading = true;
  error: string | null = null;

  // Pour la sélection multiple
  selectedRows: string[] = [];
  selectAll: boolean = false;

  // Pour les filtres
  searchTerm: string = '';

  constructor(
    private incidentService: IncidentService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadIncidents();
  }

  loadIncidents(): void {
    this.loading = true;
    this.incidentService.getAllIncidents().subscribe({
      next: (data) => {
        this.incidents = data;
        this.filteredIncidents = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur chargement incidents', err);
        this.error = 'Impossible de charger la liste des incidents';
        this.loading = false;
      }
    });
  }

  applyFilter(): void {
    if (!this.searchTerm.trim()) {
      this.filteredIncidents = this.incidents;
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredIncidents = this.incidents.filter(incident => 
      incident.codeIncident.toLowerCase().includes(term) ||
      incident.titreIncident.toLowerCase().includes(term) ||
      (incident.createdByName && incident.createdByName.toLowerCase().includes(term))
    );
  }

  // Gestion de la sélection
  handleSelectAll(): void {
    this.selectAll = !this.selectAll;
    if (this.selectAll) {
      this.selectedRows = this.filteredIncidents.map(incident => incident.id);
    } else {
      this.selectedRows = [];
    }
  }

  handleRowSelect(id: string): void {
    if (this.selectedRows.includes(id)) {
      this.selectedRows = this.selectedRows.filter(rowId => rowId !== id);
    } else {
      this.selectedRows = [...this.selectedRows, id];
    }
    this.selectAll = this.filteredIncidents.length > 0 && 
      this.selectedRows.length === this.filteredIncidents.length;
  }

  // Navigation
  viewIncidentDetails(id: string): void {
    this.router.navigate(['/incidents', id]);
  }

  // Helper pour les badges
  getSeveriteBadgeColor(severite: SeveriteIncident): 'success' | 'warning' | 'error' {
    switch(severite) {
      case SeveriteIncident.Faible:
        return 'success';
      case SeveriteIncident.Moyenne:
        return 'warning';
      case SeveriteIncident.Forte:
        return 'error';
      default:
        return 'warning';
    }
  }

  getStatutBadgeColor(statut: StatutIncident): 'success' | 'warning' | 'error' | 'info' {
    switch(statut) {
      case StatutIncident.Nouveau:
        return 'info';
      case StatutIncident.Assigne:
      case StatutIncident.EnCours:
        return 'warning';
      case StatutIncident.EnAttente:
        return 'info';
      case StatutIncident.Resolu:
      case StatutIncident.Ferme:
        return 'success';
      default:
        return 'warning';
    }
  }

  // Formatter la date
  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}