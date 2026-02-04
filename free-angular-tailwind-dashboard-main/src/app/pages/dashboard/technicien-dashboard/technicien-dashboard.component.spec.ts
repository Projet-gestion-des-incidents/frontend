import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TechnicienDashboardComponent } from './technicien-dashboard.component';

describe('TechnicienDashboardComponent', () => {
  let component: TechnicienDashboardComponent;
  let fixture: ComponentFixture<TechnicienDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TechnicienDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TechnicienDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
