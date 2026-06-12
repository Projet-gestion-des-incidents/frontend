import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import flatpickr from 'flatpickr';
import { Instance } from 'flatpickr/dist/types/instance';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
  ],
  templateUrl: './admin-dashboard.component.html',
})
export class AdminDashboardComponent implements AfterViewInit {
  
  @ViewChild('datepicker') datepicker!: ElementRef<HTMLInputElement>;
  
  // Filtres date partagés avec les enfants
  startDate: Date | null = null;
  endDate: Date | null = null;
  flatpickrInstance: any;
  
  // État pour forcer le rechargement des enfants
  dateRangeChanged = false;

  constructor() {}

  ngAfterViewInit() {
    this.initDatepicker();
  }

  initDatepicker() {
    if (this.datepicker) {
      this.flatpickrInstance = flatpickr(this.datepicker.nativeElement, {
        mode: 'range',
        static: true,
        monthSelectorType: 'static',
        dateFormat: 'Y-m-d',
        defaultDate: [this.getDefaultStartDate(), new Date()],
        onChange: (selectedDates: Date[], dateStr: string, instance: Instance) => {
          if (selectedDates.length === 2) {
            this.startDate = selectedDates[0];
            this.endDate = selectedDates[1];
          } else if (selectedDates.length === 1) {
            this.startDate = selectedDates[0];
            this.endDate = null;
          } else {
            this.startDate = null;
            this.endDate = null;
          }
          
          //  Notifier les enfants via localStorage ou un service
          // Option 1: Stocker les dates dans localStorage
          localStorage.setItem('dashboardStartDate', this.startDate ? this.startDate.toISOString() : '');
          localStorage.setItem('dashboardEndDate', this.endDate ? this.endDate.toISOString() : '');
          
          // Option 2: Utiliser un événement personnalisé
          window.dispatchEvent(new CustomEvent('dateRangeChanged', {
            detail: { startDate: this.startDate, endDate: this.endDate }
          }));
        }
      });
    }
  }

  private getDefaultStartDate(): Date {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date;
  }
}