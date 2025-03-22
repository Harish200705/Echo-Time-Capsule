import { Routes } from '@angular/router';
import { RegisterComponent } from './component/register/register.component';
import { HomeComponent } from './component/home/home.component';
import { Home2Component } from './component/home2/home2.component';

export const routes: Routes = [
    {
        path: 'register',
        component: RegisterComponent,
    },
    {
        path: '',
        component : HomeComponent
    },
    {
        path: 'home2',
        component : Home2Component
    }
];
