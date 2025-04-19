import { Component } from '@angular/core';

@Component({
  selector: 'app-admincomponent',
  imports: [],
  templateUrl: './admincomponent.component.html',
  styleUrl: './admincomponent.component.css'
})
export class AdmincomponentComponent {

}
/*document.addEventListener('DOMContentLoaded', () => {
  const profileBtn = document.querySelector('.profile-btn') as HTMLElement;
  const profileMenu = document.getElementById('profileMenu') as HTMLElement;

  // Profile menu toggle
  function toggleProfileMenu(): void {
      profileMenu.style.display = profileMenu.style.display === 'block' ? 'none' : 'block';
  }

  profileBtn.addEventListener('click', toggleProfileMenu);

  // Close menu when clicking outside
  document.addEventListener('click', (e: MouseEvent) => {
      if (!profileBtn.contains(e.target as Node) && !profileMenu.contains(e.target as Node)) {
          profileMenu.style.display = 'none';
      }
  });

  // Logout function
  document.querySelectorAll('.profile-menu a').forEach(link => {
      link.addEventListener('click', (e) => {
          e.preventDefault();
          if (link.getAttribute('data-action') === 'logout') {
              alert('Logging out...'); // Replace with actual logout logic
              profileMenu.style.display = 'none';
          }
      });
  });
});*/