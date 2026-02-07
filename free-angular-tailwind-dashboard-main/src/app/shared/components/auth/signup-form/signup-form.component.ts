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
  templateUrl: './signup-form.component.html',
  styleUrls: [] 
})

export class SignupFormComponent {
  roles: {id: string, name: string}[] = [];
  selectedRoleId: string = '';

  registerForm!: FormGroup;
  isLoading = false;
  showPassword = false;
  isChecked = false;
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
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: [
  '',
  [
    Validators.required,
    Validators.pattern(/^[0-9+\-\s()]{8,15}$/)
  ]
],
      birthDate: ['', [this.adultValidator]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      
      confirmPassword: ['', [Validators.required]] ,// Ajouté car vous l'utilisez dans le validateur
      roleId: ['', Validators.required]  // ← Nouveau champ rôle

 
    }, {
      validators: this.passwordMatchValidator
    });
  }
  get roleOptions(): { value: string; label: string }[] {
  return this.roles.map(r => ({ value: r.id, label: r.name }));
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
  this.loadRoles();
}

private loadRoles(): void {
  this.authService.getRolesForRegister().subscribe({
    next: (roles) => {
      // Filtrer uniquement Technicien et Commerçant
      this.roles = roles.filter(r => r.name.toLowerCase() === 'technicien' || r.name.toLowerCase() === 'commercant');
    },
    error: (err) => {
      console.error('Erreur lors du chargement des rôles:', err);
      this.showError('Impossible de charger les rôles disponibles.');
    }
  });
}

onSubmit(event?: Event): void {
  console.log("here")
  if (event) {
    event.preventDefault();
  }

  if (this.registerForm.invalid) {
    this.registerForm.markAllAsTouched();
    return;
  }

  // DEBUG: Voir ce que contient birthDate
  const birthDateRawValue = this.registerForm.get('birthDate')?.value;


  // Extraire la date correctement
  let birthDateValue: string | undefined;
  
  if (birthDateRawValue) {
    // Méthode 1: Si c'est un objet Flatpickr
    if (birthDateRawValue.selectedDates && birthDateRawValue.selectedDates[0]) {
      const date = birthDateRawValue.selectedDates[0];
      birthDateValue = date.toISOString().split('T')[0]; // Format YYYY-MM-DD
    }
    // Méthode 2: Si c'est un objet avec dateObj
    else if (birthDateRawValue.dateObj && birthDateRawValue.dateObj instanceof Date) {
      birthDateValue = birthDateRawValue.dateObj.toISOString().split('T')[0];
    }
    // Méthode 3: Si c'est directement un Date
    else if (birthDateRawValue instanceof Date) {
      birthDateValue = birthDateRawValue.toISOString().split('T')[0];
    }
    // Méthode 4: Si c'est déjà une string
    else if (typeof birthDateRawValue === 'string') {
      birthDateValue = birthDateRawValue;
    }
    // Méthode 5: Voir la structure complète
    else {
      console.log('Full birthDate object:', JSON.stringify(birthDateRawValue, null, 2));
      // Essayer de trouver une propriété de date
      for (const key in birthDateRawValue) {
        console.log(`Key ${key}:`, birthDateRawValue[key]);
        if (birthDateRawValue[key] instanceof Date) {
          birthDateValue = birthDateRawValue[key].toISOString().split('T')[0];
          break;
        }
      }
    }
  }

  // Si on n'a pas pu extraire la date, utiliser null
  if (!birthDateValue) {
    birthDateValue = undefined;
    console.log('No valid date found, using undefined');
  }  

  console.log("form", this.registerForm.value)

  const dto: RegisterDTO = {
    userName: this.registerForm.get('firstName')?.value.toLowerCase() + 
              this.registerForm.get('lastName')?.value.toLowerCase(),
    email: this.registerForm.get('email')?.value,
    password: this.registerForm.get('password')?.value,
    prenom: this.registerForm.get('firstName')?.value,
    nom: this.registerForm.get('lastName')?.value,
  
    roleId: this.registerForm.get('roleId')?.value,
    phoneNumber: this.registerForm.get('phoneNumber')?.value,
    birthDate: birthDateValue // Peut être undefined
  };

  console.log('DTO à envoyer:', JSON.stringify(dto, null, 2));

  this.isLoading = true;

  this.authService.register(dto).subscribe({
    next: (res) => {
      this.isLoading = false;

      if (res.resultCode == 0) {
        // Stocker temporairement l'email pour la page OTP
        localStorage.setItem('pending_email', dto.email);
        console.log('Navigating to OTP...');
        // Rediriger vers OTP avec l'email en paramètre
        this.router.navigate(['/otp'], { 
          queryParams: { email: dto.email } 
        });
      } else {
        this.showError(res.message || 'Erreur lors de l\'inscription');
      }
    },
    error: (err) => {
      this.isLoading = false;
      console.error('Erreur détaillée:', err);
      this.showError(err?.error?.message || err.message || 'Erreur serveur'); 
    }
  });
}

  // AJOUTEZ CES GETTERS pour faciliter l'accès :
  get firstName() { return this.registerForm.get('firstName'); }
  get roleId(){ return this.registerForm.get('roleId') ;
}

  get lastName() { return this.registerForm.get('lastName'); }
  get email() { return this.registerForm.get('email'); }
  get password() { return this.registerForm.get('password'); }
  get confirmPassword() { return this.registerForm.get('confirmPassword'); }

  get phoneNumber() { return this.registerForm.get('phoneNumber'); } 
  get birthDate() { return this.registerForm.get('birthDate'); } 
}