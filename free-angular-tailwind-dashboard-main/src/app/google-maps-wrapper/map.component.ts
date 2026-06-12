import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './map.component.html'
})
export class MapComponent implements OnInit {
  map!: L.Map;
  marker!: L.Marker;
  searchText = '';
  suggestions: any[] = [];
  private searchTimeout: any;

  @Output() locationSelected = new EventEmitter<any>();
  @Output() invalidLocation = new EventEmitter<string>(); // ✅ Ajouter cet événement

  ngOnInit(): void {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    });

    this.map = L.map('map').setView([34.0, 9.0], 7);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap'
    }).addTo(this.map);

    this.marker = L.marker([34.0, 9.0]).addTo(this.map);

    const tunisiaBounds = L.latLngBounds(
      L.latLng(30.0, 7.0),
      L.latLng(38.0, 12.0)
    );
    this.map.setMaxBounds(tunisiaBounds);
    this.map.on('drag', () => {
      this.map.panInsideBounds(tunisiaBounds, { animate: false });
    });

    this.map.on('click', (e: any) => {
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;
      
      if (this.isWithinTunisia(lat, lng)) {
        this.marker.setLatLng([lat, lng]);
        this.reverseGeocode(lat, lng);
      } else {
        //  Émettre un événement au lieu d'afficher une alerte
        this.invalidLocation.emit('Veuillez sélectionner un emplacement en Tunisie');
      }
    });
  }

  private isWithinTunisia(lat: number, lng: number): boolean {
    return lat >= 30.0 && lat <= 38.0 && lng >= 7.0 && lng <= 12.0;
  }

  searchAddress() {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    if (this.searchText.length < 3) {
      this.suggestions = [];
      return;
    }

    this.searchTimeout = setTimeout(() => {
      fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(this.searchText)}&countrycodes=tn&limit=5&addressdetails=1`)
        .then(res => res.json())
        .then(data => {
          this.suggestions = data.filter((place: any) => 
            place.display_name.toLowerCase().includes('tunisie') || 
            place.display_name.toLowerCase().includes('tunisia') ||
            place.address?.country_code === 'tn'
          );
        })
        .catch(err => console.error('Search error:', err));
    }, 300);
  }

  selectAddress(place: any) {
    const lat = parseFloat(place.lat);
    const lng = parseFloat(place.lon);

    if (!this.isWithinTunisia(lat, lng)) {
      this.invalidLocation.emit('Cette adresse n\'est pas en Tunisie');
      return;
    }

    this.map.setView([lat, lng], 16);
    this.marker.setLatLng([lat, lng]);
    this.searchText = place.display_name;
    this.suggestions = [];

    this.locationSelected.emit({
      address: place.display_name,
      lat,
      lng
    });
  }

  reverseGeocode(lat: number, lng: number) {
    if (!this.isWithinTunisia(lat, lng)) {
      this.invalidLocation.emit('Veuillez sélectionner un emplacement en Tunisie');
      return;
    }

    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`)
      .then(res => res.json())
      .then(data => {
        if (data.address?.country_code !== 'tn' && 
            !data.display_name.toLowerCase().includes('tunisie') && 
            !data.display_name.toLowerCase().includes('tunisia')) {
          this.invalidLocation.emit('Cette adresse n\'est pas en Tunisie');
          return;
        }

        const address = data.display_name;
        this.searchText = address;

        this.locationSelected.emit({
          address,
          lat,
          lng
        });
      })
      .catch(err => console.error('Reverse geocode error:', err));
  }
}