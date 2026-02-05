import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
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
    FileInputExampleComponent
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
  
  alert = {
    show: false,
    variant: 'error' as 'error' | 'success',
    title: '',
    message: ''
  };

  roleOptions = [
    { value: 'Admin', label: 'Administrateur' },
    { value: 'Technicien', label: 'Technicien' },
    { value: 'Commercant', label: 'Commerçant' }
  ];

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private router: Router
  ) {
    this.userForm = this.fb.group({
      nom: ['', [Validators.required, Validators.minLength(2)]],
      prenom: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.pattern(/^[0-9+\-\s()]{8,15}$/)]],
      role: ['', Validators.required],
      birthDate: [''],
      password: ['', [
        Validators.required,
        Validators.minLength(8)
      ]],
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

  onImageSelected(event: any) {
    const file = event.target?.files?.[0];
    if (file) {
      this.selectedImage = file;
      
      // Prévisualisation
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result;
      };
      reader.readAsDataURL(file);
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

    const age = formData.birthDate ? this.calculateAge(formData.birthDate) : null;

    const userData: CreateUserDto = {
      userName: userName,
      email: formData.email,
      nom: formData.nom,
      prenom: formData.prenom,
      //age: age,
      phone: formData.phone,
      role: formData.role,
      image: this.imagePreview as string || '',
      password: formData.password
    };

    console.log('Données envoyées:', userData);

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

  calculateAge(birthDate: string): number | null {
  if (!birthDate) return null;
  
  try {
    const today = new Date();
    const birth = new Date(birthDate);
    
    // Vérifie que la date est valide
    if (isNaN(birth.getTime())) return null;
    
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  } catch (error) {
    console.error('Erreur calcul âge:', error);
    return null;
  }
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
}