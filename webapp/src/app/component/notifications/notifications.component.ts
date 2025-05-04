import { Component, OnInit, AfterViewInit, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

interface Icon {
  name: string;
  defaultSrc: string;
  hoverSrc: string;
  isHovered: boolean;
}

interface Notification {
  id: string;
  type: string;
  message: string;
  relatedId: string;
  senderProfilePhotoUrl?: string;
  createdAt: string;
}

interface QueryResponse {
  id: string;
  message: string;
  response: string;
}

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.css'],
})
export class NotificationsComponent implements OnInit, AfterViewInit {
  icons: Icon[] = [
    { name: 'main', defaultSrc: 'assets/home-1.png', hoverSrc: 'assets/home.png', isHovered: false },
    { name: 'capsule', defaultSrc: 'assets/capsule-1.png', hoverSrc: 'assets/capsule.png', isHovered: false },
    { name: 'notification', defaultSrc: 'assets/notification-1.png', hoverSrc: 'assets/notification.png', isHovered: false },
    { name: 'friends', defaultSrc: 'assets/friends-1.png', hoverSrc: 'assets/friends.png', isHovered: false },
    { name: 'profile', defaultSrc: 'assets/user-1.png', hoverSrc: 'assets/profile.png', isHovered: false }
  ];

  userName: string = 'Unknown User';
  userProfilePhotoUrl: string | null = null;
  notifications: Notification[] = [];
  errorMessage: string | null = null;
  selectedQueryResponse: QueryResponse | null = null;
  showResponseWindow: boolean = false;

  isLogoHovered: boolean = false;

  constructor(
    private http: HttpClient,
    private router: Router,
    private authService: AuthService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    this.loadUserDetails();
    this.checkAuthStatus();
    this.fetchNotifications();
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      console.log('[DEBUG] NotificationsComponent initialized');
    }
  }

  private loadUserDetails(): void {
    if (isPlatformBrowser(this.platformId)) {
      const user = this.authService.getUser();
      this.userName = user?.name || 'Unknown User';
      this.userProfilePhotoUrl = user?.profilePhotoUrl || null;
      console.log('[DEBUG] Loaded user details:', {
        userName: this.userName,
        userProfilePhotoUrl: this.userProfilePhotoUrl
      });
    }
  }

  private checkAuthStatus(): void {
    if (isPlatformBrowser(this.platformId)) {
      if (!this.authService.isAuthenticated()) {
        console.log('[INFO] User not authenticated, redirecting to login');
        this.router.navigate(['/login']);
      }
    }
  }

  hoverIcon(name: string): void {
    const icon = this.icons.find(i => i.name === name);
    if (icon) {
      icon.isHovered = true;
    }
  }

  unhoverIcon(name: string): void {
    const icon = this.icons.find(i => i.name === name);
    if (icon) {
      icon.isHovered = false;
    }
  }

  navigateTo(iconName: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      console.log('[INFO] Navigation skipped on server');
      return;
    }

    console.log('[DEBUG] Navigating to:', iconName);
    switch (iconName) {
      case 'main':
        this.router.navigate(['/main']);
        break;
      case 'capsule':
        this.router.navigate(['/capsules']);
        break;
      case 'notification':
        this.router.navigate(['/notifications']);
        break;
      case 'friends':
        this.router.navigate(['/friends']);
        break;
      case 'profile':
        this.router.navigate(['/profile']);
        break;
      default:
        console.warn('[WARN] Unknown icon name:', iconName);
    }
  }

  formatTimestamp(isoString: string): string {
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) {
        console.warn('[WARN] Invalid date format:', isoString);
        return 'Invalid Date';
      }
      return date.toLocaleString('en-US', {
        timeZone: 'Asia/Kolkata',
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }).replace(',', '');
    } catch (error) {
      console.error('[ERROR] Error formatting timestamp:', error);
      return 'Error';
    }
  }

  fetchNotifications(): void {
    if (!isPlatformBrowser(this.platformId)) {
      console.log('[INFO] fetchNotifications skipped on server');
      return;
    }

    const token = this.authService.getToken();
    if (!token) {
      console.log('[INFO] No token found, redirecting to login');
      this.router.navigate(['/login']);
      return;
    }

    console.log('[DEBUG] GET /api/notifications');
    this.http
      .get<Notification[]>(`${environment.apiUrl}/api/notifications`, {
        headers: new HttpHeaders({ Authorization: `Bearer ${token}` })
      })
      .subscribe({
        next: (notifications) => {
          this.notifications = notifications;
          this.errorMessage = null;
          console.log('[DEBUG] Notifications:', this.notifications);
        },
        error: (error) => {
          console.error('[ERROR] Fetch notifications error:', error);
          this.errorMessage = error.error?.message || 'Failed to load notifications';
          if (error.status === 401 || error.status === 403) {
            this.authService.logout();
            this.router.navigate(['/login']);
          } else if (error.status === 404) {
            console.error('[ERROR] Notifications endpoint not found');
          }
        }
      });
  }

  viewQueryResponse(notification: Notification): void {
    if (!isPlatformBrowser(this.platformId)) {
      console.log('[INFO] viewQueryResponse skipped on server');
      return;
    }

    const token = this.authService.getToken();
    if (!token) {
      console.log('[INFO] No token found, redirecting to login');
      this.router.navigate(['/login']);
      return;
    }

    console.log('[DEBUG] GET /api/queries/:id for queryId:', notification.relatedId);
    this.http
      .get<QueryResponse>(`${environment.apiUrl}/api/queries/${notification.relatedId}`, {
        headers: new HttpHeaders({ Authorization: `Bearer ${token}` })
      })
      .subscribe({
        next: (query) => {
          this.selectedQueryResponse = query;
          this.showResponseWindow = true;
          this.errorMessage = null;
          console.log('[DEBUG] Query response fetched:', query);
        },
        error: (error) => {
          console.error('[ERROR] Fetch query response error:', error);
          this.errorMessage = error.error?.message || 'Failed to load query response';
          if (error.status === 401 || error.status === 403) {
            this.authService.logout();
            this.router.navigate(['/login']);
          }
        }
      });
  }

  closeResponseWindow(): void {
    this.showResponseWindow = false;
    this.selectedQueryResponse = null;
    this.errorMessage = null;
    console.log('[DEBUG] Response window closed');
  }

  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.authService.logout();
      this.router.navigate(['/login']);
      console.log('[INFO] User logged out');
    }
  }

  moveTo(name: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      console.log('[INFO] Navigation skipped on server');
      return;
    }

    console.log('[DEBUG] Navigating to:', name);
    this.router.navigate(['/home']);
  }
}