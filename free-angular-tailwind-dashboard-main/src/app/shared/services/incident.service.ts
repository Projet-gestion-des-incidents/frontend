import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { 
  Incident, 
  IncidentDetail, 
  CreateIncidentDTO,
  ApiResponse, 
  SeveriteIncident,
  StatutIncident,
  TypeEntiteImpactee,
  IncidentSearchRequest,
  PagedResult,
  IncidentTPEDTO,
  PieceJointeDTO
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
 createIncident(formData: FormData): Observable<Incident> {

  const token = this.authService.getAccessToken();

  const headers = new HttpHeaders({
    'Authorization': `Bearer ${token}`
  });

  return this.http.post<ApiResponse<Incident>>(
    this.apiUrl,
    formData,
    { headers }
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


searchIncidents(params: any) {
  const url = `${this.apiUrl}/withFilters`;
  console.log('=== SERVICE: searchIncidents ===');
  console.log('Params reçus:', params);
  
  // Construire les HttpParams
  let httpParams = new HttpParams();
  
  // Ajouter tous les paramètres non vides
  Object.keys(params).forEach(key => {
    const value = params[key];
    if (value !== undefined && value !== null && value !== '') {
      httpParams = httpParams.set(key, value.toString());
    }
  });

  console.log('HttpParams finaux:', httpParams.toString());

  return this.http.get<any>(url, { 
    params: httpParams, 
    headers: this.getAuthHeaders().headers 
  }).pipe(
    map(response => {
      console.log('=== SERVICE: Réponse reçue ===', response);
      return response;
    })
  );
}
// Dans incident.service.ts - Corrigez searchMyIncidents
searchMyIncidents(params: any): Observable<any> {
  console.log('📤 SERVICE - Paramètres reçus:', params);
  
  let httpParams = new HttpParams()
    .set('Page', params.Page?.toString() || '1')
    .set('PageSize', params.PageSize?.toString() || '10')
    .set('SortBy', params.SortBy || 'DateDetection')
    .set('SortDescending', params.SortDescending?.toString() || 'true');
  
  if (params.SearchTerm) {
    httpParams = httpParams.set('SearchTerm', params.SearchTerm);
  }
  
  // ✅ CORRECTION: Ajouter StatutIncident (string)
  if (params.StatutIncident) {
    httpParams = httpParams.set('StatutIncident', params.StatutIncident);
  }
  
  // ✅ CORRECTION: Ajouter DateDetection
  if (params.DateDetection) {
    httpParams = httpParams.set('DateDetection', params.DateDetection);
    console.log('📤 SERVICE - Ajout DateDetection:', params.DateDetection);
  }
  
  // ✅ CORRECTION: Ajouter DateResolution
  if (params.DateResolution) {
    httpParams = httpParams.set('DateResolution', params.DateResolution);
    console.log('📤 SERVICE - Ajout DateResolution:', params.DateResolution);
  }
  
  if (params.YearDetection) {
    httpParams = httpParams.set('YearDetection', params.YearDetection.toString());
  }
  
  console.log('📤 SERVICE - Params finaux:', httpParams.toString());
  
  return this.http.get<ApiResponse<any>>(
    `${this.apiUrl}/my-incidents`, 
    { headers: this.getAuthHeaders().headers, params: httpParams }
  ).pipe(
    map(response => {
      console.log('📥 SERVICE - Réponse brute:', response);
      return response.data || response;
    })
  );
}

 lierPlusieursTpes(incidentId: string, tpeIds: string[]): Observable<ApiResponse<IncidentTPEDTO[]>> {
    console.log('➕ Liaison de plusieurs TPEs - Incident:', incidentId, 'TPEs:', tpeIds);
    
    return this.http.post<ApiResponse<IncidentTPEDTO[]>>(
      `${this.apiUrl}/${incidentId}/tpes`,
      tpeIds, // Envoyer directement le tableau d'IDs
      this.getAuthHeaders()
    ).pipe(
      tap(response => console.log('📥 Réponse liaison TPEs:', response))
    );
  }

  /**
   * 🔹 Lier un seul TPE à un incident (pour compatibilité)
   * Utilise le nouvel endpoint avec un tableau d'un seul élément
   */
  lierTpe(incidentId: string, tpeId: string): Observable<ApiResponse<IncidentTPEDTO[]>> {
    return this.lierPlusieursTpes(incidentId, [tpeId]);
  }

// Dans incident.service.ts
// Dans incident.service.ts

/**
 * 🔹 Ajouter des pièces jointes à un incident
 * POST /api/incident/{incidentId}/upload
 */
// Dans incident.service.ts

/**
 * 🔹 Ajouter des pièces jointes à un incident
 * POST /api/incident/{incidentId}/upload
 */
ajouterPiecesJointes(incidentId: string, fichiers: File[]): Observable<ApiResponse<PieceJointeDTO[]>> {
  const formData = new FormData();
  
  fichiers.forEach(file => {
    formData.append('fichiers', file, file.name);
  });
  
  const token = this.authService.getAccessToken();
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${token}`
    // NE PAS mettre Content-Type
  });
  
  console.log('📤 Upload de', fichiers.length, 'fichier(s) pour l\'incident:', incidentId);
  
  // ✅ CORRECTION : Utiliser l'URL correcte avec pieces-jointes
  return this.http.post<ApiResponse<PieceJointeDTO[]>>(
    `https://localhost:7063/api/pieces-jointes/incident/${incidentId}/upload`,
    formData,
    { headers }
  ).pipe(
    tap(response => console.log('📥 Réponse upload:', response))
  );
}
// Dans incident.service.ts
getIncidentsSansTicket(): Observable<Incident[]> {
  console.log('🔍 Récupération des incidents sans ticket lié');
  
  return this.http.get<ApiResponse<Incident[]>>(
    `${this.apiUrl}/disponibles`,
    this.getAuthHeaders()
  ).pipe(
    map(response => response.data),
    tap(incidents => console.log(`📦 ${incidents.length} incident(s) sans ticket trouvé(s)`)),
    catchError(error => {
      console.error('❌ Erreur récupération incidents sans ticket:', error);
      return of([]);
    })
  );
}
// Dans incident.service.ts

getPiecesJointesByIncident(incidentId: string): Observable<PieceJointeDTO[]> {
  return this.http.get<ApiResponse<PieceJointeDTO[]>>(
    `https://localhost:7063/api/pieces-jointes/incident/${incidentId}`,
    this.getAuthHeaders()
  ).pipe(
    map(response => response.data || []),
    tap(pieces => console.log(`📦 Pièces jointes chargées:`, pieces.length))
  );
}

/**
 * 🔹 Supprimer une pièce jointe
 * DELETE /api/pieces-jointes/{pieceId}
 */
supprimerPieceJointe(pieceId: string): Observable<ApiResponse<boolean>> {
  return this.http.delete<ApiResponse<boolean>>(
    `https://localhost:7063/api/pieces-jointes/${pieceId}`,
    this.getAuthHeaders()
  );
}
/**
 * Retirer un TPE d'un incident
 */
retirerTpe(incidentId: string, tpeId: string): Observable<ApiResponse<boolean>> {
  // URL avec "tpes" (pluriel) comme dans votre contrôleur
  return this.http.delete<ApiResponse<boolean>>(
    `${this.apiUrl}/${incidentId}/tpes/${tpeId}`, // ← Changé de "tpe" à "tpes"
    this.getAuthHeaders()
  );
}

}