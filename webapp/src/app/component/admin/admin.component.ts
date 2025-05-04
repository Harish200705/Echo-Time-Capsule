import { Component, OnInit, AfterViewInit, Inject, ChangeDetectorRef, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { Chart } from 'chart.js';
import { registerables } from 'chart.js';

interface Query {
  id: string;
  message: string;
  timestamp: string;
  userId: string;
  resolved: boolean;
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [FormsModule, CommonModule, DatePipe],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css'],
})
export class AdminComponent implements OnInit, AfterViewInit {
  userQueries: Query[] = [];
  selectedQuery: Query | null = null;
  showQueryWindow: boolean = false;
  responseText: string = '';
  showNotificationWindow: boolean = false;
  notificationMessage: string = '';
  errorMessage: string | null = null;
  isLoading: boolean = false; // Added loading state
  private newUsersChart: Chart | null = null;
  private capsulesChart: Chart | null = null;

  private debugMode: boolean = true;
  private backendUrl: string = 'https://echo-backend-ty41.onrender.com';
  private isLogoutInProgress: boolean = false;

  constructor(
    private http: HttpClient,
    private router: Router,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    Chart.register(...registerables);
  }

  ngOnInit(): void {
    this.checkAuthStatus();
    this.initializeComponent();
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.initializeCharts();
      const token = this.authService.getToken();
      console.log('[DEBUG] Token in ngAfterViewInit:', token ? token.substring(0, 20) + '...' : 'null');
    }
  }

  private checkAuthStatus(): void {
    if (isPlatformBrowser(this.platformId)) {
      const isAuthenticated = this.authService.isAuthenticated();
      const isAdmin = this.authService.isAdmin;
      console.log('[DEBUG] isAuthenticated:', isAuthenticated, 'User isAdmin:', isAdmin);

      if (!isAuthenticated) {
        console.log('[INFO] Not authenticated, redirecting to login');
        this.router.navigate(['/login']);
        return;
      }

      if (!isAdmin) {
        console.log('[INFO] User is not an admin, redirecting to home');
        this.router.navigate(['/home']);
        return;
      }
    }
  }

  private initializeComponent(): void {
    if (isPlatformBrowser(this.platformId)) {
      const token = this.authService.getToken();
      console.log('[DEBUG] Token in initializeComponent:', token ? token.substring(0, 20) + '...' : 'null');
      if (!token && this.router.url === '/admin') {
        console.log('[INFO] No token found on /admin, redirecting to login');
        this.router.navigate(['/login']);
      } else if (token) {
        this.fetchUserQueries();
        this.fetchAnalyticsData();
      }
    }
  }

  private fetchUserQueries(): void {
    if (!isPlatformBrowser(this.platformId)) {
      console.log('[INFO] fetchUserQueries skipped on server');
      return;
    }

    this.isLoading = true;
    const token = this.authService.getToken();
    console.log('[DEBUG] fetchUserQueries token:', token ? token.substring(0, 20) + '...' : 'null');
    if (!token) {
      console.log('[INFO] No token found, redirecting to login');
      this.router.navigate(['/login']);
      this.isLoading = false;
      return;
    }

    console.log('[DEBUG] Fetching queries from:', `${this.backendUrl}/api/queries`);
    this.http
      .get<Query[]>(`${this.backendUrl}/api/queries`, {
        headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
      })
      .subscribe({
        next: (queries) => {
          console.log('[DEBUG] Raw queries from backend:', queries);
          this.userQueries = queries.filter(q => !q.resolved);
          console.log('[DEBUG] Filtered user queries:', this.userQueries);
          this.errorMessage = null;
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('[ERROR] Error fetching user queries:', {
            status: err.status,
            statusText: err.statusText,
            message: err.message,
            error: err.error,
          });
          const errorMessage = err.error?.message || err.message || 'Unknown server error';
          this.errorMessage = `Failed to load queries: ${errorMessage}`;
          this.userQueries = [];
          this.isLoading = false;
          this.cdr.detectChanges();
          if (err.status === 401 && !this.isLogoutInProgress) {
            this.isLogoutInProgress = true;
            this.authService.logout();
            this.router.navigate(['/login']);
            this.isLogoutInProgress = false;
          }
        },
      });
  }

  private fetchAnalyticsData(): void {
    if (!isPlatformBrowser(this.platformId)) {
      console.log('[INFO] fetchAnalyticsData skipped on server');
      return;
    }

    const token = this.authService.getToken();
    console.log('[DEBUG] fetchAnalyticsData token:', { token: token ? token.substring(0, 20) + '...' : 'null' });
    if (!token) {
      console.log('[INFO] No token found, redirecting to login');
      this.router.navigate(['/login']);
      return;
    }

    this.http
      .get<{ newUsers: number[]; capsules: number[]; totalUsers: number; totalCapsules: number }>(
        `${this.backendUrl}/api/analytics`,
        {
          headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
        }
      )
      .subscribe({
        next: (data) => {
          console.log('[DEBUG] Analytics data fetched:', data);
          if (
            !data.newUsers.every(val => val === 0) ||
            !data.capsules.every(val => val === 0) ||
            data.totalUsers > 0 ||
            data.totalCapsules > 0
          ) {
            this.updateCharts(data.newUsers, data.capsules);
            this.errorMessage = null;
          } else {
            console.log('[INFO] No analytics data to display, charts remain at default');
            this.errorMessage = 'No data available for the charts';
          }
          if (data.newUsers.every(val => val === 0) && data.totalUsers > 0) {
            console.warn('[WARN] No new users in the last 12 months despite existing users');
          }
          if (data.capsules.every(val => val === 0) && data.totalCapsules > 0) {
            console.warn('[WARN] No capsules in the last 12 months despite existing capsules');
          }
        },
        error: (err) => {
          console.error('[ERROR] Error fetching analytics data:', err);
          const errorMessage = err.error?.message || err.message || 'Unknown server error';
          this.errorMessage = `Error fetching analytics data: ${errorMessage}`;
          if (err.status === 401 && !this.isLogoutInProgress) {
            this.isLogoutInProgress = true;
            this.authService.logout();
            this.router.navigate(['/login']);
            this.isLogoutInProgress = false;
          }
        },
      });
  }

  private initializeCharts(): void {
    const today = new Date();
    const labels = Array(12)
      .fill(0)
      .map((_, i) => {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
        return date.toLocaleString('default', { month: 'short', year: 'numeric' });
      })
      .reverse();

    const newUsersCtx = document.getElementById('newUsersChart') as HTMLCanvasElement;
    if (newUsersCtx) {
      this.newUsersChart = new Chart(newUsersCtx, {
        type: 'bar',
        data: {
          labels,
          datasets: [{ label: 'New Users', data: Array(12).fill(0), backgroundColor: '#28a745' }],
        },
        options: { scales: { y: { beginAtZero: true } } },
      });
      console.log('[DEBUG] New Users Chart initialized with labels:', labels);
    } else {
      console.error('[ERROR] New Users Chart canvas not found');
    }

    const capsulesCtx = document.getElementById('capsulesChart') as HTMLCanvasElement;
    if (capsulesCtx) {
      this.capsulesChart = new Chart(capsulesCtx, {
        type: 'line',
        data: {
          labels,
          datasets: [{ label: 'Capsules', data: Array(12).fill(0), borderColor: '#007bff', tension: 0.1 }],
        },
        options: { scales: { y: { beginAtZero: true } } },
      });
      console.log('[DEBUG] Capsules Chart initialized with labels:', labels);
    } else {
      console.error('[ERROR] Capsules Chart canvas not found');
    }
  }

  private updateCharts(newUsersData: number[], capsulesData: number[]): void {
    if (newUsersData.length !== 12 || capsulesData.length !== 12) {
      console.error('[ERROR] Analytics data length mismatch:', {
        newUsersLength: newUsersData.length,
        capsulesLength: capsulesData.length,
        expected: 12,
      });
      this.errorMessage = 'Invalid analytics data received';
      return;
    }

    if (this.newUsersChart) {
      this.newUsersChart.data.datasets[0].data = newUsersData;
      this.newUsersChart.update();
      console.log('[DEBUG] New Users Chart updated:', newUsersData);
    } else {
      console.error('[ERROR] New Users Chart not initialized');
    }
    if (this.capsulesChart) {
      this.capsulesChart.data.datasets[0].data = capsulesData;
      this.capsulesChart.update();
      console.log('[DEBUG] Capsules Chart updated:', capsulesData);
    } else {
      console.error('[ERROR] Capsules Chart not initialized');
    }
  }

  openQueryResponse(query: Query): void {
    this.selectedQuery = query;
    this.responseText = '';
    this.showQueryWindow = true;
    this.errorMessage = null;
    console.log('[DEBUG] Opening query response window:', { queryId: query.id, message: query.message });
  }

  submitResponse(): void {
    if (!isPlatformBrowser(this.platformId)) {
      console.log('[INFO] submitResponse skipped on server');
      return;
    }

    if (!this.selectedQuery || !this.responseText.trim()) {
      this.errorMessage = 'Please provide a response';
      console.log('[ERROR] No query selected or response is empty');
      return;
    }

    const token = this.authService.getToken();
    console.log('[DEBUG] submitResponse token:', { token: token ? token.substring(0, 20) + '...' : 'null' });
    if (!token) {
      console.log('[INFO] No token found, redirecting to login');
      this.router.navigate(['/login']);
      return;
    }

    this.http
      .post(
        `${this.backendUrl}/api/queries/${this.selectedQuery.id}/resolve`,
        {
          response: this.responseText,
          userId: this.selectedQuery.userId,
        },
        {
          headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
        }
      )
      .subscribe({
        next: () => {
          this.selectedQuery!.resolved = true;
          this.showQueryWindow = false;
          this.notificationMessage = `Response sent to user: ${this.responseText}`;
          this.showNotificationWindow = true;
          this.fetchUserQueries();
          this.errorMessage = null;
          console.log('[DEBUG] Query response submitted:', { queryId: this.selectedQuery!.id, response: this.responseText });
        },
        error: (err) => {
          console.error('[ERROR] Error submitting response:', err);
          const errorMessage = err.error?.message || err.message || 'Unknown server error';
          this.errorMessage = `Error submitting response: ${errorMessage}`;
          if (err.status === 401 && !this.isLogoutInProgress) {
            this.isLogoutInProgress = true;
            this.authService.logout();
            this.router.navigate(['/login']);
            this.isLogoutInProgress = false;
          }
        },
      });
  }

  closeQueryWindow(): void {
    this.showQueryWindow = false;
    this.selectedQuery = null;
    this.responseText = '';
    this.errorMessage = null;
    console.log('[DEBUG] Query response window closed');
  }

  closeNotificationWindow(): void {
    this.showNotificationWindow = false;
    this.notificationMessage = '';
    this.errorMessage = null;
    console.log('[DEBUG] Notification window closed');
  }

  signOut(): void {
    if (isPlatformBrowser(this.platformId)) {
      console.log('[INFO] Signing out...');
      this.authService.logout();
      this.router.navigate(['/login']);
    }
  }
}
