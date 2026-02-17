import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AvatarTextComponent } from '../../shared/components/ui/avatar/avatar-text.component';
import { BadgeComponent } from '../../shared/components/ui/badge/badge.component';
import { CheckboxComponent } from '../../shared/components/form/input/checkbox.component';
import { Incident, SeveriteIncident, StatutIncident } from '../../shared/models/incident.model';
import { IncidentService } from '../../shared/services/incident.service';
import { AlertComponent } from '../../shared/components/ui/alert/alert.component';


@Component({
  selector: 'app-incident-list',
  standalone: true,
  imports: [
    CommonModule,AlertComponent,
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
    selectedStatut?: number;
  selectedSeverite?: number;
// Options pour les filtres
severiteOptions = [
  { value: SeveriteIncident.Faible, label: 'Faible' },
  { value: SeveriteIncident.Moyenne, label: 'Moyenne' },
  { value: SeveriteIncident.Forte, label: 'Forte' }
];

statutOptions = [
  { value: StatutIncident.Nouveau, label: 'Nouveau' },
  { value: StatutIncident.Assigne, label: 'Assigné' },
  { value: StatutIncident.EnCours, label: 'En cours' },
  { value: StatutIncident.EnAttente, label: 'En attente' },
  { value: StatutIncident.Resolu, label: 'Résolu' },
  { value: StatutIncident.Ferme, label: 'Fermé' }
];
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
// --- Dans la classe IncidentListComponent ---

// Pour la suppression simple
confirmIncident: Incident | null = null; // l'incident sélectionné pour suppression
alert = {
  show: false,
  variant: 'info' as 'success' | 'error' | 'warning' | 'info',
  title: '',
  message: ''
};

// Ouvrir la confirmation
onDelete(incident: Incident) {
  this.confirmIncident = incident;
  this.alert = {
    show: true,
    variant: 'warning',
    title: 'Confirmation',
    message: `Voulez-vous vraiment supprimer l'incident "${incident.titreIncident}" ?`
  };
}

// Confirmer la suppression
confirmDelete() {
  if (!this.confirmIncident) return;

  this.incidentService.deleteIncident(this.confirmIncident.id).subscribe({
    next: () => {
      // Retirer l'incident du tableau local
      this.incidents = this.incidents.filter(i => i.id !== this.confirmIncident!.id);
      this.filteredIncidents = this.filteredIncidents.filter(i => i.id !== this.confirmIncident!.id);

      this.showAlert('success', 'Incident supprimé', `L'incident "${this.confirmIncident!.titreIncident}" a été supprimé.`);
      this.confirmIncident = null;
      this.alert.show = false;
    },
    error: (err) => {
      console.error(err);
      this.showAlert('error', 'Erreur', `Impossible de supprimer l'incident "${this.confirmIncident!.titreIncident}".`);
      this.confirmIncident = null;
      this.alert.show = false;
    }
  });
}

// Annuler la suppression
cancelDelete() {
  this.confirmIncident = null;
  this.alert.show = false;
}

// Toaster simple
showAlert(variant: 'success' | 'error' | 'warning' | 'info', title: string, message: string) {
  this.alert = { show: true, variant, title, message };
  setTimeout(() => (this.alert.show = false), 3000);
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