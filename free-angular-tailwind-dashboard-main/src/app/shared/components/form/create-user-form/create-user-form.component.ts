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


  alert = {
    show: false,
    variant: 'error' as 'error' | 'success',
    title: '',
    message: ''
  };

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
      roleId: ['', Validators.required], // Utiliser roleId
      // password: ['', [Validators.required, Validators.minLength(6)]],
      // confirmPassword: ['', Validators.required]
    // }, { validator: this.passwordMatchValidator 
    });
  }

  // passwordMatchValidator(form: FormGroup) {
  //   const password = form.get('password')?.value;
  //   const confirmPassword = form.get('confirmPassword')?.value;
  //   return password === confirmPassword ? null : { mismatch: true };
  // }

  // togglePasswordVisibility(field: 'password' | 'confirmPassword') {
  //   if (field === 'password') {
  //     this.showPassword = !this.showPassword;
  //   } else {
  //     this.showConfirmPassword = !this.showConfirmPassword;
  //   }
  // }
 
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

ngOnInit(): void {
  this.loadRoles();
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

    const userData: CreateUserDto = {
      userName: userName,
      email: formData.email,
      nom: formData.nom,
      prenom: formData.prenom,
      roleId: formData.roleId,
      password: formData.password
    };

  console.log('Données envoyées:', {
    ...userData,
  }); 

 this.userService.createUser(userData).subscribe({
  next: (response: any) => {
    this.loading = false;

    if (response.resultCode && response.resultCode !== 0) {
      // Code d'erreur de l'API
      const errorMessage = response.message || 'Erreur lors de la création de l\'utilisateur';
      this.showError(errorMessage, 'Erreur');
      return;
    }
    // Succès réel
    this.showSuccess('Utilisateur créé avec succès !');

    setTimeout(() => {
      this.router.navigate(['/admin-dashboard']);
    }, 2000);
  },
  error: (err) => {
    this.loading = false;

    let errorMessage = 'Erreur lors de la création de l\'utilisateur';
    if (err?.error?.message) {
      errorMessage = err.error.message;
    } else if (err?.error?.errors?.length) {
      errorMessage = err.error.errors.map((e: any) => e.message || e).join('<br>');
    }

    this.showError(errorMessage, 'Erreur');
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

 private showSuccess(message: string, title = 'Succès') {
  this.alert = {
    show: true,
    variant: 'success', //
    title,
    message
  };
}

private showError(message: string, title = 'Erreur') {
  this.alert = {
    show: true,
    variant: 'error', //
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