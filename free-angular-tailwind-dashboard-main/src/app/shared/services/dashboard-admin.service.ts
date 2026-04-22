// dashboard-admin.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models/Ticket.models';
import { AuthService } from './auth.service';
// ==================== TPE DASHBOARD DTOs ====================
export interface TPEDashboardOverviewDTO {
  totalTPEs: number;
  totalIncidentsLiees: number;
  tauxGlobalPanne: number;
}

export interface TPEPanneParModeleDTO {
  modele: string;
  nombreTPEs: number;
  nombreIncidents: number;
  tauxPanne: number;
  color: string;
}

export interface TPEPanneParAdresseDTO {
  commercantId: string;
  commercantNom: string;
  adresse: string;
  nombreTPEs: number;
  nombreIncidents: number;
  tauxPanne: number;
  pourcentageTPEsTotal: number;
}

export interface TPEDashboardDTO {
  overview: TPEDashboardOverviewDTO;
  pannesParModele: TPEPanneParModeleDTO[];
  pannesParAdresse: TPEPanneParAdresseDTO[];
}

// ==================== TICKET DTOs ====================
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
    ticketsAssignes: number;
    ticketsTotal: number;
    tauxResolution: number;
  }>;
  resolutionParJour: Array<any>;
  resolutionParSemaine: Array<any>;
  resolutionParMois: Array<any>;
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

// ==================== INCIDENT DTOs ====================
export interface IncidentDashboardOverviewDTO {
  totalIncidents: number;
  incidentsNonTraite: number;
  incidentsEnCours: number;
  incidentsFerme: number;
  tauxNonTraite: number;
  tauxEnCours: number;
  tauxFerme: number;
}

export interface IncidentStatutStatDTO {
  statut: string;
  count: number;
  color: string;
  pourcentage: number;
}

export interface IncidentJournalierDTO {
  date: string;
  dateFormatee: string;
  jour: string;
  crees: number;
  nonTraite: number;
  enCours: number;
  ferme: number;
}

export interface ResolutionIncidentStatsDTO {
  tempsMoyenResolutionHeures: number;
  tempsMoyenResolutionJours: number;
  incidentsResolus: number;
  incidentsNonResolus: number;
  tauxResolution: number;
}

export interface ResolutionParSeveriteDTO {
  severite: string;
  nombreIncidents: number;
  nombreResolus: number;
  tempsMoyenResolutionHeures: number;
  tempsMoyenResolutionJours: number;
  tauxResolution: number;
  color: string;
}

export interface ResolutionParTypeProblemeDTO {
  typeProbleme: string;
  typeProblemeEnum: number;
  nombreIncidents: number;
  nombreResolus: number;
  tempsMoyenResolutionHeures: number;
  tempsMoyenResolutionJours: number;
  tauxResolution: number;
  pourcentageTotal: number;
  color: string;
}

export interface IncidentDashboardDTO {
  overview: IncidentDashboardOverviewDTO;
  statsParStatut: IncidentStatutStatDTO[];
  statsParJour: IncidentJournalierDTO[];
  statsParSemaine: IncidentJournalierDTO[];
  statsParMois: IncidentJournalierDTO[];
  statsResolution: ResolutionIncidentStatsDTO;
  resolutionParSeverite: ResolutionParSeveriteDTO[];
  resolutionParTypeProbleme: ResolutionParTypeProblemeDTO[];
}

// ==================== SERVICE ====================
@Injectable({ providedIn: 'root' })
export class DashboardAdminService {
  private baseUrl = 'https://localhost:7063/api';

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getAuthHeaders(): { headers: HttpHeaders } {
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
      `${this.baseUrl}/ticket/dashboard`, this.getAuthHeaders()
    );
  }

  getIncidentDashboard(): Observable<ApiResponse<IncidentDashboardDTO>> {
    return this.http.get<ApiResponse<IncidentDashboardDTO>>(
      `${this.baseUrl}/incident/dashboard`, this.getAuthHeaders()
    );
  }
  // dashboard-admin.service.ts - AJOUTER CES DTOs


// Dans la classe DashboardAdminService, AJOUTER CETTE MÉTHODE :

getTPEDashboard(): Observable<ApiResponse<TPEDashboardDTO>> {
  return this.http.get<ApiResponse<TPEDashboardDTO>>(
    `${this.baseUrl}/tpe/dashboard`, this.getAuthHeaders()
  );
}
}