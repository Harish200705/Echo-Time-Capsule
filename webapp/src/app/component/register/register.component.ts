import { Component, inject } from '@angular/core';
import { FormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
  host: { 'ngSkipHydration': '' }
})

export class RegisterComponent {
  passwordFieldType: string = 'password';

  registerForm = {
    name: '',
    email: '',
    password: '',
    isAdmin: false,
    dob: '',
    gender: '',
    phone: ''
  };

  authService = inject(AuthService);

  togglePasswordVisibility(): void {
    this.passwordFieldType = this.passwordFieldType === 'password' ? 'text' : 'password';
  }

  onSubmit() {
    if (!this.registerForm.name || !this.registerForm.email || !this.registerForm.password || 
        !this.registerForm.dob || !this.registerForm.gender || !this.registerForm.phone) {
      alert('Please fill all required fields.');
      return;
    }
  
    console.log("Sending registration request:", this.registerForm); // Debugging log
  
    this.authService.register(this.registerForm).subscribe({
      next: (response) => {
        console.log("User registered successfully:", response);
        alert("Registration successful!");
      },
      error: (error) => {
        console.error("Registration error:", error);
        alert("Error during registration.");
      },
      complete: () => {
        console.log("Registration request completed.");
      }
    });
  }
}