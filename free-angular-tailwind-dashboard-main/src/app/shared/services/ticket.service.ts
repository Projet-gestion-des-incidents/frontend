import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { catchError, map, Observable, of, tap, throwError } from 'rxjs';
import { ApiResponse, CommentaireDTO, CreateTicketDTO, TechnicianUpdateTicketDTO, TicketDetailDTO, TicketDTO, UpdateTicketResponseDTO } from '../models/Ticket.models';
import { AuthService } from './auth.service';
import { Incident, PagedResult } from '../models/incident.model';

@Injectable({
  providedIn: 'root'
})
export class TicketService {

  private baseUrl = 'https://localhost:7063/api/ticket'; 
  private incidentBaseUrl = 'https://localhost:7063/api/incident'; 

  constructor(private http: HttpClient,    private authService: AuthService
  ) { }


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
  if (!isFormData) {
    headers = headers.set('Content-Type', 'application/json');
  }

  return { headers };
}

/**
 * Récupère les tickets archivés par l'utilisateur connecté
 */
getArchivedTickets(params: any): Observable<any> {
  console.log(' Récupération des tickets archivés, params:', params);
  
  let httpParams = new HttpParams()
    .set('Page', params.Page?.toString() || '1')
    .set('PageSize', params.PageSize?.toString() || '10')
    .set('SortBy', params.SortBy || 'DateArchivage')
    .set('SortDescending', params.SortDescending?.toString() || 'true');
  
  if (params.SearchTerm) {
    httpParams = httpParams.set('SearchTerm', params.SearchTerm);
  }
  
  if (params.StatutTicket) {
    httpParams = httpParams.set('StatutTicket', params.StatutTicket);
  }
  
  return this.http.get<ApiResponse<any>>(
    `${this.baseUrl}/archives`,
    { headers: this.getAuthHeaders().headers, params: httpParams }
  ).pipe(
    map(response => response.data || response),
    tap(data => console.log(' Tickets archivés reçus:', data))
  );
}

/**
 * Restaurer un ticket archivé
 */
restaurerTicket(ticketId: string): Observable<ApiResponse<any>> {
  console.log(' Restauration du ticket:', ticketId);
  
  return this.http.post<ApiResponse<any>>(
    `${this.baseUrl}/${ticketId}/restaurer`,
    {},
    this.getAuthHeaders()
  ).pipe(
    tap(response => console.log(' Réponse restauration:', response))
  );
}
// Archiver un ticket
archiverTicket(ticketId: string): Observable<ApiResponse<any>> {
  console.log(' Archivage du ticket:', ticketId);
  
  return this.http.post<ApiResponse<any>>(
    `${this.baseUrl}/${ticketId}/archiver`,
    {},
    this.getAuthHeaders()
  ).pipe(
    tap(response => console.log(' Réponse archivage:', response))
  );
}

// Récupérer les incidents d un ticket
getIncidentsByTicket(ticketId: string): Observable<Incident[]> {
  console.log(' Récupération des incidents pour le ticket:', ticketId);
  
  return this.http.get<ApiResponse<Incident[]>>(
    `${this.baseUrl}/${ticketId}/incidents`,
    this.getAuthHeaders()
  ).pipe(
    map(response => {
      console.log(' Incidents reçus:', response);
      return response.data || [];
    }),
    catchError(error => {
      console.error(' Erreur récupération incidents:', error);
      return of([]);
    })
  );
}
//technicien : modifier ticket
technicianUpdateTicket(id: string, dto: TechnicianUpdateTicketDTO): Observable<ApiResponse<TicketDTO>> {
  console.log(' Mise à jour technicien - Ticket:', id, 'DTO:', dto);
  
  return this.http.put<ApiResponse<TicketDTO>>(
    `${this.baseUrl}/${id}/technician-update`,
    dto,
    this.getAuthHeaders()
  ).pipe(
    tap(response => console.log(' Réponse mise à jour technicien:', response)),
    catchError(error => {
      console.error(' Erreur mise à jour technicien:', error);
      return throwError(() => error);
    })
  );
}


 /** Modifier un ticket  */
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
//Ajouter liaison incident ticket
lierIncidents(ticketId: string, incidentIds: string[]): Observable<ApiResponse<any>> {
  return this.http.post<ApiResponse<any>>(
    `${this.baseUrl}/${ticketId}/lier-incidents`,
    incidentIds, 
    this.getAuthHeaders() 
  );
}
//Suppression liaison incident ticket
delierIncident(ticketId: string, incidentId: string): Observable<ApiResponse<boolean>> {
  console.log(' Suppression liaison - Ticket:', ticketId, 'Incident:', incidentId);
  
  return this.http.delete<ApiResponse<boolean>>(
    `${this.baseUrl}/${ticketId}/incidents/${incidentId}`,
  
    this.getAuthHeaders()
  ).pipe(
    tap(response => {
      console.log(' Réponse suppression liaison:', response);
    }),
    catchError(error => {
      console.error(' Erreur suppression liaison:', error);
      return throwError(() => error);
    })
  );
}
  // Supprimer un ticket 
  deleteTicket(id: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(
      `${this.baseUrl}/${id}`,
      this.getAuthHeaders()
    );
  }
  //  Récupérer la liste des tickets avec pagination
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
  // Créer un ticket
  createTicket(formData: FormData): Observable<ApiResponse<TicketDTO>> {
    return this.http.post<ApiResponse<TicketDTO>>(
      this.baseUrl,
      formData,
      this.getAuthHeaders1(true) // true = isFormData
    );
  }
 //Résolution d un incident
  resoudreIncident(incidentId: string): Observable<ApiResponse<boolean>> {
    console.log(' Résolution de l\'incident:', incidentId);
    
    return this.http.put<ApiResponse<boolean>>(
      `${this.incidentBaseUrl}/${incidentId}/resoudre`,
      {}, // Body vide
      this.getAuthHeaders()
    ).pipe(
      tap(response => {
        console.log(' Réponse résolution incident:', response);
      }),
      catchError(error => {
        console.error(' Erreur résolution incident:', error);
        return throwError(() => error);
      })
    );
  }

//  Récupérer les tickets assignés à l'utilisateur connecté (technicien) avec pagination
getMesTicketsAssignes(request: any): Observable<ApiResponse<PagedResult<TicketDTO>>> {
  // Construire les paramètres de requête avec HttpParams
  let params = new HttpParams()
    .set('page', request.page.toString())
    .set('pageSize', request.pageSize.toString())
    .set('sortBy', request.sortBy || 'date')
    .set('sortDescending', request.sortDescending !== undefined ? request.sortDescending : true);

  // Ajouter les filtres optionnels
  if (request.searchTerm) {
    params = params.set('searchTerm', request.searchTerm);
  }
  if (request.statut) {
    params = params.set('statut', request.statut);
  }
  if (request.priorite) {
    params = params.set('priorite', request.priorite);
  }
  if (request.dateDebut) {
    params = params.set('dateDebut', request.dateDebut);
  }

  return this.http.get<ApiResponse<PagedResult<TicketDTO>>>(
    `${this.baseUrl}/mes-tickets`,
    { params, headers: this.getAuthHeaders().headers }
  );
}

// Récupère les statistiques du dashboard tickets
getTicketDashboard(): Observable<any> {
  return this.http.get<ApiResponse<any>>(
    `${this.baseUrl}/dashboard`,
    this.getAuthHeaders()
  ).pipe(
    map(response => response.data),
    catchError(error => {
      console.error('Erreur chargement dashboard tickets:', error);
      return of(null);
    })
  );
}

}
