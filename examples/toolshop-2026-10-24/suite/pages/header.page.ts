import type { Locator, Page } from '@playwright/test';

export class Header {
  readonly homeLink: Locator;
  readonly categoriesButton: Locator;
  readonly categoryLinks: Locator;
  readonly contactLink: Locator;
  readonly signInLink: Locator;
  readonly userMenu: Locator;
  readonly signOutLink: Locator;
  readonly cartLink: Locator;
  readonly cartQuantity: Locator;
  readonly menuToggle: Locator;

  constructor(readonly page: Page) {
    const nav = page.getByRole('navigation').filter({ has: page.getByRole('menubar') });
    this.homeLink = nav.getByRole('link', { name: 'Home', exact: true });
    this.categoriesButton = nav.getByRole('button', { name: 'Categories' });
    // Category entries (hand, power, robotic, special tools) of the Categories menu.
    this.categoryLinks = page.getByTestId(/^nav-[a-z]+-tools$/);
    // The link's accessible name is misspelt ("Contakt"), so the test id is the stable hook.
    this.contactLink = page.getByTestId('nav-contact');
    this.signInLink = nav.getByRole('link', { name: 'Sign in' });
    this.userMenu = page.getByTestId('nav-user-menu');
    this.signOutLink = page.getByTestId('nav-sign-out');
    this.cartLink = page.getByTestId('nav-cart');
    this.cartQuantity = page.getByTestId('cart-quantity');
    this.menuToggle = page.getByRole('button', { name: 'Toggle navigation' });
  }

  async openCategoriesMenu(): Promise<void> {
    // The button toggles the menu, so only click it while the menu is closed.
    if (!(await this.categoryLinks.first().isVisible())) await this.categoriesButton.click();
    await this.categoryLinks.first().waitFor();
  }

  async chooseCategory(name: string): Promise<void> {
    await this.openCategoriesMenu();
    await this.categoryLinks.filter({ hasText: name }).click();
  }
}
