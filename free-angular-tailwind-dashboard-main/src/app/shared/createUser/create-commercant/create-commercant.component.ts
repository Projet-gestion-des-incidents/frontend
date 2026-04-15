import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LabelComponent } from '../../components/form/label/label.component';
import { InputFieldComponent } from '../../components/form/input/input-field.component';
import { AlertComponent } from '../../components/ui/alert/alert.component';
import { UserService } from '../../services/user.service';
import { MapComponent } from '../../../google-maps-wrapper/map.component';

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
  commercantForm: FormGroup;
  loading = false;
  selectedAddress: string = '';

  alert = {
    show: false,
    variant: 'error' as 'error' | 'success',
    title: '',
    message: ''
  };

  // Modale carte
  showMapModal: boolean = false;
  tempSelectedAddress: string = '';
  tempSelectedLat: number | null = null;
  tempSelectedLng: number | null = null;
  
  private alertTimeout: any;

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private router: Router
  ) {
    this.commercantForm = this.fb.group({
      nomMagasin: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
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

  openMapModal(): void {
    this.showMapModal = true;
    this.tempSelectedAddress = this.commercantForm.get('adresse')?.value || '';
  }

  closeMapModal(): void {
    this.showMapModal = false;
    this.tempSelectedAddress = '';
    this.tempSelectedLat = null;
    this.tempSelectedLng = null;
  }

  onLocationSelectedInModal(location: any): void {
    if (location && location.address) {
      this.tempSelectedAddress = location.address;
      this.tempSelectedLat = location.lat;
      this.tempSelectedLng = location.lng;
      console.log('Adresse sélectionnée dans modale:', location.address);
    }
  }

  confirmAddress(): void {
    if (this.tempSelectedAddress) {
      this.commercantForm.patchValue({ adresse: this.tempSelectedAddress });
      this.showMapModal = false;
    }
  }

  onSubmit(): void {
    // Validation du formulaire
    if (this.commercantForm.invalid) {
      this.commercantForm.markAllAsTouched();
      
      const errors = [];
      if (this.commercantForm.get('nomMagasin')?.invalid) errors.push('Nom de boutique invalide');
      if (this.commercantForm.get('adresse')?.invalid) errors.push('Adresse invalide');
      if (this.commercantForm.get('email')?.invalid) errors.push('Email invalide');
      if (this.commercantForm.get('phoneNumber')?.invalid) errors.push('Téléphone invalide');
      
      if (errors.length > 0) {
        this.showError('Veuillez corriger les erreurs: ' + errors.join(', '));
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
        // ✅ IMPORTANT: Arrêter le loading dans TOUS les cas
        this.loading = false;
        
        if (res.resultCode !== 0) {
          this.showError(res.message || 'Erreur lors de la création du commerçant');
          return;
        }

        // Succès - Afficher le message et rediriger
        console.log('✅ Commerçant créé avec succès:', res.data);
        this.showSuccess(res.message || 'Commerçant créé avec succès');
        
        // Redirection après 2 secondes
        setTimeout(() => {
          this.router.navigate(['/commercants']);
        }, 2000);
      },
      error: (err: any) => {
        // ✅ Arrêter le loading en cas d'erreur
        this.loading = false;
        const errorMessage = err.error?.message || err.message || 'Erreur serveur';
        this.showError(errorMessage);
        console.error('❌ Erreur création commerçant:', err);
      }
    });
  }

  private showSuccess(message: string) {
    this.alert = { show: true, variant: 'success', title: 'Succès', message };
    this.autoHideAlert();
  }

  private showError(message: string) {
    this.alert = { show: true, variant: 'error', title: 'Erreur', message };
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
    if (this.alertTimeout) {
      clearTimeout(this.alertTimeout);
      this.alertTimeout = null;
    }
  }
  
  cancel() { 
    this.router.navigate(['/commercants']); 
  }
}