import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from '../../services/auth.service';

interface User {
  id: string;
  name: string;
  email: string;
  dob: Date;
  gender: string;
  phone?: string;
  profilePhotoUrl?: string;
  friends: string[];
}

interface Icon {
  name: string;
  defaultSrc: string;
  hoverSrc: string;
  isHovered: boolean;
}

interface Capsule {
  id: string;
  capsuleName: string;
}

interface Friend {
  id: string;
  name: string;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  providers: [DatePipe],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  icons: Icon[] = [
    { name: 'main', defaultSrc: '/assets/home-1.png', hoverSrc: '/assets/home.png', isHovered: false },
    { name: 'capsule', defaultSrc: '/assets/capsule-1.png', hoverSrc: '/assets/capsule.png', isHovered: false },
    { name: 'notification', defaultSrc: '/assets/notification-1.png', hoverSrc: '/assets/notification.png', isHovered: false },
    { name: 'friends', defaultSrc: '/assets/friends-1.png', hoverSrc: '/assets/friends.png', isHovered: false },
    { name: 'profile', defaultSrc: '/assets/user-1.png', hoverSrc: '/assets/profile.png', isHovered: false }
  ];

  user: User = { id: '', name: '', email: '', dob: new Date(), gender: '', friends: [] };
  capsuleCount: number = 0;
  friendCount: number = 0;
  showPhotoUpload: boolean = false;
  isEditing: boolean = false;
  selectedPhoto: File | null = null;
  errorMessage: string = '';
  profileForm: FormGroup;
  photoForm: FormGroup;
  userName: string = 'Unknown User';
  dob: string = '';
  gender: string = '';
  phone: string = '';
  isLogoHovered: boolean = false;

  constructor(
    private http: HttpClient,
    private router: Router,
    private fb: FormBuilder,
    private authService: AuthService,
    private datePipe: DatePipe,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.profileForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      dob: ['', Validators.required],
      gender: ['', Validators.required],
      phone: ['', [Validators.pattern(/^[0-9]{10}$/)]]
    });
    this.photoForm = this.fb.group({
      photo: [null, Validators.required]
    });
  }

  ngOnInit(): void {
    this.checkAuthStatus();
    this.loadUserDetails();
    this.fetchProfile();
    this.fetchCapsuleCount();
    this.fetchFriendCount();
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

  private loadUserDetails(): void {
    if (isPlatformBrowser(this.platformId)) {
      const user = this.authService.getUser();
      console.log('[DEBUG] User from authService:', user);
      this.userName = user?.name || 'Unknown User';
      this.dob = user?.dob ? this.datePipe.transform(user.dob, 'mediumDate') || '' : '';
      this.gender = user?.gender || '';
      this.phone = user?.phone || '';
      console.log('[DEBUG] Loaded user details:', {
        userName: this.userName,
        dob: this.dob,
        gender: this.gender,
        phone: this.phone,
        profilePhotoUrl: user?.profilePhotoUrl
      });
    }
  }

  fetchProfile(): void {
    if (!isPlatformBrowser(this.platformId)) {
      console.log('[INFO] fetchProfile skipped on server');
      return;
    }

    const token = this.authService.getToken();
    if (!token) {
      console.log('[INFO] No token found, redirecting to login');
      this.router.navigate(['/login']);
      return;
    }

    const fullUrl = `${environment.apiUrl}/user/profile`;
    console.log('[DEBUG] Fetching profile from:', fullUrl);

    if (!environment.apiUrl) {
      console.error('[ERROR] environment.apiUrl is not set');
      this.errorMessage = 'API URL is not configured';
      return;
    }

    this.http
      .get<User>(fullUrl, {
        headers: new HttpHeaders({ Authorization: `Bearer ${token}` })
      })
      .subscribe({
        next: (data) => {
          this.user = data;
          this.profileForm.patchValue({
            name: data.name,
            email: data.email,
            dob: data.dob ? this.datePipe.transform(data.dob, 'yyyy-MM-dd') : '',
            gender: data.gender,
            phone: data.phone || ''
          });
          this.userName = data.name || 'Unknown User';
          this.dob = data.dob ? this.datePipe.transform(data.dob, 'mediumDate') || '' : '';
          this.gender = data.gender || '';
          this.phone = data.phone || '';
          console.log('[DEBUG] Profile fetched:', this.user);
          console.log('[DEBUG] Profile photo URL:', this.user.profilePhotoUrl);
          if (!data.profilePhotoUrl) console.warn('[WARN] profilePhotoUrl is missing in profile data');
          if (!data.name) console.warn('[WARN] name is missing in profile data');
          if (!data.dob) console.warn('[WARN] dob is missing in profile data');
          if (!data.gender) console.warn('[WARN] gender is missing in profile data');
          if (!data.phone) console.warn('[WARN] phone is missing in profile data');
          if (!data.friends) console.warn('[WARN] friends is missing in profile data');
        },
        error: (err) => {
          this.errorMessage = 'Failed to load profile';
          console.error('[ERROR] Fetch profile error:', err, 'URL:', fullUrl);
          if (err.status === 401) {
            this.authService.logout();
            this.router.navigate(['/login']);
          }
        }
      });
  }

  fetchCapsuleCount(): void {
    if (!isPlatformBrowser(this.platformId)) {
      console.log('[INFO] fetchCapsuleCount skipped on server');
      return;
    }

    const token = this.authService.getToken();
    if (!token) {
      console.log('[INFO] No token found, redirecting to login');
      this.router.navigate(['/login']);
      return;
    }

    const fullUrl = `${environment.apiUrl}/api/capsules`;
    console.log('[DEBUG] Fetching capsules from:', fullUrl);

    if (!environment.apiUrl) {
      console.error('[ERROR] environment.apiUrl is not set');
      return;
    }

    this.http
      .get<Capsule[]>(fullUrl, {
        headers: new HttpHeaders({ Authorization: `Bearer ${token}` })
      })
      .subscribe({
        next: (capsules) => {
          this.capsuleCount = capsules.length;
          console.log('[DEBUG] Capsule count:', this.capsuleCount);
        },
        error: (err) => {
          console.error('[ERROR] Fetch capsules error:', err, 'URL:', fullUrl);
        }
      });
  }

  fetchFriendCount(): void {
    if (!isPlatformBrowser(this.platformId)) {
      console.log('[INFO] fetchFriendCount skipped on server');
      return;
    }

    const token = this.authService.getToken();
    if (!token) {
      console.log('[INFO] No token found, redirecting to login');
      this.router.navigate(['/login']);
      return;
    }

    const fullUrl = `${environment.apiUrl}/api/friends`;
    console.log('[DEBUG] Fetching friends from:', fullUrl);

    if (!environment.apiUrl) {
      console.error('[ERROR] environment.apiUrl is not set');
      return;
    }

    this.http
      .get<Friend[]>(fullUrl, {
        headers: new HttpHeaders({ Authorization: `Bearer ${token}` })
      })
      .subscribe({
        next: (friends) => {
          this.friendCount = friends.length;
          console.log('[DEBUG] Friend count:', this.friendCount);
        },
        error: (err) => {
          console.error('[ERROR] Fetch friends error:', err, 'URL:', fullUrl);
        }
      });
  }

  startEdit(): void {
    this.isEditing = true;
    this.errorMessage = '';
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.errorMessage = '';
    this.profileForm.patchValue({
      name: this.user.name,
      email: this.user.email,
      dob: this.user.dob ? this.datePipe.transform(this.user.dob, 'yyyy-MM-dd') : '',
      gender: this.user.gender,
      phone: this.user.phone || ''
    });
    this.profileForm.markAsPristine();
  }

  updateProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      this.errorMessage = 'Please fill all required fields correctly';
      return;
    }

    if (!isPlatformBrowser(this.platformId)) {
      console.log('[INFO] updateProfile skipped on server');
      return;
    }

    const token = this.authService.getToken();
    if (!token) {
      console.log('[INFO] No token found, redirecting to login');
      this.router.navigate(['/login']);
      return;
    }

    const formValue = this.profileForm.value;
    const updateData = {
      name: formValue.name,
      email: formValue.email,
      dob: new Date(formValue.dob),
      gender: formValue.gender,
      phone: formValue.phone || null
    };

    const fullUrl = `${environment.apiUrl}/user/profile`;
    console.log('[DEBUG] Updating profile at:', fullUrl);

    this.http
      .put<User>(
        fullUrl,
        updateData,
        { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      )
      .subscribe({
        next: (data) => {
          this.user = data;
          this.isEditing = false;
          this.errorMessage = '';
          this.profileForm.markAsPristine();
          this.userName = data.name || 'Unknown User';
          this.dob = data.dob ? this.datePipe.transform(data.dob, 'mediumDate') || '' : '';
          this.gender = data.gender || '';
          this.phone = data.phone || '';
          console.log('[DEBUG] Profile updated:', this.user);
          alert('Profile updated successfully');
        },
        error: (err) => {
          this.errorMessage = err.error.message || 'Failed to update profile';
          console.error('[ERROR] Update profile error:', err, 'URL:', fullUrl);
          if (err.status === 401) {
            this.authService.logout();
            this.router.navigate(['/login']);
          }
        }
      });
  }

  openPhotoUpload(): void {
    this.showPhotoUpload = true;
    this.selectedPhoto = null;
    this.photoForm.reset();
    this.errorMessage = '';
  }

  closePhotoUpload(): void {
    this.showPhotoUpload = false;
    this.selectedPhoto = null;
    this.photoForm.reset();
    this.errorMessage = '';
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedPhoto = input.files[0];
      this.photoForm.patchValue({ photo: this.selectedPhoto });
    }
  }

  uploadPhoto(): void {
    if (this.photoForm.invalid) {
      this.photoForm.markAllAsTouched();
      return;
    }

    if (!this.selectedPhoto) {
      this.errorMessage = 'Please select a photo';
      return;
    }

    if (!isPlatformBrowser(this.platformId)) {
      console.log('[INFO] uploadPhoto skipped on server');
      return;
    }

    const token = this.authService.getToken();
    if (!token) {
      console.log('[INFO] No token found, redirecting to login');
      this.router.navigate(['/login']);
      return;
    }

    const formData = new FormData();
    formData.append('profilePhoto', this.selectedPhoto);

    const fullUrl = `${environment.apiUrl}/user/upload-profile-photo`;
    console.log('[DEBUG] Uploading photo to:', fullUrl);

    this.http
      .post<{ message: string; profilePhotoUrl: string }>(fullUrl, formData, {
        headers: new HttpHeaders({ Authorization: `Bearer ${token}` })
      })
      .subscribe({
        next: (data) => {
          this.user.profilePhotoUrl = data.profilePhotoUrl;
          this.closePhotoUpload();
          console.log('[DEBUG] Photo uploaded:', data.profilePhotoUrl);
          alert('Photo uploaded successfully');
        },
        error: (err) => {
          this.errorMessage = err.error.message || 'Failed to upload photo';
          console.error('[ERROR] Upload photo error:', err, 'URL:', fullUrl);
          if (err.status === 401) {
            this.authService.logout();
            this.router.navigate(['/login']);
          }
        }
      });
  }

  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      console.log('[INFO] Logging out...');
      this.authService.logout();
      this.router.navigate(['/login']);
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
  
  moveTo(name: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      console.log('[INFO] Navigation skipped on server');
      return;
    }

    console.log('[DEBUG] Navigating to:', name);
    this.router.navigate(['/home']);
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

  onValueChange(field: string, event: Event): void {
    const value = (event.target as HTMLDivElement).innerText.trim();
    switch (field) {
      case 'name':
        this.profileForm.get('name')?.setValue(value);
        break;
      case 'phone':
        this.profileForm.get('phone')?.setValue(value);
        break;
    }
    this.profileForm.markAsDirty();
  }
}