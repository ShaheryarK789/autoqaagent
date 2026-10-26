import type { Locator, Page } from '@playwright/test';

export class CatalogPage {
  readonly searchBox: Locator;
  readonly searchButton: Locator;
  readonly searchCaption: Locator;
  readonly sortSelect: Locator;
  readonly productNames: Locator;
  readonly productPrices: Locator;
  readonly pageTitle: Locator;

  constructor(readonly page: Page) {
    // The search box and sort select have no accessible name; the app's test ids are stable.
    this.searchBox = page.getByTestId('search-query');
    this.searchButton = page.getByTestId('search-submit');
    this.searchCaption = page.getByTestId('search-caption');
    this.sortSelect = page.getByTestId('sort');
    this.productNames = page.getByTestId('product-name');
    this.productPrices = page.getByTestId('product-price');
    this.pageTitle = page.getByTestId('page-title');
  }

  async open(): Promise<void> {
    await this.page.goto('/#/');
    await this.productNames.first().waitFor();
  }

  categoryFilter(name: string): Locator {
    return this.page.getByRole('checkbox', { name, exact: true });
  }

  async search(term: string): Promise<void> {
    const results = this.page.waitForResponse((r) => r.url().includes('/products/search'));
    await this.searchBox.fill(term);
    await this.searchButton.click();
    await results;
  }

  async sortBy(option: string): Promise<void> {
    const sorted = this.page.waitForResponse((r) => r.url().includes('/products') && r.url().includes('sort='));
    await this.sortSelect.selectOption(option);
    await sorted;
  }

  async filterByCategory(name: string): Promise<void> {
    const filtered = this.page.waitForResponse((r) => r.url().includes('by_category='));
    await this.categoryFilter(name).check();
    await filtered;
  }

  async names(): Promise<string[]> {
    return (await this.productNames.allInnerTexts()).map((n) => n.trim());
  }

  async prices(): Promise<number[]> {
    return (await this.productPrices.allInnerTexts()).map((p) => Number(p.replace(/[^0-9.]/g, '')));
  }
}
