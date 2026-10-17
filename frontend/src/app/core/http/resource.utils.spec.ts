import { Resource, signal } from '@angular/core';

import { resourceValue } from './resource.utils';

/**
 * Minimal resource double: only `hasValue` and `value` matter to the helper.
 */
function fakeResource<T>(value: T | undefined): Resource<T> {
  return {
    hasValue: () => value !== undefined,
    value: signal(value),
  } as unknown as Resource<T>;
}

describe('resourceValue', () => {
  it('returns the value once loaded', () => {
    expect(resourceValue(fakeResource(['lapin']), [])).toEqual(['lapin']);
  });

  it('returns the fallback while loading or after an error', () => {
    expect(resourceValue(fakeResource<string[]>(undefined), [])).toEqual([]);
  });
});
