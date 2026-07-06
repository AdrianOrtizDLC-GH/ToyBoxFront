import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LocationsService } from './locations.service';

describe('LocationsService', () => {
  let service: LocationsService;
  let httpMock: HttpTestingController;

  const locationsData = {
    Madrid: {
      ciudades: ['Alcorcón', 'Madrid'],
      codigosPostales: {
        Madrid: ['28001', '28002'],
        Alcorcón: ['28921'],
      },
    },
    Sevilla: {
      ciudades: ['Sevilla'],
      codigosPostales: {
        Sevilla: ['41001'],
      },
    },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(LocationsService);
    httpMock = TestBed.inject(HttpTestingController);

    const req = httpMock.expectOne('/assets/data/codigos-postales-españa.json');
    req.flush(locationsData);
  });

  afterEach(() => httpMock.verify());

  it('getProvincias devuelve las provincias ordenadas alfabéticamente', async () => {
    const provincias = await service.getProvincias();
    expect(provincias).toEqual(['Madrid', 'Sevilla']);
  });

  it('getCiudadesByProvincia devuelve las ciudades de una provincia', async () => {
    const ciudades = await service.getCiudadesByProvincia('Madrid');
    expect(ciudades).toEqual(['Alcorcón', 'Madrid']);
  });

  it('getCiudadesByProvincia devuelve array vacío si la provincia no existe', async () => {
    const ciudades = await service.getCiudadesByProvincia('Inexistente');
    expect(ciudades).toEqual([]);
  });

  it('getCodigosPostalesByCity devuelve los códigos postales de una ciudad', async () => {
    const codigos = await service.getCodigosPostalesByCity('Madrid', 'Madrid');
    expect(codigos).toEqual(['28001', '28002']);
  });

  it('validarUbicacion valida correctamente una ubicación existente', async () => {
    const resultado = await service.validarUbicacion('Madrid', 'Madrid', '28001');
    expect(resultado).toEqual({ valido: true });
  });

  it('validarUbicacion falla si la provincia no existe', async () => {
    const resultado = await service.validarUbicacion('Inexistente', 'X', '00000');
    expect(resultado.valido).toBe(false);
    expect(resultado.error).toBe('Provincia no válida');
  });

  it('validarUbicacion falla si la ciudad no pertenece a la provincia', async () => {
    const resultado = await service.validarUbicacion('Madrid', 'Sevilla', '28001');
    expect(resultado.valido).toBe(false);
  });

  it('validarUbicacion falla si el código postal no es válido para la ciudad', async () => {
    const resultado = await service.validarUbicacion('Madrid', 'Madrid', '99999');
    expect(resultado.valido).toBe(false);
  });

  it('findUbicacionByCodigoPostal encuentra provincia y ciudad por código postal', async () => {
    const resultado = await service.findUbicacionByCodigoPostal('41001');
    expect(resultado).toEqual({ provincia: 'Sevilla', ciudad: 'Sevilla' });
  });

  it('findUbicacionByCodigoPostal devuelve null si no encuentra el código postal', async () => {
    const resultado = await service.findUbicacionByCodigoPostal('00000');
    expect(resultado).toBeNull();
  });

  it('clearCoordinatesCache limpia la caché sin lanzar errores', () => {
    expect(() => service.clearCoordinatesCache()).not.toThrow();
  });
});
