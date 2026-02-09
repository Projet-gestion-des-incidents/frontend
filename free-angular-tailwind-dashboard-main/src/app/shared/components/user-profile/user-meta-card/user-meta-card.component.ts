import { Component, Input } from '@angular/core';
import { InputFieldComponent } from './../../form/input/input-field.component';
import { ModalService } from '../../../services/modal.service';

import { ModalComponent } from '../../ui/modal/modal.component';
import { ButtonComponent } from '../../ui/button/button.component';
import { CreateUserDto, User, UserService } from '../../../services/user.service';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-user-meta-card',
  imports: [
    ModalComponent,
    InputFieldComponent,
    ButtonComponent,ReactiveFormsModule  
],
    standalone: true,

  templateUrl: './user-meta-card.component.html',
  styles: ``
})
export class UserMetaCardComponent {

  constructor(public modal: ModalService,public userService : UserService) {}
  @Input() user!: User;

  get fullName() {
    return `${this.user.prenom} ${this.user.nom}`;
  }
  isOpen = false;
    editForm!: FormGroup;

openModal() {
  if (!this.editForm) {
    this.editForm = new FormGroup({
      nom: new FormControl(this.user.nom, [Validators.required]),
      prenom: new FormControl(this.user.prenom, [Validators.required]),
      email: new FormControl(this.user.email, [Validators.required, Validators.email]),
      phone: new FormControl(this.user.phone)
    });
  } else {
    this.editForm.patchValue({
      nom: this.user.nom,
      prenom: this.user.prenom,
      email: this.user.email,
      phone: this.user.phone
    });
  }
  this.isOpen = true;
}


  closeModal() {
    this.isOpen = false;
  }
ngOnInit() {
  this.editForm = new FormGroup({
    nom: new FormControl(this.user.nom, [Validators.required]),
    prenom: new FormControl(this.user.prenom, [Validators.required]),
    email: new FormControl(this.user.email, [Validators.required, Validators.email]),
    phone: new FormControl(this.user.phone)
  });
}

handleSave() {
  if (this.editForm.invalid) {
    console.log('Formulaire invalide', this.editForm.value);
    return;
  }

  // On envoie seulement les champs modifiés
  const updatedData: Partial<User> = {
   userName: this.user.userName, // obligatoire pour PUT
  email: this.editForm.value.email,
  nom: this.editForm.value.nom,
  prenom: this.editForm.value.prenom,
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
