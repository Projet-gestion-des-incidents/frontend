import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CommercantsListComponent } from './commercants-list.component';

describe('CommercantsListComponent', () => {
  let component: CommercantsListComponent;
  let fixture: ComponentFixture<CommercantsListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommercantsListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CommercantsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
