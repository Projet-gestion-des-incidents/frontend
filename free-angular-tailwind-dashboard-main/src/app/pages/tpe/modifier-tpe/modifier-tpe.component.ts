import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { TPEService } from '../../../shared/services/tpe.service';
import { ButtonComponent } from '../../../shared/components/ui/button/button.component';
import { InputFieldComponent } from '../../../shared/components/form/input/input-field.component';
import { SelectComponent } from '../../../shared/components/form/select/select.component';
import { AlertComponent } from '../../../shared/components/ui/alert/alert.component';
import { UserService } from '../../../shared/services/user.service';

@Component({
  selector: 'app-modifier-tpe',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    ButtonComponent,
    InputFieldComponent,
    SelectComponent,
    AlertComponent
  ],
  templateUrl: './modifier-tpe.component.html',
  styleUrls: ['./modifier-tpe.component.css']
})
export class ModifierTpeComponent implements OnInit {

  form!: FormGroup;
  tpeId!: string;
  loading = false;
  private alertTimeout: any;

  alert = { show: false, variant: 'error' as 'error' | 'success', title: '', message: '' };

  commercants: { id: string; nomMagasin: string }[] = [];
  commercantOptions: { value: string; label: string }[] = [];

  modeleOptions = [
    { value: 1, label: 'Ingenico' },
    { value: 2, label: 'Verifone' },
    { value: 3, label: 'PAX' }
  ];

  nonAssigneOption = { value: '', label: 'Non assigné' };

  // Variables pour suivre l'état initial
  initialValues: any = null;
  hasChanges: boolean = false;

  constructor(
    private fb: FormBuilder,
    private tpeService: TPEService,
    private userService: UserService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.tpeId = this.route.snapshot.paramMap.get('id')!;

    this.form = this.fb.group({
      modele: ['', Validators.required],
      commercantId: ['']
    });

    // S'abonner aux changements du formulaire
    this.form.valueChanges.subscribe(() => {
      this.checkForChanges();
    });

    this.loadCommercants();
    this.loadTPE();
  }

  // Vérifier si des changements ont été effectués
  checkForChanges(): void {
    if (!this.initialValues) {
      this.hasChanges = false;
      return;
    }

    const currentValues = {
      modele: this.form.get('modele')?.value,
      commercantId: this.form.get('commercantId')?.value
    };

    const currentCommercantId = currentValues.commercantId === '' ? null : currentValues.commercantId;
    const initialCommercantId = this.initialValues.commercantId === '' ? null : this.initialValues.commercantId;

    this.hasChanges = (
      currentValues.modele !== this.initialValues.modele ||
      currentCommercantId !== initialCommercantId
    );
  }

  loadCommercants() {
    this.userService.getCommercants().subscribe({
      next: (users) => {
        this.commercants = users.map(u => ({
          id: u.id,
          nomMagasin: u.nomMagasin
        }));

        this.commercantOptions = [
          this.nonAssigneOption,
          ...this.commercants.map(c => ({
            value: c.id,
            label: `${c.nomMagasin}`
          }))
        ];
      },
      error: () => this.showError('Impossible de charger les commerçants')
    });
  }

  tpeToDisplay: any = null;

  loadTPE() {
    this.tpeService.getTPEById(this.tpeId).subscribe({
      next: (res: any) => {
        const tpe = res.data;
        this.tpeToDisplay = tpe;
        
        const modeleMap: any = {
          'Ingenico': 1,
          'Verifone': 2,
          'PAX': 3
        };
        
        const formValues = {
          modele: modeleMap[tpe.modele],
          commercantId: tpe.commercantId || ''
        };
        
        // Stocker les valeurs initiales
        this.initialValues = { ...formValues };
        
        this.form.patchValue(formValues);
        this.hasChanges = false;
      },
      error: () => this.showError('Impossible de charger le TPE')
    });
  }

  submit() {
    if (this.form.invalid) {
      Object.keys(this.form.controls).forEach(key => {
        const control = this.form.get(key);
        control?.markAsTouched();
      });
      return;
    }

    //  Vérifier si des modifications ont été faites
    if (!this.hasChanges) {
      this.showInfo('Aucune modification détectée');
      return;
    }

    this.loading = true;
    this.clearAlert();

    const formValue = this.form.value;
    
    const payload: any = {
      modele: Number(formValue.modele)
    };
    
    payload.commercantId = formValue.commercantId === '' ? null : formValue.commercantId;

    this.tpeService.updateTPE(this.tpeId, payload).subscribe({
      next: (response) => {
        this.loading = false;
        const message = response.data?.message || 'TPE modifié avec succès';
        this.showSuccess(message);
        
        // Mettre à jour les valeurs initiales après succès
        this.initialValues = {
          modele: formValue.modele,
          commercantId: formValue.commercantId
        };
        this.hasChanges = false;
        
        setTimeout(() => {
          this.router.navigate(['/tpes']);
        }, 5000);
      },
      error: (err) => {
        this.loading = false;
        let message = 'Erreur lors de la modification du TPE';
        if (err?.error?.message) {
          message = err.error.message;
        }
        this.showError(message);
      }
    });
  }

  cancel() {
    // Redirection directe 
    this.router.navigate(['/tpes']);
  }

  private showSuccess(message: string) {
    this.alert = { show: true, variant: 'success', title: 'Succès', message };
    this.scheduleAlertClear();
  }

  private showError(message: string) {
    this.alert = { show: true, variant: 'error', title: 'Erreur', message };
    this.scheduleAlertClear();
  }

  private showInfo(message: string) {
    this.alert = { show: true, variant: 'success', title: 'Information', message };
    this.scheduleAlertClear();
  }

  public clearAlert() {
    this.alert.show = false;
    if (this.alertTimeout) {
      clearTimeout(this.alertTimeout);
      this.alertTimeout = null;
    }
  }

  private scheduleAlertClear() {
    if (this.alertTimeout) {
      clearTimeout(this.alertTimeout);
    }
    this.alertTimeout = setTimeout(() => {
      this.clearAlert();
    }, 5000);
  }
}