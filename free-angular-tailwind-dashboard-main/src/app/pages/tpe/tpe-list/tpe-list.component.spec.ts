import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TpeListComponent } from './tpe-list.component';

describe('TpeListComponent', () => {
  let component: TpeListComponent;
  let fixture: ComponentFixture<TpeListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TpeListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TpeListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
