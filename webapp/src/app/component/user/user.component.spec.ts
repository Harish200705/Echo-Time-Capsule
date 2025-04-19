import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserComponent } from './user.component';

describe('UserComponent', () => {
  let component: UserComponent;
  let fixture: ComponentFixture<UserComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

// Define interfaces for type safety
interface ProfileMenuItem {
  text: string;
  action: () => void;
}

// Function to toggle profile menu
function toggleProfileMenu(): void {
  const menu = document.getElementById('profileMenu') as HTMLElement;
  if (menu) {
      menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
  }
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
  const profileBtn = document.querySelector('.profile-btn') as HTMLElement;
  if (profileBtn) {
      profileBtn.addEventListener('click', toggleProfileMenu); // Ensure click event works
  }

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
});*/