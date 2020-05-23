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

  public onConnect(): Observable<any> {
    return this.onEvent(Event.CONNECT);
  }
  
  public onMessage(): Observable<Message> {
    return this.onEvent<Message>(Event.MESSAGE);
  }
  
  public onUserJoined(): Observable<any> {
    return this.onEvent<any>(Event.USER_JOINED);
  }

  public onUserLeft(): Observable<any> {
    return this.onEvent<any>(Event.USER_LEFT);
  }

  public onUsersOnline(): Observable<any> {
    return this.onEvent<any>(Event.USERS_ONLINE);
  }

  public onTyping(): Observable<any> {
    return this.onEvent<any>(Event.TYPING)
  }

  public onResetTyping(): Observable<any> {
    return this.onEvent<any>(Event.RESET_TYPING)
  }

  public onEvent<T>(event: Event): Observable<T> {
    return new Observable<T>(observer => {
      this.socket.on(event, (payload) => observer.next(payload));
    });
  }
}
