import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ApiResponse, CreateIncidentDTO, EntiteImpactee, Incident, IncidentDetail, IncidentTPEDTO, PieceJointeDTO, SeveriteIncident, StatutIncident, TypeEntiteImpactee, TypeProbleme } from '../../shared/models/incident.model';
import { IncidentService } from '../../shared/services/incident.service';
import { EntiteImpacteeService } from '../../shared/services/entite-impactee.service';
import { CommonModule } from '@angular/common';
import { UserService } from '../../shared/services/user.service';
import { TPEService } from '../../shared/services/tpe.service';
import { MultiSelectComponent } from '../../shared/components/form/multi-select/multi-select.component';
import { MapComponent } from '../../google-maps-wrapper/map.component';
import { catchError, forkJoin, of } from 'rxjs';

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
uploadingFiles: boolean = false;
uploadError: string | null = null;
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
piecesJointesExistantes: any[] = [];

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

  // Propriétés pour les modales
  showDeleteEntiteModal: boolean = false;
  entiteToDelete: { id: string; index: number; label: string } | null = null;
  
  
  
  showSuccessModal: boolean = false;
  successMessage: string = '';

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

  tpeIdsModifies: boolean = false;

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

  onTpeSelectionChange(selectedIds: string[]) {
    console.log('📦 TPEs sélectionnés:', selectedIds);
    
    // Vérifier si la sélection a changé par rapport aux TPEs déjà liés
    const tpesActuels = this.incident.tpEs?.map(t => t.tpeId) || [];
    const triActuels = [...tpesActuels].sort();
    const triNouveaux = [...selectedIds].sort();
    
    this.tpeIdsModifies = JSON.stringify(triActuels) !== JSON.stringify(triNouveaux);
    this.selectedTpeIds = selectedIds;
    this.updateTpeOptions();
    
    if (this.tpeIdsModifies) {
      this.error = 'Modifications en attente - cliquez sur Enregistrer pour appliquer';
      setTimeout(() => {
        this.error = null;
      }, 3000);
    }
  }

  sauvegarderTpes(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.tpeIdsModifies) {
        resolve(true);
        return;
      }

      const tpesActuels = this.incident.tpEs?.map(t => t.tpeId) || [];
      
      // TPEs à ajouter (dans selected mais pas dans actuels)
      const aAjouter = this.selectedTpeIds.filter(id => !tpesActuels.includes(id));
      
      // TPEs à supprimer (dans actuels mais pas dans selected)
      const aSupprimer = tpesActuels.filter(id => !this.selectedTpeIds.includes(id));

      console.log('📊 TPEs à ajouter:', aAjouter);
      console.log('📊 TPEs à supprimer:', aSupprimer);

      // Si rien à faire
      if (aAjouter.length === 0 && aSupprimer.length === 0) {
        this.tpeIdsModifies = false;
        resolve(true);
        return;
      }

      // Créer les observables pour les suppressions
      const deleteRequests = aSupprimer.map(id => 
        this.incidentService.retirerTpe(this.incident.id, id).pipe(
          catchError(err => {
            console.error(`Erreur suppression TPE ${id}:`, err);
            return of(null); // Continuer même en cas d'erreur
          })
        )
      );

      // Exécuter d'abord toutes les suppressions
      if (deleteRequests.length > 0) {
        forkJoin(deleteRequests).subscribe({
          next: () => {
            // Ensuite ajouter les nouveaux TPEs
            if (aAjouter.length > 0) {
              this.incidentService.lierPlusieursTpes(this.incident.id, aAjouter).subscribe({
                next: () => {
                  console.log('✅ TPEs mis à jour avec succès');
                  this.tpeIdsModifies = false;
                  resolve(true);
                },
                error: (err) => {
                  console.error('❌ Erreur ajout TPEs:', err);
                  this.error = 'Erreur lors de l\'ajout des TPEs';
                  resolve(false);
                }
              });
            } else {
              console.log('✅ TPEs supprimés avec succès');
              this.tpeIdsModifies = false;
              resolve(true);
            }
          },
          error: (err) => {
            console.error('❌ Erreur suppression TPEs:', err);
            this.error = 'Erreur lors de la suppression des TPEs';
            resolve(false);
          }
        });
      } else if (aAjouter.length > 0) {
        // Seulement des ajouts
        this.incidentService.lierPlusieursTpes(this.incident.id, aAjouter).subscribe({
          next: () => {
            console.log('✅ TPEs ajoutés avec succès');
            this.tpeIdsModifies = false;
            resolve(true);
          },
          error: (err) => {
            console.error('❌ Erreur ajout TPEs:', err);
            this.error = 'Erreur lors de l\'ajout des TPEs';
            resolve(false);
          }
        });
      }
    });
  }

  /**
   * Ajouter un TPE à l'incident
   */
  ajouterTpe(tpeId: string) {
    if (!this.isCommercant) {
      this.error = 'Seul le commerçant peut ajouter des TPEs';
      return;
    }
    
    console.log('➕ Ajout TPE:', tpeId);
      if (this.isIncidentLieATicket) {
    this.showErrorDialog(' Impossible de modifier les TPEs : cet incident est déjà lié à un ticket.');
    return;
  }
    const tpeAjoute = this.tpEsDisponibles.find(t => t.id === tpeId);
    if (!tpeAjoute) {
      this.error = 'TPE non trouvé';
      return;
    }

    this.incidentService.lierTpe(this.incident.id, tpeId).subscribe({
      next: (response) => {
        console.log('✅ Réception réponse:', response);
        
        if (response.isSuccess) {
          // Ajouter le TPE à la liste locale
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
          
          // Ajouter l'ID à la liste des sélectionnés
          this.selectedTpeIds.push(tpeId);
          
          // Mettre à jour les options du multi-select
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

  // ========== GESTION DES SUPPRESSIONS AVEC MODALES ==========

  showDeleteTpeModal: boolean = false;
tpeToDelete: { id: string; index: number; label: string } | null = null;

// Modifiez la méthode supprimerTpe pour vérifier si c'est le dernier TPE
supprimerTpe(tpeId: string, index: number) {
  if (!this.isCommercant) {
    this.error = 'Seul le commerçant peut supprimer des TPEs';
    return;
  }
  if (this.isIncidentLieATicket) {
    this.showErrorDialog(' Impossible de modifier les TPEs : cet incident est déjà lié à un ticket.');
    return;
  }
  // ✅ Vérifier si c'est le dernier TPE
  if (this.incident.tpEs && this.incident.tpEs.length === 1) {
    this.showErrorDialog(' Impossible de retirer le dernier TPE associé. Un incident doit avoir au moins un TPE associé pour être traité.');
    return;
  }

  // Préparer les données pour la modale
  const tpe = this.incident.tpEs?.[index];
  const label = tpe?.numSerieComplet || 'ce TPE';
  
  this.tpeToDelete = {
    id: tpeId,
    index: index,
    label: label
  };
  this.showDeleteTpeModal = true;
}
showErrorDialog(message: string, resultCode?: number): void {
  // Personnaliser le message selon le code d'erreur
  if (resultCode === 71) {
    this.error = 'Cet incident ne peut pas être modifié car il est déjà pris en charge ';
  } else if (resultCode === 70) {
    this.error = 'Cet incident ne peut pas être modifié car il est déjà en cours ou fermé.';
  } else {
    this.error = message;
  }
  
  // Auto-fermeture après 5 secondes
  setTimeout(() => {
    if (this.error === message || this.error === this.error) {
      this.error = null;
    }
  }, 5000);
}
  confirmerSuppressionTpe() {
    if (!this.tpeToDelete) return;

    console.log('🗑️ Suppression TPE:', this.tpeToDelete.id);
    
    this.incidentService.retirerTpe(this.incident.id, this.tpeToDelete.id).subscribe({
      next: (response) => {
        if (response.isSuccess) {
          this.incident.tpEs?.splice(this.tpeToDelete!.index, 1);
          this.selectedTpeIds = this.selectedTpeIds.filter(id => id !== this.tpeToDelete!.id);
          this.updateTpeOptions();
          this.showTemporaryMessage('TPE retiré avec succès', 'success');
        } else {
          this.error = response.message || 'Erreur lors du retrait';
        }
        this.fermerModalTpe();
      },
      error: (err) => {
        console.error('❌ Erreur retrait TPE:', err);
        this.error = err.error?.message || 'Erreur lors du retrait du TPE';
        this.fermerModalTpe();
      }
    });
  }
// Ajoutez cette propriété dans la classe
get isIncidentLieATicket(): boolean {
  return this.incident?.tickets && this.incident.tickets.length > 0;
}
get isIncidentModifiable(): boolean {
  // Un incident est modifiable si :
  // 1. Son statut est "Non traité" (valeur 0)
  // 2. ET il n'est pas lié à un ticket
  
  let estNonTraite = false;
  
  // Vérifier par la valeur numérique
  if (typeof this.incident?.statutIncident === 'number') {
    estNonTraite = this.incident.statutIncident === 0; // 0 = Non traité
  }
  // Vérifier par le libellé
  else if (typeof this.incident?.statutIncident === 'string') {
    estNonTraite = this.incident.statutIncident === 'NonTraite' ||
                   this.incident.statutIncident === '0';
  }
  // Vérifier par le libellé d'affichage
  else if (this.incident?.statutIncidentLibelle) {
    estNonTraite = this.incident.statutIncidentLibelle === 'Non traité';
  }
  
  // Si pas de statut du tout, considérer comme modifiable
  if (this.incident?.statutIncident === undefined || 
      this.incident?.statutIncident === null) {
    estNonTraite = true;
  }
  
  return estNonTraite && !this.isIncidentLieATicket;
}
  fermerModalTpe() {
    this.showDeleteTpeModal = false;
    this.tpeToDelete = null;
  }

  // Pour les entités
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

    // Préparer les données pour la modale
    const entite = this.incident.entitesImpactees[index];
    const label = this.getTypeEntiteLabel(entite.typeEntiteImpactee);
    
    this.entiteToDelete = {
      id: entiteId,
      index: index,
      label: label
    };
    this.showDeleteEntiteModal = true;
  }

  confirmerSuppressionEntite() {
    if (!this.entiteToDelete) return;

    console.log('🗑️ Suppression entité:', this.entiteToDelete.id);
    
    this.entiteService.removeFromIncident(this.entiteToDelete.id).subscribe({
      next: (response: ApiResponse<boolean>) => {
        console.log('✅ Réponse suppression:', response);
        
        if (response.isSuccess) {
          this.incident.entitesImpactees.splice(this.entiteToDelete!.index, 1);
          this.showTemporaryMessage('Entité supprimée avec succès', 'success');
        } else {
          this.error = response.message || 'Erreur lors de la suppression';
        }
        this.fermerModalEntite();
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
        this.fermerModalEntite();
      }
    });
  }

  fermerModalEntite() {
    this.showDeleteEntiteModal = false;
    this.entiteToDelete = null;
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
  
  // Charger l'incident et ses pièces jointes
  forkJoin({
    incident: this.incidentService.getIncidentDetails(id),
    piecesJointes: this.incidentService.getPiecesJointesByIncident(id)
  }).subscribe({
    next: (results) => {
      this.incident = results.incident;
      this.piecesJointesExistantes = results.piecesJointes;
      
      console.log('📦 Entités reçues:', this.incident.entitesImpactees);
      console.log('📦 TPEs reçus:', this.incident.tpEs);
      console.log('📦 Pièces jointes existantes:', this.piecesJointesExistantes);
      
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
      console.error('❌ Erreur:', err);
      this.error = 'Erreur lors du chargement de l\'incident.';
      this.loading = false;
    }
  });
}
// Dans incident-edit.component.ts, ajoutez ces propriétés avec les autres modales

showDeletePieceModal: boolean = false;
pieceToDelete: { id: string; index: number; nom: string } | null = null;
// Votre méthode est correcte
supprimerPieceJointe(pieceId: string, index: number) {
  if (!this.isAdmin) {
    this.error = 'Seul l\'administrateur peut supprimer des fichiers';
    return;
  }

  // Préparer les données pour la modale
  const piece = this.piecesJointesExistantes[index];
  const nomFichier = piece?.nomFichier || 'ce fichier';
  
  this.pieceToDelete = {
    id: pieceId,
    index: index,
    nom: nomFichier
  };
  this.showDeletePieceModal = true;
}
confirmerSuppressionPiece() {
  if (!this.pieceToDelete) return;

  console.log('🗑️ Suppression pièce jointe:', this.pieceToDelete.id);
  
  this.incidentService.supprimerPieceJointe(this.pieceToDelete.id).subscribe({
    next: (response) => {
      if (response.isSuccess) {
        this.piecesJointesExistantes.splice(this.pieceToDelete!.index, 1);
        this.showTemporaryMessage('Fichier supprimé avec succès', 'success');
      } else {
        this.error = response.message || 'Erreur lors de la suppression';
      }
      this.fermerModalPiece();
    },
    error: (err) => {
      console.error('❌ Erreur suppression:', err);
      this.error = err.error?.message || 'Erreur lors de la suppression';
      this.fermerModalPiece();
    }
  });
}

fermerModalPiece() {
  this.showDeletePieceModal = false;
  this.pieceToDelete = null;
}  // ========== SAUVEGARDE ==========
async save() {
  if (!this.incident) return;
  
  this.loading = true;
  this.error = null;

  try {
    // 1. Uploader les nouveaux fichiers
    const uploadOk = await this.uploaderFichiers();
    if (!uploadOk) {
      this.loading = false;
      return;
    }

    // 2. Sauvegarder les TPEs
    const tpesOk = await this.sauvegarderTpes();
    if (!tpesOk) {
      this.loading = false;
      return;
    }

    // 3. Ensuite mettre à jour l'incident
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

    console.log('📦 Mise à jour incident:', updateDto);

    this.incidentService.updateIncident(this.incident.id, updateDto).subscribe({
      next: (updated) => {
        console.log('✅ Incident mis à jour:', updated);
        this.loading = false;
        this.router.navigate(['/incidents', this.incident.id]);
      },
      error: (err: any) => {
        console.error('❌ Erreur:', err);
        // ✅ Passer le resultCode à showErrorDialog
        const resultCode = err.error?.resultCode;
        const errorMessage = err.error?.message || 'Erreur lors de la mise à jour.';
        this.showErrorDialog(errorMessage, resultCode);
        this.loading = false;
      }
    });

  } catch (error) {
    console.error('❌ Erreur:', error);
    this.error = 'Erreur lors de la sauvegarde';
    this.loading = false;
  }
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
    if (type === 'success') {
      this.successMessage = message;
      this.showSuccessModal = true;
      setTimeout(() => {
        this.showSuccessModal = false;
      }, 3000);
    } else {
      this.error = message;
      setTimeout(() => {
        this.error = null;
      }, 3000);
    }
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
      this.showError(`Le fichier ${file.name} dépasse la limite de 10MB`);
      return false;
    }
    return true;
  });

  // Vérifier la limite de nombre de fichiers
  if (this.selectedFiles.length + validFiles.length > this.maxFiles) {
    this.showError(`Vous ne pouvez pas ajouter plus de ${this.maxFiles} fichiers`);
    return;
  }

  // Ajouter les fichiers à la liste locale
  this.selectedFiles = [...this.selectedFiles, ...validFiles];
}

// Nouvelle méthode pour uploader les fichiers lors de la sauvegarde
// Dans incident-edit.component.ts

async uploaderFichiers(): Promise<boolean> {
  if (this.selectedFiles.length === 0) {
    return true;
  }
  
  this.uploadingFiles = true;
  this.uploadError = null;
  
  return new Promise((resolve) => {
    this.incidentService.ajouterPiecesJointes(this.incident.id, this.selectedFiles).subscribe({
      next: (response) => {
        if (response.isSuccess && response.data) {
          // Ajouter les nouvelles pièces jointes à la liste existante
          response.data.forEach((piece: PieceJointeDTO) => {
            this.piecesJointesExistantes.push(piece);
          });
          
          // Vider la liste des fichiers sélectionnés
          this.selectedFiles = [];
          
          this.showTemporaryMessage('Fichiers ajoutés avec succès', 'success');
          this.uploadingFiles = false;
          resolve(true);
        } else {
          this.uploadError = response.message || 'Erreur lors de l\'upload';
          this.showError(this.uploadError);
          this.uploadingFiles = false;
          resolve(false);
        }
      },
      error: (err) => {
        console.error('❌ Erreur upload:', err);
        this.uploadError = err.error?.message || 'Erreur lors de l\'upload des fichiers';
        // this.showError(this.uploadError);
        this.uploadingFiles = false;
        resolve(false);
      }
    });
  });
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
      return false;
    }
    return contentType.startsWith('image/');
  }

  openImage(url: string): void {
    window.open(url, '_blank');
  }

  private updateIncidentFiles(): void {
    this.incident.piecesJointes = this.selectedFiles as any;
  }
// Ajoutez cette propriété dans la classe IncidentEditComponent
get tpEsDisponiblesFiltres(): any[] {
  // Filtrer les TPEs qui ne sont pas déjà associés
  const tpesAssociesIds = this.incident.tpEs?.map(t => t.tpeId) || [];
  return this.tpEsDisponibles.filter(tpe => !tpesAssociesIds.includes(tpe.id));
}
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  // Dans IncidentEditComponent, ajoutez cette méthode pour gérer le changement de type de problème

onTypeProblemeChange() {
  if (!this.isAdmin && this.isCommercant) {
    // Seul le commerçant peut modifier le type de problème
    console.log('🔄 Type de problème changé:', this.typeProblemeString);
    
    // Afficher un message informatif
    this.showTemporaryMessage(
      'Le type de problème a été modifié. Les entités impactées seront automatiquement mises à jour lors de l\'enregistrement.',
      'success'
    );
    
    // Optionnel: Marquer que les entités ont changé pour rafraîchir l'affichage
    this.entitesImpacteesModifiees = true;
  }
}

// Ajoutez cette propriété
entitesImpacteesModifiees = false;

// Modifiez le template pour appeler onTypeProblemeChange
}