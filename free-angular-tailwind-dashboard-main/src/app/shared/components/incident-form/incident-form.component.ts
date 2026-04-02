import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { IncidentService } from '../../services/incident.service';
import { CreateIncidentDTO } from '../../models/incident.model';
import { TPEService } from '../../services/tpe.service';
import { MultiSelectComponent } from '../form/multi-select/multi-select.component';
import { MapComponent } from '../../../google-maps-wrapper/map.component';

interface MultiOption {
  value: string;
  text: string;
  selected: boolean;
}

@Component({
  selector: 'app-incident-form',
  standalone: true,
  imports: [CommonModule, MapComponent, FormsModule, RouterModule, MultiSelectComponent],
  templateUrl: './incident-form.component.html',
  styles: [`
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
      20%, 40%, 60%, 80% { transform: translateX(2px); }
    }
    .animate-shake {
      animation: shake 0.5s ease-in-out;
    }
  `]
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
  showTpeError = false;

  // Pour les fichiers
  selectedFiles: File[] = [];
  isDragActive = false;
  maxFileSize = 10 * 1024 * 1024; // 10MB
  maxFiles = 10;

  tpes: any[] = [];
  tpeOptions: MultiOption[] = [];

  constructor(
    private incidentService: IncidentService,
    private tpeService: TPEService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.tpeService.getMyTpes().subscribe({
      next: (tpes) => {
        this.tpes = tpes;
        this.tpeOptions = this.tpes.map(tpe => ({
          value: tpe.id,
          text: `${tpe.numSerieComplet} - ${tpe.modele}`,
          selected: this.incident.TPEIds.includes(tpe.id)
        }));
        console.log('TPEs chargés:', this.tpes);
      },
      error: (err) => {
        console.error('Erreur récupération TPEs', err);
        this.showError('Impossible de charger la liste des TPE');
      }
    });
  }

  getTpeCode(tpeId: string): string {
    const tpe = this.tpes.find(t => t.id === tpeId);
    return tpe ? tpe.numSerieComplet : 'TPE';
  }

  onTpeSelectionChange(selectedIds: string[]) {
    this.incident.TPEIds = selectedIds;
    this.showTpeError = false;
    console.log('TPEs sélectionnés:', this.incident.TPEIds);
  }

  onLocationSelected(location: any) {
    this.incident.emplacement = location.address;
    console.log('Latitude:', location.lat);
    console.log('Longitude:', location.lng);
  }

  // ========== GESTION DES FICHIERS AMÉLIORÉE ==========

  onFileSelected(event: any): void {
    const files: FileList = event.target.files;
    if (!files) return;
    
    this.addFiles(Array.from(files));
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragActive = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragActive = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragActive = false;
    
    const files = event.dataTransfer?.files;
    if (files) {
      this.addFiles(Array.from(files));
    }
  }

  private addFiles(files: File[]): void {
    // Filtrer les fichiers trop volumineux
    const validFiles = files.filter(file => {
      if (file.size > this.maxFileSize) {
        console.warn(`Fichier ${file.name} trop volumineux (max ${this.maxFileSize / 1024 / 1024}MB)`);
        return false;
      }
      return true;
    });

    // Vérifier la limite de nombre de fichiers
    if (this.selectedFiles.length + validFiles.length > this.maxFiles) {
      this.showError(`Vous ne pouvez pas ajouter plus de ${this.maxFiles} fichiers`);
      return;
    }

    // Ajouter les fichiers
    this.selectedFiles = [...this.selectedFiles, ...validFiles];
    this.updateIncidentFiles();
  }

  removeFile(index: number): void {
    this.selectedFiles.splice(index, 1);
    this.updateIncidentFiles();
  }

  clearAllFiles(): void {
    this.selectedFiles = [];
    this.updateIncidentFiles();
  }

  private updateIncidentFiles(): void {
    this.incident.PiecesJointes = this.selectedFiles;
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // ========== VALIDATION ET SOUMISSION ==========
showErrors = false;
submitted = false;

// Modifiez la méthode onSubmit
onSubmit(): void {
  this.submitted = true;
  this.showErrors = true;
  this.showTpeError = false;
  this.error = null;

  if (!this.incident.descriptionIncident || !this.incident.emplacement) {
    this.error = 'Veuillez remplir les champs obligatoires';
    return;
  }

  if (this.incident.typeProbleme === undefined) {
    this.error = 'Veuillez sélectionner un type de problème';
    return;
  }

  if (!this.incident.TPEIds || this.incident.TPEIds.length === 0) {
    this.showTpeError = true;
    this.error = 'Veuillez sélectionner au moins un terminal TPE';
    return;
  }

  // Reset validation flag on success
  this.showErrors = false;

    const formData = new FormData();
    formData.append('descriptionIncident', this.incident.descriptionIncident .replace(/[^a-z0-9.]/g, ''));
    formData.append('typeProbleme', this.incident.typeProbleme.toString());
    formData.append('emplacement', this.incident.emplacement);

    this.incident.TPEIds?.forEach((id: string) => {
      formData.append('TPEIds', id);
    });

    this.selectedFiles.forEach((file: File) => {
      formData.append('PiecesJointes', file, file.name);
    });

    this.incidentService.createIncident(formData).subscribe({
      next: (createdIncident) => {
        this.loading = false;
        this.router.navigate(['/incidents', createdIncident.id]);
      },
      error: (err) => {
        console.error('Erreur création incident', err);
        this.error = err.error?.message || 'Erreur lors de la création de l\'incident';
        this.loading = false;
      }
    });
  }

  private showError(message: string): void {
    alert(message);
  }

  cancel(): void {
    this.router.navigate(['/incidents']);
  }
}