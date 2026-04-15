import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LabelComponent } from '../../components/form/label/label.component';
import { InputFieldComponent } from '../../components/form/input/input-field.component';
import { AlertComponent } from '../../components/ui/alert/alert.component';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-create-technicien',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LabelComponent,
    InputFieldComponent,
    AlertComponent
  ],
  templateUrl: './create-technicien.component.html'
})
export class CreateTechnicienComponent {
  technicienForm: FormGroup;
  loading = false;
  showPassword = false;
  showConfirmPassword = false;

  alert = {
    show: false,
    variant: 'error' as 'error' | 'success',
    title: '',
    message: ''
  };

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private router: Router
  ) {
    this.technicienForm = this.fb.group({
      prenom: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(30)]],
      nom: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(30)]],
      email: ['', [Validators.required, Validators.email]],
      userName: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(30)]]
    });
  }



  onSubmit(): void {
    if (this.technicienForm.invalid) {
      this.technicienForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.clearAlert();

    const formData = this.technicienForm.value;

    this.userService.createTechnicien({
      prenom: formData.prenom,
      nom: formData.nom,
      email: formData.email,
      userName: formData.userName,
    }).subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res.resultCode === 0) {
          this.showSuccess(res.message || 'Technicien créé avec succès !');
          setTimeout(() => this.router.navigate(['/techniciens']), 2000);
        } else {
          this.showError(res.message || 'Erreur lors de la création');
        }
      },
      error: (err) => {
        this.loading = false;
        this.showError(err.error?.message || 'Erreur serveur');
      }
    });
  }

  private showSuccess(message: string) {
    this.alert = { show: true, variant: 'success', title: 'Succès', message };
  }

  private showError(message: string) {
    this.alert = { show: true, variant: 'error', title: 'Erreur', message };
  }

  clearAlert() { this.alert.show = false; }
  cancel() { this.router.navigate(['/techniciens']); }
}