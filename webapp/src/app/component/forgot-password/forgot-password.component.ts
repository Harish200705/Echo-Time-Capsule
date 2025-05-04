import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css']
})
export class ForgotPasswordComponent {
  email: string = '';
  newPassword: string = '';
  errorMessage: string = '';

  authService = inject(AuthService);
  router = inject(Router);

  onForgetPassword() {
    this.errorMessage = ''; // Clear previous error
    // Validate inputs
    if (!this.email || !this.newPassword) {
      console.warn('[WARN] Form validation failed: Email or password missing', {
        email: this.email,
        newPassword: this.newPassword,
        timestamp: new Date().toISOString()
      });
      this.errorMessage = 'Please enter your registered email and new password.';
      return;
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) {
      console.warn('[WARN] Invalid email format', {
        email: this.email,
        timestamp: new Date().toISOString()
      });
      this.errorMessage = 'Please enter a valid email address.';
      return;
    }

    // Password length validation
    if (this.newPassword.length < 6) {
      console.warn('[WARN] Password too short', {
        newPassword: this.newPassword,
        timestamp: new Date().toISOString()
      });
      this.errorMessage = 'Password must be at least 6 characters.';
      return;
    }

    console.log('[DEBUG] Submitting password reset request', {
      email: this.email,
      newPassword: this.newPassword,
      timestamp: new Date().toISOString()
    });

    this.authService.onForgetPassword(this.email, this.newPassword).subscribe({
      next: (response) => {
        console.log('[DEBUG] Password reset successful', {
          response,
          timestamp: new Date().toISOString()
        });
        this.router.navigate(['/login']);
      },
      error: (error) => {
        console.error('[ERROR] Password reset failed', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          errorDetails: error.error,
          timestamp: new Date().toISOString()
        });
        // Handle backend error messages
        this.errorMessage = error.status === 501
          ? 'Password reset is not implemented on the server. Please contact support.'
          : error.status === 404
          ? error.error?.message || 'Email not registered.'
          : error.status === 400
          ? error.error?.message || 'Invalid request. Please try again.'
          : 'An error occurred during password reset. Please try again.';
      }
    });
  }

  toLogin(): void {
    this.router.navigate(['/login']);
  }
}