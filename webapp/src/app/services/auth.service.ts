import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl + "/user/register";

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
    return this.http.post(environment.apiUrl + "/user/register", userData);
  }

  login(userData: {
    email: string;
    password: string;
  }): Observable<any> {
    return this.http.post(environment.apiUrl + '/user/login', userData);
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  }

  get isLoggedIn() {
    let token = localStorage.getItem('token');
    if (token) {
      return true;
    }
    return false;
  }
  get isAdmin() {
    let userData = localStorage.getItem('user');
    if (userData) {
      return JSON.parse(userData).isAdmin;
    }
    return false;
  }

  get userName() {
    let userData = localStorage.getItem('user');
    if (userData) {
      return JSON.parse(userData).name;
    }
    return null;
  }
  get userEmail() {
    let userData = localStorage.getItem('user');
    if (userData) {
      return JSON.parse(userData).email;
    }
    return null;
  }

  onForgetPassword(email: string, newPassword: string) {
    return this.http.post(environment.apiUrl + '/user/forgot-password', { email, newPassword });
  }
  
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
}

