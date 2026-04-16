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
    maxBirthDateISO: string = '';

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
  birthDate: ['', [this.validateAge.bind(this)]]     });
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

 // Validation personnalisée pour l'âge (18 ans minimum) - Optionnel
validateAge(control: any): { [key: string]: boolean } | null {
  // ✅ Si la valeur est vide, pas d'erreur (champ optionnel)
  if (!control.value) {
    return null;  // Pas d'erreur, champ optionnel
  }
  
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
 openCalendar(): void {
    const dateInput = document.getElementById('birthDate') as HTMLInputElement;
    if (dateInput) {
      dateInput.showPicker(); // Fonctionne dans les navigateurs modernes
    }
  }
  loadTechnicienData(): void {
    this.loading = true;
    console.log('🔄 Chargement du technicien ID:', this.technicienId);
    
    // ✅ Utiliser getTechnicienById au lieu de getTechniciens
    this.userService.getTechnicienById(this.technicienId!).subscribe({
      next: (technicien) => {
        console.log('🎯 Technicien trouvé:', technicien);
        
        if (technicien) {
          // Formater la date de naissance pour l'input date (YYYY-MM-DD)
          let birthDateValue = '';
          if (technicien.birthDate) {
            const date = new Date(technicien.birthDate);
            birthDateValue = date.toISOString().split('T')[0];
          }
          
          this.technicienForm.patchValue({
            userName: technicien.userName || '',
            email: technicien.email || '',
            nom: technicien.nom || '',
            prenom: technicien.prenom || '',
            phoneNumber: technicien.phoneNumber || '',
            birthDate: birthDateValue
          });
          
          console.log('✅ Formulaire après patch:', this.technicienForm.value);
        } else {
          this.showAlert('error', 'Erreur', 'Technicien non trouvé');
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('❌ Erreur chargement:', error);
        const errorMessage = error.error?.message || error.message || 'Impossible de charger les données du technicien';
        this.showAlert('error', 'Erreur', errorMessage);
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
      userName: formValue.userName,
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
    
    setTimeout(() => {
      if (this.alert.show) {
        this.clearAlert();
      }
    }, 5000);
  }
}