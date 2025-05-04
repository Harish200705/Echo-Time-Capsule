import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
  host: { 'ngSkipHydration': '' }
})
export class RegisterComponent {
  passwordFieldType: string = 'password';
  registerForm: FormGroup;
  usernameError: string | null = null;
  emailError: string | null = null;
  generalError: string | null = null;

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  constructor() {
    this.registerForm = this.fb.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      isAdmin: [false],
      dob: ['', [Validators.required]],
      gender: ['', [Validators.required]],
      phone: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]]
    });
  }

  togglePasswordVisibility(): void {
    this.passwordFieldType = this.passwordFieldType === 'password' ? 'text' : 'password';
  }

  resetErrors(): void {
    this.usernameError = null;
    this.emailError = null;
    this.generalError = null;
  }

  onSubmit() {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.resetErrors();
    console.log('[INFO] Sending registration request:', this.registerForm.value);

    this.authService.register(this.registerForm.value).subscribe({
      next: (response) => {
        console.log('[INFO] User registered successfully:', response.body);
        this.router.navigate(['/login']);
      },
      error: (error) => {
        console.error('[ERROR] Registration error:', error);
        const errorMessage = error.message || 'An error occurred during registration';
        if (error.status === 409) {
          if (errorMessage.includes('Username')) {
            this.usernameError = 'Username already exists. Please choose a different one.';
          } else if (errorMessage.includes('Email')) {
            this.emailError = 'Email already exists. Please use a different email.';
          }
        } else {
          this.generalError = errorMessage;
        }
      }
    });
  }

  toLogin(): void {
    this.router.navigate(['/login']);
  }
}