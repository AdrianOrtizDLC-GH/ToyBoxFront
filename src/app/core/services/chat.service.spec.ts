import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ChatService } from './chat.service';
import { environment } from '../../../environments/environment';
import { Chat } from '../../shared/interfaces/chat.interface';
import { ChatMessage } from '../../shared/interfaces/message.interface';

describe('ChatService', () => {
  let service: ChatService;
  let httpMock: HttpTestingController;
  const API = `${environment.apiUrl}/chats`;

  const chat: Chat = {
    id_conversations: 1,
    started_date: '2026-01-01',
    fk_items_id: 1,
    fk_seller_id: 2,
    fk_buyer_id: 3,
  };

  const message: ChatMessage = {
    id_messages: 1,
    content: 'Hola',
    sent_date: '2026-01-01',
    read: false,
    fk_users_id_sent: 3,
    fk_users_id_received: 2,
    fk_conversations_id: 1,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ChatService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getMyChats hace GET a /chats', () => {
    service.getMyChats().subscribe(res => expect(res).toEqual([chat]));
    const req = httpMock.expectOne(API);
    expect(req.request.method).toBe('GET');
    req.flush([chat]);
  });

  it('getChatById hace GET a /chats/:id', () => {
    service.getChatById(1).subscribe(res => expect(res).toEqual(chat));
    const req = httpMock.expectOne(`${API}/1`);
    expect(req.request.method).toBe('GET');
    req.flush(chat);
  });

  it('startChat hace POST a /chats con fk_product_id', () => {
    service.startChat(1).subscribe(res => expect(res).toEqual(chat));
    const req = httpMock.expectOne(API);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ fk_product_id: 1 });
    req.flush(chat);
  });

  it('getMessages hace GET a /chats/:id/messages', () => {
    service.getMessages(1).subscribe(res => expect(res).toEqual([message]));
    const req = httpMock.expectOne(`${API}/1/messages`);
    expect(req.request.method).toBe('GET');
    req.flush([message]);
  });

  it('sendMessage hace POST a /chats/:id/messages con el contenido', () => {
    service.sendMessage(1, 'Hola').subscribe(res => expect(res).toEqual(message));
    const req = httpMock.expectOne(`${API}/1/messages`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ content: 'Hola' });
    req.flush(message);
  });

  it('markAsRead hace PATCH a /chats/:id/read', () => {
    service.markAsRead(1).subscribe(res => expect(res).toBeNull());
    const req = httpMock.expectOne(`${API}/1/read`);
    expect(req.request.method).toBe('PATCH');
    req.flush(null);
  });
});
