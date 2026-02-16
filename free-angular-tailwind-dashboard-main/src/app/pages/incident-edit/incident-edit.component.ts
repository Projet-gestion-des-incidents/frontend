import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import {
  IncidentDetail,
  SeveriteIncident,
  StatutIncident,
  TypeEntiteImpactee,
  EntiteImpactee
} from '../../shared/models/incident.model';
import { IncidentService } from '../../shared/services/incident.service';

@Component({
  selector: 'app-incident-edit',
  standalone: true,
  imports: [CommonModule, FormsModule,RouterModule],
  templateUrl: './incident-edit.component.html'
})
export class IncidentEditComponent implements OnInit {

  incidentId!: string;
  incident!: IncidentDetail;

  severites = Object.values(SeveriteIncident).filter(v => !isNaN(Number(v)));
  statuts = Object.values(StatutIncident).filter(v => !isNaN(Number(v)));
  typesEntite = Object.values(TypeEntiteImpactee).filter(v => !isNaN(Number(v)));

  loading = true;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private incidentService: IncidentService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.incidentId = this.route.snapshot.paramMap.get('id')!;
    this.loadIncident();
  }
cancel() {
  this.router.navigate(['/incidents', this.incidentId]);
}

  loadIncident() {
    this.incidentService.getIncidentDetails(this.incidentId).subscribe({
      next: (data) => {
        this.incident = data;
        this.loading = false;
      },
      error: () => {
        this.error = 'Erreur chargement incident';
        this.loading = false;
      }
    });
  }

  addEntite() {
    this.incident.entitesImpactees.push({
      typeEntiteImpactee: TypeEntiteImpactee.Application,
      nom: ''
    });
  }

  removeEntite(index: number) {
    this.incident.entitesImpactees.splice(index, 1);
  }

  save() {
    const dto = {
      titreIncident: this.incident.titreIncident,
      descriptionIncident: this.incident.descriptionIncident,
      severiteIncident: this.incident.severiteIncident,
      statutIncident: this.incident.statutIncident,
      entitesImpactees: this.incident.entitesImpactees.map(e => ({
        id: e.id, // peut être undefined => nouvelle entité
        typeEntiteImpactee: e.typeEntiteImpactee,
        nom: e.nom
      }))
    };

    this.incidentService.updateIncident(this.incidentId, dto).subscribe({
      next: () => {
        this.router.navigate(['/incidents', this.incidentId]);
      },
      error: () => {
        this.error = 'Erreur lors de la mise à jour';
      }
    });
  }
}
