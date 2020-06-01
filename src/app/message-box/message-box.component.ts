import { Component, OnInit, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { SocketService } from '../socket.service';
import { FormControl } from '@angular/forms';

@Component({
  selector: 'message-box',
  templateUrl: './message-box.component.html',
  styleUrls: ['./message-box.component.scss']
})
export class MessageBoxComponent implements OnInit {

  @Input()
  room;

  @Output()
  send = new EventEmitter();

  isUserTyping = false;

  @ViewChild("textBox") textBox: ElementRef;
  
  constructor(
    private socketService: SocketService,
  ) { }

  ngOnInit(): void {
  }

  typing() {
    console.log("typing!");
    this.socketService.typing(this.room);
    this.isUserTyping = true;
  }

  resetTyping() {
    console.log("not typing anymore...");
    this.socketService.resetTyping(this.room);
    this.isUserTyping = false;
  }

  onSend() {
    let elem = this.textBox.nativeElement;
    let text = elem.innerText;
    if(text && text.trim() !== "") {
      this.send.emit(text);
      this.resetTyping();
    }
    elem.focus();
    elem.innerText = '';
  }

  onTyping() {
    let text = this.textBox.nativeElement.innerText;
    if (text && text.trim() !== "" && !this.isUserTyping) {
      this.typing();
    }

    if ((!text || text.trim() === "") && this.isUserTyping) {
      this.resetTyping();
    }
  }

}
