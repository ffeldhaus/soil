import {Component} from '@angular/core';
import {FormControl, FormGroupDirective, NgForm, Validators, FormGroup, FormBuilder} from '@angular/forms';
import {ErrorStateMatcher} from '@angular/material/core';

import {AngularTokenService} from 'angular-token';

import templateString from './register.component.html';

export class RegisterErrorStateMatcher implements ErrorStateMatcher {
  isErrorState(control: FormControl | null, form: FormGroupDirective | NgForm | null): boolean {
    const invalidCtrl = !!(control && control.invalid && control.parent.dirty);
    const invalidParent = !!(control && control.parent && control.parent.invalid && control.parent.dirty);

    return (invalidCtrl || invalidParent);
  }
}

@Component({
  template: templateString,
})
export class RegisterComponent {
  constructor(
      private formBuilder: FormBuilder,
      private tokenService: AngularTokenService
  ) {
    this.registerForm = this.formBuilder.group({
      firstName: ['', [Validators.required, Validators.maxLength(128)]],
      lastName: ['', [Validators.required, Validators.maxLength(128)]],
      institution: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(128)]],
      email: ['', [Validators.email, Validators.maxLength(128)]],
      password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]],
      confirmPassword: [''],
    }, {validator: this.checkPasswords});
  }

  registerForm: FormGroup;
  matcher = new RegisterErrorStateMatcher();

  ngOnInit() {
  }

  register() {
    this.tokenService.registerAccount({
          userType: 'ADMIN',
          firstName: this.registerForm.controls.firstName.value,
          lastName: this.registerForm.controls.lastName.value,
          institution: this.registerForm.controls.institution.value,
          login: this.registerForm.controls.email.value,
          password: this.registerForm.controls.password.value,
          passwordConfirmation: this.registerForm.controls.confirmPassword.value
        }
    ).subscribe(
        res => console.log(res),
        error => console.log(error)
    )
  }

  checkPasswords(group: FormGroup) {
    let pass = group.controls.password.value;
    let confirmPass = group.controls.confirmPassword.value;

    return pass === confirmPass ? null : {notSame: true}
  }
}