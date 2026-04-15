import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateCommercantComponent } from './create-commercant.component';

describe('CreateCommercantComponent', () => {
  let component: CreateCommercantComponent;
  let fixture: ComponentFixture<CreateCommercantComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateCommercantComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateCommercantComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
