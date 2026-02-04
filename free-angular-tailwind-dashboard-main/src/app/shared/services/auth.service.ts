import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { Router } from '@angular/router';
import {
  LoginDTO,
  RegisterDTO,
  AuthResponseDTO,
  ForgotPasswordDTO,
  ResetPasswordDTO,
  ApiResponse
} from '../models/Auth.models';
import { AlertService, ErrorContext } from './alert.service';

@Injectable({
  providedIn: 'root'
})

export class AuthService {
  private apiUrl = 'https://localhost:7063/api';
  private currentUserSubject = new BehaviorSubject<AuthResponseDTO | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private tokenExpirationTimer: any;
  private resetPasswordEmailSubject = new BehaviorSubject<string | null>(null);
  public resetPasswordEmail$ = this.resetPasswordEmailSubject.asObservable();
  constructor(
    private http: HttpClient,
    private router: Router,
    private alertService: AlertService
  ) {
this.loadUserFromStorage();
    this.loadResetEmailFromStorage();  }

  // ========== CHARGEMENT INITIAL ==========
  private loadUserFromStorage(): void {
    if (typeof window === 'undefined') return;
    
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      try {
        const user: AuthResponseDTO = JSON.parse(savedUser);
        const expirationDate = new Date(user.expiresAt);

        if (expirationDate > new Date()) {
          this.currentUserSubject.next(user);
          this.setAutoLogout(expirationDate);
        } else {
          this.logout();
        }
      } catch (error) {
        console.error('Error parsing user from storage:', error);
        localStorage.removeItem('currentUser');
      }
    }
  }

  // ========== REGISTER ==========
  register(dto: RegisterDTO): Observable<ApiResponse<any>> {
    
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/auth/register`, dto)
      .pipe(
      catchError(err => this.handleError(err, 'register'))
      );
  }
// auth.service.ts
getRolesForRegister(): Observable<{id: string, name: string}[]> {
  return this.http.get<{id: string, name: string}[]>(`${this.apiUrl}/roles/register`)
    .pipe(
      map((res: any) => res.data || [])
    );
}

  // ========== LOGIN ==========
  login(dto: LoginDTO): Observable<ApiResponse<AuthResponseDTO>> {
    return this.http.post<ApiResponse<AuthResponseDTO>>(`${this.apiUrl}/auth/login`, dto)
      .pipe(
        tap(res => {
          if (res.data) {
            this.handleAuthentication(res.data);
          }
        }),
      catchError(err => this.handleError(err, 'login'))
      );
  }
// Récupère le rôle actuel de l'utilisateur connecté
getRole(): string | null {
  return this.currentUserSubject.value?.role || null;
}

 // ========== GESTION EMAIL RÉINITIALISATION ==========
  private setResetEmail(email: string): void {
    localStorage.setItem('reset_password_email', email);
    this.resetPasswordEmailSubject.next(email);
  }

  private clearResetEmail(): void {
    localStorage.removeItem('reset_password_email');
    this.resetPasswordEmailSubject.next(null);
  }

  private loadResetEmailFromStorage(): void {
    const savedEmail = localStorage.getItem('reset_password_email');
    if (savedEmail) {
      this.resetPasswordEmailSubject.next(savedEmail);
    }
  }

  getResetEmail(): string | null {
    return this.resetPasswordEmailSubject.value;
  }

// ========== FORGOT PASSWORD - CORRIGÉ ==========
forgotPassword(email: string): Observable<ApiResponse<string>> {
  const dto: ForgotPasswordDTO = { email };
  
  return this.http.post(
    `${this.apiUrl}/auth/forgot-password`,
    dto,
    { 
      responseType: 'text' as 'json', // Corriger le type
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    }
  )
  .pipe(
    map((response: any) => {
      console.log('Raw response from server:', response);
      
      // Si la réponse est déjà un objet, le retourner tel quel
      if (typeof response === 'object' && response !== null) {
        return response as ApiResponse<string>;
      }
      
      // Si c'est une chaîne, essayer de parser comme JSON
      if (typeof response === 'string') {
        try {
          const jsonResponse = JSON.parse(response) as ApiResponse<string>;
          console.log('Parsed as JSON:', jsonResponse);
          return jsonResponse;
        } catch (e) {
          console.log('Response is plain text, converting to ApiResponse');
          // Si c'est une chaîne simple, la convertir en ApiResponse
          const isSuccess = response.includes("envoyé") || response.includes("succès");
          return {
            data: response, // Stocker la réponse comme data
            message: response,
            resultCode: isSuccess ? 0 : 99,
            errors: isSuccess ? null : [response]
          } as ApiResponse<string>;
        }
      }
      
      // Par défaut
      return {
        data: '',
        message: 'Unknown response format',
        resultCode: 99,
        errors: ['Invalid response format']
      } as ApiResponse<string>;
    }),
    tap((res: ApiResponse<string>) => {
      console.log('Processed response:', res);
      if (res.resultCode === 0) {
        this.setResetEmail(email);
      }
    }),
      catchError(err => this.handleError(err, 'forgot'))
  );
}

  // ========== RESET PASSWORD - CORRIGÉ ==========
  resetPassword(dto: ResetPasswordDTO): Observable<ApiResponse<string>> {
    return this.http.post(
      `${this.apiUrl}/auth/reset-password`,
      dto,
      { 
        responseType: 'text', // Accepter la réponse comme texte
        headers: new HttpHeaders({
          'Content-Type': 'application/json'
        })
      }
    )
    .pipe(
      map((response: string) => {
        console.log('Raw reset password response:', response);
        
        try {
          const jsonResponse = JSON.parse(response) as ApiResponse<string>;
          return jsonResponse;
        } catch (e) {
          const isSuccess = response.includes("réinitialisé") || response.includes("succès");
         return {
            data: response, // Stocker la réponse comme data
            message: response,
            resultCode: isSuccess ? 0 : 99,
            errors: isSuccess ? null : [response]
          } as ApiResponse<string>;
        }
      }),
      tap(res => {
        if (res.resultCode === 0) {
          this.clearResetEmail();
        }
      }),
      catchError(err => this.handleError(err, 'reset'))
    );
  }

  private handleError(error: HttpErrorResponse, context?: 'login' | 'register' | 'forgot' | 'reset' | 'otp') {
    console.error(`HTTP Error in ${context}:`, error);
    
    // Utiliser le service d'alertes pour traduire l'erreur
    const errorInfo = this.alertService.translateHttpError(error, context);
    
    // Extraire le resultCode de la réponse
    let resultCode = 99;
    if (error.error && typeof error.error === 'object') {
      resultCode = error.error.resultCode ?? resultCode;
    }
    
    // Créer le contexte d'erreur
    const errorContext: ErrorContext = {
      operation: context,
      statusCode: error.status,
      resultCode: resultCode,
      originalError: error.error
    };
    
    // Afficher l'alerte d'erreur
    this.alertService.showError(errorContext, errorInfo.message);
    
    // Retourner l'erreur pour le composant
    return throwError(() => ({
      message: errorInfo.message,
      resultCode: resultCode,
      status: error.status,
      error: error.error,
      context: context
    }));
  }

  // ========== OTP VALIDATION ==========
  validateOtpAndLogin(email: string, code: string): Observable<ApiResponse<AuthResponseDTO>> {
    return this.http.post<ApiResponse<AuthResponseDTO>>(`${this.apiUrl}/auth/validate-otp`, { 
      email, 
      code 
    })
    .pipe(
      tap(res => {
        if (res.data) {
          this.handleAuthentication(res.data);
        }
      }),
      
          catchError(err => this.handleError(err, 'reset'))

    );
  }

  // ========== LOGOUT ==========
  logout(redirectToLogin: boolean = true): void {
    // Appel serveur pour logout
    this.http.post(`${this.apiUrl}/auth/sign-out`, {}).subscribe();
    
    // Nettoyage local
    localStorage.removeItem('currentUser');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('pending_verification_email');
    
    this.currentUserSubject.next(null);
    
    if (this.tokenExpirationTimer) {
      clearTimeout(this.tokenExpirationTimer);
    }

    if (redirectToLogin) {
      this.router.navigate(['/signin']);
    }
  }

  // ========== GESTION AUTHENTIFICATION ==========
  private handleAuthentication(data: AuthResponseDTO): void {
    // Stocker les données d'authentification
    localStorage.setItem('currentUser', JSON.stringify(data));
    localStorage.setItem('access_token', data.accessToken);
    localStorage.setItem('refresh_token', data.refreshToken);
    
    // Nettoyer l'email en attente
    localStorage.removeItem('pending_verification_email');
    
    this.currentUserSubject.next(data);
    
    // Configurer auto-logout
    if (data.expiresAt) {
      const expiresAt = new Date(data.expiresAt);
      this.setAutoLogout(expiresAt);
    }
  }

  private setAutoLogout(expirationDate: Date): void {
    const expiresIn = expirationDate.getTime() - new Date().getTime();
    
    if (this.tokenExpirationTimer) {
      clearTimeout(this.tokenExpirationTimer);
    }
    
    this.tokenExpirationTimer = setTimeout(() => {
      this.logout();
    }, expiresIn);
  }


  // ========== VÉRIFICATIONS ==========
  isAuthenticated(): boolean {
    const user = this.currentUserSubject.value;
    if (!user) return false;
    return new Date(user.expiresAt) > new Date();
  }

  getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  getCurrentUser(): AuthResponseDTO | null {
    return this.currentUserSubject.value;
  }

  hasRole(role: string): boolean {
    const user = this.currentUserSubject.value;
    return user?.role === role;
  }

  // Vérifier si un email est en attente de vérification
  hasPendingVerification(): boolean {
    return !!localStorage.getItem('pending_verification_email');
  }

  getPendingEmail(): string | null {
    return localStorage.getItem('pending_verification_email');
  }
}