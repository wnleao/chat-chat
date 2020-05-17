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
  USERS_ONLINE = 'users_online',
  CHANGE_USERNAME = 'change_username',
}

@Injectable()
export class SocketService {
  private socket;

  public initSocket(): void {
    this.socket = socketIo(environment.SERVER_URL);
  }

  public get socketId() {
    return this.socket.id;
  }

  public send(message: Message): void {
    this.socket.emit(Event.MESSAGE, message);
  }

  public typing(room: string): void {
    this.handleTyping(Event.TYPING, room);
  }

  public resetTyping(room: string): void {
    this.handleTyping(Event.RESET_TYPING, room);
  }

  private handleTyping(event: Event, room: string) {
    this.socket.emit(event, {sender: this.socketId, room: room});
  }

  public changeUserName(username: string): void {
    this.socket.emit(Event.CHANGE_USERNAME, username);
  }

  public emitUserJoined(user: User): void {
    this.socket.emit(Event.USER_JOINED, user);
  }

  public onUserJoined(): Observable<any> {
    return new Observable<any>(observer => {
      this.socket.on(Event.USER_JOINED, (payload) => observer.next(payload));
    });
  }

  public onUserLeft(): Observable<any> {
    return new Observable<any>(observer => {
      this.socket.on(Event.USER_LEFT, (payload) => observer.next(payload));
    });
  }

  public onUsersOnline(): Observable<any> {
    return new Observable<any>(observer => {
      this.socket.on(Event.USERS_ONLINE, (payload) => observer.next(payload));
    });
  }

  public onMessage(): Observable<Message> {
    return new Observable<Message>(observer => {
      this.socket.on(Event.MESSAGE, (data: Message) => observer.next(data));
    });
  }

  public onUserTyping(): Observable<any> {
    return new Observable<any>(observer => {
      this.socket.on(Event.TYPING, (data) => observer.next(data));
    });
  }

  public onUserResetTyping(): Observable<any> {
    return new Observable<any>(observer => {
      this.socket.on(Event.RESET_TYPING, (data) => observer.next(data)); 
    });
  }

  public onEvent(event: Event): Observable<any> {
    return new Observable<Event>(observer => {
      this.socket.on(event, () => observer.next());
    });
  }
}
