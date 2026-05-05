import { Component, LOCALE_ID, OnInit } from '@angular/core';
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
import { OtpService } from '../../shared/services/otp.service';
import { Observable } from 'rxjs';
import localeFr from '@angular/common/locales/fr';
import { registerLocaleData } from '@angular/common';


// Ajouter ces validateurs après les imports
function usernameValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (!value) return null;
  
  const regex = /^[a-zA-Z0-9]+$/;
  if (!regex.test(value)) {
    return { usernameInvalid: true };
  }
  return null;
}

function birthDateValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (!value) return null;
  
  const birthDate = new Date(value);
  const today = new Date();
  
  if (isNaN(birthDate.getTime())) {
    return { invalidDate: true };
  }
  
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
  
  if (age > 120) {
    return { overAge: true };
  }
  
  if (birthDate.getFullYear() < 1900) {
    return { tooOld: true };
  }
  
  return null;
}

function phoneNumberValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (!value) return null;
  
  const regex = /^[0-9]{8}$/;
  if (!regex.test(value)) {
    return { invalidPhone: true };
  }
  return null;
}

function nomMagasinValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (!value) return null;
  
  const regex = /^[a-zA-Z0-9]+$/;
  if (!regex.test(value)) {
    return { nomMagasinInvalid: true };
  }
  return null;
}


interface ApiResponse<T> {
  data: T;
  message: string;
  resultCode: number;
  errors?: string[];
  isSuccess?: boolean;
  
}
registerLocaleData(localeFr);

@Component({
  selector: 'app-profile',
  standalone: true,
    providers: [
    { provide: LOCALE_ID, useValue: 'fr' }  // Définir la locale par défaut
  ],
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
  globalSuccessMessage: string = '';
private globalSuccessTimeout: any;
originalFormValues: any = {};
  formChanged = false;

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
    private userService: UserService,
        private otpService: OtpService
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
  get passwordStrength(): 'weak' | 'medium' | 'strong' {
    const password = this.passwordForm.get('newPassword')?.value;
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
    // Pour Technicien et Admin
    nom: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(30)]],
    prenom: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(30)]],
    email: ['', [Validators.required, Validators.email]],
    phoneNumber: ['', [phoneNumberValidator]],
    birthDate: ['', [birthDateValidator]],
    
    // Pour Commercant uniquement
    adresse: [''],
    nomMagasin: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(30), nomMagasinValidator]]
  });
  
  // Mettre à jour les validations en fonction du rôle
  this.updateValidationsForRole();

  this.passwordForm = this.fb.group({
    currentPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]]
  }, { validators: this.passwordMatchValidator });
}

private updateValidationsForRole(): void {
  const nomControl = this.editForm.get('nom');
  const prenomControl = this.editForm.get('prenom');
  const nomMagasinControl = this.editForm.get('nomMagasin');
  
  if (this.user?.role === 'Commercant') {
    // Pour commerçant : nomMagasin requis, nom/prenom pas requis
    nomControl?.clearValidators();
    prenomControl?.clearValidators();
    nomMagasinControl?.setValidators([Validators.required, Validators.minLength(3), Validators.maxLength(30), nomMagasinValidator]);
  } else {
    // Pour technicien/admin : nom/prenom requis
    nomControl?.setValidators([Validators.required, Validators.minLength(3), Validators.maxLength(30)]);
    prenomControl?.setValidators([Validators.required, Validators.minLength(3), Validators.maxLength(30)]);
    nomMagasinControl?.clearValidators();
  }
  
  nomControl?.updateValueAndValidity();
  prenomControl?.updateValueAndValidity();
  nomMagasinControl?.updateValueAndValidity();
}

  passwordMatchValidator(group: FormGroup): { [key: string]: boolean } | null {
    const newPassword = group.get('newPassword')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    return newPassword && confirmPassword && newPassword !== confirmPassword 
      ? { mismatch: true } 
      : null;
  }

openInfoModal(): void {
    this.updateValidationsForRole();
    this.imagePreview = this.user.image || null;
    this.imageBase64 = null;
    this.selectedImage = null;  // ✅ S'assurer que c'est null
    this.isInfoModalOpen = true;
    // ✅ Réinitialiser formChanged
    this.formChanged = false;
    

    let formattedBirthDate = null;
    if (this.user.birthDate) {
      const date = new Date(this.user.birthDate);
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        formattedBirthDate = `${year}-${month}-${day}`;
      }
    }
    
    const patchValues: any = {
      email: this.user.email,
      phoneNumber: this.user.phoneNumber,
      birthDate: formattedBirthDate
    };
    
    if (this.user.role === 'Commercant') {
      patchValues.nomMagasin = this.user.nom;
      patchValues.adresse = this.user.adresse || '';
      patchValues.nom = this.user.nom;
      patchValues.prenom = this.user.prenom || '';
    } else {
      patchValues.nom = this.user.nom;
      patchValues.prenom = this.user.prenom;
      patchValues.adresse = this.user.adresse || '';
    }
    
    this.editForm.patchValue(patchValues);
    
    // ✅ Stocker les valeurs originales
    this.originalFormValues = { ...patchValues };
    this.formChanged = false;
    
    // ✅ Écouter les changements du formulaire
    this.editForm.valueChanges.subscribe(() => {
      this.checkFormChanges();
    });
    
    this.imagePreview = this.user.image || null;
    this.imageBase64 = null;
    this.selectedImage = null;
    this.isInfoModalOpen = true;
    
    this.mapReady = false;
    setTimeout(() => {
      this.mapReady = true;
    }, 300);
  }

checkFormChanges(): void {
    const currentValues = this.editForm.value;
    // Comparer les valeurs (exclure les champs vides/null)
    const originalCleaned = this.cleanFormValues(this.originalFormValues);
    const currentCleaned = this.cleanFormValues(currentValues);
    let formChanged = JSON.stringify(currentCleaned) !== JSON.stringify(originalCleaned);
    
    // ✅ Vérifier aussi si une nouvelle image a été sélectionnée
    const imageChanged = this.selectedImage !== null || this.imageBase64 !== null;
    
    this.formChanged = formChanged || imageChanged;
    
    console.log('formChanged:', this.formChanged, 'formChanged:', formChanged, 'imageChanged:', imageChanged);
}

  // Nettoyer les valeurs null/undefined pour la comparaison
  cleanFormValues(values: any): any {
    const cleaned: any = {};
    Object.keys(values).forEach(key => {
      if (values[key] !== null && values[key] !== undefined && values[key] !== '') {
        cleaned[key] = values[key];
      }
    });
    return cleaned;
  }

  isSubmitDisabled(): boolean {
    return this.editForm.invalid || this.saving || !this.formChanged;
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
        console.log('✅ Image convertie en base64, longueur:', this.imageBase64.length);
        
        // ✅ Forcer la vérification du changement
        this.formChanged = true;
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

// Dans profile.component.ts, modifiez les méthodes saveInfo et changePassword

// profile.component.ts - Remplacez la méthode saveInfo entièrement

saveInfo(): void {
  console.log('========== DÉBUT SAVE INFO ==========');
  console.log('Rôle utilisateur:', this.user.role);
  console.log('Valeurs du formulaire:', this.editForm.value);
  
  if (this.editForm.invalid) {
    Object.keys(this.editForm.controls).forEach(key => {
      this.editForm.get(key)?.markAsTouched();
    });
    return;
  }

  this.saving = true;
  const formValue = this.editForm.value;
  
  let payload: any = {};
  let serviceCall: Observable<ApiResponse<User>>;
  
  if (this.user.role === 'Technicien') {
    payload = {
      nom: formValue.nom,
      prenom: formValue.prenom,
      phoneNumber: formValue.phoneNumber || null,
      birthDate: formValue.birthDate || null,
      email: formValue.email
    };
    if (this.imageBase64) payload.image = this.imageBase64;
    serviceCall = this.userService.updateTechnicienProfile(payload);
    
  } else if (this.user.role === 'Commercant') {
    payload = {
      nomMagasin: formValue.nomMagasin,
      phoneNumber: formValue.phoneNumber || null,
      adresse: formValue.adresse || null,
      email: formValue.email
    };
    if (this.imageBase64) payload.image = this.imageBase64;
    serviceCall = this.userService.updateCommercantProfile(payload);
    
  } else { // Admin
    payload = {
      nom: formValue.nom,
      prenom: formValue.prenom,
      phoneNumber: formValue.phoneNumber || null,
      email: formValue.email,
      birthDate: formValue.birthDate || null
    };
    if (this.imageBase64) payload.image = this.imageBase64;
    serviceCall = this.userService.updateMyProfile(payload);
  }
  
  console.log('📤 Payload envoyé:', payload);
  
  serviceCall.subscribe({
    next: (response: any) => {
      this.saving = false;
      // ✅ Log complet de la réponse
      console.log('📥 Réponse API (type):', typeof response);
      console.log('📥 Réponse API (contenu):', response);
      console.log('📥 Réponse API (JSON string):', JSON.stringify(response, null, 2));
      
      // ✅ Vérifier si la réponse est un succès
      // Cas 1: La réponse contient directement l'utilisateur (pas de wrapper)
      if (response && (response.id || response.email) && !response.resultCode) {
        console.log('✅ Cas 1: Succès - réponse directe');
        this.showGlobalSuccess('Profil mis à jour avec succès');
        this.user = { ...this.user, ...response };
        this.closeInfoModal();
        return;
      }
      
      // Cas 2: La réponse a un champ isSuccess ou success
      if (response && (response.isSuccess === true || response.success === true)) {
        console.log('✅ Cas 2: Succès - isSuccess/success = true');
        this.showGlobalSuccess(response.message || 'Profil mis à jour avec succès');
        if (response.data) {
          this.user = { ...this.user, ...response.data };
        }
        this.closeInfoModal();
        return;
      }
      
      // Cas 3: resultCode === 0
      if (response && response.resultCode === 0) {
        console.log('✅ Cas 3: Succès - resultCode = 0');
        this.showGlobalSuccess(response.message || 'Profil mis à jour avec succès');
        if (response.data) {
          this.user = { ...this.user, ...response.data };
        }
        this.closeInfoModal();
        return;
      }
      
      // Cas OTP email
      if (response && response.resultCode === 42) {
        console.log('🔐 Cas OTP Email');
        this.pendingEmailChange = formValue.email;
        this.otpPurpose = 'email';
        this.showOtpModal = true;
        this.closeInfoModal();
        this.showAlert('info', 'Vérification requise', response.message || `Un code OTP a été envoyé à ${formValue.email}`);
        return;
      }
      
      // Cas OTP password
      if (response && response.resultCode === 43) {
        console.log('🔐 Cas OTP Password');
        this.otpPurpose = 'password';
        this.showOtpModal = true;
        this.closeInfoModal();
        this.showAlert('info', 'Vérification requise', response.message || `Un code OTP a été envoyé à ${this.user.email}`);
        return;
      }
      
      // Si on arrive ici, c'est une erreur
      console.error('❌ Échec de la mise à jour - Réponse non reconnue');
      this.showAlert('error', 'Erreur', response?.message || response?.error || 'Erreur lors de la mise à jour');
    },
    error: (err: any) => {
      console.error('❌ Erreur HTTP:', err);
      this.saving = false;
      
      let errorMessage = 'Erreur lors de la mise à jour';
      if (err.error?.message) {
        errorMessage = err.error.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      this.showAlert('error', 'Erreur de mise à jour', errorMessage);
    }
  });
}

private showGlobalSuccess(message: string): void {
  this.globalSuccessMessage = message;
  
  // Efface automatiquement après 5 secondes
  if (this.globalSuccessTimeout) {
    clearTimeout(this.globalSuccessTimeout);
  }
  this.globalSuccessTimeout = setTimeout(() => {
    this.globalSuccessMessage = '';
  }, 5000);
}
changePassword(): void {
  console.log('========== DÉBUT CHANGE PASSWORD ==========');
  console.log('Rôle utilisateur:', this.user.role);
  console.log('Email utilisateur:', this.user.email);
  
  if (this.passwordForm.invalid) {
    const errors = [];
    if (this.passwordForm.get('currentPassword')?.errors) errors.push('Mot de passe actuel requis');
    if (this.passwordForm.get('newPassword')?.errors) errors.push('Nouveau mot de passe invalide');
    if (this.passwordForm.get('confirmPassword')?.errors) errors.push('Confirmation requise');
    if (this.passwordForm.hasError('mismatch')) errors.push('Les mots de passe ne correspondent pas');
    
    console.error('❌ Formulaire invalide:', errors);
    
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
  
  // ✅ Fonction utilitaire pour formater la date
  const formatBirthDate = (birthDate: string | Date | undefined): string | null => {
    if (!birthDate) return null;
    try {
      let date: Date;
      if (typeof birthDate === 'string') {
        date = new Date(birthDate);
      } else {
        date = birthDate;
      }
      if (isNaN(date.getTime())) return null;
      return date.toISOString().split('T')[0];
    } catch (e) {
      console.warn('Erreur formatage date:', e);
      return null;
    }
  };
  
  // ✅ Construire le payload COMPLET selon le rôle
  let payload: any = {};
  
  if (this.user.role === 'Technicien') {
    payload = {
      // Champs obligatoires pour Technicien
      nom: this.user.nom,
      prenom: this.user.prenom,
      email: this.user.email,
      phoneNumber: this.user.phoneNumber || '',
      birthDate: formatBirthDate(this.user.birthDate),
      // Champs pour changement de mot de passe
      currentPassword: this.passwordForm.value.currentPassword,
      newPassword: this.passwordForm.value.newPassword,
      confirmPassword: this.passwordForm.value.confirmPassword
    };
    console.log('📦 Payload Technicien avec changement mot de passe');
    
  } else if (this.user.role === 'Commercant') {
    payload = {
      // Champs obligatoires pour Commercant
      nomMagasin: this.user.nom,
      email: this.user.email,
      phoneNumber: this.user.phoneNumber || '',
      adresse: this.user.adresse || '',
      // Champs pour changement de mot de passe
      currentPassword: this.passwordForm.value.currentPassword,
      newPassword: this.passwordForm.value.newPassword,
      confirmPassword: this.passwordForm.value.confirmPassword
    };
    console.log('📦 Payload Commercant avec changement mot de passe:', {
      nomMagasin: payload.nomMagasin,
      email: payload.email,
      phoneNumber: payload.phoneNumber,
      adresse: payload.adresse ? 'present' : 'absent'
    });
    
  } else {
    payload = {
      // Champs obligatoires pour Admin
      userName: this.user.nom,
      nom: this.user.nom,
      prenom: this.user.prenom,
      email: this.user.email,
      phoneNumber: this.user.phoneNumber || '',
      birthDate: formatBirthDate(this.user.birthDate),
      // Champs pour changement de mot de passe
      currentPassword: this.passwordForm.value.currentPassword,
      newPassword: this.passwordForm.value.newPassword,
      confirmPassword: this.passwordForm.value.confirmPassword
    };
    console.log('📦 Payload Admin avec changement mot de passe');
  }
  
  console.log('📤 Payload complet:', {
    ...payload,
    currentPassword: '***',
    newPassword: '***',
    confirmPassword: '***'
  });

  let serviceCall;
  if (this.user.role === 'Technicien') {
    serviceCall = this.userService.updateTechnicienProfile(payload);
  } else if (this.user.role === 'Commercant') {
    serviceCall = this.userService.updateCommercantProfile(payload);
  } else {
    serviceCall = this.userService.updateMyProfile(payload);
  }

  console.log('🔄 Appel API en cours...');
  serviceCall.subscribe({
    next: (response: ApiResponse<User>) => {
      console.log('✅ Réponse API reçue:', {
        resultCode: response.resultCode,
        message: response.message,
        hasData: !!response.data
      });
      
      this.changingPassword = false;
      
      if (response.resultCode === 43) {
        console.log('🔐 Cas: OTP envoyé pour confirmation vers:', this.user.email);
        this.pendingPasswordChange = this.passwordForm.value.newPassword;
        this.otpPurpose = 'password';
        this.showOtpModal = true;
        this.closePasswordModal();
        this.showAlert('info', 'Vérification requise', response.message || `Un code OTP a été envoyé à ${this.user.email}`);
      } 
      else if (response.resultCode === 0) {
        console.log('✅ Cas: Mot de passe changé avec succès');
        this.closePasswordModal();
        this.showAlert('success', 'Mot de passe modifié', response.message || 'Votre mot de passe a été changé avec succès');
        this.loadProfile();
      }
      else {
        console.error('❌ Cas: Erreur serveur - Code:', response.resultCode);
        this.showAlert('error', 'Erreur', response.message || 'Erreur lors du changement de mot de passe');
      }
      console.log('========== FIN CHANGE PASSWORD ==========');
    },
    error: (err) => {
      console.error('❌ ERREUR HTTP:', {
        status: err.status,
        statusText: err.statusText,
        message: err.message,
        error: err.error
      });
      
      this.changingPassword = false;
      let errorMessage = 'Erreur lors du changement de mot de passe';
      
      if (err.error?.errors) {
        // Afficher les erreurs de validation
        const validationErrors = Object.values(err.error.errors).flat();
        errorMessage = validationErrors.join(', ');
        console.log('Erreurs de validation:', validationErrors);
      } else if (err.error?.message) {
        errorMessage = err.error.message;
        console.log('Message d\'erreur serveur:', errorMessage);
        if (errorMessage.includes('incorrect')) {
          errorMessage = 'Le mot de passe actuel est incorrect';
        }
      }
      
      this.showAlert('error', 'Erreur', errorMessage);
      console.log('========== FIN CHANGE PASSWORD (ERREUR) ==========');
    }
  });
}
confirmWithOtp(): void {
  console.log('========== DÉBUT CONFIRM OTP ==========');
  console.log('Purpose:', this.otpPurpose);
  console.log('OTP Code saisi:', this.otpCode);
  console.log('Pending Email:', this.pendingEmailChange);
  console.log('Pending Password:', this.pendingPasswordChange ? '***' : 'null');
  
  if (this.otpPurpose === 'email') {
    this.otpService.confirmEmailChange(this.pendingEmailChange, this.otpCode).subscribe({
      next: (response) => {
        this.otpLoading = false;
        if (response.resultCode === 0) {
          console.log('✅ Email changé avec succès');
          this.showOtpModal = false;
          
          // ✅ AFFICHER LE MESSAGE DE SUCCÈS EN DEHORS DU MODAL
          this.showGlobalSuccess(response.message || 'Email modifié avec succès');
          
          this.user.email = this.pendingEmailChange;
          this.loadProfile();
        } else {
          // ✅ Les erreurs restent DANS le modal OTP
          this.showAlert('error', 'Erreur', response.message || 'Code OTP invalide');
        }
      },
      error: (err) => {
        this.otpLoading = false;
        // ✅ Les erreurs restent DANS le modal OTP
        this.showAlert('error', 'Erreur', err.error?.message || 'Erreur lors de la confirmation');
      }
    });
  } else {
    this.otpService.confirmPasswordChange(this.pendingPasswordChange, this.otpCode).subscribe({
      next: (response) => {
        this.otpLoading = false;
        if (response.resultCode === 0) {
          console.log('✅ Mot de passe changé avec succès');
          this.showOtpModal = false;
          
          // ✅ AFFICHER LE MESSAGE DE SUCCÈS EN DEHORS DU MODAL
          this.showGlobalSuccess(response.message || 'Mot de passe modifié avec succès');
          
          this.passwordForm.reset();
          this.loadProfile();
        } else {
          // ✅ Les erreurs restent DANS le modal OTP
          this.showAlert('error', 'Erreur', response.message || 'Code OTP invalide');
        }
      },
      error: (err) => {
        this.otpLoading = false;
        // ✅ Les erreurs restent DANS le modal OTP
        this.showAlert('error', 'Erreur', err.error?.message || 'Erreur lors de la confirmation');
      }
    });
  }
}

closeInfoModal(): void {
  this.isInfoModalOpen = false;
  this.mapReady = false;  // ✅ Réinitialiser quand on ferme
  this.clearAlert();
}



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
// profile.component.ts - Modifiez showAlert

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
  
  // ✅ Pour les erreurs, ne pas fermer automatiquement trop vite
  if (variant === 'success') {
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

  ngOnDestroy(): void {
  if (this.globalSuccessTimeout) {
    clearTimeout(this.globalSuccessTimeout);
  }
}
// profile.component.ts - Ajoutez cette méthode

// profile.component.ts - Remplacez la méthode scrollToAlertInModal par celle-ci

// profile.component.ts - Version qui scroll au début du contenu

private scrollToAlertInModal(): void {
  setTimeout(() => {
    const modalContainer = document.querySelector('.overflow-y-auto.max-h-\\[90vh\\], .rounded-3xl.overflow-y-auto');
    
    if (modalContainer) {
      // ✅ Scroller directement en haut du conteneur
      modalContainer.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
    
    // Ensuite, s'assurer que l'alerte est visible
    const alertElement = document.getElementById('modal-alert');
    if (alertElement) {
      alertElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start',
        inline: 'nearest'
      });
    }
  }, 250);
}
  showOtpModal = false;
otpPurpose: 'email' | 'password' = 'email';
pendingEmailChange: string = '';
pendingPasswordChange: string = '';
otpCode: string = '';
otpLoading = false;
}