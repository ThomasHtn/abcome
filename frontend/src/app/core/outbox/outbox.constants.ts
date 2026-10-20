/**
 * Browser database holding the sounds waiting for the network.
 */
export const OUTBOX_DATABASE = 'littlewords-outbox';

/**
 * Version of that database's layout.
 */
export const OUTBOX_VERSION = 1;

/**
 * Its only store, one record per sound, keyed by an increasing number so the oldest goes first.
 */
export const OUTBOX_STORE = 'sounds';
