// dashboard-admin.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models/Ticket.models';
import { AuthService } from './auth.service';

// dashboard-admin.service.ts
export interface TicketDashboardDTO {
  overview: {
    totalTickets: number;
    ticketsNonAssigne: number;
    ticketsAssignes: number;
    ticketsEnCours: number;
    ticketsResolus: number;
    tauxNonAssigne: number;
    tauxAssignes: number;
    tauxEnCours: number;
    tauxResolus: number;
    tauxResolutionGlobal: number;
  };
  statsResolution: {
    tempsMoyenResolutionHeures: number;
    tempsMoyenResolutionJours: number;
    ticketsResolusAvantDelai: number;
    ticketsResolusApresDelai: number;
    ticketsSansDateLimite: number;
    tauxRespectDelai: number;
  };
  statsParStatut: Array<{
    statut: string;
    count: number;
    color: string;
    pourcentage: number;
  }>;
  statsParJour: Array<{
    date: string;
    dateFormatee: string;
    jour: string;
    crees: number;
    nonAssigne: number;
    assignes: number;
    enCours: number;
    resolus: number;
  }>;
  statsParSemaine: Array<any>;
  statsParMois: Array<any>;
  topTechniciens: Array<{
    technicienId: string;
    nom: string;
    prenom: string;
    nomComplet: string;
    ticketsResolus: number;
    ticketsEnCours: number;
    ticketsAssignes: number;  // ✅ AJOUTER cette propriété
    ticketsTotal: number;      // ✅ AJOUTER cette propriété
    tauxResolution: number;
  }>;
  resolutionParJour: Array<any>;
  resolutionParSemaine: Array<any>;
  resolutionParMois: Array<any>;
  
  // ✅ AJOUTER ces propriétés
  assignationParTechnicien?: Array<{
    technicienId: string;
    nom: string;
    prenom: string;
    nomComplet: string;
    ticketsAssignes: number;
    ticketsEnCours: number;
    ticketsResolus: number;
    totalTicketsTechnicien: number;
    pourcentageAssignation: number;
    tauxResolution: number;
  }>;
  
  assignationGlobale?: {
    totalTicketsAvecAssignation: number;
    totalTicketsSansAssignation: number;
    tauxAssignation: number;
  };
}

@Injectable({ providedIn: 'root' })
export class DashboardAdminService {
  constructor(private http: HttpClient,private authService:AuthService) {}
   private getAuthHeaders(): { headers: HttpHeaders, } {
    const token = this.authService.getAccessToken();
    return {
      headers: new HttpHeaders({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      })
    };
  }
  getTicketDashboard(): Observable<ApiResponse<TicketDashboardDTO>> {
    return this.http.get<ApiResponse<TicketDashboardDTO>>(
      'https://localhost:7063/api/ticket/dashboard'   ,   this.getAuthHeaders()

    );
  }
}