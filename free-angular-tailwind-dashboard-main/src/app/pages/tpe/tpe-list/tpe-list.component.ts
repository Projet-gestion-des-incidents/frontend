import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../../../shared/components/ui/button/button.component';
import { RouterLink, RouterModule } from "@angular/router";
import { TPEService } from '../../../shared/services/tpe.service';
import { UserService } from '../../../shared/services/user.service';
import { BadgeColor, BadgeComponent } from '../../../shared/components/ui/badge/badge.component';
import { AlertComponent } from '../../../shared/components/ui/alert/alert.component';

@Component({
  selector: 'app-tpe-list',
  standalone: true,
  imports: [ButtonComponent, CommonModule, RouterModule, BadgeComponent, AlertComponent],
  templateUrl: './tpe-list.component.html',
})
export class TpeListComponent implements OnInit {
  tpes: any[] = [];
  userRole: string = '';
  loading = true;
  
  alert = {
    show: false,
    variant: 'info' as 'success' | 'error' | 'warning' | 'info',
    title: '',
    message: ''
  };
  
  tpeToDeleteId: string | null = null;

  constructor(
    private tpeService: TPEService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    // Récupérer le rôle de l'utilisateur connecté
    this.userService.getMyProfile().subscribe({
      next: (user) => {
        this.userRole = user.role;
        this.loadTPEs();
      },
      error: (err) => {
        console.error('Erreur récupération profil:', err);
        this.loading = false;
      }
    });
  }

  loadTPEs() {
    this.loading = true;
    
    // Selon le rôle, appeler la méthode appropriée
    if (this.userRole === 'Admin') {
      // Admin voit TOUS les TPEs
      this.tpeService.getAllTPEs().subscribe({
        next: (res: any) => {
          // Adapter selon la structure de réponse
          this.tpes = res.data || res || [];
          this.loading = false;
        },
        error: err => {
          console.error('Erreur chargement TPEs (Admin):', err);
          this.loading = false;
        }
      });
    } else if (this.userRole === 'Commercant') {
      // Commerçant voit SES TPEs
      this.tpeService.getMyTpes().subscribe({
        next: (tpes) => {
          this.tpes = tpes;
          this.loading = false;
        },
        error: err => {
          console.error('Erreur chargement TPEs (Commercant):', err);
          this.loading = false;
        }
      });
    } else {
      // Autres rôles (Technicien, etc.) - pas d'accès
      this.tpes = [];
      this.loading = false;
    }
  }

  getBadgeColor(modele: string): BadgeColor {
    const map: Record<string, BadgeColor> = {
      'Ingenico': 'info',
      'Verifone': 'primary',
      'PAX': 'warning'
    };

    const key = modele?.trim() || '';
    return map[key] ?? 'dark';
  }

  // Vérifier si l'utilisateur peut modifier/supprimer
  canManage(): boolean {
    return this.userRole === 'Admin';
  }

  deleteTPE(id: string) {
    if (!this.canManage()) {
      this.alert = {
        show: true,
        variant: 'error',
        title: 'Accès refusé',
        message: 'Seuls les administrateurs peuvent supprimer des TPEs'
      };
      return;
    }

    this.tpeToDeleteId = id;
    this.alert = {
      show: true,
      variant: 'warning',
      title: 'Confirmation',
      message: 'Voulez-vous vraiment supprimer ce TPE ?'
    };
  }

  confirmDelete() {
    if (!this.tpeToDeleteId) return;

    this.tpeService.deleteTPE(this.tpeToDeleteId).subscribe({
      next: () => {
        this.alert = {
          show: true,
          variant: 'success',
          title: 'Succès',
          message: 'TPE supprimé avec succès'
        };
        this.loadTPEs();
        this.tpeToDeleteId = null;
      },
      error: (err) => {
        this.alert = {
          show: true,
          variant: 'error',
          title: 'Erreur',
          message: 'Erreur lors de la suppression du TPE'
        };
        console.error(err);
      }
    });
  }

  cancelDelete() {
    this.alert.show = false;
    this.tpeToDeleteId = null;
  }

  // Formatter le nom du commerçant
  formatCommercant(tpe: any): string {
    if (this.userRole === 'Admin') {
      return tpe.commercantNom || 'Non assigné';
    }
    // Pour le commerçant, on n'affiche pas la colonne ou on met "Vous"
    return 'Vous';
  }
}