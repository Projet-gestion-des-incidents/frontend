import { Component, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { Subject, takeUntil } from 'rxjs';
import { CommonModule } from '@angular/common';
import { LabelComponent } from '../../form/label/label.component';
import { CheckboxComponent } from '../../form/input/checkbox.component';
import { ButtonComponent } from '../../ui/button/button.component';
import { InputFieldComponent } from '../../form/input/input-field.component';
import { AlertComponent } from '../../ui/alert/alert.component';

@Component({
  selector: 'app-signin-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    LabelComponent,
    CheckboxComponent,
    ButtonComponent,
    InputFieldComponent,AlertComponent
  ],
  templateUrl: './signin-form.component.html',
  styleUrls: [] 
})

export class SigninFormComponent implements OnDestroy {
  loginForm: FormGroup;
  loading = false;
  returnUrl: string;
  alert: {
  show: boolean;
  variant: 'error' | 'warning' | 'success' | 'info';
  title: string;
  message: string;
} = {
  show: false,
  variant: 'error',
  title: '',
  message: ''
};
  private destroy$ = new Subject<void>();
  showPassword = false;
  isChecked = false; // Pour la checkbox "Keep me logged in"

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });

    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
    
    if (this.authService.isAuthenticated()) {
      this.router.navigate([this.returnUrl]);
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onSignIn(event?: Event): void {
    if (event) {
    event.preventDefault();
  }
    if (this.loginForm.invalid) {
      this.markFormGroupTouched(this.loginForm);
      return;
    }

    this.loading = true;
    this.clearAlert();

    const loginData = this.loginForm.value;

    this.authService.login(loginData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
      next: (response) => {
          console.log('Réponse login brute :', response);
        this.loading = false;

          if (response.data) {
          const role = response.data.role; // récupère le rôle de l'utilisateur
          console.log('Données login :', response.data);

 console.log('Rôle détecté :', role);
  switch(role) {
    case 'Admin':
      this.router.navigate(['/admin-dashboard']);
      break;
    case 'Technicien':
      this.router.navigate(['/technicien-dashboard']);
      break;
    case 'Commercant':
      this.router.navigate(['/commercant-dashboard']);
      break;
    
  }
}
 else {
          this.showError(
            response.message || 'Email ou mot de passe incorrect'
          );
        }
      },
      error: (err) => {
        this.loading = false;

        this.showError(
          err?.error?.message ||
          err.message ||
          'Erreur serveur, veuillez réessayer.'
        );
      }
    });
}
  private markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

showError(message: string, title = 'Erreur de connexion') {
  this.alert = {
    show: true,
    variant: 'error',
    title,
    message
  };
}

clearError(): void {
  this.clearAlert();
}

clearAlert() {
  this.alert.show = false;
}

ngOnDestroy(): void {
  this.destroy$.next();
  this.destroy$.complete();
}
}