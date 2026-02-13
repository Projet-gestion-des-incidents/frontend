import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ModalService } from '../../../services/modal.service';
import { UserService} from '../../../services/user.service';
import { AlertComponent } from '../../ui/alert/alert.component';
import { FileInputExampleComponent } from '../../form/form-elements/file-input-example/file-input-example.component';
import { ButtonComponent } from '../../ui/button/button.component';
import { DatePickerComponent } from '../../form/date-picker/date-picker.component';
import { LabelComponent } from '../../form/label/label.component';
import { InputFieldComponent } from '../../form/input/input-field.component';
import { SelectComponent } from '../../form/select/select.component';
import { ComponentCardComponent } from '../../common/component-card/component-card.component';
import { CommonModule } from '@angular/common';
import { ModalComponent } from '../../ui/modal/modal.component';
import { User } from '../../../models/User.model';

@Component({
  selector: 'app-user-meta-card',
  standalone: true,
  imports: [CommonModule, ModalComponent, ReactiveFormsModule, ComponentCardComponent, LabelComponent, InputFieldComponent, SelectComponent, DatePickerComponent, ButtonComponent, AlertComponent, FileInputExampleComponent,],
  templateUrl: './user-meta-card.component.html'
})
export class UserMetaCardComponent  {

@Input() user!: User;

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    public modal: ModalService
  ) {}

 
 

 
   
}
