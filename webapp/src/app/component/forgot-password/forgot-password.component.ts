import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css']
})

export class ForgotPasswordComponent {
  email: string = '';
  newPassword: string = '';

  authService = inject(AuthService);
  router = inject(Router);

  onForgetPassword() {
    if (!this.email || !this.newPassword) {
      alert('Please enter your registered email and new password.');
      return;
    }

    this.authService.onForgetPassword(this.email, this.newPassword).subscribe({
      next: () => {
        alert('Password has been successfully reset.');
      },
      error: () => {
        alert('Error: Unable to reset password. Please try again.');
      }
    });
  }
  toLogin(): void {
    console.log('Navigating to signup...');
    this.router.navigate(['/login']);
  }
}
