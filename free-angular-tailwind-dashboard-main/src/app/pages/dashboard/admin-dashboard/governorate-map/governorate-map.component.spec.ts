import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GovernorateMapComponent } from './governorate-map.component';

describe('GovernorateMapComponent', () => {
  let component: GovernorateMapComponent;
  let fixture: ComponentFixture<GovernorateMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GovernorateMapComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GovernorateMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
