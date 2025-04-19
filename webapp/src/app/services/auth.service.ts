import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl + '/user/register';

  constructor(private http: HttpClient) {}

  register(userData: {
    name: string;
    email: string;
    password: string;
    isAdmin: boolean;
    dob: string;
    gender: string;
    phone: string;
  }): Observable<any> {
    return this.http.post(environment.apiUrl + '/user/register', userData);
  }

  login(userData: {
    email: string;
    password: string;
  }): Observable<any> {
    return this.http.post(environment.apiUrl + '/user/login', userData);
  }

  // New method to handle login response
  handleLoginResponse(response: any): void {
    if (response.token && response.user) {
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
    } else {
      throw new Error('Invalid login response: missing token or user data');
    }
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  get isLoggedIn(): boolean {
    let token = localStorage.getItem('token');
    if (token) {
      return true;
    }
    return false;
  }

  get isAdmin(): boolean {
    let userData = localStorage.getItem('user');
    if (userData) {
      return JSON.parse(userData).isAdmin;
    }
    return false;
  }

  get userName(): string | null {
    let userData = localStorage.getItem('user');
    if (userData) {
      return JSON.parse(userData).name;
    }
    return null;
  }

  get userEmail(): string | null {
    let userData = localStorage.getItem('user');
    if (userData) {
      return JSON.parse(userData).email;
    }
    return null;
  }

  onForgetPassword(email: string, newPassword: string): Observable<any> {
    return this.http.post(environment.apiUrl + '/user/forgot-password', { email, newPassword });
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  getUser(): any {
    let userData = localStorage.getItem('user');
    if (userData) {
      return JSON.parse(userData);
    }
    return null;
  }
}