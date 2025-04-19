import { HttpClient } from '@angular/common/http';
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root', // This makes the service available globally
})
export class AuthCapsuleService {
  private apiUrl = environment.apiUrl + '/user';

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  register(userData: {
    name: string;
    email: string;
    password: string;
    isAdmin: boolean;
    dob: string;
    gender: string;
    phone: string;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, userData);
  }

  login(userData: { email: string; password: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, userData);
  }

  isAuthenticated(): boolean {
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }
    return !!localStorage.getItem('token');
  }

  get isLoggedIn(): boolean {
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }
    const token = localStorage.getItem('token');
    return !!token;
  }

  get isAdmin(): boolean {
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }
    const userData = localStorage.getItem('user');
    if (userData) {
      return JSON.parse(userData).isAdmin;
    }
    return false;
  }

  get userName(): string | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    const userData = localStorage.getItem('user');
    if (userData) {
      return JSON.parse(userData).name;
    }
    return null;
  }

  get userEmail(): string | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    const userData = localStorage.getItem('user');
    if (userData) {
      return JSON.parse(userData).email;
    }
    return null;
  }

  onForgetPassword(email: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/forgot-password`, { email, newPassword });
  }

  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }

  setToken(token: string): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('token', token);
    }
  }

  getToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem('token');
    }
    return null;
  }

  setUser(user: any): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('user', JSON.stringify(user));
    }
  }
}