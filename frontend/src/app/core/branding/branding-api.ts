import { HttpClient } from '@angular/common/http';
import { computed, inject, Service, signal } from '@angular/core';

import { firstValueFrom } from 'rxjs';

import { setFamilyTimeZone } from '@core/date/date.utils';
import { API_ENDPOINTS } from '@core/http/api-endpoints';

import { NO_BRANDING } from './branding.constants';
import { Branding } from './branding.model';

/**
 * Name of the app and zone of the family, public and loaded once before the first screen, for the login
 * screen, the page titles and every "today".
 */
@Service()
export class BrandingApi {
  /**
   * Sends the request.
   */
  private readonly http = inject(HttpClient);

  /**
   * Name, accent and zone as the server gives them.
   */
  private readonly branding = signal<Branding>(NO_BRANDING);

  /**
   * Name of the app, empty until loaded.
   */
  public readonly name = computed(() => this.branding().name);

  /**
   * End of the name drawn in the accent colour, empty for none.
   */
  public readonly nameAccent = computed(() => this.branding().nameAccent);

  /**
   * Loads the settings and applies the zone; a server that does not answer leaves the defaults, and the
   * outage band says why.
   */
  public async load(): Promise<void> {
    try {
      const branding = await firstValueFrom(this.http.get<Branding>(API_ENDPOINTS.branding));
      this.branding.set(branding);
      setFamilyTimeZone(branding.timeZone);
    } catch {
      this.branding.set(NO_BRANDING);
    }
  }
}
