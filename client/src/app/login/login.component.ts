import { Component, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {

  name = new FormControl();

  constructor(private router: Router) { }

  ngOnInit(): void {
  }

  onEnter() {
    let username = this.name.value;
    if (username.trim() === "") {
      username = "Anonymous";
    }
    sessionStorage.setItem("USERNAME", username);

    this.router.navigate(['/chat']);
  }

}
