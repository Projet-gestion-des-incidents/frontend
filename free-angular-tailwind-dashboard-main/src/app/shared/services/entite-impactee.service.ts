import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { EntiteImpactee, TypeEntiteImpactee, ApiResponse } from '../models/incident.model';
import { AuthService } from './auth.service';

export interface CreateEntiteImpacteeDTO {
  typeEntiteImpactee: TypeEntiteImpactee;
  nom: string;
}

export interface UpdateEntiteImpacteeDTO {
  id: string;
  typeEntiteImpactee: TypeEntiteImpactee;
  nom: string;
}

export interface AddEntiteImpacteeToIncidentDTO {
  incidentId: string;
  typeEntiteImpactee: TypeEntiteImpactee;
}

@Injectable({
  providedIn: 'root'
})
export class EntiteImpacteeService {
  private apiUrl = 'https://localhost:7063/api/entites-impactees'; // Vérifiez le port

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getAuthHeaders(): { headers: HttpHeaders } {
    const token = this.authService.getAccessToken();
    return {
      headers: new HttpHeaders({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      })
    };
  }

  // Récupérer toutes les entités impactées
  getAll(): Observable<EntiteImpactee[]> {
    return this.http.get<ApiResponse<EntiteImpactee[]>>(this.apiUrl, this.getAuthHeaders()).pipe(
      map(response => response.data)
    );
  }

  // Récupérer une entité par ID
  getById(id: string): Observable<EntiteImpactee> {
    return this.http.get<ApiResponse<EntiteImpactee>>(`${this.apiUrl}/${id}`, this.getAuthHeaders()).pipe(
      map(response => response.data)
    );
  }

  // Récupérer les entités par type
  getByType(type: TypeEntiteImpactee): Observable<EntiteImpactee[]> {
    return this.http.get<ApiResponse<EntiteImpactee[]>>(`${this.apiUrl}/by-type/${type}`, this.getAuthHeaders()).pipe(
      map(response => response.data)
    );
  }

  // Récupérer les entités par incident
  getByIncidentId(incidentId: string): Observable<EntiteImpactee[]> {
    return this.http.get<ApiResponse<EntiteImpactee[]>>(`${this.apiUrl}/by-incident/${incidentId}`, this.getAuthHeaders()).pipe(
      map(response => response.data)
    );
  }

  // Créer une nouvelle entité impactée
  create(dto: CreateEntiteImpacteeDTO): Observable<EntiteImpactee> {
    return this.http.post<ApiResponse<EntiteImpactee>>(this.apiUrl, dto, this.getAuthHeaders()).pipe(
      map(response => response.data)
    );
  }

  // Mettre à jour une entité existante
  update(id: string, dto: UpdateEntiteImpacteeDTO): Observable<EntiteImpactee> {
    return this.http.put<ApiResponse<EntiteImpactee>>(`${this.apiUrl}/${id}`, dto, this.getAuthHeaders()).pipe(
      map(response => response.data)
    );
  }

  // Supprimer une entité
  delete(id: string): Observable<boolean> {
    return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/${id}`, this.getAuthHeaders()).pipe(
      map(response => response.data)
    );
  }

  // AJOUTER une entité impactée à un incident
  addToIncident(incidentId: string, typeEntiteImpactee: TypeEntiteImpactee): Observable<ApiResponse<EntiteImpactee>> {
    const dto: AddEntiteImpacteeToIncidentDTO = {
      incidentId: incidentId,
      typeEntiteImpactee: typeEntiteImpactee
    };
    
    console.log('📦 Ajout entité à l\'incident:', dto);
    
    return this.http.post<ApiResponse<EntiteImpactee>>(
      `${this.apiUrl}/add-to-incident`,
      dto,
      this.getAuthHeaders()
    );
  }

  // RETIRER une entité impactée d'un incident
  removeFromIncident(entiteId: string): Observable<ApiResponse<boolean>> {
    console.log('🗑️ Retrait entité de l\'incident:', entiteId);
    
    return this.http.delete<ApiResponse<boolean>>(
      `${this.apiUrl}/${entiteId}`,
      this.getAuthHeaders()
    );
  }
}