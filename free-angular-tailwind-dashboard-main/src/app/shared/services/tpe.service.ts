import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable, switchMap } from 'rxjs';
import { AuthService } from './auth.service';
import { User } from '../models/User.model';
import { UserService } from './user.service';
import { PagedResponse } from '../models/PagedResponse.model';

@Injectable({
  providedIn: 'root'
})
export class TPEService {
  private apiUrl = 'https://localhost:7063/api/tpe';

  constructor(private http: HttpClient, private authService: AuthService,private userService:UserService) {}

  private getAuthHeaders() {
    const token = this.authService.getAccessToken();
    return { headers: new HttpHeaders({ 'Authorization': `Bearer ${token}` }) };
  }
getAllTPEs(): Observable<any[]> {
  return this.http.get<any[]>(this.apiUrl, this.getAuthHeaders());
}

deleteTPE(id: string): Observable<any> {
  return this.http.delete(`${this.apiUrl}/${id}`, this.getAuthHeaders());
}
 createTPE(tpeData: { numSerie?: string; modele: number; commercantId: string }): Observable<any> {
    const payload: any = {
      commercantId: tpeData.commercantId,
      modele: tpeData.modele
    };
    
    // Si un numéro de série est fourni, l'envoyer (optionnel)
    if (tpeData.numSerie) {
      payload.numSerie = tpeData.numSerie;
    }
    
    return this.http.post(this.apiUrl, payload, this.getAuthHeaders());
  }
  updateTPE(id: string, tpeData: { modele: number; commercantId: string | null }): Observable<any> {
    const payload: any = {
      modele: tpeData.modele
    };
    
    // Envoyer commercantId seulement s'il a une valeur (peut être null pour désassigner)
    if (tpeData.commercantId !== undefined) {
      payload.commercantId = tpeData.commercantId;
    }
    
    return this.http.put(`${this.apiUrl}/${id}`, payload, this.getAuthHeaders());
  }
 /** récupère seulement les utilisateurs ayant le rôle "Commercant" */
private userApi = 'https://localhost:7063/api/users/roles';
getTPEById(id: string): Observable<any> {
  return this.http.get(`${this.apiUrl}/${id}`, this.getAuthHeaders());
}
getMyTpes(): Observable<any[]> {
  // Récupérer l'utilisateur connecté avec son id
  return this.userService.getMyProfile().pipe(
    switchMap(user => {
      if (!user || !user.id) {
        throw new Error('Impossible de récupérer l’utilisateur');
      }
      // Appel API TPE
      return this.http.get<any>(
        `${this.apiUrl}/commercant/${user.id}`,
        this.getAuthHeaders()
      );
    }),
    map(res => res.data || [])  // <-- IMPORTANT : récupérer seulement le tableau
  );
}

// Dans tpe.service.ts, modifier getPagedTPEs
getPagedTPEs(params: {
  page: number;
  pageSize: number;
  searchTerm?: string;
  modele?: string;
  commercantId?: string;
}): Observable<PagedResponse<any>> {
  let httpParams = new HttpParams()
    .set('Page', params.page.toString())
    .set('PageSize', params.pageSize.toString());

  if (params.searchTerm?.trim()) {
    httpParams = httpParams.set('SearchTerm', params.searchTerm.trim());
  }
  if (params.modele) {
    httpParams = httpParams.set('Modele', params.modele);
  }
  if (params.commercantId) {
    httpParams = httpParams.set('CommercantId', params.commercantId);
  }

  return this.http.get<any>(`${this.apiUrl}/withFilters`, {
    params: httpParams,
    ...this.getAuthHeaders()
  }).pipe(
    map(response => {
      const pagedResult = response.data;
      
      // ✅ Mapper les items avec les champs d'audit
      const items = (pagedResult?.items || []).map((item: any) => ({
        id: item.id,
        numSerie: item.numSerie,
        numSerieComplet: item.numSerieComplet,
        modele: item.modele,
        commercantId: item.commercantId,
        commercantNom: item.commercantNom,
        // ✅ Ajouter les champs d'audit
        createdAt: item.createdAt,
        createdByNom: item.createdByNom,
        updatedAt: item.updatedAt,
        updatedByNom: item.updatedByNom
      }));
      
      return {
        data: items,
        pagination: {
          page: pagedResult?.page || 1,
          pageSize: pagedResult?.pageSize || params.pageSize,
          totalCount: pagedResult?.totalCount || 0,
          totalPages: pagedResult?.totalPages || 1,
          hasPreviousPage: pagedResult?.hasPreviousPage || false,
          hasNextPage: pagedResult?.hasNextPage || false
        }
      };
    })
  );
}
}