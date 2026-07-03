import { Component, input, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-map-static',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './map-static.html',
  styleUrl: './map-static.css'
})

export class MapStaticComponent {
  location = input<string>('');
  latitude = input<number | null>(null);
  longitude = input<number | null>(null);
  zoom = input<number>(14);
  width = input<number | string>('100%');
  height = input<number | string>(300);

  private sanitizer = inject(DomSanitizer);

  private hasValidCoordinates = computed<boolean>(() => {
    const lat = this.latitude();
    const lng = this.longitude();
    return (
      lat !== null && lat !== undefined &&
      lng !== null && lng !== undefined &&
      !isNaN(lat) && !isNaN(lng)
    );
  });

  mapUrl = computed<SafeResourceUrl>(() => {
    if (!this.hasValidCoordinates()) {
      return this.sanitizer.bypassSecurityTrustResourceUrl('');
    }
    const lat = this.latitude()!;
    const lng = this.longitude()!;
    const markerCoords = `${lat},${lng}`;
    const bbox = this.calculateBbox(lat, lng);
    const url = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${markerCoords}`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  });

  private calculateBbox(lat: number, lng: number): string {
    const offset = 0.05;
    const south = (lat - offset).toFixed(4);
    const west = (lng - offset).toFixed(4);
    const north = (lat + offset).toFixed(4);
    const east = (lng + offset).toFixed(4);
    return `${west},${south},${east},${north}`;
  }

  locationDisplay = computed<string>(() => {
    const loc = this.location();
    if (loc) return loc;
    if (this.hasValidCoordinates()) {
      return `${this.latitude()!.toFixed(4)}, ${this.longitude()!.toFixed(4)}`;
    }
    return '';
  });

  showError = computed<boolean>(() =>
    !this.hasValidCoordinates() && (!this.location() || this.location().trim() === '')
  );

  showMap = computed<boolean>(() =>
    this.hasValidCoordinates() || this.location().trim() !== ''
  );
}