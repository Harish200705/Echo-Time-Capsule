import { Component, OnInit, AfterViewInit, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

interface Icon {
  name: string;
  defaultSrc: string;
  hoverSrc: string;
  isHovered: boolean;
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

  hoverIcon(name: string) {
    const icon = this.icons.find(i => i.name === name);
    if (icon) {
      icon.isHovered = true;
    }
  }

  unhoverIcon(name: string) {
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

  hours: string = '';
  minutes: string = '';
  seconds: string = '';
  showUploadForm: boolean = false;
  uploadFormType: 'hero' | 'text' | null = null;
  userName: string = 'Unknown User';

  heroCapsuleName: string = '';
  heroSelectedFile: File | null = null;
  heroScheduledOpenDate: string = '';
  heroIsPublic: string = 'false';
  heroPassword: string = '';
  heroCapsules: any[] = [];

  textCapsuleName: string = '';
  textContent: string = '';
  textSelectedFile: File | null = null;
  textScheduledOpenDate: string = '';
  textIsPublic: string = 'false';
  textPassword: string = '';
  textCapsules: any[] = [];

  isLoggedIn: boolean = false;
  showFloatingWindow: boolean = false;
  selectedCapsule: any = null;

  showPasswordWindow: boolean = false;
  passwordInput: string = '';
  currentCapsule: any = null;
  showDeleteWindow: boolean = false;
  capsuleToDelete: string | null = null;

  private debugMode: boolean = true;
  private backendUrl: string = 'http://localhost:3000';

  constructor(
    private http: HttpClient,
    private router: Router,
    private authService: AuthService,
    private sanitizer: DomSanitizer,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    this.updateClock();
    setInterval(() => this.updateClock(), 1000);
    this.checkAuthStatus();
    this.loadUserName();
    this.initializeComponent();
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      const token = this.authService.getToken();
      console.log('[DEBUG] Token in ngAfterViewInit:', token);
    }
  }

  private updateClock(): void {
    const now = new Date();
    this.hours = now.getHours().toString().padStart(2, '0');
    this.minutes = now.getMinutes().toString().padStart(2, '0');
    this.seconds = now.getSeconds().toString().padStart(2, '0');
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
      console.log('[DEBUG] Token in initializeComponent:', token);
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

  fetchCapsules(): void {
    if (!isPlatformBrowser(this.platformId)) {
      console.log('[INFO] fetchCapsules skipped on server');
      return;
    }

    const token = this.authService.getToken();
    console.log('[DEBUG] Token for fetchCapsules:', token);
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
        },
        error: (error) => {
          console.error('[ERROR] Error fetching capsules:', error);
          const errorMessage = error.error?.message || error.message || 'Unknown server error';
          alert(`Error fetching capsules: ${errorMessage}`);
          if (error.status === 401 || error.status === 403) {
            alert('Session expired or unauthorized. Please log in again.');
            this.authService.logout();
            this.router.navigate(['/login']);
          }
        },
      });
  }

  openUploadForm(type: 'hero' | 'text'): void {
    if (this.showUploadForm && this.uploadFormType === type) {
      this.closeUploadForm();
    } else {
      this.showUploadForm = true;
      this.uploadFormType = type;
    }
  }

  closeUploadForm(): void {
    this.showUploadForm = false;
    this.uploadFormType = null;

    this.heroCapsuleName = '';
    this.heroSelectedFile = null;
    this.heroScheduledOpenDate = '';
    this.heroIsPublic = 'false';
    this.heroPassword = '';

    this.textCapsuleName = '';
    this.textContent = '';
    this.textSelectedFile = null;
    this.textScheduledOpenDate = '';
    this.textIsPublic = 'false';
    this.textPassword = '';
  }

  onFileSelected(event: any, type: 'hero' | 'text'): void {
    const file = event.target.files[0];
    if (!file || file.size === 0) {
      alert('Selected file is empty or invalid');
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
  }

  uploadFile(type: 'hero' | 'text'): void {
    if (!isPlatformBrowser(this.platformId)) {
      console.log('[INFO] uploadFile skipped on server');
      return;
    }

    const token = this.authService.getToken();
    console.log('[DEBUG] Token for uploadFile:', token);
    if (!token) {
      this.router.navigate(['/login']);
      return;
    }

    const formData = new FormData();

    if (type === 'hero') {
      if (!this.heroSelectedFile) {
        alert('Please select a file');
        return;
      }
      if (!this.heroCapsuleName.trim()) {
        alert('Please provide a capsule name');
        return;
      }
      formData.append('capsuleName', this.heroCapsuleName.trim());
      formData.append('file', this.heroSelectedFile);
      if (this.heroScheduledOpenDate) {
        formData.append('scheduledOpenDate', this.heroScheduledOpenDate);
      }
      formData.append('isPublic', this.heroIsPublic);
      if (this.heroPassword) {
        formData.append('password', this.heroPassword);
      }
    } else {
      if (!this.textContent.trim() && !this.textSelectedFile) {
        alert('Please provide non-empty text or select a file (MP3 or text)');
        return;
      }
      if (!this.textCapsuleName.trim()) {
        alert('Please provide a title');
        return;
      }
      formData.append('capsuleName', this.textCapsuleName.trim());
      if (this.textContent.trim()) {
        formData.append('textContent', this.textContent.trim());
      }
      if (this.textSelectedFile) {
        formData.append('file', this.textSelectedFile);
      }
      if (this.textScheduledOpenDate) {
        formData.append('scheduledOpenDate', this.textScheduledOpenDate);
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
          alert('Capsule uploaded successfully');
          this.closeUploadForm();
          this.fetchCapsules();
        },
        error: (error) => {
          console.error('[ERROR] Error uploading capsule:', error);
          const errorMessage = error.error?.message || error.message || 'Unknown server error';
          alert(`Error uploading capsule: ${errorMessage}`);
          if (error.status === 401 || error.status === 403) {
            this.authService.logout();
            this.router.navigate(['/login']);
          }
        },
      });
  }

  isCapsuleUnlocked(capsule: any): boolean {
    if (!capsule.scheduledOpenDate) {
      return true;
    }
    const now = new Date();
    const scheduledDate = new Date(capsule.scheduledOpenDate);
    return now >= scheduledDate;
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

    console.log('[DEBUG] Opening capsule:', { id: capsule.id, capsuleName: capsule.capsuleName });

    if (capsule.hasPassword && capsule.userId !== this.authService.getUser()?.id) {
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
                },
                error: (error) => {
                  console.error('[ERROR] Error fetching file content:', error);
                  const errorMessage = error.error?.message || error.message || 'Unknown error';
                  alert(`Failed to load file content: ${errorMessage}`);
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
                },
                error: (error) => {
                  console.error('[ERROR] Error fetching text content:', error);
                  const errorMessage = error.error?.message || error.message || 'Unknown error';
                  alert(`Failed to load text content: ${errorMessage}`);
                },
              });
          } else {
            this.showFloatingWindow = true;
          }
        },
        error: (error) => {
          console.error('[ERROR] Error fetching capsule:', error);
          const errorMessage = error.error?.message || error.message || 'Unknown server error';
          alert(`Failed to load capsule: ${errorMessage}`);
          if (error.status === 401 || error.status === 403) {
            this.authService.logout();
            this.router.navigate(['/login']);
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
  }

  confirmDelete(): void {
    if (!this.capsuleToDelete) {
      console.log('[ERROR] No capsule selected for deletion');
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
          alert('Capsule deleted successfully');
          this.closeFloatingWindow();
          this.fetchCapsules();
          this.cancelDelete();
        },
        error: (error) => {
          console.error('[ERROR] Error deleting capsule:', error);
          const errorMessage = error.error?.message || error.message || 'Unknown server error';
          alert(`Failed to delete capsule: ${errorMessage}`);
          if (error.status === 401 || error.status === 403) {
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
}