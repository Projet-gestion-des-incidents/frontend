import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../../services/auth.service';
import { CommonModule } from '@angular/common';
import { AlertComponent } from '../../ui/alert/alert.component';
import { AuthPageLayoutComponent } from '../../../layout/auth-page-layout/auth-page-layout.component';
import { LabelComponent } from '../../form/label/label.component';
import { InputFieldComponent } from '../../form/input/input-field.component';
import { ButtonComponent } from '../../ui/button/button.component';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    AlertComponent,
    AuthPageLayoutComponent,
    LabelComponent,
    InputFieldComponent,
    ButtonComponent
  ],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css']
})

export class ResetPasswordComponent implements OnInit {
  resetForm: FormGroup;
  isLoading = false;
  successMessage = '';
  errorMessage = '';
  email: string = '';
  showPassword = false;
  showConfirmPassword = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.resetForm = this.fb.group({
      otpCode: ['', [Validators.required, Validators.pattern('^[0-9]{6}$')]],
      newPassword: ['', [
        Validators.required,
        Validators.minLength(6),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)
      ]],
      confirmPassword: ['', [Validators.required]]
    }, { 
      validators: [
        this.passwordMatchValidator,
        this.passwordNotSameAsOldValidator.bind(this)
      ] 
    });
  }

ngOnInit(): void {
  this.route.queryParams.subscribe(params => {
    if (params['email']) {
      this.email = params['email'];
      console.log('Email from query params:', this.email);
    } else {
      this.email = this.authService.getResetEmail() || '';
      console.log('Email from service:', this.email);
    }
    
    // ✅ Pour le développement : pré-remplir le code OTP
    if (params['otp']) {
      this.resetForm.patchValue({ otpCode: params['otp'] });
      console.log('OTP pré-rempli depuis l\'URL:', params['otp']);
      
      // Optionnel : afficher une notification
      this.successMessage = `Code OTP pré-rempli : ${params['otp']}`;
      setTimeout(() => {
        this.successMessage = '';
      }, 5000);
    }
  });
}

  passwordMatchValidator(form: FormGroup): { [key: string]: boolean } | null {
    const password = form.get('newPassword');
    const confirmPassword = form.get('confirmPassword');
    
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    return null;
  }

  // ✅ Validateur pour vérifier que le nouveau mot de passe est différent de l'ancien
  passwordNotSameAsOldValidator(form: FormGroup): ValidationErrors | null {
    const newPassword = form.get('newPassword')?.value;
    
    // Récupérer l'ancien mot de passe depuis le localStorage ou le service
    // Note: Vous devez stocker l'ancien hash ou avoir un moyen de vérifier
    // Cette validation est optionnelle car le backend vérifiera aussi
    
    // Si vous avez l'ancien mot de passe en mémoire, vous pouvez faire :
    // const oldPassword = this.oldPassword;
    // if (newPassword && oldPassword && newPassword === oldPassword) {
    //   form.get('newPassword')?.setErrors({ sameAsOld: true });
    //   return { sameAsOld: true };
    // }
    
    return null;
  }

// Ajoutez cette méthode pour mieux gérer les erreurs
private handleErrorMessage(message: string): string {
  if (message.includes('OTP') || message.includes('code')) {
    if (message.includes('invalide')) {
      return 'Le code OTP saisi est incorrect. Veuillez vérifier et réessayer.';
    }
    if (message.includes('expiré')) {
      return 'Le code OTP a expiré. Veuillez en demander un nouveau.';
    }
    if (message.includes('déjà utilisé')) {
      return 'Ce code OTP a déjà été utilisé. Veuillez en demander un nouveau.';
    }
    return message;
  }
  return message;
}
// Modifiez la méthode onSubmit pour extraire correctement l'erreur
onSubmit(): void {
  if (this.resetForm.invalid || !this.email) {
    this.markFormGroupTouched(this.resetForm);
    return;
  }

  this.isLoading = true;
  this.successMessage = '';
  this.errorMessage = '';

  const dto = {
    email: this.email,
    otpCode: this.resetForm.get('otpCode')?.value,
    newPassword: this.resetForm.get('newPassword')?.value,
    confirmPassword: this.resetForm.get('confirmPassword')?.value
  };

  this.authService.resetPassword(dto)
    .pipe(finalize(() => this.isLoading = false))
    .subscribe({
      next: (response) => {
        console.log('Reset password response:', response);
        
        if (response && response.resultCode === 0) {
          this.successMessage = response.message || 'Mot de passe réinitialisé avec succès ! Redirection vers la connexion...';
          
          setTimeout(() => {
            this.router.navigate(['/signin']);
          }, 2000);
        } else {
          // ✅ Utiliser le handler pour un message plus clair
          this.errorMessage = this.handleErrorMessage(response?.message || 'Une erreur est survenue lors de la réinitialisation.');
          
          // ✅ Si l'OTP est invalide, focus sur le champ OTP
          if (response?.message?.includes('OTP')) {
            this.resetForm.get('otpCode')?.setErrors({ invalid: true });
            document.getElementById('otpCode')?.focus();
          }
        }
      },
      error: (error) => {
        console.error('Reset password error:', error);
        
        // ✅ Extraire le message d'erreur correctement
        let errorMessage = '';
        
        // Cas 1: error.error contient la réponse complète
        if (error.error && typeof error.error === 'object') {
          errorMessage = error.error.message || error.error.Message || '';
        }
        // Cas 2: error.error est une chaîne JSON
        else if (error.error && typeof error.error === 'string') {
          try {
            const parsed = JSON.parse(error.error);
            errorMessage = parsed.message || parsed.Message || '';
          } catch (e) {
            errorMessage = error.error;
          }
        }
        // Cas 3: error.message direct
        else if (error.message) {
          errorMessage = error.message;
        }
        
        // Si pas de message trouvé, message par défaut
        if (!errorMessage) {
          errorMessage = 'Une erreur est survenue lors de la réinitialisation.';
        }
        
        this.errorMessage = this.handleErrorMessage(errorMessage);
        
        // ✅ Si l'OTP est invalide, focus sur le champ OTP
        if (errorMessage.includes('OTP') || errorMessage.includes('code') || errorMessage.includes('invalide')) {
          this.resetForm.get('otpCode')?.setErrors({ invalid: true });
          document.getElementById('otpCode')?.focus();
        }
      }
    });
}

  resendOtp(): void {
    if (!this.email) {
      this.errorMessage = 'Email non disponible pour renvoyer le code';
      return;
    }

    this.isLoading = true;
    this.authService.forgotPassword(this.email)
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (response) => {
          if (response && (response.resultCode === 0 || response.resultCode === 1)) {
            this.successMessage = 'Un nouveau code OTP a été envoyé à votre email.';
          } else {
            this.errorMessage = response?.message || 'Échec de l\'envoi du code OTP.';
          }
        },
        error: (error) => {
          this.errorMessage = error.message || 'Erreur lors de l\'envoi du nouveau code.';
        }
      });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  goToLogin(): void {
    this.router.navigate(['/signin']);
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  // ✅ Getters pour l'indicateur de force du mot de passe
  get passwordStrength(): 'weak' | 'medium' | 'strong' {
    const password = this.resetForm.get('newPassword')?.value;
    if (!password) return 'weak';
    
    let strength = 0;
    if (password.length >= 6) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    
    if (strength <= 2) return 'weak';
    if (strength === 3) return 'medium';
    return 'strong';
  }

  get hasMinLength(): boolean {
    return this.resetForm.get('newPassword')?.value?.length >= 6;
  }

  get hasUpperCase(): boolean {
    return /[A-Z]/.test(this.resetForm.get('newPassword')?.value);
  }

  get hasLowerCase(): boolean {
    return /[a-z]/.test(this.resetForm.get('newPassword')?.value);
  }

  get hasNumber(): boolean {
    return /[0-9]/.test(this.resetForm.get('newPassword')?.value);
  }
}