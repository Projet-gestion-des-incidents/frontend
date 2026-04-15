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
import { MapComponent } from '../../google-maps-wrapper/map.component';

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
    FileInputExampleComponent,
    MapComponent
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
  
 mapReady: boolean = false;
  
  // Alert améliorée
  alert = {
    show: false,
    variant: 'error' as 'success' | 'error' | 'warning' | 'info',
    title: '',
    message: '',
    autoCloseTimeout: null as any
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
    
    if (birthDate > today) {
      return { futureDate: true };
    }
    
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    if (age < 18) {
      return { underAge: true };
    }
    
    return null;
  }

  loadProfile(): void {
    this.loading = true;
    this.userService.getMyProfile().subscribe({
      next: (res) => {
        console.log('📦 Profil reçu:', res);
        this.user = res;
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur chargement profil', err);
        this.loading = false;
        this.showAlert('error', 'Erreur de chargement', 'Impossible de charger votre profil. Veuillez réessayer.');
      }
    });
  }

  initForms(): void {
    this.editForm = this.fb.group({
      nom: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      prenom: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', [Validators.pattern(/^[0-9]{8}$/)]],
      birthDate: ['', [this.ageValidator]],
      adresse: ['', [Validators.maxLength(200)]],
      nomMagasin: ['', [Validators.minLength(3), Validators.maxLength(50)]]
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
    birthDate: formattedBirthDate,
    adresse: this.user.adresse || '',
    nomMagasin: this.user.nom || ''
  });
  
  this.imagePreview = this.user.image || null;
  this.imageBase64 = null;
  this.selectedImage = null;
  this.isInfoModalOpen = true;
  
  // ✅ Réinitialiser mapReady
  this.mapReady = false;
  
  // ✅ Attendre que le modal soit complètement ouvert avant d'initialiser la carte
  setTimeout(() => {
    this.mapReady = true;
  }, 300);
}



  openPasswordModal(): void {
    this.passwordForm.reset();
    this.isPasswordModalOpen = true;
  }

  closePasswordModal(): void {
    this.isPasswordModalOpen = false;
    this.clearAlert();
  }

 

// Dans profile.component.ts
onLocationSelectedInModal(location: any): void {
  if (location && location.address) {
    // Mettre à jour directement le formulaire
    this.editForm.patchValue({ adresse: location.address });
    console.log('Adresse sélectionnée:', location.address);
    console.log('Latitude:', location.lat);
    console.log('Longitude:', location.lng);
  }
}


  onImageSelected(event: any): void {
    const file = event.target?.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      this.showAlert('error', 'Fichier trop volumineux', 'L\'image ne doit pas dépasser 5MB');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      this.showAlert('error', 'Format non supporté', 'Utilisez JPG, PNG, GIF ou WebP');
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
      this.editForm.get('birthDate')?.updateValueAndValidity();
    } else {
      this.editForm.get('birthDate')?.setValue(null);
    }
  }

  saveInfo(): void {
    if (this.editForm.invalid) {
      const errors = [];
      if (this.editForm.get('nom')?.errors) errors.push('Nom invalide');
      if (this.editForm.get('prenom')?.errors) errors.push('Prénom invalide');
      if (this.editForm.get('email')?.errors) errors.push('Email invalide');
      if (this.editForm.get('phoneNumber')?.errors) errors.push('Téléphone invalide (8 chiffres)');
      if (this.editForm.get('birthDate')?.errors) errors.push('Date de naissance invalide (18 ans minimum)');
      
      this.showAlert('error', 'Formulaire invalide', errors.join(', '));
      return;
    }

    this.saving = true;
    const formValue = this.editForm.value;
    
    if (this.user.role === 'Technicien') {
      const birthDateControl = this.editForm.get('birthDate');
      if (birthDateControl?.errors) {
        if (birthDateControl.errors['futureDate']) {
          this.showAlert('error', 'Date invalide', 'La date de naissance ne peut pas être dans le futur');
          this.saving = false;
          return;
        }
        if (birthDateControl.errors['underAge']) {
          this.showAlert('error', 'Âge insuffisant', 'Vous devez avoir au moins 18 ans');
          this.saving = false;
          return;
        }
      }
    }
    
    let payload: any = {};
    let serviceCall: any;
    let successMessage = '';
    
    if (this.user.role === 'Technicien') {
      payload = {
        nom: formValue.nom,
        prenom: formValue.prenom,
        email: formValue.email,
        phoneNumber: formValue.phoneNumber,
        birthDate: formValue.birthDate
      };
      if (this.imageBase64) payload.image = this.imageBase64;
      serviceCall = this.userService.updateTechnicienProfile(payload);
      successMessage = 'Profil technicien mis à jour avec succès';
      
    } else if (this.user.role === 'Commercant') {
      payload = {
        nomMagasin: formValue.nomMagasin || formValue.nom,
        email: formValue.email,
        phoneNumber: formValue.phoneNumber,
        adresse: formValue.adresse
      };
      if (this.imageBase64) payload.image = this.imageBase64;
      serviceCall = this.userService.updateCommercantProfile(payload);
      successMessage = 'Profil commerçant mis à jour avec succès';
      
    } else {
      payload = {
        userName: formValue.nom,
        nom: formValue.nom,
        prenom: formValue.prenom,
        email: formValue.email,
        phoneNumber: formValue.phoneNumber
      };
      if (formValue.birthDate) payload.birthDate = formValue.birthDate;
      if (formValue.adresse) payload.adresse = formValue.adresse;
      if (this.imageBase64) payload.image = this.imageBase64;
      serviceCall = this.userService.updateMyProfile(payload);
      successMessage = 'Profil administrateur mis à jour avec succès';
    }
    
    serviceCall.subscribe({
      next: (updatedUser: User) => {
        
        this.user = { ...this.user, ...updatedUser };
        if (this.user.role === 'Commercant' && updatedUser.nom) {
          this.user.nom = updatedUser.nom;
        }
            this.loadProfile();

        this.closeInfoModal();
        this.showAlert('success', 'Succès', successMessage);
        this.saving = false;
      },
      error: (err: any) => {
        this.saving = false;
        let errorMessage = 'Erreur lors de la mise à jour';
        
        if (err.error?.message) {
          errorMessage = err.error.message;
          if (errorMessage.includes('email déjà utilisé')) {
            errorMessage = 'Cet email est déjà utilisé par un autre compte';
          } else if (errorMessage.includes('téléphone déjà utilisé')) {
            errorMessage = 'Ce numéro de téléphone est déjà utilisé';
          } else if (errorMessage.includes('nom d\'utilisateur déjà pris')) {
            errorMessage = 'Ce nom d\'utilisateur est déjà pris';
          }
        } else if (err.message) {
          errorMessage = err.message;
        }
        
        this.showAlert('error', 'Erreur de mise à jour', errorMessage);
      }
    });
  }
closeInfoModal(): void {
  this.isInfoModalOpen = false;
  this.mapReady = false;  // ✅ Réinitialiser quand on ferme
  this.clearAlert();
}
  changePassword(): void {
    if (this.passwordForm.invalid) {
      if (this.passwordForm.get('currentPassword')?.errors) {
        this.showAlert('error', 'Champ requis', 'Le mot de passe actuel est requis');
      } else if (this.passwordForm.get('newPassword')?.errors) {
        this.showAlert('error', 'Mot de passe faible', 'Le nouveau mot de passe doit contenir au moins 6 caractères');
      } else if (this.passwordForm.hasError('mismatch')) {
        this.showAlert('error', 'Non concordant', 'Les mots de passe ne correspondent pas');
      } else {
        this.showAlert('error', 'Formulaire invalide', 'Veuillez remplir tous les champs correctement');
      }
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
        this.showAlert('success', 'Mot de passe modifié', 'Votre mot de passe a été changé avec succès');
        this.changingPassword = false;
              this.loadProfile();

      },
      error: (err) => {
        this.changingPassword = false;
        let errorMessage = 'Erreur lors du changement de mot de passe';
        
        if (err.error?.message) {
          errorMessage = err.error.message;
          if (errorMessage.includes('incorrect')) {
            errorMessage = 'Le mot de passe actuel est incorrect';
          }
        }
        
        this.showAlert('error', 'Erreur', errorMessage);
      }
    });
  }
// Ajouter dans ProfileComponent

removeSelectedImage(): void {
  this.selectedImage = null;
  this.imagePreview = null;
  this.imageBase64 = null;
  
  // Réinitialiser l'input file
  const fileInput = document.getElementById('profileImage') as HTMLInputElement;
  if (fileInput) {
    fileInput.value = '';
  }
}
// Ajouter dans le TypeScript

formatBirthDateForDisplay(dateValue: string): string {
  if (!dateValue) return '';
  
  // Si c'est déjà au format YYYY-MM-DD, convertir en DD/MM/YYYY
  if (dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = dateValue.split('-');
    return `${day}/${month}/${year}`;
  }
  return dateValue;
}

onBirthDateTextChange(event: any): void {
  let value = event.target.value;
  
  // Auto-formatage: ajouter automatiquement les slashs
  let cleaned = value.replace(/\D/g, '');
  if (cleaned.length >= 3 && cleaned.length <= 4) {
    cleaned = cleaned.slice(0, 2) + '/' + cleaned.slice(2);
  } else if (cleaned.length >= 5) {
    cleaned = cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4) + '/' + cleaned.slice(4, 8);
  }
  
  // Mettre à jour la valeur affichée
  if (cleaned !== value) {
    event.target.value = cleaned;
  }
  
  // Convertir en format YYYY-MM-DD pour la validation
  if (cleaned.length === 10) {
    const [day, month, year] = cleaned.split('/');
    const isoDate = `${year}-${month}-${day}`;
    this.editForm.get('birthDate')?.setValue(isoDate);
  } else {
    this.editForm.get('birthDate')?.setValue(cleaned);
  }
  
  this.editForm.get('birthDate')?.markAsTouched();
  this.editForm.get('birthDate')?.updateValueAndValidity();
}

// Ajouter un validateur pour le format de date
dateFormatValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (!value) return null;
  
  // Vérifier le format YYYY-MM-DD
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!datePattern.test(value)) {
    return { invalidDate: true };
  }
  
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    return { invalidDate: true };
  }
  
  return null;
}
// Ajouter cette méthode pour ouvrir le calendrier programmatiquement
openCalendar(): void {
  const dateInput = document.getElementById('birthDate') as HTMLInputElement;
  if (dateInput) {
    dateInput.showPicker(); // Fonctionne dans les navigateurs modernes
  }
}
maxBirthDateISO: string = '';

onBirthDateInputChange(event: any): void {
  const dateValue = event.target.value;
  if (dateValue) {
    this.editForm.get('birthDate')?.setValue(dateValue);
    this.editForm.get('birthDate')?.markAsTouched();
    this.editForm.get('birthDate')?.updateValueAndValidity();
  } else {
    this.editForm.get('birthDate')?.setValue(null);
  }
}

// Modifier le validateur dans initForms pour inclure le format
formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
  showAlert(variant: 'success' | 'error' | 'warning' | 'info', title: string, message: string): void {
    if (this.alert.autoCloseTimeout) {
      clearTimeout(this.alert.autoCloseTimeout);
    }
    
    this.alert = { 
      show: true, 
      variant, 
      title, 
      message,
      autoCloseTimeout: null
    };
    
    if (variant === 'success' || variant === 'error') {
      this.alert.autoCloseTimeout = setTimeout(() => {
        this.clearAlert();
      }, 5000);
    }
  }

  clearAlert(): void {
    if (this.alert.autoCloseTimeout) {
      clearTimeout(this.alert.autoCloseTimeout);
    }
    this.alert.show = false;
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
}