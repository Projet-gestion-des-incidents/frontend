import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { ApiResponse, CreateTicketDTO, TicketDetailDTO, TicketDTO } from '../models/Ticket.models';
import { AuthService } from './auth.service';

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
createTicket(dto: any): Observable<TicketDTO> {
  return this.http.post<ApiResponse<TicketDTO>>(
    this.baseUrl,
    dto,
    this.getAuthHeaders()
  ).pipe(
    map(response => response.data)
  );
}

}
