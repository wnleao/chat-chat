import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';

import { Message } from '../common/message';
import { User } from '../common/user';
import { Action, Event, SocketService } from '../socket.service';
import { FormControl } from '@angular/forms';

@Component({
  selector: 'tcc-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnInit {
  action = Action;
  user: User;
  messages: Message[] = [];
  messageContent: string;
  ioConnection: any;

  textarea = new FormControl();

  isUserTyping = false;
  isScrolledToBottom = true;
  oldMessagesLength = 0;

  statusBarMessage = "";

  @ViewChild("messagesBox") messagesBox: ElementRef;

  constructor(private socketService: SocketService) { 
    this.user = new User("John"); 
  }

  ngOnInit(): void {
    this.initIoConnection();
  }

  ngAfterViewChecked(): void {    
    if (this.messages.length - this.oldMessagesLength > 0 && this.isScrolledToBottom) {
      let el = this.messagesBox.nativeElement;
      el.scrollTop = el.scrollHeight - el.clientHeight;
      this.oldMessagesLength = this.messages.length;
    }
  }

  // https://javascript.info/size-and-scroll
  // https://stackoverflow.com/questions/18614301/keep-overflow-div-scrolled-to-bottom-unless-user-scrolls-up
  onScroll(element) {
    this.isScrolledToBottom = this.checkScrolledToBottom();
    if(this.isScrolledToBottom) {
      this.oldMessagesLength = this.messages.length;
    }
  }

  checkScrolledToBottom(): boolean {
    let el = this.messagesBox.nativeElement;
    return el.scrollHeight - el.clientHeight <= el.scrollTop + 1;
  }

  private initIoConnection(): void {
    this.socketService.initSocket();

    this.ioConnection = this.socketService.onMessage()
      .subscribe((message: Message) => this.handleMessage(message));

    this.socketService.onEvent(Event.CONNECT)
      .subscribe(() => {
        this.sendNotification(Action.JOINED);
        console.log('connected');
      });
      
    this.socketService.onEvent(Event.DISCONNECT)
      .subscribe(() => {
        this.sendNotification(Action.LEFT);
        console.log('disconnected');
      });

  }

  handleMessage(message: Message) {
    console.log(message);
    this.isScrolledToBottom = this.checkScrolledToBottom();
    this.oldMessagesLength = this.messages.length;
    this.messages.push(message);
  }

  onSendMessage() {
    this.sendMessage(this.textarea.value);
    this.textarea.setValue("");
  }

  public sendMessage(content: string): void {
    if (!content) {
      return;
    }

    let message = new Message(this.user, content);
    this.handleMessage(message);

    console.log("message sent...");
    this.socketService.send(message);
    this.messageContent = null;
  }

  public sendNotification(action: Action): void {
    console.log("user = " + this.user.name);
    let message = {
      from: this.user,
      content: `${this.user['name']} ${action} the conversation`,
      action: action
    }
    
    this.socketService.send(message);
  }
}