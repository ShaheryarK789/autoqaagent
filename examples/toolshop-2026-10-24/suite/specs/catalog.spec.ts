import { test, expect } from '../fixtures';

test.describe('Catalogue', () => {
  test('searching "pliers" lists only pliers', async ({ catalogPage }) => {
    await catalogPage.open();
    await catalogPage.search('pliers');

    await expect(catalogPage.searchCaption).toHaveText('Searched for: pliers');
    await expect.poll(async () => (await catalogPage.names()).every((n) => /pliers/i.test(n))).toBe(true);
    await expect(catalogPage.productNames).not.toHaveCount(0);
  });

  test('searching a nonsense term reports no products', async ({ catalogPage, page }) => {
    await catalogPage.open();
    await catalogPage.search('zzqxnothing');

    await expect(page.getByText("0 products found for 'zzqxnothing'")).toBeVisible();
    await expect(catalogPage.productNames).toHaveCount(0);
  });

  test('"Price (Low - High)" lists the cheapest products first', async ({ catalogPage }) => {
    await catalogPage.open();
    const before = await catalogPage.names();
    await catalogPage.sortBy('Price (Low - High)');
    await expect(catalogPage.productNames.first()).not.toHaveText(before[0]);

    const prices = await catalogPage.prices();
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });

  test('"Name (A - Z)" lists products alphabetically', async ({ catalogPage }) => {
    await catalogPage.open();
    const before = await catalogPage.names();
    await catalogPage.sortBy('Name (A - Z)');
    await expect(catalogPage.productNames.first()).not.toHaveText(before[0]);

    const names = await catalogPage.names();
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  test('the Hammer category filter lists only hammers', async ({ catalogPage }) => {
    await catalogPage.open();
    await catalogPage.filterByCategory('Hammer');

    await expect.poll(async () => (await catalogPage.names()).every((n) => /hammer/i.test(n))).toBe(true);
    await expect(catalogPage.productNames).not.toHaveCount(0);
  });
});
