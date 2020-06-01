import { Component, OnInit, ViewChild, ElementRef, Input } from '@angular/core';

import { Message } from '../common/message';
import { MessageState } from '../common/message_state';
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
  messageCount = 0;

  // In socket.io, each socket automatically joins a room identified by its own id.
  // Thus, we'll keep track of the socketIds and store the messages associated with them.
  // socketId => Message[]
  currentRoom: string;

  // map of room_id -> map of uuid -> message
  oldMessages = new Map<string, Map<string, Message>>();

  // map of room_id -> array of new messages
  // All messages that arrive are first pushed into these arrays.
  // Then, when the user selects a given room_id, the messages' states are
  // updated and they are archived in the rooms map above.
  newMessages = new Map<string, Message[]>();

  isScrolledToBottom = true;
  oldMessagesSize = 0;

  statusBarMessageMap = new Map();

  usersOnline = {};

  @ViewChild("messagesBox") messagesBox: ElementRef;

  constructor(
    private socketService: SocketService,
    private router: Router
  ) {
    this.newMessages.set(MAIN_ROOM, []);
    this.oldMessages.set(MAIN_ROOM, new Map());

    this.enterMainRoom();
    this.initIoConnection();
  }

  ngOnInit(): void {
    let username = sessionStorage.getItem("USERNAME");
    if (!username) {
      this.router.navigate(['/']);
    }
    this.user = new User(username);
  }

  get messages() {
    // 1. Check whether there are new messages...
    let newMsgsArray = this.newMessages.get(this.currentRoom);
    let oldMsgsMap = this.oldMessages.get(this.currentRoom);
    if (!newMsgsArray) {
      return oldMsgsMap;
    }

    // 2. Update messages states and store them in the currentRoom archive.
    newMsgsArray.forEach(message => {
      message.state = MessageState.CLIENT_READ;
      oldMsgsMap.set(message.uuid, message);
    });

    // 3. Notify server that the messages were read
    // Currently, only notify server if messages are of a private room.
    if (this.currentRoom !== MAIN_ROOM) {
      newMsgsArray.forEach(message => this.socketService.clientRead(message));
    }

    // 4. Clean up new messages array
    newMsgsArray.length = 0;

    return oldMsgsMap;
  }

  ngAfterViewChecked(): void {
    if (this.messages && this.messages.size - this.oldMessagesSize > 0 && this.isScrolledToBottom) {
      let el = this.messagesBox.nativeElement;
      el.scrollTop = el.scrollHeight - el.clientHeight;
      this.oldMessagesSize = this.messages.size;
    }
  }

  // https://javascript.info/size-and-scroll
  // https://stackoverflow.com/questions/18614301/keep-overflow-div-scrolled-to-bottom-unless-user-scrolls-up
  onScroll(element) {
    this.isScrolledToBottom = this.checkScrolledToBottom();
    if (this.isScrolledToBottom) {
      this.oldMessagesSize = this.messages.size;
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

    this.socketService.onMessage()
      .subscribe(message => {
        // message state 5 - client_received
        this.handleNewMessage(message);
        if (message.room != MAIN_ROOM) {
          this.socketService.clientReceived(message);
        }
      });

    this.socketService.onMessageRegistered()
      .subscribe(data => {
        if (!this.oldMessages.has(data.room)) {
          // ignores event
          return;
        }

        // Find message using the old_id (id gen in the client)
        // to store the uuid gen in the server.
        let messages = this.oldMessages.get(data.room);
        let message = messages.get(data.old_id);
        message.uuid = data.uuid;
        message.state = MessageState.SERVER_RECEIVED;
        messages.delete(data.old_id);
        messages.set(message.uuid, message);
      });

    this.socketService.onClientReceivedMessage()
      .subscribe(message => {
        if (!this.oldMessages.has(message.room)) {
          // ignores event
          return;
        }
        let currentMessage = this.oldMessages.get(message.room).get(message.uuid);
        currentMessage.state = MessageState.CLIENT_RECEIVED;
      });

    this.socketService.onClientReadMessage()
      .subscribe(oldMsg => {
        if (!this.oldMessages.has(oldMsg.room)) {
          // ignores event
          return;
        }
        let currentMessage = this.oldMessages.get(oldMsg.room).get(oldMsg.uuid);
        currentMessage.state = MessageState.CLIENT_READ;
      });

    this.socketService.onConnect()
      .subscribe(() => this.socketService.emitUserJoined(this.user));

    this.socketService.onUserJoined()
      .subscribe(userJoined => {
        let m: Message = {
          uuid: '' + this.messageCount++,
          user: userJoined.user,
          sender: null,
          recipient: null,
          room: MAIN_ROOM,
          content: "joined the conversation",
          state: null,
        };
        this.handleNewMessage(m);
      });

    this.socketService.onUserLeft()
      .subscribe(userLeft => {
        let m: Message = {
          uuid: '' + this.messageCount++,
          user: userLeft.user,
          sender: null,
          recipient: null,
          room: MAIN_ROOM,
          content: "left the conversation",
          state: null,
        };
        this.handleNewMessage(m);
        // remove room clean up messages
        this.oldMessages.delete(userLeft.socketId);
      });

    this.socketService.onUsersOnline()
      .subscribe(usersOnline => {
        this.userCount = Object.keys(usersOnline).length;
        // remove myself from the users online map
        delete usersOnline[this.socketService.socketId];
        this.usersOnline = usersOnline;

        for (let [socketId, user] of Object.entries(this.usersOnline)) {
          if (!this.oldMessages.has(socketId)) {
            this.oldMessages.set(socketId, new Map());
            this.newMessages.set(socketId, []);
          }
        }
      });

    this.socketService.onTyping()
      .subscribe(data => {
        if (data.room === this.currentRoom || data.sender === this.currentRoom) {
          let name = this.usersOnline[data.sender].name;
          this.statusBarMessageMap.set(data.sender, `<i>${name} is typing...</i>`);
        }
      });

    this.socketService.onResetTyping()
      .subscribe(data => {
        if (data.room === this.currentRoom || data.sender === this.currentRoom) {
          this.statusBarMessageMap.delete(data.sender);
        }
      });
  }

  handleNewMessage(message: Message) {
    let room = message.room;
    let newMsgsArray = this.newMessages.get(room);
    if (!newMsgsArray) {
      console.warn("could not handle room = " + room);
      console.warn("ignoring message = ");
      console.log(message);
      return;
    }

    if (room === this.currentRoom) {
      this.isScrolledToBottom = this.checkScrolledToBottom();
      this.oldMessagesSize = this.messages.size;
    }

    newMsgsArray.push(message);
  }

  onSendMessage(message) {
    this.sendMessage(message);
  }

  public sendMessage(content: string): void {
    if (!content) {
      return;
    }

    let room = this.currentRoom;
    if (room !== MAIN_ROOM) {
      // this is a private message and should be stored
      // in the sender's own room
      room = this.socketService.socketId;
    }

    let message: Message = {
      uuid: '' + this.messageCount++,
      user: this.user,
      sender: this.socketService.socketId,
      recipient: this.currentRoom,
      room: room,
      content: content,
      state: MessageState.READY_TO_SEND,
    };

    // message state 1 - ready_to_send

    // storing my own message in current room
    this.messages.set(message.uuid, message);

    this.socketService.send(message);

    message.state = MessageState.CLIENT_SENT;
  }

  public keyValueKeepOriginalOrder() {
    return 0;
  }


}