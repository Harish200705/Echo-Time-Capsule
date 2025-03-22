import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl + "/user/register";

  constructor(private http: HttpClient) {}

  register(userData: {
    name: string;
    email: string;
    password: string;
    isAdmin: boolean;
    dob: string;
    gender: string;
    phone: string;
  }): Observable<any> {
    return this.http.post(environment.apiUrl + "/user/register", userData);
  }
}
