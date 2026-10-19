import { EnvironmentProviders, inject, provideAppInitializer } from '@angular/core';

import { BrandingApi } from './branding-api';

/**
 * Loads the app name and the family's zone before the first screen, so no date is ever judged in
 * another zone.
 */
export function provideBranding(): EnvironmentProviders {
  return provideAppInitializer(() => inject(BrandingApi).load());
}
