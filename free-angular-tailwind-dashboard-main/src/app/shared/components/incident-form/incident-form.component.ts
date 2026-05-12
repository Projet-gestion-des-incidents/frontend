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
      // Remplacer showError par error
      this.error = 'Impossible de charger la liste des TPE';
    }
  });
}


  // Ajoutez ces propriétés avec les autres déclarations
showConfirmDeleteFileModal: boolean = false;
fileToDelete: { index: number; fileName: string; isDeleteAll: boolean } | null = null;

/**
 * Ouvre la modale de confirmation pour supprimer une pièce jointe spécifique
 */
confirmDeleteSingleFile(index: number, fileName: string): void {
  this.fileToDelete = {
    index: index,
    fileName: fileName,
    isDeleteAll: false
  };
  this.showConfirmDeleteFileModal = true;
}

/**
 * Ouvre la modale de confirmation pour supprimer toutes les pièces jointes
 */
confirmDeleteAllFiles(): void {
  const totalFiles = this.selectedFiles.length;
  if (totalFiles === 0) return;
  
  this.fileToDelete = {
    index: -1,
    fileName: `${totalFiles} fichier(s)`,
    isDeleteAll: true
  };
  this.showConfirmDeleteFileModal = true;
}

// Ajoutez cette méthode après les propriétés

/**
 * Vérifie si le formulaire est valide pour activer le bouton
 */
/**
 * Vérifie si le formulaire est valide pour activer le bouton
 */
isFormValid(): boolean {
  // Vérifier la description
  if (!this.incident.descriptionIncident || this.incident.descriptionIncident.length < 10) {
    return false;
  }
  
  // Vérifier le type de problème
  if (this.incident.typeProbleme === undefined || this.incident.typeProbleme === null) {
    return false;
  }
  
  // Vérifier les TPE
  if (!this.incident.TPEIds || this.incident.TPEIds.length === 0) {
    return false;
  }
  
  return true;
}


/**
 * Exécute la suppression des fichiers après confirmation
 */
executeDeleteFiles(): void {
  if (!this.fileToDelete) return;
  
  if (this.fileToDelete.isDeleteAll) {
    // Supprimer tous les fichiers
    this.selectedFiles = [];
    this.updateIncidentFiles();
    this.showSuccessMessage('Toutes les pièces jointes ont été supprimées.');
  } else if (this.fileToDelete.index >= 0) {
    // Supprimer un seul fichier
    const fileName = this.selectedFiles[this.fileToDelete.index].name;
    this.selectedFiles.splice(this.fileToDelete.index, 1);
    this.updateIncidentFiles();
    this.showSuccessMessage(`La pièce jointe "${fileName}" a été supprimée.`);
  }
  
  this.closeConfirmDeleteFileModal();
}

/**
 * Ferme la modale de confirmation de suppression
 */
closeConfirmDeleteFileModal(): void {
  this.showConfirmDeleteFileModal = false;
  this.fileToDelete = null;
}

/**
 * Affiche un message de succès temporaire
 */
successMessage: string | null = null;

/**
 * Affiche un message de succès temporaire avec scroll automatique
 */
showSuccessMessage(message: string): void {
  this.successMessage = message;
  
  // Scroll automatique vers le haut pour voir le message de succès
  this.scrollToTop();
  
  // Auto-effacement après 5 secondes
  setTimeout(() => {
    if (this.successMessage === message) {
      this.successMessage = null;
    }
  }, 5000);
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
      this.showError(`Le fichier ${file.name} dépasse la limite de ${this.maxFileSize / 1024 / 1024}MB`);
      return false;
    }
    return true;
  });

  // Vérifier la limite de nombre de fichiers
  if (this.selectedFiles.length + validFiles.length > this.maxFiles) {
    this.showError(`Vous ne pouvez pas ajouter plus de ${this.maxFiles} fichiers.`);
    return;
  }

  // Ajouter les fichiers
  if (validFiles.length > 0) {
    this.selectedFiles = [...this.selectedFiles, ...validFiles];
    this.updateIncidentFiles();
    // Effacer l'erreur si ajout réussi
    this.error = null;
  }
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
// Modifiez la méthode onSubmit pour ajouter le message de succès
// Modifiez la méthode onSubmit pour ajouter le message de succès
onSubmit(): void {
  this.submitted = true;
  this.showErrors = true;
  this.showTpeError = false;
  this.error = null;

  if (!this.incident.descriptionIncident) {
    this.showError('Veuillez remplir les champs obligatoires');
    return;
  }
  if (this.incident.descriptionIncident.length < 10) {
    this.showError('La description doit contenir au moins 10 caractères');
    return;
  }
  if (this.incident.typeProbleme === undefined) {
    this.showError('Veuillez sélectionner un type de problème');
    return;
  }

  if (!this.incident.TPEIds || this.incident.TPEIds.length === 0) {
    this.showTpeError = true;
    this.showError('Veuillez sélectionner au moins un terminal TPE');
    return;
  }

  // Reset validation flag on success
  this.showErrors = false;

  const formData = new FormData();
  formData.append('descriptionIncident', this.incident.descriptionIncident.replace(/[^a-z0-9.]/g, ''));
  formData.append('typeProbleme', this.incident.typeProbleme.toString());
  formData.append('emplacement', 'Adresse non spécifiée');

  this.incident.TPEIds?.forEach((id: string) => {
    formData.append('TPEIds', id);
  });

  this.selectedFiles.forEach((file: File) => {
    formData.append('PiecesJointes', file, file.name);
  });

  this.loading = true;
  
  this.incidentService.createIncident(formData).subscribe({
    next: (createdIncident) => {
      this.loading = false;
      
      // Afficher le message de succès
      this.showSuccessMessage('Incident créé avec succès ! Redirection vers la liste des incidents...');
      
      // Rediriger après 2 secondes (pour que l'utilisateur voie le message)
      setTimeout(() => {
        this.router.navigate(['/incidents']);
      }, 5000);
    },
    error: (err) => {
      console.error('Erreur création incident', err);
      this.showError(err.error?.message || 'Erreur lors de la création de l\'incident');
      this.loading = false;
    }
  });
}

private showError(message: string): void {
  this.error = message;
  
  // Scroll automatique vers le haut
  this.scrollToTop();
  
  // Auto-effacement après 5 secondes
  setTimeout(() => {
    if (this.error === message) {
      this.error = null;
    }
  }, 5000);
}


/**
 * Fait défiler la page vers le haut pour afficher l'erreur
 */
/**
 * Fait défiler la page tout en haut pour afficher l'erreur
 */
private scrollToTop(): void {
  setTimeout(() => {
    // Scroll tout en haut de la page (le plus haut possible)
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth'
    });
    
    // Forcer également le scroll du body et html
    document.body.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
    
    // Scroll également l'élément racine
    document.documentElement.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }, 100);
}


  cancel(): void {
    this.router.navigate(['/incidents']);
  }
}