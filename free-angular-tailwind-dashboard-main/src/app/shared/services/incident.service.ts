import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { 
  Incident, 
  IncidentDetail, 
  CreateIncidentDTO,
  ApiResponse, 
  SeveriteIncident,
  StatutIncident,
  TypeEntiteImpactee
} from '../models/incident.model';
import { AuthService } from './auth.service'; 

@Injectable({
  providedIn: 'root'
})
export class IncidentService {
  private apiUrl = 'https://localhost:7063/api/incident';
  private entiteApiUrl = 'https://localhost:7063/api/entites-impactees'; 

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  /**
   * Récupère les headers d'authentification
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

  /**
   * Récupère tous les incidents (GET all)
   */
  getAllIncidents(): Observable<Incident[]> {
    return this.http.get<ApiResponse<Incident[]>>(
      `${this.apiUrl}/all`, 
      this.getAuthHeaders()
    ).pipe(
      map(response => response.data)
    );
  }

  /**
   * Récupère les détails d'un incident par ID
   */
  getIncidentDetails(id: string): Observable<IncidentDetail> {
    return this.http.get<ApiResponse<IncidentDetail>>(
      `${this.apiUrl}/${id}/details`, 
      this.getAuthHeaders()
    ).pipe(
      map(response => response.data)
    );
  }

  /**
   * Récupère un incident par son ID (version simple)
   */
  getIncidentById(id: string): Observable<Incident> {
    return this.http.get<ApiResponse<Incident>>(
      `${this.apiUrl}/${id}`, 
      this.getAuthHeaders()
    ).pipe(
      map(response => response.data)
    );
  }

  /**
   * Crée un nouvel incident
   */
  createIncident(incident: CreateIncidentDTO): Observable<Incident> {
    return this.http.post<ApiResponse<Incident>>(
      this.apiUrl, 
      incident, 
      this.getAuthHeaders()
    ).pipe(
      map(response => response.data)
    );
  }

  /**
   * Récupère toutes les entités impactées disponibles
   */
  getEntitesImpactees(): Observable<any[]> {
    return this.http.get<ApiResponse<any[]>>(
      this.entiteApiUrl, 
      this.getAuthHeaders()
    ).pipe(
      map(response => response.data)
    );
  }

  /**
   * Récupère les entités impactées par type
   */
  getEntitesImpacteesByType(type: number): Observable<any[]> {
    return this.http.get<ApiResponse<any[]>>(
      `${this.entiteApiUrl}/by-type/${type}`, 
      this.getAuthHeaders()
    ).pipe(
      map(response => response.data)
    );
  }

  /**
   * Récupère les entités impactées par incident
   */
  getEntitesImpacteesByIncident(incidentId: string): Observable<any[]> {
    return this.http.get<ApiResponse<any[]>>(
      `${this.entiteApiUrl}/by-incident/${incidentId}`, 
      this.getAuthHeaders()
    ).pipe(
      map(response => response.data)
    );
  }

  /**
   * Récupère les incidents par statut
   */
  getIncidentsByStatut(statut: number): Observable<Incident[]> {
    return this.http.get<ApiResponse<Incident[]>>(
      `${this.apiUrl}/statut/${statut}`, 
      this.getAuthHeaders()
    ).pipe(
      map(response => response.data)
    );
  }

  /**
   * Récupère les incidents par sévérité
   */
  getIncidentsBySeverite(severite: number): Observable<Incident[]> {
    return this.http.get<ApiResponse<Incident[]>>(
      `${this.apiUrl}/severite/${severite}`, 
      this.getAuthHeaders()
    ).pipe(
      map(response => response.data)
    );
  }

  /**
   * Récupère les incidents créés par l'utilisateur connecté
   */
  getMyIncidents(): Observable<Incident[]> {
    return this.http.get<ApiResponse<Incident[]>>(
      `${this.apiUrl}/my-incidents`, 
      this.getAuthHeaders()
    ).pipe(
      map(response => response.data)
    );
  }

  /**
   * Crée une nouvelle entité impactée
   */
  createEntiteImpactee(dto: { typeEntiteImpactee: number; nom: string }): Observable<any> {
    return this.http.post<ApiResponse<any>>(
      this.entiteApiUrl, 
      dto, 
      this.getAuthHeaders()
    ).pipe(
      map(response => response.data)
    );
  }

  /**
   * Assigne des entités impactées à un incident
   */
  assignerEntitesImpactees(incidentId: string, entiteIds: string[]): Observable<any> {
    return this.http.post<ApiResponse<any>>(
      `${this.apiUrl}/${incidentId}/entites-impactees`,
      entiteIds,
      this.getAuthHeaders()
    ).pipe(
      map(response => response.data)
    );
  }
  /**
 * Met à jour un incident
 */
updateIncident(id: string, dto: {
  titreIncident: string;
  descriptionIncident: string;
  severiteIncident: SeveriteIncident;
  statutIncident: StatutIncident;
  entitesImpactees: {
    id?: string;
    typeEntiteImpactee: TypeEntiteImpactee;
    nom: string;
  }[];
}): Observable<Incident> {
  return this.http.put<ApiResponse<Incident>>(
    `${this.apiUrl}/${id}`,
    dto,
    this.getAuthHeaders()
  ).pipe(
    map(response => response.data)
  );
}

}