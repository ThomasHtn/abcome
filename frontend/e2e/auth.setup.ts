import { expect, test as setup } from '@playwright/test';

import { PASSPHRASE, SESSION_FILE } from './e2e.constants';

// One sign-in for the whole run: the backend checks only two passwords at once, by design.
setup('signs in with the family passphrase', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Mot de passe' }).fill(PASSPHRASE);
  await page.getByRole('button', { name: 'Ouvrir le carnet' }).click();
  await expect(page.getByRole('tab', { name: 'Mots' })).toBeVisible();
  await page.context().storageState({ path: SESSION_FILE });
});
