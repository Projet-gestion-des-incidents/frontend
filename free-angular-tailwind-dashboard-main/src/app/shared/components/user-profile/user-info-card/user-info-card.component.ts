import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ModalService } from '../../../services/modal.service';
import { InputFieldComponent } from '../../form/input/input-field.component';
import { ButtonComponent } from '../../ui/button/button.component';
import { LabelComponent } from '../../form/label/label.component';
import { ModalComponent } from '../../ui/modal/modal.component';
import { CreateUserDto, UserService } from '../../../services/user.service';
import { AbstractControl, FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePickerComponent } from '../../form/date-picker/date-picker.component';
import { FileInputExampleComponent } from '../../form/form-elements/file-input-example/file-input-example.component';
import { CommonModule } from '@angular/common';
import { User } from '../../../models/User.model';
import { AlertComponent } from '../../ui/alert/alert.component';

@Component({
  selector: 'app-user-info-card',
  imports: [
    InputFieldComponent,
    ReactiveFormsModule,
    FileInputExampleComponent,
    ButtonComponent,AlertComponent,
    LabelComponent,FormsModule,
    ModalComponent,
    DatePickerComponent,CommonModule
    
],
  standalone: true,
  templateUrl: './user-info-card.component.html',
  styles: ``
})
export class UserInfoCardComponent {

  @Input() user!: User;
  editForm!: FormGroup;
  isOpen = false;
  selectedImage: File | null = null;
  imagePreview: string | ArrayBuffer | null = null;
  imageBase64: string | null = null; // Envoyer le Base64 propre    loading = false;
  showPassword = false;
  
@Output() userUpdated = new EventEmitter<User>();

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
  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    public modal: ModalService
  ) {}
maxBirthDate: Date = new Date(); // initialisation directe

ngOnInit() {
    this.maxBirthDate = new Date(); // aujourd'hui, pas de dates futures

this.editForm = this.fb.group(
  {
    nom: ['', [Validators.required, Validators.minLength(2)]],
    prenom: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phoneNumber: [''],
    birthDate: ['', [this.adultValidator]], 
    currentPassword: [''], 
    newPassword: [''],     
    confirmPassword: ['']
  },
  { validators: this.passwordMatchValidator }
);

}
onBirthDateChange(event: any) {
  let date: Date | null = null;

  if (event instanceof Date) date = event;
  else if (event?.selectedDates?.[0] instanceof Date) date = event.selectedDates[0];
  else if (event?.dateObj instanceof Date) date = event.dateObj;

  this.editForm.get('birthDate')?.setValue(
    date ? date.toISOString().split('T')[0] : null
  );
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
private adultValidator(control: AbstractControl) {
  const value = control.value;
  if (!value) return null;

  const date = new Date(value);
  if (isNaN(date.getTime())) return { invalidDate: true }; // date invalide

  const today = new Date();
  if (date > today) return { futureDate: true }; // date dans le futur

  const minDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
  return date <= minDate ? null : { underAge: true}; // doit avoir 18 ans
}

openModal() {
  this.editForm.reset(); 

  this.editForm.patchValue({
    nom: this.user.nom ?? '',
    prenom: this.user.prenom ?? '',
    email: this.user.email ?? '',
    phoneNumber: this.user.phoneNumber ?? '',
    birthDate: this.user.birthDate ? new Date(this.user.birthDate).toISOString().split('T')[0] : null,
    password: '',
    confirmPassword: ''
  });

  // image preview existante
  this.imagePreview = this.user.image ?? null;
  this.imageBase64 = null;
  this.selectedImage = null;

  this.isOpen = true;
}

  get password() { return this.editForm.get('password'); }
  get confirmPassword() { return this.editForm.get('confirmPassword'); }

  closeModal() {
    this.isOpen = false;
  }
  private showAlert(variant: 'success' | 'error' | 'info' | 'warning', title: string, message: string, duration = 5000) {
  this.alert = { show: true, variant, title, message };

  setTimeout(() => {
    this.clearAlert();
  }, duration);
}

passwordMatchValidator(form: FormGroup) {
  const n = form.get('newPassword')?.value;
  const c = form.get('confirmPassword')?.value;
  return n && c && n !== c ? { mismatch: true } : null;
}

 togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

private getFormErrorMessage(): string {
  const birthDate = this.editForm.get('birthDate');

  if (birthDate?.hasError('futureDate')) {
    return 'La date de naissance ne peut pas être dans le futur.';
  }

  if (birthDate?.hasError('underAge')) {
    return 'Vous devez avoir au moins 18 ans.';
  }

  if (this.editForm.hasError('mismatch')) {
    return 'Les mots de passe ne correspondent pas.';
  }

  return 'Veuillez corriger les champs obligatoires.';
}

handleSave() {
  this.markFormGroupTouched(this.editForm);
  this.clearAlert();

  if (this.editForm.invalid) {
    this.showError(
      this.getFormErrorMessage(),
      'Formulaire invalide'
    );
    return;
  }

  const formValue = this.editForm.getRawValue(); // getRawValue = inclut email désactivé

  const payload: any = {
    nom: formValue.nom,
    prenom: formValue.prenom,
    email: formValue.email,
    phoneNumber: formValue.phoneNumber,
    birthDate: formValue.birthDate
  };

  // mot de passe seulement s’il est rempli
if (
  formValue.currentPassword &&
  formValue.newPassword &&
  formValue.confirmPassword
) {
  payload.currentPassword = formValue.currentPassword;
  payload.newPassword = formValue.newPassword;
  payload.confirmPassword = formValue.confirmPassword;
}

  // image seulement si modifiée
  if (this.imageBase64) {
    payload.image = this.imageBase64;
  }

  console.log('Payload envoyé:', payload); // 🔍 debug essentiel

  this.userService.updateMyProfile(payload).subscribe({
    next: updated => {
    const mergedUser = { ...this.user, ...updated };

    // EMIT vers le parent
    this.userUpdated.emit(mergedUser);
      this.closeModal();
      this.showSuccess('Profil mis à jour avec succès');
    },
    error: err => {

        this.showError(
          err?.error?.message ||
          err.message ||
          'Erreur serveur, veuillez réessayer.')
    }
  });
}

showSuccess(message: string) {
  this.showAlert('success', 'Succès', message);
}

showError(message: string, title = 'Erreur') {
  this.showAlert('error', title, message);
}

clearError(): void {
  this.clearAlert();
}

clearAlert() {
  this.alert.show = false;
}
   private markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }
}
