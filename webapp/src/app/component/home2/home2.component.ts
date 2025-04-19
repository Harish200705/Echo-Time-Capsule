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

  constructor(@Inject(PLATFORM_ID) private platformId: object, private el: ElementRef, private authService: AuthService) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    this.revealedSteps = this.steps.map(() => '');
    this.revealedText = this.textToReveal.split('').map(() => '');
  }

  
  ngOnInit() {
    if (this.isBrowser) {
      this.revealOnScroll();
      this.isLoggedIn = this.authService.isAuthenticated();
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
    console.log('Navigating to signup...');
    this.router.navigate(['/login']);
  }

  goToAccount(): void {
    console.log('Navigating to signup...');
    this.router.navigate(['/main']);
  }

  goToMain(): void {
    console.log('Navigating to main');
    this.router.navigate(['/main']);
  }

  navigateTo(route: string): void {
    this.router.navigate([`/${route}`]);
  }
}
