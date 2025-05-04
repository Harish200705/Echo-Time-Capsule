import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  private authStatus = new BehaviorSubject<boolean>(false);
  authStatus$ = this.authStatus.asObservable();

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    if (isPlatformBrowser(this.platformId)) {
      this.authStatus.next(!!localStorage.getItem('token'));
    }
  }

  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  register(userData: {
    name: string;
    email: string;
    password: string;
    isAdmin: boolean;
    dob: string;
    gender: string;
    phone: string;
  }): Observable<any> {
    console.log('[INFO] Registering user:', { email: userData.email, name: userData.name });
    return this.http.post(`${this.apiUrl}/user/register`, userData, { observe: 'response' }).pipe(
      tap((response) => {
        console.log('[INFO] Registration response:', response.body);
      }),
      catchError((error) => {
        console.error('[ERROR] Registration failed:', {
          status: error.status,
          statusText: error.statusText,
          url: error.url,
          message: error.message,
          error: error.error
        });
        const errorMessage = error.status === 404
          ? 'Registration service unavailable'
          : error.error?.message || 'An error occurred during registration';
        return throwError(() => new Error(errorMessage));
      })
    );
  }

  login(userData: {
    email: string;
    password: string;
  }): Observable<any> {
    console.log('[INFO] Logging in user:', { email: userData.email });
    return this.http.post(`${this.apiUrl}/user/login`, userData).pipe(
      tap((response: any) => {
        this.handleLoginResponse(response);
      }),
      catchError((error) => {
        console.error('[ERROR] Login failed:', {
          status: error.status,
          statusText: error.statusText,
          url: error.url,
          message: error.message,
          error: error.error
        });
        return throwError(error);
      })
    );
  }

  handleLoginResponse(response: any): void {
    if (response.token && response.user) {
      if (this.isBrowser()) {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify({
          id: response.user.id.toString(),
          name: response.user.name,
          email: response.user.email,
          isAdmin: response.user.isAdmin,
          profilePhotoUrl: response.user.profilePhotoUrl
        }));
      }
      this.authStatus.next(true);
    } else {
      this.logout(); // Clear any stale data on invalid response
      throw new Error('Invalid login response: missing token or user data');
    }
  }

  get isLoggedIn(): boolean {
    return this.isBrowser() ? !!localStorage.getItem('token') : false;
  }

  isAuthenticated(): boolean {
    return this.isBrowser() ? !!localStorage.getItem('token') : false;
  }

  getToken(): string | null {
    return this.isBrowser() ? localStorage.getItem('token') : null;
  }

  get isAdmin(): boolean {
    if (!this.isBrowser()) return false;
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData).isAdmin : false;
  }

  get userName(): string | null {
    if (!this.isBrowser()) return null;
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData).name : null;
  }

  get userEmail(): string | null {
    if (!this.isBrowser()) return null;
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData).email : null;
  }

  get userProfilePhoto(): string | null {
    if (!this.isBrowser()) return null;
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData).profilePhotoUrl || null : null;
  }

  onForgetPassword(email: string, newPassword: string): Observable<any> {
    console.log('[INFO] Requesting password reset:', { email, newPassword });
    return this.http.post(`${this.apiUrl}/user/forgot-password`, { email, newPassword }).pipe(
      tap((response) => {
        console.log('[INFO] Password reset response:', response);
      }),
      catchError((error) => {
        console.error('[ERROR] Password reset failed:', {
          status: error.status,
          statusText: error.statusText,
          url: error.url,
          message: error.message,
          error: error.error
        });
        return throwError(() => error); // Preserve original error
      })
    );
  }

  logout(): void {
    if (this.isBrowser()) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    this.authStatus.next(false);
    console.log('[INFO] User logged out');
  }

  getUser(): any {
    if (!this.isBrowser()) return null;
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsed = JSON.parse(userData);
      parsed.id = parsed.id.toString();
      return parsed;
    }
    return null;
  }
}