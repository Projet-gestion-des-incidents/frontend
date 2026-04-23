import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TunisiaMapDataComponent } from './tunisia-map-data.component';

describe('TunisiaMapDataComponent', () => {
  let component: TunisiaMapDataComponent;
  let fixture: ComponentFixture<TunisiaMapDataComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TunisiaMapDataComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TunisiaMapDataComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
