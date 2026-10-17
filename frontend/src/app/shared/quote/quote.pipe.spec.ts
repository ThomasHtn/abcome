import { QuotePipe } from './quote.pipe';

describe('QuotePipe', () => {
  it('quotes with no-break spaces inside the guillemets', () => {
    expect(new QuotePipe().transform('apin')).toBe('« apin »');
  });

  it('quotes an empty text for an absent value', () => {
    expect(new QuotePipe().transform(undefined)).toBe('«  »');
  });
});
