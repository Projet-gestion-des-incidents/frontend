import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
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

//  Validateur personnalisé pour le nom d'utilisateur (sans espaces, uniquement lettres/chiffres)
function usernameValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (!value) return null;
  
  // Vérifie que le nom d'utilisateur contient uniquement des lettres et chiffres (pas d'espaces, pas de caractères spéciaux)
  const regex = /^[a-zA-Z0-9]+$/;
  if (!regex.test(value)) {
    return { usernameInvalid: true };
  }
  return null;
}

//  Validateur personnalisé pour la date de naissance (18 ans minimum)
function birthDateValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  
  //  Si la valeur est vide, pas d'erreur 
  if (!value) {
    return null;
  }
  
  const birthDate = new Date(value);
  const today = new Date();
  
  //  Vérifier si la date est valide
  if (isNaN(birthDate.getTime())) {
    return { invalidDate: true };
  }
  
  //  Vérifier que la date n'est pas dans le futur
  if (birthDate > today) {
    return { futureDate: true };
  }
  
  //  Vérifier l'âge minimum (18 ans)
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  if (age < 18) {
    return { underAge: true };
  }
  
  //  Vérifier l'âge maximum (120 ans - date raisonnable)
  if (age > 120) {
    return { overAge: true };
  }
  
  //  Vérifier que l'année n'est pas inférieure à 1900
  if (birthDate.getFullYear() < 1900) {
    return { tooOld: true };
  }
  
  return null;
}

//  Validateur de correspondance des mots de passe
function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password');
  const confirmPassword = control.get('confirmPassword');

  if (password && confirmPassword && password.value !== confirmPassword.value) {
    confirmPassword.setErrors({ passwordMismatch: true });
    return { passwordMismatch: true };
  }
  return null;
}

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
   /* Styles pour le champ date */
  .date-input {
    padding-left: 2.5rem !important;
    padding-right: 2.5rem !important;
    height: 42px;
    line-height: normal;
  }
  
  /* Style pour le bouton calendrier */
  .calendar-btn {
    right: 0.5rem;
    top: 50%;
    transform: translateY(-50%);
    width: 32px;
    height: 32px;
  }
  
  /* Supprimer l'icône native du date picker */
  input[type="date"]::-webkit-calendar-picker-indicator {
    opacity: 0;
    position: absolute;
    right: 0;
    width: 100%;
    height: 100%;
    cursor: pointer;
  }
  /* Icône à gauche pour tous les inputs */
  .relative .absolute.inset-y-0.left-0 {
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  }
  
  /* Alignement des inputs */
  .relative input,
  .relative .form-input {
    width: 100%;
    padding-left: 2.75rem !important;
    padding-right: 2.75rem !important;
    min-height: 42px;
  }
  
  /* Boutons généraux (œil et calendrier) - centrage parfait */
  .relative button {
    position: absolute;
    right: 0.5rem;
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
    width: 2rem;
    height: 2rem;
    border-radius: 0.5rem;
    transition: background-color 0.2s;
  }
  
  .relative button:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }
  
  .relative button svg {
    width: 1.25rem;
    height: 1.25rem;
  }
  
  /* Ajustement spécifique pour le champ date */
  input[type="date"] {
    cursor: pointer;
    line-height: normal;
  }
  
  /* Style pour les inputs avec erreur */
  .border-red-500 {
    border-color: rgb(239 68 68) !important;
  }
  
  /* Supprimer l'icône par défaut du date picker dans certains navigateurs */
  input[type="date"]::-webkit-calendar-picker-indicator {
    opacity: 0;
    position: absolute;
    right: 0;
    width: 100%;
    height: 100%;
    cursor: pointer;
  }
  
  /* Ajustement du padding pour mobile */
  @media (max-width: 640px) {
    .relative input,
    .relative .form-input {
      padding-left: 2.5rem !important;
      padding-right: 2.5rem !important;
      font-size: 14px;
    }
  }
`,],
  templateUrl: './signup-form.component.html'
})
export class SignupFormComponent {
  registerForm!: FormGroup;
  
  isLoading = false;
  isSubmitting = false;
  showPassword = false;
  showConfirmPassword = false;
  isChecked = false;
  private alertTimeout: any;
private serverErrorTimeout: any;
  //  Calculer la date maximale (18 ans minimum)
  maxBirthDateISO: string = '';
  minBirthDateISO: string = '1900-01-01';
  
  //  Alertes pour les erreurs de formulaire
  alert = {
    show: false,
    variant: 'error' as 'error' | 'warning' | 'success' | 'info',
    title: '',
    message: ''
  };

  serverError = {
    show: false,
    message: ''
  };

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.initForm();
    
    // Calculer la date maximale (18 ans minimum)
    const today = new Date();
    const maxDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
    this.maxBirthDateISO = maxDate.toISOString().split('T')[0];
  }

  private initForm(): void {
    this.registerForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(30)]],
      lastName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(30)]],
      email: ['', [Validators.required, Validators.email]],
      userName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(30), usernameValidator]],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^[0-9]{8}$/)]],
      birthDate: ['', [Validators.required, birthDateValidator]],
      password: ['', [
        Validators.required, 
        Validators.minLength(6),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)
      ]],      
      confirmPassword: ['', [Validators.required]]
    }, {
      validators: passwordMatchValidator
    });
  }

  // Getters pour faciliter l'accès aux champs
  get firstName() { return this.registerForm.get('firstName'); }
  get lastName() { return this.registerForm.get('lastName'); }
  get email() { return this.registerForm.get('email'); }
  get userName() { return this.registerForm.get('userName'); }
  get phoneNumber() { return this.registerForm.get('phoneNumber'); }
  get birthDate() { return this.registerForm.get('birthDate'); }
  get password() { return this.registerForm.get('password'); }
  get confirmPassword() { return this.registerForm.get('confirmPassword'); }


  showSuccess(message: string, title = 'Succès') {
  // Nettoyer le timeout précédent
  if (this.alertTimeout) {
    clearTimeout(this.alertTimeout);
  }
  
  this.alert = {
    show: true,
    variant: 'success',
    title,
    message
  };
  
  // Auto-fermeture après 3 secondes
  this.alertTimeout = setTimeout(() => {
    this.clearAlert();
  }, 3000);
}

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

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

showError(message: string, title = 'Erreur') {
  // Nettoyer le timeout précédent
  if (this.alertTimeout) {
    clearTimeout(this.alertTimeout);
  }
  
  this.alert = {
    show: true,
    variant: 'error',
    title,
    message
  };
  
  // Auto-fermeture après 3 secondes
  this.alertTimeout = setTimeout(() => {
    this.clearAlert();
  }, 3000);
}

clearAlert() {
  this.alert.show = false;
  if (this.alertTimeout) {
    clearTimeout(this.alertTimeout);
    this.alertTimeout = null;
  }
}

clearServerError() {
  if (this.serverErrorTimeout) {
    clearTimeout(this.serverErrorTimeout);
  }
  
  this.serverError.show = false;
  
  if (this.serverErrorTimeout) {
    this.serverErrorTimeout = null;
  }
}


ngOnDestroy(): void {
  // Nettoyer les timeouts pour éviter les fuites mémoire
  if (this.alertTimeout) {
    clearTimeout(this.alertTimeout);
  }
  if (this.serverErrorTimeout) {
    clearTimeout(this.serverErrorTimeout);
  }
}
  openCalendar(): void {
    const dateInput = document.getElementById('birthDate') as HTMLInputElement;
    if (dateInput) {
      dateInput.showPicker();
    }
  }

onSubmit(event?: Event): void {
  if (event) {
    event.preventDefault();
  }

  if (this.isSubmitting) {
    console.log('Soumission déjà en cours, ignorée');
    return;
  }

  //  Marquer tous les champs comme touchés pour afficher les erreurs sous les champs
  this.registerForm.markAllAsTouched();
  
  //  Si le formulaire est invalide, on s'arrête
  if (this.registerForm.invalid) {
    const firstInvalid = document.querySelector('.ng-invalid');
    if (firstInvalid) {
      firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    // Afficher une erreur générale
    this.showError('Veuillez corriger les erreurs dans le formulaire', 'Formulaire invalide');
    return;
  }

  //  Récupérer les valeurs
  const firstName = this.firstName?.value;
  const lastName = this.lastName?.value;
  const email = this.email?.value;
  const userName = this.userName?.value;
  const rawPhoneNumber = this.phoneNumber?.value;
  const birthDate = this.birthDate?.value;
  const password = this.password?.value;

  // Nettoyer le téléphone
  const cleanedPhoneNumber = rawPhoneNumber?.replace(/[\s\-\.]/g, '');

  //  Extraire la date de naissance
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

  //  Construction du DTO
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

  //  Envoi de la requête
  this.isSubmitting = true;
  this.isLoading = true;
  this.serverError.show = false;
  this.alert.show = false;

  this.authService.register(registerDto).subscribe({
    next: (res) => {
      this.isLoading = false;
      this.isSubmitting = false;

      if (res.resultCode === 0) {
        //  Stocker l'email pour la vérification OTP
        localStorage.setItem('pending_verification_email', registerDto.email);
        
        //  Afficher un message de succès
        this.showSuccess(res.message || 'Un code de vérification a été envoyé à votre adresse email.', 'Inscription réussie !');
        
        // Rediriger vers la page OTP après 3 secondes
        setTimeout(() => {
          this.router.navigate(['/otp'], { 
            queryParams: { email: registerDto.email } 
          });
        }, 3000);
      } else {
        // Erreur métier (email déjà utilisé, etc.)
        this.showError(res.message || 'Erreur lors de l\'inscription');
      }
    },
    error: (err) => {
      this.isLoading = false;
      this.isSubmitting = false;
      console.error('Erreur détaillée:', err);
      
      // Afficher l'erreur dans l'alerte
      const errorMessage = err?.error?.message || err?.message || 'Erreur serveur. Veuillez réessayer plus tard.';
      this.showError(errorMessage, 'Erreur');
    }
  });
}
}