import { TestBed } from '@angular/core/testing';

import { TunisiaGovernoratesService } from './tunisia-governorates.service';

describe('TunisiaGovernoratesService', () => {
  let service: TunisiaGovernoratesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TunisiaGovernoratesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
