import { Component, Inject, PLATFORM_ID, AfterViewInit, HostListener } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements AfterViewInit {
  private bg!: HTMLElement | null;
  private subBg!: HTMLElement | null;
  public isNavbarVisible: boolean = false;
  public isLineVisible: boolean = false;
  public lineTop: number = 0;

  constructor(@Inject(PLATFORM_ID) private platformId: object) {}

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.bg = document.querySelector('.home-bg');
      this.subBg = document.querySelector('.home-subbg');
    }
  }

  @HostListener('window:scroll', [])
  onScroll() {
    if (!isPlatformBrowser(this.platformId) || !this.bg || !this.subBg) return;

    const scrollY = window.scrollY;

    // Scroll-based logic for navbar visibility
    if (scrollY > 100) {
      this.isNavbarVisible = true;
    } else {
      this.isNavbarVisible = false;
    }

    // Scroll-based logic for horizontal line and content visibility
    if (scrollY > 200) {
      this.isLineVisible = true;
    } else {
      this.isLineVisible = false;
    }

    // Scroll-based logic for background scaling and opacity
    const maxFadeScroll = 500; // Adjust this value based on when you want fade/blur to start
    const scaleFactor = 1 + scrollY * 0.0025; // Faster zoom effect

    // Calculate fade and blur effect
    const fadeFactor = Math.min(scrollY / maxFadeScroll, 1);
    const blurAmount = fadeFactor * 10; // Maximum blur of 10px

    // Apply dynamic styles
    if (this.bg && this.subBg) {
      this.bg.style.transform = `scale(${scaleFactor})`;
      this.subBg.style.transform = `scale(${scaleFactor})`;

      this.bg.style.opacity = `${1 - fadeFactor}`;
      this.subBg.style.opacity = `${1 - fadeFactor}`;

      this.bg.style.filter = `blur(${blurAmount}px)`;
      this.subBg.style.filter = `blur(${blurAmount}px)`;
    }

    // Adjust the top position of the horizontal line
    this.lineTop = scrollY / 2; // Adjust this value to control the line's movement speed
  }
}
