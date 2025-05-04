import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';

interface Icon {
  name: string;
  defaultSrc: string;
  hoverSrc: string;
  isHovered: boolean;
}

interface Capsule {
  id: string;
  capsuleName: string;
  fileType: string;
  fileUrl?: string;
  safeFileUrl?: SafeResourceUrl | null | undefined;
  scheduledOpenDate?: string;
  isPublic: boolean;
  password?: string;
  userId: string;
  hasPassword: boolean;
  decodedTextContent?: string | undefined;
  collaborators?: string[];
  collaborationRequests?: { userId: string; status: 'pending' | 'accepted' | 'rejected' }[];
  fileAccessible?: boolean;
  isHovered?: boolean;
}

interface Friend {
  id: string;
  name: string;
  email: string;
  profilePhotoUrl?: string;
}

@Component({
  selector: 'app-capsules',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  providers: [DatePipe],
  templateUrl: './capsule1.component.html',
  styleUrls: ['./capsule1.component.css']
})
export class CapsulesComponent implements OnInit {
  icons: Icon[] = [
    { name: 'main', defaultSrc: '/assets/home-1.png', hoverSrc: '/assets/home.png', isHovered: false },
    { name: 'capsule', defaultSrc: '/assets/capsule-1.png', hoverSrc: '/assets/capsule.png', isHovered: false },
    { name: 'notification', defaultSrc: '/assets/notification-1.png', hoverSrc: '/assets/notification.png', isHovered: false },
    { name: 'friends', defaultSrc: '/assets/friends-1.png', hoverSrc: '/assets/friends.png', isHovered: false },
    { name: 'profile', defaultSrc: '/assets/user-1.png', hoverSrc: '/assets/profile.png', isHovered: false }
  ];

  user: { id: string; name: string; profilePhotoUrl?: string } = { id: '', name: 'Unknown User', profilePhotoUrl: '' };
  capsules: Capsule[] = [];
  filteredCapsules: Capsule[] = [];
  searchTerm: string = '';
  showFilterOptions: boolean = false;
  sortOption: string = 'default';
  errorMessage: string | null = null;
  successMessage: string | null = null;
  isLogoHovered: boolean = false;

  showFloatingWindow: boolean = false;
  showPasswordWindow: boolean = false;
  showDeleteWindow: boolean = false;
  showCollabWindow: boolean = false;
  showErrorWindow: boolean = false;
  showSuccessWindow: boolean = false;
  showUploadForm: boolean = false;
  selectedCapsule: Capsule | null = null;
  currentCapsule: Capsule | null = null;
  capsuleToDelete: string | null = null;
  passwordInput: string = '';

  friends: Friend[] = [];
  selectedFriends: string[] = [];

  capsuleName: string = '';
  selectedFile: File | null = null;
  scheduledOpenDate: string = '';
  scheduledOpenTime: string = '';
  scheduledDateTime: string | null = null;
  isPublic: string = 'false';
  password: string = '';

  private fileAccessibilityCache: { [url: string]: boolean } = {};
  private isLogoutInProgress: boolean = false;

  private backendUrl: string = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private router: Router,
    private authService: AuthService,
    private sanitizer: DomSanitizer,
    private datePipe: DatePipe,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    this.checkAuthStatus();
    this.loadUserDetails();
    this.fetchCapsules();
    this.fetchFriends();
  }

  private checkAuthStatus(): void {
    if (isPlatformBrowser(this.platformId)) {
      const isAuthenticated = this.authService.isAuthenticated();
      if (!isAuthenticated) {
        console.log('[INFO] Not authenticated, redirecting to login');
        this.router.navigate(['/login']);
      }
    }
  }

  private loadUserDetails(): void {
    if (isPlatformBrowser(this.platformId)) {
      const user = this.authService.getUser();
      if (user) {
        this.user = {
          id: user.id,
          name: user.name,
          profilePhotoUrl: user.profilePhotoUrl || ''
        };
        console.log('[DEBUG] Loaded user details:', this.user);
      } else {
        this.user = { id: '', name: 'Unknown User', profilePhotoUrl: '' };
        console.log('[DEBUG] No user found, using default user');
      }
    }
  }

  fetchCapsules(): void {
    if (!isPlatformBrowser(this.platformId)) {
      console.log('[INFO] fetchCapsules skipped on server');
      return;
    }

    const token = this.authService.getToken();
    console.log('[DEBUG] fetchCapsules token:', { token });
    if (!token) {
      console.log('[INFO] No token found, redirecting to login');
      this.router.navigate(['/login']);
      return;
    }

    this.http
      .get<Capsule[]>(`${this.backendUrl}/api/capsules`, {
        headers: new HttpHeaders({ Authorization: `Bearer ${token}` })
      })
      .subscribe({
        next: (capsules) => {
          console.log('[DEBUG] Raw capsules response:', capsules);
          this.capsules = capsules.map(capsule => {
            const fullFileUrl = capsule.fileUrl && !capsule.fileUrl.startsWith('http')
              ? `${this.backendUrl}${capsule.fileUrl}`
              : capsule.fileUrl || '';
            const mappedCapsule = {
              ...capsule,
              fileUrl: fullFileUrl,
              safeFileUrl: capsule.fileUrl ? this.sanitizeUrl(fullFileUrl) : undefined,
              hasPassword: !!capsule.password,
              userId: capsule.userId.toString(),
              collaborators: capsule.collaborators || [],
              collaborationRequests: capsule.collaborationRequests || [],
              fileAccessible: this.fileAccessibilityCache[fullFileUrl || ''] !== false,
              isHovered: false
            };
            console.log('[DEBUG] Capsule data:', {
              id: capsule.id,
              userId: capsule.userId,
              collaborators: capsule.collaborators || [],
              isCollaborator: capsule.collaborators?.includes(this.user.id)
            });
            if (fullFileUrl && !this.fileAccessibilityCache.hasOwnProperty(fullFileUrl)) {
              this.checkFileAccessibility(fullFileUrl, token).then(isAccessible => {
                mappedCapsule.fileAccessible = isAccessible;
                this.fileAccessibilityCache[fullFileUrl] = isAccessible;
                this.capsules = [...this.capsules];
              });
            }
            return mappedCapsule;
          });
          console.log('[DEBUG] Capsules after mapping:', this.capsules);
          this.applyFilters();
          console.log('[DEBUG] Capsules fetched:', this.capsules.length);
        },
        error: (err: HttpErrorResponse) => {
          this.errorMessage = 'Failed to load capsules';
          this.showErrorWindow = true;
          console.error('[ERROR] Fetch capsules error:', err);
          if (err.status === 401 && !this.isLogoutInProgress) {
            this.isLogoutInProgress = true;
            this.authService.logout();
            this.router.navigate(['/login']);
            this.isLogoutInProgress = false;
          } else if (err.status === 403 && err.error?.message === 'Collaboration is not allowed on private capsules') {
            this.errorMessage = 'Cannot collaborate on private capsules';
            this.showErrorWindow = true;
          } else if (err.status === 500) {
            console.warn('[WARN] Server error (500), retrying fetch after 2 seconds');
            setTimeout(() => this.fetchCapsules(), 2000);
          }
        }
      });
  }

  fetchFriends(): void {
    if (!isPlatformBrowser(this.platformId)) {
      console.log('[INFO] fetchFriends skipped on server');
      return;
    }

    const token = this.authService.getToken();
    console.log('[DEBUG] fetchFriends token:', { token });
    if (!token) {
      console.log('[INFO] No token found, redirecting to login');
      this.router.navigate(['/login']);
      return;
    }

    this.http
      .get<Friend[]>(`${this.backendUrl}/api/friends`, {
        headers: new HttpHeaders({ Authorization: `Bearer ${token}` })
      })
      .subscribe({
        next: (friends) => {
          this.friends = friends;
          console.log('[DEBUG] Friends fetched:', this.friends.length);
        },
        error: (err: HttpErrorResponse) => {
          this.errorMessage = 'Failed to load friends';
          this.showErrorWindow = true;
          console.error('[ERROR] Fetch friends error:', err);
          if (err.status === 401 && !this.isLogoutInProgress) {
            this.isLogoutInProgress = true;
            this.authService.logout();
            this.router.navigate(['/login']);
            this.isLogoutInProgress = false;
          }
        }
      });
  }

  searchCapsules(): void {
    this.applyFilters();
  }

  toggleFilterOptions(): void {
    this.showFilterOptions = !this.showFilterOptions;
  }

  applySort(sortOption: string): void {
    this.sortOption = sortOption;
    this.showFilterOptions = false;
    this.applyFilters();
  }

  applyFilters(): void {
    let filtered = [...this.capsules];

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.trim().toLowerCase();
      filtered = filtered.filter(capsule =>
        capsule.capsuleName.toLowerCase().includes(term)
      );
    }

    switch (this.sortOption) {
      case 'recently-opened':
        filtered.sort((a, b) => {
          const aUnlocked = this.isCapsuleUnlocked(a) ? 0 : 1;
          const bUnlocked = this.isCapsuleUnlocked(b) ? 0 : 1;
          return aUnlocked - bUnlocked;
        });
        break;
      case 'recently-uploaded':
        filtered.sort((a, b) => {
          const aDate = a.scheduledOpenDate ? new Date(a.scheduledOpenDate).getTime() : 0;
          const bDate = b.scheduledOpenDate ? new Date(b.scheduledOpenDate).getTime() : 0;
          return bDate - aDate;
        });
        break;
      case 'collaborations':
        filtered = filtered.filter(capsule => 
          (capsule.collaborators && capsule.collaborators.length > 0) || 
          (capsule.collaborationRequests && capsule.collaborationRequests.length > 0) ||
          (capsule.userId !== this.user.id && capsule.collaborationRequests?.some(request => request.userId === this.user.id))
        );
        break;
      default:
        filtered = filtered.filter(capsule => 
          capsule.userId === this.user.id || 
          capsule.collaborators?.includes(this.user.id) || 
          (capsule.collaborationRequests?.some(request => request.userId === this.user.id))
        );
        break;
    }

    this.filteredCapsules = filtered;
    console.log('[DEBUG] Filtered capsules:', this.filteredCapsules);
  }

  isCapsuleUnlocked(capsule: Capsule): boolean {
    if (!capsule.scheduledOpenDate) return true;
    const now = new Date();
    const scheduledDate = new Date(capsule.scheduledOpenDate);
    return now >= scheduledDate;
  }

  isSafeFileUrlValid(safeUrl: SafeResourceUrl | null | undefined): safeUrl is SafeResourceUrl {
    return safeUrl !== null && safeUrl !== undefined;
  }

  isDecodedTextContentValid(content: string | undefined): content is string {
    return content !== undefined && content !== null;
  }

  async checkFileAccessibility(fileUrl: string, token: string): Promise<boolean> {
    try {
      console.log('[DEBUG] checkFileAccessibility with token:', { token, fileUrl });
      const fullUrl = fileUrl.startsWith('http') ? fileUrl : `${this.backendUrl}${fileUrl}`;
      console.log('[DEBUG] Checking file accessibility for:', fullUrl);

      await this.http.head(fullUrl, {
        headers: new HttpHeaders({ Authorization: `Bearer ${token}` })
      }).toPromise();
      console.log('[DEBUG] File is accessible:', fullUrl);
      return true;
    } catch (err) {
      const error = err as HttpErrorResponse;
      console.error('[ERROR] File not accessible:', fileUrl, error.status, error.statusText || 'Unknown error');
      if (error.status === 401 && !this.isLogoutInProgress) {
        this.isLogoutInProgress = true;
        this.authService.logout();
        this.router.navigate(['/login']);
        this.isLogoutInProgress = false;
      }
      return false;
    }
  }

  openCapsule(capsule: Capsule): void {
    if (!isPlatformBrowser(this.platformId)) {
      console.log('[INFO] openCapsule skipped on server');
      return;
    }

    console.log('[DEBUG] Opening capsule:', { capsuleId: capsule.id, userId: capsule.userId, collaborators: capsule.collaborators });

    if (!this.isCapsuleUnlocked(capsule)) {
      this.selectedCapsule = {
        ...capsule,
        safeFileUrl: null,
        fileAccessible: false
      };
      this.showFloatingWindow = true;
      console.log('[INFO] Capsule is locked, showing scheduled details:', capsule.id);
      return;
    }

    const token = this.authService.getToken();
    console.log('[DEBUG] openCapsule token:', { token });
    if (!token) {
      console.log('[INFO] No token found, redirecting to login');
      this.router.navigate(['/login']);
      return;
    }

    const currentUserId = this.authService.getUser()?.id?.toString();
    if (capsule.hasPassword && capsule.userId !== currentUserId) {
      console.log('[INFO] Password required for capsule:', capsule.id);
      this.currentCapsule = capsule;
      this.showPasswordWindow = true;
      this.passwordInput = '';
      return;
    }

    this.fetchCapsule(capsule.id, null, token);
  }

  submitPassword(): void {
    if (!this.currentCapsule) {
      this.errorMessage = 'No capsule selected';
      this.showErrorWindow = true;
      return;
    }

    const token = this.authService.getToken();
    console.log('[DEBUG] submitPassword token:', { token });
    if (!token) {
      console.log('[INFO] No token found, redirecting to login');
      this.router.navigate(['/login']);
      return;
    }

    this.fetchCapsule(this.currentCapsule.id, this.passwordInput, token);
    this.cancelPassword();
  }

  cancelPassword(): void {
    this.showPasswordWindow = false;
    this.passwordInput = '';
    this.currentCapsule = null;
  }

  private fetchCapsule(capsuleId: string, password: string | null, token: string): void {
    console.log('[DEBUG] fetchCapsule token:', { token });
    if (!token) {
      console.log('[ERROR] No token found, redirecting to login');
      this.router.navigate(['/login']);
      return;
    }

    const capsuleUrl = `${this.backendUrl}/api/capsules/${capsuleId}${password ? `?password=${encodeURIComponent(password)}` : ''}`;
    this.http
      .get(capsuleUrl, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .subscribe({
        next: (fullCapsule: any) => {
          console.log('[DEBUG] Full capsule data:', fullCapsule);
          console.log('[DEBUG] Raw fileUrl from backend:', fullCapsule.fileUrl);

          const currentUserId = this.authService.getUser()?.id?.toString();
          if (fullCapsule.password && fullCapsule.userId !== currentUserId && !password) {
            console.log('[INFO] Password required for capsule:', fullCapsule.id);
            this.showPasswordWindow = true;
            this.currentCapsule = fullCapsule;
            this.passwordInput = '';
            return;
          }

          const fileUrl = fullCapsule.fileUrl
            ? fullCapsule.fileUrl.startsWith('http')
              ? fullCapsule.fileUrl
              : `${this.backendUrl}${fullCapsule.fileUrl}${password ? `?password=${encodeURIComponent(password)}` : ''}`
            : null;

          this.selectedCapsule = {
            ...fullCapsule,
            fileUrl,
            safeFileUrl: null,
            decodedTextContent: fullCapsule.fileType === 'text' && fullCapsule.textContent ? fullCapsule.textContent : null,
            hasPassword: !!fullCapsule.password,
            userId: fullCapsule.userId.toString(),
            collaborators: fullCapsule.collaborators || [],
            collaborationRequests: fullCapsule.collaborationRequests || [],
            fileAccessible: this.fileAccessibilityCache[fileUrl || ''] !== false,
            isHovered: false
          };

          if (this.selectedCapsule) {
            console.log('[DEBUG] Selected capsule for floating window:', {
              id: this.selectedCapsule.id,
              userId: this.selectedCapsule.userId,
              collaborators: this.selectedCapsule.collaborators,
              isCollaborator: this.selectedCapsule.collaborators?.includes(this.user.id)
            });
          }

          if (fileUrl && fullCapsule.fileType !== 'text') {
            this.http
              .get(fileUrl, {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob',
              })
              .subscribe({
                next: (blob: Blob) => {
                  const blobUrl = URL.createObjectURL(blob);
                  if (this.selectedCapsule) {
                    this.selectedCapsule.safeFileUrl = this.sanitizeUrl(blobUrl);
                    this.selectedCapsule.fileAccessible = true;
                    this.fileAccessibilityCache[fileUrl] = true;
                    console.log('[DEBUG] File fetched and blob URL created:', blobUrl);
                    this.showFloatingWindow = true;
                    this.errorMessage = '';
                  }
                },
                error: (error) => {
                  console.error('[ERROR] Error fetching file content:', error);
                  const errorMessage = error.error?.message || error.message || 'Unknown error';
                  this.errorMessage = `Failed to load file content: ${errorMessage}`;
                  this.showErrorWindow = true;
                  if (this.selectedCapsule) {
                    this.selectedCapsule.fileAccessible = false;
                    this.fileAccessibilityCache[fileUrl] = false;
                    this.showFloatingWindow = true;
                    if (error.status === 403 && error.error?.message === 'Password required') {
                      this.showPasswordWindow = true;
                      this.currentCapsule = this.selectedCapsule;
                      this.passwordInput = '';
                    }
                  }
                },
              });
          } else if (fullCapsule.fileType === 'text' && !fullCapsule.textContent && fileUrl) {
            this.http
              .get(fileUrl, {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'text',
              })
              .subscribe({
                next: (textContent: string) => {
                  if (this.selectedCapsule) {
                    this.selectedCapsule.decodedTextContent = textContent;
                    this.selectedCapsule.fileAccessible = true;
                    this.fileAccessibilityCache[fileUrl] = true;
                    console.log('[DEBUG] Text content fetched:', textContent.substring(0, 50));
                    this.showFloatingWindow = true;
                    this.errorMessage = '';
                  }
                },
                error: (error) => {
                  console.error('[ERROR] Error fetching text content:', error);
                  const errorMessage = error.error?.message || error.message || 'Unknown error';
                  this.errorMessage = `Failed to load text content: ${errorMessage}`;
                  this.showErrorWindow = true;
                  if (this.selectedCapsule) {
                    this.selectedCapsule.fileAccessible = false;
                    this.fileAccessibilityCache[fileUrl] = false;
                    this.showFloatingWindow = true;
                    if (error.status === 403 && error.error?.message === 'Password required') {
                      this.showPasswordWindow = true;
                      this.currentCapsule = this.selectedCapsule;
                      this.passwordInput = '';
                    }
                  }
                },
              });
          } else {
            this.showFloatingWindow = true;
            this.errorMessage = '';
          }
        },
        error: (error: HttpErrorResponse) => {
          console.error('[ERROR] Error fetching capsule:', error);
          const errorMessage = error.error?.message || error.message || 'Unknown server error';
          this.errorMessage = `Failed to load capsule: ${errorMessage}`;
          this.showErrorWindow = true;
          if (error.status === 401 && !this.isLogoutInProgress) {
            this.isLogoutInProgress = true;
            this.authService.logout();
            this.router.navigate(['/login']);
            this.isLogoutInProgress = false;
          } else if (error.status === 403) {
            if (error.error?.message === 'Password required') {
              this.showPasswordWindow = true;
              this.currentCapsule = { id: capsuleId } as Capsule;
              this.passwordInput = '';
            } else {
              this.errorMessage = 'You do not have permission to access this capsule';
              this.showErrorWindow = true;
            }
          }
        }
      });
  }

  private sendNotification(recipientId: string, message: string, type: string, capsuleId: string): void {
    const token = this.authService.getToken();
    console.log('[DEBUG] sendNotification token:', { token });
    if (!token) {
      console.log('[INFO] No token found, redirecting to login');
      this.router.navigate(['/login']);
      return;
    }

    const payload = {
      recipientId,
      message,
      type,
      capsuleId
    };

    this.http
      .post(`${this.backendUrl}/api/notifications`, payload, {
        headers: new HttpHeaders({ Authorization: `Bearer ${token}` })
      })
      .subscribe({
        next: () => {
          console.log('[DEBUG] Notification sent to user:', recipientId, 'Message:', message);
        },
        error: (err: HttpErrorResponse) => {
          console.error('[ERROR] Failed to send notification:', err);
          if (err.status === 401 && !this.isLogoutInProgress) {
            this.isLogoutInProgress = true;
            this.authService.logout();
            this.router.navigate(['/login']);
            this.isLogoutInProgress = false;
          }
        }
      });
  }

  respondToCollaboration(capsuleId: string, recipientId: string, action: 'accept' | 'reject'): void {
    const token = this.authService.getToken();
    console.log('[DEBUG] respondToCollaboration token:', { token });
    if (!token) {
      console.log('[INFO] No token found, redirecting to login');
      this.router.navigate(['/login']);
      return;
    }

    const payload = {
      capsuleId,
      userId: recipientId,
      action
    };

    this.http
      .post(`${this.backendUrl}/api/capsules/collaborate/respond`, payload, {
        headers: new HttpHeaders({ Authorization: `Bearer ${token}` })
      })
      .subscribe({
        next: (response: any) => {
          console.log('[DEBUG] Collaboration request responded for capsule:', capsuleId, 'Action:', action);

          this.http
            .get<Capsule>(`${this.backendUrl}/api/capsules/${capsuleId}`, {
              headers: new HttpHeaders({ Authorization: `Bearer ${token}` })
            })
            .subscribe({
              next: (capsule) => {
                const ownerId = capsule.userId;
                const capsuleName = capsule.capsuleName || 'Unnamed Capsule';
                const senderName = this.user.name || 'A user';

                if (action === 'accept') {
                  const receiverCapsule = this.capsules.find(c => c.id === capsuleId && c.userId !== ownerId);
                  if (receiverCapsule && receiverCapsule.collaborationRequests) {
                    receiverCapsule.collaborationRequests = receiverCapsule.collaborationRequests.map(r => ({
                      ...r,
                      status: 'accepted'
                    }));
                    this.capsules = [...this.capsules];
                  }

                  const senderCapsule = this.capsules.find(c => c.id === capsuleId && c.userId === ownerId);
                  if (senderCapsule && senderCapsule.collaborationRequests) {
                    senderCapsule.collaborationRequests = senderCapsule.collaborationRequests.map(r => ({
                      ...r,
                      status: 'accepted'
                    }));
                    this.capsules = [...this.capsules];
                  }

                  this.sendNotification(
                    ownerId,
                    `${senderName} has accepted your collaboration request for capsule "${capsuleName}".`,
                    'collaboration_accepted',
                    capsuleId
                  );
                } else if (action === 'reject') {
                  const receiverCapsule = this.capsules.find(c => c.id === capsuleId && c.userId !== ownerId);
                  if (receiverCapsule && receiverCapsule.collaborationRequests) {
                    receiverCapsule.collaborationRequests = receiverCapsule.collaborationRequests.filter(
                      r => r.userId !== this.user.id
                    );
                    this.capsules = [...this.capsules];
                  }

                  const senderCapsule = this.capsules.find(c => c.id === capsuleId && c.userId === ownerId);
                  if (senderCapsule && senderCapsule.collaborationRequests) {
                    senderCapsule.collaborationRequests = senderCapsule.collaborationRequests.filter(
                      r => r.userId !== recipientId
                    );
                    this.capsules = [...this.capsules];
                  }

                  this.sendNotification(
                    ownerId,
                    `${senderName} has rejected your collaboration request for capsule "${capsuleName}".`,
                    'collaboration_rejected',
                    capsuleId
                  );
                }

                this.fetchCapsules();
                this.closeFloatingWindow();
              },
              error: (err: HttpErrorResponse) => {
                console.error('[ERROR] Failed to fetch capsule for notification:', err);
                if (err.status === 401 && !this.isLogoutInProgress) {
                  this.isLogoutInProgress = true;
                  this.authService.logout();
                  this.router.navigate(['/login']);
                  this.isLogoutInProgress = false;
                }
              }
            });
        },
        error: (err: HttpErrorResponse) => {
          this.errorMessage = `Failed to ${action} collaboration request`;
          this.showErrorWindow = true;
          console.error('[ERROR] Respond to collaboration request error:', err);
          if (err.status === 401 && !this.isLogoutInProgress) {
            this.isLogoutInProgress = true;
            this.authService.logout();
            this.router.navigate(['/login']);
            this.isLogoutInProgress = false;
          }
        }
      });
  }

  acceptCollaborationRequest(capsuleId: string, requestUserId: string): void {
    this.respondToCollaboration(capsuleId, this.user.id, 'accept');
  }

  rejectCollaborationRequest(capsuleId: string, requestUserId: string): void {
    this.respondToCollaboration(capsuleId, this.user.id, 'reject');
  }

  getCollaborationStatus(capsule: Capsule): string | null {
    if (capsule.userId !== this.user.id) {
      const hasCollaboration = capsule.collaborationRequests?.some(r => r.userId === this.user.id);
      return hasCollaboration ? 'Collab' : null;
    }

    const hasCollaboration = capsule.collaborationRequests && capsule.collaborationRequests.length > 0;
    return hasCollaboration ? 'Collab' : null;
  }

  deleteCapsule(capsuleId: string): void {
    console.log('[DEBUG] Initiating deleteCapsule:', { capsuleId, userId: this.user.id });

    // Find the capsule to check ownership and collaborator status
    const capsule = this.capsules.find(c => c.id === capsuleId) || this.selectedCapsule;
    if (!capsule) {
      console.error('[ERROR] Capsule not found for deletion:', { capsuleId });
      this.errorMessage = 'Capsule not found';
      this.showErrorWindow = true;
      return;
    }

    // Log user role
    const isOwner = capsule.userId === this.user.id;
    const isCollaborator = capsule.collaborators?.includes(this.user.id) || false;
    console.log('[DEBUG] User role check before deletion:', {
      capsuleId,
      userId: this.user.id,
      capsuleOwnerId: capsule.userId,
      isOwner,
      isCollaborator,
      collaborators: capsule.collaborators || []
    });

    // Ensure user is either owner or collaborator
    if (!isOwner && !isCollaborator) {
      console.error('[ERROR] User is neither owner nor collaborator:', {
        capsuleId,
        userId: this.user.id
      });
      this.errorMessage = 'You are not authorized to delete or remove this capsule';
      this.showErrorWindow = true;
      return;
    }

    this.showDeleteWindow = true;
    this.capsuleToDelete = capsuleId;
  }

  confirmDelete(): void {
    if (!this.capsuleToDelete) {
      this.errorMessage = 'No capsule selected for deletion';
      this.showErrorWindow = true;
      this.cancelDelete();
      return;
    }

    const token = this.authService.getToken();
    console.log('[DEBUG] confirmDelete token:', { token });
    if (!token) {
      this.router.navigate(['/login']);
      return;
    }

    const capsule = this.capsules.find(c => c.id === this.capsuleToDelete);
    if (!capsule) {
      this.errorMessage = 'Capsule not found';
      this.showErrorWindow = true;
      this.cancelDelete();
      return;
    }

    console.log('[DEBUG] confirmDelete capsule:', {
      capsuleId: this.capsuleToDelete,
      userId: this.user.id,
      isOwner: capsule.userId === this.user.id,
      isCollaborator: capsule.collaborators?.includes(this.user.id)
    });

    this.http
      .delete(`${this.backendUrl}/api/capsules/${this.capsuleToDelete}`, {
        headers: new HttpHeaders({ Authorization: `Bearer ${token}` })
      })
      .subscribe({
        next: (response: any) => {
          console.log('[INFO] Capsule action successful:', response);
          if (capsule.userId === this.user.id) {
            // Owner deleted the capsule
            this.successMessage = 'Capsule deleted successfully';
            this.showSuccessWindow = true;
            if (capsule.collaborators && capsule.collaborators.length > 0) {
              const capsuleName = capsule.capsuleName || 'Unnamed Capsule';
              const senderName = this.user.name || 'A user';
              capsule.collaborators.forEach(collaboratorId => {
                this.sendNotification(
                  collaboratorId,
                  `${senderName} has deleted the capsule "${capsuleName}".`,
                  'capsule_deleted',
                  this.capsuleToDelete!
                );
              });
            }
          } else {
            // Collaborator removed themselves
            this.successMessage = 'You have successfully left the capsule collaboration';
            this.showSuccessWindow = true;
            const capsuleName = capsule.capsuleName || 'Unnamed Capsule';
            const senderName = this.user.name || 'A user';
            this.sendNotification(
              capsule.userId,
              `${senderName} has removed themselves from collaboration on capsule "${capsuleName}".`,
              'collaborator_removed',
              this.capsuleToDelete!
            );
          }
          this.closeFloatingWindow();
          setTimeout(() => {
            this.fetchCapsules();
            this.cancelDelete();
            this.closeSuccessWindow();
          }, 1500);
        },
        error: (err: HttpErrorResponse) => {
          if (err.status === 403) {
            this.errorMessage = err.error.message || 'Not authorized to perform this action';
          } else if (err.status === 404) {
            this.errorMessage = 'Capsule not found';
          } else {
            this.errorMessage = 'Failed to perform action: ' + (err.error?.message || 'Unknown error');
          }
          this.showErrorWindow = true;
          console.error('[ERROR] Delete capsule error:', err);
          if (err.status === 401 && !this.isLogoutInProgress) {
            this.isLogoutInProgress = true;
            this.authService.logout();
            this.router.navigate(['/login']);
            this.isLogoutInProgress = false;
          }
        }
      });
  }

  cancelDelete(): void {
    this.showDeleteWindow = false;
    this.capsuleToDelete = null;
  }

  openCollabWindow(): void {
    if (!this.selectedCapsule) {
      this.errorMessage = 'No capsule selected';
      this.showErrorWindow = true;
      return;
    }
    this.showCollabWindow = true;
    this.selectedFriends = [];
  }

  closeCollabWindow(): void {
    this.showCollabWindow = false;
    this.selectedFriends = [];
  }

  toggleFriendSelection(friendId: string): void {
    const index = this.selectedFriends.indexOf(friendId);
    if (index > -1) {
      this.selectedFriends.splice(index, 1);
    } else {
      this.selectedFriends.push(friendId);
    }
  }

  sendCollaborationRequest(): void {
    if (!this.selectedCapsule || this.selectedFriends.length === 0) {
      this.errorMessage = 'Please select a capsule and at least one friend';
      this.showErrorWindow = true;
      return;
    }

    const token = this.authService.getToken();
    console.log('[DEBUG] sendCollaborationRequest token:', { token, capsuleId: this.selectedCapsule.id, friends: this.selectedFriends });
    if (!token) {
      console.log('[INFO] No token found in sendCollaborationRequest, redirecting to login');
      this.router.navigate(['/login']);
      return;
    }

    const payload = {
      capsuleId: this.selectedCapsule.id,
      friendIds: this.selectedFriends
    };

    this.http
      .post(`${this.backendUrl}/api/capsules/collaborate`, payload, {
        headers: new HttpHeaders({ Authorization: `Bearer ${token}` })
      })
      .subscribe({
        next: () => {
          console.log('[INFO] Collaboration request sent successfully');
          this.closeCollabWindow();
          this.closeFloatingWindow();
          this.fetchCapsules();
          this.successMessage = 'Collaboration request sent successfully';
          this.showSuccessWindow = true;
          setTimeout(() => this.closeSuccessWindow(), 1500);
        },
        error: (err: HttpErrorResponse) => {
          this.errorMessage = err.error?.message || 'Failed to send collaboration request';
          this.showErrorWindow = true;
          console.error('[ERROR] Send collaboration request error:', err);
          if (err.status === 403 && err.error?.message === 'Collaboration is not allowed on private capsules') {
            this.errorMessage = 'Cannot collaborate on private capsules';
            this.showErrorWindow = true;
          } else if (err.status === 401 && !this.isLogoutInProgress) {
            this.isLogoutInProgress = true;
            this.authService.logout();
            this.router.navigate(['/login']);
            this.isLogoutInProgress = false;
          }
        }
      });
  }

  closeFloatingWindow(): void {
    this.showFloatingWindow = false;
    this.selectedCapsule = null;
  }

  closeErrorWindow(): void {
    this.showErrorWindow = false;
    this.errorMessage = null;
  }

  closeSuccessWindow(): void {
    this.showSuccessWindow = false;
    this.successMessage = null;
  }

  sanitizeUrl(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  hoverIcon(name: string): void {
    const icon = this.icons.find(i => i.name === name);
    if (icon) icon.isHovered = true;
  }

  unhoverIcon(name: string): void {
    const icon = this.icons.find(i => i.name === name);
    if (icon) icon.isHovered = false;
  }

  navigateTo(iconName: string): void {
    if (!isPlatformBrowser(this.platformId)) return;

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

  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.authService.logout();
      this.router.navigate(['/login']);
    }
  }

  onCapsuleHover(capsule: Capsule): void {
    capsule.isHovered = true;
  }

  onCapsuleLeave(capsule: Capsule): void {
    capsule.isHovered = false;
  }

  openUploadForm(): void {
    this.showUploadForm = true;
    this.errorMessage = null;
    this.capsuleName = '';
    this.selectedFile = null;
    this.scheduledOpenDate = '';
    this.scheduledOpenTime = '';
    this.scheduledDateTime = null;
    this.isPublic = 'false';
    this.password = '';
  }

  closeUploadForm(): void {
    this.showUploadForm = false;
    this.errorMessage = null;
    this.capsuleName = '';
    this.selectedFile = null;
    this.scheduledOpenDate = '';
    this.scheduledOpenTime = '';
    this.scheduledDateTime = null;
    this.isPublic = 'false';
    this.password = '';
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (!file || file.size === 0) {
      this.errorMessage = 'Selected file is empty or invalid';
      console.log('[DEBUG] Invalid file selected:', file ? { name: file.name, size: file.size } : 'null');
      return;
    }
    this.selectedFile = file;
    this.errorMessage = null;
    console.log('[DEBUG] Selected file:', {
      name: file.name,
      size: file.size,
      type: file.type,
    });
  }

  updateScheduledDateTime(): void {
    if (this.scheduledOpenDate) {
      const dateTime = new Date(this.scheduledOpenDate);
      if (!isNaN(dateTime.getTime())) {
        this.scheduledDateTime = dateTime.toISOString();
      } else {
        this.scheduledDateTime = null;
        this.errorMessage = 'Invalid date or time';
      }
    } else {
      this.scheduledDateTime = null;
    }
    console.log('[DEBUG] Updated scheduledDateTime:', this.scheduledDateTime);
  }

  uploadFile(): void {
    if (!isPlatformBrowser(this.platformId)) {
      console.log('[INFO] uploadFile skipped on server');
      return;
    }

    const token = this.authService.getToken();
    if (!token) {
      this.router.navigate(['/login']);
      return;
    }

    if (!this.selectedFile) {
      this.errorMessage = 'Please select a file';
      return;
    }
    if (!this.capsuleName.trim()) {
      this.errorMessage = 'Please provide a capsule name';
      return;
    }

    const formData = new FormData();
    formData.append('capsuleName', this.capsuleName.trim());
    formData.append('file', this.selectedFile);
    if (this.scheduledDateTime) {
      formData.append('scheduledOpenDate', this.scheduledDateTime);
    }
    formData.append('isPublic', this.isPublic);
    if (this.password) {
      formData.append('password', this.password);
    }

    console.log('[DEBUG] FormData contents:', {
      capsuleName: this.capsuleName,
      file: this.selectedFile.name,
      scheduledOpenDate: this.scheduledDateTime,
      isPublic: this.isPublic,
      password: this.password ? 'set' : 'not set',
    });

    this.http
      .post(`${this.backendUrl}/api/capsules/upload`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .subscribe({
        next: (response: any) => {
          console.log('[DEBUG] Upload response:', response);
          this.successMessage = 'Capsule uploaded successfully';
          this.showSuccessWindow = true;
          this.closeUploadForm();
          this.fetchCapsules();
          setTimeout(() => this.closeSuccessWindow(), 1500);
        },
        error: (error: HttpErrorResponse) => {
          console.error('[ERROR] Error uploading capsule:', error);
          const errorMessage = error.error?.message || error.message || 'Unknown server error';
          this.errorMessage = `Error uploading capsule: ${errorMessage}`;
          this.showErrorWindow = true;
          if (error.status === 401) {
            this.authService.logout();
            this.router.navigate(['/login']);
          }
        },
      });
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