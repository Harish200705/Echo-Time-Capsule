import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Capsule1Component } from './capsule1.component';

describe('Capsule1Component', () => {
  let component: Capsule1Component;
  let fixture: ComponentFixture<Capsule1Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Capsule1Component]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Capsule1Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
