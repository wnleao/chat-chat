import { Component, OnInit, ViewChild, ElementRef, Input } from '@angular/core';

import { Message } from '../common/message';
import { User } from '../common/user';
import { Event, SocketService } from '../socket.service';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'tcc-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnInit {
  @Input()
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

  constructor(
    private socketService: SocketService,
    private router: Router
  ) {
  }

  ngOnInit(): void {
    let username = sessionStorage.getItem("USERNAME");
    if (!username) {
      this.router.navigate(['/']);
    }
    this.user = new User(username);
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
    if (this.isScrolledToBottom) {
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
        this.socketService.emitUserJoined(this.user);
      });

    this.socketService.onUserJoined()
      .subscribe((user: User) => {
        let m: Message = {
          from: user,
          content: `joined the conversation` 
        };
        this.handleMessage(m);
      });

    this.socketService.onUserLeft()
      .subscribe((user: User) => {
        let m: Message = {
          from: user,
          content: `left the conversation` 
        };
        this.handleMessage(m);
      });

    this.socketService.onEvent(Event.TYPING)
      .subscribe(() => {
        console.log('user is typing...');
        this.statusBarMessage = "<i>User is typing...</i>";
      });

    this.socketService.onEvent(Event.RESET_TYPING)
      .subscribe(() => {
        console.log('user is not typing anymore...');
        this.statusBarMessage = "";
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

  onTyping() {
    let content = this.textarea.value;
    console.log(content);

    if (content && content.trim() !== "" && !this.isUserTyping) {
      console.log("typing!");
      this.socketService.typing();
      this.isUserTyping = true;
    }

    if (content.trim() === "" && this.isUserTyping) {
      this.socketService.resetTyping();
      console.log("not typing anymore...");
      this.isUserTyping = false;
    }
  }

  public sendMessage(content: string): void {
    if (!content) {
      return;
    }

    let message: Message = {
      from: this.user,
      content: content
    };
    this.handleMessage(message);

    console.log("message sent...");
    this.socketService.send(message);
    this.messageContent = null;
  }

}