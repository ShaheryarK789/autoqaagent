import type { Locator, Page, Response } from '@playwright/test';

export class AccountPage {
  readonly heading: Locator;
  readonly invoicesHeading: Locator;
  readonly favouritesHeading: Locator;

  constructor(readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'My account' });
    this.invoicesHeading = page.getByRole('heading', { name: 'Invoices' });
    this.favouritesHeading = page.getByRole('heading', { name: 'Favorites' });
  }

  async open(): Promise<void> {
    await this.page.goto('/#/account');
  }

  // Opens My invoices and returns the invoices response the page itself loads.
  async openInvoices(): Promise<Response> {
    const invoices = this.page.waitForResponse((r) => r.url().includes('/invoices?page='));
    await this.page.goto('/#/account/invoices');
    await this.invoicesHeading.waitFor();
    return invoices;
  }

  async openFavourites(): Promise<void> {
    await this.page.goto('/#/account/favorites');
    await this.favouritesHeading.waitFor();
  }

  favourite(productName: string): Locator {
    return this.page.getByTestId('product-name').filter({ hasText: new RegExp(`^\\s*${productName}\\s*$`) });
  }
}

export class ProfilePage {
  readonly firstName: Locator;
  readonly lastName: Locator;
  readonly city: Locator;
  readonly postcode: Locator;

  constructor(readonly page: Page) {
    this.firstName = page.getByLabel('First Name', { exact: true });
    this.lastName = page.getByLabel('Last Name', { exact: true });
    this.city = page.getByLabel('City', { exact: true });
    this.postcode = page.getByLabel('Postcode', { exact: true });
  }

  // Opens the profile and returns the signed-in user's /users/me response.
  async open(): Promise<Response> {
    const me = this.page.waitForResponse((r) => r.url().endsWith('/users/me') && r.status() === 200);
    await this.page.goto('/#/account/profile');
    return me;
  }
}
