import { expect, Page } from '@playwright/test';

/**
 * A word no dictionary holds and no other run wrote, so a test never meets a duplicate.
 */
export function uniqueLabel(): string {
  const letters = Array.from({ length: 8 }, () =>
    String.fromCharCode(97 + Math.floor(Math.random() * 26)),
  );
  return `zz${letters.join('')}`;
}

/**
 * Adds a word from the home screen and waits for its page.
 */
export async function addWord(page: Page, label: string, spoken: string): Promise<void> {
  await page.goto('/');
  await page.getByRole('link', { name: 'Ajouter un mot' }).click();
  await page.getByRole('searchbox', { name: 'Chercher dans le dictionnaire' }).fill(label);
  await page
    .getByRole('button', { name: new RegExp(label) })
    .first()
    .click();
  await page.getByRole('textbox', { name: /Comment .* le dit/ }).fill(spoken);
  await page.getByRole('button', { name: 'Enregistrer le mot' }).click();
  await expect(page.getByRole('heading', { level: 1, name: label })).toBeVisible();
}
