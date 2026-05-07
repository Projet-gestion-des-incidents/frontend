// ajout-tpe.component.ts - Version avec méthodes

import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonComponent } from '../../../shared/components/ui/button/button.component';
import { InputFieldComponent } from '../../../shared/components/form/input/input-field.component';
import { AlertComponent } from '../../../shared/components/ui/alert/alert.component';
import { TPEService } from '../../../shared/services/tpe.service';
import { Router, RouterModule } from '@angular/router';
import { UserService } from '../../../shared/services/user.service';

@Component({
  selector: 'app-ajout-tpe',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule,
    ButtonComponent,
    InputFieldComponent,
    AlertComponent
  ],
  templateUrl: './ajout-tpe.component.html'
})
export class AjoutTPEComponent implements OnInit {
  tpeForm: FormGroup;
  loading = false;

  alert = { show: false, variant: 'error' as 'error' | 'success', title: '', message: '' };
  commercants: { id: string; nomMagasin: string }[] = [];

  // ✅ Compteurs par modèle
  quantites = {
    ingenico: 0,
    verifone: 0,
    pax: 0
  };

  constructor(
    private fb: FormBuilder,
    private tpeService: TPEService,
    private userService: UserService,
    private router: Router
  ) {
    this.tpeForm = this.fb.group({
      commercantId: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadCommercants();
  }

  // ✅ Méthodes pour incrémenter/décrémenter les quantités
  incrementIngenico(): void {
    this.quantites.ingenico++;
  }

  decrementIngenico(): void {
    if (this.quantites.ingenico > 0) {
      this.quantites.ingenico--;
    }
  }

  incrementVerifone(): void {
    this.quantites.verifone++;
  }

  decrementVerifone(): void {
    if (this.quantites.verifone > 0) {
      this.quantites.verifone--;
    }
  }

  incrementPax(): void {
    this.quantites.pax++;
  }

  decrementPax(): void {
    if (this.quantites.pax > 0) {
      this.quantites.pax--;
    }
  }

  // ✅ Méthode pour mettre à jour via l'input
  updateIngenico(value: number): void {
    this.quantites.ingenico = Math.max(0, value || 0);
  }

  updateVerifone(value: number): void {
    this.quantites.verifone = Math.max(0, value || 0);
  }

  updatePax(value: number): void {
    this.quantites.pax = Math.max(0, value || 0);
  }

  cancel() {
    this.router.navigate(['/tpes']);
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

  getTotalTPEs(): number {
    return this.quantites.ingenico + this.quantites.verifone + this.quantites.pax;
  }

  resetQuantites(): void {
    this.quantites = {
      ingenico: 0,
      verifone: 0,
      pax: 0
    };
  }

  hasAtLeastOneTPE(): boolean {
    return this.getTotalTPEs() > 0;
  }

  onSubmit() {
    this.clearAlert();

    if (!this.tpeForm.value.commercantId) {
      this.showError('Veuillez sélectionner un commerçant.');
      return;
    }

    if (!this.hasAtLeastOneTPE()) {
      this.showError('Veuillez indiquer au moins un TPE à créer.');
      return;
    }

    this.loading = true;
    const commercantId = this.tpeForm.value.commercantId;
    
    const tpesToCreate: { modele: number }[] = [];
    
    for (let i = 0; i < this.quantites.ingenico; i++) {
      tpesToCreate.push({ modele: 1 });
    }
    
    for (let i = 0; i < this.quantites.verifone; i++) {
      tpesToCreate.push({ modele: 2 });
    }
    
    for (let i = 0; i < this.quantites.pax; i++) {
      tpesToCreate.push({ modele: 3 });
    }

    this.createTPEsSequentially(commercantId, tpesToCreate);
  }

  createTPEsSequentially(commercantId: string, tpeArray: { modele: number }[]): void {
    let currentIndex = 0;
    const total = tpeArray.length;
    let successCount = 0;
    const errors: string[] = [];

    const createNext = () => {
      if (currentIndex >= total) {
        this.loading = false;

        if (successCount === total) {
          this.showSuccess(`${successCount} TPE(s) ajouté(s) avec succès.`);
          this.resetQuantites();
          this.tpeForm.get('commercantId')?.reset();
          setTimeout(() => this.router.navigate(['/tpes']), 5000);
        } else if (successCount > 0) {
          this.showError(`${successCount}/${total} TPE(s) créés. ${errors.join(', ')}`);
        } else {
          this.showError('Erreur lors de la création des TPEs.');
        }
        return;
      }

      const tpe = tpeArray[currentIndex];
      const modeleLabel = this.getModeleLabel(tpe.modele);
      
      this.tpeService.createTPE({
        commercantId: commercantId,
        modele: tpe.modele
      }).subscribe({
        next: (response) => {
          if (response?.isSuccess !== false) {
            successCount++;
          } else {
            errors.push(`${modeleLabel}: ${response?.message || 'Échec'}`);
          }
          currentIndex++;
          createNext();
        },
        error: (err) => {
          errors.push(`${modeleLabel}: ${err.error?.message || err.message}`);
          currentIndex++;
          createNext();
        }
      });
    };

    createNext();
  }

  private getModeleLabel(modele: number): string {
    switch (modele) {
      case 1: return 'Ingenico';
      case 2: return 'Verifone';
      case 3: return 'PAX';
      default: return 'Inconnu';
    }
  }

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
    }
  }

  private alertTimeout: any;
}