import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { ChatList } from './chat-list';
import { ChatService } from '../../../core/services/chat.service';
import { AuthService } from '../../../core/services/auth.service';

describe('ChatList', () => {
  let component: ChatList;
  let fixture: ComponentFixture<ChatList>;
  let chatServiceMock: { getMyChats: ReturnType<typeof vi.fn> };
  let authServiceMock: { isLoggedIn: ReturnType<typeof vi.fn>; currentUser: ReturnType<typeof vi.fn> };
  let router: Router;

  const rawChats = [
    {
      id_conversations: 1,
      fk_seller_id: 5,
      buyer_username: 'comprador1',
      seller_username: 'vendedor1',
      item_title: 'Coche de juguete',
      item_photo: 'foto.jpg',
      last_message: 'Hola, ¿sigue disponible?',
      created_at: '2026-01-01',
      unread_count: 2,
    },
  ];

  beforeEach(async () => {
    chatServiceMock = { getMyChats: vi.fn().mockReturnValue(of(rawChats)) };
    authServiceMock = {
      isLoggedIn: vi.fn().mockReturnValue(true),
      currentUser: vi.fn().mockReturnValue({ id_users: 1 }),
    };

    await TestBed.configureTestingModule({
      imports: [ChatList],
      providers: [
        provideRouter([]),
        { provide: ChatService, useValue: chatServiceMock },
        { provide: AuthService, useValue: authServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ChatList);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('mapea las conversaciones devueltas por el servicio a ChatItem', () => {
    fixture.detectChanges();

    expect(component.conversations.length).toBe(1);
    expect(component.conversations[0]).toEqual(
      expect.objectContaining({
        id_conversations: 1,
        otherUserName: 'vendedor1',
        itemTitle: 'Coche de juguete',
        lastMessage: 'Hola, ¿sigue disponible?',
        unreadCount: 2,
      })
    );
  });

  it('usa el nombre del comprador como otherUserName cuando el usuario actual es el vendedor', () => {
    authServiceMock.currentUser.mockReturnValue({ id_users: 5 });

    fixture.detectChanges();

    expect(component.conversations[0].otherUserName).toBe('comprador1');
  });

  it('usa el nombre del vendedor como otherUserName cuando el usuario actual es el comprador', () => {
    authServiceMock.currentUser.mockReturnValue({ id_users: 1 });

    fixture.detectChanges();

    expect(component.conversations[0].otherUserName).toBe('vendedor1');
  });

  it('filteredConversations filtra por búsqueda de texto', () => {
    fixture.detectChanges();

    component.searchQuery = 'coche';
    expect(component.filteredConversations.length).toBe(1);

    component.searchQuery = 'inexistente';
    expect(component.filteredConversations.length).toBe(0);
  });

  it('openConversation navega a /chat/:id y guarda el id seleccionado', () => {
    fixture.detectChanges();

    component.openConversation(1);

    expect(component.selectedConversationId).toBe(1);
    expect(router.navigate).toHaveBeenCalledWith(['/chat', 1]);
  });

  it('initializeBreadcrumbs usa /catalog como inicio si el usuario está logueado', () => {
    authServiceMock.isLoggedIn.mockReturnValue(true);

    fixture.detectChanges();

    expect(component.breadcrumbItems[0].route).toBe('/catalog');
  });

  it('initializeBreadcrumbs usa /home como inicio si el usuario no está logueado', () => {
    authServiceMock.isLoggedIn.mockReturnValue(false);

    fixture.detectChanges();

    expect(component.breadcrumbItems[0].route).toBe('/home');
  });
});
