import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { OtpService } from '../../../services/otp.service';

@Component({
  selector: 'app-email-sent',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50 dark:bg-gray-900">
      <div class="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
        <!-- Icône de succès -->
        <div class="w-20 h-20 mx-auto mb-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
          <svg class="w-10 h-10 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13l2 2 4-4"></path>
          </svg>
        </div>
        
        <h1 class="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          Vérifiez votre boîte email
        </h1>
        
        <p class="text-gray-600 dark:text-gray-300 mb-6">
          Un code de vérification a été envoyé à <br/>
          <strong class="text-brand-600">{{ email }}</strong>
        </p>
        
        <div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
          <p class="text-sm text-blue-800 dark:text-blue-200">
            📧 Le code est valable pendant 5 minutes.
          </p>
          <p class="text-sm text-blue-800 dark:text-blue-200 mt-1">
            🔒 Vérifiez vos spams si vous ne recevez pas l'email.
          </p>
        </div>
        
        <button 
          (click)="goToOtp()"
          class="w-full px-4 py-3 bg-gradient-to-r from-brand-500 to-brand-600 text-white rounded-lg font-medium hover:from-brand-600 hover:to-brand-700 transition-all mb-3">
          J'ai reçu le code
        </button>
        
        <button 
          (click)="resendEmail()"
          [disabled]="isResending"
          class="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all disabled:opacity-50">
          {{ isResending ? 'Envoi en cours...' : 'Renvoyer le code' }}
        </button>
        
        <p class="mt-6 text-sm text-gray-500 dark:text-gray-400">
          <a routerLink="/signin" class="text-brand-600 hover:underline">Retour à la connexion</a>
        </p>
      </div>
    </div>
  `
})
export class EmailSentComponent implements OnInit {
  email: string = '';
  isResending = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private otpService: OtpService
  ) {}

  ngOnInit(): void {
    this.email = this.route.snapshot.queryParams['email'] || 
                 localStorage.getItem('pending_verification_email') || 
                 '';
    
    if (!this.email) {
      this.router.navigate(['/signin']);
    }
  }

  goToOtp(): void {
    this.router.navigate(['/otp'], { queryParams: { email: this.email } });
  }

  resendEmail(): void {
    this.isResending = true;
    
    this.otpService.sendOtp(this.email).subscribe({
      next: (res) => {
        this.isResending = false;
        if (res.resultCode === 0) {
          alert('Un nouveau code a été envoyé à votre adresse email.');
        } else {
          alert(res.message || 'Erreur lors du renvoi du code.');
        }
      },
      error: (err) => {
        this.isResending = false;
        alert('Erreur lors du renvoi du code. Veuillez réessayer.');
      }
    });
  }
}