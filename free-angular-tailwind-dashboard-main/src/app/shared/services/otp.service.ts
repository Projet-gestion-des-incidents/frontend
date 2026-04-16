import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiResponse } from '../models/Auth.models';
import { AuthService } from './auth.service';

export interface OtpResponse {
  success: boolean;
  message: string;
}

@Injectable({
  providedIn: 'root'
})

export class OtpService {
  private apiUrl = 'https://localhost:7063/api/auth';

  constructor(private http: HttpClient,    private authService: AuthService  
  ) {}

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

 private getAuthHeaders(): { headers: HttpHeaders } {
    const token = this.authService.getAccessToken();
    return {
      headers: new HttpHeaders({
        'Authorization': `Bearer ${token}`
      })
    };
  }
// Confirmer le changement d'email avec OTP
confirmEmailChange(newEmail: string, otpCode: string): Observable<ApiResponse<string>> {
  return this.http.post<ApiResponse<string>>(
    `${this.apiUrl}/confirm-email-change`,
    { newEmail, otpCode },
    this.getAuthHeaders()
  );
}

// Confirmer le changement de mot de passe avec OTP
confirmPasswordChange(newPassword: string, otpCode: string): Observable<ApiResponse<string>> {
  return this.http.post<ApiResponse<string>>(
    `${this.apiUrl}/confirm-password-change`,
    { newPassword, otpCode },
    this.getAuthHeaders()
  );
}
}