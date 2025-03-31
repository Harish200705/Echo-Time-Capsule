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

  onSubmit() {
    if (this.registerForm.invalid) {
      return; // Form errors will be shown in UI
    }

    console.log("Sending registration request:", this.registerForm.value);

    this.authService.register(this.registerForm.value).subscribe({
      next: (response) => {
        console.log("User registered successfully:", response);
        this.router.navigate(['/login']);
      },
      error: (error) => {
        console.error("Registration error:", error);
      }
    });
  }

  toLogin(): void {
    this.router.navigate(['/login']);
  }
}
