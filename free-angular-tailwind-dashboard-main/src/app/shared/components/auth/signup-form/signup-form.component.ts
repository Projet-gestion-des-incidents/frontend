import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { RegisterDTO } from '../../../models/Auth.models';
import { CommonModule } from '@angular/common';
import { LabelComponent } from '../../form/label/label.component';
import { CheckboxComponent } from '../../form/input/checkbox.component';
import { InputFieldComponent } from '../../form/input/input-field.component';
import { AlertComponent } from '../../ui/alert/alert.component';
import { SelectComponent } from '../../form/select/select.component';
import { DatePickerComponent } from '../../form/date-picker/date-picker.component';

@Component({
  selector: 'app-signup-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    LabelComponent,
    CheckboxComponent,
    SelectComponent,
    InputFieldComponent,
    AlertComponent,
    DatePickerComponent 
  ],
  styles: [`
    .relative {
      position: relative;
    }
    
    .relative input,
    .relative .form-input,
    .relative app-input-field input {
      padding-right: 2.5rem !important;
    }
    
    .relative button {
      position: absolute;
      right: 0.75rem;
      top: 50%;
      transform: translateY(-50%);
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 0;
      margin: 0;
      z-index: 10;
    }
    
    .relative button svg {
      width: 1.25rem;
      height: 1.25rem;
    }
  `],
  templateUrl: './signup-form.component.html'
})
export class SignupFormComponent {
  registerForm!: FormGroup;
  
  isLoading = false;
  showPassword = false;
  isChecked = false;
  
  // ✅ Alertes pour les erreurs de formulaire
  alert = {
    show: false,
    variant: 'error' as 'error' | 'warning' | 'success' | 'info',
    title: '',
    message: ''
  };

  showError(message: string, title = 'Erreur') {
    this.alert = {
      show: true,
      variant: 'error',
      title,
      message
    };
  }

  clearAlert() {
    this.alert.show = false;
  }

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.initForm();
  }
  
  private adultValidator(control: AbstractControl) {
    const value = control.value;
    if (!value) return null;

    let date: Date;

    if (value instanceof Date) {
      date = value;
    } else if (value?.dateObj instanceof Date) {
      date = value.dateObj;
    } else if (value?.selectedDates?.[0]) {
      date = value.selectedDates[0];
    } else {
      date = new Date(value);
    }

    const today = new Date();
    const minDate = new Date(
      today.getFullYear() - 18,
      today.getMonth(),
      today.getDate()
    );

    return date <= minDate ? null : { underAge: true };
  }

  private initForm(): void {
    this.registerForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(4)]],
      lastName: ['', [Validators.required, Validators.minLength(4)]],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: [
        '',
        [
          Validators.required,
          Validators.pattern(/^[0-9]{8}$/)
        ]
      ],
      birthDate: ['', [Validators.required, this.adultValidator]],
      password: ['', [
        Validators.required, 
        Validators.minLength(6),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)
      ]],      
      confirmPassword: ['', [Validators.required]]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  private passwordMatchValidator(control: AbstractControl): { [key: string]: boolean } | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    return null;
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  get f() {
    return this.registerForm.controls;
  }

  ngOnInit(): void {
    // ✅ Plus besoin de charger les rôles
  }

  showConfirmPassword = false;
  isSubmitting = false;

  get passwordStrength(): 'weak' | 'medium' | 'strong' {
    const password = this.password?.value;
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

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  serverError = {
    show: false,
    message: ''
  };

  clearServerError() {
    this.serverError.show = false;
  }

  onSubmit(event?: Event): void {
    if (event) {
      event.preventDefault();
    }

    // ✅ Empêcher la double soumission
    if (this.isSubmitting) {
      console.log('Soumission déjà en cours, ignorée');
      return;
    }

    // ✅ Marquer tous les champs comme touchés pour afficher les erreurs sous les champs
    this.registerForm.markAllAsTouched();
    
    // ✅ Si le formulaire est invalide, on s'arrête
    if (this.registerForm.invalid) {
      const firstInvalid = document.querySelector('.ng-invalid');
      if (firstInvalid) {
        firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // ✅ Récupérer les valeurs
    const firstName = this.firstName?.value;
    const lastName = this.lastName?.value;
    const email = this.email?.value;
    const rawPhoneNumber = this.phoneNumber?.value;
    const birthDate = this.birthDate?.value;
    const password = this.password?.value;

    // Nettoyer le téléphone
    const cleanedPhoneNumber = rawPhoneNumber?.replace(/[\s\-\.]/g, '');

    // ✅ Extraire la date de naissance
    let birthDateValue: string | undefined;
    
    if (birthDate) {
      let date: Date | null = null;
      
      if (birthDate.selectedDates && birthDate.selectedDates[0]) {
        date = birthDate.selectedDates[0];
      } else if (birthDate.dateObj && birthDate.dateObj instanceof Date) {
        date = birthDate.dateObj;
      } else if (birthDate instanceof Date) {
        date = birthDate;
      } else if (typeof birthDate === 'string') {
        date = new Date(birthDate);
      }
      
      if (date && !isNaN(date.getTime())) {
        birthDateValue = date.toISOString().split('T')[0];
      }
    }

    // ✅ Construction du DTO
    const userName = (firstName + lastName).toLowerCase();

    const registerDto: RegisterDTO = {
      userName: userName,
      email: email,
      password: password,
      prenom: firstName,
      nom: lastName,
      roleId: '',
      phoneNumber: cleanedPhoneNumber,
      birthDate: birthDateValue
    };

    // ✅ Envoi de la requête
    this.isSubmitting = true;
    this.isLoading = true;
    this.serverError.show = false;
    this.alert.show = false; // Effacer les alertes précédentes

    this.authService.register(registerDto).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.isSubmitting = false;

        if (res.resultCode === 0) {
          // ✅ Stocker l'email pour la vérification OTP
          localStorage.setItem('pending_verification_email', registerDto.email);
          
          // ✅ Afficher un message de succès avec l'info email
          this.alert = {
            show: true,
            variant: 'success',
            title: 'Inscription réussie !',
            message: res.message || 'Un code de vérification a été envoyé à votre adresse email.'
          };
          
          // ✅ Rediriger vers la page OTP après 2 secondes
          setTimeout(() => {
            this.router.navigate(['/otp'], { 
              queryParams: { email: registerDto.email } 
            });
          }, 2000);
        } else {
          // Erreur métier (email déjà utilisé, etc.)
          this.serverError = {
            show: true,
            message: res.message || 'Erreur lors de l\'inscription'
          };
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.isSubmitting = false;
        console.error('Erreur détaillée:', err);
        
        // ✅ Afficher l'erreur dans l'alerte
        this.alert = {
          show: true,
          variant: 'error',
          title: 'Erreur',
          message: err?.error?.message || err?.message || 'Erreur serveur. Veuillez réessayer plus tard.'
        };
      }
    });
  }

  // Getters
  get firstName() { return this.registerForm.get('firstName'); }
  get lastName() { return this.registerForm.get('lastName'); }
  get email() { return this.registerForm.get('email'); }
  get password() { return this.registerForm.get('password'); }
  get confirmPassword() { return this.registerForm.get('confirmPassword'); }
  get phoneNumber() { return this.registerForm.get('phoneNumber'); } 
  get birthDate() { return this.registerForm.get('birthDate'); } 
}