import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface CreateUserDto {
  // Doit correspondre EXACTEMENT au backend C#
  userName: string;     
  email: string;        
  nom: string;          
  prenom: string;       
  age?: number;         
  phone?: string;       
  role?: string;        
  image?: string;       
  password: string;     
}

export interface User {
  id: string;
  userName: string;
  email: string;
  nom: string;
  prenom: string;
  age?: number | null;
  phone?: string;
  role?: string;
  image?: string;
}

@Injectable({
  providedIn: 'root'
})

export class UserService {

  private apiUrl = 'https://localhost:7063/api/users';

  constructor(
    private http: HttpClient,
    private authService: AuthService  // injecter le service Auth
  ) {}

  private getAuthHeaders(): { headers: HttpHeaders } {
    const token = this.authService.getAccessToken();
    return {
      headers: new HttpHeaders({
        'Authorization': `Bearer ${token}`
      })
    };
  }

  getAllUsers(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl, this.getAuthHeaders());
  }
  getAllUsersWithRoles(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/roles`, this.getAuthHeaders());
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

}
