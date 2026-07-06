import { Component, input, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

/**
 * Reusable static map component that embeds an OpenStreetMap iframe for a
 * given location or set of coordinates. Used on pages that need to display
 * a store/pickup point location (e.g. product detail, order/pickup info)
 * without requiring a full interactive map integration.
 */
@Component({
  selector: 'app-map-static',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './map-static.html',
  styleUrl: './map-static.css'
})

export class MapStaticComponent {
  // Human-readable location label; used as a fallback display when coordinates are missing.
  location = input<string>('');
  // Latitude used to center the map and place the marker.
  latitude = input<number | null>(null);
  // Longitude used to center the map and place the marker.
  longitude = input<number | null>(null);
  // Zoom level for the embedded map (currently unused directly, reserved for future use).
  zoom = input<number>(14);
  // Width of the map iframe (CSS value or number of pixels).
  width = input<number | string>('100%');
  // Height of the map iframe (CSS value or number of pixels).
  height = input<number | string>(300);

  private sanitizer = inject(DomSanitizer);

  // True when both latitude and longitude are present and valid numbers.
  private hasValidCoordinates = computed<boolean>(() => {
    const lat = this.latitude();
    const lng = this.longitude();
    return (
      lat !== null && lat !== undefined &&
      lng !== null && lng !== undefined &&
      !isNaN(lat) && !isNaN(lng)
    );
  });

  // Sanitized OpenStreetMap embed URL built from the current coordinates; empty when invalid.
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

  /**
   * Computes a bounding box around the given coordinates using a fixed
   * offset, used to define the visible area of the embedded map.
   * @param lat latitude of the center point.
   * @param lng longitude of the center point.
   * @returns a comma-separated "west,south,east,north" bbox string for the OSM embed URL.
   */
  private calculateBbox(lat: number, lng: number): string {
    const offset = 0.05;
    const south = (lat - offset).toFixed(4);
    const west = (lng - offset).toFixed(4);
    const north = (lat + offset).toFixed(4);
    const east = (lng + offset).toFixed(4);
    return `${west},${south},${east},${north}`;
  }

  // Text shown near the map: the location label if provided, otherwise formatted coordinates.
  locationDisplay = computed<string>(() => {
    const loc = this.location();
    if (loc) return loc;
    if (this.hasValidCoordinates()) {
      return `${this.latitude()!.toFixed(4)}, ${this.longitude()!.toFixed(4)}`;
    }
    return '';
  });

  // True when there is no usable location data at all (no coordinates and no location text).
  showError = computed<boolean>(() =>
    !this.hasValidCoordinates() && (!this.location() || this.location().trim() === '')
  );

  // True when there is enough data (coordinates or location text) to render the map.
  showMap = computed<boolean>(() =>
    this.hasValidCoordinates() || this.location().trim() !== ''
  );
}