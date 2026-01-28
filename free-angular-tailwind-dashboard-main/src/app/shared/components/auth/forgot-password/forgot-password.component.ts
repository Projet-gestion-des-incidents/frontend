import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../../services/auth.service';
import { CommonModule } from '@angular/common';
import { AlertComponent } from '../../ui/alert/alert.component';
import { AuthPageLayoutComponent } from '../../../layout/auth-page-layout/auth-page-layout.component';
import { LabelComponent } from '../../form/label/label.component';
import { InputFieldComponent } from '../../form/input/input-field.component';
import { ButtonComponent } from '../../ui/button/button.component';

@Component({
  selector: 'app-forgot-password',
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
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css']
})
export class ForgotPasswordComponent {
  forgotForm: FormGroup;
  isLoading = false;
  alert = {
  show: false,
  variant: 'error' as 'error' | 'warning' | 'success' | 'info',
  title: '',
  message: ''
};
  emailSent = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.forgotForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  onSubmit(): void {
    if (this.forgotForm.invalid) {
      this.markFormGroupTouched(this.forgotForm);
      return;
    }

    this.isLoading = true;
    this.clearAlert();

    const email = this.forgotForm.get('email')?.value;
    console.log('Submitting forgot password for email:', email);

    this.authService.forgotPassword(email)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          console.log('Request completed');
        })
      )
      .subscribe({
        next: (response) => {
          console.log('Response received:', response);
          
          // Accepte resultCode 0 ou 1 comme succès (1 = OTP généré mais email non envoyé)
          if (response && (response.resultCode === 0 || response.resultCode === 1)) {
            this.emailSent = true;
           
            
          // Rediriger immédiatement sans délai
          console.log('Redirecting to reset-password with email:', email);
          this.router.navigate(['/reset-password'], { 
            queryParams: { email } 
          });
          } else {
            this.showAlert('error', 'Error', response?.message || 'Unknown error occurred');

          }
        },
        error: (error) => {
          console.error('Error occurred:', error);
                this.showAlert(
  'error',
  'Error',
  error?.error?.message || error?.message || 'An error occurred while sending OTP.');
}
});
}

  private getErrorMessage(resultCode: number | undefined, defaultMessage: string): string {
    switch (resultCode) {
      case 40:
        return 'User not found with this email address.';
      case 1:
        return 'OTP generated but email could not be sent.';
      case 99:
        return 'An error occurred while generating OTP.';
      default:
        return defaultMessage || 'An unexpected error occurred.';
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

showAlert(variant: any, title: string, message: string) {
  this.alert = { show: true, variant, title, message };
}

clearAlert() {
  this.alert.show = false;
}

clearError(): void {
  this.clearAlert();
}

goToLogin(): void {
  this.router.navigate(['/signin']);
}
}