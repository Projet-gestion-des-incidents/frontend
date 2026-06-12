import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LabelComponent } from '../../components/form/label/label.component';
import { InputFieldComponent } from '../../components/form/input/input-field.component';
import { AlertComponent } from '../../components/ui/alert/alert.component';
import { UserService } from '../../services/user.service';
import { MapComponent } from '../../../google-maps-wrapper/map.component';


function usernameValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (!value) return null;
  
  const regex = /^[a-zA-Z0-9]+$/;
  if (!regex.test(value)) {
    return { usernameInvalid: true };
  }
  return null;
}
@Component({
  selector: 'app-create-commercant',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LabelComponent,
    InputFieldComponent,
    AlertComponent,
    MapComponent
  ],
  templateUrl: './create-commercant.component.html'
})
export class CreateCommercantComponent {
    mapAlert = {
    show: false,
    message: ''
  };
  commercantForm: FormGroup;
  loading = false;
  selectedAddress: string = '';

  alert = {
    show: false,
    variant: 'error' as 'error' | 'success',
    title: '',
    message: '',
    details: [] as string[]
  };

  // Modale carte
  showMapModal: boolean = false;
  tempSelectedAddress: string = '';
  tempSelectedLat: number | null = null;
  tempSelectedLng: number | null = null;
  selectedAddressValid: boolean = true;
  private alertTimeout: any;

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private router: Router
  ) {
    this.commercantForm = this.fb.group({
      nomMagasin: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(20),usernameValidator]], // ✅ Changé de 50 à 20
      adresse: ['', [Validators.required, Validators.maxLength(200)]],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^[0-9]{8}$/)]],
    });
  }

  ngOnInit(): void {
  }

  onLocationSelected(location: any): void {
    if (location && location.address) {
      this.commercantForm.patchValue({ adresse: location.address });
      console.log('Adresse sélectionnée:', location.address);
    }
  }
onInvalidLocation(message: string): void {
  this.mapAlert = {
    show: true,
    message: message
  };
  
  setTimeout(() => {
    this.mapAlert.show = false;
  }, 5000);
}
 openMapModal(): void {
  this.showMapModal = true;
  this.tempSelectedAddress = this.commercantForm.get('adresse')?.value || '';
  this.selectedAddressValid = true;
  this.mapAlert.show = false; //  Réinitialiser l'alerte de la modale
}

private isLocationInTunisia(location: any): boolean {
  // Coordonnées approximatives de la Tunisie
  const tunisiaBounds = {
    latMin: 30.0,
    latMax: 38.0,
    lngMin: 7.5,
    lngMax: 11.5
  };
  
  const lat = location.lat;
  const lng = location.lng;
  
  return lat >= tunisiaBounds.latMin && 
         lat <= tunisiaBounds.latMax && 
         lng >= tunisiaBounds.lngMin && 
         lng <= tunisiaBounds.lngMax;
}
closeMapModal(): void {
  this.showMapModal = false;
  this.tempSelectedAddress = '';
  this.tempSelectedLat = null;
  this.tempSelectedLng = null;
  this.mapAlert.show = false; //  Réinitialiser l'alerte de la modale
}
onLocationSelectedInModal(location: any): void {
  
  if (location && location.address) {
    const isTunisia = this.isLocationInTunisia(location);
    
    if (!isTunisia) {
      this.mapAlert = {
        show: true,
        message: 'Veuillez sélectionner un emplacement en Tunisie'
      };
      this.tempSelectedAddress = '';
      this.selectedAddressValid = false;
      // Auto-hide après 4 secondes
      setTimeout(() => {
        this.mapAlert.show = false;
      }, 5000);
      return;
    }
    
    this.mapAlert.show = false;
    this.tempSelectedAddress = location.address;
    this.tempSelectedLat = location.lat;
    this.tempSelectedLng = location.lng;
    this.selectedAddressValid = true;
    console.log('Adresse sélectionnée dans modale:', location.address);
  }
}
  confirmAddress(): void {
  if (this.tempSelectedAddress && this.selectedAddressValid) {
    this.commercantForm.patchValue({ adresse: this.tempSelectedAddress });
    this.commercantForm.get('adresse')?.markAsTouched();
    this.showMapModal = false;
    this.clearAlert(); //  Effacer l'alerte après confirmation
  }
}

  // parser les erreurs de validation du backend
  private parseValidationErrors(error: any): string[] {
    const errors: string[] = [];
    
    // Cas 1: Structure avec "errors" (validation ASP.NET)
    if (error.error?.errors) {
      const validationErrors = error.error.errors;
      for (const field in validationErrors) {
        if (validationErrors.hasOwnProperty(field)) {
          const fieldErrors = validationErrors[field];
          if (Array.isArray(fieldErrors)) {
            fieldErrors.forEach((msg: string) => {
              errors.push(this.formatFieldError(field, msg));
            });
          } else if (typeof fieldErrors === 'string') {
            errors.push(this.formatFieldError(field, fieldErrors));
          }
        }
      }
    }
    
    // Cas 2: Message d'erreur simple
    else if (error.error?.message) {
      errors.push(error.error.message);
    }
    
    // Cas 3: Message d'erreur générique
    else if (error.message) {
      errors.push(error.message);
    }
    
    return errors;
  }

  /** Formate le nom du champ pour un affichage plus lisible */
  private formatFieldError(field: string, message: string): string {
    const fieldNames: { [key: string]: string } = {
      'NomMagasin': 'Nom du magasin',
      'nomMagasin': 'Nom du magasin',
      'Adresse': 'Adresse',
      'adresse': 'Adresse',
      'Email': 'Email',
      'email': 'Email',
      'PhoneNumber': 'Numéro de téléphone',
      'phoneNumber': 'Numéro de téléphone'
    };
    
    const displayName = fieldNames[field] || field;
    return `${displayName} : ${message}`;
  }

  onSubmit(): void {
    // Validation du formulaire
    if (this.commercantForm.invalid) {
      this.commercantForm.markAllAsTouched();
      
      const errors = [];
      if (this.commercantForm.get('nomMagasin')?.invalid) errors.push('Nom de boutique invalide (3-20 caractères)');
      if (this.commercantForm.get('adresse')?.invalid) errors.push('Adresse invalide');
      if (this.commercantForm.get('email')?.invalid) errors.push('Email invalide');
      if (this.commercantForm.get('phoneNumber')?.invalid) errors.push('Téléphone invalide (8 chiffres)');
      
      if (errors.length > 0) {
        this.showError('Veuillez corriger les erreurs', errors);
      }
      return;
    }

    this.loading = true;
    this.clearAlert();

    const formData = this.commercantForm.value;

    this.userService.createCommercant({
      nomMagasin: formData.nomMagasin,
      adresse: formData.adresse,
      email: formData.email,
      phoneNumber: formData.phoneNumber
    }).subscribe({
      next: (res: any) => {
        this.loading = false;
        
        if (res.resultCode !== 0) {
          this.showError(res.message || 'Erreur lors de la création du commerçant');
          return;
        }
        console.log(' Commerçant créé avec succès:', res.data);
        this.showSuccess(res.message || 'Commerçant créé avec succès');
        
        setTimeout(() => {
          this.router.navigate(['/commercants']);
        }, 5000);
      },
      error: (err: any) => {
        this.loading = false;
        
        //  Analyser les erreurs de validation
        const validationErrors = this.parseValidationErrors(err);
        
        if (validationErrors.length > 0) {
          // Afficher les erreurs détaillées
          this.showError('Erreur de validation', validationErrors);
        } else {
          // Message d'erreur générique
          const errorMessage = err.error?.message || err.message || 'Erreur serveur';
          this.showError(errorMessage);
        }
        
        console.error(' Erreur création commerçant:', err);
      }
    });
  }

  /**  Affiche un message de succès  */
  private showSuccess(message: string) {
    this.alert = { 
      show: true, 
      variant: 'success', 
      title: 'Succès', 
      message,
      details: []
    };
    this.autoHideAlert();
  }

  /** Affiche un message d'erreur  */
  private showError(message: string, details: string[] = []) {
    this.alert = { 
      show: true, 
      variant: 'error', 
      title: 'Erreur', 
      message,
      details
    };
    this.autoHideAlert();
  }

  private autoHideAlert() {
    if (this.alertTimeout) {
      clearTimeout(this.alertTimeout);
    }
    this.alertTimeout = setTimeout(() => {
      this.clearAlert();
    }, 5000);
  }

  clearAlert() { 
    this.alert.show = false;
    this.alert.details = [];
    if (this.alertTimeout) {
      clearTimeout(this.alertTimeout);
      this.alertTimeout = null;
    }
  }
  
  cancel() { 
    this.router.navigate(['/commercants']); 
  }
}