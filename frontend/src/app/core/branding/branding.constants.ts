import { DEFAULT_TIME_ZONE } from '@core/date/date.constants';

import { Branding } from './branding.model';

/**
 * Shown until the server has given the name: nothing, rather than another family's name.
 */
export const NO_BRANDING: Branding = { name: '', nameAccent: '', timeZone: DEFAULT_TIME_ZONE };

/**
 * Between the page and the app name in the browser tab: "Mot · ABCome".
 */
export const TITLE_SEPARATOR = ' · ';
