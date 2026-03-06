import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { User } from '../models/User.model';

@Injectable({
  providedIn: 'root'
})
export class TPEService {
  private apiUrl = 'https://localhost:7063/api/tpe';

  constructor(private http: HttpClient, private authService: AuthService) {}

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

 /** récupère seulement les utilisateurs ayant le rôle "Commercant" */
private userApi = 'https://localhost:7063/api/users/roles';

getAllCommercants(): Observable<User[]> {
  return this.http.get<any>(this.userApi, this.getAuthHeaders())
    .pipe(
      map(res => res.data.filter((u: any) => u.role === 'Commercant'))
    );
}

}