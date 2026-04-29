// services/notification.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service'; // ✅ Importer AuthService

export interface Notification {
  id: string;
  typeNotification: number;
  typeNotificationName: string;
  titre: string;
  message: string;
  dateEnvoi: Date;
  estLu: boolean;
  dateLecture?: Date;
  destinataireId: string;
  destinataireNom: string;
  ticketId?: string;
  incidentId?: string;
  commentaireId?: string;
  tpeId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private apiUrl = 'https://localhost:7063/api/notification';

  constructor(
    private http: HttpClient,
    private authService: AuthService  // ✅ Injecter AuthService
  ) {}

  /**
   * Récupère les headers d'authentification avec le token
   */
  private getAuthHeaders(): { headers: HttpHeaders } {
    const token = this.authService.getAccessToken();
    return {
      headers: new HttpHeaders({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      })
    };
  }

  // Récupérer toutes les notifications de l'utilisateur connecté
  getMyNotifications(): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${this.apiUrl}`, this.getAuthHeaders());
  }

  // Récupérer les notifications non lues
  getUnreadNotifications(): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${this.apiUrl}/unread`, this.getAuthHeaders());
  }

  // Récupérer le nombre de notifications non lues
  getUnreadCount(): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/unread/count`, this.getAuthHeaders());
  }

  // Récupérer les notifications par type
  getNotificationsByType(type: number): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${this.apiUrl}/type/${type}`, this.getAuthHeaders());
  }

  // Marquer une notification comme lue
  markAsRead(notificationId: string): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${notificationId}/read`, {}, this.getAuthHeaders());
  }

  // Marquer toutes les notifications comme lues
  markAllAsRead(): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/read/all`, {}, this.getAuthHeaders());
  }

  // Supprimer une notification
  deleteNotification(notificationId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${notificationId}`, this.getAuthHeaders());
  }
  deleteAllMyNotifications(): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/cleanup`, this.getAuthHeaders());
  }
}