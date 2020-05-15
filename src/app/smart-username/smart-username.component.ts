import { Component, OnInit, Input, Output, EventEmitter, HostListener } from '@angular/core';

@Component({
  selector: 'my-smart-username',
  templateUrl: './smart-username.component.html',
  styleUrls: ['./smart-username.component.scss']
})
export class SmartUsernameComponent implements OnInit {

  editUsername = false;

  @Input() username;

  @Output() usernameChange = new EventEmitter();

  constructor() { }

  ngOnInit(): void {
  }

  @HostListener('document:keydown.enter', ['$event'])
  handleUsernameChange(event) {
    this.usernameChange.emit(event.target.value);
    this.editUsername = false;
  }

}
