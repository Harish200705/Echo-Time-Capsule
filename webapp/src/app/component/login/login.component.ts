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

  onSubmit() {
    if (this.loginForm.invalid) {
      return;
    }

    console.log("Sending login request:", this.loginForm.value);

    this.authService.login(this.loginForm.value).subscribe({
      next: (response) => {
        console.log("User logged in successfully:", response);
        //alert("Login successful!");
        this.router.navigate(['']);
      },
      error: (error) => {
        console.error("Login error:", error);
        alert("Invalid credentials or server error.");
      },
      complete: () => {
        console.log("Login request completed.");
      }
    });
  }

  onCreateAccount(): void {
    console.log('Navigating to signup...');
    this.router.navigate(['/register']);
  }

  onForgetPassword(): void {
    console.log('Navigating to forgot password...');
    this.router.navigate(['/forgot-password']);
  }
}
