import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TechnicienPerformanceComponent } from './technicien-performance.component';

describe('TechnicienPerformanceComponent', () => {
  let component: TechnicienPerformanceComponent;
  let fixture: ComponentFixture<TechnicienPerformanceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TechnicienPerformanceComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TechnicienPerformanceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
