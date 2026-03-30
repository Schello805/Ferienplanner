import { expect, test } from '@playwright/test';

const apiBaseUrl = process.env.PLAYWRIGHT_API_URL || 'http://127.0.0.1:3100';

test('bootstrap, login state and range entry work in the browser', async ({ page, request }) => {
  await page.goto('/app');

  await expect(page.getByRole('button', { name: 'Benutzer anlegen' })).toBeVisible();

  await page.getByLabel('Benutzername').fill('e2e-admin');
  await page.getByLabel('Passwort').fill('secret12345');
  await page.getByLabel('Passwort wiederholen').fill('secret12345');
  await page.getByRole('button', { name: 'Benutzer anlegen' }).click();

  await expect(page.getByText('API-Status: Online')).toBeVisible();
  await expect(page.getByText(/e2e-admin/)).toBeVisible();

  await page.getByRole('button', { name: 'Urlaub eintragen' }).click();
  await page.getByLabel('Von').fill('2026-01-15');
  await page.getByLabel('Bis').fill('2026-01-15');
  await page.getByRole('button', { name: 'Eintragen' }).click();

  await expect(page.getByText('Urlaub eingetragen')).toBeVisible();

  const token = await page.evaluate(() => localStorage.getItem('ferienplanerAuthToken'));
  expect(token).toBeTruthy();

  await expect.poll(async () => {
    const response = await request.get(`${apiBaseUrl}/api/vacations`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok()) {
      return { ok: false, body: null };
    }

    return {
      ok: true,
      body: await response.json(),
    };
  }).toEqual({
    ok: true,
    body: [
    { date: '2026-01-15', userId: 'p1' },
    ],
  });
});
