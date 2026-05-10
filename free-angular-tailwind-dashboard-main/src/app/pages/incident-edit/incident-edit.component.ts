import { Component, HostListener, OnInit } from '@angular/core';
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
// Dans IncidentEditComponent, ajoutez cette propriété
selectedEntiteValue: number | null = null;
  severiteStringToEnum: { [key: string]: SeveriteIncident } = {
    'Faible': SeveriteIncident.Faible,
    'Moyenne': SeveriteIncident.Moyenne,
    'Forte': SeveriteIncident.Forte
  };
  // Pour la sélection multiple des entités
hasChanges: boolean = false;
initialIncidentState: any = null;

  // Pour les fichiers
  selectedFiles: File[] = [];
  isDragActive = false;
  maxFileSize = 10 * 1024 * 1024; // 10MB
  maxFiles = 10;
piecesJointesExistantes: any[] = [];
selectedEntiteToAdd: TypeEntiteImpactee | null = null;
entitesAAjouter: TypeEntiteImpactee[] = []; // Liste des entités à ajouter (optionnel)
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
  
  refreshKey = 0;

  
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
      
      // ✅ Attendre que l'incident soit chargé avant de charger les TPEs
      const incidentId = this.route.snapshot.paramMap.get('id');
      if (incidentId) {
        this.loadIncident(incidentId, () => {
          // Callback après chargement de l'incident
          this.loadTpesDisponibles();
        });
      } else {
        this.loadTpesDisponibles();
      }
    },
    error: (err) => console.error('Erreur récupération rôle:', err)
  });
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
    next: (response: any) => {  // ⚠️ Utiliser 'any' pour éviter les erreurs de type
      console.log('📦 Réponse brute TPEs:', response);
      
      // ✅ CORRECTION: Extraire le tableau correctement
      let tpes: any[] = [];
      
      // Vérifier le type de response
      if (response === null || response === undefined) {
        tpes = [];
      }
      // Cas 1: Response est directement un tableau
      else if (Array.isArray(response)) {
        tpes = response;
        console.log('✅ Cas 1 - Response est un tableau');
      }
      // Cas 2: Response a une propriété 'data' qui est un tableau
      else if (response.data && Array.isArray(response.data)) {
        tpes = response.data;
        console.log('✅ Cas 2 - data est un tableau');
      }
      // Cas 3: Response a une propriété 'items' (pagination)
      else if (response.items && Array.isArray(response.items)) {
        tpes = response.items;
        console.log('✅ Cas 3 - items est un tableau');
      }
      // Cas 4: Response est un objet avec d'autres propriétés
      else if (typeof response === 'object') {
        // Chercher la première propriété qui est un tableau
        for (const key in response) {
          if (response.hasOwnProperty(key) && Array.isArray(response[key])) {
            tpes = response[key];
            console.log(`✅ Cas 4 - trouvé tableau dans propriété '${key}'`);
            break;
          }
        }
      }
      
      console.log('📦 TPEs extraits:', tpes);
      console.log('📦 TPEs déjà liés:', this.incident?.tpEs);
      
      // ✅ Filtrer pour exclure les TPEs déjà liés
      const tpesAssociesIds = this.incident?.tpEs?.map(t => t.tpeId) || [];
      this.tpEsDisponibles = (tpes || []).filter(tpe => !tpesAssociesIds.includes(tpe.id));
      
      console.log('📦 TPEs disponibles (non liés):', this.tpEsDisponibles.length);
      console.log('📦 Détails TPEs disponibles:', this.tpEsDisponibles);
      
      this.updateTpeOptions();
    },
    error: (err) => {
      console.error('❌ Erreur chargement TPEs:', err);
      this.tpEsDisponibles = [];
      this.tpeOptions = [];
      this.error = 'Impossible de charger la liste des TPEs';
    }
  });
}


// Dans incident-edit.component.ts, ajoutez ces propriétés :

// Pour la sélection multiple des entités
selectedEntitesValues: number[] = [];
showEntiteDropdown = false;
addingEntities = false;
entitiesAddedCount = 0;

// Méthodes pour la sélection multiple :



// Vérifier si une entité est sélectionnée
isEntiteSelected(value: any): boolean {
  const numValue = typeof value === 'string' ? parseInt(value, 10) : Number(value);
  return this.selectedEntitesValues.some(v => Number(v) === numValue);
}

// Basculer la sélection d'une entité
// Assurez-vous que cette méthode est correcte
// Dans toggleEntiteSelection, gardez les logs que vous avez déjà
toggleEntiteSelection(value: number) {
  const numValue = Number(value);
  console.log('🖱️ TOGGLE APPELÉ avec:', numValue);
  
  const index = this.selectedEntitesValues.findIndex(v => v === numValue);
  if (index === -1) {
    this.selectedEntitesValues = [...this.selectedEntitesValues, numValue];
  } else {
    this.selectedEntitesValues = this.selectedEntitesValues.filter(v => v !== numValue);
  }
  console.log('selectedEntitesValues après:', this.selectedEntitesValues);
  
  // ✅ Vérifier les changements
  this.checkForChanges();
}

// Retirer une entité de la sélection
removeSelectedEntite(value: number) {
  this.selectedEntitesValues = this.selectedEntitesValues.filter(v => v !== value);
}

// Effacer toutes les sélections
clearSelectedEntites() {
  this.selectedEntitesValues = [];
}

// Obtenir le libellé d'une entité à partir de son ID
getTypeEntiteLabelFromId(id: number): string {
  const mapping: { [key: number]: string } = {
    1: 'Machine TPE',
    2: 'Flux transactionnel',
    3: 'Réseau',
    4: 'Service applicatif'
  };
  return mapping[id] || 'Inconnu';
}

// Ajouter plusieurs entités à la fois
// Ajouter plusieurs entités à la fois
ajouterEntitesMultiples() {
  if (this.selectedEntitesValues.length === 0) {
    this.showTemporaryMessage('Veuillez sélectionner au moins une entité', 'error');
    return;
  }
  
  // Filtrer pour ne garder que les entités qui ne sont pas déjà impactées
  const entitesExistantes = (this.incident.entitesImpactees || []).map(e => {
    if (typeof e.typeEntiteImpactee === 'number') return e.typeEntiteImpactee;
    if (typeof e.typeEntiteImpactee === 'string') {
      const mapping: { [key: string]: number } = {
        'MachineTPE': 1, 'FluxTransactionnel': 2, 'Reseau': 3, 'ServiceApplicatif': 4
      };
      return mapping[e.typeEntiteImpactee] || 0;
    }
    return 0;
  });
  
  const entitesAAjouter = this.selectedEntitesValues.filter(id => !entitesExistantes.includes(id));
  
  if (entitesAAjouter.length === 0) {
    this.showTemporaryMessage('Toutes les entités sélectionnées sont déjà impactées', 'error');
    this.selectedEntitesValues = [];
    return;
  }
  
  if (entitesAAjouter.length !== this.selectedEntitesValues.length) {
    const dejaPresentes = this.selectedEntitesValues.filter(id => entitesExistantes.includes(id));
    const labels = dejaPresentes.map(id => this.getTypeEntiteLabelFromId(id)).join(', ');
    this.showTemporaryMessage(`Les entités suivantes sont déjà impactées: ${labels}`, 'warning');
  }
  
  this.addingEntities = true;
  this.entitiesAddedCount = 0;
  let successCount = 0;
  let errorCount = 0;
  
  entitesAAjouter.forEach((typeEntiteValue) => {
    this.entiteService.addToIncident(this.incident.id, typeEntiteValue).subscribe({
      next: (response) => {
        if (response.isSuccess && response.data) {
          if (!this.incident.entitesImpactees) {
            this.incident.entitesImpactees = [];
          }
          this.incident.entitesImpactees.push({
            id: response.data.id,
            typeEntiteImpactee: typeEntiteValue
          });
          successCount++;
        } else {
          errorCount++;
        }
        this.entitiesAddedCount++;
        
        // Quand toutes les requêtes sont terminées
        if (this.entitiesAddedCount === entitesAAjouter.length) {
          this.addingEntities = false;
          this.selectedEntitesValues = [];
          this.showEntiteDropdown = false;
          
          // ✅ Met à jour la liste des disponibles
          this.updateEntitesDisponibles();
          
          // ✅ Met à jour l'état initial après les ajouts
          this.initialIncidentState.entitesImpactees = JSON.parse(JSON.stringify(this.incident.entitesImpactees || []));
          
          // ✅ Vérifie les changements
          this.checkForChanges();
          
          if (successCount > 0) {
            this.showTemporaryMessage(
              `${successCount} entité(s) ajoutée(s) avec succès${errorCount > 0 ? `, ${errorCount} erreur(s)` : ''}`,
              'success'
            );
            // Scroll vers le haut pour voir le message
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } else {
            this.showTemporaryMessage(`Erreur lors de l'ajout des entités`, 'error');
          }
        }
      },
      error: (err) => {
        console.error(`Erreur ajout entité ${typeEntiteValue}:`, err);
        errorCount++;
        this.entitiesAddedCount++;
        
        if (this.entitiesAddedCount === entitesAAjouter.length) {
          this.addingEntities = false;
          this.selectedEntitesValues = [];
          this.showEntiteDropdown = false;
          
          // ✅ Met à jour la liste des disponibles même en cas d'erreur partielle
          this.updateEntitesDisponibles();
          
          // ✅ Met à jour l'état initial
          this.initialIncidentState.entitesImpactees = JSON.parse(JSON.stringify(this.incident.entitesImpactees || []));
          
          // ✅ Vérifie les changements
          this.checkForChanges();
          
          this.showTemporaryMessage(`${successCount} entité(s) ajoutée(s), ${errorCount} erreur(s)`, 'warning');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    });
  });
}


  // Mettre à jour les options du multi-select
updateTpeOptions() {
  this.tpeOptions = this.tpEsDisponibles.map(tpe => ({
    value: tpe.id,
    text: `${tpe.numSerieComplet} - ${tpe.modele}`,
    selected: false // Toujours false car ce sont les TPEs disponibles (non liés)
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
      }, 5000);
    }
  }

  // Dans incident-edit.component.ts, ajoutez cette méthode
onEntiteSelectionChange(value: any) {
  console.log('Sélection changée:', value);
  // Vous pouvez ajouter d'autres logiques ici si nécessaire
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
        
    this.showErrorDialog(' Impossible de modifier les TPEs : cet incident est déjà lié à un support.');
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
    this.showErrorDialog(' Impossible de modifier les TPEs : cet incident est déjà lié à un support.');
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
  
  this.loading = true;
  
  this.incidentService.retirerTpe(this.incident.id, this.tpeToDelete.id).subscribe({
    next: (response) => {
      if (response.isSuccess) {
        // ✅ Récupérer le TPE retiré pour le remettre dans la liste des disponibles
        const tpeRetire = this.incident.tpEs?.[this.tpeToDelete!.index];
        
        // ✅ Retirer de la liste des TPEs liés
        this.incident.tpEs?.splice(this.tpeToDelete!.index, 1);
        this.selectedTpeIds = this.selectedTpeIds.filter(id => id !== this.tpeToDelete!.id);
        
        // ✅ Remettre le TPE dans la liste des disponibles
        if (tpeRetire) {
          // Créer un objet TPE complet pour la liste des disponibles
          const tpeComplet = {
            id: tpeRetire.tpeId,
            numSerie: tpeRetire.numSerie,
            numSerieComplet: tpeRetire.numSerieComplet,
            modele: tpeRetire.modele,
            modeleNom: tpeRetire.modeleNom || tpeRetire.modele
          };
          this.tpEsDisponibles.push(tpeComplet);
        }
        
        // ✅ Mettre à jour les options
        this.updateTpeOptions();
        
        this.showTemporaryMessage(`TPE ${this.tpeToDelete!.label} retiré avec succès`, 'success');
      } else {
        this.error = response.message || 'Erreur lors du retrait';
      }
      this.loading = false;
      this.fermerModalTpe();
    },
    error: (err) => {
      console.error('❌ Erreur retrait TPE:', err);
      this.error = err.error?.message || 'Erreur lors du retrait du TPE';
      this.loading = false;
      this.fermerModalTpe();
    }
  });
}
showLinkTpeModal: boolean = false;
tpeToLink: { id: string; label: string; modele: string; numSerieComplet: string } | null = null;
/**
 * Confirmer la liaison d'un TPE (ouvre la modale)
 */
confirmerLierTpe(tpe: any) {
  this.tpeToLink = {
    id: tpe.id,
    label: tpe.numSerieComplet,
    modele: tpe.modele,
    numSerieComplet: tpe.numSerieComplet
  };
  this.showLinkTpeModal = true;
}

/**
 * Exécuter la liaison du TPE
 */
executerLierTpe() {
  if (!this.tpeToLink) return;

  console.log('➕ Ajout TPE via modale:', this.tpeToLink.id);
  
  if (this.isIncidentLieATicket) {
    this.showErrorDialog('Impossible de modifier les TPEs : cet incident est déjà lié à un support.');
    this.fermerModalLienTpe();
    return;
  }
  
  // ✅ Vérifier si le TPE est déjà dans la liste des TPEs liés
  const dejaLie = this.incident.tpEs?.some(t => t.tpeId === this.tpeToLink!.id) || false;
  if (dejaLie) {
    this.showTemporaryMessage(`Le TPE ${this.tpeToLink!.label} est déjà associé à cet incident`, 'error');
    this.fermerModalLienTpe();
    return;
  }
  
  // ✅ Vérifier si le TPE est encore disponible
  const tpeToujoursDisponible = this.tpEsDisponibles.some(t => t.id === this.tpeToLink!.id);
  if (!tpeToujoursDisponible) {
    this.showTemporaryMessage(`Le TPE ${this.tpeToLink!.label} n'est plus disponible`, 'error');
    this.fermerModalLienTpe();
    // Recharger les TPEs disponibles
    this.loadTpesDisponibles();
    return;
  }
  
  this.loading = true;
  
  this.incidentService.lierTpe(this.incident.id, this.tpeToLink.id).subscribe({
    next: (response) => {
      if (response.isSuccess && response.data && response.data.length > 0) {
        const tpeLieu = response.data[0];
        
        // Ajouter à la liste locale
        if (!this.incident.tpEs) {
          this.incident.tpEs = [];
        }
        
        // ✅ Double vérification avant d'ajouter
        const dejaExistant = this.incident.tpEs.some(t => t.tpeId === this.tpeToLink!.id);
        if (!dejaExistant) {
          this.incident.tpEs.push({
            tpeId: this.tpeToLink!.id,
            numSerie: this.tpeToLink!.label,
            numSerieComplet: this.tpeToLink!.numSerieComplet,
            modele: this.tpeToLink!.modele,
            modeleNom: this.tpeToLink!.modele,
            dateAssociation: new Date().toISOString()
          });
          
          // ✅ Retirer de la liste des disponibles
          this.tpEsDisponibles = this.tpEsDisponibles.filter(t => t.id !== this.tpeToLink!.id);
          this.updateTpeOptions();
          
          this.showTemporaryMessage(`TPE ${this.tpeToLink!.label} lié avec succès`, 'success');
          
          // ✅ Mettre à jour selectedTpeIds
          if (!this.selectedTpeIds.includes(this.tpeToLink!.id)) {
            this.selectedTpeIds.push(this.tpeToLink!.id);
            this.tpeIdsModifies = true;
          }
        } else {
          this.showTemporaryMessage(`Le TPE ${this.tpeToLink!.label} est déjà associé à cet incident`, 'error');
        }
        
        // ✅ Fermer la modale et le sélecteur
        this.fermerModalLienTpe();
        this.showTpeSelector = false;
        
      } else if (response.message && response.message.includes('déjà lié')) {
        // ✅ Cas où l'API retourne une erreur "déjà lié"
        this.showTemporaryMessage(`Le TPE ${this.tpeToLink!.label} est déjà associé à cet incident`, 'error');
        this.fermerModalLienTpe();
        
        // ✅ Rafraîchir les listes
        this.loadTpesDisponibles();
      } else {
        this.error = response.message || 'Erreur lors de la liaison';
        this.fermerModalLienTpe();
      }
      this.loading = false;
    },
    error: (err) => {
      console.error('❌ Erreur liaison TPE:', err);
      // ✅ Vérifier si l'erreur est "déjà lié"
      if (err.error?.message && err.error.message.includes('déjà lié')) {
        this.showTemporaryMessage(`Le TPE ${this.tpeToLink!.label} est déjà associé à cet incident`, 'error');
      } else {
        this.error = err.error?.message || 'Erreur lors de la liaison du TPE';
      }
      this.loading = false;
      this.fermerModalLienTpe();
      // ✅ Rafraîchir les listes
      this.loadTpesDisponibles();
    }
  });
}

/**
 * Fermer la modale de liaison
 */
fermerModalLienTpe() {
  this.showLinkTpeModal = false;
  this.tpeToLink = null;
}get isIncidentLieATicket(): boolean {
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
  // ✅ Empêcher la propagation de l'événement pour éviter toute action par défaut
  event?.stopPropagation();
  
  if (!this.isAdmin) {
    this.error = 'Seul l\'administrateur peut supprimer des entités';
    return;
  }
  
  if (!entiteId) {
    console.warn('⚠️ Entité sans ID - suppression locale seulement');
    this.incident.entitesImpactees.splice(index, 1);
    this.updateEntitesDisponibles(); // ← Ajoutez ceci
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

// APRÈS (corrigé) :
confirmerSuppressionEntite() {
  if (!this.entiteToDelete) return;

  this.entiteService.removeFromIncident(this.entiteToDelete.id).subscribe({
    next: (response: ApiResponse<boolean>) => {
      if (response.isSuccess) {
        this.incident.entitesImpactees.splice(this.entiteToDelete!.index, 1);
        this.updateEntitesDisponibles();
        this.showTemporaryMessage('Entité supprimée avec succès', 'success');
        
        // ✅ AJOUTEZ CETTE LIGNE - Met à jour l'état initial pour refléter la suppression
        this.initialIncidentState.entitesImpactees = JSON.parse(JSON.stringify(this.incident.entitesImpactees || []));
        
        // ✅ AJOUTEZ CETTE LIGNE - Vérifie les changements après suppression
        this.checkForChanges();
      } else {
        this.error = response.message || 'Erreur lors de la suppression';
      }
      this.fermerModalEntite();
    },
    error: (err: any) => {
      console.error('❌ Erreur:', err);
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

  // Méthode pour vérifier si des changements ont été effectués
checkForChanges() {
  if (!this.initialIncidentState || !this.incident) {
    this.hasChanges = false;
    return;
  }
  
  let hasAnyChange = false;
  
  // 1. Vérifier la description
  if (this.incident.descriptionIncident !== this.initialIncidentState.descriptionIncident) {
    hasAnyChange = true;
  }
  
  // 2. Vérifier le type de problème
  const currentTypeProbleme = this.typeProblemeStringToEnum[this.typeProblemeString] || this.typeProblemeString;
  const initialTypeProbleme = this.initialIncidentState.typeProbleme;
  if (currentTypeProbleme !== initialTypeProbleme) {
    hasAnyChange = true;
  }
  
  // 3. Vérifier la sévérité (pour Admin)
  if (this.isAdmin && this.severiteString) {
    const currentSeverite = this.severiteStringToEnum[this.severiteString] || this.severiteString;
    const initialSeverite = this.initialIncidentState.severiteIncident;
    if (currentSeverite !== initialSeverite) {
      hasAnyChange = true;
    }
  }
  
  // 4. Vérifier les entités impactées
  const currentEntitesCount = this.incident.entitesImpactees?.length || 0;
  const initialEntitesCount = this.initialIncidentState.entitesImpactees?.length || 0;
  if (currentEntitesCount !== initialEntitesCount) {
    hasAnyChange = true;
  }
  
  // 5. Vérifier les TPEs (si modifications en attente)
  if (this.tpeIdsModifies) {
    hasAnyChange = true;
  }
  
  // 6. Vérifier les nouveaux fichiers à uploader
  if (this.selectedFiles.length > 0) {
    hasAnyChange = true;
  }
  
  this.hasChanges = hasAnyChange;
  console.log('🔄 Changements détectés:', this.hasChanges);
}

  // ========== CHARGEMENT DE L'INCIDENT ==========

loadIncident(id: string, callback?: () => void) {
  this.loading = true;
  
  forkJoin({
    incident: this.incidentService.getIncidentDetails(id),
    piecesJointes: this.incidentService.getPiecesJointesByIncident(id)
  }).subscribe({
    next: (results) => {
      this.incident = results.incident;
      this.updateEntitesDisponibles();
      this.piecesJointesExistantes = results.piecesJointes;
      
      // ✅ Sauvegarder l'état initial de l'incident
      this.initialIncidentState = {
        descriptionIncident: this.incident.descriptionIncident,
        typeProbleme: this.incident.typeProbleme,
        severiteIncident: this.incident.severiteIncident,
        entitesImpactees: JSON.parse(JSON.stringify(this.incident.entitesImpactees || [])),
        tpEs: JSON.parse(JSON.stringify(this.incident.tpEs || []))
      };
      
      // Initialiser hasChanges à false
      this.hasChanges = false;
      
      console.log('📦 Incident chargé:', this.incident.codeIncident);
      console.log('📦 Entités impactées:', this.incident.entitesImpactees?.length || 0);
      console.log('📦 TPEs associés:', this.incident.tpEs?.length || 0);
      
      // Initialiser les TPEs liés
      if (this.incident.tpEs) {
        this.selectedTpeIds = this.incident.tpEs.map(tpe => tpe.tpeId);
      } else {
        this.incident.tpEs = [];
        this.selectedTpeIds = [];
      }
      
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
      
      this.loading = false;
      
      if (callback) {
        callback();
      }
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
// ========== GESTION DES FICHIERS ==========

// Méthode pour supprimer une pièce jointe
supprimerPieceJointe(pieceId: string, index: number) {
  // ✅ Règle 1: Si incident lié à un ticket → suppression impossible pour tous
  if (this.isIncidentLieATicket) {
    this.error = this.isCommercant 
      ? 'Impossible de supprimer des fichiers : cet incident est déjà lié à un support.'
      : 'Impossible de supprimer des fichiers : cet incident est déjà lié à un ticket.';
    return;
  }
  
  // ✅ Règle 2: Admin peut supprimer (incident non lié)
  if (this.isAdmin) {
    const piece = this.piecesJointesExistantes[index];
    const nomFichier = piece?.nomFichier || 'ce fichier';
    
    this.pieceToDelete = {
      id: pieceId,
      index: index,
      nom: nomFichier
    };
    this.showDeletePieceModal = true;
    return;
  }
  
  // ✅ Règle 3: Commerçant peut supprimer (incident non lié)
  if (this.isCommercant && !this.isIncidentLieATicket) {
    const piece = this.piecesJointesExistantes[index];
    const nomFichier = piece?.nomFichier || 'ce fichier';
    
    this.pieceToDelete = {
      id: pieceId,
      index: index,
      nom: nomFichier
    };
    this.showDeletePieceModal = true;
    return;
  }
  
  this.error = 'Vous n\'avez pas les droits pour supprimer ce fichier.';
}

// Méthode pour vérifier si l'utilisateur peut ajouter des fichiers
canAddFiles(): boolean {
  // ✅ Admin: ne peut JAMAIS ajouter de fichiers
  if (this.isAdmin) {
    return false;
  }
  
  // ✅ Commerçant: peut ajouter SEULEMENT si incident non lié
  if (this.isCommercant) {
    return !this.isIncidentLieATicket;
  }
  
  return false;
}

// Méthode pour vérifier si l'utilisateur peut supprimer des fichiers
canDeleteFiles(): boolean {
  // ✅ Si incident lié à un ticket → personne ne peut supprimer
  if (this.isIncidentLieATicket) {
    return false;
  }
  
  // ✅ Admin peut supprimer (incident non lié)
  if (this.isAdmin) {
    return true;
  }
  
  // ✅ Commerçant peut supprimer (incident non lié)
  if (this.isCommercant) {
    return true;
  }
  
  return false;
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
  
  // ✅ VALIDATION AU DÉBUT - Avant toute action
  if (!this.incident.descriptionIncident || this.incident.descriptionIncident.length < 10) {
    this.error = 'La description doit contenir au moins 10 caractères';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  
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

    // 3. Préparer les données de mise à jour
    const updateDto: any = {};

    if (this.incident.descriptionIncident !== undefined) {
      updateDto.descriptionIncident = this.incident.descriptionIncident;
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

    // 4. Mettre à jour l'incident
    this.incidentService.updateIncident(this.incident.id, updateDto).subscribe({
      next: (updated) => {
        console.log('✅ Incident mis à jour:', updated);
        
        // ✅ Afficher le message de succès
        this.successMessage = 'Incident modifié avec succès !';
        
        // ✅ Désactiver le loading
        this.loading = false;
        
        // ✅ Rediriger après 5 secondes
        setTimeout(() => {
          this.router.navigate(['/incidents']);
        }, 5000);
      },
      error: (err: any) => {
        console.error('❌ Erreur:', err);
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

// Dans la méthode ajouterEntite, ajoutez ces logs
// Dans incident-edit.component.ts

ajouterEntite() {
  console.log('=== AJOUT ENTITÉ ===');
  console.log('selectedEntiteValue AVANT conversion:', this.selectedEntiteValue);
  console.log('Type de selectedEntiteValue:', typeof this.selectedEntiteValue);
  
  if (!this.isAdmin) {
    this.showTemporaryMessage('Action réservée aux administrateurs', 'error');
    return;
  }
  
  if (!this.selectedEntiteValue) {
    this.showTemporaryMessage('Veuillez sélectionner une entité', 'error');
    return;
  }
  
  // ✅ CORRECTION CRITIQUE: Convertir correctement la valeur
  let typeEntiteValue: number;
  
  // Si c'est une string, la convertir en nombre
  if (typeof this.selectedEntiteValue === 'string') {
    typeEntiteValue = parseInt(this.selectedEntiteValue, 10);
  } else {
    typeEntiteValue = this.selectedEntiteValue;
  }
  
  console.log('typeEntiteValue APRÈS conversion:', typeEntiteValue);
  
  // Vérifier si c'est un nombre valide
  if (isNaN(typeEntiteValue) || typeEntiteValue < 1 || typeEntiteValue > 4) {
    this.showTemporaryMessage('Type d\'entité invalide', 'error');
    return;
  }
  
  // Vérifier si l'entité existe déjà (en comparant les NOMBRES)
  const entitesExistantes = (this.incident.entitesImpactees || []).map(e => {
    // Normaliser en nombre
    if (typeof e.typeEntiteImpactee === 'number') {
      return e.typeEntiteImpactee;
    }
    if (typeof e.typeEntiteImpactee === 'string') {
      // Convertir la string en nombre via le mapping
      const mapping: { [key: string]: number } = {
        'MachineTPE': 1,
        'FluxTransactionnel': 2,
        'Reseau': 3,
        'ServiceApplicatif': 4
      };
      return mapping[e.typeEntiteImpactee] || 0;
    }
    return 0;
  });
  
  console.log('entitesExistantes (nombres):', entitesExistantes);
  console.log('typeEntiteValue à ajouter:', typeEntiteValue);
  
  if (entitesExistantes.includes(typeEntiteValue)) {
    const label = this.getTypeEntiteLabelFromNumber(typeEntiteValue);
    this.showTemporaryMessage(`L'entité "${label}" est déjà impactée par cet incident`, 'error');
    this.selectedEntiteValue = null;
    return;
  }
  
  this.loading = true;
  this.refreshKey++;

  // ✅ Envoyer la valeur numérique, pas la string
  console.log('📦 Payload envoyé à l\'API:', {
    incidentId: this.incident.id,
    typeEntiteImpactee: typeEntiteValue
  });
  
  this.entiteService.addToIncident(this.incident.id, typeEntiteValue).subscribe({
    next: (response) => {
      this.loading = false;
      console.log('✅ Réponse API:', response);
      
      if (response.isSuccess && response.data) {
        if (!this.incident.entitesImpactees) {
          this.incident.entitesImpactees = [];
        }
        
        // ✅ Ajouter l'entité avec la valeur numérique
        this.incident.entitesImpactees.push({
          id: response.data.id,
          typeEntiteImpactee: typeEntiteValue as TypeEntiteImpactee
        });
        
        this.selectedEntiteValue = null;
        this.incident = { ...this.incident }; // Force refresh
        
        const label = this.getTypeEntiteLabelFromNumber(typeEntiteValue);
        this.showTemporaryMessage(`Entité "${label}" ajoutée avec succès`, 'success');
      } else {
        this.showTemporaryMessage(response.message || 'Erreur lors de l\'ajout', 'error');
      }
    },
    error: (err) => {
      this.loading = false;
      console.error('❌ Erreur ajout entité:', err);
      console.error('Détails erreur:', err.error);
      this.showTemporaryMessage(err.error?.message || 'Erreur lors de l\'ajout de l\'entité', 'error');
    }
  });
}

// Méthode utilitaire pour obtenir le libellé à partir d'un nombre
getTypeEntiteLabelFromNumber(type: number): string {
  const mapping: { [key: number]: string } = {
    1: 'Machine TPE',
    2: 'Flux transactionnel',
    3: 'Réseau',
    4: 'Service applicatif'
  };
  return mapping[type] || 'Inconnu';
}
trackByOption(index: number, option: any): number {
  return option.value;
}
// Ajoutez cette méthode pour ajouter plusieurs entités d'un coup (optionnel)
ajouterPlusieursEntites() {
  if (!this.isAdmin) return;
  if (this.entitesAAjouter.length === 0) {
    this.showTemporaryMessage('Veuillez sélectionner au moins une entité', 'error');
    return;
  }
  
  // Filtrer pour éviter les doublons
  const entitesExistantes = this.incident.entitesImpactees?.map(e => e.typeEntiteImpactee) || [];
  const entitesNouvelles = this.entitesAAjouter.filter(e => !entitesExistantes.includes(e));
  
  if (entitesNouvelles.length === 0) {
    this.showTemporaryMessage('Toutes ces entités sont déjà impactées', 'error');
    this.entitesAAjouter = [];
    return;
  }
  
  // Ajouter chaque entité
  let ajoutees = 0;
  let erreurs = 0;
  
  entitesNouvelles.forEach(typeEntite => {
    this.entiteService.addToIncident(this.incident.id, typeEntite).subscribe({
      next: (response) => {
        if (response.isSuccess && response.data) {
          if (!this.incident.entitesImpactees) {
            this.incident.entitesImpactees = [];
          }
          this.incident.entitesImpactees.push({
            id: response.data.id,
            typeEntiteImpactee: response.data.typeEntiteImpactee
          });
          ajoutees++;
        } else {
          erreurs++;
        }
        
        if (ajoutees + erreurs === entitesNouvelles.length) {
          this.showTemporaryMessage(`${ajoutees} entité(s) ajoutée(s) avec succès${erreurs > 0 ? `, ${erreurs} erreur(s)` : ''}`, 'success');
          this.entitesAAjouter = [];
        }
      },
      error: (err) => {
        console.error('Erreur ajout entité:', err);
        erreurs++;
        if (ajoutees + erreurs === entitesNouvelles.length) {
          this.showTemporaryMessage(`${ajoutees} entité(s) ajoutée(s)${erreurs > 0 ? `, ${erreurs} échec(s)` : ''}`, 'success');
          this.entitesAAjouter = [];
        }
      }
    });
  });
}
// Ajoutez cette propriété avec les autres
// Dans votre composant, ajoutez ce getter et loggez les valeurs
// Supprimez l'ancien getter et remplacez-le par cette version simplifiée
// Dans incident-edit.component.ts

// Remplacez le getter par une propriété simple
entitesDisponibles: { value: number; label: string }[] = [];

// Appelez cette méthode après chaque changement d'entitesImpactees
updateEntitesDisponibles() {
  const toutesOptions = [
    { value: 1, label: 'Machine TPE' },
    { value: 2, label: 'Flux transactionnel' },
    { value: 3, label: 'Réseau' },
    { value: 4, label: 'Service applicatif' }
  ];

  if (!this.incident?.entitesImpactees || this.incident.entitesImpactees.length === 0) {
    this.entitesDisponibles = [...toutesOptions];
    return;
  }

  const entitesExistantes: number[] = this.incident.entitesImpactees.map(e => {
    if (typeof e.typeEntiteImpactee === 'number') return e.typeEntiteImpactee;
    const mapping: { [key: string]: number } = {
      'MachineTPE': 1, 'FluxTransactionnel': 2, 'Reseau': 3, 'ServiceApplicatif': 4
    };
    return mapping[e.typeEntiteImpactee as string] || 0;
  });

  this.entitesDisponibles = toutesOptions.filter(o => !entitesExistantes.includes(o.value));
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

// Ajoutez cette propriété pour les timeouts
private messageTimeout: any = null;

showTemporaryMessage(message: string, type: 'success' | 'error' | 'warning' = 'success') {
  // ✅ Annuler le timeout précédent
  if (this.messageTimeout) {
    clearTimeout(this.messageTimeout);
  }
  
  if (type === 'success') {
    this.successMessage = message;
    this.messageTimeout = setTimeout(() => {
      this.successMessage = '';
      this.messageTimeout = null;
    }, 5000);
  } else if (type === 'warning') {
    // Afficher comme erreur ou créer une variable dédiée
    this.error = message;
    // Optionnel: changer la couleur pour orange
    this.messageTimeout = setTimeout(() => {
      this.error = null;
      this.messageTimeout = null;
    }, 5000); // Plus long pour les warnings
  } else {
    this.error = message;
    this.messageTimeout = setTimeout(() => {
      this.error = null;
      this.messageTimeout = null;
    }, 5000);
  }
}

  cancel() {
    this.router.navigate(['/incidents']);
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