import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { UserService } from '../../../services/user.service';
import { AuthService } from '../../../services/auth.service';
import { MapComponent } from '../../../../google-maps-wrapper/map.component';

function usernameValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (!value) return null;
  
  const regex = /^[a-zA-Z0-9]+$/;
  if (!regex.test(value)) {
    return { usernameInvalid: true };
  }
  return null;
}

interface Alert {
  show: boolean;
  title: string;
  message: string;
  variant: 'error' | 'success' | 'warning' | 'info';
}

@Component({
  selector: 'app-update-commercant',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MapComponent],
  templateUrl: './update-commercant.component.html',
  styleUrls: ['./update-commercant.component.css']
})
export class UpdateCommercantComponent implements OnInit {
  commercantForm: FormGroup;
  loading = false;
  isAdmin = false;
  commercantId: string | null = null;
  originalFormValues: any = {};
  formChanged = false;
  // Alert
  alert: Alert = {
    show: false,
    title: '',
    message: '',
    variant: 'info'
  };
  mapAlert = {
    show: false,
    message: ''
  };
  
  // Map modal
  showMapModal = false;
  tempSelectedAddress: string | null = null;
  mapReady = true;

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.commercantForm = this.fb.group({
      nomMagasin: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(20),usernameValidator]],
      adresse: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', [Validators.required, Validators.pattern('^[0-9]{8}$')]],
      statut: ['Actif']
    });
  }

  ngOnInit(): void {
    // Vérifier si l'utilisateur est admin
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
      const user = JSON.parse(userStr);
      this.isAdmin = user.role === 'Admin';
    }
    
    // Récupérer l'ID du commerçant depuis la route
    this.commercantId = this.route.snapshot.paramMap.get('id');
    if (this.commercantId) {
      this.loadCommercantData();
    } else {
      this.showAlert('error', 'Erreur', 'ID du commerçant non trouvé');
    }
  }

 loadCommercantData(): void {
    this.loading = true;
    console.log(' Chargement du commerçant ID:', this.commercantId);
    
    this.userService.getCommercantById(this.commercantId!).subscribe({
      next: (commercant) => {
        console.log(' Commerçant trouvé:', commercant);
        
        if (commercant) {
          const formValues = {
            nomMagasin: commercant.nomMagasin || '',
            adresse: commercant.adresse || '',
            email: commercant.email || '',
            phoneNumber: commercant.phoneNumber || '',
            statut: commercant.statut || 'Actif'
          };
          
          this.commercantForm.patchValue(formValues);
          
          //  Stocker les valeurs originales
          this.originalFormValues = { ...formValues };
          
          //  Écouter les changements du formulaire
          this.commercantForm.valueChanges.subscribe(() => {
            this.checkFormChanges();
          });
          
          console.log(' Formulaire après patch:', this.commercantForm.value);
        } else {
          this.showAlert('error', 'Erreur', 'Commerçant non trouvé');
        }
        this.loading = false;
      },
      error: (error) => {
        console.error(' Erreur chargement:', error);
        const errorMessage = error.error?.message || error.message || 'Impossible de charger les données du commerçant';
        this.showAlert('error', 'Erreur', errorMessage);
        this.loading = false;
      }
    });
  }

checkFormChanges(): void {
    const currentValues = this.commercantForm.value;
    this.formChanged = JSON.stringify(currentValues) !== JSON.stringify(this.originalFormValues);
  }

  isSubmitDisabled(): boolean {
    return this.commercantForm.invalid || this.loading || !this.formChanged;
  }
  onSubmit(): void {
    if (this.commercantForm.invalid) {
      Object.keys(this.commercantForm.controls).forEach(key => {
        this.commercantForm.get(key)?.markAsTouched();
      });
      this.showAlert('error', 'Formulaire invalide', 'Veuillez corriger les erreurs');
      return;
    }

    this.loading = true;
    
    const updateData = {
      nomMagasin: this.commercantForm.get('nomMagasin')?.value,
      adresse: this.commercantForm.get('adresse')?.value,
      email: this.commercantForm.get('email')?.value,
      phoneNumber: this.commercantForm.get('phoneNumber')?.value
    };

    this.userService.adminUpdateCommercant(this.commercantId!, updateData).subscribe({
      next: (response) => {
        this.showAlert('success', 'Succès', 'Commerçant mis à jour avec succès');
        setTimeout(() => {
          this.router.navigate(['/commercants']);
        }, 5000);
      },
      error: (error) => {
        console.error('Erreur mise à jour:', error);
        const errorMessage = error.error?.message || 'Erreur lors de la mise à jour';
        this.showAlert('error', 'Erreur', errorMessage);
        this.loading = false;
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/commercants']);
  }

  clearAlert(): void {
    this.alert.show = false;
  }

  private showAlert(variant: 'error' | 'success' | 'warning' | 'info', title: string, message: string): void {
    this.alert = {
      show: true,
      title,
      message,
      variant
    };
    
    setTimeout(() => {
      if (this.alert.show) {
        this.clearAlert();
      }
    }, 5000);
  }

  // Map modal methods
openMapModal(): void {
    this.showMapModal = true;
    this.tempSelectedAddress = this.commercantForm.get('adresse')?.value;
    this.mapAlert.show = false; // Réinitialiser l'alerte
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

  closeMapModal(): void {
    this.showMapModal = false;
    this.tempSelectedAddress = null;
    this.mapAlert.show = false;
  }

  onLocationSelectedInModal(location: any): void {
    if (location && location.address) {
      // Vérifier si l'adresse est en Tunisie via les coordonnées
      const isTunisia = this.isLocationInTunisia(location);
      
      if (!isTunisia) {
        this.mapAlert = {
          show: true,
          message: 'Veuillez sélectionner un emplacement en Tunisie'
        };
        this.tempSelectedAddress = null;
        
        setTimeout(() => {
          this.mapAlert.show = false;
        }, 5000);
        return;
      }
      
      this.tempSelectedAddress = location.address;
      this.mapAlert.show = false;
    } else if (location && location.lat && location.lng) {
      this.tempSelectedAddress = `${location.lat}, ${location.lng}`;
    } else {
      this.tempSelectedAddress = location;
    }
  }

  private isLocationInTunisia(location: any): boolean {
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

 confirmAddress(): void {
    if (this.tempSelectedAddress) {
      this.commercantForm.patchValue({ adresse: this.tempSelectedAddress });
      this.commercantForm.get('adresse')?.markAsTouched();
      this.closeMapModal();
    }
  }
}