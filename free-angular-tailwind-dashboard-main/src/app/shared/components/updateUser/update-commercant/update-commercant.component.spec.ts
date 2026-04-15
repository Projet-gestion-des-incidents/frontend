import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UpdateCommercantComponent } from './update-commercant.component';

describe('UpdateCommercantComponent', () => {
  let component: UpdateCommercantComponent;
  let fixture: ComponentFixture<UpdateCommercantComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UpdateCommercantComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UpdateCommercantComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
