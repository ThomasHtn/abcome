import { effect, Resource, signal, untracked, WritableResource } from '@angular/core';

/**
 * Resource value, or `fallback` while it has none.
 * Always read through this: `value()` throws once the resource is in error, even with a default.
 */
export function resourceValue<T, F>(resource: Resource<T>, fallback: F): T | F {
  return resource.hasValue() ? resource.value() : fallback;
}

/**
 * Applies a local change to a resource after a write, so screens update without a new request.
 * A write landing before the first value (still loading, or failed) asks for one fresh load once
 * the current one settles: a request already in flight may predate the write.
 * Call it in an injection context, like a field initializer.
 */
export function resourcePatcher<T>(
  resource: WritableResource<T | undefined>,
): (change: (value: T) => T) => void {
  const refreshPending = signal(false);
  effect(() => {
    const status = resource.status();
    if (refreshPending() && (status === 'resolved' || status === 'error')) {
      refreshPending.set(false);
      untracked(() => resource.reload());
    }
  });
  // `hasValue()` narrows `resource` to a read-only type; writes go through this un-narrowed alias.
  const target = resource;
  return (change) => {
    if (resource.hasValue()) {
      target.set(change(resource.value()));
    } else if (!resource.reload()) {
      refreshPending.set(true);
    }
  };
}

/**
 * Puts the last value back when a reload fails (offline, server down), so screens keep what they
 * showed instead of their error state; the outage band says why. Going idle (signed out) forgets it.
 * Call it in an injection context, like a field initializer.
 */
export function keepValueOnError<T>(resource: WritableResource<T | undefined>): void {
  let last: T | undefined;
  effect(() => {
    const status = resource.status();
    if (status === 'idle') {
      last = undefined;
    } else if (resource.hasValue()) {
      last = resource.value();
    } else if (status === 'error' && last !== undefined) {
      const kept = last;
      untracked(() => resource.set(kept));
    }
  });
}
