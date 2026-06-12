import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { UserService } from '../../../services/user.service';

interface Alert {
  show: boolean;
  title: string;
  message: string;
  variant: 'error' | 'success' | 'warning' | 'info';
}

//  Validateur personnalisé pour le nom d'utilisateur (sans espaces, uniquement lettres/chiffres)
function usernameValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (!value) return null;
  
  // Vérifie que le nom d'utilisateur contient uniquement des lettres et chiffres (pas d'espaces, pas de caractères spéciaux)
  const regex = /^[a-zA-Z0-9]+$/;
  if (!regex.test(value)) {
    return { usernameInvalid: true };
  }
  return null;
}

//  Validateur personnalisé pour la date de naissance
function birthDateValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  
  //  Si la valeur est vide, pas d'erreur (champ optionnel)
  if (!value) {
    return null;
  }
  
  const birthDate = new Date(value);
  const today = new Date();
  
  //  Vérifier si la date est valide
  if (isNaN(birthDate.getTime())) {
    return { invalidDate: true };
  }
  
  //  Vérifier que la date n'est pas dans le futur
  if (birthDate > today) {
    return { futureDate: true };
  }
  
  //  Vérifier l'âge minimum (18 ans)
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  if (age < 18) {
    return { underAge: true };
  }
  
  //  Vérifier l'âge maximum (120 ans - date raisonnable)
  if (age > 120) {
    return { overAge: true };
  }
  
  //  Vérifier que l'année n'est pas inférieure à 1900
  if (birthDate.getFullYear() < 1900) {
    return { tooOld: true };
  }
  
  return null;
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
 minBirthDateISO: string = ''; //  la date minimale
  originalFormValues: any = {}; // Stocker les valeurs originales
  formChanged = false; // Indique si le formulaire a été modifié

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
      userName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(30),usernameValidator]],
      email: ['', [Validators.required, Validators.email]],
      nom: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(30)]],
      prenom: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(30)]],
  phoneNumber: ['', [Validators.pattern('^[0-9]{8}$')]],  
  birthDate: ['', [birthDateValidator]]  });
 // Calculer la date maximale (18 ans minimum)
    const today = new Date();
    const minDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
    this.maxBirthDateISO = minDate.toISOString().split('T')[0];
    
    //  Calculer la date minimale (120 ans maximum - année 1900)
    this.minBirthDateISO = '1900-01-01';
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
  //  Si la valeur est vide, pas d'erreur (champ optionnel)
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
      dateInput.showPicker(); 
    }
  }

  checkFormChanges(): void {
    const currentValues = this.technicienForm.value;
    this.formChanged = JSON.stringify(currentValues) !== JSON.stringify(this.originalFormValues);
  }

isSubmitDisabled(): boolean {
 
  const phone = this.technicienForm.get('phoneNumber');
  const birth = this.technicienForm.get('birthDate');

  // Si les deux sont remplis ET l'un est invalide → désactiver
  const bothFilledButInvalid =
    phone?.value && birth?.value &&
    (phone?.invalid || birth?.invalid);

  // Si un seul est rempli mais invalide → désactiver aussi
  const oneFilledButInvalid =
    (phone?.value && phone?.invalid) ||
    (birth?.value && birth?.invalid);

  return (
    this.technicienForm.invalid ||
    this.loading ||
    !this.formChanged
  );
}
  
loadTechnicienData(): void {
    this.loading = true;
    console.log(' Chargement du technicien ID:', this.technicienId);
    
    this.userService.getTechnicienById(this.technicienId!).subscribe({
      next: (technicien) => {
        console.log(' Technicien trouvé:', technicien);
        
        if (technicien) {
          let birthDateValue = '';
          if (technicien.birthDate) {
            const date = new Date(technicien.birthDate);
            if (!isNaN(date.getTime())) {
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const day = String(date.getDate()).padStart(2, '0');
              birthDateValue = `${year}-${month}-${day}`;
            }
          }
          
          const formValues = {
            userName: technicien.userName || '',
            email: technicien.email || '',
            nom: technicien.nom || '',
            prenom: technicien.prenom || '',
            phoneNumber: technicien.phoneNumber || '',
            birthDate: birthDateValue
          };
          
          this.technicienForm.patchValue(formValues);
          //  Stocker les valeurs originales
          this.originalFormValues = { ...formValues };
          
          //  Écouter les changements du formulaire
          this.technicienForm.valueChanges.subscribe(() => {
            this.checkFormChanges();
          });
          
          console.log(' Formulaire après patch:', this.technicienForm.value);
        } else {
          this.showAlert('error', 'Erreur', 'Technicien non trouvé');
        }
        this.loading = false;
      },
      error: (error) => {
        console.error(' Erreur chargement:', error);
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
    
    console.log(' Données envoyées pour mise à jour:', updateData);

    this.userService.adminUpdateTechnicien(this.technicienId!, updateData).subscribe({
      next: (response) => {
        console.log(' Réponse mise à jour:', response);
        this.showAlert('success', 'Succès', 'Technicien mis à jour avec succès');
        setTimeout(() => {
          this.router.navigate(['/techniciens']);
        }, 5000);
      },
      error: (error) => {
        console.error(' Erreur mise à jour:', error);
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