import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../../../shared/components/ui/button/button.component';
import { RouterLink, RouterModule } from "@angular/router";
import { TPEService } from '../../../shared/services/tpe.service';
import { BadgeColor, BadgeComponent } from '../../../shared/components/ui/badge/badge.component';
@Component({
  selector: 'app-tpe-list',
  standalone: true,
  imports: [ButtonComponent,CommonModule,RouterModule,BadgeComponent],
  templateUrl: './tpe-list.component.html',
})
export class TpeListComponent implements OnInit {
  tpes: any[] = [];

  constructor(private tpeService: TPEService) {}

  ngOnInit(): void {
    this.loadTPEs();
  }

loadTPEs() {
  this.tpeService.getAllTPEs().subscribe({
    next: (res: any) => {
      this.tpes = res.data;   // ⚠️ important
    },
    error: err => console.error('Erreur TPE:', err)
  });
}

getBadgeColor(modele: string): BadgeColor {
  const map: Record<string, BadgeColor> = {
    'Ingenico': 'info',
    'Verifone': 'primary',
    'PAX': 'warning'
  };

  const key = modele.trim(); // enlève les espaces si présents
  return map[key] ?? 'dark';
}
  deleteTPE(id: string) {
    this.tpeService.deleteTPE(id).subscribe({
      next: () => this.loadTPEs(),
      error: err => console.error('Erreur suppression TPE:', err)
    });
  }
}