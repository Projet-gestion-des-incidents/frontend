import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModifierTpeComponent } from './modifier-tpe.component';

describe('ModifierTpeComponent', () => {
  let component: ModifierTpeComponent;
  let fixture: ComponentFixture<ModifierTpeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModifierTpeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModifierTpeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
