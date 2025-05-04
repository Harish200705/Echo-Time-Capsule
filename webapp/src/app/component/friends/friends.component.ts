import { Component, OnInit, AfterViewInit, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { catchError, of, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

interface Icon {
  name: string;
  defaultSrc: string;
  hoverSrc: string;
  isHovered: boolean;
}

interface User {
  id: string;
  name: string;
  email: string;
  profilePhotoUrl?: string;
}

interface FriendRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  requesterProfilePhotoUrl?: string;
  createdAt: string;
}

interface PendingRequest {
  recipientId: string;
  requestId: string;
}

@Component({
  selector: 'app-friends',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './friends.component.html',
  styleUrls: ['./friends.component.css'],
})
export class FriendsComponent implements OnInit, AfterViewInit {
  icons: Icon[] = [
    { name: 'main', defaultSrc: 'assets/home-1.png', hoverSrc: 'assets/home.png', isHovered: false },
    { name: 'capsule', defaultSrc: 'assets/capsule-1.png', hoverSrc: 'assets/capsule.png', isHovered: false },
    { name: 'notification', defaultSrc: 'assets/notification-1.png', hoverSrc: 'assets/notification.png', isHovered: false },
    { name: 'friends', defaultSrc: 'assets/friends-1.png', hoverSrc: 'assets/friends.png', isHovered: false },
    { name: 'profile', defaultSrc: 'assets/user-1.png', hoverSrc: 'assets/profile.png', isHovered: false }
  ];

  userName: string = 'Unknown User';
  searchQuery: string = '';
  searchResults: User[] = [];
  friendRequests: FriendRequest[] = [];
  friends: User[] = [];
  pendingRequests: PendingRequest[] = [];
  friendIds: string[] = [];
  isLoading: boolean = false;
  errorMessage: string = '';
  currentUserId: string | null = null;
  private searchSubject = new Subject<string>();
  isLogoHovered: boolean = false;

  private backendUrl: string = 'http://localhost:3000';
  private debugMode: boolean = true;

  constructor(
    private http: HttpClient,
    private router: Router,
    private authService: AuthService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      console.log('[DEBUG] ngOnInit: Initializing FriendsComponent');
      this.loadUserName();
      this.checkAuthStatus();
      this.fetchFriendRequests();
      this.fetchFriends();
      this.setupSearchDebounce();
      this.authService.authStatus$.subscribe(status => {
        console.log('[DEBUG] Auth status updated:', status);
      });
    }
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      console.log('[DEBUG] FriendsComponent initialized');
      console.log('[DEBUG] Token in ngAfterViewInit:', this.authService.getToken()?.substring(0, 20) + '...' || 'null');
    }
  }

  private setupSearchDebounce(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(query => {
      this.searchQuery = query;
      this.searchUsers();
    });
  }

  private loadUserName(): void {
    if (isPlatformBrowser(this.platformId)) {
      const user = this.authService.getUser();
      this.userName = user?.name || 'Unknown User';
      this.currentUserId = user?.id || null;
      console.log('[DEBUG] Loaded user:', { name: this.userName, id: this.currentUserId });
    }
  }

  private checkAuthStatus(): void {
    if (isPlatformBrowser(this.platformId)) {
      const token = this.authService.getToken();
      console.log('[DEBUG] Checking auth status, token:', token ? token.substring(0, 20) + '...' : 'null');
      if (!token) {
        console.log('[INFO] No token found, redirecting to login');
        this.router.navigate(['/login']);
      }
    }
  }

  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      console.log('[INFO] User logged out');
      this.authService.logout();
      this.router.navigate(['/login']);
    }
  }

  private fetchFriends(): void {
    if (!isPlatformBrowser(this.platformId)) {
      console.log('[INFO] fetchFriends skipped on server');
      return;
    }

    const token = this.authService.getToken();
    if (!token) {
      console.log('[ERROR] No token available for fetchFriends');
      this.errorMessage = 'Authentication required. Please log in.';
      this.router.navigate(['/login']);
      return;
    }

    this.isLoading = true;
    console.log('[DEBUG] Fetching friends with token:', token.substring(0, 20) + '...');
    this.http
      .get<User[]>(`${this.backendUrl}/api/friends`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .pipe(
        catchError((error) => {
          console.error('[ERROR] Fetch friends error:', error);
          console.log('[DEBUG] Fetch friends error details:', error.status, error.error);
          this.errorMessage = error.status === 404 ? 'Friends endpoint not found.' :
                            error.status === 401 ? `Authentication failed: ${error.error?.message || 'Invalid token'}` :
                            error.status === 403 ? 'Access denied.' :
                            error.status === 500 ? 'Server error occurred while fetching friends.' :
                            `Error fetching friends: ${error.error?.message || 'Unknown server error'}`;
          this.isLoading = false;
          return of([]);
        })
      )
      .subscribe({
        next: (friends) => {
          this.friends = friends || [];
          this.friendIds = this.friends.map(f => f.id);
          this.isLoading = false;
          console.log('[DEBUG] Friends list:', this.friends);
          console.log('[DEBUG] Friend IDs:', this.friendIds);
        },
        error: () => {
          this.isLoading = false;
        }
      });
  }

  removeFriend(friendId: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      console.log('[INFO] removeFriend skipped on server');
      return;
    }
  
    const token = this.authService.getToken();
    if (!token) {
      console.log('[ERROR] No token available for removeFriend');
      this.errorMessage = 'Authentication required. Please log in.';
      this.router.navigate(['/login']);
      return;
    }
  
    this.isLoading = true;
    console.log('[DEBUG] Removing friend with ID:', friendId, 'Token:', token.substring(0, 20) + '...');
    this.http
      .post(
        `${this.backendUrl}/api/friends/remove`,
        { friendId },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      .pipe(
        catchError((error) => {
          console.error('[ERROR] Remove friend error:', error);
          console.log('[DEBUG] Remove friend error details:', {
            status: error.status,
            message: error.error?.message,
            details: error.error?.error
          });
          this.errorMessage = error.status === 400 ? `Invalid friend ID: ${error.error?.message || 'Bad request'}` :
                            error.status === 404 ? 'Friend not found.' :
                            error.status === 401 ? `Authentication failed: ${error.error?.message || 'Invalid token'}` :
                            error.status === 403 ? 'Access denied.' :
                            error.status === 500 ? `Server error: ${error.error?.error || error.error?.message || 'Unknown server error'}` :
                            `Error removing friend: ${error.error?.message || 'Unknown server error'}`;
          this.isLoading = false;
          return of(null);
        })
      )
      .subscribe({
        next: (response) => {
          if (response) {
            this.friends = this.friends.filter(f => f.id !== friendId);
            this.friendIds = this.friendIds.filter(id => id !== friendId);
            console.log('[DEBUG] Friend removed:', friendId);
            this.isLoading = false;
            alert('Friend removed successfully');
          }
        },
        error: () => {
          this.isLoading = false;
        }
      });
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

  searchUsers(): void {
    if (!isPlatformBrowser(this.platformId) || !this.searchQuery.trim()) {
      this.searchResults = [];
      this.errorMessage = this.searchQuery.trim() ? '' : 'Please enter a search query.';
      this.isLoading = false;
      return;
    }

    const token = this.authService.getToken();
    if (!token) {
      console.log('[ERROR] No token available for searchUsers');
      this.errorMessage = 'Authentication required. Please log in.';
      this.isLoading = false;
      this.router.navigate(['/login']);
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const sanitizedQuery = this.searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '');
    console.log('[DEBUG] Sanitized search query:', sanitizedQuery);

    this.http
      .get<User[]>(`${this.backendUrl}/user/search?term=${encodeURIComponent(sanitizedQuery)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .pipe(
        catchError((error) => {
          console.error('[ERROR] Search users error:', error);
          console.log('[DEBUG] Search users error details:', error.status, error.error);
          this.errorMessage = error.status === 404 ? 'Search endpoint not found. Please check server configuration.' :
                            error.status === 401 ? `Authentication failed: ${error.error?.message || 'Invalid token'}` :
                            error.status === 403 ? 'Access denied.' :
                            error.status === 500 ? 'Server error occurred while searching users.' :
                            `Search error: ${error.error?.message || 'Unknown server error'}`;
          this.isLoading = false;
          return of([]);
        })
      )
      .subscribe({
        next: (users) => {
          this.searchResults = users;
          this.isLoading = false;
          console.log('[DEBUG] Search results:', this.searchResults);
          if (this.searchResults.length === 0 && this.searchQuery) {
            this.errorMessage = 'No users found.';
          }
          this.fetchPendingRequestIds();
        },
        error: () => {
          this.isLoading = false;
        }
      });
  }

  private fetchPendingRequestIds(): void {
    const token = this.authService.getToken();
    if (!token) {
      console.log('[ERROR] No token available for fetchPendingRequestIds');
      return;
    }

    this.http
      .get<FriendRequest[]>(`${this.backendUrl}/api/friends/sent-requests`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .pipe(
        catchError((error) => {
          console.error('[ERROR] Error fetching sent friend requests:', error);
          this.errorMessage = 'Error fetching pending requests.';
          return of([]);
        })
      )
      .subscribe({
        next: (sentRequests) => {
          this.pendingRequests = sentRequests.map(r => ({
            recipientId: r.requesterId,
            requestId: r.id
          }));
          console.log('[DEBUG] Pending requests:', this.pendingRequests);
        }
      });
  }

  onSearchInput(query: string): void {
    this.searchSubject.next(query);
  }

  sendFriendRequest(recipientId: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      console.log('[INFO] sendFriendRequest skipped on server');
      return;
    }
  
    const token = this.authService.getToken();
    if (!token) {
      console.log('[ERROR] No token available for sendFriendRequest');
      this.errorMessage = 'Authentication required. Please log in.';
      this.router.navigate(['/login']);
      return;
    }
  
    this.isLoading = true;
    console.log('[DEBUG] Sending friend request from:', this.currentUserId, 'to:', recipientId);
    this.http
      .post(
        `${this.backendUrl}/api/friends/request`,
        { recipientId },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      .pipe(
        catchError((error) => {
          console.error('[ERROR] Error sending friend request:', error);
          console.log('[DEBUG] Send friend request error details:', error.status, error.error);
          this.errorMessage = error.status === 401 ? `Authentication failed: ${error.error?.message || 'Invalid token. Please log in again.'}` :
                            error.status === 400 ? `Invalid request: ${error.error?.message || 'Bad request'}` :
                            error.status === 404 ? 'Recipient not found.' :
                            error.status === 500 ? 'Server error occurred while sending friend request.' :
                            `Error sending friend request: ${error.error?.message || 'Unknown error'}`;
          this.isLoading = false;
          return of(null);
        })
      )
      .subscribe({
        next: (response: any) => {
          if (response) {
            this.pendingRequests.push({ recipientId, requestId: response.requestId });
            console.log('[DEBUG] Friend request sent:', { recipientId, requestId: response.requestId });
            this.isLoading = false;
            alert('Friend request sent successfully');
          }
        },
        error: () => {
          this.isLoading = false;
        }
      });
  }

  revokeFriendRequest(recipientId: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      console.log('[INFO] revokeFriendRequest skipped on server');
      return;
    }

    const token = this.authService.getToken();
    if (!token) {
      console.log('[ERROR] No token available for revokeFriendRequest');
      this.errorMessage = 'Authentication required. Please log in.';
      this.router.navigate(['/login']);
      return;
    }

    const pendingRequest = this.pendingRequests.find(pr => pr.recipientId === recipientId);
    if (!pendingRequest) {
      console.log('[ERROR] No pending request found for recipient:', recipientId);
      this.errorMessage = 'No pending request found.';
      return;
    }

    this.isLoading = true;
    console.log('[DEBUG] Revoking friend request:', pendingRequest.requestId, 'for recipient:', recipientId);
    this.http
      .delete(`${this.backendUrl}/api/friends/revoke/${pendingRequest.requestId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .pipe(
        catchError((error) => {
          console.error('[ERROR] Error revoking friend request:', error);
          console.log('[DEBUG] Revoke friend request error details:', error.status, error.error);
          this.errorMessage = error.status === 401 ? `Authentication failed: ${error.error?.message || 'Invalid token'}` :
                            error.status === 404 ? 'Friend request not found.' :
                            error.status === 400 ? `Invalid request: ${error.error?.message || 'Bad request'}` :
                            error.status === 500 ? 'Server error occurred while revoking friend request.' :
                            `Error revoking friend request: ${error.error?.message || 'Unknown error'}`;
          this.isLoading = false;
          return of(null);
        })
      )
      .subscribe({
        next: (response) => {
          if (response) {
            this.pendingRequests = this.pendingRequests.filter(pr => pr.recipientId !== recipientId);
            console.log('[DEBUG] Friend request revoked:', pendingRequest.requestId);
            this.isLoading = false;
            alert('Friend request revoked successfully');
          }
        },
        error: () => {
          this.isLoading = false;
        }
      });
  }

  fetchFriendRequests(): void {
    if (!isPlatformBrowser(this.platformId)) {
      console.log('[INFO] fetchFriendRequests skipped on server');
      return;
    }

    const token = this.authService.getToken();
    if (!token) {
      console.log('[ERROR] No token available for fetchFriendRequests');
      this.errorMessage = 'Authentication required. Please log in.';
      this.router.navigate(['/login']);
      return;
    }

    this.isLoading = true;
    console.log('[DEBUG] Fetching friend requests for user:', this.currentUserId, 'Token:', token.substring(0, 20) + '...');
    this.http
      .get<FriendRequest[]>(`${this.backendUrl}/api/friends/requests`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .pipe(
        catchError((error) => {
          console.error('[ERROR] Error fetching friend requests:', error);
          console.log('[DEBUG] Fetch friend requests error details:', {
            status: error.status,
            message: error.error?.message,
            response: error.error
          });
          this.errorMessage = error.status === 401 ? `Authentication failed: ${error.error?.message || 'Invalid token'}` :
                            error.status === 404 ? 'Friend requests endpoint not found' :
                            error.status === 500 ? 'Server error occurred while fetching friend requests' :
                            `Error fetching friend requests: ${error.error?.message || 'Unknown error'}`;
          this.isLoading = false;
          return of([]);
        })
      )
      .subscribe({
        next: (requests) => {
          this.friendRequests = requests || [];
          this.isLoading = false;
          console.log('[DEBUG] Friend requests received:', {
            count: requests.length,
            requests: requests.map(r => ({
              id: r.id,
              requesterId: r.requesterId,
              requesterName: r.requesterName,
              createdAt: r.createdAt
            }))
          });
        },
        error: () => {
          this.isLoading = false;
        }
      });
  }

  acceptFriendRequest(requestId: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      console.log('[INFO] acceptFriendRequest skipped on server');
      return;
    }

    const token = this.authService.getToken();
    if (!token) {
      console.log('[ERROR] No token available for acceptFriendRequest');
      this.errorMessage = 'Authentication required. Please log in.';
      this.router.navigate(['/login']);
      return;
    }

    this.isLoading = true;
    console.log('[DEBUG] Accepting friend request:', requestId, 'Token:', token.substring(0, 20) + '...');
    this.http
      .post(
        `${this.backendUrl}/api/friends/accept`,
        { requestId },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      .pipe(
        catchError((error) => {
          console.error('[ERROR] Error accepting friend request:', error);
          console.log('[DEBUG] Accept friend request error details:', error.status, error.error);
          this.errorMessage = error.status === 401 ? `Authentication failed: ${error.error?.message || 'Invalid token'}` :
                            error.status === 404 ? 'Friend request not found' :
                            error.status === 500 ? 'Server error occurred while accepting friend request' :
                            `Error accepting friend request: ${error.error?.message || 'Unknown error'}`;
          this.isLoading = false;
          return of(null);
        })
      )
      .subscribe({
        next: (response) => {
          if (response) {
            console.log('[DEBUG] Friend request accepted:', requestId);
            this.isLoading = false;
            alert('Friend request accepted');
            this.fetchFriendRequests();
            this.fetchFriends();
          }
        },
        error: () => {
          this.isLoading = false;
        }
      });
  }

  declineFriendRequest(requestId: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      console.log('[INFO] declineFriendRequest skipped on server');
      return;
    }

    const token = this.authService.getToken();
    if (!token) {
      console.log('[ERROR] No token available for declineFriendRequest');
      this.errorMessage = 'Authentication required. Please log in.';
      this.router.navigate(['/login']);
      return;
    }

    this.isLoading = true;
    console.log('[DEBUG] Declining friend request:', requestId, 'Token:', token.substring(0, 20) + '...');
    this.http
      .post(
        `${this.backendUrl}/api/friends/decline`,
        { requestId },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      .pipe(
        catchError((error) => {
          console.error('[ERROR] Error declining friend request:', error);
          console.log('[DEBUG] Decline friend request error details:', error.status, error.error);
          this.errorMessage = error.status === 401 ? `Authentication failed: ${error.error?.message || 'Invalid token'}` :
                            error.status === 404 ? 'Friend request not found' :
                            error.status === 500 ? 'Server error occurred while declining friend request' :
                            `Error declining friend request: ${error.error?.message || 'Unknown error'}`;
          this.isLoading = false;
          return of(null);
        })
      )
      .subscribe({
        next: (response) => {
          if (response) {
            console.log('[DEBUG] Friend request declined:', requestId);
            this.isLoading = false;
            alert('Friend request declined');
            this.fetchFriendRequests();
          }
        },
        error: () => {
          this.isLoading = false;
        }
      });
  }

  isRequestPending(userId: string): boolean {
    return this.pendingRequests.some(pr => pr.recipientId === userId);
  }

  isFriend(userId: string): boolean {
    return this.friendIds.includes(userId);
  }

  getPendingRequestId(userId: string): string | undefined {
    return this.pendingRequests.find(pr => pr.recipientId === userId)?.requestId;
  }

  trackByUserId(index: number, user: User): string {
    return user.id;
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