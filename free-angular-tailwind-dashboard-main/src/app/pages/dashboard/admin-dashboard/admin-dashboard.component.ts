import { Component, OnInit } from '@angular/core';
import { UserService } from '../../../shared/services/user.service';
import { User } from '../../../shared/models/User.model';
import { BasicTableOneComponent } from '../../../shared/components/tables/basic-tables/basic-table-one/basic-table-one.component';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ButtonComponent } from '../../../shared/components/ui/button/button.component';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
 CommonModule,
  RouterModule,
  FormsModule,
  BasicTableOneComponent,
  ButtonComponent
  ],
  templateUrl: './admin-dashboard.component.html',
})
export class AdminDashboardComponent implements OnInit {
  users: User[] = [];
  loading = true;
  error: string | null = null;

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    this.loadUsers();
        this.loadRoles(); // Optionnel

    
  }
deactivateUser(user: User): void {
  this.userService.deleteUser(user.id).subscribe({
    next: () => {
      this.users = this.users.filter(u => u.id !== user.id);
    },
    error: err => {
      console.error('Erreur désactivation', err);
      alert('Erreur lors de la désactivation');
    }
  });
}

currentPage = 1;
pageSize = 5;
totalPages = 1;
totalCount = 0;

searchTerm = '';
selectedRole = '';
selectedStatut = ''; 
// searchUsers(term: string) {
//   const lowerTerm = term.toLowerCase();
//   return this.users.filter(u =>
//     u.nom.toLowerCase().includes(lowerTerm) ||
//         u.prenom.toLowerCase().includes(lowerTerm) ||

//     u.email.toLowerCase().includes(lowerTerm) 
//   );
// }
  // ✅ CORRIGÉ : Gestion propre de la pagination
  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadUsers();
    }
  }

  // ✅ CORRIGÉ : Génération des numéros de page avec limites
getPageNumbers(): number[] {
  if (this.totalPages <= 0) {
    return [1]; // Au moins une page
  }
  
  const maxVisible = 5;
  const pages: number[] = [];
  
  if (this.totalPages <= maxVisible) {
    for (let i = 1; i <= this.totalPages; i++) {
      pages.push(i);
    }
  } else {
      // Afficher avec des ellipsis
      if (this.currentPage <= 3) {
        // Début
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push(-1); // Ellipsis
        pages.push(this.totalPages);
      } else if (this.currentPage >= this.totalPages - 2) {
        // Fin
        pages.push(1);
        pages.push(-1); // Ellipsis
        for (let i = this.totalPages - 3; i <= this.totalPages; i++) pages.push(i);
      } else {
        // Milieu
        pages.push(1);
        pages.push(-1); // Ellipsis
        for (let i = this.currentPage - 1; i <= this.currentPage + 1; i++) pages.push(i);
        pages.push(-1); // Ellipsis
        pages.push(this.totalPages);
      }
    }
    
    return pages;
  }
toggleUser(user: User) {
  const action$ = user.statut === 'Inactif'
    ? this.userService.activateUser(user.id)
    : this.userService.desactivateUser(user.id);

  action$.subscribe({
    next: () => {
      user.statut = user.statut === 'Actif' ? 'Inactif' : 'Actif'; // mise à jour locale
    },
    error: () => {
      alert('Erreur lors du changement de statut');
    }
  });
}


roleOptions: string[] = [ 'Technicien', 'Commercant']; // À adapter
  statutOptions: string[] = ['Actif', 'Inactif'];

  loadUsers(): void {
    this.loading = true;

    // ✅ Construire la requête proprement
    const request: any = {
      page: this.currentPage,
      pageSize: this.pageSize,
      sortBy: 'nom',
      sortDescending: false
    };

    // ✅ N'ajouter que les filtres non vides
    if (this.searchTerm?.trim()) {
      request.searchTerm = this.searchTerm.trim();
    }

    if (this.selectedRole) {
      request.role = this.selectedRole;
    }

    if (this.selectedStatut) {
      request.statut = this.selectedStatut;
    }

    this.userService.searchUsers(request).subscribe({
      next: (res) => {
        
        this.users = res.data;
        
     if (res.pagination) {
        this.totalPages = res.pagination.totalPages || 1;
        this.totalCount = res.pagination.totalCount || 0;
        this.currentPage = res.pagination.page || this.currentPage;
      }
      
      // ✅ Correction: Si totalPages est 0, mettre à 1
      if (this.totalPages === 0) {
        this.totalPages = 1;
      }
        // ✅ CORRIGÉ : Ajuster la page courante si elle dépasse le total
    if (this.currentPage > this.totalPages) {
        this.currentPage = this.totalPages;
      }
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur chargement utilisateurs:', err);
        this.error = 'Impossible de charger les utilisateurs';
        this.loading = false;
           this.users = [];
      this.totalPages = 1;
      this.totalCount = 0;
      }
    });
  }

  // ✅ Méthode dédiée pour l'application des filtres
    applyFilter(): void {
    this.currentPage = 1;
    this.loadUsers();
  }

  // ✅ Méthode dédiée pour la recherche
onSearch(): void {
  // Debounce
  if (this.searchTimeout) clearTimeout(this.searchTimeout);
  
  this.searchTimeout = setTimeout(() => {
    const term = this.searchTerm?.trim();
    
    // 🚀 Si pas de terme, chargement normal
    if (!term) {
      this.currentPage = 1;
      this.loadUsers();
      return;
    }

    this.loading = true;
    
    // Charger tous les utilisateurs UNE SEULE FOIS et les mettre en cache
    this.loadAllUsersForSearch(term);
    
  }, 400);
}

// Cache des utilisateurs pour éviter des appels répétés
private allUsersCache: User[] | null = null;

private loadAllUsersForSearch(term: string): void {
  // Si déjà en cache, utiliser le cache
  if (this.allUsersCache && this.allUsersCache.length > 0) {
    this.filterUsersLocally(this.allUsersCache, term);
    return;
  }
  
  // Sinon, charger depuis l'API
  const request: any = {
    page: 1,
    pageSize: 1000,
    sortBy: 'nom',
    sortDescending: false
  };

  this.userService.searchUsers(request).subscribe({
    next: (res) => {
      this.allUsersCache = res.data || [];
      this.filterUsersLocally(this.allUsersCache, term);
    },
    error: (err) => {
      console.error('❌ Erreur:', err);
      this.loadUsers();
    }
  });
}

private filterUsersLocally(users: User[], term: string): void {
  const lowerTerm = term.toLowerCase();
  
  // Détection du type de recherche
  const isYear = /^\d{4}$/.test(term);
  const yearToFind = isYear ? parseInt(term) : null;
  const isPhoneSearch = /^[0-9\s\+\-]+$/.test(term);
  const cleanPhoneTerm = term.replace(/\D/g, '');
  
  console.log(`🔍 Recherche "${term}" - Année: ${isYear}, Téléphone: ${isPhoneSearch}`);
  
  const filteredUsers = users.filter(user => {
    // 1. Recherche texte standard
    let match = 
      (user.nom?.toLowerCase() || '').includes(lowerTerm) ||
      (user.prenom?.toLowerCase() || '').includes(lowerTerm) ||
      (user.email?.toLowerCase() || '').includes(lowerTerm) ||
      (user.role?.toLowerCase() || '').includes(lowerTerm) ||
      (user.statut?.toLowerCase() || '').includes(lowerTerm);
    
    // 2. Recherche téléphone
    if (!match && isPhoneSearch && user.phoneNumber) {
      const cleanUserPhone = user.phoneNumber.replace(/\D/g, '');
      match = cleanUserPhone.includes(cleanPhoneTerm);
      if (match) console.log(`📞 Téléphone trouvé: ${user.phoneNumber} pour ${user.nom}`);
    }
    
    // 3. 🔥 RECHERCHE PAR ANNÉE - CORRIGÉE !
    if (!match && isYear && user.birthDate) {
      // Vérifier le type et extraire l'année
      let year: number | null = null;
      
      if (user.birthDate instanceof Date) {
        year = user.birthDate.getFullYear();
      } else if (typeof user.birthDate === 'string') {
        // Prendre les 4 premiers caractères de la string ISO
        const yearStr = user.birthDate.split('-')[0];
        year = parseInt(yearStr);
      }
      
      match = year === yearToFind;
      if (match) console.log(`📅 Année trouvée: ${year} pour ${user.nom} ${user.prenom}`);
    }
    
    return match;
  });

  console.log(`🔍 "${term}" → ${filteredUsers.length} résultats`);
  
  // Pagination
  this.totalCount = filteredUsers.length;
  this.totalPages = Math.ceil(filteredUsers.length / this.pageSize) || 1;
  this.currentPage = 1;
  this.users = filteredUsers.slice(0, this.pageSize);
  this.loading = false;
}
  private searchTimeout: any;

  // ✅ Reset complet des filtres
   resetFilters(): void {
    this.searchTerm = '';
    this.selectedRole = '';
    this.selectedStatut = '';
    this.currentPage = 1;
    this.loadUsers();
  }

  
  
  // ✅ Méthode pour charger les rôles disponibles
  loadRoles(): void {
    this.userService.getAvailableRoles().subscribe({
      next: (roles) => {
        this.roleOptions = roles.map(r => r.name);
      },
      error: (err) => {
        console.error('Erreur chargement rôles:', err);
      }
    });
  }

 
  deleteUser(user: User) {
  this.userService.deleteUser(user.id).subscribe(() => {
    this.users = this.users.filter(u => u.id !== user.id);
  });
  this.loadUsers();
}
}