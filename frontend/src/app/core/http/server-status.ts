import { DOCUMENT } from '@angular/common';
import { computed, inject, Service, signal } from '@angular/core';

import { ServerProblem } from './server-status.model';

/**
 * Whether the notebook can be reached, for the outage band of the app shell: the device's network
 * as the browser reports it, and the outcome of the last API call.
 */
@Service()
export class ServerStatus {
  /**
   * Browser window, telling when the network goes and comes back.
   */
  private readonly window = inject(DOCUMENT).defaultView;

  /**
   * Whether the device has a network.
   */
  private readonly online = signal(this.window?.navigator.onLine ?? true);

  /**
   * Whether the last API call found the server unreachable or failing; set by the interceptor.
   */
  public readonly down = signal(false);

  /**
   * What to tell the family, `null` while everything answers.
   */
  public readonly problem = computed<ServerProblem | null>(() => {
    if (!this.online()) {
      return 'offline';
    }
    return this.down() ? 'server' : null;
  });

  /**
   * Follows the network; its return clears the outage until a call fails again.
   */
  constructor() {
    this.window?.addEventListener('offline', () => this.online.set(false));
    this.window?.addEventListener('online', () => {
      this.online.set(true);
      this.down.set(false);
    });
  }
}
