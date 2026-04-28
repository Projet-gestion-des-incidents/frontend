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
  }

  toggleDropdown() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.loadNotifications();
      this.loadUnreadCount();
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
          this.notifications = data;
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
    // Éviter les clics multiples sur la même notification
    if (this.lastClickedNotificationId === notification.id) {
      return;
    }
    this.lastClickedNotificationId = notification.id;
    setTimeout(() => { this.lastClickedNotificationId = null; }, 500);

    // 1. Marquer comme lu si non lu
    if (!notification.estLu) {
      this.notificationService.markAsRead(notification.id).subscribe({
        next: () => {
          notification.estLu = true;
          this.unreadCount = Math.max(0, this.unreadCount - 1);
        },
        error: (err) => console.error('Erreur marquage:', err)
      });
    }
    
    // 2. Fermer le dropdown
    this.closeDropdown();
    
    // 3. Rediriger avec force
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
    
    const deletedNotification = this.notifications.find(n => n.id === notificationId);
    this.notifications = this.notifications.filter(n => n.id !== notificationId);
    
    if (deletedNotification && !deletedNotification.estLu) {
      this.unreadCount = Math.max(0, this.unreadCount - 1);
    }
    
    this.notificationService.deleteNotification(notificationId).subscribe({
      error: (err) => {
        console.error('Erreur suppression:', err);
        if (deletedNotification) {
          this.notifications = [deletedNotification, ...this.notifications];
          if (!deletedNotification.estLu) {
            this.unreadCount++;
          }
        }
      }
    });
  }

  // ✅ Méthode pour obtenir l'icône SVG
  getNotificationIconSvg(typeNotification: number): string {
    const svgIcons: { [key: number]: string } = {
      1: `<svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 5v2m0 4v2m0 4v2M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z"/>
          </svg>`,
      2: `<svg class="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
          </svg>`,
      3: `<svg class="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
          </svg>`,
      4: `<svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>`,
      5: `<svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>`,
      6: `<svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>`,
      7: `<svg class="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
          </svg>`,
      8: `<svg class="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>`,
      9: `<svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>`,
      10: `<svg class="w-5 h-5 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z"/>
           </svg>`
    };
    return svgIcons[typeNotification] || svgIcons[5];
  }

  formatDate(date: Date | string): string {
    const now = new Date();
    const notifDate = new Date(date);
    const diffMs = now.getTime() - notifDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `${diffMins} min`;
    if (diffHours < 24) return `${diffHours} h`;
    if (diffDays === 1) return 'Hier';
    return `${diffDays} jours`;
  }

  getTypeLabel(typeNotification: number): string {
    const labels: { [key: number]: string } = {
      1: 'Ticket créé',
      2: 'Ticket assigné',
      3: 'Ticket modifié',
      4: 'Ticket résolu',
      5: 'Incident créé',
      6: 'Incident résolu',
      7: 'Commentaire',
      8: 'Rappel',
      9: 'Incident modifié',
      10: 'TPE ajouté'
    };
    return labels[typeNotification] || 'Notification';
  }
}