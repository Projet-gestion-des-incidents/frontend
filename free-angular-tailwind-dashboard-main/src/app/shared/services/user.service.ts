import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { map, Observable, tap } from 'rxjs';
import { AuthService } from './auth.service';

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

export interface User {
  id: string;
  userName: string;
  email: string;
  nom: string;
  prenom: string;
  age?: number | null;
  phone?: string;
  roleId?: string;
  image?: string;
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
  getMyProfile(): Observable<User> {
  return this.http.get<User>(
    `${this.apiUrl}/me`,
    this.getAuthHeaders()
  ).pipe(
    map(user => ({
      ...user,
       phone: (user as any).phoneNumber, 
      image: this.getFullImageUrl(user.image)
    }))
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
        // Compléter l'URL de l'image si elle est relative
      image: this.getFullImageUrl(user.image)
      })))
    );
}
updateMyProfile(userData: Partial<User>): Observable<User> {
  return this.http.put<User>(`${this.apiUrl}/me`, userData, this.getAuthHeaders())
    .pipe(
      map(user => ({
        ...user,
        phone: (user as any).phoneNumber, // adapter le champ pour le frontend
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
