import { Component } from '@angular/core';
import { AuthPageLayoutComponent } from '../../../../../shared/layout/auth-page-layout/auth-page-layout.component';
import { ForgotPasswordComponent } from '../../../../../shared/components/auth/forgot-password/forgot-password.component';


@Component({
  selector: 'app-forgot-password-page',
  imports: [AuthPageLayoutComponent, ForgotPasswordComponent],
  templateUrl: './forgot-password-page.component.html',
  styles: [] ,
})
export class ForgotPasswordPageComponent {

}
