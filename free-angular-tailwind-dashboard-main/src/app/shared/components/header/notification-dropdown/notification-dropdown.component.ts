// notification-dropdown.component.ts
import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterModule, NavigationStart } from '@angular/router';
import { DropdownComponent } from '../../ui/dropdown/dropdown.component';
import { DropdownItemComponent } from '../../ui/dropdown/dropdown-item/dropdown-item.component';
import { NotificationService, Notification } from '../../../services/notification.service';
import { Subscription, interval } from 'rxjs';

@Component({
  selector: 'app-notification-dropdown',
  templateUrl: './notification-dropdown.component.html',
  styleUrls: [],
  imports: [CommonModule, RouterModule, DropdownComponent, DropdownItemComponent]
})
export class NotificationDropdownComponent implements OnInit, OnDestroy {
  isOpen = false;
  notifications: Notification[] = [];
  unreadCount = 0;
  isLoading = false;
  private refreshSubscription?: Subscription;
  private isComponentAlive = true;
  private lastClickedNotificationId: string | null = null; // ✅ Éviter les doublons
  displayLimit = 5;  // Nombre de notifications affichées initialement
  allNotifications: Notification[] = [];  // Stocker toutes les notifications
  showAll = false;  // Afficher toutes ou non
confirmDeleteAll = false;
confirmDeleteNotification: Notification | null = null;
deletingAllNotifications = false;
deletingNotification = false;
successMessage: string = '';
  private successMessageTimeout: any;


  constructor(
    private notificationService: NotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadNotifications();
    this.loadUnreadCount();
    
    this.refreshSubscription = interval(30000).subscribe(() => {
      if (this.isComponentAlive && !this.isOpen) {
        this.loadNotifications();
        this.loadUnreadCount();
      }
    });
  }

  ngOnDestroy(): void {
    this.isComponentAlive = false;
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
      this.refreshSubscription = undefined;
    }
    if (this.successMessageTimeout) {
      clearTimeout(this.successMessageTimeout);
    }
  }

toggleDropdown() {
  this.isOpen = !this.isOpen;
  
  if (this.isOpen) {
    this.showAll = false;  // Réinitialiser l'affichage
    this.loadNotifications();
    
    // ✅ CACHER LE COMPTEUR VISUELLEMENT (sans appeler l'API)
    // Le compteur disparaît de la cloche, mais les notifications restent "non lues" côté serveur
    this.unreadCount = 0;
  }
}
  
  closeDropdown() {
    this.isOpen = false;
  }

loadNotifications() {
  if (this.isLoading) return;
  
  this.isLoading = true;
  this.notificationService.getMyNotifications().subscribe({
    next: (data) => {
      if (this.isComponentAlive) {
        this.allNotifications = data;
        this.updateDisplayedNotifications();
        this.isLoading = false;
      }
    },
    error: (err) => {
      if (this.isComponentAlive) {
        console.error('Erreur chargement notifications:', err);
        this.isLoading = false;
      }
    }
  });
}

updateDisplayedNotifications() {
  if (this.showAll) {
    this.notifications = [...this.allNotifications];
  } else {
    this.notifications = this.allNotifications.slice(0, this.displayLimit);
  }
}

// Ajoutez cette méthode pour charger plus
loadMore() {
  this.showAll = true;
  this.updateDisplayedNotifications();
}

  loadUnreadCount() {
    this.notificationService.getUnreadCount().subscribe({
      next: (count) => {
        if (this.isComponentAlive) {
          this.unreadCount = count;
        }
      },
      error: (err) => {
        if (this.isComponentAlive) {
          console.error('Erreur chargement compteur:', err);
        }
      }
    });
  }

  // ✅ Version corrigée de la redirection
onNotificationClick(notification: Notification) {
  if (this.lastClickedNotificationId === notification.id) return;
  this.lastClickedNotificationId = notification.id;
  setTimeout(() => { this.lastClickedNotificationId = null; }, 500);

  // Marquer comme lu si non lu
  if (!notification.estLu) {
    this.notificationService.markAsRead(notification.id).subscribe({
      next: () => {
        notification.estLu = true;
        this.unreadCount = Math.max(0, this.unreadCount - 1);
        // Mettre à jour dans toutes les listes
        const allNotif = this.allNotifications.find(n => n.id === notification.id);
        if (allNotif) allNotif.estLu = true;
      },
      error: (err) => console.error('Erreur marquage:', err)
    });
  }
  
  this.closeDropdown();
  this.redirectToDetail(notification);
}

private redirectToDetail(notification: Notification): void {
  console.log('=== REDIRECTION NOTIFICATION ===');
  console.log('Notification reçue:', {
    id: notification.id,
    type: notification.typeNotification,
    typeName: notification.typeNotificationName,
    titre: notification.titre,
    ticketId: notification.ticketId,
    incidentId: notification.incidentId,
    commentaireId: notification.commentaireId,
    tpeId: notification.tpeId
  });

  let url: string | null = null;
  let redirectReason = '';
  
  // Sinon commentaire
  if (notification.commentaireId && notification.ticketId) {
    url = `/tickets/${notification.ticketId}/commentaires`;
    redirectReason = 'Commentaire détecté - Redirection vers la liste des commentaires';
    console.log(`✅ Redirection vers COMMENTAIRES du ticket: ${url}`);
  }
  // Priorité au ticket si présent
  else if (notification.ticketId) {
    url = `/tickets/${notification.ticketId}`;
    redirectReason = 'Ticket détecté';
    console.log(`✅ Redirection vers TICKET: ${url}`);
  }
  // Sinon incident
  else if (notification.incidentId) {
    url = `/incidents/${notification.incidentId}`;
    redirectReason = 'Incident détecté';
    console.log(`✅ Redirection vers INCIDENT: ${url}`);
  }
  
  // Sinon TPE
  else if (notification.tpeId || 
           notification.typeNotification === 10 || 
           
           notification.typeNotificationName === 'TPECree') {
    url = `/tpes`;
    redirectReason = `TPE détecté (type: ${notification.typeNotification}, typeName: ${notification.typeNotificationName})`;
    console.log(`✅ Redirection vers LISTE DES TPES: ${url}`);
  }
  else {
    console.warn('⚠️ Aucune cible de redirection détectée pour cette notification');
    console.log('   Notification complète:', JSON.stringify(notification, null, 2));
  }
  
  if (url) {
    console.log(`🚀 Exécution de la redirection vers: ${url}`);
    console.log(`   Raison: ${redirectReason}`);
    
    const currentUrl = this.router.url;
    console.log(`   URL actuelle: ${currentUrl}`);
    
    // ✅ Solution 1 : Utiliser navigateByUrl avec skipLocationChange pour forcer le rechargement
    console.log('   → Utilisation de navigateByUrl avec skipLocationChange');
    this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
      console.log(`   → Navigation intermédiaire vers '/' terminée`);
      this.router.navigate([url]).then(() => {
        console.log(`   ✅ Redirection finale vers ${url} réussie`);
      }).catch(err => {
        console.error(`   ❌ Erreur lors de la redirection vers ${url}:`, err);
      });
    }).catch(err => {
      console.error(`   ❌ Erreur lors de la navigation intermédiaire:`, err);
    });
    
    this.closeDropdown();
    console.log('   → Dropdown fermé');
  } else {
    console.error('❌ Aucune URL générée, impossible de rediriger');
  }
  
  console.log('=== FIN REDIRECTION ===');
}

// Nouvelle méthode pour confirmer la suppression de toutes
executeDeleteAll() {
    this.deletingAllNotifications = true;
    
    this.notificationService.deleteAllMyNotifications().subscribe({
      next: (response) => {
        console.log('✅ Toutes les notifications supprimées:', response);
        this.allNotifications = [];
        this.notifications = [];
        this.unreadCount = 0;
        this.showAll = false;
        this.deletingAllNotifications = false;
        this.confirmDeleteAll = false;
        
        // ✅ Afficher le message de succès
        this.showSuccessMessage('Toutes les notifications ont été supprimées avec succès');
      },
      error: (err) => {
        console.error('❌ Erreur lors de la suppression de toutes les notifications:', err);
        this.deletingAllNotifications = false;
        this.confirmDeleteAll = false;
        
        // ✅ Afficher un message d'erreur
        this.showSuccessMessage('Erreur lors de la suppression des notifications', true);
      }
    });
  }

// ✅ Ouvre le modal de confirmation
deleteAllNotifications() {
  if (this.allNotifications.length === 0) {
    return;
  }
  this.confirmDeleteAll = true;
}



// Nouvelle méthode pour annuler la suppression de toutes
closeDeleteAllModal() {
  this.confirmDeleteAll = false;
  this.deletingAllNotifications = false;
}

  markAsRead(notificationId: string, event: Event) {
    event.stopPropagation();
    this.notificationService.markAsRead(notificationId).subscribe({
      next: () => {
        const notif = this.notifications.find(n => n.id === notificationId);
        if (notif) {
          notif.estLu = true;
          this.unreadCount = Math.max(0, this.unreadCount - 1);
        }
      },
      error: (err) => console.error('Erreur marquage lecture:', err)
    });
  }

  markAllAsRead() {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.notifications.forEach(n => n.estLu = true);
        this.unreadCount = 0;
      },
      error: (err) => console.error('Erreur marquage tout lu:', err)
    });
  }

  deleteNotification(notificationId: string, event: Event) {
  event.stopPropagation();
  
  const notification = this.allNotifications.find(n => n.id === notificationId);
  if (notification) {
    this.confirmDeleteNotification = notification;
  }
}

executeDeleteSingle() {
    if (!this.confirmDeleteNotification) return;
    
    this.deletingNotification = true;
    const notificationId = this.confirmDeleteNotification.id;
    const deletedNotification = this.confirmDeleteNotification;
    
    this.notificationService.deleteNotification(notificationId).subscribe({
      next: () => {
        this.allNotifications = this.allNotifications.filter(n => n.id !== notificationId);
        this.notifications = this.notifications.filter(n => n.id !== notificationId);
        
        if (!deletedNotification.estLu) {
          this.unreadCount = Math.max(0, this.unreadCount - 1);
        }
        
        this.deletingNotification = false;
        this.confirmDeleteNotification = null;
        
        // ✅ Afficher le message de succès
        this.showSuccessMessage(`Notification "${deletedNotification.titre.substring(0, 50)}" supprimée avec succès`);
      },
      error: (err) => {
        console.error('Erreur suppression:', err);
        this.deletingNotification = false;
        this.confirmDeleteNotification = null;
        
        // ✅ Afficher un message d'erreur
        this.showSuccessMessage('Erreur lors de la suppression de la notification', true);
      }
    });
  }
private showSuccessMessage(message: string, isError: boolean = false) {
    this.successMessage = message;
    
    // Appliquer la classe CSS appropriée selon le type
    const container = document.querySelector('.notification-success-message');
    if (container) {
      if (isError) {
        container.classList.add('error');
      } else {
        container.classList.remove('error');
      }
    }
    
    // Effacer automatiquement après 5 secondes
    if (this.successMessageTimeout) {
      clearTimeout(this.successMessageTimeout);
    }
    this.successMessageTimeout = setTimeout(() => {
      this.successMessage = '';
    }, 5000);
  }
// Nouvelle méthode pour annuler la suppression individuelle
closeDeleteSingleModal() {
  this.confirmDeleteNotification = null;
  this.deletingNotification = false;
}

  // ✅ Méthode pour obtenir l'icône SVG
 // notification-dropdown.component.ts
// ✅ Remplacer getNotificationIconSvg par une méthode qui retourne juste le type
getNotificationIconType(typeNotification: number): string {
  const iconTypes: { [key: number]: string } = {
    1: 'ticket',
    2: 'assign',
    3: 'edit',
    4: 'resolved',
    5: 'incident',
    6: 'incident-resolved',
    7: 'comment',
    8: 'reminder',
    9: 'incident-edit',
    10: 'tpe'
  };
  return iconTypes[typeNotification] || 'default';
}

// notification-dropdown.component.ts
// Remplacez la méthode formatDate par celle-ci

// notification-dropdown.component.ts
// Remplacez la méthode formatDate par celle-ci

formatDate(date: Date | string): string {
  if (!date) return '';
  
  // ✅ SOLUTION 1 : Forcer l'interprétation comme UTC
  let notifDate: Date;
  
  if (typeof date === 'string') {
    // Si la date n'a pas d'indicateur de fuseau, on ajoute 'Z' pour UTC
    if (date.includes('T') && !date.includes('Z') && !date.includes('+')) {
      notifDate = new Date(date + 'Z');
    } else {
      notifDate = new Date(date);
    }
  } else {
    notifDate = date;
  }
  
  // Vérifier si la date est valide
  if (isNaN(notifDate.getTime())) return '';
  
  const now = new Date();
  const diffMs = now.getTime() - notifDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

 

  if (diffMins < 1) return "À l'instant";
  if (diffMins < 60) return `Il y a ${diffMins} minute${diffMins > 1 ? 's' : ''}`;
  if (diffHours < 24) return `Il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`;
  if (diffDays === 1) return 'Hier';
  return `Il y a ${diffDays} jours`;
}

// notification-dropdown.component.ts
// notification-dropdown.component.ts
// notification-dropdown.component.ts
getTypeLabel(typeNotificationName: string): string {
  const labels: { [key: string]: string } = {
    'TicketCree': 'Ticket créé',
    'TicketAssigne': 'Ticket assigné',
    'TicketModifie': 'Ticket modifié',
    'TicketEnCours': 'Ticket en cours',     // ✅ NOUVEAU
    'TicketCloture': 'Ticket résolu',
    'IncidentCree': 'Incident créé',
    'IncidentEnCours': 'Incident en cours', // ✅ NOUVEAU
    'IncidentResolu': 'Incident résolu',
    'IncidentModifie': 'Incident modifié',
    'CommentaireAjoute': 'Commentaire',
    'Rappel': 'Rappel',
    'TPECree': 'TPE ajouté'
  };
  return labels[typeNotificationName] || 'Notification';
}

}