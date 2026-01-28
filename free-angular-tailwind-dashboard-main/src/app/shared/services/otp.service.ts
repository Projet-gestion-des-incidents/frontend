import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiResponse } from '../models/Auth.models';

export interface OtpResponse {
  success: boolean;
  message: string;
}

@Injectable({
  providedIn: 'root'
})

export class OtpService {
  private apiUrl = 'https://localhost:7063/api/auth';

  constructor(private http: HttpClient) {}

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Une erreur est survenue';
    
    if (error.error instanceof ErrorEvent) {
      errorMessage = error.error.message;
    } else {
      if (error.error?.message) {
        errorMessage = error.error.message;
      } else if (error.status === 0) {
        errorMessage = 'Impossible de se connecter au serveur';
      } else {
        errorMessage = `Erreur ${error.status}: ${error.message}`;
      }
    }
    
    return throwError(() => new Error(errorMessage));
  }

 // Met à jour le type de retour pour sendOtp
  sendOtp(email: string): Observable<ApiResponse<string>> {
    return this.http.post<ApiResponse<string>>(`${this.apiUrl}/send-otp`, { email })
      .pipe(catchError(this.handleError));
  }

  // Met à jour le type de retour pour validateOtp
  validateOtp(email: string, code: string): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(`${this.apiUrl}/validate-otp`, { 
      email, 
      code 
    }).pipe(catchError(this.handleError));
  }
}