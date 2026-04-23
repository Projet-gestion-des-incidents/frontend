import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
@Component({
  selector: 'app-governorate-map',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-3">
      <div *ngFor="let gov of topGovernorates" class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 rounded-full" [style.backgroundColor]="gov.color"></div>
          <span class="text-sm font-medium">{{ gov.name }}</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-32 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div class="h-full rounded-full" [style.width]="gov.tauxPanne + '%'" [style.backgroundColor]="gov.color"></div>
          </div>
          <span class="text-xs font-semibold">{{ gov.tauxPanne }}%</span>
        </div>
      </div>
    </div>
  `
})
export class GovernorateMapComponent implements OnInit {
  @Input() data: any[] = [];
  topGovernorates: any[] = [];

  ngOnInit() {
    this.topGovernorates = this.data
      .sort((a, b) => b.tauxPanne - a.tauxPanne)
      .slice(0, 6);
  }
}
