import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { EntiteImpactee, TypeEntiteImpactee, ApiResponse } from '../models/incident.model';

export interface CreateEntiteImpacteeDTO {
  typeEntiteImpactee: TypeEntiteImpactee;
  nom: string;
}

export interface UpdateEntiteImpacteeDTO {
  id: string; // ⚠️ ID requis pour la modification
  typeEntiteImpactee: TypeEntiteImpactee;
  nom: string;
}

@Injectable({
  providedIn: 'root'
})
export class EntiteImpacteeService {
  private apiUrl = 'https://localhost:7000/api/entites-impactees';

  constructor(private http: HttpClient) {}

  // Récupérer toutes les entités impactées
  getAll(): Observable<EntiteImpactee[]> {
    return this.http.get<ApiResponse<EntiteImpactee[]>>(this.apiUrl).pipe(
      map(response => response.data)
    );
  }

  // Récupérer une entité par ID
  getById(id: string): Observable<EntiteImpactee> {
    return this.http.get<ApiResponse<EntiteImpactee>>(`${this.apiUrl}/${id}`).pipe(
      map(response => response.data)
    );
  }

  // Récupérer les entités par type
  getByType(type: TypeEntiteImpactee): Observable<EntiteImpactee[]> {
    return this.http.get<ApiResponse<EntiteImpactee[]>>(`${this.apiUrl}/by-type/${type}`).pipe(
      map(response => response.data)
    );
  }

  // Récupérer les entités par incident
  getByIncidentId(incidentId: string): Observable<EntiteImpactee[]> {
    return this.http.get<ApiResponse<EntiteImpactee[]>>(`${this.apiUrl}/by-incident/${incidentId}`).pipe(
      map(response => response.data)
    );
  }

  // Créer une nouvelle entité impactée
  create(dto: CreateEntiteImpacteeDTO): Observable<EntiteImpactee> {
    return this.http.post<ApiResponse<EntiteImpactee>>(this.apiUrl, dto).pipe(
      map(response => response.data)
    );
  }

  // 🔥 NOUVEAU : Mettre à jour une entité existante
  update(id: string, dto: UpdateEntiteImpacteeDTO): Observable<EntiteImpactee> {
    return this.http.put<ApiResponse<EntiteImpactee>>(`${this.apiUrl}/${id}`, dto).pipe(
      map(response => response.data)
    );
  }

  // 🔥 NOUVEAU : Supprimer une entité
  delete(id: string): Observable<boolean> {
    return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/${id}`).pipe(
      map(response => response.data)
    );
  }
}