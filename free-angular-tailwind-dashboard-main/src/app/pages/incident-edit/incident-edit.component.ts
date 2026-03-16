import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ApiResponse, CreateIncidentDTO, EntiteImpactee, Incident, IncidentDetail, SeveriteIncident, StatutIncident, TypeEntiteImpactee, TypeProbleme } from '../../shared/models/incident.model';
import { IncidentService } from '../../shared/services/incident.service';
import { EntiteImpacteeService } from '../../shared/services/entite-impactee.service';
import { CommonModule } from '@angular/common';
import { UserService } from '../../shared/services/user.service';
import { TPEService } from '../../shared/services/tpe.service';
import { MultiSelectComponent } from '../../shared/components/form/multi-select/multi-select.component';
import { MapComponent } from '../../google-maps-wrapper/map.component';

interface MultiOption {
  value: string;
  text: string;
  selected: boolean;
}

@Component({
  selector: 'app-incident-edit',
  templateUrl: './incident-edit.component.html',
  imports: [
    CommonModule, 
    FormsModule, MapComponent,
    RouterModule,
    MultiSelectComponent
  ],
  styleUrls: ['./incident-edit.component.css']
})
export class IncidentEditComponent implements OnInit {

  incident!: IncidentDetail;
  loading = false;
  error: string | null = null;
  userRole: string = '';

  // Options pour les selects
  severiteOptions = [
    { value: 'Faible', label: 'Faible' },
    { value: 'Moyenne', label: 'Moyenne' },
    { value: 'Forte', label: 'Forte' }
  ];

  severiteStringToEnum: { [key: string]: SeveriteIncident } = {
    'Faible': SeveriteIncident.Faible,
    'Moyenne': SeveriteIncident.Moyenne,
    'Forte': SeveriteIncident.Forte
  };
// Pour les fichiers
  selectedFiles: File[] = [];
  isDragActive = false;
  maxFileSize = 10 * 1024 * 1024; // 10MB
  maxFiles = 10;

  severiteEnumToString: { [key: number]: string } = {
    [SeveriteIncident.Faible]: 'Faible',
    [SeveriteIncident.Moyenne]: 'Moyenne',
    [SeveriteIncident.Forte]: 'Forte'
  };

  // ========== PROPRIÉTÉS POUR LES TPES ==========
tpEsDisponibles: any[] = []; // Liste des TPEs disponibles pour le multi-select
tpeOptions: MultiOption[] = []; // Options pour le multi-select
selectedTpeIds: string[] = []; // IDs des TPEs liés à l'incident
showTpeSelector = false; // Pour afficher/masquer le sélecteur de TPEs

  typeProblemeOptions = [
    { value: 'PaiementRefuse', label: 'Paiement refusé' },
    { value: 'TerminalHorsLigne', label: 'Terminal hors ligne' },
    { value: 'Lenteur', label: 'Lenteur' },
    { value: 'BugAffichage', label: 'Bug affichage' },
    { value: 'ConnexionReseau', label: 'Connexion réseau' },
    { value: 'ErreurFluxTransactionnel', label: 'Erreur flux transactionnel' },
    { value: 'ProblemeLogicielTPE', label: 'Problème logiciel TPE' },
    { value: 'Autre', label: 'Autre' }
  ];

  typeProblemeStringToEnum: { [key: string]: TypeProbleme } = {
    'PaiementRefuse': TypeProbleme.PaiementRefuse,
    'TerminalHorsLigne': TypeProbleme.TerminalHorsLigne,
    'Lenteur': TypeProbleme.Lenteur,
    'BugAffichage': TypeProbleme.BugAffichage,
    'ConnexionReseau': TypeProbleme.ConnexionReseau,
    'ErreurFluxTransactionnel': TypeProbleme.ErreurFluxTransactionnel,
    'ProblemeLogicielTPE': TypeProbleme.ProblemeLogicielTPE,
    'Autre': TypeProbleme.Autre
  };

  typeEntiteOptions = [
    { value: TypeEntiteImpactee.MachineTPE, label: 'Machine TPE' },
    { value: TypeEntiteImpactee.FluxTransactionnel, label: 'Flux Transactionnel' },
    { value: TypeEntiteImpactee.Reseau, label: 'Réseau' },
    { value: TypeEntiteImpactee.ServiceApplicatif, label: 'Service Applicatif' }
  ];

  typeProblemeString: string = '';
  severiteString: string = '';

  showNewEntiteForm = false;
  newEntite: { typeEntiteImpactee: TypeEntiteImpactee } = {
    typeEntiteImpactee: TypeEntiteImpactee.MachineTPE
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private incidentService: IncidentService,
    private entiteService: EntiteImpacteeService,
    private tpeService: TPEService,
    private userService: UserService
  ) { }

  ngOnInit(): void {
    this.userService.getMyProfile().subscribe({
      next: (user) => {
        this.userRole = user.role;
        console.log('Rôle utilisateur:', this.userRole);
        this.loadTpesDisponibles(); // Charger après avoir le rôle
      },
      error: (err) => console.error('Erreur récupération rôle:', err)
    });

    const incidentId = this.route.snapshot.paramMap.get('id');
    if (incidentId) {
      this.loadIncident(incidentId);
    }
  }

  get isAdmin(): boolean {
    return this.userRole === 'Admin';
  }

  get isCommercant(): boolean {
    return this.userRole === 'Commercant';
  }

  // ========== GESTION DES TPES DISPONIBLES ==========

 loadTpesDisponibles() {
  console.log('📦 Chargement des TPEs disponibles...');
  
  // Pour le commerçant : ses propres TPEs via getMyTpes()
  const tpeObservable = this.isCommercant 
    ? this.tpeService.getMyTpes() 
    : this.tpeService.getAllTPEs();
  
  tpeObservable.subscribe({
    next: (tpes) => {
      this.tpEsDisponibles = tpes || [];
      this.updateTpeOptions();
      console.log('📦 TPEs disponibles:', this.tpEsDisponibles);
    },
    error: (err) => {
      console.error('❌ Erreur chargement TPEs:', err);
      this.tpEsDisponibles = [];
      this.tpeOptions = [];
      this.error = 'Impossible de charger la liste des TPEs';
    }
  });
}

  // Mettre à jour les options du multi-select
updateTpeOptions() {
  this.tpeOptions = this.tpEsDisponibles.map(tpe => ({
    value: tpe.id,
    text: `${tpe.numSerieComplet} - ${tpe.modele}`,
    selected: this.selectedTpeIds.includes(tpe.id)
  }));
  console.log('📦 Options TPE mises à jour:', this.tpeOptions);
}

  // Obtenir le code d'un TPE à partir de son ID
  getTpeCode(tpeId: string): string {
    const tpe = this.tpEsDisponibles.find(t => t.id === tpeId);
    return tpe ? tpe.numSerieComplet : 'TPE';
  }

  // Gérer le changement de sélection dans le multi-select
// Version simplifiée de onTpeSelectionChange
onTpeSelectionChange(selectedIds: string[]) {
  console.log('📦 TPEs sélectionnés:', selectedIds);
  this.selectedTpeIds = selectedIds;
  this.updateTpeOptions();
  
  // Optionnel : message temporaire sans utiliser showTemporaryMessage
  this.error = 'Modifications en attente - cliquez sur Enregistrer pour appliquer';
  setTimeout(() => {
    this.error = null;
  }, 3000);
}

  // Ajouter un TPE à l'incident
  ajouterTpe(tpeId: string) {
    if (!this.isCommercant) {
      this.error = 'Seul le commerçant peut ajouter des TPEs';
      return;
    }
    
    console.log('➕ Ajout TPE:', tpeId);
    
    const tpeAjoute = this.tpEsDisponibles.find(t => t.id === tpeId);
    if (!tpeAjoute) {
      this.error = 'TPE non trouvé';
      return;
    }

    this.incidentService.lierTpe(this.incident.id, tpeId).subscribe({
      next: (response) => {
        if (response.isSuccess) {
          if (!this.incident.tpEs) {
            this.incident.tpEs = [];
          }
          
          this.incident.tpEs.push({
            tpeId: tpeAjoute.id,
            numSerie: tpeAjoute.numSerie,
            numSerieComplet: tpeAjoute.numSerieComplet,
            modele: tpeAjoute.modele,
            modeleNom: tpeAjoute.modeleNom || tpeAjoute.modele,
            dateAssociation: new Date().toISOString()
          });
          
          this.selectedTpeIds.push(tpeId);
          this.updateTpeOptions();
          this.showTemporaryMessage('TPE lié avec succès', 'success');
        } else {
          this.error = response.message || 'Erreur lors de la liaison';
        }
      },
      error: (err) => {
        console.error('❌ Erreur liaison TPE:', err);
        this.error = err.error?.message || 'Erreur lors de la liaison du TPE';
      }
    });
  }

  // Supprimer un TPE de l'incident
  supprimerTpe(tpeId: string, index: number) {
    if (!this.isCommercant) {
      this.error = 'Seul le commerçant peut supprimer des TPEs';
      return;
    }

    if (!confirm('Voulez-vous vraiment retirer ce TPE de l\'incident ?')) {
      return;
    }

    console.log('🗑️ Suppression TPE:', tpeId);
    
    this.incidentService.retirerTpe(this.incident.id, tpeId).subscribe({
      next: (response) => {
        if (response.isSuccess) {
          this.incident.tpEs?.splice(index, 1);
          this.selectedTpeIds = this.selectedTpeIds.filter(id => id !== tpeId);
          this.updateTpeOptions();
          this.showTemporaryMessage('TPE retiré avec succès', 'success');
        } else {
          this.error = response.message || 'Erreur lors du retrait';
        }
      },
      error: (err) => {
        console.error('❌ Erreur retrait TPE:', err);
        this.error = err.error?.message || 'Erreur lors du retrait du TPE';
      }
    });
  }

  // Basculer l'affichage du sélecteur de TPEs
  toggleTpeSelector() {
    if (!this.isCommercant) {
      this.error = 'Seul le commerçant peut modifier les TPEs';
      return;
    }
    this.showTpeSelector = !this.showTpeSelector;
  }

  // ========== CHARGEMENT DE L'INCIDENT ==========

  loadIncident(id: string) {
    this.loading = true;
    this.incidentService.getIncidentDetails(id).subscribe({
      next: (data: IncidentDetail) => {
        this.incident = data;
        
        console.log('📦 Entités reçues:', this.incident.entitesImpactees);
        console.log('📦 TPEs reçus:', this.incident.tpEs);
        
        // Initialiser les TPEs liés
        if (this.incident.tpEs) {
          this.selectedTpeIds = this.incident.tpEs.map(tpe => tpe.tpeId);
          console.log('📦 TPEs liés IDs:', this.selectedTpeIds);
        } else {
          this.incident.tpEs = [];
          this.selectedTpeIds = [];
        }
        
        // Mettre à jour les options avec les sélections
        this.updateTpeOptions();
        
        // Convertir le typeProbleme pour l'affichage
        if (this.incident.typeProbleme) {
          if (typeof this.incident.typeProbleme === 'number') {
            const found = Object.entries(this.typeProblemeStringToEnum).find(
              ([key, value]) => value === this.incident.typeProbleme
            );
            if (found) {
              this.typeProblemeString = found[0];
            }
          } else if (typeof this.incident.typeProbleme === 'string') {
            this.typeProblemeString = this.incident.typeProbleme;
          }
        }
        
        // Convertir la sévérité pour l'affichage
        if (this.incident.severiteIncident) {
          if (typeof this.incident.severiteIncident === 'number') {
            this.severiteString = this.severiteEnumToString[this.incident.severiteIncident] || '';
          } else if (typeof this.incident.severiteIncident === 'string') {
            this.severiteString = this.incident.severiteIncident;
          }
        }
        
        console.log('✅ Incident chargé:', this.incident);
        this.loading = false;
      },
      error: (err: any) => {
        this.error = 'Erreur lors du chargement de l\'incident.';
        console.error(err);
        this.loading = false;
      }
    });
  }

  // ========== SAUVEGARDE ==========

save() {
  if (!this.incident) return;
  this.loading = true;

  const updateDto: any = {};

  if (this.incident.descriptionIncident !== undefined) {
    updateDto.descriptionIncident = this.incident.descriptionIncident;
  }
  if (this.incident.emplacement !== undefined) {
    updateDto.emplacement = this.incident.emplacement;
  }
  
  if (this.typeProblemeString) {
    updateDto.typeProbleme = this.typeProblemeStringToEnum[this.typeProblemeString] || 
                              (typeof this.incident.typeProbleme === 'string' ? 
                               this.incident.typeProbleme : this.incident.typeProbleme);
  }

  if (this.isAdmin && this.severiteString) {
    updateDto.severiteIncident = this.severiteStringToEnum[this.severiteString] || 
                                  (typeof this.incident.severiteIncident === 'number' ? 
                                   this.incident.severiteIncident : undefined);
  }

  // 🔥 IMPORTANT: Ajouter les TPEIds sélectionnés au DTO
  updateDto.tpeIds = this.selectedTpeIds; // ou TPEIds selon le nom attendu par le backend

  console.log('📦 DTO envoyé avec TPEIds:', updateDto);

  this.incidentService.updateIncident(this.incident.id, updateDto).subscribe({
    next: (updated) => {
      console.log('✅ Incident mis à jour:', updated);
      this.loading = false;
      this.router.navigate(['/incidents', this.incident.id]);
    },
    error: (err: any) => {
      console.error('❌ Erreur:', err);
      this.error = err.error?.message || 'Erreur lors de la mise à jour.';
      this.loading = false;
    }
  });
}

  // ========== GESTION DES ENTITÉS ==========

  toggleNewEntiteForm() {
    if (!this.isAdmin) {
      this.error = 'Seul l\'administrateur peut modifier les entités impactées';
      return;
    }
    this.showNewEntiteForm = !this.showNewEntiteForm;
    if (!this.showNewEntiteForm) {
      this.newEntite = { typeEntiteImpactee: TypeEntiteImpactee.MachineTPE };
    }
  }

  ajouterEntite() {
    if (!this.isAdmin) return;
    
    this.entiteService.addToIncident(this.incident.id, this.newEntite.typeEntiteImpactee).subscribe({
      next: (response) => {
        if (response.isSuccess && response.data) {
          this.incident.entitesImpactees.push({
            id: response.data.id,
            typeEntiteImpactee: response.data.typeEntiteImpactee
          });
          this.showNewEntiteForm = false;
          this.newEntite = { typeEntiteImpactee: TypeEntiteImpactee.MachineTPE };
        } else {
          this.error = response.message || 'Erreur lors de l\'ajout';
        }
      },
      error: (err) => {
        console.error('❌ Erreur ajout entité:', err);
        this.error = 'Erreur lors de l\'ajout de l\'entité';
      }
    });
  }

  supprimerEntite(entiteId: string | undefined, index: number) {
    if (!this.isAdmin) {
      this.error = 'Seul l\'administrateur peut supprimer des entités';
      return;
    }
    
    if (!entiteId) {
      console.warn('⚠️ Entité sans ID - suppression locale seulement');
      this.incident.entitesImpactees.splice(index, 1);
      return;
    }

    if (!confirm('Voulez-vous vraiment supprimer cette entité ?')) {
      return;
    }

    console.log('🗑️ Suppression entité:', entiteId);
    
    this.entiteService.removeFromIncident(entiteId).subscribe({
      next: (response: ApiResponse<boolean>) => {
        console.log('✅ Réponse suppression:', response);
        
        if (response.isSuccess) {
          this.incident.entitesImpactees.splice(index, 1);
          this.showTemporaryMessage('Entité supprimée avec succès', 'success');
        } else {
          this.error = response.message || 'Erreur lors de la suppression';
        }
      },
      error: (err: any) => {
        console.error('❌ Erreur détaillée:', err);
        
        if (err.status === 404) {
          this.error = 'Entité non trouvée';
        } else if (err.status === 403) {
          this.error = 'Vous n\'avez pas les droits pour supprimer cette entité';
        } else {
          this.error = err.error?.message || 'Erreur lors de la suppression';
        }
      }
    });
  }

  // Mapping pour les entités
  typeEntiteStringToEnum: { [key: string]: TypeEntiteImpactee } = {
    'MachineTPE': TypeEntiteImpactee.MachineTPE,
    'FluxTransactionnel': TypeEntiteImpactee.FluxTransactionnel,
    'Reseau': TypeEntiteImpactee.Reseau,
    'ServiceApplicatif': TypeEntiteImpactee.ServiceApplicatif
  };

  typeEntiteEnumToString: { [key: number]: string } = {
    [TypeEntiteImpactee.MachineTPE]: 'Machine TPE',
    [TypeEntiteImpactee.FluxTransactionnel]: 'Flux Transactionnel',
    [TypeEntiteImpactee.Reseau]: 'Réseau',
    [TypeEntiteImpactee.ServiceApplicatif]: 'Service Applicatif'
  };

  getTypeEntiteLabel(type: any): string {
    console.log('Type reçu:', type, 'type:', typeof type);
    
    if (typeof type === 'string') {
      const enumValue = this.typeEntiteStringToEnum[type];
      if (enumValue !== undefined) {
        return this.typeEntiteEnumToString[enumValue] || type;
      }
      return type.replace(/([A-Z])/g, ' $1').trim();
    }
    
    if (typeof type === 'number') {
      return this.typeEntiteEnumToString[type] || `Type ${type}`;
    }
    
    return 'Inconnu';
  }

  showTemporaryMessage(message: string, type: 'success' | 'error' = 'success') {
    this.error = message;
    setTimeout(() => {
      if (this.error === message) {
        this.error = null;
      }
    }, 3000);
  }

  cancel() {
    this.router.navigate(['/incidents', this.incident?.id]);
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

  private showError(message: string): void {
    alert(message);
  }
  removeFile(index: number): void {
    this.selectedFiles.splice(index, 1);
    this.updateIncidentFiles();
  }

  clearAllFiles(): void {
    this.selectedFiles = [];
    this.updateIncidentFiles();
  }
  isImage(contentType: string | null | undefined): boolean {
    if (!contentType) {
      // Si contentType est null, on vérifie l'extension
      return false;
    }
    return contentType.startsWith('image/');
  }
  openImage(url: string): void {
  window.open(url, '_blank');
}
  private updateIncidentFiles(): void {
  this.incident.piecesJointes = this.selectedFiles as any; // Solution temporaire
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}