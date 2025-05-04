import { Routes } from '@angular/router';
import { RegisterComponent } from './component/register/register.component';
import { HomeComponent } from './component/home/home.component';
import { Home2Component } from './component/home2/home2.component';
import { LoginComponent } from './component/login/login.component';
import { ForgotPasswordComponent } from './component/forgot-password/forgot-password.component';
import { MainComponent } from './component/main/main.component';
import { FriendsComponent } from './component/friends/friends.component';
import { NotificationsComponent } from './component/notifications/notifications.component';
import { ProfileComponent } from './component/profile/profile.component';
import { CapsulesComponent } from './component/capsules/capsules.component';
import { AdminComponent } from './component/admin/admin.component';
import { ContactComponent } from './component/contact/contact.component';
import { AboutComponent } from './component/about/about.component';

export const routes: Routes = [
    { path: '', redirectTo: '/home', pathMatch: 'full' },
    {
        path: 'register',
        component: RegisterComponent,
    },
    {
        path: 'home',
        component : Home2Component
    },
    {
        path: 'forgot-password',
        component: ForgotPasswordComponent
    },
    {
        path: 'login',
        component: LoginComponent
    },
    {
        path: 'main',
        component: MainComponent,
    },
    {
        path: 'friends',
        component: FriendsComponent,
    },
    {
        path: 'notifications',
        component: NotificationsComponent,
    },
    {
        path: 'profile',
        component: ProfileComponent,
    },
    {
        path: 'capsules',
        component: CapsulesComponent
    },
    {
        path: 'admin',
        component: AdminComponent,
    },
    {
        path: 'contact',
        component: ContactComponent
    },
    {
        path: 'about',
        component: AboutComponent
    }
];
