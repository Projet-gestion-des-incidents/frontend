import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { IncidentService } from '../../services/incident.service';
import { EntiteImpacteeService, CreateEntiteImpacteeDTO } from '../../services/entite-impactee.service';
import { CreateIncidentDTO, SeveriteIncident, TypeEntiteImpactee, EntiteImpactee, TypeProbleme } from '../../models/incident.model';
import { TPEService } from '../../services/tpe.service';
import { MultiSelectComponent } from '../form/multi-select/multi-select.component';
import {  MapComponent } from '../../../google-maps-wrapper/map.component';
interface MultiOption {
  value: string;
  text: string;
  selected: boolean;
}
@Component({
  selector: 'app-incident-form',
  standalone: true,
  imports: [CommonModule,MapComponent , FormsModule, RouterModule,MultiSelectComponent],
  templateUrl: './incident-form.component.html',
  styles: ``
})
export class IncidentFormComponent implements OnInit {
 incident: CreateIncidentDTO = {
  descriptionIncident: '',
  emplacement: '',
  TPEIds: [],
  PiecesJointes: []
};


  loading = false;
  error: string | null = null;

tpes: any[] = []; // <-- ajouter cette ligne
  tpeOptions: MultiOption[] = []; // <-- ajouter cette ligne pour le multi-select


  constructor(
    private incidentService: IncidentService,
      private tpeService: TPEService, // <-- ajouter

    private router: Router
  ) {}

 ngOnInit(): void {
    this.tpeService.getMyTpes().subscribe({
      next: (tpes) => {
        this.tpes = tpes;
        // Transformer tes TPE pour le multi-select
        this.tpeOptions = this.tpes.map(tpe => ({
          value: tpe.id,
          text: `${tpe.numSerieComplet} - ${tpe.modele}`,
          selected: this.incident.TPEIds.includes(tpe.id)
        }));
      },
      error: (err) => {
        console.error('Erreur récupération TPEs', err);
      }
    });
  }
  onTpeSelectionChange(selectedIds: string[]) {
    this.incident.TPEIds = selectedIds;
  }
  onLocationSelected(location: any) {

  this.incident.emplacement = location.address;

  console.log('Latitude:', location.lat);
  console.log('Longitude:', location.lng);

}
  // Gestion upload fichiers
  onFileSelected(event: any): void {
    const files: FileList = event.target.files;

    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      this.incident.PiecesJointes?.push(files[i]);
    }
  }

  onSubmit(): void {

    if (!this.incident.descriptionIncident || !this.incident.emplacement) {
      this.error = 'Veuillez remplir les champs obligatoires';
      return;
    }
if (this.incident.typeProbleme === undefined) {
  this.error = 'Veuillez sélectionner un type de problème';
  return;
}
    this.loading = true;
    this.error = null;

    const formData = new FormData();

    formData.append('descriptionIncident', this.incident.descriptionIncident);
    formData.append('typeProbleme', this.incident.typeProbleme.toString());
    formData.append('emplacement', this.incident.emplacement);

    this.incident.TPEIds?.forEach((id: string) => {
      formData.append('TPEIds', id);
    });

    this.incident.PiecesJointes?.forEach((file: File) => {
      formData.append('PiecesJointes', file, file.name);
    });

    this.incidentService.createIncident(formData).subscribe({
      next: (createdIncident) => {
        this.loading = false;
        this.router.navigate(['/incidents', createdIncident.id]);
      },
      error: (err) => {
        console.error('Erreur création incident', err);
        this.error = 'Erreur lors de la création de l\'incident';
        this.loading = false;
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/incidents']);
  }

 

}