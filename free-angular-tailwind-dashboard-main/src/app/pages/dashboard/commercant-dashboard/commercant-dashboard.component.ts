import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { TpeListComponent } from "../../tpe/tpe-list/tpe-list.component";
import { ButtonComponent } from "../../../shared/components/ui/button/button.component";
import { InputFieldComponent } from '../../../shared/components/form/input/input-field.component';
import { LabelComponent } from '../../../shared/components/form/label/label.component';

@Component({
  selector: 'app-commercant-dashboard',
   standalone: true,
  imports: [    CommonModule,
    TpeListComponent,
    ButtonComponent,
    LabelComponent,
    InputFieldComponent],
  templateUrl: './commercant-dashboard.component.html',
  styleUrl: './commercant-dashboard.component.css',
})
export class CommercantDashboardComponent {
  showTpeForm = false; // <-- variable pour contrôler l'affichage du formulaire

  toggleTpeForm() {
    this.showTpeForm = !this.showTpeForm; // inverse la valeur à chaque clic
  }
}
