import { TestBed } from '@angular/core/testing';
import { SocketService } from './socket.service';
import { AuthService } from './auth.service';

// NOTA: deliberadamente NO se mockea el paquete 'socket.io-client' con vi.mock.
// Este proyecto usa el nuevo builder @angular/build:unit-test (Vitest) sin
// aislamiento total de módulos entre archivos de spec: varios componentes
// (Navbar, App) inyectan SocketService de forma real, y si este archivo
// mockea 'socket.io-client' se produce una condición de carrera intermitente
// (flaky) según qué spec cargue primero el módulo real o el mockeado.
// En su lugar, dejamos que `io()` cree una instancia real de Socket (no
// realiza ninguna conexión de red que pueda fallar de forma bloqueante:
// simplemente crea el objeto) y espiamos sus métodos con vi.spyOn.
describe('SocketService', () => {
  let service: SocketService;
  let authServiceMock: { getToken: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    authServiceMock = { getToken: vi.fn() };

    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: authServiceMock }],
    });

    service = TestBed.inject(SocketService);
  });

  afterEach(() => {
    // Cierra cualquier socket real que haya quedado abierto para no dejar
    // handles colgando entre tests.
    service.disconnect();
  });

  it('no conecta si no hay token', () => {
    authServiceMock.getToken.mockReturnValue(null);

    service.connect();

    expect((service as any).socket).toBeNull();
  });

  it('conecta usando el token cuando existe', () => {
    authServiceMock.getToken.mockReturnValue('jwt-token');

    service.connect();

    const socket = (service as any).socket;
    expect(socket).toBeTruthy();
    // socket.io-client expone la opción `auth` tal cual se pasó a `io(...)`.
    expect(socket.auth).toEqual({ token: 'jwt-token' });
  });

  it('no vuelve a conectar si ya está conectado', () => {
    authServiceMock.getToken.mockReturnValue('jwt-token');

    service.connect();
    const firstSocket = (service as any).socket;
    firstSocket.connected = true;

    service.connect();

    // Al seguir "conectado" no se crea una nueva instancia de socket.
    expect((service as any).socket).toBe(firstSocket);
  });

  it('disconnect llama a socket.disconnect() sobre la conexión activa', () => {
    authServiceMock.getToken.mockReturnValue('jwt-token');
    service.connect();
    const socket = (service as any).socket;
    const disconnectSpy = vi.spyOn(socket, 'disconnect');

    service.disconnect();

    expect(disconnectSpy).toHaveBeenCalled();
    expect((service as any).socket).toBeNull();
  });

  it('joinConversation emite join_conversation con el id', () => {
    authServiceMock.getToken.mockReturnValue('jwt-token');
    service.connect();
    const socket = (service as any).socket;
    const emitSpy = vi.spyOn(socket, 'emit');

    service.joinConversation(42);

    expect(emitSpy).toHaveBeenCalledWith('join_conversation', 42);
  });

  it('leaveConversation emite leave_conversation con el id', () => {
    authServiceMock.getToken.mockReturnValue('jwt-token');
    service.connect();
    const socket = (service as any).socket;
    const emitSpy = vi.spyOn(socket, 'emit');

    service.leaveConversation(42);

    expect(emitSpy).toHaveBeenCalledWith('leave_conversation', 42);
  });

  it('joinConversation/leaveConversation no lanzan error si no hay socket activo', () => {
    expect(() => service.joinConversation(1)).not.toThrow();
    expect(() => service.leaveConversation(1)).not.toThrow();
  });
});
