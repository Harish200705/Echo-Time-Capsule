import { Component, inject, Inject, PLATFORM_ID, AfterViewInit, HostListener, ElementRef, ViewChild, OnInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { AuthService } from '../../services/auth.service';

gsap.registerPlugin(ScrollTrigger);

@Component({
  selector: 'app-home2',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home2.component.html',
  styleUrls: ['./home2.component.css'],
})
export class Home2Component implements OnInit, AfterViewInit {
  textToReveal: string = "MAKE YOUR CAPSULE";
  revealedText: string[] = [];
  isNavbarVisible: boolean = false;
  videoTranslate: number = 0;
  backgroundOpacity: number = 0;
  revealedSteps: string[] = [];
  isBrowser: boolean;
  hasShuffled: boolean = false;
  isLoggedIn: boolean = false;
  isDropdownVisible: boolean = false;

  steps: string[] = [
    "Step 1: Create your capsule.",
    "Step 2: Set a future date.",
    "Step 3: Secure it.",
    "Step 4: Wait for the reveal!"
  ];

  @ViewChild('container', { static: false }) container!: ElementRef;
  @ViewChild('shuffleText', { static: false }) shuffleTextElement!: ElementRef;
  @ViewChild('gradientCircle', { static: false }) gradientCircle!: ElementRef;
  @ViewChild('revealText', { static: false }) revealText!: ElementRef;

  router = inject(Router);

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private el: ElementRef,
    private authService: AuthService
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    this.revealedSteps = this.steps.map(() => '');
    this.revealedText = this.textToReveal.split('').map(() => '');
  }

  ngOnInit() {
    if (this.isBrowser) {
      this.isLoggedIn = this.authService.isAuthenticated();
      console.log('[DEBUG] Initial isLoggedIn:', this.isLoggedIn);
      this.authService.authStatus$.subscribe((status: boolean) => {
        this.isLoggedIn = status;
        console.log('Auth status updated:', status);
      });
      this.revealOnScroll();
    }
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;
    this.initLetterAnimation();
  }

  private initLetterAnimation(): void {
    const header: HTMLElement | null = document.querySelector(".header");
    const letters: NodeListOf<HTMLElement> = document.querySelectorAll(".letter");

    if (!header || letters.length === 0) return;

    const sectionHeight: number = 100;

    window.addEventListener("scroll", () => {
      const scrollY: number = window.scrollY;
      const orderPairs: number[][] = [[4, 5], [3, 6], [2, 7], [1, 8], [0, 9]];

      orderPairs.forEach((pair: number[], orderIndex: number) => {
        const startScroll: number = sectionHeight * orderIndex;
        let moveFactor: number = 0;

        if (scrollY >= startScroll) {
          moveFactor = Math.min(1, (scrollY - startScroll) / sectionHeight);
        }

        const translateY: number = -moveFactor * header.offsetHeight;

        pair.forEach((idx: number) => {
          const letter = letters[idx];
          if (letter) {
            gsap.to(letter, {
              y: translateY,
              zIndex: 1 - moveFactor,
            });
          }
        });
      });
    });
  }

  @HostListener('window:scroll', [])
  onScroll(): void {
    if (!this.isBrowser) return;
    const scrollY: number = window.scrollY;
    this.isNavbarVisible = scrollY > 20;
    this.videoTranslate = -scrollY * 0.8;
    this.revealOnScroll();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.isBrowser || !this.isDropdownVisible) return;
    const target = event.target as HTMLElement;
    if (!target.closest('.nav-buttons')) {
      this.closeDropdown();
    }
  }

  private revealOnScroll() {
    const section = this.el.nativeElement.querySelector('.website-content');
    if (section) {
      const sectionTop = section.getBoundingClientRect().top;
      const windowHeight = window.innerHeight;

      if (sectionTop < windowHeight * 0.9) {
        section.classList.add('visible');
      }
    }
  }

  goToLogin(): void {
    console.log('Navigating to login...');
    this.router.navigate(['/login']);
    this.closeDropdown();
  }

  goToAccount(): void {
    console.log('Toggling account dropdown...');
    this.toggleDropdown();
  }

  toggleDropdown(): void {
    this.isDropdownVisible = !this.isDropdownVisible;
    if (this.isDropdownVisible && this.isBrowser) {
      gsap.fromTo('.account-dropdown', 
        { opacity: 0, y: -10 }, 
        { opacity: 1, y: 0, duration: 0.3 }
      );
    }
  }

  closeDropdown(): void {
    if (this.isDropdownVisible && this.isBrowser) {
      gsap.to('.account-dropdown', {
        opacity: 0,
        y: -10,
        duration: 0.3,
        onComplete: () => {
          this.isDropdownVisible = false;
        }
      });
    } else {
      this.isDropdownVisible = false;
    }
  }

  goToProfile(): void {
    console.log('Navigating to profile...');
    this.router.navigate(['/profile']);
    this.closeDropdown();
  }

  logout(): void {
    console.log('Logging out...');
    this.authService.logout();
    this.isLoggedIn = false;
    this.router.navigate(['/main']);
    this.closeDropdown();
  }

  navigateTo(route: string): void {
    console.log(`Navigating to ${route}...`);
    this.router.navigate([`/${route}`]);
    this.closeDropdown();
  }
}