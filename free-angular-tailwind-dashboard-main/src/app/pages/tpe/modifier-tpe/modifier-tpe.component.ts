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

  // ✅ Option pour "Non assigné" (désassigner le TPE)
  nonAssigneOption = { value: '', label: 'Non assigné' };

  constructor(
    private fb: FormBuilder,
    private tpeService: TPEService,
    private userService: UserService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.tpeId = this.route.snapshot.paramMap.get('id')!;

    // ✅ Formulaire sans numSerie (généré automatiquement par le backend)
    this.form = this.fb.group({
      modele: ['', Validators.required],
      commercantId: ['']  // Peut être null (désassigner)
    });

    this.loadCommercants();
    this.loadTPE();
  }

  loadCommercants() {
    this.userService.getCommercants().subscribe({
      next: (users) => {
        this.commercants = users.map(u => ({
          id: u.id,
          nomMagasin: u.nomMagasin        }));

        // ✅ Ajouter l'option "Non assigné" en premier
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

// Ajouter cette propriété
tpeToDisplay: any = null;

// Modifier loadTPE
loadTPE() {
  this.tpeService.getTPEById(this.tpeId).subscribe({
    next: (res: any) => {
      const tpe = res.data;
      this.tpeToDisplay = tpe; // ✅ Stocker pour afficher le numéro de série
      
      const modeleMap: any = {
        'Ingenico': 1,
        'Verifone': 2,
        'PAX': 3
      };
      
      this.form.patchValue({
        modele: modeleMap[tpe.modele],
        commercantId: tpe.commercantId || ''
      });
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

    this.loading = true;
    this.clearAlert();

    const formValue = this.form.value;
    
    // ✅ Construction du payload
    const payload: any = {
      modele: Number(formValue.modele)
    };
    
    // ✅ Si commercantId est une chaîne vide, envoyer null (désassigner)
    payload.commercantId = formValue.commercantId === '' ? null : formValue.commercantId;

    this.tpeService.updateTPE(this.tpeId, payload).subscribe({
      next: (response) => {
        this.loading = false;
        const message = response.data?.message || 'TPE modifié avec succès';
        this.showSuccess(message);
        setTimeout(() => {
          this.router.navigate(['/tpes']);
        }, 1500);
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