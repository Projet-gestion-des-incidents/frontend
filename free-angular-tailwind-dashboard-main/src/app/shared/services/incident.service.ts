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

  /** Récupère les headers d'authentification */
  private getAuthHeaders(): { headers: HttpHeaders } {
    const token = this.authService.getAccessToken();
    return {
      headers: new HttpHeaders({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      })
    };
  }


/** Archive un incident résolu (statut Fermé)*/
archiverIncident(incidentId: string): Observable<ApiResponse<any>> {
  console.log(' Archivage de l\'incident:', incidentId);
  
  return this.http.post<ApiResponse<any>>(
    `${this.apiUrl}/${incidentId}/archiver`,
    {},
    this.getAuthHeaders()
  ).pipe(
    tap(response => console.log(' Réponse archivage:', response))
  );
}

/** Restaure un incident archivé*/
restaurerIncident(incidentId: string): Observable<ApiResponse<any>> {
  console.log(' Restauration de l\'incident:', incidentId);
  
  return this.http.post<ApiResponse<any>>(
    `${this.apiUrl}/${incidentId}/restaurer`,
    {},
    this.getAuthHeaders()
  ).pipe(
    tap(response => console.log(' Réponse restauration:', response))
  );
}

/** Récupère les incidents archivés par l'utilisateur connecté (avec pagination )*/
getIncidentsArchives(params: any): Observable<any> {
  console.log(' Récupération des incidents archivés, params:', params);
  
  let httpParams = new HttpParams()
    .set('Page', params.Page?.toString() || '1')
    .set('PageSize', params.PageSize?.toString() || '10')
    .set('SortBy', params.SortBy || 'DateArchivage')
    .set('SortDescending', params.SortDescending?.toString() || 'true');
  
  if (params.SearchTerm) {
    httpParams = httpParams.set('SearchTerm', params.SearchTerm);
  }
  
  if (params.StatutIncident) {
    httpParams = httpParams.set('StatutIncident', params.StatutIncident);
  }
  
  if (params.DateDetection) {
    httpParams = httpParams.set('DateDetection', params.DateDetection);
  }
  
  return this.http.get<ApiResponse<any>>(
    `${this.apiUrl}/archives`,
    { headers: this.getAuthHeaders().headers, params: httpParams }
  ).pipe(
    map(response => response.data || response),
    tap(data => console.log(' Incidents archivés reçus:', data))
  );
}
/** Récupère les statistiques du dashboard incidents */
getIncidentDashboard(): Observable<any> {
  return this.http.get<ApiResponse<any>>(
    `${this.apiUrl}/dashboard`,
    this.getAuthHeaders()
  ).pipe(
    map(response => response.data),
    catchError(error => {
      console.error('Erreur chargement dashboard incidents:', error);
      return of(null);
    })
  );
}
  /** Récupère les détails d'un incident par ID*/
  getIncidentDetails(id: string): Observable<IncidentDetail> {
    return this.http.get<ApiResponse<IncidentDetail>>(
      `${this.apiUrl}/${id}/details`, 
      this.getAuthHeaders()
    ).pipe(
      map(response => response.data)
    );
  }

  /** Récupère un incident par son ID */
  getIncidentById(id: string): Observable<Incident> {
    return this.http.get<ApiResponse<Incident>>(
      `${this.apiUrl}/${id}`, 
      this.getAuthHeaders()
    ).pipe(
      map(response => response.data)
    );
  }

  /** Crée un nouvel incident*/
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

  /** Met à jour un incident*/
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
//supprimer un incident
deleteIncident(id: string) {
  return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/${id}`, this.getAuthHeaders())
    .pipe(map(response => response.data));
}
  /** Récupère mes incidents (commercant) */
  getMyIncidents(): Observable<Incident[]> {
    return this.http.get<ApiResponse<Incident[]>>(
      `${this.apiUrl}/my-incidents`, 
      this.getAuthHeaders()
    ).pipe(
      map(response => response.data)
    );
  }

  /** Récupère la liste des incidents (avec pagination et recherche) */
searchIncidents(params: any) {
  const url = `${this.apiUrl}/withFilters`;
  console.log('=== SERVICE: searchIncidents ===');
  console.log('Params reçus:', params);
  let httpParams = new HttpParams();
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
  /** Récupère la liste de mes incidents (avec pagination et recherche) */
searchMyIncidents(params: any): Observable<any> {
  console.log(' SERVICE - Paramètres reçus:', params);
  
  let httpParams = new HttpParams()
    .set('Page', params.Page?.toString() || '1')
    .set('PageSize', params.PageSize?.toString() || '10')
    .set('SortBy', params.SortBy || 'DateDetection')
    .set('SortDescending', params.SortDescending?.toString() || 'true');
  
  if (params.SearchTerm) {
    httpParams = httpParams.set('SearchTerm', params.SearchTerm);
  }
  
  if (params.StatutIncident) {
    httpParams = httpParams.set('StatutIncident', params.StatutIncident);
  }
  
  if (params.DateDetection) {
    httpParams = httpParams.set('DateDetection', params.DateDetection);
    console.log(' SERVICE - Ajout DateDetection:', params.DateDetection);
  }
   if (params.TypeProbleme !== undefined && params.TypeProbleme !== null) {
    httpParams = httpParams.set('TypeProbleme', params.TypeProbleme.toString());
    console.log(' SERVICE - Ajout TypeProbleme:', params.TypeProbleme);
  } else {
    console.log(' SERVICE - TypeProbleme non trouvé dans les params');
  }
  if (params.DateResolution) {
    httpParams = httpParams.set('DateResolution', params.DateResolution);
    console.log(' SERVICE - Ajout DateResolution:', params.DateResolution);
  }
  
  if (params.YearDetection) {
    httpParams = httpParams.set('YearDetection', params.YearDetection.toString());
  }
  
  console.log(' SERVICE - Params finaux:', httpParams.toString());
  
  return this.http.get<ApiResponse<any>>(
    `${this.apiUrl}/my-incidents`, 
    { headers: this.getAuthHeaders().headers, params: httpParams }
  ).pipe(
    map(response => {
      console.log(' SERVICE - Réponse brute:', response);
      return response.data || response;
    })
  );
}
//Liaison TPEs - Incident
 lierPlusieursTpes(incidentId: string, tpeIds: string[]): Observable<ApiResponse<IncidentTPEDTO[]>> {
    console.log(' Liaison de plusieurs TPEs - Incident:', incidentId, 'TPEs:', tpeIds);
    
    return this.http.post<ApiResponse<IncidentTPEDTO[]>>(
      `${this.apiUrl}/${incidentId}/tpes`,
      tpeIds, // Envoyer directement le tableau d'IDs
      this.getAuthHeaders()
    ).pipe(
      tap(response => console.log(' Réponse liaison TPEs:', response))
    );
  }

  lierTpe(incidentId: string, tpeId: string): Observable<ApiResponse<IncidentTPEDTO[]>> {
    return this.lierPlusieursTpes(incidentId, [tpeId]);
  }


/**  Ajouter des pièces jointes à un incident*/
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
  
  console.log(' Upload de', fichiers.length, 'fichier(s) pour l\'incident:', incidentId);
  
  return this.http.post<ApiResponse<PieceJointeDTO[]>>(
    `https://localhost:7063/api/pieces-jointes/incident/${incidentId}/upload`,
    formData,
    { headers }
  ).pipe(
    tap(response => console.log(' Réponse upload:', response))
  );
}
// Récupèrer les incidents disponibles (sans ticket)
getIncidentsSansTicket(): Observable<Incident[]> {
  console.log(' Récupération des incidents sans ticket lié');
  
  return this.http.get<ApiResponse<Incident[]>>(
    `${this.apiUrl}/disponibles`,
    this.getAuthHeaders()
  ).pipe(
    map(response => response.data),
    tap(incidents => console.log(` ${incidents.length} incident(s) sans ticket trouvé(s)`)),
    catchError(error => {
      console.error(' Erreur récupération incidents sans ticket:', error);
      return of([]);
    })
  );
}
// Récupèrer les Pièces jointes d un incident
getPiecesJointesByIncident(incidentId: string): Observable<PieceJointeDTO[]> {
  return this.http.get<ApiResponse<PieceJointeDTO[]>>(
    `https://localhost:7063/api/pieces-jointes/incident/${incidentId}`,
    this.getAuthHeaders()
  ).pipe(
    map(response => response.data || []),
    tap(pieces => console.log(` Pièces jointes chargées:`, pieces.length))
  );
}

/**  Supprimer une pièce jointe*/
supprimerPieceJointe(pieceId: string): Observable<ApiResponse<boolean>> {
  return this.http.delete<ApiResponse<boolean>>(
    `https://localhost:7063/api/pieces-jointes/${pieceId}`,
    this.getAuthHeaders()
  );
}
/** Retirer un TPE d'un incident */
retirerTpe(incidentId: string, tpeId: string): Observable<ApiResponse<boolean>> {
  return this.http.delete<ApiResponse<boolean>>(
    `${this.apiUrl}/${incidentId}/tpes/${tpeId}`, 
    this.getAuthHeaders()
  );
}

}