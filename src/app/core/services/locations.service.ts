import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { timeout } from 'rxjs/operators';

// Shape of the per-province location data loaded from the local JSON asset:
// list of cities and a map of city -> list of postal codes.
interface LocationData {
  ciudades: string[];
  codigosPostales: Record<string, string[]>;
}

// In-memory cache of geocoding results keyed by "city-province", to avoid
// repeated calls to the third-party Nominatim API. A null value means a
// previous lookup found no coordinates.
interface CoordinatesCache {
  [key: string]: { lat: number; lng: number } | null;
}

/**
 * Service providing Spanish location data (provinces, cities, postal
 * codes) loaded from a static local JSON asset, plus geocoding
 * (city/province -> lat/lng coordinates) via the public Nominatim
 * (OpenStreetMap) API. Used for location pickers/validation in product
 * forms and for rendering approximate locations on maps.
 */
@Injectable({
  providedIn: 'root'
})
export class LocationsService {
  // Raw location dataset keyed by province name, populated asynchronously from the JSON asset.
  private locationsData: Record<string, LocationData> = {};
  // Whether the location dataset load attempt has finished (success or failure).
  private loaded = false;
  // Cache of geocoding lookups to minimize external API calls.
  private coordinatesCache: CoordinatesCache = {};

  constructor(private http: HttpClient) {
    this.loadLocationsData();
  }

  /**
   * Loads the local static dataset of Spanish provinces/cities/postal codes.
   * HTTP: GET /assets/data/codigos-postales-españa.json (local static asset, not the backend API)
   * Sets `loaded = true` whether the load succeeds or fails, so callers
   * waiting via `ensureLoaded()` are not blocked indefinitely.
   */
  private loadLocationsData(): void {
    this.http.get<Record<string, LocationData>>('/assets/data/codigos-postales-españa.json')
      .subscribe({
        next: (data) => {
          this.locationsData = data;
          this.loaded = true;
        },
        error: (_error) => {
          this.loaded = true;
        }
      });
  }

  /**
   * Returns the sorted list of all available province names.
   * @returns Promise resolving to the sorted province name list.
   */
  async getProvincias(): Promise<string[]> {
    await this.ensureLoaded();
    return Object.keys(this.locationsData).sort();
  }

  /**
   * Returns the sorted list of cities belonging to a given province.
   * @param provincia Province name.
   * @returns Promise resolving to the sorted city list, or an empty array if the province is unknown.
   */
  async getCiudadesByProvincia(provincia: string): Promise<string[]> {
    await this.ensureLoaded();
    return this.locationsData[provincia]?.ciudades?.sort() ?? [];
  }

  /**
   * Returns the sorted list of postal codes for a given city within a province.
   * @param provincia Province name.
   * @param ciudad City name.
   * @returns Promise resolving to the sorted postal code list, or an empty array if not found.
   */
  async getCodigosPostalesByCity(provincia: string, ciudad: string): Promise<string[]> {
    await this.ensureLoaded();
    const prov = this.locationsData[provincia];
    if (!prov) return [];
    const codigosPostales = prov.codigosPostales as Record<string, string[]>;
    return (codigosPostales[ciudad] ?? []).sort();
  }

  /**
   * Validates that a (province, city, postal code) combination is
   * consistent according to the loaded dataset.
   * @param provincia Province name.
   * @param ciudad City name.
   * @param codigoPostal Postal code to validate.
   * @returns Promise resolving to `{ valido: true }` if valid, or
   * `{ valido: false, error }` with a descriptive (Spanish) error message
   * otherwise.
   */
  async validarUbicacion(provincia: string, ciudad: string, codigoPostal: string): Promise<{ valido: boolean; error?: string }> {
    await this.ensureLoaded();
    const prov = this.locationsData[provincia];

    if (!prov) {
      return { valido: false, error: 'Provincia no válida' };
    }

    if (!prov.ciudades.includes(ciudad)) {
      return { valido: false, error: `${ciudad} no es una ciudad válida en ${provincia}` };
    }

    const codigosPostales = prov.codigosPostales as Record<string, string[]>;
    const codigosValidos = (codigosPostales[ciudad] ?? []) as string[];
    if (!codigosValidos.includes(codigoPostal)) {
      return { valido: false, error: `${codigoPostal} no es un código postal válido para ${ciudad}, ${provincia}` };
    }

    return { valido: true };
  }

  /**
   * Finds the (province, city) pair matching a given postal code by
   * scanning the loaded dataset.
   * @param codigoPostal Postal code to look up.
   * @returns Promise resolving to `{ provincia, ciudad }` if found, or null otherwise.
   */
  async findUbicacionByCodigoPostal(codigoPostal: string): Promise<{ provincia: string; ciudad: string } | null> {
    await this.ensureLoaded();
    for (const [provincia, provData] of Object.entries(this.locationsData)) {
      const codigosPostales = provData.codigosPostales as Record<string, string[]>;
      for (const [ciudad, codigos] of Object.entries(codigosPostales)) {
        if (codigos && Array.isArray(codigos) && codigos.includes(codigoPostal)) {
          return { provincia, ciudad };
        }
      }
    }
    return null;
  }

  /**
   * Resolves approximate lat/lng coordinates for a (city, province) pair
   * using the public Nominatim (OpenStreetMap) geocoding API. Results are
   * cached in-memory per "city-province" key to reduce external calls;
   * failed/empty lookups are cached as null too.
   * HTTP: GET https://nominatim.openstreetmap.org/search (third-party API, not our backend)
   * @param provincia Province name.
   * @param ciudad City name.
   * @returns Promise resolving to `{ lat, lng }`, or null if not found or on error/timeout (5s timeout).
   */
  async getCoordinates(provincia: string, ciudad: string): Promise<{ lat: number; lng: number } | null> {
    const cacheKey = `${ciudad}-${provincia}`;

    if (cacheKey in this.coordinatesCache) {
      return this.coordinatesCache[cacheKey];
    }

    try {
      const query = `${ciudad}, ${provincia}, España`;
      const encodedQuery = encodeURIComponent(query);

      const response = await firstValueFrom(
        this.http.get<any[]>(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodedQuery}`,
          {
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'ToyBox-App/1.0'
            }
          }
        ).pipe(timeout(5000))
      );

      if (response && response.length > 0) {
        const result = {
          lat: parseFloat(response[0].lat),
          lng: parseFloat(response[0].lon)
        };

        this.coordinatesCache[cacheKey] = result;
        return result;
      } else {
        this.coordinatesCache[cacheKey] = null;
        return null;
      }
    } catch (error) {
      this.coordinatesCache[cacheKey] = null;
      return null;
    }
  }

  /**
   * Clears the in-memory geocoding results cache.
   */
  clearCoordinatesCache(): void {
    this.coordinatesCache = {};
  }

  /**
   * Waits (polling every 100ms, up to ~5s / 50 attempts) until the local
   * location dataset has finished loading, so public methods can safely
   * read `locationsData`.
   * @returns Promise that resolves once loading has completed (or the attempt limit is reached).
   */
  private async ensureLoaded(): Promise<void> {
    let attempts = 0;
    while (!this.loaded && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
  }
}