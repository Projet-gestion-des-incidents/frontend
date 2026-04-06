import { Injectable } from '@angular/core';
import { ApiResponse, CommentaireDTO } from '../models/Commentaire.models';
import { catchError, map, Observable, of, tap, throwError } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class CommentaireService {
   constructor(private http: HttpClient,    private authService: AuthService
  ) { }
   private getAuthHeaders(): { headers: HttpHeaders, } {
    const token = this.authService.getAccessToken();
    return {
      headers: new HttpHeaders({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      })
    };
  }
  /**
   * Récupère tous les commentaires d'un ticket
   */
  getAllCommentaires(ticketId: string): Observable<CommentaireDTO[]> {
    console.log('🔍 Récupération de tous les commentaires pour le ticket:', ticketId);
    
    return this.http.get<ApiResponse<CommentaireDTO[]>>(
      `https://localhost:7063/api/commentaires?ticketId=${ticketId}`,
      this.getAuthHeaders()
    ).pipe(
      map(response => response.data || []),
      catchError(error => {
        console.error('❌ Erreur récupération commentaires:', error);
        return of([]);
      })
    );
  }
  /**
   * Supprimer un commentaire
   */
  deleteCommentaire(commentaireId: string): Observable<ApiResponse<boolean>> {
    console.log('🗑️ Suppression du commentaire:', commentaireId);
    
    return this.http.delete<ApiResponse<boolean>>(
      `https://localhost:7063/api/commentaires/${commentaireId}`,
      this.getAuthHeaders()
    ).pipe(
      tap(response => {
        console.log('📥 Réponse suppression commentaire:', response);
      }),
      catchError(error => {
        console.error('❌ Erreur suppression commentaire:', error);
        return throwError(() => error);
      })
    );
  }
  addCommentaire(ticketId: string, formData: FormData) {
    console.log('📤 ENVOI COMMENTAIRE - Début');
    console.log('📤 Ticket ID:', ticketId);
    
    // Afficher TOUT le contenu du FormData
    console.log('📤 Contenu du FormData:');
    formData.forEach((value, key) => {
      if (value instanceof File) {
        console.log(`  - ${key}: ${value.name} (${value.size} bytes, type: ${value.type})`);
      } else {
        console.log(`  - ${key}: "${value}"`);
      }
    });
  
    const headers = this.getAuthHeaders1(true);
    console.log('📤 Headers:', headers);
  
    return this.http.post<ApiResponse<CommentaireDTO>>(
      `https://localhost:7063/api/commentaires?ticketId=${ticketId}`,
      formData, 
      headers
    ).pipe(
      tap(response => {
        console.log('📥 Réponse commentaire SUCCÈS:', response);
      }),
      catchError(error => {
        console.error('📥 ERREUR commentaire DÉTAILLÉE:', {
          status: error.status,
          statusText: error.statusText,
          message: error.error?.message,
          error: error.error,
          headers: error.headers
        });
        return throwError(() => error);
      })
    );
  }
    private getAuthHeaders1(isFormData: boolean = false): { headers: HttpHeaders } {
  const token = this.authService.getAccessToken();

  let headers = new HttpHeaders({
    'Authorization': `Bearer ${token}`
  });

  // ❌ Ne pas mettre Content-Type pour FormData
  if (!isFormData) {
    headers = headers.set('Content-Type', 'application/json');
  }

  return { headers };
}
  /**
   * Mettre à jour un commentaire avec ses pièces jointes
   */
  updateCommentaire(commentaireId: string, formData: FormData): Observable<ApiResponse<CommentaireDTO>> {
    console.log('📤 updateCommentaire - ID:', commentaireId);
    console.log('📤 FormData entries:');
    formData.forEach((value, key) => {
      if (value instanceof File) {
        console.log(`  - ${key}: ${value.name} (${value.size} bytes)`);
      } else {
        console.log(`  - ${key}: ${value}`);
      }
    });
    
    return this.http.put<ApiResponse<CommentaireDTO>>(
      `https://localhost:7063/api/commentaires/${commentaireId}`,
      formData,
      this.getAuthHeaders1(true) // true = isFormData
    ).pipe(
      tap(response => {
        console.log('✅ Réponse updateCommentaire:', response);
      }),
      catchError(error => {
        console.error('❌ Erreur updateCommentaire:', error);
        console.error('❌ Détails:', error.error);
        return throwError(() => error);
      })
    );
  }
  /**
   * Récupère les commentaires du technicien connecté pour un ticket spécifique
   */
  getMesCommentaires(ticketId: string): Observable<CommentaireDTO[]> {
    console.log('🔍 Récupération de mes commentaires pour le ticket:', ticketId);
    
    return this.http.get<ApiResponse<CommentaireDTO[]>>(
      `https://localhost:7063/api/commentaires/mes-commentaires?ticketId=${ticketId}`,
      this.getAuthHeaders()
    ).pipe(
      map(response => response.data || []),
      catchError(error => {
        console.error('❌ Erreur récupération mes commentaires:', error);
        return of([]);
      })
    );
  }
}
