import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { TPEService } from '../../../shared/services/tpe.service';
import { ButtonComponent } from '../../../shared/components/ui/button/button.component';
import { InputFieldComponent } from '../../../shared/components/form/input/input-field.component';
import { SelectComponent } from '../../../shared/components/form/select/select.component';
import { AlertComponent } from '../../../shared/components/ui/alert/alert.component';

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

  alert = { show: false, variant: 'error' as 'error' | 'success', title: '', message: '' };

  commercants: { id: string; nom: string; prenom: string }[] = [];
  commercantOptions: { value: string; label: string }[] = [];

  modeleOptions = [
    { value: 1, label: 'Ingenico' },
    { value: 2, label: 'Verifone' },
    { value: 3, label: 'PAX' }
  ];

  constructor(
    private fb: FormBuilder,
    private tpeService: TPEService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {

    this.tpeId = this.route.snapshot.paramMap.get('id')!;

    this.form = this.fb.group({
      numSerie: ['', [Validators.required, Validators.pattern(/^[0-9]{6}$/)]],
      modele: ['', Validators.required],
      commercantId: ['', Validators.required]
    });

    this.loadCommercants();
    this.loadTPE();
  }

  loadCommercants() {
    this.tpeService.getAllCommercants().subscribe({
      next: (users) => {
        this.commercants = users.map(u => ({
          id: u.id,
          nom: u.nom,
          prenom: u.prenom
        }));

        this.commercantOptions = this.commercants.map(c => ({
          value: c.id,
          label: `${c.nom} ${c.prenom}`
        }));
      },
      error: () => this.showError('Impossible de charger les commerçants')
    });
  }

  loadTPE() {
    this.tpeService.getTPEById(this.tpeId).subscribe({
      next: (res: any) => {

        const tpe = res.data;
const modeleMap: any = {
  'Ingenico': 1,
  'Verifone': 2,
  'PAX': 3
};
        this.form.patchValue({
          numSerie: tpe.numSerie,
  modele: modeleMap[tpe.modele],    
         commercantId: tpe.commercantId
        });

      },
      error: () => this.showError('Impossible de charger le TPE')
    });
  }

  submit() {

    if (this.form.invalid) return;

    this.loading = true;

    this.tpeService.updateTPE(this.tpeId, {
      ...this.form.value,
      modele: Number(this.form.value.modele)
    }).subscribe({

      next: () => {

        this.loading = false;

        this.showSuccess('TPE modifié avec succès');

        setTimeout(() => {
          this.router.navigate(['/tpes']);
        }, 1200);

      },

      error: (err) => {

        this.loading = false;

        let message = 'Erreur lors de la modification';

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
  }

  private showError(message: string) {
    this.alert = { show: true, variant: 'error', title: 'Erreur', message };
  }

}