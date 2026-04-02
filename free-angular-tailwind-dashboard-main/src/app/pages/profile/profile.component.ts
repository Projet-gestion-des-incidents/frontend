import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PageBreadcrumbComponent } from '../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { UserService } from '../../shared/services/user.service';
import { User } from '../../shared/models/User.model';
import { ModalComponent } from '../../shared/components/ui/modal/modal.component';
import { AlertComponent } from '../../shared/components/ui/alert/alert.component';
import { ButtonComponent } from '../../shared/components/ui/button/button.component';
import { InputFieldComponent } from '../../shared/components/form/input/input-field.component';
import { LabelComponent } from '../../shared/components/form/label/label.component';
import { DatePickerComponent } from '../../shared/components/form/date-picker/date-picker.component';
import { FileInputExampleComponent } from '../../shared/components/form/form-elements/file-input-example/file-input-example.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    PageBreadcrumbComponent,
    ModalComponent,
    AlertComponent,
    ButtonComponent,
    InputFieldComponent,
    LabelComponent,
    DatePickerComponent,
    FileInputExampleComponent
  ],
  templateUrl: './profile.component.html',
  styles: [`
    :host { display: block; padding: 1rem; }
    @media (min-width: 768px) { :host { padding: 1.5rem; } }
  `]
})
export class ProfileComponent implements OnInit {
  user!: User;
  loading = true;
  
  // Modals
  isInfoModalOpen = false;
  isPasswordModalOpen = false;
  
  // Forms
  editForm!: FormGroup;
  passwordForm!: FormGroup;
  
  // States
  saving = false;
  changingPassword = false;
  
  // Image
  selectedImage: File | null = null;
  imagePreview: string | null = null;
  imageBase64: string | null = null;
  
  // Password visibility
  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;
  
  // Date limit (max = aujourd'hui)
  maxBirthDate: Date = new Date();
  
  // Alert
  alert = {
    show: false,
    variant: 'error' as 'success' | 'error' | 'warning' | 'info',
    title: '',
    message: ''
  };

  constructor(
    private fb: FormBuilder,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.loadProfile();
    this.initForms();
  }

  // Validateur d'âge minimum 18 ans
  ageValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    
    const birthDate = new Date(control.value);
    const today = new Date();
    
    // Vérifier si la date est dans le futur
    if (birthDate > today) {
      return { futureDate: true };
    }
    
    // Calculer l'âge
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    // Vérifier si l'âge est inférieur à 18 ans
    if (age < 18) {
      return { underAge: true };
    }
    
    return null;
  }

  loadProfile(): void {
    this.loading = true;
    this.userService.getMyProfile().subscribe({
      next: (res) => {
        this.user = res;
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur chargement profil', err);
        this.loading = false;
        this.showAlert('error', 'Erreur', 'Impossible de charger votre profil');
      }
    });
  }

  initForms(): void {
    this.editForm = this.fb.group({
      nom: ['', [Validators.required, Validators.minLength(2)]],
      prenom: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: [''],
      birthDate: ['', [this.ageValidator]]
    });

    this.passwordForm = this.fb.group({
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(group: FormGroup): { [key: string]: boolean } | null {
    const newPassword = group.get('newPassword')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    return newPassword && confirmPassword && newPassword !== confirmPassword 
      ? { mismatch: true } 
      : null;
  }

  openInfoModal(): void {
    // Formater correctement la date pour le champ input
    let formattedBirthDate = null;
    if (this.user.birthDate) {
      const date = new Date(this.user.birthDate);
      if (!isNaN(date.getTime())) {
        formattedBirthDate = date.toISOString().split('T')[0];
      }
    }
    
    this.editForm.patchValue({
      nom: this.user.nom,
      prenom: this.user.prenom,
      email: this.user.email,
      phoneNumber: this.user.phoneNumber,
      birthDate: formattedBirthDate
    });
    
    this.imagePreview = this.user.image || null;
    this.imageBase64 = null;
    this.selectedImage = null;
    this.isInfoModalOpen = true;
  }

  closeInfoModal(): void {
    this.isInfoModalOpen = false;
    this.clearAlert();
  }

  openPasswordModal(): void {
    this.passwordForm.reset();
    this.isPasswordModalOpen = true;
  }

  closePasswordModal(): void {
    this.isPasswordModalOpen = false;
    this.clearAlert();
  }

  onImageSelected(event: any): void {
    const file = event.target?.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      this.showAlert('error', 'Erreur', 'L\'image ne doit pas dépasser 5MB');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      this.showAlert('error', 'Erreur', 'Format non supporté. Utilisez JPG, PNG, GIF ou WebP');
      return;
    }

    this.selectedImage = file;
    const reader = new FileReader();
    reader.onload = () => {
      this.imagePreview = reader.result as string;
      this.imageBase64 = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  onBirthDateChange(event: any): void {
    let date: Date | null = null;
    if (event instanceof Date) date = event;
    else if (event?.selectedDates?.[0] instanceof Date) date = event.selectedDates[0];
    else if (event?.dateObj instanceof Date) date = event.dateObj;
    
    if (date && !isNaN(date.getTime())) {
      const formattedDate = date.toISOString().split('T')[0];
      this.editForm.get('birthDate')?.setValue(formattedDate);
      // Déclencher la validation
      this.editForm.get('birthDate')?.updateValueAndValidity();
    } else {
      this.editForm.get('birthDate')?.setValue(null);
    }
  }

  saveInfo(): void {
    if (this.editForm.invalid) {
      this.showAlert('error', 'Formulaire invalide', 'Veuillez corriger les champs en erreur');
      return;
    }

    this.saving = true;
    const formValue = this.editForm.value;
    
    // Valider l'âge avant l'envoi
    const birthDateControl = this.editForm.get('birthDate');
    if (birthDateControl?.errors) {
      if (birthDateControl.errors['futureDate']) {
        this.showAlert('error', 'Erreur', 'La date de naissance ne peut pas être dans le futur');
        this.saving = false;
        return;
      }
      if (birthDateControl.errors['underAge']) {
        this.showAlert('error', 'Erreur', 'Vous devez avoir au moins 18 ans');
        this.saving = false;
        return;
      }
    }
    
    const payload: any = {
      nom: formValue.nom,
      prenom: formValue.prenom,
      email: formValue.email,
      phoneNumber: formValue.phoneNumber,
      birthDate: formValue.birthDate
    };

    if (this.imageBase64) {
      payload.image = this.imageBase64;
    }

    this.userService.updateMyProfile(payload).subscribe({
      next: (updatedUser) => {
        this.user = { ...this.user, ...updatedUser };
        this.closeInfoModal();
        this.showAlert('success', 'Succès', 'Profil mis à jour avec succès');
        setTimeout(() => this.clearAlert(), 3000);
        this.saving = false;
      },
      error: (err) => {
        this.saving = false;
        const message = err.error?.message || err.message || 'Erreur lors de la mise à jour';
        this.showAlert('error', 'Erreur', message);
      }
    });
  }

  changePassword(): void {
    if (this.passwordForm.invalid) {
      this.showAlert('error', 'Formulaire invalide', 'Veuillez remplir tous les champs correctement');
      return;
    }

    this.changingPassword = true;
    const payload = {
      currentPassword: this.passwordForm.value.currentPassword,
      newPassword: this.passwordForm.value.newPassword,
      confirmPassword: this.passwordForm.value.confirmPassword
    };

    this.userService.updateMyProfile(payload).subscribe({
      next: () => {
        this.closePasswordModal();
        this.showAlert('success', 'Succès', 'Mot de passe modifié avec succès');
        setTimeout(() => this.clearAlert(), 3000);
        this.changingPassword = false;
      },
      error: (err) => {
        this.changingPassword = false;
        const message = err.error?.message || err.message || 'Erreur lors du changement de mot de passe';
        this.showAlert('error', 'Erreur', message);
      }
    });
  }

  toggleCurrentPassword(): void {
    this.showCurrentPassword = !this.showCurrentPassword;
  }

  toggleNewPassword(): void {
    this.showNewPassword = !this.showNewPassword;
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  showAlert(variant: 'success' | 'error' | 'warning' | 'info', title: string, message: string): void {
    this.alert = { show: true, variant, title, message };
  }

  clearAlert(): void {
    this.alert.show = false;
  }
}