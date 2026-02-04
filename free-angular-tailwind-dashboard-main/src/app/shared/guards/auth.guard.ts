import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(private authService: AuthService, private router: Router) {}

 canActivate(
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
): boolean | UrlTree {

  const isAuthenticated = this.authService.isAuthenticated();
  const userRole = this.authService.getRole(); // maintenant valide

  if (!isAuthenticated) {
    return this.router.createUrlTree(['/signin'], { queryParams: { returnUrl: state.url } });
  }

  const allowedRoles = route.data['roles'] as Array<string>;

  if (allowedRoles && !allowedRoles.includes(userRole!)) {
    // Redirection selon rôle
    switch(userRole) {
      case 'Admin':
        return this.router.createUrlTree(['/admin-dashboard']);
      case 'Technicien':
        return this.router.createUrlTree(['/technicien-dashboard']);
      case 'Commercant':
        return this.router.createUrlTree(['/commercant-dashboard']);
      default:
        return this.router.createUrlTree(['/signin']);
    }
  }

  return true;
}
}