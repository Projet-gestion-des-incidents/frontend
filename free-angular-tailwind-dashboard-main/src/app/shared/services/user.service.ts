import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { map, Observable, tap } from 'rxjs';
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

// export interface User {
//   id: string;
//   userName: string;
//   email: string;
//   nom: string;
//   prenom: string;
//   age?: number | null;
//   phone?: string;
//   roleId?: string;
//   image?: string;
//     isLocked: boolean;

// }
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



  getAvailableRoles(): Observable<RoleOption[]> {
    return this.http.get<RoleOption[]>(
      `${this.apiUrl}/roles/register`, 
      this.getAuthHeaders()
    ).pipe(
      map((res: any) => res.data || [])
    );
  }
  getAllUsers(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl, this.getAuthHeaders());
  }
 
getAllUsersWithRoles(): Observable<User[]> {
  return this.http.get<any[]>(`${this.apiUrl}/roles`, this.getAuthHeaders())
    .pipe(
      tap(response => {
              console.log('Réponse API /roles:', response);
        console.log('Premier utilisateur:', response[0]);
      }),
      map((response: any[]) => response.map(user => ({
        ...user,
        birthDate: user.birthdate ? new Date(user.birthdate) : undefined, // <-- convertit en Date

        // Compléter l'URL de l'image si elle est relative
      image: this.getFullImageUrl(user.image)
      })))
    );
}
// Dans user.service.ts
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
      console.log('📦 Réponse API:', res);
            console.log('📦 Réponse API:', res.data.items);

      // ✅ CAS 1: Format ApiResponse avec data qui contient PagedResult
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
      
      // ✅ CAS 2: Format direct PagedResult
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
      
      // ✅ CAS 3: Format avec data et pagination séparés
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
      console.warn('⚠️ Format inattendu:', res);
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

// ✅ Helper pour mapper les utilisateurs
private mapUsers(users: any[]): User[] {
  if (!users || !Array.isArray(users)) {
    return [];
  }
  
  return users.map(user => {
    // ✅ CONVERTIR birthDate en objet Date POUR TOUS LES UTILISATEURS
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
      birthDate: birthDate, // ✅ Maintenant c'est un vrai objet Date
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
    console.warn('❌ Erreur parsing date:', birthDateValue, e);
    return undefined;
  }
}
// ✅ Helper pour déterminer le statut
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
      image: this.getFullImageUrl(user.image)
    }))
  );
}
updateMyProfile(data: any): Observable<User> {
  return this.http.put<User>(
    `${this.apiUrl}/me`,
    data,                  // ✅ BODY
    this.getAuthHeaders()   // ✅ HEADERS
  ).pipe(
    map(user => ({
      ...user,
      phoneNumber: user.phoneNumber,
      // birthDate:user.birthDate,
      image: this.getFullImageUrl(user.image)
    }))
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
  getUserById(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`, this.getAuthHeaders());
  }

  deleteUser(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, this.getAuthHeaders());
  }

  createUser(userData: CreateUserDto): Observable<any> {
    return this.http.post(this.apiUrl, userData, this.getAuthHeaders());
  }

  updateUser(id: string, userData: Partial<CreateUserDto>): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, userData, this.getAuthHeaders());
  }

  activateUser(id: string) {
  return this.http.put(`${this.apiUrl}/${id}/activate`, {}, this.getAuthHeaders());
}

}
