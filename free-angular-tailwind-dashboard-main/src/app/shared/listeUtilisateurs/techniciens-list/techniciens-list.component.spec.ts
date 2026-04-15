import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TechniciensListComponent } from './techniciens-list.component';

describe('TechniciensListComponent', () => {
  let component: TechniciensListComponent;
  let fixture: ComponentFixture<TechniciensListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TechniciensListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TechniciensListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
