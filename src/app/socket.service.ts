import { Injectable } from '@angular/core';
import { Message } from './common/message';

import * as socketIo from 'socket.io-client';
import { Observable } from 'rxjs';

import { environment } from '../environments/environment';
import { User } from './common/user';

// Socket.io events
export enum Event {
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  MESSAGE = 'message',
  TYPING = 'typing',
  RESET_TYPING = 'reset_typing',
  USER_JOINED = 'user_joined',
  USER_LEFT = 'user_left',
}

@Injectable()
export class SocketService {
  private socket;

  public initSocket(): void {
    this.socket = socketIo(environment.SERVER_URL);
  }

  public send(message: Message): void {
    this.socket.emit(Event.MESSAGE, message);
  }

  public typing(): void {
    this.socket.emit(Event.TYPING);
  }

  public emitUserJoined(user: User): void {
    this.socket.emit(Event.USER_JOINED, user);
  }

  public resetTyping(): void {
    this.socket.emit(Event.RESET_TYPING);
  }

  public onUserJoined(): Observable<User> {
    return new Observable<User>(observer => {
      this.socket.on(Event.USER_JOINED, (user: User) => observer.next(user));
    });
  }

  public onUserLeft(): Observable<User> {
    return new Observable<User>(observer => {
      this.socket.on(Event.USER_LEFT, (user: User) => observer.next(user));
    });
  }

  public onMessage(): Observable<Message> {
    return new Observable<Message>(observer => {
      this.socket.on(Event.MESSAGE, (data: Message) => observer.next(data));
    });
  }

  public onEvent(event: Event): Observable<any> {
    return new Observable<Event>(observer => {
      this.socket.on(event, () => observer.next());
    });
  }
}
