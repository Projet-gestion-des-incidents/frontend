import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { UserService } from '../../../services/user.service';

interface Alert {
  show: boolean;
  title: string;
  message: string;
  variant: 'error' | 'success' | 'warning' | 'info';
}

@Component({
  selector: 'app-update-technicien',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './update-technicien.component.html',
  styleUrls: ['./update-technicien.component.css']
})
export class UpdateTechnicienComponent implements OnInit {
  technicienForm: FormGroup;
  loading = false;
  isAdmin = false;
  technicienId: string | null = null;
  private isUpdatingUserName = false; // Pour éviter les boucles infinies
  
  // Alert
  alert: Alert = {
    show: false,
    title: '',
    message: '',
    variant: 'info'
  };

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.technicienForm = this.fb.group({
      userName: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(30)]],
      email: ['', [Validators.required, Validators.email]],
      nom: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(30)]],
      prenom: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(30)]],
      phoneNumber: ['', [Validators.pattern('^[0-9]{8}$')]],
      birthDate: ['', [Validators.required, this.validateAge.bind(this)]]    });

  
  }



  // Stocker le userName original pour référence
  getOriginalUserName(): string {
    // Cette valeur sera définie lors du chargement des données
    
    return (this.technicienForm.get('userName') as any).originalValue || '';
  }

  ngOnInit(): void {
    // Vérifier si l'utilisateur est admin
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
      const user = JSON.parse(userStr);
      this.isAdmin = user.role === 'Admin';
    }
    
    // Récupérer l'ID du technicien depuis la route
    this.technicienId = this.route.snapshot.paramMap.get('id');
    if (this.technicienId) {
      this.loadTechnicienData();
    } else {
      this.showAlert('error', 'Erreur', 'ID du technicien non trouvé');
    }
  }

  // Validation personnalisée pour l'âge (18 ans minimum)
  validateAge(control: any): { [key: string]: boolean } | null {
    if (!control.value) {
      return { required: true };
    }
    
    const birthDate = new Date(control.value);
    const today = new Date();
    
    // Vérifier si la date est dans le futur
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

  loadTechnicienData(): void {
    this.loading = true;
    console.log('🔄 Chargement du technicien ID:', this.technicienId);
    
    this.userService.getTechniciens().subscribe({
      next: (techniciens) => {
        console.log('📦 Liste des techniciens reçue:', techniciens);
        const technicien = techniciens.find(t => t.id === this.technicienId);
        console.log('🎯 Technicien trouvé:', technicien);
        
        if (technicien) {
          // Formater la date de naissance pour l'input date (YYYY-MM-DD)
          let birthDateValue = '';
          if (technicien.birthDate) {
            const date = new Date(technicien.birthDate);
            birthDateValue = date.toISOString().split('T')[0];
          }
          
          // Récupérer le userName existant ou en générer un
          let userNameValue = (technicien as any).userName || '';
          if (!userNameValue && technicien.prenom && technicien.nom) {
            userNameValue = `${technicien.prenom.toLowerCase()} ${technicien.nom.toLowerCase()}`;
          }
          
          // Stocker la valeur originale
          (this.technicienForm.get('userName') as any).originalValue = userNameValue;
          
          this.technicienForm.patchValue({
            userName: userNameValue,
            email: technicien.email || '',
            nom: technicien.nom || '',
            prenom: technicien.prenom || '',
            phoneNumber: technicien.phoneNumber || '',
            birthDate: birthDateValue          });
          
          console.log('✅ Formulaire après patch:', this.technicienForm.value);
        } else {
          this.showAlert('error', 'Erreur', 'Technicien non trouvé');
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('❌ Erreur chargement:', error);
        this.showAlert('error', 'Erreur', 'Impossible de charger les données du technicien');
        this.loading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.technicienForm.invalid) {
      Object.keys(this.technicienForm.controls).forEach(key => {
        this.technicienForm.get(key)?.markAsTouched();
      });
      this.showAlert('error', 'Formulaire invalide', 'Veuillez corriger les erreurs');
      return;
    }

    this.loading = true;
    
    const formValue = this.technicienForm.value;
    const updateData: any = {
      userName: formValue.userName, // Utiliser la valeur saisie par l'utilisateur
      email: formValue.email,
      nom: formValue.nom,
      prenom: formValue.prenom,
      phoneNumber: formValue.phoneNumber || null,
      birthDate: formValue.birthDate ? new Date(formValue.birthDate).toISOString() : null
    };
    
    console.log('📤 Données envoyées pour mise à jour:', updateData);

    this.userService.adminUpdateTechnicien(this.technicienId!, updateData).subscribe({
      next: (response) => {
        console.log('✅ Réponse mise à jour:', response);
        this.showAlert('success', 'Succès', 'Technicien mis à jour avec succès');
        setTimeout(() => {
          this.router.navigate(['/techniciens']);
        }, 2000);
      },
      error: (error) => {
        console.error('❌ Erreur mise à jour:', error);
        const errorMessage = error.error?.message || error.message || 'Erreur lors de la mise à jour';
        this.showAlert('error', 'Erreur', errorMessage);
        this.loading = false;
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/techniciens']);
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
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      if (this.alert.show) {
        this.clearAlert();
      }
    }, 5000);
  }
}