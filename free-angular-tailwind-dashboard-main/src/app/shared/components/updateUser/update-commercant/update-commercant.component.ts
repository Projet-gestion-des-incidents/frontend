import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { UserService } from '../../../services/user.service';
import { AuthService } from '../../../services/auth.service';
import { MapComponent } from '../../../../google-maps-wrapper/map.component';

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
  
  // Alert
  alert: Alert = {
    show: false,
    title: '',
    message: '',
    variant: 'info'
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
      nomMagasin: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(20)]],
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
    console.log('🔄 Chargement du commerçant ID:', this.commercantId);
    
    // ✅ Utiliser getCommercantById au lieu de getCommercants
    this.userService.getCommercantById(this.commercantId!).subscribe({
      next: (commercant) => {
        console.log('🎯 Commerçant trouvé:', commercant);
        
        if (commercant) {
          this.commercantForm.patchValue({
            nomMagasin: commercant.nomMagasin || '',
            adresse: commercant.adresse || '',
            email: commercant.email || '',
            phoneNumber: commercant.phoneNumber || '',
            statut: commercant.statut || 'Actif'
          });
          console.log('✅ Formulaire après patch:', this.commercantForm.value);
        } else {
          this.showAlert('error', 'Erreur', 'Commerçant non trouvé');
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('❌ Erreur chargement:', error);
        const errorMessage = error.error?.message || error.message || 'Impossible de charger les données du commerçant';
        this.showAlert('error', 'Erreur', errorMessage);
        this.loading = false;
      }
    });
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
        }, 2000);
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
  }

  closeMapModal(): void {
    this.showMapModal = false;
    this.tempSelectedAddress = null;
  }

  onLocationSelectedInModal(location: any): void {
    if (location && location.address) {
      this.tempSelectedAddress = location.address;
    } else if (location && location.lat && location.lng) {
      this.tempSelectedAddress = `${location.lat}, ${location.lng}`;
    } else {
      this.tempSelectedAddress = location;
    }
  }

  confirmAddress(): void {
    if (this.tempSelectedAddress) {
      this.commercantForm.patchValue({ adresse: this.tempSelectedAddress });
      this.commercantForm.get('adresse')?.markAsTouched();
      this.closeMapModal();
    }
  }
}