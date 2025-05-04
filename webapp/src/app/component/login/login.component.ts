import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  host: { 'ngSkipHydration': '' }
})
export class LoginComponent {
  passwordFieldType: string = 'password';
  loginForm: FormGroup;
  errorMessage: string | null = null;

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
      rememberMe: [false]
    });
  }

  togglePasswordVisibility(): void {
    this.passwordFieldType = this.passwordFieldType === 'password' ? 'text' : 'password';
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      console.log('[DEBUG] Form invalid, marking all as touched');
      this.loginForm.markAllAsTouched();
      console.log('[DEBUG] Email touched:', this.loginForm.controls['email'].touched);
      console.log('[DEBUG] Password touched:', this.loginForm.controls['password'].touched);
      return;
    }

    this.errorMessage = null;
    console.log('[INFO] Sending login request:', this.loginForm.value);

    this.authService.login(this.loginForm.value).subscribe({
      next: (response) => {
        console.log('[INFO] User logged in successfully:', response);
        try {
          this.authService.handleLoginResponse(response);
          const isAdmin = this.authService.isAdmin;
          console.log('[INFO] User isAdmin:', isAdmin);
          const navigationPath = isAdmin ? '/admin' : '/home'; // Updated to use '/home' for non-admins
          console.log('[INFO] Navigating to:', navigationPath);
          this.router.navigate([navigationPath]);
        } catch (error) {
          console.error('[ERROR] Login response error:', error);
          this.errorMessage = 'Login failed: Invalid response from server';
        }
      },
      error: (error) => {
        console.error('[ERROR] Login error:', error);
        console.log('[DEBUG] Login error details:', error.status, error.error);
        this.errorMessage = error.status === 401 ? 'Invalid email or password' :
                           error.status === 400 ? 'Email and password are required' :
                           error.status === 500 ? `Server error: ${error.error?.message || 'Please try again later'}` :
                           'An unexpected error occurred';
      }
    });
  }

  onCreateAccount(): void {
    console.log('[DEBUG] Navigating to signup...');
    this.router.navigate(['/register']);
  }

  onForgetPassword(): void {
    console.log('[DEBUG] Navigating to forgot password...');
    this.router.navigate(['/forgot-password']);
  }
}