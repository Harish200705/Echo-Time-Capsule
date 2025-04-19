import { TestBed } from '@angular/core/testing';

import { AuthCapsuleService } from './auth-capsule.service';

describe('AuthCapsuleService', () => {
  let service: AuthCapsuleService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthCapsuleService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
