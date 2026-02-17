import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { 
  Incident, 
  IncidentDetail, 
  CreateIncidentDTO,
  ApiResponse, 
  SeveriteIncident,
  StatutIncident,
  TypeEntiteImpactee,
  IncidentSearchRequest,
  PagedResult
} from '../models/incident.model';
import { AuthService } from './auth.service'; 
import { PagedResponse } from '../models/PagedResponse.model';

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
  // getIncidentsByStatut(statut: number): Observable<Incident[]> {
  //   return this.http.get<ApiResponse<Incident[]>>(
  //     `${this.apiUrl}/statut/${statut}`, 
  //     this.getAuthHeaders()
  //   ).pipe(
  //     map(response => response.data)
  //   );
  // }

  /**
   * Récupère les incidents par sévérité
   */
  // getIncidentsBySeverite(severite: number): Observable<Incident[]> {
  //   return this.http.get<ApiResponse<Incident[]>>(
  //     `${this.apiUrl}/severite/${severite}`, 
  //     this.getAuthHeaders()
  //   ).pipe(
  //     map(response => response.data)
  //   );
  // }

  /**
   * Récupère les incidents créés par l'utilisateur connecté
   */
  // getMyIncidents(): Observable<Incident[]> {
  //   return this.http.get<ApiResponse<Incident[]>>(
  //     `${this.apiUrl}/my-incidents`, 
  //     this.getAuthHeaders()
  //   ).pipe(
  //     map(response => response.data)
  //   );
  // }

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
  console.log('updateIncident - DTO reçu:', dto);
  
  return this.http.put<ApiResponse<Incident>>(
    `${this.apiUrl}/${id}`,
    dto,
    this.getAuthHeaders()
  ).pipe(
    map(response => {
      console.log('updateIncident - Réponse:', response);
      return response.data;
    })
  );
}
deleteIncident(id: string) {
  return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/${id}`, this.getAuthHeaders())
    .pipe(map(response => response.data));
}


  // Méthodes spécifiques
  getIncidentsByStatut(statut: StatutIncident): Observable<Incident[]> {
    return this.http.get<ApiResponse<Incident[]>>(
      `${this.apiUrl}/statut/${statut}`, 
      this.getAuthHeaders()
    ).pipe(
      map(response => response.data)
    );
  }

  getIncidentsBySeverite(severite: SeveriteIncident): Observable<Incident[]> {
    return this.http.get<ApiResponse<Incident[]>>(
      `${this.apiUrl}/severite/${severite}`, 
      this.getAuthHeaders()
    ).pipe(
      map(response => response.data)
    );
  }

  getMyIncidents(): Observable<Incident[]> {
    return this.http.get<ApiResponse<Incident[]>>(
      `${this.apiUrl}/my-incidents`, 
      this.getAuthHeaders()
    ).pipe(
      map(response => response.data)
    );
  }

// Dans incident.service.ts
// Dans incident.service.ts
// Dans incident.service.ts
searchIncidents(params: any) {
  const url = `${this.apiUrl}/withFilters`;
  console.log('=== DÉBUT REQUÊTE SEARCH INCIDENTS ===');
  console.log('URL:', url);
  console.log('Params reçus du composant:', JSON.stringify(params, null, 2));
  
  // Créer un objet pour la requête
  const searchRequest: any = {
    page: params.page || 1,
    pageSize: params.pageSize || 10,
    sortBy: params.sortBy || 'dateCreation',
    sortDescending: params.sortDescending === true ? true : false
  };

  // IMPORTANT: Si searchTerm est vide, envoyer une chaîne vide ou null
  // pour satisfaire la validation backend
  if (params.searchTerm !== undefined) {
    searchRequest.searchTerm = params.searchTerm || ''; // Envoyer une chaîne vide si pas de recherche
  } else {
    searchRequest.searchTerm = ''; // Valeur par défaut
  }

  // Ajouter les autres filtres optionnels
  if (params.severite !== undefined && params.severite !== null && params.severite !== '') {
    searchRequest.severite = Number(params.severite);
  }

  if (params.statut !== undefined && params.statut !== null && params.statut !== '') {
    searchRequest.statut = Number(params.statut);
  }

  if (params.year && params.year !== '') {
    searchRequest.year = params.year.toString();
  }

  console.log('SearchRequest construit:', JSON.stringify(searchRequest, null, 2));
  
  // Convertir l'objet en HttpParams
  let httpParams = new HttpParams();
  Object.keys(searchRequest).forEach(key => {
    const value = searchRequest[key];
    if (value !== undefined && value !== null) {
      httpParams = httpParams.set(key, value.toString());
    }
  });

  console.log('HttpParams finaux:', httpParams.toString());
  console.log('=== FIN CONSTRUCTION REQUÊTE ===');

  const headers = this.getAuthHeaders();
  
  return this.http.get<any>(url, { 
    params: httpParams, 
    headers: headers.headers 
  }).pipe(
    map(response => {
      console.log('📦 Réponse brute du backend:', response);
      
      // Adapter selon la structure de réponse
      if (response && response.data) {
        // Si la réponse est ApiResponse<PagedResult>
        if (response.data.items) {
          return {
            data: response.data.items,
            pagination: {
              page: response.data.page,
              pageSize: response.data.pageSize,
              totalCount: response.data.totalCount,
              totalPages: response.data.totalPages
            }
          };
        }
        // Si la réponse est ApiResponse<array>
        return {
          data: response.data,
          pagination: response.pagination
        };
      }
      
      // Si la réponse est directement PagedResult
      if (response && response.items) {
        return {
          data: response.items,
          pagination: {
            page: response.page,
            pageSize: response.pageSize,
            totalCount: response.totalCount,
            totalPages: response.totalPages
          }
        };
      }
      
      return response;
    })
  );
}}