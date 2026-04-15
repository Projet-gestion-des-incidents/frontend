import { Routes } from '@angular/router';
import { EcommerceComponent } from './pages/dashboard/ecommerce/ecommerce.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { FormElementsComponent } from './pages/forms/form-elements/form-elements.component';
import { BasicTablesComponent } from './pages/tables/basic-tables/basic-tables.component';
import { BlankComponent } from './pages/blank/blank.component';
import { NotFoundComponent } from './pages/other-page/not-found/not-found.component';
import { AppLayoutComponent } from './shared/layout/app-layout/app-layout.component';
import { InvoicesComponent } from './pages/invoices/invoices.component';
import { LineChartComponent } from './pages/charts/line-chart/line-chart.component';
import { BarChartComponent } from './pages/charts/bar-chart/bar-chart.component';
import { AlertsComponent } from './pages/ui-elements/alerts/alerts.component';
import { AvatarElementComponent } from './pages/ui-elements/avatar-element/avatar-element.component';
import { BadgesComponent } from './pages/ui-elements/badges/badges.component';
import { ButtonsComponent } from './pages/ui-elements/buttons/buttons.component';
import { ImagesComponent } from './pages/ui-elements/images/images.component';
import { VideosComponent } from './pages/ui-elements/videos/videos.component';
import { SignInComponent } from './pages/auth-pages/sign-in/sign-in.component';
import { SignUpComponent } from './pages/auth-pages/sign-up/sign-up.component';
import { CalenderComponent } from './pages/calender/calender.component';
import { SignOutComponent } from './shared/components/auth/sign-out/sign-out.component';
import { OtpComponent } from './shared/components/auth/otp/otp.component';
import { ForgotPasswordComponent } from './shared/components/auth/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './shared/components/auth/reset-password/reset-password.component';
import { ForgotPasswordPageComponent } from './pages/auth-pages/forgot-password/forgot-password/forgot-password-page/forgot-password-page.component';
import { AdminDashboardComponent } from './pages/dashboard/admin-dashboard/admin-dashboard.component';
import { TechnicienDashboardComponent } from './pages/dashboard/technicien-dashboard/technicien-dashboard.component';
import { CommercantDashboardComponent } from './pages/dashboard/commercant-dashboard/commercant-dashboard.component';
import { AuthGuard } from './shared/guards/auth.guard';
import { IncidentListComponent } from './pages/incident-list/incident-list.component';
import { IncidentFormComponent } from './shared/components/incident-form/incident-form.component';
import { IncidentDetailComponent } from './pages/incident-detail/incident-detail.component';
import { IncidentEditComponent } from './pages/incident-edit/incident-edit.component';
import { TicketsComponent } from './pages/tickets/tickets.component';
import { TicketFormComponent } from './shared/components/ticket-form/ticket-form.component';
import { TicketDetailComponent } from './pages/ticket-detail/ticket-detail.component';
import { TicketEditComponent } from './pages/ticket-edit/ticket-edit.component';
import { TpeListComponent } from './pages/tpe/tpe-list/tpe-list.component';
import { AjoutTPEComponent } from './pages/tpe/ajout-tpe/ajout-tpe.component';
import { ModifierTpeComponent } from './pages/tpe/modifier-tpe/modifier-tpe.component';
import { CommentaireListComponent } from './commentaireticket/commentaire-list/commentaire-list.component';
import { CreateTechnicienComponent } from './shared/createUser/create-technicien/create-technicien.component';
import { CreateCommercantComponent } from './shared/createUser/create-commercant/create-commercant.component';
import { TechniciensListComponent } from './shared/listeUtilisateurs/techniciens-list/techniciens-list.component';
import { CommercantsListComponent } from './shared/listeUtilisateurs/commercants-list/commercants-list.component';
import { UpdateCommercantComponent } from './shared/components/updateUser/update-commercant/update-commercant.component';
import { UpdateTechnicienComponent } from './shared/components/updateUser/update-technicien/update-technicien.component';
import { EmailSentComponent } from './shared/components/auth/email-sent/email-sent.component';

export const routes: Routes = [
  {
    path:'',
    component:AppLayoutComponent,
    children:[
      {
        path: '',
        component: EcommerceComponent,
        pathMatch: 'full',
        title:
          'Angular Ecommerce Dashboard | TailAdmin - Angular Admin Dashboard Template',
      },
     {
  path: 'admin-dashboard',
  component: AdminDashboardComponent,
  canActivate: [AuthGuard],
  data: { roles: ['Admin'] }
}, { 
        path: 'techniciens', 
        component: TechniciensListComponent,
        canActivate: [AuthGuard],
        data: { roles: ['Admin'] },
        title: 'Liste des techniciens'
      },
      { 
        path: 'commercants', 
        component: CommercantsListComponent,
        canActivate: [AuthGuard],
        data: { roles: ['Admin'] },
        title: 'Liste des commerçants'
      },
  { 
        path: 'create-technicien', 
        component: CreateTechnicienComponent,
        canActivate: [AuthGuard],
        data: { roles: ['Admin'] },
        title: 'Créer un technicien'
      },
      { 
        path: 'create-commercant', 
        component: CreateCommercantComponent,
        canActivate: [AuthGuard],
        data: { roles: ['Admin'] },
        title: 'Créer un commerçant'
      },
{
  path: 'technicien-dashboard',
  component: TechnicienDashboardComponent,
  canActivate: [AuthGuard],
  data: { roles: ['Technicien'] }
},{
  path: 'update-commercant/:id',
  component: UpdateCommercantComponent,
  canActivate: [AuthGuard],
  data: { roles: ['Admin'] },
  title: 'Modifier un commerçant'
},{
  path: 'update-technicien/:id',
  component: UpdateTechnicienComponent,
  canActivate: [AuthGuard],
  data: { roles: ['Admin'] },
  title: 'Modifier un technicien'
}
,{
  path: 'commercant-dashboard',
  component: CommercantDashboardComponent,
  canActivate: [AuthGuard],
  data: { roles: ['Commercant'] }
}, {
        path: 'tpes',
        children: [
          // Admin peut voir tous les TPEs
          { 
            path: '', 
            component: TpeListComponent, 
            canActivate: [AuthGuard], 
            data: { roles: ['Admin', 'Commercant'] } // Commercant voit ses TPEs
          },
          // Admin uniquement
          { 
            path: 'new', 
            component: AjoutTPEComponent, 
            canActivate: [AuthGuard], 
            data: { roles: ['Admin'] } 
          },
          { 
            path: 'edit/:id', 
            component: ModifierTpeComponent, 
            canActivate: [AuthGuard], 
            data: { roles: ['Admin'] } 
          }
        ]
      },
{
  path: 'incidents',
  children: [
    // Liste des incidents
    { 
      path: '', 
      component: IncidentListComponent,
      canActivate: [AuthGuard],
      data: { roles: ['Admin', 'Commercant'] } // Admin voit tout, Commercant voit ses propres
    },
    { 
            path: 'new', 
            component: IncidentFormComponent, 
            canActivate: [AuthGuard], 
            data: { roles: ['Commercant'] } 
          },
          // Modification d'un incident (Admin + Commercant)
          { 
            path: 'edit/:id', 
            component: IncidentEditComponent, 
            canActivate: [AuthGuard], 
            data: { roles: ['Admin', 'Commercant'] } 
          },
          // Détail d'un incident (Admin + Commercant)
          { 
            path: ':id', 
            component: IncidentDetailComponent, 
            canActivate: [AuthGuard], 
            data: { roles: ['Admin', 'Commercant'] } 
          }
        ]
      },  {
        path: 'tickets',
        children: [
          // Liste des tickets
          { 
            path: '', 
            component: TicketsComponent,
            canActivate: [AuthGuard],
            data: { roles: ['Admin', 'Technicien'] } // Admin voit tout, Technicien voit ses tickets assignés
          },
          // Création d'un ticket (Admin uniquement)
          { 
            path: 'new', 
            component: TicketFormComponent,
            canActivate: [AuthGuard],
            data: { roles: ['Admin'] } 
          },
          // Modification d'un ticket (Admin + Technicien)
          { 
            path: 'edit/:id', 
            component: TicketEditComponent,
            canActivate: [AuthGuard],
            data: { roles: ['Admin', 'Technicien'] } 
          },
          // Détail d'un ticket (Admin + Technicien)
          { 
            path: ':id', 
            component: TicketDetailComponent,
            canActivate: [AuthGuard],
            data: { roles: ['Admin', 'Technicien'] } 
          },
              { path: ':id/commentaires', 
                component: CommentaireListComponent, 
                canActivate: [AuthGuard],
                 data: { roles: ['Admin', 'Technicien'] } }
        ]
      }

,
      {
        path:'calendar',
        component:CalenderComponent,
        title:'Angular Calender | TailAdmin - Angular Admin Dashboard Template'
      },
      {
        path:'profile',
        component:ProfileComponent,
        title:'Angular Profile Dashboard | TailAdmin - Angular Admin Dashboard Template'
      },
      {
        path:'form-elements',
        component:FormElementsComponent,
        title:'Angular Form Elements Dashboard | TailAdmin - Angular Admin Dashboard Template'
      },
      {
        path:'basic-tables',
        component:BasicTablesComponent,
        title:'Angular Basic Tables Dashboard | TailAdmin - Angular Admin Dashboard Template'
      },
      {
        path:'blank',
        component:BlankComponent,
        title:'Angular Blank Dashboard | TailAdmin - Angular Admin Dashboard Template'
      },
      // support tickets
      {
        path:'invoice',
        component:InvoicesComponent,
        title:'Angular Invoice Details Dashboard | TailAdmin - Angular Admin Dashboard Template'
      },
      {
        path:'line-chart',
        component:LineChartComponent,
        title:'Angular Line Chart Dashboard | TailAdmin - Angular Admin Dashboard Template'
      },
      {
        path:'bar-chart',
        component:BarChartComponent,
        title:'Angular Bar Chart Dashboard | TailAdmin - Angular Admin Dashboard Template'
      },
      {
        path:'alerts',
        component:AlertsComponent,
        title:'Angular Alerts Dashboard | TailAdmin - Angular Admin Dashboard Template'
      },
      {
        path:'avatars',
        component:AvatarElementComponent,
        title:'Angular Avatars Dashboard | TailAdmin - Angular Admin Dashboard Template'
      },
      {
        path:'badge',
        component:BadgesComponent,
        title:'Angular Badges Dashboard | TailAdmin - Angular Admin Dashboard Template'
      },
      {
        path:'buttons',
        component:ButtonsComponent,
        title:'Angular Buttons Dashboard | TailAdmin - Angular Admin Dashboard Template'
      },
      {
        path:'images',
        component:ImagesComponent,
        title:'Angular Images Dashboard | TailAdmin - Angular Admin Dashboard Template'
      },
      {
        path:'videos',
        component:VideosComponent,
        title:'Angular Videos Dashboard | TailAdmin - Angular Admin Dashboard Template'
      },
    ]
  },
  // auth pages
  {
    path: 'forgot-password', 
    component: ForgotPasswordPageComponent 
  },{
  path: 'email-sent',
  component: EmailSentComponent,
  title: 'Email envoyé'
}
 , { 
    path: 'reset-password', 
    component: ResetPasswordComponent 
  },
  {
    path:'signin',
    component:SignInComponent,
    title:'Angular Sign In Dashboard | TailAdmin - Angular Admin Dashboard Template'
  },
  {
    path:'signup',
    component:SignUpComponent,
    title:'Angular Sign Up Dashboard | TailAdmin - Angular Admin Dashboard Template'
  },
 {
    path: 'otp',
    component: OtpComponent,
    title: 'Validation OTP'
  },
  {
    path: 'sign-out',
    component: SignOutComponent,
    title: 'Sign Out | TailAdmin - Angular Admin Dashboard Template'
  },

  // error pages
  {
    path:'**',
    component:NotFoundComponent,
    title:'Angular NotFound Dashboard | TailAdmin - Angular Admin Dashboard Template'
  },
 
];
