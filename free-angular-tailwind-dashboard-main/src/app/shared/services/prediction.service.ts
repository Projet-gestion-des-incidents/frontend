// prediction.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service'; 

export interface DailyIncidentCountDTO {
  date: string;
  totalIncidents: number;
  paiementRefuse: number;
  terminalHorsLigne: number;
  lenteur: number;
  bugAffichage: number;
  connexionReseau: number;
  erreurFluxTransactionnel: number;
  problemeLogicielTPE: number;
  autre: number;
}

export interface PredictionResultDTO {
  date: string;
  periode: string;
  totalIncidents: number;
  incidentsParType: { [key: string]: number };
  confidenceLower: number;
  confidenceUpper: number;
}

export interface IncidentPredictionResponseDTO {
  predictionSemaine: PredictionResultDTO[];
  predictionMois: PredictionResultDTO[];
  dateGeneration: string;
  modele: string;
}

export interface ApiResponse<T> {
  data: T;
  isSuccess: boolean;
  message: string;
  errors?: string[] | null;
  resultCode?: number;
}

@Injectable({ providedIn: 'root' })
export class PredictionService {
  private readonly baseUrl = 'https://localhost:7063/api/prediction';

  constructor(
    private http: HttpClient,
    private authService: AuthService 
  ) {}

  //  les headers d'authentification
  private getAuthHeaders(): { headers: HttpHeaders } {
    const token = this.authService.getAccessToken();
    return {
      headers: new HttpHeaders({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      })
    };
  }

  getPredictions(): Observable<ApiResponse<IncidentPredictionResponseDTO>> {
    return this.http.get<ApiResponse<IncidentPredictionResponseDTO>>(
      `${this.baseUrl}/incidents`,
      this.getAuthHeaders() 
    );
  }

  getHistorical(monthsBack = 4): Observable<ApiResponse<DailyIncidentCountDTO[]>> {
    const params = new HttpParams().set('monthsBack', monthsBack.toString());
    return this.http.get<ApiResponse<DailyIncidentCountDTO[]>>(
      `${this.baseUrl}/historical`,
      { params, ...this.getAuthHeaders() } 
    );
  }
}