import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { OtpService } from '../../../services/otp.service';
import { AuthService } from '../../../services/auth.service';
import { AuthPageLayoutComponent } from '../../../layout/auth-page-layout/auth-page-layout.component';
import { ApiResponse } from '../../../models/Auth.models';
import { AlertComponent } from '../../ui/alert/alert.component';
import { LabelComponent } from '../../form/label/label.component';
import { InputFieldComponent } from '../../form/input/input-field.component';
import { ButtonComponent } from '../../ui/button/button.component';

@Component({
  selector: 'app-otp',
  templateUrl: './otp.component.html',
  styleUrls: ['./otp.component.css'],
  standalone: true,
  imports: [CommonModule,
     ReactiveFormsModule,
     RouterModule,
     FormsModule,
     AlertComponent,
     AuthPageLayoutComponent,
     LabelComponent,
     InputFieldComponent,
     ButtonComponent]
})

export class OtpComponent implements OnInit {
  email: string = '';
  code: string = '';
  errorMessage: string = '';
  successMessage: string = '';
  isLoading: boolean = false;
  otpSent: boolean = false;
  isEmailScreen: boolean = true; // Contrôle l'affichage des écrans

  constructor(
    private otpService: OtpService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Vérifier si on vient de la page d'inscription avec un email
    this.route.queryParams.subscribe(params => {
      if (params['email']) {
        this.email = params['email'];
        // Si email fourni, passer directement à l'écran OTP
        this.isEmailScreen = false;
        this.sendOtp(); // Envoyer automatiquement l'OTP
      }
    });

    // Vérifier dans localStorage
    const pendingEmail = localStorage.getItem('pending_email');
    if (pendingEmail) {
      this.email = pendingEmail;
      this.isEmailScreen = false;
      // this.sendOtp(); 
      // Envoyer automatiquement l'OTP
    }

    // Récupérer le message d'état
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras?.state?.['message']) {
      this.successMessage = navigation.extras.state['message'];
    }
  }

 sendOtp(): void {
  if (!this.email) {
    this.errorMessage = 'Veuillez entrer votre email';
    return;
  }

  // Validation basique de l'email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(this.email)) {
    this.errorMessage = 'Veuillez entrer une adresse email valide';
    return;
  }

  this.isLoading = true;
  this.errorMessage = '';
  this.successMessage = '';

  console.log('Début envoi OTP à:', this.email);

  this.otpService.sendOtp(this.email).subscribe({
    next: (response: ApiResponse<string>) => {
      this.isLoading = false;
      this.otpSent = true;
      
      console.log('Réponse API send-otp:', {
        resultCode: response.resultCode,
        message: response.message,
        hasData: !!response.data,
        dataLength: response.data?.length
      });
      
      // Gestion basée sur resultCode
      switch (response.resultCode) {
        case 0: // Succès complet
          this.successMessage = response.message || 'Code OTP envoyé avec succès !';
          this.isEmailScreen = false;
          console.log('OTP envoyé avec succès');
          break;
          
        case 1: // Avertissement (code généré mais email non envoyé)
          this.successMessage = response.message || 'Code OTP généré (email en mode test)';
          this.isEmailScreen = false;
          console.warn('OTP généré mais email non envoyé (mode test)');
          
          break;
          
        case 20: // Utilisateur introuvable
          this.errorMessage = response.message || 'Aucun compte trouvé avec cet email';
          break;
          
        case 99: // Erreur interne
          this.errorMessage = response.message || 'Erreur interne du serveur';
          if (response.errors && response.errors.length > 0) {
            console.error('Erreurs serveur:', response.errors);
          }
          break;
          
        default: // Autres codes d'erreur
          this.errorMessage = response.message || 'Erreur inconnue lors de l\'envoi';
          break;
      }
    },
    error: (err: any) => {
      this.isLoading = false;
      console.error('Erreur HTTP send-otp:', {
        status: err.status,
        statusText: err.statusText,
        error: err.error,
        message: err.message,
        url: err.url
      });
      
      // Messages d'erreur utilisateur-friendly
      if (err.status === 0) {
        this.errorMessage = 'Impossible de se connecter au serveur. Vérifiez votre connexion internet.';
      } else if (err.status === 400) {
        this.errorMessage = 'Email invalide. Veuillez vérifier votre saisie.';
      } else if (err.status === 404) {
        this.errorMessage = 'Service non disponible. Veuillez réessayer plus tard.';
      } else if (err.status === 429) {
        this.errorMessage = 'Trop de tentatives. Veuillez patienter avant de réessayer.';
      } else if (err.status >= 500) {
        this.errorMessage = 'Erreur serveur. Notre équipe technique a été notifiée.';
      } else if (err.error?.message) {
        this.errorMessage = err.error.message;
      } else if (err.message) {
        this.errorMessage = err.message;
      } else {
        this.errorMessage = 'Une erreur inattendue est survenue. Veuillez réessayer.';
      }
    }
  });
}

  validateOtp(): void {
  if (!this.code || this.code.length !== 6) {
    this.errorMessage = 'Veuillez entrer un code OTP valide (6 chiffres)';
    return;
  }

  this.isLoading = true;
  this.errorMessage = '';
  this.successMessage = '';

  this.authService.validateOtpAndLogin(this.email, this.code).subscribe({
    next: (response: ApiResponse<any>) => {
      this.isLoading = false;
      console.log('Réponse validation OTP:', response);
      
      if (response.resultCode === 0) {
        this.successMessage = response.message || 'Email vérifié avec succès !';
        
        // Nettoyer le localStorage
        localStorage.removeItem('pending_email');
        
        // Afficher un message de redirection
        this.successMessage += ' Redirection en cours...';
        
        // Redirection après 2 secondes (fallback si AuthService ne redirige pas)
        setTimeout(() => {
          if (this.router.url.includes('/otp')) {
            this.router.navigate(['/signin']);
          }
        }, 2000);
      } else {
        // Gestion des codes d'erreur spécifiques
        switch (response.resultCode) {
          case 30:
            this.errorMessage = response.message || 'Code OTP incorrect';
            break;
          case 31:
            this.errorMessage = response.message || 'Le code OTP a expiré';
            break;
          case 32:
            this.errorMessage = response.message || 'Ce code a déjà été utilisé';
            break;
          default:
            this.errorMessage = response.message || 'Erreur lors de la validation';
        }
      }
    },
    error: (err: any) => {
      this.isLoading = false;
      console.error('Erreur validation OTP:', err);
      
      if (err.status === 400) {
        this.errorMessage = 'Code OTP invalide';
      } else if (err.status === 401) {
        this.errorMessage = 'Code OTP expiré';
      } else if (err.status === 404) {
        this.errorMessage = 'Utilisateur non trouvé';
      } else if (err.error?.message) {
        this.errorMessage = err.error.message;
      } else {
        this.errorMessage = 'Erreur de validation';
      }
    }
  });
}

  resendOtp(): void {
    this.sendOtp();
  }

  changeEmail(): void {
    // Retour à l'écran email
    this.isEmailScreen = true;
    this.code = '';
    this.errorMessage = '';
    this.successMessage = '';
  }

  clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

 onCodeInput(value: any): void {
  if (typeof value !== 'string') {
    return;
  }
  this.code = value.replace(/\D/g, '').slice(0, 6);
  this.clearMessages();
}
}