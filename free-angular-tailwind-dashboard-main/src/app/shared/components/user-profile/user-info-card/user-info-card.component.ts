import { Component, Input } from '@angular/core';
import { ModalService } from '../../../services/modal.service';

import { InputFieldComponent } from '../../form/input/input-field.component';
import { ButtonComponent } from '../../ui/button/button.component';
import { LabelComponent } from '../../form/label/label.component';
import { ModalComponent } from '../../ui/modal/modal.component';
import { CreateUserDto, User, UserService } from '../../../services/user.service';
import { FormControl, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-user-info-card',
  imports: [
    InputFieldComponent,
    ButtonComponent,
    LabelComponent,
    ModalComponent
],
  standalone: true,
  templateUrl: './user-info-card.component.html',
  styles: ``
})
export class UserInfoCardComponent {

  constructor(public modal: ModalService, public userService : UserService) {}

  isOpen = false;
    editForm!: FormGroup;
ngOnInit() {
  this.editForm = new FormGroup({
    nom: new FormControl(this.user.nom, [Validators.required]),
    prenom: new FormControl(this.user.prenom, [Validators.required]),
    email: new FormControl(this.user.email, [Validators.required, Validators.email]),
    phone: new FormControl(this.user.phone)
  });
}
  openModal() {
    this.isOpen = true;
    this.editForm.patchValue({
      nom: this.user.nom,
      prenom: this.user.prenom,
      email: this.user.email,
      phone: this.user.phone
    });
  }

  closeModal() {
    this.isOpen = false;
  }

  @Input() user!: User;


handleSave() {
  if (this.editForm.invalid) {
    console.log('Formulaire invalide', this.editForm.value);
    return;
  }

  // On envoie seulement les champs modifiés
  const updatedData: Partial<User> = {
    nom: this.editForm.value.nom,
    prenom: this.editForm.value.prenom,
    email: this.editForm.value.email,
    phone: this.editForm.value.phone
  };

  console.log('Données envoyées au serveur:', updatedData);

  this.userService.updateMyProfile(updatedData).subscribe({
    next: (res) => {
      console.log('Réponse du serveur:', res);
      // On met à jour localement l'utilisateur avec ce qui a été renvoyé
      this.user = { ...this.user, ...res };
      this.closeModal();
    },
    error: (err) => {
      console.error('Erreur mise à jour profil', err);
      if (err.error) {
        console.log('Détails de l’erreur renvoyés par le serveur:', err.error);
      }
    }
  });
}


}
