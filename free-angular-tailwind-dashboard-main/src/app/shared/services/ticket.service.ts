import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, map, Observable, of, tap, throwError } from 'rxjs';
import { ApiResponse, CommentaireDTO, CreateTicketDTO, TechnicianUpdateTicketDTO, TicketDetailDTO, TicketDTO, UpdateTicketResponseDTO } from '../models/Ticket.models';
import { AuthService } from './auth.service';
import { Incident } from '../models/incident.model';

@Injectable({
  providedIn: 'root'
})
export class TicketService {

  private baseUrl = 'https://localhost:7063/api/ticket'; 

  constructor(private http: HttpClient,    private authService: AuthService
  ) { }

  /**
   * 🔹 Récupérer tous les tickets
   */
  getAllTickets(): Observable<ApiResponse<TicketDTO[]>> {
    return this.http.get<ApiResponse<TicketDTO[]>>(
      `${this.baseUrl}/all`,
          this.getAuthHeaders()
    );
  }
 private getAuthHeaders(): { headers: HttpHeaders } {
    const token = this.authService.getAccessToken();
    return {
      headers: new HttpHeaders({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      })
    };
  }
  private getAuthHeaders1(isFormData: boolean = false): { headers: HttpHeaders } {
  const token = this.authService.getAccessToken();

  let headers = new HttpHeaders({
    'Authorization': `Bearer ${token}`
  });

  // ❌ Ne pas mettre Content-Type pour FormData
  if (!isFormData) {
    headers = headers.set('Content-Type', 'application/json');
  }

  return { headers };
}
// Dans ticket.service.ts
getIncidentsByTicket(ticketId: string): Observable<Incident[]> {
  console.log('🔍 Récupération des incidents pour le ticket:', ticketId);
  
  return this.http.get<ApiResponse<Incident[]>>(
    `${this.baseUrl}/${ticketId}/incidents`,
    this.getAuthHeaders()
  ).pipe(
    map(response => {
      console.log('📦 Incidents reçus:', response);
      return response.data || [];
    }),
    catchError(error => {
      console.error('❌ Erreur récupération incidents:', error);
      return of([]);
    })
  );
}

// Dans ticket.service.ts
addCommentaire(ticketId: string, formData: FormData) {
  console.log('📤 ENVOI COMMENTAIRE - Début');
  console.log('📤 Ticket ID:', ticketId);
  
  // Afficher TOUT le contenu du FormData
  console.log('📤 Contenu du FormData:');
  formData.forEach((value, key) => {
    if (value instanceof File) {
      console.log(`  - ${key}: ${value.name} (${value.size} bytes, type: ${value.type})`);
    } else {
      console.log(`  - ${key}: "${value}"`);
    }
  });

  const headers = this.getAuthHeaders1(true);
  console.log('📤 Headers:', headers);

  return this.http.post<ApiResponse<CommentaireDTO>>(
    `https://localhost:7063/api/commentaires?ticketId=${ticketId}`,
    formData, 
    headers
  ).pipe(
    tap(response => {
      console.log('📥 Réponse commentaire SUCCÈS:', response);
    }),
    catchError(error => {
      console.error('📥 ERREUR commentaire DÉTAILLÉE:', {
        status: error.status,
        statusText: error.statusText,
        message: error.error?.message,
        error: error.error,
        headers: error.headers
      });
      return throwError(() => error);
    })
  );
}
updateCommentaire(commentaireId: string, formData: FormData) {
  return this.http.put(
    `https://localhost:7063/api/commentaires/${commentaireId}`,
    formData,
    this.getAuthHeaders1(true)
  );
}
  updateTicket(id: string, formData: FormData): Observable<ApiResponse<UpdateTicketResponseDTO>> {
    return this.http.put<ApiResponse<UpdateTicketResponseDTO>>(
      `${this.baseUrl}/${id}`,
      formData,
      this.getAuthHeaders1(true)
    );
  }
 /** Récupérer un ticket par son id */
  getTicketById(id: string): Observable<ApiResponse<TicketDTO>> {
    return this.http.get<ApiResponse<TicketDTO>>(
      `${this.baseUrl}/${id}`,
      this.getAuthHeaders()
    );
  }
/** Récupérer les détails d'un ticket (avec commentaires et pièces jointes) */
getTicketDetails(id: string): Observable<ApiResponse<TicketDetailDTO>> {
  return this.http.get<ApiResponse<TicketDetailDTO>>(
    `${this.baseUrl}/${id}/details`,
    this.getAuthHeaders()
  );
}
// Dans ticket.service.ts
lierIncidents(ticketId: string, incidentIds: string[]): Observable<ApiResponse<any>> {
  // Le backend attend List<Guid> directement dans le body
  // Pas besoin de wrapper dans un objet
  return this.http.post<ApiResponse<any>>(
    `${this.baseUrl}/${ticketId}/lier-incidents`,
    incidentIds, // ← Envoyer directement le tableau
    this.getAuthHeaders() // Utiliser getAuthHeaders() qui a Content-Type: application/json
  );
}
  /** Supprimer un ticket */
  deleteTicket(id: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(
      `${this.baseUrl}/${id}`,
      this.getAuthHeaders()
    );
  }
getTicketsPaged(request: any) {
  const params = new URLSearchParams();

  Object.keys(request).forEach(key => {
    if (request[key] !== null && request[key] !== undefined) {
      params.append(key, request[key]);
    }
  });

  return this.http.get<any>(
    `${this.baseUrl}?${params.toString()}`,
    this.getAuthHeaders()
  );
}
  /**
   * 🔹 Créer un ticket
   */
// createTicket(dto: any): Observable<TicketDTO> {
//   return this.http.post<ApiResponse<TicketDTO>>(
//     this.baseUrl,
//     dto,
//     this.getAuthHeaders()
//   ).pipe(
//     map(response => response.data)
//   );
// }
  createTicket(formData: FormData): Observable<ApiResponse<TicketDTO>> {
    return this.http.post<ApiResponse<TicketDTO>>(
      this.baseUrl,
      formData,
      this.getAuthHeaders1(true) // true = isFormData
    );
  }
  technicianUpdateTicket(id: string, dto: TechnicianUpdateTicketDTO): Observable<ApiResponse<UpdateTicketResponseDTO>> {
    return this.http.put<ApiResponse<UpdateTicketResponseDTO>>(
      `${this.baseUrl}/${id}/technician-update`,
      dto,
      this.getAuthHeaders()
    );
  }

  /**
   * 🔹 Récupérer les tickets assignés à l'utilisateur connecté (technicien)
   * GET /api/ticket/mes-tickets
   */
  getMesTicketsAssignes(): Observable<ApiResponse<any>> {
    return this.http.get<any>(
      `${this.baseUrl}/mes-tickets`,
      this.getAuthHeaders()
    );
  }

  /**
   * 🔹 Mettre à jour uniquement le statut d'un ticket
   */
  updateStatut(ticketId: string, statutTicket: number): Observable<ApiResponse<TicketDTO>> {
    const dto = { statutTicket };
    return this.http.put<ApiResponse<TicketDTO>>(
      `${this.baseUrl}/${ticketId}/statut`,
      dto,
      this.getAuthHeaders()
    );
  }
}
