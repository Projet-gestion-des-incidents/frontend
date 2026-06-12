import {
  Component, Input, OnInit, OnChanges,
  SimpleChanges, ElementRef, ViewChild, AfterViewInit
} from '@angular/core';
import { CommonModule } from '@angular/common';

declare const d3: any;
declare const topojson: any;

@Component({
  selector: 'app-tunisia-map',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative">
      <div #mapWrap class="w-full" style="min-height:320px;"></div>

      <!-- Légende -->
      <div class="flex flex-wrap gap-3 px-4 py-3 border-t border-gray-100 text-xs text-gray-500">
        <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-full bg-red-500 inline-block"></span>Critique &gt;100%</span>
        <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-full bg-orange-400 inline-block"></span>Élevé 50–100%</span>
        <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-full bg-yellow-300 inline-block"></span>Moyen 20–50%</span>
        <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-full bg-green-300 inline-block"></span>Faible 0–20%</span>
        <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-full bg-gray-300 inline-block"></span>Aucune donnée</span>
      </div>

      <!-- Tooltip -->
      <div #tooltip class="absolute z-50 hidden pointer-events-none bg-white border border-gray-200 rounded-xl shadow-lg px-3 py-2 text-xs min-w-[150px]"></div>
    </div>
  `,
  styleUrls: ['./tunisia-map-data.component.css']
})
export class TunisiaMapComponent implements OnInit, OnChanges, AfterViewInit {
  @ViewChild('mapWrap') mapWrapRef!: ElementRef<HTMLDivElement>;
  @ViewChild('tooltip') tooltipRef!: ElementRef<HTMLDivElement>;
  @Input() data: any[] = [];

  private initialized = false;
  private dataMap = new Map<string, any>();

  private readonly GOV_NAME_MAP: Record<string, string[]> = {
    'Tunis':       ['tunis', 'governorate of tunis'],
    'Ariana':      ['ariana'],
    'Ben Arous':   ['ben arous', 'ben-arous'],
    'Manouba':     ['manouba', 'mannouba'],
    'Nabeul':      ['nabeul', 'nabul'],
    'Zaghouan':    ['zaghouan'],
    'Bizerte':     ['bizerte', 'banzart'],
    'Béja':        ['béja', 'beja'],
    'Jendouba':    ['jendouba'],
    'Le Kef':      ['le kef', 'kef', 'al kef'],
    'Siliana':     ['siliana'],
    'Kairouan':    ['kairouan'],
    'Kasserine':   ['kasserine'],
    'Sidi Bouzid': ['sidi bouzid', 'sidi-bouzid'],
    'Sousse':      ['sousse', 'susa'],
    'Monastir':    ['monastir'],
    'Mahdia':      ['mahdia'],
    'Sfax':        ['sfax', 'safaqis'],
    'Gabès':       ['gabès', 'gabes', 'qabis'],
    'Médenine':    ['médenine', 'medenine', 'madanin'],
    'Tataouine':   ['tataouine', 'tatawin'],
    'Gafsa':       ['gafsa'],
    'Tozeur':      ['tozeur', 'tuzur'],
    'Kébili':      ['kébili', 'kebili'],
  };

  ngOnInit() { this.buildDataMap(); }

  ngAfterViewInit() {
    this.loadD3Scripts().then(() => {
      this.initialized = true;
      this.drawMap();
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['data']) {
      this.buildDataMap();
      if (this.initialized) this.drawMap();
    }
  }

  private buildDataMap() {
    this.dataMap = new Map(this.data.map(d => [d.name, d]));
  }

  private loadD3Scripts(): Promise<void> {
    return new Promise(resolve => {
      if ((window as any).d3 && (window as any).topojson) { resolve(); return; }
      const d3Script = document.createElement('script');
      d3Script.src = 'https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.5/d3.min.js';
      d3Script.onload = () => {
        const topoScript = document.createElement('script');
        topoScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/topojson/3.0.2/topojson.min.js';
        topoScript.onload = () => resolve();
        document.head.appendChild(topoScript);
      };
      document.head.appendChild(d3Script);
    });
  }

  private matchGov(rawName: string): string | null {
    const n = (rawName || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
    for (const [govName, aliases] of Object.entries(this.GOV_NAME_MAP)) {
      for (const alias of aliases) {
        const a = alias.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
        if (n.includes(a) || a.includes(n)) return govName;
      }
    }
    return null;
  }

  private getColor(taux: number | null): string {
    if (taux === null) return '#CBD5E1';
    if (taux > 100)   return '#EF4444';
    if (taux > 50)    return '#FB923C';
    if (taux > 20)    return '#FDE047';
    if (taux > 0)     return '#86EFAC';
    return '#CBD5E1';
  }

  private getColorHover(taux: number | null): string {
    if (taux === null) return '#94A3B8';
    if (taux > 100)   return '#DC2626';
    if (taux > 50)    return '#EA580C';
    if (taux > 20)    return '#CA8A04';
    if (taux > 0)     return '#16A34A';
    return '#94A3B8';
  }

  private async drawMap() {
    const wrap = this.mapWrapRef?.nativeElement;
    if (!wrap) return;
    wrap.innerHTML = '';

    try {
      const topo = await d3.json(
        'https://cdn.jsdelivr.net/npm/datamaps@0.5.10/src/js/data/tun.topo.json'
      );
      const key = Object.keys(topo.objects)[0];
      const features = topojson.feature(topo, topo.objects[key]).features;

      const W = wrap.clientWidth || 400;
      const H = Math.round(W * 1.65);

      const svg = d3.select(wrap).append('svg')
        .attr('width', '100%')
        .attr('viewBox', `0 0 ${W} ${H}`)
        .style('display', 'block');

      const proj = d3.geoMercator().fitSize([W, H], {
        type: 'FeatureCollection', features
      });
      const path = d3.geoPath(proj);
      const tooltip = this.tooltipRef.nativeElement;

      const self = this;

      svg.selectAll('path')
        .data(features)
        .join('path')
        .attr('d', path)
        .attr('stroke', 'rgba(0,0,0,0.15)')
        .attr('stroke-width', 0.6)
        .attr('fill', (d: any) => {
          const raw = d.properties?.name || d.id || '';
          const gov = self.matchGov(raw);
          const item = gov ? self.dataMap.get(gov) : null;
          return self.getColor(item?.tauxPanne ?? null);
        })
        .attr('cursor', 'pointer')
        .on('mousemove', function(this: SVGPathElement, evt: MouseEvent, d: any) {
          const raw = d.properties?.name || d.id || '';
          const gov = self.matchGov(raw) || raw;
          const item = self.dataMap.get(gov);
          const taux = item?.tauxPanne ?? null;
          d3.select(this).attr('fill', self.getColorHover(taux));
          const tauxColor = taux > 100 ? '#EF4444' : taux > 50 ? '#EA580C' : taux > 20 ? '#CA8A04' : '#16A34A';
          tooltip.innerHTML = `
            <div class="font-semibold mb-1">${gov}</div>
            <div class="flex justify-between gap-4">
              <span class="text-gray-500">Taux</span>
              <strong style="color:${taux !== null ? tauxColor : '#9ca3af'}">${taux !== null ? taux + '%' : 'N/A'}</strong>
            </div>
            ${item ? `
            <div class="flex justify-between gap-4"><span class="text-gray-500">TPEs</span><span>${item.totalTPEs}</span></div>
            <div class="flex justify-between gap-4"><span class="text-gray-500">Incidents</span><span>${item.totalIncidents}</span></div>
            ` : ''}
          `;
          const rect = wrap.getBoundingClientRect();
          tooltip.style.left = (evt.clientX - rect.left + 12) + 'px';
          tooltip.style.top  = (evt.clientY - rect.top  - 10) + 'px';
          tooltip.classList.remove('hidden');
        })
        .on('mouseleave', function(this: SVGPathElement, _: MouseEvent, d: any) {
          const raw = d.properties?.name || d.id || '';
          const gov = self.matchGov(raw);
          const item = gov ? self.dataMap.get(gov) : null;
          d3.select(this).attr('fill', self.getColor(item?.tauxPanne ?? null));
          tooltip.classList.add('hidden');
        });

      // Labels
      svg.selectAll('text.gov-lbl')
        .data(features)
        .join('text')
        .attr('class', 'gov-lbl')
        .attr('transform', (d: any) => {
          const [cx, cy] = path.centroid(d);
          return `translate(${cx},${cy})`;
        })
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central')
        .attr('pointer-events', 'none')
        .each(function(this: SVGTextElement, d: any) {
          const raw = d.properties?.name || d.id || '';
          const gov = self.matchGov(raw) || raw;
          const item = self.dataMap.get(gov);
          const taux = item?.tauxPanne ?? null;
          const short = gov.replace('Sidi Bouzid','S.Bouzid').replace('Ben Arous','B.Arous');
          const el = d3.select(this);
          el.selectAll('*').remove();
          el.append('tspan').attr('x', 0).attr('dy', '-0.4em')
            .attr('fill', taux !== null && taux > 20 ? '#1e293b' : '#475569')
            .attr('font-size', `${W * 0.022}px`).attr('font-weight', '500')
            .text(short.length > 10 ? short.slice(0, 9) + '…' : short);
          if (taux !== null) {
            el.append('tspan').attr('x', 0).attr('dy', '1.2em')
              .attr('fill', taux > 100 ? '#DC2626' : taux > 50 ? '#9a3412' : taux > 20 ? '#854d0e' : '#166534')
              .attr('font-size', `${W * 0.026}px`).attr('font-weight', '700')
              .text(`${taux}%`);
          }
        });

    } catch (e: any) {
      wrap.innerHTML = `<p class="text-sm text-red-500 p-4">Erreur chargement carte : ${e.message}</p>`;
    }
  }
}