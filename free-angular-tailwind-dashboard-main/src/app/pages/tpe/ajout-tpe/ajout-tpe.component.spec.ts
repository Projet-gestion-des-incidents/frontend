import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AjoutTpeComponent } from './ajout-tpe.component';

describe('AjoutTpeComponent', () => {
  let component: AjoutTpeComponent;
  let fixture: ComponentFixture<AjoutTpeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AjoutTpeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AjoutTpeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
