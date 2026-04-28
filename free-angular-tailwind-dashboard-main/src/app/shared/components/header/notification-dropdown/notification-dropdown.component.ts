// components/notification-dropdown/notification-dropdown.component.ts
import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterModule } from '@angular/router';
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

  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
    this.loadNotifications();
    this.loadUnreadCount();
    
    // Rafraîchir toutes les 30 secondes
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

  markAsRead(notificationId: string, event: Event) {
    event.stopPropagation();
    this.notificationService.markAsRead(notificationId).subscribe({
      next: () => {
        if (this.isComponentAlive) {
          const notif = this.notifications.find(n => n.id === notificationId);
          if (notif) {
            notif.estLu = true;
            this.unreadCount = Math.max(0, this.unreadCount - 1);
          }
        }
      },
      error: (err) => console.error('Erreur marquage lecture:', err)
    });
  }

  markAllAsRead() {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        if (this.isComponentAlive) {
          this.notifications.forEach(n => n.estLu = true);
          this.unreadCount = 0;
        }
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

  onNotificationClick(notification: Notification) {
    if (!notification.estLu) {
      this.markAsRead(notification.id, new Event('click'));
    }
    
    // Rediriger selon le type de notification
    if (notification.ticketId) {
      // this.router.navigate(['/tickets', notification.ticketId]);
    } else if (notification.incidentId) {
      // this.router.navigate(['/incidents', notification.incidentId]);
    }
    
    this.closeDropdown();
  }

  // ✅ Méthode pour obtenir l'icône selon le type de notification
  getNotificationIcon(typeNotification: number): string {
    const icons: { [key: number]: string } = {
      1: '🎫',  // TicketCree
      2: '📌',  // TicketAssigne
      3: '✏️',  // TicketModifie
      4: '✅',  // TicketCloture
      5: '⚠️',  // IncidentCree
      6: '🔧',  // IncidentResolu
      7: '💬',  // CommentaireAjoute
      8: '⏰',  // Rappel
      9: '🔄',  // IncidentModifie
      10: '🖥️'  // TPECree
    };
    return icons[typeNotification] || '📢';
  }

  // ✅ Méthode pour obtenir la couleur selon le type de notification
  getNotificationColor(typeNotification: number): string {
    const colors: { [key: number]: string } = {
      1: 'bg-blue-500',   // TicketCree
      2: 'bg-purple-500', // TicketAssigne
      3: 'bg-yellow-500', // TicketModifie
      4: 'bg-green-500',  // TicketCloture
      5: 'bg-red-500',    // IncidentCree
      6: 'bg-green-500',  // IncidentResolu
      7: 'bg-indigo-500', // CommentaireAjoute
      8: 'bg-orange-500', // Rappel
      9: 'bg-blue-500',   // IncidentModifie
      10: 'bg-cyan-500'   // TPECree
    };
    return colors[typeNotification] || 'bg-gray-500';
  }

  // ✅ Méthode pour formater la date
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
}