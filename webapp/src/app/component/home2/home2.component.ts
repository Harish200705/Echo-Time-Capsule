import { Component, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home2',
  standalone: true,
  imports: [CommonModule], // Import CommonModule for ngClass support
  templateUrl: './home2.component.html',
  styleUrls: ['./home2.component.css']
})
export class Home2Component {
  isNavbarVisible: boolean = false;
  isLineVisible : boolean = false;
  lineTop = window.innerHeight / 2; // Initial top position (50% of viewport)
  isVisible = false;

  @HostListener('window:scroll', ['$event'])
  onScroll(): void {
    const scrollY = window.scrollY;

    // Show navbar when scrolled
    this.isNavbarVisible = scrollY > 50;

    // Change background effect on scroll
    document.body.classList.toggle('scrolled', scrollY > 200);

    const scrollPosition = window.scrollY || document.documentElement.scrollTop;
    this.isLineVisible = scrollPosition > 100;

    if (scrollPosition > 250) {
      // Move line and navbar up based on scroll position
      const offset = scrollPosition - 200; // Start moving after 200px
      this.lineTop = (window.innerHeight / 2) - offset; // Move up from initial position
    } else {
      // Reset to initial positions during transition phase
      this.lineTop = window.innerHeight / 2;
    }

    
  }

  router=inject(Router);
  goToSignUp() {
    console.log('Navigating to signup...');
    this.router.navigate(['/register'])
  }

}
