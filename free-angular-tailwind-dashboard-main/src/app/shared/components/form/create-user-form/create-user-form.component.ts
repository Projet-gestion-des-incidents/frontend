import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ComponentCardComponent } from '../../common/component-card/component-card.component';
import { LabelComponent } from '../label/label.component';
import { InputFieldComponent } from '../input/input-field.component';
import { SelectComponent } from '../select/select.component';
import { DatePickerComponent } from '../date-picker/date-picker.component';
import { ButtonComponent } from '../../ui/button/button.component';
import { AlertComponent } from '../../ui/alert/alert.component';
import { FileInputExampleComponent } from '../form-elements/file-input-example/file-input-example.component';
import { CreateUserDto, UserService } from '../../../services/user.service';
import { AuthService } from '../../../services/auth.service';


@Component({
  selector: 'app-create-user-admin',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ComponentCardComponent,
    LabelComponent,
    InputFieldComponent,
    SelectComponent,
    DatePickerComponent,
    ButtonComponent,
    AlertComponent,
    FileInputExampleComponent,
   
  ],
  templateUrl: './create-user-form.component.html'
})
export class CreateUserAdminComponent {
  userForm: FormGroup;
  loading = false;
  showPassword = false;
  showConfirmPassword = false;
  selectedImage: File | null = null;
  imagePreview: string | ArrayBuffer | null = null;
  imageBase64: string | null = null; // Envoyer le Base64 propre

  alert = {
    show: false,
    variant: 'error' as 'error' | 'success',
    title: '',
    message: ''
  };

  //  roleOptions: { id: string, name: string }[] = [];


  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private router: Router,
    private authService : AuthService
  ) {
    this.userForm = this.fb.group({
      nom: ['', [Validators.required, Validators.minLength(2)]],
      prenom: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: [
  '',
  [
    Validators.required,
    Validators.pattern(/^[0-9+\-\s()]{8,15}$/)
  ]
],      roleId: ['', Validators.required], // Utiliser roleId
      birthDate: ['', [this.adultValidator]],
      password: ['', [Validators.required, Validators.minLength(6)]],

      confirmPassword: ['', Validators.required]
    }, { validator: this.passwordMatchValidator });
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { mismatch: true };
  }

  togglePasswordVisibility(field: 'password' | 'confirmPassword') {
    if (field === 'password') {
      this.showPassword = !this.showPassword;
    } else {
      this.showConfirmPassword = !this.showConfirmPassword;
    }
  }

 
roles: {id: string, name: string}[] = [];
selectedRoleId: string = '';
  get roleOptions(): { value: string; label: string }[] {
  return this.roles.map(r => ({ value: r.id, label: r.name }));
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

ngOnInit(): void {
  this.loadRoles();
}
onImageSelected(event: any) {
  console.log('Event reçu:', event);
  console.log('Fichier disponible:', event.target?.files?.[0]);
  
  const file = event.target?.files?.[0];
  if (file) {
    console.log('Fichier détecté:', {
      name: file.name,
      size: file.size,
      type: file.type
    });
    
    this.selectedImage = file;
    
    // Vérifier la taille du fichier (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      this.showError('L\'image ne doit pas dépasser 5MB', 'Fichier trop volumineux');
      return;
    }
    
    // Vérifier le type de fichier
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      this.showError('Type de fichier non supporté. Utilisez JPG, PNG, GIF ou WebP', 'Format invalide');
      return;
    }
    
    // Convertir l'image en Base64
    const reader = new FileReader();
    reader.onload = () => {
      console.log('FileReader onload déclenché, résultat:', reader.result ? 'présent' : 'absent');
      this.imagePreview = reader.result;
      this.imageBase64 = reader.result as string;
      console.log('imageBase64 défini:', this.imageBase64 ? this.imageBase64.substring(0, 50) + '...' : 'null');
    };
    
    reader.onerror = (error) => {
      console.error('Erreur FileReader:', error);
    };
    
    reader.readAsDataURL(file);
    console.log('FileReader.readAsDataURL appelé');
  } else {
    console.log('Aucun fichier détecté');
  }
}

  onSubmit() {
    if (this.userForm.invalid) {
      this.markFormGroupTouched(this.userForm);
      return;
    }

    this.loading = true;
    this.clearAlert();

    const formData = this.userForm.value;
    
    // Créer l'username automatiquement
    const userName = `${formData.prenom}.${formData.nom}`.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Enlève accents
      .replace(/[^a-z0-9.]/g, ''); // Garde seulement lettres, chiffres, points

    let cleanImageBase64 = null;
    if (this.imageBase64) {
      cleanImageBase64 = this.imageBase64.split(',')[1]; // Enlève le préfixe
  }

    const userData: CreateUserDto = {
      userName: userName,
      email: formData.email,
      nom: formData.nom,
      prenom: formData.prenom,
    
      phoneNumber: formData.phoneNumber,
      roleId: formData.roleId, // Utiliser roleId
      image: cleanImageBase64, // Envoyer le Base64 propre
      password: formData.password
    };

  console.log('Données envoyées:', {
    ...userData,
    imageLength: cleanImageBase64 ? cleanImageBase64.length : 0
  }); 

    this.userService.createUser(userData).subscribe({
      next: (response) => {
        this.loading = false;
        this.showSuccess('Utilisateur créé avec succès !');
        
        setTimeout(() => {
          this.router.navigate(['/admin-dashboard']);
        }, 2000);
      },
      error: (err) => {
        this.loading = false;
        this.showError(
          err?.error?.message || 
          'Erreur lors de la création de l\'utilisateur'
        );
      }
    });
  }

get birthDate() {
  return this.userForm.get('birthDate');
}


  private markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  private showSuccess(message: string) {
    this.alert = {
      show: true,
      variant: 'success',
      title: 'Succès',
      message
    };
  }

  private showError(message: string, title = 'Erreur') {
    this.alert = {
      show: true,
      variant: 'error',
      title,
      message
    };
  }

  private clearAlert() {
    this.alert.show = false;
  }

  cancel() {
    this.router.navigate(['/admin-dashboard']);
  }

  get phoneNumber() {
  return this.userForm.get('phoneNumber');
}

}