
import { Component, OnInit, AfterViewInit, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import confetti from 'canvas-confetti';

interface Icon {
  name: string;
  defaultSrc: string;
  hoverSrc: string;
  isHovered: boolean;
}

interface Friend {
  id: string;
  name: string;
  email: string;
  profilePhotoUrl?: string;
}

@Component({
  selector: 'app-main',
  standalone: true,
  imports: [FormsModule, CommonModule, DatePipe],
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.css'],
})
export class MainComponent implements OnInit, AfterViewInit {
  icons: Icon[] = [
    { name: 'home', defaultSrc: 'assets/home-1.png', hoverSrc: 'assets/home.png', isHovered: false },
    { name: 'capsule', defaultSrc: 'assets/capsule-1.png', hoverSrc: 'assets/capsule.png', isHovered: false },
    { name: 'notification', defaultSrc: 'assets/notification-1.png', hoverSrc: 'assets/notification.png', isHovered: false },
    { name: 'friends', defaultSrc: 'assets/friends-1.png', hoverSrc: 'assets/friends.png', isHovered: false },
    { name: 'profile', defaultSrc: 'assets/user-1.png', hoverSrc: 'assets/profile.png', isHovered: false }
  ];

  showUploadForm: boolean = false;
  uploadFormType: 'hero' | 'text' | null = null;
  userName: string = 'Unknown User';
  errorMessage: string | null = null;

  heroCapsuleName: string = '';
  heroSelectedFile: File | null = null;
  heroScheduledOpenDate: string = '';
  heroScheduledOpenTime: string = '';
  heroScheduledDateTime: string | null = null;
  heroIsPublic: string = 'false';
  heroPassword: string = '';
  heroCapsules: any[] = [];

  textCapsuleName: string = '';
  textContent: string = '';
  textSelectedFile: File | null = null;
  textScheduledOpenDate: string = '';
  textScheduledOpenTime: string = '';
  textScheduledDateTime: string | null = null;
  textIsPublic: string = 'false';
  textPassword: string = '';
  textCapsules: any[] = [];
  isLogoHovered: boolean = false;

  friends: Friend[] = [];

  isLoggedIn: boolean = false;
  showFloatingWindow: boolean = false;
  selectedCapsule: any = null;

  showPasswordWindow: boolean = false;
  passwordInput: string = '';
  currentCapsule: any = null;
  showDeleteWindow: boolean = false;
  capsuleToDelete: string | null = null;

  // New properties for congratulatory message
  showCongratsMessage: boolean = false;
  congratsMessage: string = '';

  private debugMode: boolean = true;
  private backendUrl: string = 'http://localhost:3000';
  private isLogoutInProgress: boolean = false;
  private confettiTriggeredCapsules: Set<string> = new Set();

  constructor(
    private http: HttpClient,
    private router: Router,
    private authService: AuthService,
    private sanitizer: DomSanitizer,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    this.checkAuthStatus();
    this.loadUserName();
    this.initializeComponent();
    this.fetchFriends();
    if (isPlatformBrowser(this.platformId)) {
      const stored = localStorage.getItem('confettiTriggeredCapsules');
      console.log('[DEBUG] Loaded confettiTriggeredCapsules:', stored);
      if (stored) {
        this.confettiTriggeredCapsules = new Set(JSON.parse(stored));
      }
    }
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      const token = this.authService.getToken();
      console.log('[DEBUG] Token in ngAfterViewInit:', token ? token.substring(0, 20) + '...' : 'null');
    }
  }

  private checkAuthStatus(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.isLoggedIn = this.authService.isAuthenticated();
      console.log('[DEBUG] isLoggedIn:', this.isLoggedIn);
    }
  }

  private initializeComponent(): void {
    if (isPlatformBrowser(this.platformId)) {
      const token = this.authService.getToken();
      console.log('[DEBUG] Token in initializeComponent:', token ? token.substring(0, 20) + '...' : 'null');
      if (!token && this.router.url === '/main') {
        console.log('[INFO] No token found on /main, redirecting to login');
        this.router.navigate(['/login']);
      } else if (token) {
        this.fetchCapsules();
      }
    }
  }

  private loadUserName(): void {
    if (isPlatformBrowser(this.platformId)) {
      const user = this.authService.getUser();
      this.userName = user?.name || 'Unknown User';
      console.log('[DEBUG] Loaded username:', this.userName);
    }
  }

  fetchFriends(): void {
    if (!isPlatformBrowser(this.platformId)) {
      console.log('[INFO] fetchFriends skipped on server');
      return;
    }

    const token = this.authService.getToken();
    console.log('[DEBUG] fetchFriends token:', { token: token ? token.substring(0, 20) + '...' : 'null' });
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
        error: (err) => {
          this.errorMessage = 'Failed to load friends';
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

  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      console.log('[INFO] Logging out...');
      this.authService.logout();
      this.isLoggedIn = false;
      this.router.navigate(['/login']);
    }
  }

  fetchCapsules(): void {
    if (!isPlatformBrowser(this.platformId)) {
      console.log('[INFO] fetchCapsules skipped on server');
      return;
    }

    const token = this.authService.getToken();
    console.log('[DEBUG] Token for fetchCapsules:', token ? token.substring(0, 20) + '...' : 'null');
    if (!token) {
      console.log('[INFO] No token found during fetch, redirecting to login');
      this.router.navigate(['/login']);
      return;
    }

    this.http
      .get(`${this.backendUrl}/api/capsules`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'json',
      })
      .subscribe({
        next: (capsules: any) => {
          console.log('[DEBUG] Raw capsules data:', capsules);
          const formattedCapsules = capsules.map((capsule: any) => {
            const fileUrl = capsule.fileUrl
              ? capsule.fileUrl.startsWith('/api')
                ? `${this.backendUrl}${capsule.fileUrl}`
                : capsule.fileUrl
              : null;
            console.log('[DEBUG] Capsule fileUrl:', { id: capsule.id, fileUrl });
            return {
              ...capsule,
              section: ['image', 'video', 'pdf', 'doc'].includes(capsule.fileType) ? 'hero' : 'text',
              safeFileUrl: fileUrl ? this.sanitizeUrl(fileUrl) : null,
              hasPassword: !!capsule.password,
              userId: capsule.userId.toString(),
            };
          });

          this.heroCapsules = formattedCapsules.filter((capsule: any) =>
            ['image', 'video', 'pdf', 'doc'].includes(capsule.fileType)
          );
          this.textCapsules = formattedCapsules.filter((capsule: any) =>
            ['text', 'mp3'].includes(capsule.fileType)
          );
          console.log('[DEBUG] Formatted capsules:', {
            heroCount: this.heroCapsules.length,
            textCount: this.textCapsules.length,
          });
          this.errorMessage = null;

          // Check for newly unlocked capsules and trigger confetti + message
          this.checkForUnlockedCapsules();
        },
        error: (error) => {
          console.error('[ERROR] Error fetching capsules:', error);
          const errorMessage = error.error?.message || error.message || 'Unknown server error';
          this.errorMessage = `Error fetching capsules: ${errorMessage}`;
          if (error.status === 401) {
            this.errorMessage = 'Session expired or unauthorized. Please log in again.';
            this.authService.logout();
            this.router.navigate(['/login']);
          }
        },
      });
  }

  private checkForUnlockedCapsules(): void {
    if (!isPlatformBrowser(this.platformId)) {
      console.log('[INFO] checkForUnlockedCapsules skipped on server');
      return;
    }

    console.log('[DEBUG] Checking for unlocked capsules');
    const allCapsules = [...this.heroCapsules, ...this.textCapsules];
    console.log('[DEBUG] Total capsules:', allCapsules.length);
    allCapsules.forEach((capsule) => {
      console.log('[DEBUG] Capsule:', {
        id: capsule.id,
        capsuleName: capsule.capsuleName,
        scheduledOpenDate: capsule.scheduledOpenDate,
        isUnlocked: this.isCapsuleUnlocked(capsule),
        hasTriggeredConfetti: this.confettiTriggeredCapsules.has(capsule.id),
      });
      if (
        capsule.scheduledOpenDate &&
        this.isCapsuleUnlocked(capsule) &&
        !this.confettiTriggeredCapsules.has(capsule.id)
      ) {
        console.log('[DEBUG] Triggering confetti and message for capsule:', capsule.id);
        this.congratsMessage = `Congratulations, ${capsule.capsuleName} has opened!!!!`;
        this.showCongratsMessage = true;
        this.triggerConfetti();
        this.confettiTriggeredCapsules.add(capsule.id);
        localStorage.setItem(
          'confettiTriggeredCapsules',
          JSON.stringify(Array.from(this.confettiTriggeredCapsules))
        );
        // Hide message after 5 seconds
        setTimeout(() => {
          this.showCongratsMessage = false;
          this.congratsMessage = '';
        }, 5000);
      }
    });
  }

  triggerConfetti(): void {
    if (!isPlatformBrowser(this.platformId)) {
      console.log('[INFO] Confetti effect skipped on server');
      return;
    }

    console.log('[DEBUG] Triggering multiple confetti bursts');
    const duration = 3 * 1000; // 3 seconds
    const end = Date.now() + duration;
    const colors = ['#ff6f61', '#6b7280', '#3498db', '#f1c40f'];

    const frame = () => {
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 },
        colors: colors,
        zIndex: 10002,
      });
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 },
        colors: colors,
        zIndex: 10002,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  }

  isCapsuleUnlocked(capsule: any): boolean {
    if (!capsule.scheduledOpenDate) {
      console.log('[DEBUG] No scheduledOpenDate for capsule:', capsule.id);
      return true;
    }
    const now = new Date();
    const scheduledDate = new Date(capsule.scheduledOpenDate);
    console.log('[DEBUG] isCapsuleUnlocked:', {
      capsuleId: capsule.id,
      now: now.toISOString(),
      scheduledDate: scheduledDate.toISOString(),
      isUnlocked: now >= scheduledDate,
    });
    return now >= scheduledDate;
  }

  openUploadForm(type: 'hero' | 'text'): void {
    if (this.showUploadForm && this.uploadFormType === type) {
      this.closeUploadForm();
    } else {
      this.showUploadForm = true;
      this.uploadFormType = type;
      this.errorMessage = null;
    }
  }

  closeUploadForm(): void {
    this.showUploadForm = false;
    this.uploadFormType = null;
    this.errorMessage = null;

    this.heroCapsuleName = '';
    this.heroSelectedFile = null;
    this.heroScheduledOpenDate = '';
    this.heroScheduledOpenTime = '';
    this.heroScheduledDateTime = null;
    this.heroIsPublic = 'false';
    this.heroPassword = '';

    this.textCapsuleName = '';
    this.textContent = '';
    this.textSelectedFile = null;
    this.textScheduledOpenDate = '';
    this.textScheduledOpenTime = '';
    this.textScheduledDateTime = null;
    this.textIsPublic = 'false';
    this.textPassword = '';
  }

  onFileSelected(event: any, type: 'hero' | 'text'): void {
    const file = event.target.files[0];
    if (!file || file.size === 0) {
      this.errorMessage = 'Selected file is empty or invalid';
      if (this.debugMode) {
        console.log('[DEBUG] Invalid file selected:', file ? { name: file.name, size: file.size } : 'null');
      }
      return;
    }
    if (type === 'hero') {
      this.heroSelectedFile = file;
      if (this.debugMode) {
        console.log('[DEBUG] Selected hero file:', {
          name: file.name,
          size: file.size,
          type: file.type,
        });
      }
    } else {
      this.textSelectedFile = file;
      if (this.debugMode) {
        console.log('[DEBUG] Selected text file:', {
          name: file.name,
          size: file.size,
          type: file.type,
        });
      }
    }
    this.errorMessage = null;
  }

  updateScheduledDateTime(type: 'hero' | 'text'): void {
    const date = type === 'hero' ? this.heroScheduledOpenDate : this.textScheduledOpenDate;
    const time = type === 'hero' ? this.heroScheduledOpenTime : this.textScheduledOpenTime;

    if (date && time) {
      const combinedDateTime = new Date(`${date}T${time}`);
      if (!isNaN(combinedDateTime.getTime())) {
        if (type === 'hero') this.heroScheduledDateTime = combinedDateTime.toISOString();
        else this.textScheduledDateTime = combinedDateTime.toISOString();
      } else {
        if (type === 'hero') this.heroScheduledDateTime = null;
        else this.textScheduledDateTime = null;
        this.errorMessage = 'Invalid date or time';
      }
    } else if (date) {
      const dateOnly = new Date(`${date}T00:00:00`);
      if (!isNaN(dateOnly.getTime())) {
        if (type === 'hero') this.heroScheduledDateTime = dateOnly.toISOString();
        else this.textScheduledDateTime = dateOnly.toISOString();
      } else {
        if (type === 'hero') this.heroScheduledDateTime = null;
        else this.textScheduledDateTime = null;
        this.errorMessage = 'Invalid date';
      }
    } else {
      if (type === 'hero') this.heroScheduledDateTime = null;
      else this.textScheduledDateTime = null;
    }
    console.log('[DEBUG] Updated scheduledDateTime for', type, ':', type === 'hero' ? this.heroScheduledDateTime : this.textScheduledDateTime);
  }

  uploadFile(type: 'hero' | 'text'): void {
    if (!isPlatformBrowser(this.platformId)) {
      console.log('[INFO] uploadFile skipped on server');
      return;
    }

    const token = this.authService.getToken();
    console.log('[DEBUG] Token for uploadFile:', token ? token.substring(0, 20) + '...' : 'null');
    if (!token) {
      this.router.navigate(['/login']);
      return;
    }

    const formData = new FormData();

    if (type === 'hero') {
      if (!this.heroSelectedFile) {
        this.errorMessage = 'Please select a file';
        return;
      }
      if (!this.heroCapsuleName.trim()) {
        this.errorMessage = 'Please provide a capsule name';
        return;
      }
      formData.append('capsuleName', this.heroCapsuleName.trim());
      formData.append('file', this.heroSelectedFile);
      if (this.heroScheduledDateTime) {
        formData.append('scheduledOpenDate', this.heroScheduledDateTime);
      }
      formData.append('isPublic', this.heroIsPublic);
      if (this.heroPassword) {
        formData.append('password', this.heroPassword);
      }
    } else {
      if (!this.textContent.trim() && !this.textSelectedFile) {
        this.errorMessage = 'Please provide non-empty text or select a file (MP3 or text)';
        return;
      }
      if (!this.textCapsuleName.trim()) {
        this.errorMessage = 'Please provide a title';
        return;
      }
      formData.append('capsuleName', this.textCapsuleName.trim());
      if (this.textContent.trim()) {
        formData.append('textContent', this.textContent.trim());
      }
      if (this.textSelectedFile) {
        formData.append('file', this.textSelectedFile);
      }
      if (this.textScheduledDateTime) {
        formData.append('scheduledOpenDate', this.textScheduledDateTime);
      }
      formData.append('isPublic', this.textIsPublic);
      if (this.textPassword) {
        formData.append('password', this.textPassword);
      }
    }

    if (isPlatformBrowser(this.platformId)) {
      const keys = ['capsuleName', 'file', 'textContent', 'scheduledOpenDate', 'isPublic', 'password'];
      console.log('[DEBUG] FormData contents:');
      keys.forEach((key) => {
        const value = formData.get(key);
        if (value) {
          console.log(`${key}:`, value);
        }
      });
    }

    this.http
      .post(`${this.backendUrl}/api/capsules/upload`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .subscribe({
        next: (response: any) => {
          console.log('[DEBUG] Upload response:', response);
          if (this.debugMode) {
            console.log('[DEBUG] Uploaded capsule details:', {
              id: response.capsule?.id,
              capsuleName: response.capsule?.capsuleName,
              fileType: response.capsule?.fileType,
              fileSize: response.capsule?.fileSize,
              fileUrl: response.capsule?.fileUrl,
            });
          }
          this.errorMessage = null;
          this.closeUploadForm();
          this.fetchCapsules();
        },
        error: (error) => {
          console.error('[ERROR] Error uploading capsule:', error);
          const errorMessage = error.error?.message || error.message || 'Unknown server error';
          this.errorMessage = `Error uploading capsule: ${errorMessage}`;
          if (error.status === 401) {
            this.errorMessage = 'Session expired or unauthorized. Please log in again.';
            this.authService.logout();
            this.router.navigate(['/login']);
          }
        },
      });
  }

  openCapsule(capsule: any): void {
    if (!isPlatformBrowser(this.platformId)) {
      console.log('[INFO] openCapsule skipped on server');
      return;
    }

    const token = this.authService.getToken();
    if (!token) {
      console.log('[ERROR] No token found, redirecting to login');
      this.router.navigate(['/login']);
      return;
    }

    console.log('[DEBUG] Opening capsule:', { 
      id: capsule.id, 
      capsuleName: capsule.capsuleName, 
      hasPassword: capsule.hasPassword, 
      capsuleUserId: capsule.userId 
    });

    const currentUserId = this.authService.getUser()?.id?.toString();
    console.log('[DEBUG] Current user ID:', currentUserId);

    if (this.selectedCapsule?.safeFileUrl) {
      URL.revokeObjectURL(this.selectedCapsule.safeFileUrl);
    }
    this.selectedCapsule = null;
    this.errorMessage = null;

    if (capsule.hasPassword && capsule.userId !== currentUserId) {
      console.log('[INFO] Password required for capsule:', capsule.id);
      this.showPasswordWindow = true;
      this.currentCapsule = capsule;
      this.passwordInput = '';
      return;
    }

    this.fetchCapsule(capsule.id, null);
  }

  submitPassword(): void {
    if (!this.currentCapsule) {
      console.log('[ERROR] No capsule selected for password submission');
      this.errorMessage = 'No capsule selected for password submission';
      this.cancelPassword();
      return;
    }

    this.fetchCapsule(this.currentCapsule.id, this.passwordInput);
    this.cancelPassword();
  }

  cancelPassword(): void {
    this.showPasswordWindow = false;
    this.passwordInput = '';
    this.currentCapsule = null;
  }

  private fetchCapsule(capsuleId: string, password: string | null): void {
    const token = this.authService.getToken();
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
            ? fullCapsule.fileUrl.startsWith('/api')
              ? `${this.backendUrl}${fullCapsule.fileUrl}${password ? `?password=${encodeURIComponent(password)}` : ''}`
              : `${this.backendUrl}/api/capsules/${fullCapsule.id}/file${password ? `?password=${encodeURIComponent(password)}` : ''}`
            : null;

          this.selectedCapsule = {
            ...fullCapsule,
            fileUrl,
            safeFileUrl: null,
            section: ['image', 'video', 'pdf', 'doc'].includes(fullCapsule.fileType) ? 'hero' : 'text',
            decodedTextContent: fullCapsule.fileType === 'text' && fullCapsule.textContent ? fullCapsule.textContent : null,
            hasPassword: !!fullCapsule.password,
            userId: fullCapsule.userId.toString(),
          };

          console.log('[DEBUG] Constructed fileUrl:', fileUrl);

          if (fileUrl && fullCapsule.fileType !== 'text') {
            this.http
              .get(fileUrl, {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob',
              })
              .subscribe({
                next: (blob: Blob) => {
                  const blobUrl = URL.createObjectURL(blob);
                  this.selectedCapsule.safeFileUrl = this.sanitizeUrl(blobUrl);
                  console.log('[DEBUG] File fetched and blob URL created:', blobUrl);
                  this.showFloatingWindow = true;
                  this.errorMessage = null;
                },
                error: (error) => {
                  console.error('[ERROR] Error fetching file content:', error);
                  const errorMessage = error.error?.message || error.message || 'Unknown error';
                  this.errorMessage = `Failed to load file content: ${errorMessage}`;
                  if (error.status === 403 && error.error?.message === 'Password required') {
                    this.showPasswordWindow = true;
                    this.currentCapsule = this.selectedCapsule;
                    this.passwordInput = '';
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
                  this.selectedCapsule.decodedTextContent = textContent;
                  console.log('[DEBUG] Text content fetched:', textContent.substring(0, 50));
                  this.showFloatingWindow = true;
                  this.errorMessage = null;
                },
                error: (error) => {
                  console.error('[ERROR] Error fetching text content:', error);
                  const errorMessage = error.error?.message || error.message || 'Unknown error';
                  this.errorMessage = `Failed to load text content: ${errorMessage}`;
                  if (error.status === 403 && error.error?.message === 'Password required') {
                    this.showPasswordWindow = true;
                    this.currentCapsule = this.selectedCapsule;
                    this.passwordInput = '';
                  }
                },
              });
          } else {
            this.showFloatingWindow = true;
            this.errorMessage = null;
          }
        },
        error: (error) => {
          console.error('[ERROR] Error fetching capsule:', error);
          const errorMessage = error.error?.message || error.message || 'Unknown server error';
          this.errorMessage = `Failed to load capsule: ${errorMessage}`;
          if (error.status === 401) {
            this.errorMessage = 'Session expired or unauthorized. Please log in again.';
            this.authService.logout();
            this.router.navigate(['/login']);
          } else if (error.status === 403 && error.error?.message === 'Password required') {
            this.showPasswordWindow = true;
            this.currentCapsule = { id: capsuleId };
            this.passwordInput = '';
          }
        },
      });
  }

  deleteCapsule(capsuleId: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      console.log('[INFO] deleteCapsule skipped on server');
      return;
    }

    this.showDeleteWindow = true;
    this.capsuleToDelete = capsuleId;
    this.errorMessage = null;
  }

  confirmDelete(): void {
    if (!this.capsuleToDelete) {
      console.log('[ERROR] No capsule selected for deletion');
      this.errorMessage = 'No capsule selected for deletion';
      this.cancelDelete();
      return;
    }

    const token = this.authService.getToken();
    if (!token) {
      console.log('[ERROR] No token found, redirecting to login');
      this.router.navigate(['/login']);
      this.cancelDelete();
      return;
    }

    console.log('[DEBUG] Deleting capsule:', { capsuleId: this.capsuleToDelete });

    this.http
      .delete(`${this.backendUrl}/api/capsules/${this.capsuleToDelete}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .subscribe({
        next: () => {
          console.log('[DEBUG] Capsule deleted:', { capsuleId: this.capsuleToDelete });
          this.errorMessage = null;
          this.closeFloatingWindow();
          this.fetchCapsules();
          this.cancelDelete();
        },
        error: (error) => {
          console.error('[ERROR] Error deleting capsule:', error);
          const errorMessage = error.error?.message || error.message || 'Unknown server error';
          this.errorMessage = `Failed to delete capsule: ${errorMessage}`;
          if (error.status === 401) {
            this.errorMessage = 'Session expired or unauthorized. Please log in again.';
            this.authService.logout();
            this.router.navigate(['/login']);
          }
          this.cancelDelete();
        },
      });
  }

  cancelDelete(): void {
    this.showDeleteWindow = false;
    this.capsuleToDelete = null;
  }

  closeFloatingWindow(): void {
    if (this.selectedCapsule?.safeFileUrl) {
      URL.revokeObjectURL(this.selectedCapsule.safeFileUrl);
    }
    this.showFloatingWindow = false;
    this.selectedCapsule = null;
    this.errorMessage = null;
  }

  decodeTextContent(data: string): string {
    if (!data || !isPlatformBrowser(this.platformId)) {
      return '';
    }
    return data;
  }

  sanitizeUrl(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
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
      case 'home':
        this.router.navigate(['/home']);
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

  moveTo(name: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      console.log('[INFO] Navigation skipped on server');
      return;
    }

    console.log('[DEBUG] Navigating to:', name);
    this.router.navigate(['/home']);
  }
}