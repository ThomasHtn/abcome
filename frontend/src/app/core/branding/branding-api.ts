import { httpResource } from '@angular/common/http';
import { computed, Service } from '@angular/core';

import { API_ENDPOINTS } from '@core/http/api-endpoints';
import { resourceValue } from '@core/http/resource.utils';

import { NO_BRANDING } from './branding.constants';
import { Branding } from './branding.model';

/**
 * Name of the app, public and loaded once at startup, for the login screen and the page titles.
 */
@Service()
export class BrandingApi {
  /**
   * Name and accent as the server gives them.
   */
  private readonly branding = httpResource<Branding>(() => API_ENDPOINTS.branding, {
    defaultValue: NO_BRANDING,
  });

  /**
   * Name of the app, empty until loaded.
   */
  public readonly name = computed(() => resourceValue(this.branding, NO_BRANDING).name);

  /**
   * End of the name drawn in the accent colour, empty for none.
   */
  public readonly nameAccent = computed(() => resourceValue(this.branding, NO_BRANDING).nameAccent);
}
