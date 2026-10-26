import { test, expect } from '../fixtures';

test.describe('Navigation', () => {
  test('every Categories menu entry opens a category page with products', async ({ catalogPage, header, page }) => {
    await catalogPage.open();
    await header.openCategoriesMenu();
    const entries = await header.categoryLinks.allInnerTexts();
    expect(entries.length).toBeGreaterThan(0);

    for (const entry of entries.map((e) => e.trim())) {
      await test.step(`Categories > ${entry}`, async () => {
        // The previous category's grid stays on screen until the new products arrive,
        // so wait for this category's own product response before judging the page.
        const products = page
          .waitForResponse((r) => r.url().includes('/products?') && r.url().includes('by_category_slug='), { timeout: 10_000 })
          .catch(() => null);
        await header.chooseCategory(entry);

        await expect(catalogPage.pageTitle).toHaveText(new RegExp(`^\\s*Category: ${entry}\\s*$`, 'i'));
        const response = await products;
        expect(response, 'category products request').not.toBeNull();
        expect((await response!.json()).data.length, 'products in category').toBeGreaterThan(0);
        await expect(catalogPage.productNames.first()).toBeVisible();
      });
    }
    await expect(page).toHaveURL(/#\/category\//);
  });

  test('the header Home link opens the catalogue', async ({ catalogPage, header, page }) => {
    await catalogPage.open();
    await header.contactLink.click();
    await expect(page).toHaveURL(/#\/contact/);

    await header.homeLink.click();

    await expect(page).toHaveURL(/#\/$/);
    await expect(catalogPage.productNames.first()).toBeVisible();
  });
});
