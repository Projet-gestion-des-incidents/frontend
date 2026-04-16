import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { catchError, map, Observable, of, switchMap, tap } from 'rxjs';
import { AuthService } from './auth.service';
import { User } from '../models/User.model';
import { PagedResponse } from '../models/PagedResponse.model';


export interface CreateUserDto {
  // Doit correspondre EXACTEMENT au backend C#
  userName: string;     
  email: string;        
  nom: string;          
  prenom: string;       
  phoneNumber?: string;       
  roleId: string;  
  image?: string | null; 
  password: string;  
  birthDate?: string; 
   
}
export interface EditProfileDto {
  userName: string;
  email: string;
  nom: string;
  prenom: string;
  phoneNumber?: string;
  birthDate?: string;
  image?: File | null;
  password?: string;
}

export interface RoleOption {
  id: string;
  name: string;
}
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
 
desactivateUser(id: string) {
  return this.http.delete(
    `${this.apiUrl}/desactivate/${id}`,
    this.getAuthHeaders()
  );
}



 

// Dans user.service.ts, ajoutez cette méthode

getCommercants(): Observable<any[]> {
  console.log('🔍 Récupération des commerçants...');
  
  return this.http.get<any>(`${this.apiUrl}/commercants`, this.getAuthHeaders())
    .pipe(
      tap(response => {
        console.log('📦 Réponse API commerçants:', response);
      }),
      map(response => {
        // Le backend renvoie ApiResponse avec data
        if (response?.data && Array.isArray(response.data)) {
          return response.data.map((commercant: any) => ({
            id: commercant.id,
            nomMagasin: commercant.nomMagasin || commercant.userName,
            email: commercant.email,
            phoneNumber: commercant.phoneNumber,
            adresse: commercant.adresse,
            statut: commercant.statut,
            role: 'Commercant'
          }));
        }
        if (Array.isArray(response)) {
          return response.map((commercant: any) => ({
            id: commercant.id,
            nomMagasin: commercant.nomMagasin || commercant.userName,
            email: commercant.email,
            phoneNumber: commercant.phoneNumber,
            adresse: commercant.adresse,
            statut: commercant.statut,
            role: 'Commercant'
          }));
        }
        return [];
      }),
      catchError(error => {
        console.error('❌ Erreur récupération commerçants:', error);
        return of([]);
      })
    );
}
searchUsers(request: any): Observable<PagedResponse<User>> {
  let params = new HttpParams()
    .set('Page', request.page.toString())
    .set('PageSize', request.pageSize.toString())
    .set('SortBy', request.sortBy || 'nom')
    .set('SortDescending', request.sortDescending.toString());

  if (request.searchTerm?.trim()) {
    params = params.set('SearchTerm', request.searchTerm.trim());
  }
  if (request.role) params = params.set('Role', request.role);
  if (request.statut) params = params.set('Statut', request.statut);

  return this.http.get<any>(`${this.apiUrl}/search`, {
    params,
    headers: this.getAuthHeaders().headers
  }).pipe(
    map(res => {
      console.log('Réponse API:', res);
            console.log('Réponse API:', res.data.items);

      // CAS 1: Format ApiResponse avec data qui contient PagedResult
      if (res?.data?.items) {
        return {
          data: this.mapUsers(res.data.items),
          pagination: {
            page: res.data.page || 1,
            pageSize: res.data.pageSize || request.pageSize,
            totalCount: res.data.totalCount || 0,
            totalPages: res.data.totalPages || 1,
            hasPreviousPage: res.data.hasPreviousPage || false,
            hasNextPage: res.data.hasNextPage || false
          }
        };
      }
      
      // CAS 2: Format direct PagedResult
      if (res?.items) {
        return {
          data: this.mapUsers(res.items),
          pagination: {
            page: res.page || 1,
            pageSize: res.pageSize || request.pageSize,
            totalCount: res.totalCount || 0,
            totalPages: res.totalPages || 1,
            hasPreviousPage: res.hasPreviousPage || false,
            hasNextPage: res.hasNextPage || false
          }
        };
      }
      
      // CAS 3: Format avec data et pagination séparés
      if (res?.data && res?.pagination) {
        return {
          data: this.mapUsers(res.data),
          pagination: {
            page: res.pagination.page || 1,
            pageSize: res.pagination.pageSize || request.pageSize,
            totalCount: res.pagination.totalCount || 0,
            totalPages: res.pagination.totalPages || 1,
            hasPreviousPage: res.pagination.hasPreviousPage || false,
            hasNextPage: res.pagination.hasNextPage || false
          }
        };
      }
      
      // Fallback
      console.warn('Format inattendu:', res);
      return {
        data: [],
        pagination: {
          page: 1,
          pageSize: request.pageSize,
          totalCount: 0,
          totalPages: 1,
          hasPreviousPage: false,
          hasNextPage: false
        }
      };
    })
  );
}

// Helper pour mapper les utilisateurs
private mapUsers(users: any[]): User[] {
  if (!users || !Array.isArray(users)) {
    return [];
  }
  
  return users.map(user => {
    // CONVERTIR birthDate en objet Date POUR TOUS LES UTILISATEURS
    let birthDate: Date | undefined = undefined;
    
    if (user.birthDate) {
      try {
        // Si c'est une string ISO "1999-01-25T00:00:00"
        if (typeof user.birthDate === 'string') {
          birthDate = new Date(user.birthDate);
        }
        // Si c'est déjà une Date
        else if (user.birthDate instanceof Date) {
          birthDate = user.birthDate;
        }
        // Autre format
        else {
          birthDate = new Date(user.birthDate);
        }
      } catch (e) {
        console.warn('Erreur conversion date:', user.birthDate);
      }
    }
    
    return {
      id: user.id || user.Id || '',
      nom: user.nom || user.Nom || '',
      prenom: user.prenom || user.Prenom || '',
      email: user.email || user.Email || '',
      phoneNumber: user.phoneNumber || user.PhoneNumber || user.phone || '',
      role: user.role || user.Role || 'User',
      image: this.getFullImageUrl(user.image || user.Image),
      birthDate: birthDate, // Maintenant c'est un vrai objet Date
      statut: this.determineStatut(user)
    };
  });
}
private parseBirthDate(user: any): Date | undefined {
  const birthDateValue = user.birthDate 
  
  if (!birthDateValue) return undefined;
  
  try {
    // Si c'est une string, la convertir en Date
    if (typeof birthDateValue === 'string') {
      // Gérer différents formats
      if (birthDateValue.includes('T')) {
        return new Date(birthDateValue); // Format ISO
      } else {
        // Format YYYY-MM-DD
        return new Date(birthDateValue + 'T00:00:00');
      }
    }
    // Si c'est déjà une Date
    return new Date(birthDateValue);
  } catch (e) {
    console.warn('Erreur parsing date:', birthDateValue, e);
    return undefined;
  }
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
// Dans user.service.ts

// Dans user.service.ts - Modifiez la méthode getTechniciens pour accepter les paramètres de pagination

getTechniciens(request?: any): Observable<any> {
  console.log('🔍 Récupération des techniciens...', request);
  
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
      console.log('📦 Réponse API techniciens:', response);
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
      console.error('❌ Erreur récupération techniciens:', error);
      return of({ data: [], pagination: null });
    })
  );
}
// Dans user.service.ts - Ajoutez ces méthodes

// Récupérer un technicien par son ID
getTechnicienById(id: string): Observable<any> {
  console.log('🔍 Récupération du technicien par ID:', id);
  
  return this.http.get<any>(
    `${this.apiUrl}/technicien/${id}`,
    this.getAuthHeaders()
  ).pipe(
    tap(response => {
      console.log('📦 Réponse API getTechnicienById:', response);
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
      console.error('❌ Erreur getTechnicienById:', error);
      throw error;
    })
  );
}

// Récupérer un commerçant par son ID
getCommercantById(id: string): Observable<any> {
  console.log('🔍 Récupération du commerçant par ID:', id);
  
  return this.http.get<any>(
    `${this.apiUrl}/commercant/${id}`,
    this.getAuthHeaders()
  ).pipe(
    tap(response => {
      console.log('📦 Réponse API getCommercantById:', response);
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
      console.error('❌ Erreur getCommercantById:', error);
      throw error;
    })
  );
}
// user.service.ts - Ajouter les nouvelles méthodes

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

// ✅ Pour le technicien uniquement - méthode spécifique
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

// ✅ Pour le commerçant uniquement - méthode spécifique
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

// Méthode pour obtenir l'URL complète de l'image
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


  deleteUser(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, this.getAuthHeaders());
  }

 

  activateUser(id: string) {
  return this.http.put(`${this.apiUrl}/${id}/activate`, {}, this.getAuthHeaders());
}
// Dans user.service.ts, ajoutez ces méthodes :

createTechnicien(data: { prenom: string; nom: string; email: string; userName: string }): Observable<any> {
  return this.http.post(`${this.apiUrl}/technicien`, data, this.getAuthHeaders());
}

createCommercant(data: { nomMagasin: string; adresse: string; email: string; phoneNumber: string }): Observable<any> {
  return this.http.post(`${this.apiUrl}/commercant`, data, this.getAuthHeaders());
}
// Dans user.service.ts - Méthode pour l'admin qui met à jour un commerçant
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
// Dans user.service.ts - Méthode pour l'admin qui met à jour un technicien
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
