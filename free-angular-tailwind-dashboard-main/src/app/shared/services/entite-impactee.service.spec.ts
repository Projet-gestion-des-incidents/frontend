import { TestBed } from '@angular/core/testing';
import { EntiteImpacteeService } from './entite-impactee.service';

describe('EntiteImpacteeService', () => {
  let service: EntiteImpacteeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EntiteImpacteeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
