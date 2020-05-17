import { Component, OnInit, ViewChild, ElementRef, Input } from '@angular/core';

import { Message } from '../common/message';
import { User } from '../common/user';
import { Event, SocketService } from '../socket.service';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';

// Default public room. All users will join and listen to messages sent to it. 
const MAIN_ROOM = "main-room";

@Component({
  selector: 'tcc-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnInit {
  @Input()
  user: User;
  userCount: number;
  messages: Message[] = [];
  ioConnection: any;

  // In socket.io, each socket automatically joins a room identified by its own id.
  // Thus, we'll keep track of the socketIds and store the messages associated with them.
  // socketId => Message[]
  currentRoom: string;
  rooms = new Map();

  textarea = new FormControl();

  isUserTyping = false;
  isScrolledToBottom = true;
  oldMessagesLength = 0;

  statusBarMessageMap = new Map();

  usersOnline = {};

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

    this.rooms.clear();
    this.rooms.set(MAIN_ROOM, []);
    this.enterMainRoom();

    this.user = new User(username);
    this.initIoConnection();
  }

  ngAfterViewChecked(): void {
    if (this.messages && this.messages.length - this.oldMessagesLength > 0 && this.isScrolledToBottom) {
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

  changeUsername(newName) {
    if (newName && this.user.name != newName) {
      this.user.name = newName;
      this.socketService.changeUserName(newName);
    }
  }

  get statusBarMessage() {
   return [...this.statusBarMessageMap.values()].join(' '); 
  }

  resetStatusBar() {
    this.statusBarMessageMap = new Map();
  }

  enterRoom(room: string) {
    if (this.currentRoom === room) {
      return;
    }

    console.log(`enter room ${room}`)
    this.currentRoom = room;
    this.messages = this.rooms.get(this.currentRoom);

    this.resetStatusBar();
  }

  enterMainRoom() {
    this.enterRoom(MAIN_ROOM);
  }

  getRoomName() {
    if (this.currentRoom === MAIN_ROOM) {
      return "Main room";
    }
    return this.usersOnline[this.currentRoom].name;
  }

  private initIoConnection(): void {
    this.socketService.initSocket();

    this.ioConnection = this.socketService.onMessage()
      .subscribe((message: Message) => this.handleMessage(message));

    this.socketService.onEvent(Event.CONNECT)
      .subscribe(() => this.socketService.emitUserJoined(this.user));

    this.socketService.onUserJoined()
      .subscribe(userJoined => {
        let m: Message = {
          user: userJoined.user,
          sender: null,
          recipient: MAIN_ROOM,
          content: "joined the conversation",
        };
        this.handleMessage(m);
      });

    this.socketService.onUserLeft()
      .subscribe(userLeft => {
        let m: Message = {
          user: userLeft.user,
          sender: null,
          recipient: MAIN_ROOM,
          content: "left the conversation",
        };
        this.handleMessage(m);
        // remove room clean up messages
        this.rooms.delete(userLeft.socketId);
      });


    this.socketService.onUsersOnline()
      .subscribe(usersOnline => {
        this.userCount = Object.keys(usersOnline).length;
        // remove myself from the users online map
        delete usersOnline[this.socketService.socketId];
        this.usersOnline = usersOnline;

        for (let [socketId, user] of Object.entries(this.usersOnline)) {
          if (!this.rooms.has(socketId)) {
            this.rooms.set(socketId, []);
          }
        }
      });

    this.socketService.onUserTyping()
      .subscribe(data => {
        if(data.room === this.currentRoom || data.sender === this.currentRoom) {
          let name = this.usersOnline[data.sender].name;
          this.statusBarMessageMap.set(data.sender, `<i>${name} is typing...</i>`);
        }
      });

      
    this.socketService.onUserResetTyping()
      .subscribe(data => {
        if(data.room === this.currentRoom || data.sender === this.currentRoom) {
          this.statusBarMessageMap.delete(data.sender);
        }
      });
  }

  handleMessage(message: Message) {
    let room = this.currentRoom;
    if (message.sender !== this.socketService.socketId) {
      room = message.recipient;
      if(room !== MAIN_ROOM) {
        room = message.sender;
      }
    }
    
    let messages = this.rooms.get(room);
    if (!messages) {
      console.warn("could not handle room = " + room);
      console.warn("ignoring message = ");
      console.log(message);
      return;
    }

    if (room === this.currentRoom) {
      this.isScrolledToBottom = this.checkScrolledToBottom();
      this.oldMessagesLength = this.messages.length;
    }

    messages.push(message);
  }

  onSendMessage() {
    this.sendMessage(this.textarea.value);
    this.textarea.setValue("");
  }

  typing() {
    console.log("typing!");
    this.socketService.typing(this.currentRoom);
    this.isUserTyping = true;
  }

  resetTyping() {
    console.log("not typing anymore...");
    this.socketService.resetTyping(this.currentRoom);
    this.isUserTyping = false;
  }

  onTyping() {
    let content = this.textarea.value;

    if (content && content.trim() !== "" && !this.isUserTyping) {
      this.typing();
    }

    if ((!content || content.trim() === "") && this.isUserTyping) {
      this.resetTyping();
    }
  }

  public sendMessage(content: string): void {
    if (!content) {
      return;
    }

    let message: Message = {
      user: this.user,
      sender: this.socketService.socketId,
      recipient: this.currentRoom,
      content: content,      
    };
    this.handleMessage(message);

    this.socketService.send(message);

    this.resetTyping();
  }

}