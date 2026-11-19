import { test, expect } from '@playwright/test';

test.describe('Growmate — авторизація', () => {
  test('Перехід до форми входу', async ({ page }) => {
    await page.goto('/');

    await page
      .getByRole('link', { name: 'Увійти', exact: true })
      .first()
      .click();

    await expect(
      page.getByRole('heading', {
        name: 'Увійти до Growmate',
      })
    ).toBeVisible();

    await expect(
      page.locator('#loginEmail')
    ).toBeVisible();
  });

  test('Вхід із неправильними даними', async ({ page }) => {
    await page.goto('/');

    await page
      .getByRole('link', { name: 'Увійти', exact: true })
      .first()
      .click();

    await page.locator('#loginEmail').fill(
      'wrong@example.com'
    );

    await page.locator('#loginPassword').fill(
      'wrongpassword123'
    );

    await page
      .getByRole('button', { name: 'Увійти', exact: true })
      .click();

    await expect(
      page.locator('.auth-error')
    ).toBeVisible();

    await expect(
      page.getByRole('heading', {
        name: 'Увійти до Growmate',
      })
    ).toBeVisible();
  });

  test('Захист сторінки цілей', async ({ page }) => {
    await page.goto('/goals');

    await expect(page).toHaveURL('/');

    await expect(
      page.getByRole('link', { name: 'Увійти', exact: true })
        .first()
    ).toBeVisible();
  });
});
