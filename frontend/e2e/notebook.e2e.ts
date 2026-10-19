import { expect, test } from '@playwright/test';

import { addWord, uniqueLabel } from './e2e.utils';

test.describe('sign-in', () => {
  // A visitor without the session of the setup project.
  test.use({ storageState: { cookies: [], origins: [] } });

  test('refuses a wrong passphrase', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('textbox', { name: 'Mot de passe' }).fill('not-the-family-passphrase');
    await page.getByRole('button', { name: 'Ouvrir le carnet' }).click();
    await expect(page.getByRole('alert')).toContainText("Ce n'est pas le bon mot de passe");
  });
});

test.describe('notebook', () => {
  test('keeps a new word with its first pronunciation', async ({ page }) => {
    const label = uniqueLabel();
    await addWord(page, label, 'bit');

    await expect(page.getByRole('button', { name: /^Première fois : bit,/ })).toBeVisible();
    await page.goto('/');
    await expect(page.getByRole('tabpanel', { name: 'Mots' })).toContainText(label);
  });

  test('records a sound and files it under the word', async ({ page }) => {
    const label = uniqueLabel();
    await addWord(page, label, 'bit');

    await page.getByRole('link', { name: /Enregistrer un son de/ }).click();
    await page.getByRole('button', { name: "Commencer l'enregistrement" }).click();
    // Longer than the shortest accepted recording.
    await page.waitForTimeout(1500);
    await page.getByRole('button', { name: "Arrêter l'enregistrement" }).click();
    await page.getByRole('button', { name: 'Garder ce son' }).click();
    // Filed under the stage just written.
    await page.getByRole('button', { name: /^bit, / }).click();
    await page.getByRole('link', { name: 'Voir sa page' }).click();

    await expect(page.getByRole('heading', { level: 1, name: label })).toBeVisible();
    await expect(page.getByText('Pas encore de son')).toBeHidden();
  });
});
