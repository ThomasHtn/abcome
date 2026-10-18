import { barCapacity, fitLevels } from './level-bars.utils';

describe('fitLevels', () => {
  it('keeps the levels when they fit or the room is unknown', () => {
    expect(fitLevels([0.1, 0.5], 4)).toEqual([0.1, 0.5]);
    expect(fitLevels([0.1, 0.5, 0.9], null)).toEqual([0.1, 0.5, 0.9]);
  });

  it('keeps the loudest level of each slice', () => {
    expect(fitLevels([0.1, 0.9, 0.2, 0.3, 0.8, 0.4], 3)).toEqual([0.9, 0.3, 0.8]);
    expect(fitLevels([0.1, 0.2, 0.3, 0.4, 0.5], 2)).toEqual([0.2, 0.5]);
  });

  it('always draws at least one bar', () => {
    expect(fitLevels([0.1, 0.7], 0)).toEqual([0.7]);
  });
});

describe('barCapacity', () => {
  it('counts the bars and gaps that fit', () => {
    expect(barCapacity(250, 5, 4)).toBe(28);
    expect(barCapacity(100, 5, 4)).toBe(11);
  });

  it('never goes below one bar', () => {
    expect(barCapacity(0, 5, 4)).toBe(1);
  });
});
