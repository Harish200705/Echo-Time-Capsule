import { Component } from '@angular/core';

@Component({
  selector: 'app-user',
  imports: [],
  templateUrl: './user.component.html',
  styleUrl: './user.component.css'
})
export class UserComponent {
  showProfileMenu = false;

  friends = [
    { name: 'Alice', img: 'assets/f1.jpg' },
    { name: 'Bob', img: 'assets/f2.jpg' },
    { name: 'Charlie', img: 'assets/f3.jpg' }
  ];

  goToNotifications() {
    console.log('Redirect to Notification Page');
  }

  editProfile() {
    console.log('Edit Profile clicked');
  }

  logout() {
    console.log('Logout clicked');
  }

  createCapsule() {
    console.log('Create Capsule clicked');
  }

  viewCapsules() {
    console.log('View Capsules clicked');
  }

  deleteCapsule() {
    console.log('Delete Capsule clicked');
  }

  addFriends() {
    console.log('Add Friends clicked');
  }

  collaborate() {
    console.log('Collaborate clicked');
  }
}
// Define interfaces for type safety
interface ProfileMenuItem {
  text: string;
  action: () => void;
}

// Function to handle profile menu actions
const profileActions: ProfileMenuItem[] = [
  { text: 'View Profile', action: viewProfile },
  { text: 'Logout', action: logout }
];

function viewProfile(): void {
  alert('View Profile clicked!');
  // Add your view profile logic here
}

function logout(): void {
  alert('Logout clicked!');
  // Add your logout logic here
}

// Function to show notifications
function showNotifications(): void {
  alert('Redirecting to Notifications page!');
  // Add your notification page logic here
}

// Functions for capsule actions
function viewCapsule(): void {
  alert('Redirecting to View Capsule page!');
  // Add your view capsule logic here
}

function createCapsule(): void {
  alert('Redirecting to Create Capsule page!');
  // Add your create capsule logic here
}

function deleteCapsule(): void {
  alert('Redirecting to Delete Capsule page!');
  // Add your delete capsule logic here
}

// Functions for friend actions
function addFriends(): void {
  alert('Redirecting to Add Friends page!');
  // Add your add friends logic here
}

function collaborate(): void {
  alert('Redirecting to Collab page!');
  // Add your collaborate logic here
}

function selectFriend(friend: string): void {
  alert(`Selected ${friend}!`);
  // Add your friend selection logic here
}

// Event listeners (to be attached after DOM load)
/*document.addEventListener('DOMContentLoaded', () => {
  const notificationBtn = document.querySelector('.notification-btn') as HTMLElement;
  if (notificationBtn) {
      notificationBtn.addEventListener('click', showNotifications);
  }

  const viewBtn = document.querySelector('.action-btn[data-action="view"]') as HTMLButtonElement;
  if (viewBtn) {
      viewBtn.addEventListener('click', viewCapsule);
  }

  const createBtn = document.querySelector('.action-btn[data-action="create"]') as HTMLButtonElement;
  if (createBtn) {
      createBtn.addEventListener('click', createCapsule);
  }

  const deleteBtn = document.querySelector('.action-btn[data-action="delete"]') as HTMLButtonElement;
  if (deleteBtn) {
      deleteBtn.addEventListener('click', deleteCapsule);
  }

  const addFriendsBtn = document.querySelector('.action-btn[data-action="add"]') as HTMLButtonElement;
  if (addFriendsBtn) {
      addFriendsBtn.addEventListener('click', addFriends);
  }

  const collabBtn = document.querySelector('.action-btn[data-action="collab"]') as HTMLButtonElement;
  if (collabBtn) {
      collabBtn.addEventListener('click', collaborate);
  }

  const friendButtons = document.querySelectorAll('.friend-btn') as NodeListOf<HTMLButtonElement>;
  friendButtons.forEach(btn => {
      btn.addEventListener('click', () => {
          const friendName = btn.getAttribute('data-friend') || '';
          selectFriend(friendName);
      });
  });

  // Handle profile menu actions
  document.querySelectorAll('.profile-menu a').forEach(link => {
      link.addEventListener('click', (e) => {
          e.preventDefault();
          const action = link.getAttribute('data-action');
          if (action === 'view-profile') {
              viewProfile();
          } else if (action === 'logout') {
              logout();
          }
      });
  });
});
*/