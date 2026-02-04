import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CommercantDashboardComponent } from './commercant-dashboard.component';

describe('CommercantDashboardComponent', () => {
  let component: CommercantDashboardComponent;
  let fixture: ComponentFixture<CommercantDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommercantDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CommercantDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
