import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IncidentEditComponent } from './incident-edit.component';

describe('IncidentEditComponent', () => {
  let component: IncidentEditComponent;
  let fixture: ComponentFixture<IncidentEditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IncidentEditComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IncidentEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
