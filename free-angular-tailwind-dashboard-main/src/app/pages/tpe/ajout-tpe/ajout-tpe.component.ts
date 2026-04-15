// ajout-tpe.component.ts - Version corrigée

import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../../../shared/components/ui/button/button.component';
import { InputFieldComponent } from '../../../shared/components/form/input/input-field.component';
import { SelectComponent } from '../../../shared/components/form/select/select.component';
import { AlertComponent } from '../../../shared/components/ui/alert/alert.component';
import { TPEService } from '../../../shared/services/tpe.service';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { Router, RouterModule } from '@angular/router';
import { UserService } from '../../../shared/services/user.service';

@Component({
  selector: 'app-ajout-tpe',
  imports: [CommonModule, ReactiveFormsModule, RouterModule, ButtonComponent, InputFieldComponent, SelectComponent, AlertComponent],
  templateUrl: './ajout-tpe.component.html'
})
export class AjoutTPEComponent implements OnInit {
  tpeForm: FormGroup;
  loading = false;

  alert = { show: false, variant: 'error' as 'error' | 'success', title: '', message: '' };
  commercants: { id: string; nomMagasin: string }[] = [];
  commercantOptions: { value: string; label: string }[] = [];
  
  modeleOptions = [
    { value: 1, label: 'Ingenico' },
    { value: 2, label: 'Verifone' },
    { value: 3, label: 'PAX' }
  ];

  selectedModele: number = 1;
  nbTPE: number = 1;

  constructor(
    private fb: FormBuilder, 
    private tpeService: TPEService, 
    private userService: UserService, 
    private router: Router
  ) {
    this.tpeForm = this.fb.group({
      commercantId: ['', Validators.required],
      tpes: this.fb.array([])
    });
  }

  ngOnInit(): void {
    this.loadCommercants();
    this.generateTPEs();
  }

  get tpes(): FormArray {
    return this.tpeForm.get('tpes') as FormArray;
  }

  generateTPEs(): void {
    while (this.tpes.length) {
      this.tpes.removeAt(0);
    }

    for (let i = 0; i < this.nbTPE; i++) {
      this.tpes.push(this.fb.group({
        modele: [this.selectedModele, Validators.required]
      }));
    }
  }

  onNbTPEChange(event: any): void {
    this.nbTPE = parseInt(event.target.value, 10);
    this.generateTPEs();
  }

  onModeleChange(event: any): void {
    this.selectedModele = parseInt(event.target.value, 10);
    if (this.tpes.length > 0) {
      for (let i = 0; i < this.tpes.length; i++) {
        this.tpes.at(i).get('modele')?.setValue(this.selectedModele);
      }
    }
  }

  cancel() {
    this.router.navigate(['/tpes']);
  }

  removeTPE(index: number) {
    this.tpes.removeAt(index);
  }

  loadCommercants(): void {
    this.loading = true;
    this.userService.getCommercants().subscribe({
      next: (commercants) => {
        this.commercants = commercants;
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur chargement commerçants:', err);
        this.loading = false;
        this.showError('Impossible de charger la liste des commerçants');
      }
    });
  }

 // Dans ajout-tpe.component.ts
onSubmit() {
  this.clearAlert();

  if (!this.tpeForm.value.commercantId) {
    this.showError('Veuillez sélectionner un commerçant.');
    return;
  }

  if (this.tpes.length === 0) {
    this.showError('Veuillez ajouter au moins un TPE.');
    return;
  }

  this.loading = true;
  const commercantId = this.tpeForm.value.commercantId;
  const tpeArray = this.tpes.value;

  this.createTPEsSequentially(commercantId, tpeArray);
}

createTPEsSequentially(commercantId: string, tpeArray: any[]): void {
  let currentIndex = 0;
  const total = tpeArray.length;
  let successCount = 0;
  const errors: string[] = [];

  const createNext = () => {
    if (currentIndex >= total) {
      this.loading = false;
      
      if (successCount === total) {
        this.showSuccess(`${successCount} TPE(s) ajouté(s) avec succès.`);
        setTimeout(() => this.router.navigate(['/tpes']), 1500);
      } else if (successCount > 0) {
        this.showError(`${successCount}/${total} TPE(s) créés. ${errors.join(', ')}`);
      } else {
        this.showError('Erreur lors de la création des TPEs.');
      }
      
      this.tpeForm.reset();
      this.tpes.clear();
      this.generateTPEs();
      return;
    }
    
    const tpe = tpeArray[currentIndex];
    this.tpeService.createTPE({
      commercantId: commercantId,
      modele: tpe.modele
    }).subscribe({
      next: (response) => {
        if (response?.isSuccess !== false) {
          successCount++;
        } else {
          errors.push(`TPE ${currentIndex + 1}: ${response?.message || 'Échec'}`);
        }
        currentIndex++;
        createNext();
      },
      error: (err) => {
        errors.push(`TPE ${currentIndex + 1}: ${err.error?.message || err.message}`);
        currentIndex++;
        createNext();
      }
    });
  };
  
  createNext();
}

  

  // Validation des erreurs du formulaire
  private getFormValidationErrors(formGroup: FormGroup): string[] {
    const messages: string[] = [];

    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);

      if (control instanceof FormArray) {
        control.controls.forEach((tpeControl: AbstractControl, index: number) => {
          const tpeGroup = tpeControl as FormGroup;
          const modele = tpeGroup.get('modele');

          if (modele?.errors?.['required']) {
            messages.push(`Le modèle du TPE ${index + 1} est obligatoire.`);
          }
        });
      } else if (control && control.invalid) {
        if (key === 'commercantId' && control.errors?.['required']) {
          messages.push('Veuillez sélectionner un commerçant.');
        }
      }
    });

    return messages;
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