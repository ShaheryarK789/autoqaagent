import type { Locator, Page } from '@playwright/test';

export class ProductPage {
  readonly name: Locator;
  readonly quantity: Locator;
  readonly increaseQuantity: Locator;
  readonly addToCartButton: Locator;
  readonly addToFavouritesButton: Locator;
  readonly outOfStock: Locator;
  readonly toast: Locator;

  constructor(readonly page: Page) {
    this.name = page.getByRole('heading', { level: 1 });
    // Quantity controls have no accessible name.
    this.quantity = page.getByTestId('quantity');
    this.increaseQuantity = page.getByTestId('increase-quantity');
    this.addToCartButton = page.getByRole('button', { name: 'Add to cart' });
    this.addToFavouritesButton = page.getByRole('button', { name: 'Add to favourites' });
    this.outOfStock = page.getByTestId('out-of-stock');
    this.toast = page.getByRole('alert');
  }

  async open(id: number): Promise<void> {
    await this.page.goto(`/#/product/${id}`);
    await this.addToCartButton.waitFor();
  }

  async setQuantity(quantity: number): Promise<void> {
    await this.quantity.fill(String(quantity));
  }

  async addToCart(quantity = 1): Promise<void> {
    if (quantity !== 1) await this.setQuantity(quantity);
    await this.addToCartButton.click();
  }

  async addToFavourites(): Promise<void> {
    const saved = this.page.waitForResponse((r) => r.url().endsWith('/favorites') && r.request().method() === 'POST');
    await this.addToFavouritesButton.click();
    await saved;
  }
}
