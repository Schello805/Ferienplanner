import { expect, test } from '@playwright/test';

test('landing page, consent and legal pages are reachable', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: /Betreuung planen/i })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Statistik erlauben' })).toBeVisible();

  await page.getByRole('button', { name: 'Nur notwendige Cookies' }).click();
  await expect(page.getByRole('button', { name: 'Statistik erlauben' })).toBeHidden();

  const rejectedChoice = await page.evaluate(() => window.localStorage.getItem('ferienplaner_cookie_consent_v1'));
  expect(rejectedChoice).toBe('rejected');

  await page.goto('/cookies');
  await expect(page.getByText('Aktuelle Auswahl verwalten')).toBeVisible();
  await expect(page.getByText('Aktueller Status:')).toBeVisible();
  await expect(page.getByText('nur notwendige Cookies', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Statistik erlauben' }).click();
  await expect(page.getByText(/Statistik erlaubt/i)).toBeVisible();

  const acceptedChoice = await page.evaluate(() => window.localStorage.getItem('ferienplaner_cookie_consent_v1'));
  expect(acceptedChoice).toBe('accepted');

  await page.goto('/datenschutz');
  await expect(page.getByRole('heading', { name: 'Datenschutzerklärung' })).toBeVisible();

  await page.goto('/hilfe');
  await expect(page.getByRole('heading', { name: 'Hilfe' })).toBeVisible();
});

test('bootstrap, logout and login again work in the browser', async ({ page }) => {
  await page.goto('/app');
  await page.getByRole('button', { name: 'Nur notwendige Cookies' }).click();

  await expect(page.getByRole('button', { name: 'Benutzer anlegen' })).toBeVisible();

  await page.getByLabel('Benutzername').fill('e2e-admin');
  await page.getByLabel('Passwort', { exact: true }).fill('secret12345');
  await page.getByLabel('Passwort wiederholen').fill('secret12345');
  await page.getByRole('button', { name: 'Benutzer anlegen' }).click();

  await expect(page.getByRole('heading', { name: 'Mein Ferienplaner' })).toBeVisible();
  await expect(page.getByText('e2e-admin', { exact: true })).toBeVisible();

  const cookiesAfterSetup = await page.context().cookies();
  expect(cookiesAfterSetup.some((cookie) => cookie.name === 'ferienplanerAuthToken')).toBe(true);

  await page.getByRole('button', { name: 'Abmelden' }).click();
  await expect(page.locator('form').getByRole('button', { name: 'Anmelden' })).toBeVisible();

  await page.getByLabel('Benutzername').fill('e2e-admin');
  await page.getByLabel('Passwort', { exact: true }).fill('secret12345');
  await page.locator('form').getByRole('button', { name: 'Anmelden' }).click();

  await expect(page.getByRole('heading', { name: 'Mein Ferienplaner' })).toBeVisible();
  await expect(page.getByText('e2e-admin', { exact: true })).toBeVisible();
});

test('setup wizard stores a draft and guides through onboarding steps', async ({ page }) => {
  await page.goto('/setup');
  await page.getByRole('button', { name: 'Nur notwendige Cookies' }).click();

  await expect(page.getByText('Einrichtung', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Weiter' }).click();
  await expect(page.getByText('Farben festlegen')).toBeVisible();

  await page.getByRole('button', { name: 'Weiter' }).click();
  await expect(page.getByText('Kinder anlegen')).toBeVisible();

  await page.getByLabel('Name').fill('Emma');
  await page.getByRole('button', { name: 'Kind hinzufügen' }).click();
  await expect(page.getByText('Emma')).toBeVisible();

  await page.getByRole('button', { name: 'Weiter' }).click();
  await expect(page.getByText('E-Mails & Benachrichtigungen')).toBeVisible();

  const draft = await page.evaluate(() => window.localStorage.getItem('ferienplanerSetupDraft'));
  expect(draft).toContain('"name":"Emma"');
});
