import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Alert {
  id?: string;
  show: boolean;
  variant: 'error' | 'warning' | 'success' | 'info';
  title: string;
  message: string;
  duration?: number; // Durée d'affichage en ms (null = pas de disparition automatique)
  closable?: boolean;
  context?: string; // Contexte pour personnaliser les messages
}

export interface ErrorContext {
  operation?: 'login' | 'register' | 'forgot' | 'reset' | 'otp' | 'logout';
  endpoint?: string;
  statusCode?: number;
  resultCode?: number;
  originalError?: any;
}

@Injectable({
  providedIn: 'root'
})
export class AlertService {
  private alertsSubject = new BehaviorSubject<Alert[]>([]);
  public alerts$ = this.alertsSubject.asObservable();
  
  // Messages d'erreur par contexte
  private errorMessages: { [key: string]: { [key: number]: string } } = {
    login: {
      0: 'Utilisateur non trouvé avec cette adresse email.',
      1: 'Mot de passe incorrect.',
      2: 'Compte non vérifié. Veuillez vérifier votre email.',
      3: 'Compte désactivé. Contactez l\'administrateur.',
      401: 'Email ou mot de passe incorrect.',
      403: 'Accès non autorisé.',
      404: 'Utilisateur non trouvé.',
      500: 'Erreur serveur lors de la connexion.'
    },
    register: {
      0: 'Inscription réussie! Veuillez vérifier votre email.',
      1: 'Email déjà utilisé.',
      2: 'Nom d\'utilisateur déjà pris.',
      3: 'Données invalides.',
      400: 'Veuillez vérifier les informations saisies.',
      409: 'Un compte existe déjà avec cet email.',
      500: 'Erreur serveur lors de l\'inscription.'
    },
    forgot: {
      0: 'Email de réinitialisation envoyé avec succès.',
      1: 'OTP généré mais email non envoyé.',
      40: 'Utilisateur non trouvé avec cette adresse email.',
      404: 'Adresse email non trouvée.',
      500: 'Erreur lors de l\'envoi de l\'email.'
    },
    reset: {
      0: 'Mot de passe réinitialisé avec succès.',
      1: 'Code OTP invalide.',
      2: 'Code OTP expiré.',
      400: 'Données invalides.',
      401: 'Code OTP incorrect.',
      500: 'Erreur lors de la réinitialisation.'
    },
    otp: {
      0: 'OTP vérifié avec succès.',
      1: 'Code OTP invalide.',
      2: 'Code OTP expiré.',
      401: 'Code incorrect.',
      404: 'Aucun OTP trouvé pour cet email.',
      500: 'Erreur lors de la vérification.'
    },
    generic: {
      0: 'Opération réussie.',
      1: 'Opération échouée.',
      400: 'Requête invalide.',
      401: 'Non authentifié.',
      403: 'Accès refusé.',
      404: 'Ressource non trouvée.',
      408: 'Délai d\'attente dépassé.',
      429: 'Trop de requêtes.',
      500: 'Erreur interne du serveur.',
      502: 'Mauvaise passerelle.',
      503: 'Service indisponible.',
      504: 'Délai de passerelle dépassé.'
    }
  };

  constructor() {}

  // Créer une alerte
  showAlert(alert: Alert): string {
    const id = this.generateId();
    const newAlert: Alert = {
      ...alert,
      id,
      closable: alert.closable ?? true,
      duration: alert.duration ?? (alert.variant === 'error' ? 10000 : 5000)
    };
    
    const currentAlerts = this.alertsSubject.value;
    this.alertsSubject.next([...currentAlerts, newAlert]);
    
    // Auto-dismiss si durée définie
    if (newAlert.duration) {
      setTimeout(() => {
        this.dismissAlert(id);
      }, newAlert.duration);
    }
    
    return id;
  }

  // Afficher une alerte d'erreur contextualisée
  showError(errorContext: ErrorContext, defaultMessage?: string): string {
    const context = errorContext.operation || 'generic';
    const statusCode = errorContext.statusCode || errorContext.resultCode || 1;
    
    let message = this.errorMessages[context]?.[statusCode] 
                || this.errorMessages['generic'][statusCode] 
                || defaultMessage 
                || 'Une erreur est survenue';
    
    const title = this.getErrorTitle(context, statusCode);
    const variant = statusCode >= 400 && statusCode < 500 ? 'warning' : 'error';
    
    return this.showAlert({
      show: true,
      variant,
      title,
      message,
      context
    });
  }

  // Afficher une alerte de succès
  showSuccess(message: string, title: string = 'Succès'): string {
    return this.showAlert({
      show: true,
      variant: 'success',
      title,
      message,
      duration: 3000
    });
  }

  // Afficher une alerte d'information
  showInfo(message: string, title: string = 'Information'): string {
    return this.showAlert({
      show: true,
      variant: 'info',
      title,
      message,
      duration: 4000
    });
  }

  // Afficher une alerte d'avertissement
  showWarning(message: string, title: string = 'Attention'): string {
    return this.showAlert({
      show: true,
      variant: 'warning',
      title,
      message,
      duration: 5000
    });
  }

  // Fermer une alerte spécifique
  dismissAlert(id: string): void {
    const currentAlerts = this.alertsSubject.value;
    this.alertsSubject.next(currentAlerts.filter(alert => alert.id !== id));
  }

  // Fermer toutes les alertes
  dismissAll(): void {
    this.alertsSubject.next([]);
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  private getErrorTitle(context: string, statusCode: number): string {
    const titles: { [key: string]: string } = {
      login: 'Erreur de connexion',
      register: 'Erreur d\'inscription',
      forgot: 'Erreur de réinitialisation',
      reset: 'Erreur de réinitialisation',
      otp: 'Erreur de vérification',
      generic: 'Erreur'
    };
    
    return titles[context] || 'Erreur';
  }

  // Traduire une erreur HTTP en message utilisateur
  translateHttpError(error: any, context?: string): { title: string; message: string } {
    const status = error.status || 500;
    const contextKey = context || 'generic';
    
    const message = this.errorMessages[contextKey]?.[status] 
                  || this.errorMessages['generic'][status] 
                  || error.message 
                  || 'Une erreur est survenue';
    
    const title = this.getErrorTitle(contextKey, status);
    
    return { title, message };
  }
}