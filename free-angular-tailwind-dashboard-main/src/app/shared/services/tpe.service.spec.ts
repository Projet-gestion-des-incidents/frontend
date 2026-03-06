import { TestBed } from '@angular/core/testing';

import { TPEService } from './tpe.service';

describe('TPEService', () => {
  let service: TPEService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TPEService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
