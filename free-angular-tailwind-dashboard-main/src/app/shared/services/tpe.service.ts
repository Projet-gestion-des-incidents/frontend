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
      // Récupérer la liste des TPE 
getAllTPEs(): Observable<any[]> {
  return this.http.get<any[]>(this.apiUrl, this.getAuthHeaders());
}
  // supprimer un TPE
deleteTPE(id: string): Observable<any> {
  return this.http.delete(`${this.apiUrl}/${id}`, this.getAuthHeaders());
}
  // creer un TPE
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
    // Modifier un TPE
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
    // Récupérer un TPE avec son id
getTPEById(id: string): Observable<any> {
  return this.http.get(`${this.apiUrl}/${id}`, this.getAuthHeaders());
}
  // Récupérer mes TPE
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

      // Récupérer la liste des TPE avec pagination
getPagedTPEs(params: {
  page: number;
  pageSize: number;
  searchTerm?: string;
  modele?: string;
  commercantId?: string;
    nonAssigne?: boolean;  
  createdAt?: string;    
  updatedAt?: string;     
  createdById?: string;   
  updatedById?: string;    
}): Observable<PagedResponse<any>> {
  let httpParams = new HttpParams()
    .set('Page', params.page.toString())
    .set('PageSize', params.pageSize.toString());

  if (params.searchTerm?.trim()) {
    httpParams = httpParams.set('SearchTerm', params.searchTerm.trim());
  }
  if (params.modele) {
        // Filtrer par Modele
    httpParams = httpParams.set('Modele', params.modele);
  }
  if (params.nonAssigne === true) {
    httpParams = httpParams.set('NonAssigne', 'true');
  } 
  else if (params.commercantId && params.commercantId !== 'null') {
    // Filtrer par un commerçant spécifique
    httpParams = httpParams.set('CommercantId', params.commercantId);
  }
  //  Filtrer par date de creaction et date de modification
  if (params.createdAt) {
    httpParams = httpParams.set('CreatedAt', params.createdAt);
  }
  if (params.updatedAt) {
    httpParams = httpParams.set('UpdatedAt', params.updatedAt);
  }
    //  Filtrer par createur et modificateur
  if (params.createdById) {
    httpParams = httpParams.set('CreatedById', params.createdById);
  }
  if (params.updatedById) {
    httpParams = httpParams.set('UpdatedById', params.updatedById);
  }

  return this.http.get<any>(`${this.apiUrl}/withFilters`, {
    params: httpParams,
    ...this.getAuthHeaders()
  }).pipe(
    map(response => {
      const pagedResult = response.data;
      
      const items = (pagedResult?.items || []).map((item: any) => ({
        id: item.id,
        numSerie: item.numSerie,
        numSerieComplet: item.numSerieComplet,
        modele: item.modele,
        commercantId: item.commercantId,
        commercantNom: item.commercantNom,
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


//liste de mes tpes (avec pagination, recherche et filtres)
getMesTPEsPaged(params: {
  page: number;
  pageSize: number;
  searchTerm?: string;
  modele?: string;
  createdAt?: string;  
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
  if (params.createdAt) {
    httpParams = httpParams.set('CreatedAt', params.createdAt);
  }
  return this.http.get<any>(`${this.apiUrl}/mes-tpe`, {
    params: httpParams,
    ...this.getAuthHeaders()
  }).pipe(
    map(response => {
      const pagedResult = response.data;
      
      const items = (pagedResult?.items || []).map((item: any) => ({
        id: item.id,
        numSerie: item.numSerie,
        numSerieComplet: item.numSerieComplet,
        modele: item.modele,
        commercantId: item.commercantId,
        commercantNom: item.commercantNom,
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