import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../../../shared/components/ui/button/button.component';
import { InputFieldComponent } from '../../../shared/components/form/input/input-field.component';
import { SelectComponent } from '../../../shared/components/form/select/select.component';
import { AlertComponent } from '../../../shared/components/ui/alert/alert.component';
import { TPEService } from '../../../shared/services/tpe.service';
import { forkJoin } from 'rxjs';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-ajout-tpe',
  // standalone: true,
  imports: [CommonModule, ReactiveFormsModule,RouterModule, ButtonComponent, InputFieldComponent, SelectComponent, AlertComponent],
  templateUrl: './ajout-tpe.component.html'
})
export class AjoutTPEComponent implements OnInit {
  tpeForm: FormGroup;
  loading = false;

alert = { show: false, variant: 'error' as 'error' | 'success', title: '', message: '' };
 commercants: { id: string; nom: string; prenom: string }[] = []; // ajouter prenom
  commercantOptions: { value: string; label: string }[] = [];      // déclarer la variable
  modeleOptions = [
{ value: 1, label: 'Ingenico' },
{ value: 2, label: 'Verifone' },
{ value: 3, label: 'PAX' }
];

  constructor(private fb: FormBuilder, private tpeService: TPEService,    private router: Router
) {
 this.tpeForm = this.fb.group({
  commercantId: ['', Validators.required],
  tpes: this.fb.array([])
});
  }

  ngOnInit(): void {
    this.loadCommercants();
    this.addTPE(); // ajouter une première ligne TPE par défaut
  }

  get tpes(): FormArray {
    return this.tpeForm.get('tpes') as FormArray;
  }

addTPE() {
  this.tpes.push(
    this.fb.group({
      numSerie: ['', [Validators.required, Validators.pattern(/^[0-9]{6}$/)]],
      modele: ['', Validators.required]
    })
  );
}
cancel() {
    this.router.navigate(['/tpes']);

}
  removeTPE(index: number) {
    this.tpes.removeAt(index);
  }

 loadCommercants() {
    this.tpeService.getAllCommercants().subscribe({
      next: (users) => {
        this.commercants = users.map(u => ({
          id: u.id,
          nom: u.nom,
          prenom: u.prenom
        }));
        // créer les options du select
        this.commercantOptions = this.commercants.map(c => ({
          value: c.id,
          label: `${c.nom} ${c.prenom}`
        }));
      },
      error: () => this.showError('Impossible de charger les commerçants')
    });
  }

onSubmit() {
  // Effacer l’alerte précédente
  this.clearAlert();

  // ✅ Utiliser le bon nom de fonction
const errors = this.getFormValidationErrors(this.tpeForm);
if (errors.length > 0) {
  // Affiche uniquement le premier message
  this.showError(errors[0]);
  return;
}

  this.loading = true;

  const commercantId = this.tpeForm.value.commercantId;

  const calls = this.tpes.value.map((t: any) =>
    this.tpeService.createTPE({
      ...t,
      commercantId: commercantId,
      modele: Number(t.modele)
    })
  );

 forkJoin(calls).subscribe({
  next: () => {
    this.loading = false;

    // 1️⃣ Afficher le message de succès
    this.showSuccess('TPE(s) ajouté(s) avec succès.');

    // 2️⃣ Laisser l'utilisateur voir le message avant la redirection (ex: 2 secondes)
    setTimeout(() => {
      this.router.navigate(['/tpes']);
    }, 1000);

    // 3️⃣ Réinitialiser le formulaire
    this.tpeForm.reset();
    this.tpes.clear();
    this.addTPE();
  },
  error: (err) => {
    this.loading = false;
    let serverMessage = 'Une erreur est survenue lors de la création du TPE.';
    if (err?.error?.message) {
      serverMessage = err.error.message;
    }
    this.showError(serverMessage);
  }
});
}

/**
 * Parcourt un FormGroup/FormArray et génère des messages d'erreur lisibles.
 */
private getFormValidationErrors(formGroup: FormGroup): string[] {
  const messages: string[] = [];

  Object.keys(formGroup.controls).forEach(key => {
    const control = formGroup.get(key);

    if (control instanceof FormArray) {
      // Parcourir chaque TPE du tableau
      control.controls.forEach((tpeControl: AbstractControl) => {
        const tpeGroup = tpeControl as FormGroup;

        const numSerie = tpeGroup.get('numSerie');
        const modele = tpeGroup.get('modele');

        // Validation numéro de série
        if (numSerie?.errors) {
          if (numSerie.errors['required']) {
            messages.push('Le numéro de série est obligatoire.');
          }
          if (numSerie.errors['pattern']) {
            messages.push('Le numéro de série doit contenir exactement 6 chiffres.');
          }
        }

        // Validation modèle
        if (modele?.errors?.['required']) {
          messages.push('Le modèle est obligatoire.');
        }
      });
    } else if (control && control.invalid) {
      // Champs simples hors FormArray
      if (key === 'commercantId' && control.errors?.['required']) {
        messages.push('Choisir un commerçant.');
      }
    }
  });

  return messages;
}

private getReadableLabel(key: string): string {
  switch (key) {
    case 'commercantId': return 'Commerçant';
    default: return key;
  }
}


  private markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormArray) {
        control.controls.forEach(c => this.markFormGroupTouched(c as FormGroup));
      }
    });
  }

 private alertTimeout: any;

private showSuccess(message: string) {
  this.alert = { show: true, variant: 'success', title: 'Succès', message };
  this.scheduleAlertClear();
}

private showError(message: string) {
  this.alert = { show: true, variant: 'error', title: 'Erreur', message };
  this.scheduleAlertClear();
}

private scheduleAlertClear() {
  if (this.alertTimeout) {
    clearTimeout(this.alertTimeout);
  }
  this.alertTimeout = setTimeout(() => {
    this.clearAlert();
  }, 5000);
}

public clearAlert() {
  this.alert.show = false;
  if (this.alertTimeout) {
    clearTimeout(this.alertTimeout);
    this.alertTimeout = null;
  }
}
}