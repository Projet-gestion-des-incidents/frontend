import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { catchError, map, Observable, of, switchMap, tap } from 'rxjs';
import { AuthService } from './auth.service';
import { User } from '../models/User.model';
import { PagedResponse } from '../models/PagedResponse.model';

@Injectable({
  providedIn: 'root'
})

export class UserService {

  private apiUrl = 'https://localhost:7063/api/users';

  constructor(
    private http: HttpClient,
    private authService: AuthService  
  ) {}

  private getAuthHeaders(): { headers: HttpHeaders } {
    const token = this.authService.getAccessToken();
    return {
      headers: new HttpHeaders({
        'Authorization': `Bearer ${token}`
      })
    };
  }
 
  //desactiver un utilisateur
desactivateUser(id: string) {
  return this.http.delete(
    `${this.apiUrl}/desactivate/${id}`,
    this.getAuthHeaders()
  );
}
  //activer un utilisateur
  activateUser(id: string) {
  return this.http.put(`${this.apiUrl}/${id}/activate`, {}, this.getAuthHeaders());
}

// deconnexion
logout(): void {
  this.authService.logout();
}
 

// Récupérer la liste des commercants avec pagination
getCommercants(): Observable<any[]> {
  console.log(' Récupération des commerçants...');
    let params = new HttpParams();

 
  
  return this.http.get<any>(`${this.apiUrl}/commercants?Page=1&PageSize=1`, this.getAuthHeaders())
    .pipe(
      switchMap(firstResponse => {
        const totalCount = firstResponse?.pagination?.totalCount || 0;
        if (totalCount === 0) return of([]);
        
        // Récupérer tous les commerçants en une seule requête avec un grand pageSize
        const params = new HttpParams()
          .set('Page', '1')
          .set('PageSize', totalCount.toString())
          .set('SortBy', 'nomMagasin')
          .set('SortDescending', 'false');
        
        return this.http.get<any>(`${this.apiUrl}/commercants`, {
          params,
          headers: this.getAuthHeaders().headers
        });
      }),
      map(response => {
        if (response?.data && Array.isArray(response.data)) {
          return response.data.map((commercant: any) => ({
            id: commercant.id,
            nomMagasin: commercant.nomMagasin || commercant.userName,
            email: commercant.email,
            phoneNumber: commercant.phoneNumber,
            adresse: commercant.adresse,
            statut: commercant.statut,
            role: 'Commercant',
            image: this.getFullImageUrl(commercant.image)
          }));
        }
        return [];
      }),
      catchError(error => {
        console.error(' Erreur récupération tous commerçants:', error);
        return of([]);
      })
    );
}


// Helper pour déterminer le statut
private determineStatut(user: any): 'Actif' | 'Inactif' {
  // Vérifier différentes propriétés possibles
  if (user.statut === 'Inactif' || user.Statut === 'Inactif') {
    return 'Inactif';
  }
  
  if (user.isLocked === true || user.isLockedOut === true) {
    return 'Inactif';
  }
  
  if (user.lockoutEnd && new Date(user.lockoutEnd) > new Date()) {
    return 'Inactif';
  }
  
  return 'Actif'; // Par défaut
}
// Récupérer mon profil
 getMyProfile(): Observable<User> {
  return this.http.get<User>(
    `${this.apiUrl}/me`,
    this.getAuthHeaders()
  ).pipe(
    map(user => ({
      ...user,
       phoneNumber: user.phoneNumber, 
         adresse: user.adresse,
      image: this.getFullImageUrl(user.image)
    }))
  );
}
// Récupérer la liste des techniciens avec pagination
getTechniciens(request?: any): Observable<any> {
  console.log(' Récupération des techniciens...', request);
  
  let params = new HttpParams();
  if (request) {
    if (request.page) params = params.set('Page', request.page.toString());
    if (request.pageSize) params = params.set('PageSize', request.pageSize.toString());
    if (request.sortBy) params = params.set('SortBy', request.sortBy);
    if (request.sortDescending) params = params.set('SortDescending', request.sortDescending.toString());
    if (request.searchTerm) params = params.set('SearchTerm', request.searchTerm);
    if (request.role) params = params.set('Role', request.role);
    if (request.statut) params = params.set('Statut', request.statut);
  }
  
  return this.http.get<any>(`${this.apiUrl}/techniciens`, {
    params,
    headers: this.getAuthHeaders().headers
  }).pipe(
    tap(response => {
      console.log(' Réponse API techniciens:', response);
    }),
    map(response => {
      // Extraire les données de la réponse ApiResponse
      let items = [];
      let pagination = null;
      
      if (response?.data && Array.isArray(response.data)) {
        items = response.data;
      } else if (response?.data?.items && Array.isArray(response.data.items)) {
        items = response.data.items;
        pagination = {
          page: response.data.page,
          pageSize: response.data.pageSize,
          totalCount: response.data.totalCount,
          totalPages: response.data.totalPages
        };
      } else if (response?.items && Array.isArray(response.items)) {
        items = response.items;
        pagination = {
          page: response.page,
          pageSize: response.pageSize,
          totalCount: response.totalCount,
          totalPages: response.totalPages
        };
      } else if (Array.isArray(response)) {
        items = response;
      }
      
      const mappedItems = items.map((user: any) => ({
        id: user.id,
        nom: user.nom,
        userName: user.userName,
        phoneNumber: user.phoneNumber,
        prenom: user.prenom,
        email: user.email,
        role: user.role,
        statut: user.statut,
        birthDate: user.birthDate,
          emailConfirmed: user.emailConfirmed, 
        image: this.getFullImageUrl(user.image)
      }));
      
      return {
        data: mappedItems,
        pagination: pagination
      };
    }),
    catchError(error => {
      console.error(' Erreur récupération techniciens:', error);
      return of({ data: [], pagination: null });
    })
  );
}

// Récupérer un technicien par son id
getTechnicienById(id: string): Observable<any> {
  console.log(' Récupération du technicien par ID:', id);
  
  return this.http.get<any>(
    `${this.apiUrl}/technicien/${id}`,
    this.getAuthHeaders()
  ).pipe(
    tap(response => {
      console.log(' Réponse API getTechnicienById:', response);
    }),
    map(response => {
      // Extraire les données de la réponse ApiResponse
      const data = response?.data || response;
      return {
        id: data.id,
        userName: data.userName,
        nom: data.nom,
        prenom: data.prenom,
        email: data.email,
        phoneNumber: data.phoneNumber,
        birthDate: data.birthDate,
        statut: data.statut,
        role: 'Technicien',
        image: this.getFullImageUrl(data.image)
      };
    }),
    catchError(error => {
      console.error(' Erreur getTechnicienById:', error);
      throw error;
    })
  );
}

// Récupérer un commerçant par son id
getCommercantById(id: string): Observable<any> {
  console.log(' Récupération du commerçant par ID:', id);
  
  return this.http.get<any>(
    `${this.apiUrl}/commercant/${id}`,
    this.getAuthHeaders()
  ).pipe(
    tap(response => {
      console.log(' Réponse API getCommercantById:', response);
    }),
    map(response => {
      // Extraire les données de la réponse ApiResponse
      const data = response?.data || response;
      return {
        id: data.id,
        nomMagasin: data.nomMagasin,
        email: data.email,
        phoneNumber: data.phoneNumber,
        adresse: data.adresse,
        statut: data.statut,
        role: 'Commercant',
        image: this.getFullImageUrl(data.image)
      };
    }),
    catchError(error => {
      console.error(' Erreur getCommercantById:', error);
      throw error;
    })
  );
}
//  admin : modifier profile
updateMyProfile(data: any): Observable<any> {
  return this.http.put<any>(
    `${this.apiUrl}/me`,
    data,                 
    this.getAuthHeaders()  
  ).pipe(
    map(response => response),  // Retourner la réponse complète ApiResponse
    catchError(error => {
      console.error('Erreur updateMyProfile:', error);
      throw error;
    })
  );
}

//  technicien : modifier profile
updateTechnicienProfile(data: any): Observable<any> {
  return this.http.put<any>(
    `${this.apiUrl}/me/technicien`,
    data,                 
    this.getAuthHeaders()  
  ).pipe(
    map(response => response),  // Retourner la réponse complète ApiResponse
    catchError(error => {
      console.error('Erreur updateTechnicienProfile:', error);
      throw error;
    })
  );
}

//  commerçant : modifier profile
updateCommercantProfile(data: any): Observable<any> {
  return this.http.put<any>(
    `${this.apiUrl}/me/commercant`,
    data,                 
    this.getAuthHeaders()  
  ).pipe(
    map(response => response),  // Retourner la réponse complète ApiResponse
    catchError(error => {
      console.error('Erreur updateCommercantProfile:', error);
      throw error;
    })
  );
}

// obtenir l'URL complète de l'image
private getFullImageUrl(imagePath: string | null | undefined): string {
  if (!imagePath) {
    return '/assets/default-avatar.png';
  }
  
  // Si l'image commence par http ou https, c'est déjà une URL complète
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // Si c'est une URL relative, ajouter le base URL
  if (imagePath.startsWith('/')) {
    // Pour localhost
    return `https://localhost:7063${imagePath}`;
  }
  
  // Par défaut
  return imagePath;
}

//supprimer un utilisateur
  deleteUser(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, this.getAuthHeaders());
  }

//creer un compte technicien
createTechnicien(data: { prenom: string; nom: string; email: string; userName: string }): Observable<any> {
  return this.http.post(`${this.apiUrl}/technicien`, data, this.getAuthHeaders());
}
//creer un compte commerçant
createCommercant(data: { nomMagasin: string; adresse: string; email: string; phoneNumber: string }): Observable<any> {
  return this.http.post(`${this.apiUrl}/commercant`, data, this.getAuthHeaders());
}
// modifier un compte commerçant
adminUpdateCommercant(id: string, data: { 
  nomMagasin?: string; 
  email?: string; 
  phoneNumber?: string; 
  adresse?: string;
  image?: string;
}): Observable<any> {
  return this.http.put(
    `${this.apiUrl}/commercant/${id}`,
    data,
    this.getAuthHeaders()
  ).pipe(
    map((response: any) => response.data || response),
    catchError(error => {
      console.error('Erreur adminUpdateCommercant:', error);
      throw error;
    })
  );
}
// modifier un compte technicien
adminUpdateTechnicien(id: string, data: { 
  userName?: string; 
  email?: string; 
  nom?: string; 
  prenom?: string; 
  phoneNumber?: string; 
  birthDate?: string;
  image?: string;
}): Observable<any> {
  return this.http.put(
    `${this.apiUrl}/technicien/${id}`,
    data,
    this.getAuthHeaders()
  ).pipe(
    map((response: any) => response.data || response),
    catchError(error => {
      console.error('Erreur adminUpdateTechnicien:', error);
      throw error;
    })
  );
}
}