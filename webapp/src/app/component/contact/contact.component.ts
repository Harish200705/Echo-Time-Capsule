import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Location } from '@angular/common'; // Add Location
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.css'],
})
export class ContactComponent implements OnInit {
  queryMessage: string = '';
  errorMessage: string | null = null;
  successMessage: string | null = null;
  private backendUrl: string = 'https://echo-backend-ty41.onrender.com';
  private debugMode: boolean = true;

  constructor(
    private http: HttpClient,
    private router: Router,
    private location: Location, // Add Location
    private authService: AuthService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    this.checkAuthStatus();
  }

  private checkAuthStatus(): void {
    if (isPlatformBrowser(this.platformId)) {
      const isAuthenticated = this.authService.isAuthenticated();
      console.log('[DEBUG] isAuthenticated:', isAuthenticated);

      if (!isAuthenticated) {
        console.log('[INFO] Not authenticated, redirecting to login');
        this.router.navigate(['/login']);
      }
    }
  }

  submitQuery(): void {
    if (!isPlatformBrowser(this.platformId)) {
      console.log('[INFO] submitQuery skipped on server');
      return;
    }

    if (!this.queryMessage.trim()) {
      this.errorMessage = 'Please enter a query or feedback';
      this.successMessage = null;
      console.log('[ERROR] Query message is empty');
      return;
    }

    const token = this.authService.getToken();
    console.log('[DEBUG] submitQuery token:', { token: token ? token.substring(0, 20) + '...' : 'null' });
    if (!token) {
      console.log('[INFO] No token found, redirecting to login');
      this.router.navigate(['/login']);
      return;
    }

    this.http
      .post(
        `${this.backendUrl}/user/queries`,
        { message: this.queryMessage },
        {
          headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
        }
      )
      .subscribe({
        next: (response: any) => {
          this.successMessage = 'Query submitted successfully';
          this.errorMessage = null;
          this.queryMessage = '';
          console.log('[DEBUG] Query submitted:', response);
        },
        error: (err) => {
          console.error('[ERROR] Error submitting query:', err);
          const errorMessage = err.error?.message || err.message || 'Unknown server error';
          this.errorMessage = `Error submitting query: ${errorMessage}`;
          this.successMessage = null;
          if (err.status === 401) {
            this.authService.logout();
            this.router.navigate(['/login']);
          }
        },
      });
  }

  goBack(): void {
    if (isPlatformBrowser(this.platformId)) {
      console.log('[INFO] Navigating back');
      this.location.back();
    }
  }

  signOut(): void {
    if (isPlatformBrowser(this.platformId)) {
      console.log('[INFO] Signing out...');
      this.authService.logout();
      this.router.navigate(['/login']);
    }
  }
}
