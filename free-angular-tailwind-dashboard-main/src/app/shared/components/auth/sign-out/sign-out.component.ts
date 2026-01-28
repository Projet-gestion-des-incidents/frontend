import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-sign-out',
  template: `
    <div class="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p class="text-gray-600 dark:text-gray-400">Déconnexion en cours...</p>
      </div>
    </div>
  `,
  styles: []
})
export class SignOutComponent implements OnInit {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Déconnexion immédiate
    this.authService.logout();
    
    // Redirection après un court délai
    setTimeout(() => {
      this.router.navigate(['/signin']);
    });
  }
}