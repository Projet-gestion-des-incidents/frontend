import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
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
        Validators.minLength(6), // Réduire à 6 caractères pour les tests
        // Validators.pattern('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$')
      ]],
      confirmPassword: ['', [Validators.required]]
    }, { validator: this.passwordMatchValidator });
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
      .pipe(
        finalize(() => this.isLoading = false)
      )
      .subscribe({
        next: (response) => {
          console.log('Reset password response:', response);
          
          if (response && response.resultCode === 0) {
            this.successMessage = response.message || 
              'Password reset successfully! Redirecting to login...';
            
            // Rediriger vers la page de connexion après 2 secondes
            setTimeout(() => {
              this.router.navigate(['/signin']);
            }, 2000);
          } else {
            this.errorMessage = response?.message || 
              'An error occurred during password reset.';
          }
        },
        error: (error) => {
          console.error('Reset password error:', error);
          this.errorMessage = error.message || 
            'An error occurred while resetting the password.';
        }
      });
  }

  resendOtp(): void {
    if (!this.email) {
      this.errorMessage = 'Email not available to resend code';
      return;
    }

    this.isLoading = true;
    this.authService.forgotPassword(this.email)
      .pipe(
        finalize(() => this.isLoading = false)
      )
      .subscribe({
        next: (response) => {
          if (response && (response.resultCode === 0 || response.resultCode === 1)) {
            this.successMessage = 'A new OTP code has been sent to your email.';
          } else {
            this.errorMessage = response?.message || 'Failed to resend OTP.';
          }
        },
        error: (error) => {
          this.errorMessage = error.message || 
            'Error while sending new code.';
        }
      });
  }

  togglePasswordVisibility(field: string): void {
    if (field === 'password') {
      this.showPassword = !this.showPassword;
    } else {
      this.showConfirmPassword = !this.showConfirmPassword;
    }
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  goToLogin(): void {
    this.router.navigate(['/signin']);
  }
}