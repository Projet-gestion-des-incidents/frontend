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
  createTPE(tpeData: { numSerie: string; modele: string; commercantId: string }): Observable<any> {
    return this.http.post(this.apiUrl, tpeData, this.getAuthHeaders());
  }
updateTPE(id: string, tpeData: { numSerie: string; modele: string; commercantId: string }): Observable<any> {
  return this.http.put(`${this.apiUrl}/${id}`, tpeData, this.getAuthHeaders());
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
getAllCommercants(): Observable<User[]> {
  return this.http.get<any>(this.userApi, this.getAuthHeaders())
    .pipe(
      map(res => res.data.filter((u: any) => u.role === 'Commercant'))
    );
}
// Dans tpe.service.ts, modifiez l'URL de la méthode getPagedTPEs
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

  // CORRECTION: Changer '/paged' par '/withFilters'
  return this.http.get<any>(`${this.apiUrl}/withFilters`, {
    params: httpParams,
    ...this.getAuthHeaders()
  }).pipe(
    map(response => {
      // Adapter selon la structure de réponse du backend
      // Votre backend retourne ApiResponse<PagedResult<TPEDto>>
      // La structure est: { data: { items, page, pageSize, totalCount }, ... }
      const pagedResult = response.data;
      
      return {
        data: pagedResult?.items || [],
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